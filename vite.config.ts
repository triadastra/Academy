import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig, loadEnv, type Plugin } from "vite"
import { inspectAttr } from 'plugin-inspect-react-code'

/**
 * Dev-only Moonshot bridge.
 *
 * In production the app POSTs to `/__lp_llm_proxy` and Launchpad's host-server
 * answers it with the operator's key. `npm run dev` has no host-server, so this
 * serves the SAME path from the Vite dev server and forwards to Moonshot — the
 * client code stays identical in both places.
 *
 * The key is read HERE, in the Node process, from MOONSHOT_API_KEY. It is
 * deliberately NOT named VITE_MOONSHOT_API_KEY: Vite inlines every `VITE_`
 * variable into the client bundle, so that name would ship the key to every
 * student's browser. Never rename it.
 *
 * With no key set the middleware does not register, `/__lp_llm_proxy` 404s, and
 * the app falls back to its scripted demo reply.
 */
function moonshotDevBridge(env: Record<string, string>): Plugin | false {
  const apiKey = env.MOONSHOT_API_KEY
  const baseUrl = env.MOONSHOT_BASE_URL || 'https://api.moonshot.ai/v1'
  if (!apiKey) return false

  return {
    name: 'moonshot-dev-bridge',
    apply: 'serve',
    configureServer(server) {
      server.config.logger.info(`  ➜  Moonshot bridge:  /__lp_llm_proxy → ${baseUrl}`)

      server.middlewares.use('/__lp_llm_proxy', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405
          return res.end(JSON.stringify({ error: 'method not allowed' }))
        }

        const chunks: Buffer[] = []
        for await (const chunk of req) chunks.push(chunk as Buffer)

        let payload: Record<string, unknown>
        try {
          payload = JSON.parse(Buffer.concat(chunks).toString('utf8'))
        } catch {
          res.statusCode = 400
          return res.end(JSON.stringify({ error: 'invalid body' }))
        }

        // Launchpad's proxy takes `provider` + `maxTokens`; Moonshot's native
        // API takes neither. Translate rather than make the client branch.
        const rest = { ...payload }
        delete rest.provider
        delete rest.maxTokens
        const body = { ...rest, ...(payload.maxTokens ? { max_tokens: payload.maxTokens } : {}) }

        try {
          const upstream = await fetch(`${baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify(body),
          })

          res.statusCode = upstream.status
          res.setHeader(
            'Content-Type',
            upstream.headers.get('Content-Type') ?? 'application/json',
          )
          if (payload.stream) {
            res.setHeader('Cache-Control', 'no-cache, no-transform')
            res.setHeader('Connection', 'keep-alive')
          }

          if (!upstream.body) return res.end()
          const reader = upstream.body.getReader()
          while (true) {
            const { done, value } = await reader.read()
            if (done) break
            res.write(Buffer.from(value))
          }
          res.end()
        } catch (error) {
          res.statusCode = 502
          res.end(JSON.stringify({ error: `moonshot request failed: ${(error as Error).message}` }))
        }
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Empty prefix loads non-VITE_ variables too. They stay in this Node process
  // and are never handed to `define`, so nothing here reaches the bundle.
  const env = loadEnv(mode, process.cwd(), '')

  return {
    // Absolute, NOT './'. With a relative base, index.html asks for
    // "./assets/index-*.js", which the browser resolves against the current
    // path — so a deep link or refresh at /course/notes requests
    // /course/assets/index-*.js and gets a 404 and a blank page. Launchpad
    // serves each app at the root of its own subdomain, so '/' is correct.
    base: '/',
    plugins: [inspectAttr(), react(), moonshotDevBridge(env)].filter(Boolean) as Plugin[],
    server: {
      port: 3000,
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  }
});
