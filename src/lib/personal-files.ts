// personal-files.ts — where the text of a personal course's dropped files lives.
//
// IndexedDB, not the localStorage delta. A handful of PDFs is easily a few
// hundred kilobytes of text, and the delta has a ~2.5 MB soft budget shared
// with chat history and everything else a student owns; putting source files
// in it would push real coursework out through compaction. The metadata row
// (name, size, when it was used) stays in the user database so the page can
// list files synchronously; only the body is here.
//
// Keys are `<userId>/<sourceId>`, so two personal accounts on one browser
// never read each other's files.

const DB_NAME = 'synonance-personal-files'
const STORE = 'sources'

let opening: Promise<IDBDatabase> | null = null
/** Fallback when IndexedDB is blocked (private windows): this page view only. */
const memory = new Map<string, string>()

function open(): Promise<IDBDatabase> {
  if (opening) return opening
  opening = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'))
      return
    }
    const request = indexedDB.open(DB_NAME, 1)
    request.onupgradeneeded = () => request.result.createObjectStore(STORE)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('IndexedDB failed to open'))
  })
  opening.catch(() => {
    opening = null
  })
  return opening
}

async function run<T>(mode: IDBTransactionMode, act: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open()
  return new Promise((resolve, reject) => {
    const request = act(db.transaction(STORE, mode).objectStore(STORE))
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed'))
  })
}

const key = (userId: string, sourceId: string) => `${userId}/${sourceId}`

/** Resolves to `true` when stored durably, `false` when only kept in memory. */
export async function putSourceText(userId: string, sourceId: string, text: string): Promise<boolean> {
  try {
    await run('readwrite', (store) => store.put(text, key(userId, sourceId)))
    return true
  } catch {
    memory.set(key(userId, sourceId), text)
    return false
  }
}

export async function getSourceText(userId: string, sourceId: string): Promise<string | null> {
  const cached = memory.get(key(userId, sourceId))
  if (cached !== undefined) return cached
  try {
    const value = await run<unknown>('readonly', (store) => store.get(key(userId, sourceId)))
    return typeof value === 'string' ? value : null
  } catch {
    return null
  }
}

export async function deleteSourceText(userId: string, sourceId: string) {
  memory.delete(key(userId, sourceId))
  try {
    await run('readwrite', (store) => store.delete(key(userId, sourceId)))
  } catch {
    // Nothing stored durably, so nothing to remove.
  }
}
