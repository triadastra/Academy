import { build } from 'esbuild'

// Pure model + parser checks, then the chat agent's grade-book tools against
// the real store.
for (const entry of ['tests/performance.test.ts', 'tests/performance-tools.test.ts']) {
  const result = await build({
    entryPoints: [entry],
    bundle: true,
    write: false,
    platform: 'node',
    format: 'esm',
    tsconfig: 'tsconfig.app.json',
    define: { 'import.meta.env': '{}' },
  })
  await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].contents).toString('base64')}`)
}
