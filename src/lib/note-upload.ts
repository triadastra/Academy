import { saveNoteImage, IMAGE_PATTERN } from '@/database/note-assets'

const DANGEROUS_PDF_PATTERNS = [
  /\/JS\b/i,
  /\/JavaScript\b/i,
  /\/Launch\b/i,
  /\/EmbeddedFile\b/i,
  /\/OpenAction\b/i,
  /\/RichMedia\b/i,
  /\/XFA\b/i,
]

const ACTIVE_CONTENT_PATTERN = /<\/?(?:script|iframe|object|embed|style|link|meta|base|form|input|button|textarea|select|option)\b/i

const DANGEROUS_URL_PATTERN = /javascript:|data:text\/html|data:application\/xhtml|vbscript:|on\w+\s*=/i

/** Reject HTML tags and dangerous URL schemes in uploaded note text. */
function sanitizeSource(source: string): string {
  if (ACTIVE_CONTENT_PATTERN.test(source)) {
    throw new Error('Uploaded text contains HTML tags that are not allowed in notes.')
  }
  if (DANGEROUS_URL_PATTERN.test(source)) {
    throw new Error('Uploaded text contains dangerous URLs or event handlers.')
  }
  return source
}

/** Reject non-PDF files and PDFs that carry scripts, launch actions or embedded files. */
function validatePdfBytes(buffer: ArrayBuffer): void {
  const bytes = new Uint8Array(buffer)
  if (bytes.length < 8) {
    throw new Error('This PDF is too small to be valid.')
  }
  const header = String.fromCharCode(...bytes.slice(0, 5))
  if (header !== '%PDF-') {
    throw new Error('This file is not a valid PDF. Only genuine PDF documents are allowed.')
  }
  // PDF objects can appear anywhere; scan the head and tail (256 KB each).
  const sample = Math.min(bytes.length, 262_144)
  const decoder = new TextDecoder('latin1')
  const head = decoder.decode(bytes.slice(0, sample))
  const tailStart = Math.max(sample, bytes.length - 262_144)
  const tail = decoder.decode(bytes.slice(tailStart))
  for (const pattern of DANGEROUS_PDF_PATTERNS) {
    if (pattern.test(head) || pattern.test(tail)) {
      throw new Error(
        'This PDF contains active content (scripts, launch actions or embedded files) and cannot be uploaded.',
      )
    }
  }
}

/** Reject image files whose bytes do not match their claimed MIME type. */
async function validateImageBytes(file: File): Promise<void> {
  const bytes = new Uint8Array(await file.slice(0, 24).arrayBuffer())
  const valid =
    (file.type === 'image/png' &&
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47 &&
      bytes[4] === 0x0d &&
      bytes[5] === 0x0a &&
      bytes[6] === 0x1a &&
      bytes[7] === 0x0a) ||
    (file.type === 'image/jpeg' && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) ||
    (file.type === 'image/webp' &&
      bytes[0] === 0x52 &&
      bytes[1] === 0x49 &&
      bytes[2] === 0x46 &&
      bytes[3] === 0x46 &&
      bytes[8] === 0x57 &&
      bytes[9] === 0x45 &&
      bytes[10] === 0x42 &&
      bytes[11] === 0x50) ||
    (file.type === 'image/gif' &&
      bytes[0] === 0x47 &&
      bytes[1] === 0x49 &&
      bytes[2] === 0x46 &&
      bytes[3] === 0x38 &&
      (bytes[4] === 0x37 || bytes[4] === 0x39) &&
      bytes[5] === 0x61)
  if (!valid) {
    throw new Error(
      `${file.name} is not a valid image. Only genuine PNG, JPEG, WebP or GIF files are allowed.`,
    )
  }
}

/** Read one packet's text and persist its image attachments before queueing. */
export async function readNoteUpload(
  files: File[],
): Promise<{ source: string; fileName: string }> {
  if (!files.length) throw new Error('Choose a file first.')
  if (files.length > 12) throw new Error('Use at most twelve files per packet.')
  const pictures = files.filter((file) => file.type.startsWith('image/'))
  if (pictures.length > 8)
    throw new Error('Use at most eight images per packet.')
  const names = new Set<string>()
  for (const file of files) {
    if (names.has(file.name))
      throw new Error('Attachment filenames must be unique.')
    names.add(file.name)
    if (file.size > 10 * 1024 * 1024)
      throw new Error('Files must be smaller than 10 MB.')
  }
  const attachments = new Map<string, string>()
  for (const file of pictures) {
    await validateImageBytes(file)
    attachments.set(file.name, await saveNoteImage(file))
  }
  const documents: string[] = []
  for (const file of files.filter((item) => !pictures.includes(item))) {
    if (/\.(md|txt)$/i.test(file.name)) {
      documents.push(sanitizeSource(await file.text()))
    } else if (/\.pdf$/i.test(file.name)) {
      const { getDocument, PDFWorker } = await import('pdfjs-dist')
      const { default: PdfWorker } =
        await import('pdfjs-dist/build/pdf.worker.min.mjs?worker')
      const worker = PDFWorker.create({ port: new PdfWorker() })
      const data = await file.arrayBuffer()
      validatePdfBytes(data)
      const task = getDocument({ data, worker })
      try {
        const pdf = await task.promise
        if (pdf.numPages > 80)
          throw new Error(
            'Split PDFs longer than 80 pages into smaller packets.',
          )
        const pages: string[] = []
        for (let page = 1; page <= pdf.numPages; page++) {
          const text = await (await pdf.getPage(page)).getTextContent()
          // Keep the PDF's own line ends. Joining every run with a space
          // flattened a whole page into one line, which hid headings, list
          // items and display formulas from the review agent and left it no
          // paragraph boundaries to split a long upload on.
          pages.push(
            text.items
              .map((item) =>
                'str' in item ? item.str + (item.hasEOL ? '\n' : ' ') : '',
              )
              .join('')
              .replace(/[ \t]+\n/g, '\n')
              .trim(),
          )
        }
        const text = pages.join('\n\n')
        if (text.trim().length < 40)
          throw new Error(
            'This PDF has no readable text. Upload its pages as images for agent review.',
          )
        documents.push(text)
      } finally {
        await task.destroy()
        worker.destroy()
      }
    } else
      throw new Error(
        'Use Markdown, text, PDF, PNG, JPEG, WebP or GIF. Export Word/PowerPoint as PDF first.',
      )
  }
  let source = documents.join('\n\n')
  const used = new Set<string>()
  source = source.replace(IMAGE_PATTERN, (match, alt: string, path: string) => {
    let name = path
    try {
      name =
        decodeURIComponent(path).replace(/^\.\//, '').split('/').pop() ?? path
    } catch {
      /* Keep original path for validation. */
    }
    const stored = attachments.get(name)
    if (!stored) return match
    used.add(name)
    return `![${alt}](${stored})`
  })
  for (const [name, uri] of attachments)
    if (!used.has(name))
      source += `\n\n![${name.replace(/[[\]\n]/g, '')}](${uri})`
  source = sanitizeSource(source)
  if (source.length > 60_000)
    throw new Error(
      'This packet is too large. Split it into smaller uploads (60,000 characters each).',
    )
  return {
    source: source.trim(),
    fileName: files.map((file) => file.name).join(', '),
  }
}
