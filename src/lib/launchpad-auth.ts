// launchpad-auth.ts — "Sign in with Launchpad" (OIDC + PKCE).
//
// Launchpad apps register themselves: there is no client id to configure and
// no secret to keep, because the platform derives the app's identity from the
// proxy-verified origin rather than from anything the browser sends. The
// drop-in SDK at /dashboard-api/oauth/sdk.js runs the whole authorization-code
// + PKCE flow, so this module only has to load it, ask it who the user is, and
// hand that identity to the local database.
//
// The SDK exists only on a deployed Launchpad origin (or in local dev, where
// it self-declares its origin). On any other host the script 404s, which is
// why loading is best-effort and `isAvailable()` gates the button: an app
// served from somewhere else should offer the institution-code path instead of
// a button that cannot work.

/** What the platform returns from /oauth/userinfo. */
export interface LaunchpadUser {
  sub: string
  email: string
  name?: string
  picture?: string
  org?: string
  verified?: boolean
  /** Present on newer userinfo responses; older issuers need the lookup fallback below. */
  vid?: string
}

interface LaunchpadSdkState {
  accessToken?: string | null
}

interface LaunchpadSdk {
  ready(): Promise<{ user: LaunchpadUser | null; allows?: Record<string, unknown> }>
  signIn(): void
  signOut(): void
  user: LaunchpadUser | null
  allows?: Record<string, unknown>
  state?: LaunchpadSdkState
}

declare global {
  interface Window {
    LaunchpadAuth?: LaunchpadSdk
  }
}

const SDK_SRC = '/dashboard-api/oauth/sdk.js'
const SDK_TOKEN_KEY = 'lp_token'

let loader: Promise<LaunchpadSdk | null> | null = null

/**
 * Load the SDK once. Resolves to null when the script is absent — which is the
 * normal case anywhere that is not a Launchpad-hosted origin, and must not be
 * treated as an error.
 */
function loadSdk(): Promise<LaunchpadSdk | null> {
  if (loader) return loader
  loader = new Promise<LaunchpadSdk | null>((resolve) => {
    if (typeof document === 'undefined') return resolve(null)
    if (window.LaunchpadAuth) return resolve(window.LaunchpadAuth)
    const script = document.createElement('script')
    script.src = SDK_SRC
    script.async = true
    script.onload = () => resolve(window.LaunchpadAuth ?? null)
    script.onerror = () => resolve(null)
    document.head.appendChild(script)
  })
  return loader
}

/** True when this origin can actually run the flow. */
export async function isAvailable(): Promise<boolean> {
  return (await loadSdk()) !== null
}

/**
 * Resolve the signed-in Launchpad user, completing an in-flight callback if
 * the page was just redirected back with a `code`. Safe to call on every load;
 * returns null when nobody is signed in.
 */
export async function currentLaunchpadUser(): Promise<LaunchpadUser | null> {
  const sdk = await loadSdk()
  if (!sdk) return null
  try {
    const state = await sdk.ready()
    if (!state.user) return null

    // ready() may return the SDK's sessionStorage cache immediately and only
    // revalidate it in the background. Institution content cannot be opened on
    // a cached assertion, so make an authoritative userinfo request ourselves.
    const token = sdk.state?.accessToken || sessionStorage.getItem(SDK_TOKEN_KEY)
    if (!token) return null
    const response = await fetch('/dashboard-api/oauth/userinfo', {
      headers: { Authorization: `Bearer ${token}` },
      credentials: 'include',
    })
    if (!response.ok) {
      sdk.signOut()
      return null
    }
    const user = (await response.json()) as LaunchpadUser

    // VID is not part of older documented userinfo shapes. The authenticated
    // account lookup returns it; require its email to agree with userinfo and,
    // when the privacy-limited response includes an id, require that too. The
    // app separately enforces uniqueness for both sub and VID at binding time.
    if (!user.vid && user.email) {
      try {
        const lookupResponse = await fetch(
          `/dashboard-api/users/lookup?email=${encodeURIComponent(user.email)}`,
          {
            headers: { Authorization: `Bearer ${token}` },
            credentials: 'include',
          },
        )
        if (lookupResponse.ok) {
          const payload = (await lookupResponse.json()) as Record<string, unknown>
          const candidate =
            payload.user && typeof payload.user === 'object'
              ? (payload.user as Record<string, unknown>)
              : payload
          const candidateId = String(candidate.id ?? candidate.sub ?? '')
          const candidateEmail = String(candidate.email ?? '').trim().toLowerCase()
          if (
            (!candidateId || candidateId === user.sub) &&
            candidateEmail === user.email.trim().toLowerCase() &&
            typeof candidate.vid === 'string'
          ) {
            user.vid = candidate.vid
          }
        }
      } catch {
        // Missing VID is handled by the caller as a closed access check.
      }
    }

    return user
  } catch {
    return null
  }
}

/**
 * Whether this page can run the flow at all.
 *
 * PKCE mandates the S256 challenge method, which is a SHA-256 of the verifier,
 * and browsers expose `crypto.subtle` only in a secure context. Served over
 * plain HTTP the SDK therefore dies inside signIn() on `subtle.digest` before
 * it can redirect — so the useful thing is to say "this needs HTTPS" rather
 * than to offer a button that can only ever hang.
 */
export function isSecureEnough(): boolean {
  return typeof window !== 'undefined' && window.isSecureContext && !!window.crypto?.subtle
}

/** Why sign-in cannot start here, or null when it can. */
export type SignInBlocker = 'insecure-context' | 'sdk-unavailable' | 'failed'

/**
 * Begin sign-in. On success this is a top-level redirect to the platform's
 * consent screen and nothing after it runs, so a resolved promise means the
 * redirect did NOT happen and the reason is the returned blocker.
 */
export async function startLaunchpadSignIn(): Promise<SignInBlocker | null> {
  if (!isSecureEnough()) return 'insecure-context'
  const sdk = await loadSdk()
  if (!sdk) return 'sdk-unavailable'
  // Hand off from the site root.
  //
  // The platform's callback page returns the user to whatever URL the SDK
  // recorded when signIn() was called (`sessionStorage.lp_return`, defaulting
  // to '/'). Starting from /login therefore sends them back to /login — which
  // is a 404 on a static host with no single-page fallback, so a sign-in that
  // otherwise succeeded ends on "Not found".
  //
  // Rewriting the address bar to '/' first makes the recorded return path one
  // that always resolves; the router then takes over client-side and the
  // callback handler in Login sends the user on to the right page. This is a
  // history replace, not a navigation, so React is untouched.
  try {
    if (window.location.pathname !== '/') {
      window.history.replaceState(null, '', '/')
    }
  } catch {
    // A blocked history API is not worth failing the sign-in over.
  }

  try {
    // signIn() is async — it bootstraps and derives the PKCE challenge before
    // navigating. Awaiting it is what surfaces a failure instead of leaving
    // the caller waiting for a redirect that is never coming.
    await sdk.signIn()
  } catch {
    return 'failed'
  }
  return null
}

/**
 * Clear the SDK's stored token. This is local only: the platform deliberately
 * keeps the user signed in to Launchpad itself, so this ends the session with
 * *this app* and nothing else.
 */
export async function endLaunchpadSession(): Promise<void> {
  const sdk = await loadSdk()
  sdk?.signOut()
}
