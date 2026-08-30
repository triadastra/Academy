// llm.ts — the app's only route to a language model.
//
// Synonance talks to Launchpad's platform proxy at `/__lp_llm_proxy` on its OWN
// origin. The host-server intercepts that path before the request reaches this
// app, forwards it to the provider with the operator's key, and returns an
// OpenAI-shaped response. Consequences worth keeping in mind:
//
//   · This app holds no API key and must never be given one. A key in a Vite
//     build is a key in every student's devtools.
//   · The proxy only exists when the app is served THROUGH Launchpad. Under
//     `npm run dev` the path 404s, so callers must handle GatewayUnavailable
//     and fall back — the app has to stay usable without a model.
//   · Cost is charged to the site owner per call, and the proxy rate-limits to
//     60 requests/minute per owner. Debounce anything visitor-triggered.
//
// Docs: dashboard/src/manual/pages/app-gateway.js

const PROXY_PATH = '/__lp_llm_proxy'

/**
 * Moonshot's flagship. NOTE: verify this id against Moonshot's own model list
 * before a real deployment — it is taken from third-party aggregators, and
 * providers routinely publish dated suffixes (the host-server elsewhere refers
 * to `kimi-k2.6` and `kimi-k2-0905-preview`). Override without a code change by
 * setting VITE_LLM_MODEL at build time.
 */
export const LLM_MODEL = import.meta.env.VITE_LLM_MODEL ?? 'kimi-k3'
export const LLM_PROVIDER = import.meta.env.VITE_LLM_PROVIDER ?? 'moonshot'

export interface LlmToolCall {
  id: string
  /** `function` for tools we execute; `builtin_function` for Moonshot's own. */
  type: 'function' | 'builtin_function'
  function: { name: string; arguments: string }
}

export interface LlmMessage {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string
  /** Present on assistant turns that requested tools. */
  tool_calls?: LlmToolCall[]
  /** Required on `tool` messages — ties the result to its request. */
  tool_call_id?: string
  name?: string
}

/** A tool definition as the API expects it. */
export interface LlmToolSpec {
  type: 'function' | 'builtin_function'
  function: {
    name: string
    description?: string
    parameters?: Record<string, unknown>
  }
}

/** Thrown when the proxy isn't there — dev server, or not served via Launchpad. */
export class GatewayUnavailable extends Error {
  constructor(message = 'No model gateway on this origin') {
    super(message)
    this.name = 'GatewayUnavailable'
  }
}

/** Thrown for a gateway that answered but refused: credits, rate limit, timeout. */
export class GatewayError extends Error {
  status: number
  retryAfterSeconds?: number
  constructor(status: number, message: string, retryAfterSeconds?: number) {
    super(message)
    this.name = 'GatewayError'
    this.status = status
    this.retryAfterSeconds = retryAfterSeconds
  }
}

interface ChatOptions {
  messages: LlmMessage[]
  temperature?: number
  maxTokens?: number
  signal?: AbortSignal
  /** Called with each token as it streams. Omit for a single non-streamed reply. */
  onToken?: (delta: string, full: string) => void
  /**
   * Called while the model is thinking, before any answer token arrives.
   * Kimi K3 has reasoning always on and emits `reasoning_content` first — on a
   * short question that was 34 chunks before the first answer token, so a UI
   * that only watches `content` looks frozen for the whole thinking phase.
   */
  onReasoning?: (delta: string, full: string) => void
}

async function readError(response: Response) {
  let detail = ''
  try {
    const body = await response.json()
    detail = typeof body?.error === 'string' ? body.error : JSON.stringify(body)
  } catch {
    detail = response.statusText
  }
  const retryAfter = Number(response.headers.get('Retry-After'))
  return new GatewayError(
    response.status,
    detail || `Gateway returned ${response.status}`,
    Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : undefined,
  )
}

/**
 * One chat completion. Streams when `onToken` is supplied, and resolves with
 * the complete text either way.
 */
export async function chat({
  messages,
  // Kimi K3 rejects anything else: "invalid temperature: only 1 is allowed for
  // this model". Reasoning models generally fix their own sampling, so this is
  // the safe default across the Kimi line rather than a K3 special case.
  temperature = 1,
  // Reasoning is billed as output and dominated it in testing (92 of 135
  // tokens), so the budget has to cover thinking AND the answer. Too low and
  // the model spends the lot reasoning and returns an empty string.
  maxTokens = 2400,
  signal,
  onToken,
  onReasoning,
}: ChatOptions): Promise<string> {
  const stream = typeof onToken === 'function'

  let response: Response
  try {
    response = await fetch(PROXY_PATH, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provider: LLM_PROVIDER,
        model: LLM_MODEL,
        messages,
        temperature,
        maxTokens,
        stream,
      }),
      signal,
    })
  } catch (error) {
    if ((error as Error)?.name === 'AbortError') throw error
    throw new GatewayUnavailable('Could not reach the model gateway')
  }

  // The dev server answers unknown paths with the SPA's index.html rather than
  // a 404, so a 200 that isn't JSON/SSE means the proxy is simply not there.
  const contentType = response.headers.get('Content-Type') ?? ''
  if (response.status === 404 || contentType.includes('text/html')) {
    throw new GatewayUnavailable()
  }
  if (!response.ok) throw await readError(response)

  if (!stream) {
    const body = await response.json()
    return String(body?.choices?.[0]?.message?.content ?? '')
  }

  if (!response.body) throw new GatewayUnavailable('Gateway returned no stream')

  // Moonshot is OpenAI-dialect, and the proxy forwards the provider's stream
  // verbatim — so this parses OpenAI `data:` chunks.
  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let full = ''
  let reasoning = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })

    // Events are separated by a blank line; keep the trailing partial in place.
    const events = buffer.split('\n\n')
    buffer = events.pop() ?? ''

    for (const event of events) {
      for (const line of event.split('\n')) {
        if (!line.startsWith('data:')) continue
        const payload = line.slice(5).trim()
        if (!payload || payload === '[DONE]') continue
        try {
          const chunk = JSON.parse(payload)
          const delta = chunk?.choices?.[0]?.delta
          const thinking = delta?.reasoning_content
          if (typeof thinking === 'string' && thinking) {
            reasoning += thinking
            onReasoning?.(thinking, reasoning)
          }
          const answer = delta?.content
          if (typeof answer === 'string' && answer) {
            full += answer
            onToken?.(answer, full)
          }
        } catch {
          // A malformed chunk should not abort a good stream.
        }
      }
    }
  }

  return full
}

/**
 * One non-streamed round trip that preserves structure. The agent loop needs
 * `tool_calls` and `finish_reason`, which `chat()` throws away.
 */
export async function complete({
  messages,
  tools,
  temperature = 1,
  maxTokens = 2400,
  signal,
}: {
  messages: LlmMessage[]
  tools?: LlmToolSpec[]
  temperature?: number
  maxTokens?: number
  signal?: AbortSignal
}): Promise<{ message: LlmMessage; finishReason: string }> {
  let response: Response
  try {
    response = await fetch(PROXY_PATH, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provider: LLM_PROVIDER,
        model: LLM_MODEL,
        messages,
        temperature,
        maxTokens,
        stream: false,
        ...(tools?.length ? { tools } : {}),
      }),
      signal,
    })
  } catch (error) {
    if ((error as Error)?.name === 'AbortError') throw error
    throw new GatewayUnavailable('Could not reach the model gateway')
  }

  const contentType = response.headers.get('Content-Type') ?? ''
  if (response.status === 404 || contentType.includes('text/html')) {
    throw new GatewayUnavailable()
  }
  if (!response.ok) throw await readError(response)

  const body = await response.json()
  const choice = body?.choices?.[0]
  return {
    message: {
      role: 'assistant',
      content: String(choice?.message?.content ?? ''),
      tool_calls: choice?.message?.tool_calls,
    },
    finishReason: String(choice?.finish_reason ?? 'stop'),
  }
}

/**
 * Streaming sibling of `complete()`. Tool calls arrive as deltas that have to
 * be reassembled by index (name and arguments both accumulate across chunks),
 * so the agent loop can stream every round instead of going silent whenever it
 * might want a tool.
 */
export async function streamComplete({
  messages,
  tools,
  temperature = 1,
  maxTokens = 2400,
  signal,
  onToken,
  onReasoning,
}: {
  messages: LlmMessage[]
  tools?: LlmToolSpec[]
  temperature?: number
  maxTokens?: number
  signal?: AbortSignal
  onToken?: (delta: string, full: string) => void
  onReasoning?: (delta: string, full: string) => void
}): Promise<{ message: LlmMessage; finishReason: string }> {
  let response: Response
  try {
    response = await fetch(PROXY_PATH, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provider: LLM_PROVIDER,
        model: LLM_MODEL,
        messages,
        temperature,
        maxTokens,
        stream: true,
        ...(tools?.length ? { tools } : {}),
      }),
      signal,
    })
  } catch (error) {
    if ((error as Error)?.name === 'AbortError') throw error
    throw new GatewayUnavailable('Could not reach the model gateway')
  }

  const contentType = response.headers.get('Content-Type') ?? ''
  if (response.status === 404 || contentType.includes('text/html')) {
    throw new GatewayUnavailable()
  }
  if (!response.ok) throw await readError(response)
  if (!response.body) throw new GatewayUnavailable('Gateway returned no stream')

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let content = ''
  let reasoning = ''
  let finishReason = 'stop'
  const calls: LlmToolCall[] = []

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const events = buffer.split('\n\n')
    buffer = events.pop() ?? ''

    for (const event of events) {
      for (const line of event.split('\n')) {
        if (!line.startsWith('data:')) continue
        const payload = line.slice(5).trim()
        if (!payload || payload === '[DONE]') continue
        try {
          const chunk = JSON.parse(payload)
          const choice = chunk?.choices?.[0]
          if (choice?.finish_reason) finishReason = choice.finish_reason
          const delta = choice?.delta
          if (!delta) continue

          const thinking = delta.reasoning_content
          if (typeof thinking === 'string' && thinking) {
            reasoning += thinking
            onReasoning?.(thinking, reasoning)
          }
          if (typeof delta.content === 'string' && delta.content) {
            content += delta.content
            onToken?.(delta.content, content)
          }
          for (const entry of delta.tool_calls ?? []) {
            const index = typeof entry.index === 'number' ? entry.index : 0
            calls[index] ??= { id: '', type: 'function', function: { name: '', arguments: '' } }
            if (entry.id) calls[index].id = entry.id
            if (entry.type) calls[index].type = entry.type
            if (entry.function?.name) calls[index].function.name += entry.function.name
            if (entry.function?.arguments) calls[index].function.arguments += entry.function.arguments
          }
        } catch {
          // A malformed chunk should not abort a good stream.
        }
      }
    }
  }

  const present = calls.filter(Boolean)
  return {
    message: {
      role: 'assistant',
      content,
      ...(present.length ? { tool_calls: present } : {}),
    },
    finishReason: present.length ? 'tool_calls' : finishReason,
  }
}

/** True when this origin has the gateway — probed once and remembered. */
let availability: Promise<boolean> | null = null

export function gatewayAvailable(): Promise<boolean> {
  availability ??= chat({ messages: [{ role: 'user', content: 'ping' }], maxTokens: 1 })
    .then(() => true)
    .catch((error) => !(error instanceof GatewayUnavailable))
  return availability
}
