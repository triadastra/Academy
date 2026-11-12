import path from 'node:path'
import fs from 'node:fs'
import type { Plugin, ViteDevServer, PreviewServer } from 'vite'
import { NotesService } from './notes-service'
import { createMoonshotCall } from './moonshot'
import type { Identity } from './notes-service'

/** Uses Academy's existing Launchpad process and its preserved data directory. */
export function sharedNotesBackend(env: Record<string, string>): Plugin {
  let service: NotesService | undefined
  const securityHeaders = (isPreview: boolean) => {
    const devCsp =
      "default-src 'self'; " +
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
      "style-src 'self' 'unsafe-inline'; " +
      "img-src 'self' data: blob: https:; " +
      "font-src 'self'; " +
      "connect-src 'self' ws://localhost:* ws://127.0.0.1:* https:; " +
      "worker-src 'self' blob:; " +
      "object-src 'none'; " +
      "base-uri 'self'; " +
      "frame-ancestors 'none'; " +
      "form-action 'self'"
    const prodCsp =
      "default-src 'self'; " +
      "script-src 'self'; " +
      "style-src 'self' 'unsafe-inline'; " +
      "img-src 'self' data: blob: https:; " +
      "font-src 'self'; " +
      "connect-src 'self' https:; " +
      "worker-src 'self' blob:; " +
      "object-src 'none'; " +
      "base-uri 'self'; " +
      "frame-ancestors 'none'; " +
      "form-action 'self'; " +
      "upgrade-insecure-requests"
    return {
      'Content-Security-Policy': isPreview ? prodCsp : devCsp,
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Strict-Transport-Security':
        'max-age=63072000; includeSubDomains; preload',
    }
  }
  const attach = (server: ViteDevServer | PreviewServer, isPreview = false) => {
    const root = process.cwd()
    const seed = JSON.parse(
      fs.readFileSync(
        path.join(root, 'src/database/synonance.database.json'),
        'utf8',
      ),
    )
    const userinfo =
      env.LAUNCHPAD_USERINFO_URL ||
      'https://academy.standardcas.org/dashboard-api/oauth/userinfo'
    if (!userinfo.startsWith('https://'))
      throw new Error('Launchpad userinfo must use HTTPS.')
    service = new NotesService({
      root,
      dataDirectory: path.resolve(
        root,
        env.ACADEMY_NOTES_DATA_DIR || '.launchpad-data/notes',
      ),
      institution: seed.institution.id,
      model: env.VITE_LLM_MODEL || 'kimi-k3',
      authenticate: async (bearer) => {
        const response = await fetch(userinfo, {
          headers: { Authorization: bearer },
          signal: AbortSignal.timeout(12_000),
          redirect: 'error',
        })
        if (!response.ok) return null
        return (await response.json()) as Identity
      },
      modelCall: createMoonshotCall(env),
    })
    const headers = securityHeaders(isPreview)
    server.middlewares.use((_req, res, next) => {
      for (const [name, value] of Object.entries(headers)) {
        res.setHeader(name, value)
      }
      next()
    })
    // Never allow Vite's file serving to expose durable notes or image originals.
    server.middlewares.use((req, res, next) => {
      let url: string
      try {
        url = decodeURIComponent((req.url ?? '').split('?')[0])
      } catch {
        res.statusCode = 400
        res.end()
        return
      }
      if (url.includes('.launchpad-data') || url.includes('/server/')) {
        res.statusCode = 404
        res.end()
        return
      }
      next()
    })
    server.middlewares.use('/__academy/notes', (req, res) => {
      void service!.handle(req, res)
    })
    server.httpServer?.once('close', () => {
      service?.close()
      service = undefined
    })
  }
  return {
    name: 'academy-shared-notes',
    configureServer: (server) => attach(server, false),
    configurePreviewServer: (server) => attach(server, true),
  }
}
