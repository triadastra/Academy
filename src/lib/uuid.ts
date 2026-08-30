// crypto.randomUUID is secure-context-only, and the deployed app is served
// over plain http, where it does not exist. localhost IS a secure context,
// so the difference only ever shows up in production.
export function uuid(): string {
  // eslint-disable-next-line no-restricted-properties -- the one feature-detected use
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    // eslint-disable-next-line no-restricted-properties -- guarded by the check above
    return crypto.randomUUID()
  }
  const bytes = new Uint8Array(16)
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    // Not secure-context-gated: this is a real CSPRNG on http pages too.
    crypto.getRandomValues(bytes)
  } else {
    for (let i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256)
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40 // version 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80 // variant 10x
  const hex = [...bytes].map((b) => b.toString(16).padStart(2, '0'))
  return [
    hex.slice(0, 4).join(''),
    hex.slice(4, 6).join(''),
    hex.slice(6, 8).join(''),
    hex.slice(8, 10).join(''),
    hex.slice(10, 16).join(''),
  ].join('-')
}
