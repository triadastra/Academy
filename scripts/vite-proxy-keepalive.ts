import type { Plugin } from 'vite'

/** Keep reverse proxies from treating an idle HMR connection as a restart. */
export function proxyKeepalive(): Plugin {
  return {
    name: 'proxy-hmr-keepalive',
    apply: 'serve',
    configureServer(server) {
      // Launchpad's proxy closes a connection after 30s without upstream data.
      // Vite's client-to-server ping does not reset that upstream read timeout.
      const timer = setInterval(() => server.ws.send({ type: 'ping' }), 10_000)
      timer.unref()
      server.httpServer?.once('close', () => clearInterval(timer))
    },
  }
}
