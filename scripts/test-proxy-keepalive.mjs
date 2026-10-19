import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import ts from 'typescript'
import { resolveConfig } from 'vite'

// Guard the actual regression: the helper existed but was not registered.
const serveConfig = await resolveConfig({}, 'serve')
assert.ok(serveConfig.plugins.some(plugin => plugin.name === 'proxy-hmr-keepalive'), 'Development config must enable the keepalive')
const buildConfig = await resolveConfig({}, 'build')
assert.ok(!buildConfig.plugins.some(plugin => plugin.name === 'proxy-hmr-keepalive'), 'Keepalive must remain serve-only')

const source = await fs.readFile(new URL('./vite-proxy-keepalive.ts', import.meta.url), 'utf8')
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } })
const { proxyKeepalive } = await import('data:text/javascript;base64,' + Buffer.from(outputText).toString('base64'))
const previous = { setInterval: globalThis.setInterval, clearInterval: globalThis.clearInterval }
let tick, closed, unrefed = false, cleared = false
const timer = { unref() { unrefed = true } }
const sent = []
try {
  globalThis.setInterval = (callback, delay) => {
    assert.equal(delay, 10_000)
    tick = callback
    return timer
  }
  globalThis.clearInterval = handle => { assert.equal(handle, timer); cleared = true }
  const plugin = proxyKeepalive()
  assert.equal(plugin.apply, 'serve')
  plugin.configureServer({
    ws: { send: message => sent.push(message) },
    httpServer: { once: (event, callback) => { assert.equal(event, 'close'); closed = callback } },
  })
  for (let i = 0; i < 9; i++) tick()
  assert.equal(sent.length, 9)
  assert.ok(sent.every(message => message.type === 'ping'))
  assert.equal(unrefed, true)
  closed()
  assert.equal(cleared, true)
  console.log('PASS: 90 seconds of keepalives; no reload messages; cleanup on server close')
} finally {
  Object.assign(globalThis, previous)
}
