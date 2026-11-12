import fs from 'node:fs'
import path from 'node:path'
import { gunzipSync } from 'node:zlib'
import { createHash, randomUUID } from 'node:crypto'
import { z } from 'zod'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { __internals as schoolCatalog } from '../src/data/shsid-catalog'
import { NotesStore, type Contributor } from './notes-store'
import {
  reviewContribution,
  type ModelCall,
  type ReviewCheckpoint,
  type ReviewOptions,
} from './review'
import {
  diffMarkdown,
  parseNote,
  searchNote,
} from '../src/database/notes-markdown'
import { imageSources, ASSET_PREFIX } from '../src/database/note-image-markdown'
import type { NotePacket } from '../src/database/contribution-types'
import type { UnitNote, CatalogCourse } from '../src/database/types'

export interface Identity {
  sub: string
  name?: string
  picture?: string
  org?: string
  verified?: boolean
}
export interface NotesServiceOptions {
  root: string
  dataDirectory: string
  institution: string
  model: string
  authenticate: (bearer: string) => Promise<Identity | null>
  modelCall: ModelCall
  /** Part size and per-call deadline for agent review (tests shrink these). */
  review?: ReviewOptions
}
const inputSchema = z
  .object({
    courseId: z
      .string()
      .min(1)
      .max(100)
      .regex(/^[\w-]+$/),
    level: z.enum(['S', 'S+', 'H', 'H+']).optional(),
    noteId: z.string().min(1).max(200).optional(),
    title: z.string().trim().min(1).max(300),
    source: z.string().trim().min(1).max(60000),
    fileName: z.string().min(1).max(1500),
    mode: z.enum(['upload', 'addition', 'report']).default('upload'),
    quote: z.string().max(6000).optional(),
  })
  .strict()

const ACTIVE_CONTENT_PATTERN =
  /<\/?(?:script|iframe|object|embed|style|link|meta|base|form|input|button|textarea|select|option)\b/i
const DANGEROUS_URL_PATTERN =
  /javascript:|data:text\/html|data:application\/xhtml|vbscript:|on\w+\s*=/i

function validateSource(source: string): void {
  if (ACTIVE_CONTENT_PATTERN.test(source)) {
    throw failure('Uploaded text contains disallowed HTML tags.', 400)
  }
  if (DANGEROUS_URL_PATTERN.test(source)) {
    throw failure('Uploaded text contains dangerous URLs or event handlers.', 400)
  }
}
function score(packet: NotePacket) {
  return packet.ledger.reduce((sum, entry) => sum + entry.points, 0)
}
function markdown(note?: UnitNote) {
  return (
    note?.markdown ??
    (note
      ? [
          `# ${note.code} ${note.title}`,
          note.summary,
          ...(note.sections ?? []).flatMap((section) => [
            `## ${section.title}`,
            ...section.body,
            ...(section.callout ? [`> ${section.callout}`] : []),
          ]),
        ].join('\n\n')
      : '')
  )
}
function failure(message: string, status = 400): Error {
  return Object.assign(new Error(message), { status })
}
async function body(req: IncomingMessage, limit: number): Promise<Buffer> {
  const chunks: Buffer[] = []
  let size = 0
  for await (const chunk of req) {
    size += chunk.length
    if (size > limit) throw failure('Upload is too large.', 413)
    chunks.push(Buffer.from(chunk))
  }
  return Buffer.concat(chunks)
}
const API_SECURITY_HEADERS = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
  'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'",
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
}
function respond(res: ServerResponse, status: number, value: unknown) {
  res.writeHead(status, API_SECURITY_HEADERS)
  res.end(JSON.stringify(value))
}
export class NotesService {
  readonly store: NotesStore
  private readonly seed: { notes: UnitNote[]; courseCatalog: CatalogCourse[] }
  private readonly courseTitles = new Map<string, string>()
  private catalogCheckedAt = 0
  private readonly corpus = new Map<string, UnitNote[]>()
  private workerError = ''
  private processing = false
  private closed = false
  private readonly controllers = new Map<string, AbortController>()
  private readonly timer: ReturnType<typeof setInterval>
  private readonly rates = new Map<string, number[]>()
  private readonly options: NotesServiceOptions
  constructor(options: NotesServiceOptions) {
    this.options = options
    this.store = new NotesStore(options.dataDirectory)
    this.seed = JSON.parse(
      fs.readFileSync(
        path.join(options.root, 'src/database/synonance.database.json'),
        'utf8',
      ),
    )
    for (const course of this.seed.courseCatalog)
      this.courseTitles.set(course.id, course.title)
    for (const note of [...this.seed.notes, ...this.store.read().notes])
      if (!this.courseTitles.has(note.courseId))
        this.courseTitles.set(note.courseId, note.courseId)
    for (const packet of this.store.read().packets)
      if (!this.courseTitles.has(packet.courseId))
        this.courseTitles.set(
          packet.courseId,
          String(packet.courseTitle ?? packet.courseId),
        )
    this.store.write((state) => {
      for (const packet of state.packets)
        if (['indexing', 'reviewing'].includes(packet.status)) {
          packet.status = 'failed'
          packet.stage = 'Interrupted by server restart'
          packet.error = 'Retry this packet to continue review.'
          packet.attempt = undefined
        }
    })
    this.timer = setInterval(() => {
      this.kick()
    }, 1000)
    this.timer.unref()
  }
  close() {
    this.closed = true
    clearInterval(this.timer)
    for (const controller of this.controllers.values()) controller.abort()
    this.store.close()
  }
  private async ensureCourse(courseId: string) {
    if (!/^[\w-]{1,100}$/.test(courseId)) throw failure('Invalid course.')
    if (this.courseTitles.has(courseId)) return
    if (Date.now() - this.catalogCheckedAt > 30_000) {
      this.catalogCheckedAt = Date.now()
      try {
        const response = await fetch(
          'https://cc.indexademics.com/api/courses',
          { signal: AbortSignal.timeout(10_000) },
        )
        const payload = (await response.json()) as {
          ok?: boolean
          data?: { courses?: Parameters<typeof schoolCatalog.groupCourses>[0] }
        }
        if (response.ok && payload.ok && Array.isArray(payload.data?.courses)) {
          for (const course of schoolCatalog.groupCourses(payload.data.courses))
            this.courseTitles.set(course.id, course.title)
        }
      } catch {
        /* Known courses stay available when the school catalog is offline. */
      }
    }
    if (!this.courseTitles.has(courseId))
      throw failure(
        'This course could not be verified against the school catalog. Please try again later.',
      )
  }
  private courseNotes(courseId: string): UnitNote[] {
    if (!/^[\w-]{1,100}$/.test(courseId) || !this.courseTitles.has(courseId))
      throw failure('Unknown course.')
    if (!this.corpus.has(courseId)) {
      const prefix = path.join(this.options.root, 'public/notes', courseId)
      const notes: UnitNote[] = fs.existsSync(`${prefix}.json.gz`)
        ? JSON.parse(
            gunzipSync(fs.readFileSync(`${prefix}.json.gz`)).toString(),
          )
        : fs.existsSync(`${prefix}.json`)
          ? JSON.parse(fs.readFileSync(`${prefix}.json`, 'utf8'))
          : []
      this.corpus.set(courseId, notes)
    }
    const stored = this.store
      .read()
      .notes.filter((note) => note.courseId === courseId)
    const ids = new Set(stored.map((note) => note.id))
    return [
      ...stored,
      ...this.seed.notes.filter(
        (note) => note.courseId === courseId && !ids.has(note.id),
      ),
      ...this.corpus.get(courseId)!.filter((note) => !ids.has(note.id)),
    ]
  }
  /**
   * Only HS courses are taught at S/S+/H/H+. Setup still records a level for
   * every course, so an AP upload arrived tagged "S" and was hidden from the
   * rest of the class; other pathways share one guide.
   */
  private unstreamed(courseId: string) {
    const pathway = this.seed.courseCatalog.find(
      (course) => course.id === courseId,
    )?.pathway
    return !!pathway && pathway !== 'HS'
  }
  private target(packet: NotePacket) {
    return this.courseNotes(packet.courseId).find(
      (note) => note.id === packet.noteId && note.level === packet.level,
    )
  }
  private patch(id: string, mutate: (packet: NotePacket) => void) {
    if (this.closed) return
    this.store.write((state) => {
      const packet = state.packets.find((row) => row.id === id)
      if (!packet) throw failure('Packet not found.', 404)
      mutate(packet)
    })
  }
  private limit(actor: string) {
    const now = Date.now(),
      recent = (this.rates.get(actor) ?? []).filter((at) => at > now - 60_000)
    if (recent.length >= 20)
      throw failure('Please wait a minute before submitting more changes.', 429)
    recent.push(now)
    this.rates.set(actor, recent)
  }
  async handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
    try {
      const url = new URL(req.url ?? '/', 'http://academy.local')
      const route = url.pathname.replace(/^\/__academy\/notes/, '') || '/'
      if (route === '/status' && req.method === 'GET') {
        respond(res, 200, { shared: true })
        return
      }
      // The Launchpad app proxy removes the platform Authorization header.
      // This explicit app token must still pass the same userinfo verification.
      const bearer =
        req.headers['x-academy-authorization'] ?? req.headers.authorization
      if (typeof bearer !== 'string' || !/^Bearer \S+$/.test(bearer))
        throw failure('Sign in with Launchpad to use shared notes.', 401)
      const identity = await this.options.authenticate(bearer)
      if (!identity?.sub)
        throw failure('Your session has expired. Sign in again.', 401)
      if (
        identity.verified !== true ||
        identity.org?.toLowerCase() !== this.options.institution.toLowerCase()
      )
        throw failure('Verified institution membership is required.', 403)
      const actor = `launchpad-${identity.sub}`
      if (req.method !== 'GET') this.limit(actor)
      if (route === '/state' && req.method === 'GET') {
        const courseId = url.searchParams.get('courseId') ?? ''
        await this.ensureCourse(courseId)
        const level = url.searchParams.get('level') || undefined
        const state = this.store.read()
        const packets = state.packets.filter(
          (packet) =>
            packet.courseId === courseId &&
            (!packet.level || packet.level === level),
        )
        // Unpublished sources belong to their author. Other students see only
        // published changes and confirmed penalty assessments on the leaderboard.
        const visible = packets
          .filter(
            (packet) =>
              packet.submittedBy === actor ||
              packet.status === 'published' ||
              packet.ledger.length,
          )
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          .map(({ checkpoint: _checkpoint, ...packet }) =>
            packet.submittedBy === actor
              ? packet
              : packet.status === 'published'
                ? { ...packet, source: '' }
                : {
                    ...packet,
                    source: '',
                    quote: undefined,
                    after: undefined,
                    before: '',
                  },
          )
        respond(res, 200, {
          notes: state.notes.filter(
            (note) =>
              note.courseId === courseId &&
              (!note.level || note.level === level),
          ),
          packets: visible,
          contributors: state.contributors.filter((user) =>
            visible.some((packet) => packet.submittedBy === user.id),
          ),
          serverTime: new Date().toISOString(),
          workerError: this.workerError,
        })
        return
      }
      if (route === '/images' && req.method === 'POST') {
        const mime = String(req.headers['content-type'] ?? '').split(';')[0]
        const bytes = await body(req, 5 * 1024 * 1024)
        const valid =
          mime === 'image/png'
            ? bytes
                .subarray(0, 8)
                .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
            : mime === 'image/jpeg'
              ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
              : mime === 'image/webp'
                ? bytes.toString('ascii', 0, 4) === 'RIFF' &&
                  bytes.toString('ascii', 8, 12) === 'WEBP'
                : mime === 'image/gif'
                  ? /^GIF8[79]a$/.test(bytes.toString('ascii', 0, 6))
                  : false
        if (!valid) throw failure('Use a valid PNG, JPEG, WebP or GIF image.')
        const state = this.store.read()
        if (state.images.filter((image) => image.owner === actor).length >= 500)
          throw failure('Your image storage limit has been reached.', 413)
        const id = randomUUID()
        fs.writeFileSync(
          path.join(this.options.dataDirectory, 'images', id),
          bytes,
          { flag: 'wx', mode: 0o600 },
        )
        this.store.write((draft) =>
          draft.images.push({
            id,
            owner: actor,
            mime,
            name: String(req.headers['x-file-name'] ?? 'Image').slice(0, 200),
            createdAt: new Date().toISOString(),
          }),
        )
        respond(res, 201, { source: `${ASSET_PREFIX}${id}` })
        return
      }
      const imageRoute = route.match(/^\/images\/([\w-]+)$/)
      if (imageRoute && req.method === 'GET') {
        const state = this.store.read(),
          image = state.images.find((item) => item.id === imageRoute[1])
        if (
          !image ||
          (image.owner !== actor &&
            !state.notes.some((note) =>
              imageSources(markdown(note)).includes(
                `${ASSET_PREFIX}${image.id}`,
              ),
            ) &&
            !state.packets.some(
              (packet) =>
                packet.status === 'published' &&
                imageSources(
                  `${packet.before}\n${packet.after ?? ''}`,
                ).includes(`${ASSET_PREFIX}${image.id}`),
            ))
        )
          throw failure('Image not found.', 404)
        res.writeHead(200, {
          'Content-Type': image.mime,
          'Cache-Control': 'private, max-age=300',
          'X-Content-Type-Options': 'nosniff',
          'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'",
          'X-Frame-Options': 'DENY',
          'Referrer-Policy': 'strict-origin-when-cross-origin',
        })
        res.end(
          fs.readFileSync(
            path.join(this.options.dataDirectory, 'images', image.id),
          ),
        )
        return
      }
      if (route === '/packets' && req.method === 'POST') {
        const input = inputSchema.parse(
          JSON.parse((await body(req, 300_000)).toString()),
        )
        await this.ensureCourse(input.courseId)
        if (this.unstreamed(input.courseId)) input.level = undefined
        validateSource(input.source)
        if (input.quote) validateSource(input.quote)
        if (ACTIVE_CONTENT_PATTERN.test(input.title)) {
          throw failure('The guide title contains disallowed HTML tags.', 400)
        }
        const notes = this.courseNotes(input.courseId)
        const note = input.noteId
          ? notes.find(
              (item) =>
                item.id === input.noteId &&
                (!item.level || item.level === input.level),
            )
          : undefined
        if (input.noteId && !note)
          throw failure('The guide is unavailable at this course level.', 404)
        if (input.mode !== 'upload' && !note)
          throw failure('Select an existing passage for reports and additions.')
        const state = this.store.read(),
          before = markdown(note)
        if (before.length > 100_000)
          throw failure('This guide is too large for one agent review.')
        const images = imageSources(input.source)
        if (images.length > 8)
          throw failure('Use at most eight images per packet.')
        for (const source of images)
          if (
            !imageSources(before).includes(source) &&
            (!source.startsWith(ASSET_PREFIX) ||
              !state.images.some(
                (image) =>
                  image.id === source.slice(ASSET_PREFIX.length) &&
                  image.owner === actor,
              ))
          )
            throw failure(
              'Attach image files with your notes; unreviewed image links are not allowed.',
            )
        if (
          state.packets.filter(
            (packet) =>
              packet.submittedBy === actor &&
              ['queued', 'indexing', 'reviewing', 'ready'].includes(
                packet.status,
              ),
          ).length >= 20
        )
          throw failure(
            'Finish or cancel some of your pending packets first.',
            429,
          )
        const fingerprint = createHash('sha256')
          .update(input.source)
          .digest('hex')
        if (
          state.packets.some(
            (packet) =>
              packet.courseId === input.courseId &&
              packet.level === (note ? note.level : input.level) &&
              packet.noteId === (note?.id ?? packet.noteId) &&
              packet.fingerprint === fingerprint &&
              !['cancelled', 'failed', 'rejected'].includes(packet.status),
          )
        )
          throw failure('This packet has already been submitted.', 409)
        const nextCode =
          1 +
          Math.max(
            0,
            ...[
              ...notes,
              ...state.packets.filter(
                (item) => item.courseId === input.courseId,
              ),
            ].map((item) => Number(item.code.match(/^C(\d+)$/)?.[1]) || 0),
          )
        const id = `packet-${randomUUID()}`
        const packet: NotePacket = {
          ...input,
          kind: 'note-packet',
          id,
          level: note ? note.level : input.level,
          noteId: note?.id ?? `note-${randomUUID()}`,
          code: note?.code ?? `C${nextCode}`,
          title: note?.title ?? input.title,
          submittedBy: actor,
          submittedAt: new Date().toISOString(),
          status: 'queued',
          stage: 'Waiting for the indexing agent',
          before,
          fromRevision: note?.revision ?? 0,
          ledger: [],
          fingerprint,
          shared: true,
          courseTitle: this.courseTitles.get(input.courseId),
        }
        const name = identity.name?.trim() || 'Contributor'
        const profile: Contributor = {
          id: actor,
          name,
          avatarUrl: identity.picture?.startsWith('https://')
            ? identity.picture
            : undefined,
          initials: name
            .split(/\s+/)
            .slice(0, 2)
            .map((word) => word[0])
            .join('')
            .toUpperCase(),
        }
        this.store.write((draft) => {
          draft.packets.unshift(packet)
          const index = draft.contributors.findIndex(
            (user) => user.id === actor,
          )
          if (index < 0) draft.contributors.push(profile)
          else draft.contributors[index] = profile
        })
        respond(res, 201, { id })
        this.kick()
        return
      }
      const action = route.match(
        /^\/packets\/([\w-]+)\/(cancel|retry|publish)$/,
      )
      if (action && req.method === 'POST') {
        const packet = this.store
          .read()
          .packets.find((row) => row.id === action[1])
        if (!packet) throw failure('Packet not found.', 404)
        if (packet.submittedBy !== actor)
          throw failure('Only the contributor can change this submission.', 403)
        if (action[2] === 'cancel') {
          if (
            !['queued', 'indexing', 'reviewing', 'ready'].includes(
              packet.status,
            )
          )
            throw failure('This packet has already finished.', 409)
          this.patch(packet.id, (row) => {
            row.status = 'cancelled'
            row.stage = 'Stopped by contributor'
            row.attempt = undefined
            row.verified = false
          })
          this.controllers.get(packet.id)?.abort()
        } else if (action[2] === 'retry') {
          if (!['failed', 'needs-review'].includes(packet.status))
            throw failure('This packet cannot be retried.', 409)
          this.patch(packet.id, (row) => {
            row.status = 'queued'
            row.stage = 'Queued for a fresh agent review'
            row.error = undefined
            row.verified = false
          })
        } else this.publish(packet)
        respond(res, 200, { ok: true })
        this.kick()
        return
      }
      throw failure('Unknown notes endpoint.', 404)
    } catch (error) {
      respond(
        res,
        error instanceof z.ZodError
          ? 400
          : ((error as { status?: number }).status ?? 500),
        {
          error:
            error instanceof z.ZodError
              ? 'Invalid submission fields.'
              : (error as Error).message,
        },
      )
    }
  }
  private publish(packet: NotePacket) {
    if (packet.status === 'published') return // Safe retry after a lost response.
    if (
      packet.status !== 'ready' ||
      !packet.verified ||
      packet.assessment?.decision !== 'approve' ||
      !packet.after
    )
      throw failure('This packet has not passed agent review.', 409)
    const note = this.target(packet)
    if (
      (note?.revision ?? 0) !== packet.fromRevision ||
      markdown(note) !== packet.before
    ) {
      this.patch(packet.id, (row) => {
        row.status = 'queued'
        row.stage = 'Guide changed; re-indexing against the latest revision'
        row.verified = false
      })
      return
    }
    const parsed = parseNote(packet.after),
      at = new Date().toISOString()
    this.store.write((state) => {
      const row = state.packets.find((item) => item.id === packet.id)!
      const updated: UnitNote = {
        id: packet.noteId,
        courseId: packet.courseId,
        level: packet.level,
        code: packet.code,
        title:
          (parsed.title.startsWith(`${packet.code} `)
            ? parsed.title.slice(packet.code.length + 1)
            : parsed.title) || packet.title,
        summary: parsed.summary,
        markdown: packet.after,
        revision: packet.fromRevision + 1,
        updated: at,
        sections: parsed.sections.map((section) => ({
          id: section.id,
          title: section.title,
          body: section.blocks.map((block) => block.text),
        })),
      }
      const index = state.notes.findIndex((item) => item.id === updated.id)
      if (index < 0) state.notes.push(updated)
      else state.notes[index] = updated
      row.status = 'published'
      row.stage = 'Published to everyone’s guide'
      row.publishedAt = at
      row.toRevision = updated.revision
      if (!row.ledger.some((entry) => entry.id === `${packet.id}:credit`))
        row.ledger.push({
          id: `${packet.id}:credit`,
          points: packet.assessment!.completeness,
          reason: packet.assessment!.rationale,
          at,
        })
      for (const penalty of packet.assessment!.penalties) {
        const target = state.packets.find(
          (item) =>
            item.id === penalty.packetId &&
            item.noteId === packet.noteId &&
            item.courseId === packet.courseId &&
            item.level === packet.level &&
            item.status === 'published',
        )
        if (!target) continue
        const points = Math.min(penalty.points, Math.max(0, score(target))),
          eventId = `${packet.id}:penalty:${target.id}`
        if (points && !target.ledger.some((entry) => entry.id === eventId))
          target.ledger.push({
            id: eventId,
            points: -points,
            reason: penalty.evidence,
            at,
          })
      }
    })
  }
  private kick() {
    void this.drain().catch((error) => {
      this.workerError = `Indexing is paused: ${(error as Error).message}`
    })
  }
  async drain(): Promise<void> {
    if (this.processing || this.closed) return
    const packet = this.store
      .read()
      .packets.filter((row) => row.status === 'queued')
      .sort((a, b) => a.submittedAt.localeCompare(b.submittedAt))[0]
    if (!packet) return
    // A new guide queued before that rule (or retried since) still carries
    // the student's level; drop it so it publishes to the whole class.
    if (packet.level && packet.fromRevision === 0 && this.unstreamed(packet.courseId)) {
      this.patch(packet.id, (row) => {
        delete row.level
      })
      delete packet.level
    }
    this.workerError = ''
    this.processing = true
    const controller = new AbortController(),
      attempt = randomUUID()
    this.controllers.set(packet.id, controller)
    let timeout: ReturnType<typeof setTimeout> | undefined
    try {
      const note = this.target(packet)
      if (packet.fromRevision > 0 && !note)
        throw new Error('Target guide could not be loaded.')
      const before = markdown(note)
      // A retry continues after the parts already reviewed, provided the
      // guide has not changed underneath them.
      const saved = packet.checkpoint as
        | (ReviewCheckpoint & { fromRevision: number; before: string })
        | undefined
      const resume =
        saved &&
        saved.fromRevision === (note?.revision ?? 0) &&
        saved.before === before
          ? saved
          : undefined
      // Review guides can be long. A 60 kB source plus an existing guide needs
      // time for the model to read, reason and write a complete revised guide,
      // and a second verifier pass runs after that. Scale the ceiling with the
      // total review context: at least 3 minutes, up to 15 minutes, roughly
      // 8 ms per character of source + existing guide.
      const reviewTimeoutMs = Math.max(
        180_000,
        Math.min(900_000, (packet.source.length + before.length) * 8),
      )
      timeout = setTimeout(() => controller.abort(), reviewTimeoutMs)
      this.patch(packet.id, (row) => {
        row.status = 'indexing'
        row.stage = 'Reading the guide and checking coverage'
        row.attempt = attempt
        row.before = before
        row.fromRevision = note?.revision ?? 0
      })
      const state = this.store.read()
      const prior = state.packets
        .filter(
          (row) => row.noteId === packet.noteId && row.status === 'published',
        )
        .map((row) => ({
          packetId: row.id,
          changes: diffMarkdown(row.before, row.after ?? ''),
          remainingScore: score(row),
        }))
      const related = this.courseNotes(packet.courseId).filter(
        (item) =>
          item.id !== packet.noteId &&
          (!item.level || item.level === packet.level),
      )
      const coverage = related.map((item) => ({
        code: item.code,
        title: item.title,
        summary: item.summary.slice(0, 300),
      }))
      const relatedPassages = related
        .flatMap((item) =>
          searchNote(markdown(item), packet.source.slice(0, 2000), 2).map(
            (hit) => ({ code: item.code, text: hit.snippet, score: hit.score }),
          ),
        )
        .sort((a, b) => b.score - a.score)
        .slice(0, 12)
      const context = {
        course: this.courseTitles.get(packet.courseId) ?? packet.courseId,
        level: packet.level,
        title: packet.title,
        code: packet.code,
        mode: packet.mode,
        quote: packet.quote,
        source: packet.source,
        before,
        prior,
        coverage,
        relatedPassages,
      }
      const images = imageSources(packet.source)
        .filter((source) => source.startsWith(ASSET_PREFIX))
        .map((source) => {
          const image = state.images.find(
            (item) => item.id === source.slice(ASSET_PREFIX.length),
          )
          if (!image) throw new Error('An attached image is missing.')
          return {
            source,
            url: `data:${image.mime};base64,${fs.readFileSync(path.join(this.options.dataDirectory, 'images', image.id)).toString('base64')}`,
          }
        })
      const { assessment, markdown: after } = await reviewContribution(
        context,
        images,
        this.options.modelCall,
        controller.signal,
        () => {
          controller.signal.throwIfAborted()
          this.patch(packet.id, (row) => {
            if (row.attempt === attempt) row.status = 'reviewing'
          })
        },
        (stage) => {
          this.patch(packet.id, (row) => {
            if (row.attempt === attempt && row.status !== 'cancelled')
              row.stage = stage
          })
        },
        {
          ...this.options.review,
          resume,
          onCheckpoint: (checkpoint) =>
            this.patch(packet.id, (row) => {
              if (row.attempt === attempt)
                row.checkpoint = {
                  ...checkpoint,
                  fromRevision: note?.revision ?? 0,
                  before,
                }
            }),
        },
      )
      controller.signal.throwIfAborted()
      this.patch(packet.id, (row) => {
        if (row.attempt !== attempt || row.status === 'cancelled') return
        row.assessment = assessment
        row.after = after
        row.model = this.options.model
        row.verified = assessment.decision === 'approve'
        row.attempt = undefined
        row.checkpoint = undefined
        row.status =
          assessment.decision === 'approve'
            ? 'ready'
            : assessment.decision === 'reject'
              ? 'rejected'
              : 'needs-review'
        row.stage =
          assessment.decision === 'approve'
            ? 'Agent reviewed · compare and publish'
            : assessment.decision === 'reject'
              ? 'Agent rejected this packet'
              : 'Uncertain · needs more evidence'
        if (
          assessment.decision === 'reject' &&
          assessment.incorrect &&
          assessment.penalty > 0 &&
          !row.ledger.some((entry) => entry.id === `${packet.id}:incorrect`)
        )
          row.ledger.push({
            id: `${packet.id}:incorrect`,
            points: -assessment.penalty,
            reason: assessment.evidence,
            at: new Date().toISOString(),
          })
      })
    } catch (error) {
      if (!this.closed)
        this.patch(packet.id, (row) => {
          if (row.status === 'cancelled') return
          row.status = 'failed'
          const done = (row.checkpoint as ReviewCheckpoint | undefined)
            ?.results.length
          row.stage = done
            ? `Review interrupted after ${done} of ${(row.checkpoint as ReviewCheckpoint).parts} parts — Retry continues from there`
            : 'Review interrupted — no guide change'
          row.verified = false
          row.attempt = undefined
          row.error = controller.signal.aborted
            ? 'Review stopped. Retry when ready.'
            : (error as Error).message
        })
    } finally {
      clearTimeout(timeout)
      this.controllers.delete(packet.id)
      this.processing = false
    }
  }
}
