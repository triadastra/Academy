import { build } from 'esbuild'

const result = await build({
  entryPoints: ['tests/generation.test.ts'],
  bundle: true,
  write: false,
  platform: 'node',
  format: 'esm',
  tsconfig: 'tsconfig.app.json',
  define: { 'import.meta.env': '{}' },
})
await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].contents).toString('base64')}`)
