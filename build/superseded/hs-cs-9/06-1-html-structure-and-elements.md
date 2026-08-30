# 6.1 HTML: Document Structure and Elements

HTML is the **structure** of a web page — what the content *is*, not what it looks like. Appearance is CSS's job (6.3).

## The basic document structure

Every HTML document begins with the same skeleton. Understanding it is crucial for writing valid HTML.

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Page Title</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <!-- Visible page content starts here -->
  <h1>Welcome to My Webpage</h1>
  <p>This is a paragraph of text.</p>
</body>
</html>
```

| Element | Purpose |
|---|---|
| `<!DOCTYPE html>` | Declares the document type and HTML version. **Always the first line.** |
| `<html>` | The root element. `lang="en"` specifies the language. |
| `<head>` | Meta-information about the document, **not displayed on the page**. |
| `<meta charset="UTF-8">` | Character encoding, supporting most characters. |
| `<meta name="viewport" …>` | Configures the viewport for responsive design. |
| `<title>` | The title shown in the browser tab. |
| `<link rel="stylesheet">` | Links an external CSS stylesheet. |
| `<body>` | All the **visible** content. |

The `<head>`/`<body>` split is the first thing to internalise: anything a visitor should see goes in `<body>`, and everything in `<head>` is instructions to the browser.

## Text elements

**Headings** define the hierarchy of content, `<h1>` most important through `<h6>` least:

```html
<h1>Main Title of the Page</h1>
<h2>Major Section Heading</h2>
<h3>Sub-section Heading</h3>
```

Headings should follow the document's meaning, not its appearance. Choosing `<h3>` because it happens to look the right size is what CSS is for.

**Paragraphs** hold blocks of text; browsers automatically add space before and after:

```html
<p>This is the first paragraph.</p>
<p>Each paragraph should represent a distinct block of information.</p>
```

**Line breaks** `<br>` insert a single break — useful for addresses or poems where line breaks are significant. It is an **empty element**, with no closing tag.

**Horizontal rules** `<hr>` represent a thematic break, usually rendered as a line. Also an empty element.

**Preformatted text** `<pre>` displays text in a fixed-width font with whitespace and line breaks **preserved exactly** as written.

**Code snippets** `<code>` displays code inline. For longer blocks, combine `<pre>` with `<code>`.

## Containers

**`<div>`** — block-level containers used to **group other elements**. Essential for structuring layouts and applying styles to sections.

```html
<div id="header"><p>Website Header Content</p></div>
<div id="content"><p>Main body content goes here.</p></div>
<div id="footer"><p>Footer information.</p></div>
```

**`<span>`** — **inline** containers, for styling words or phrases within a block **without creating a line break**.

```html
<p>This is a sentence with <span style="color: blue;">some words</span> styled differently.</p>
```

The difference is layout: a `<div>` starts a new line and fills the width; a `<span>` sits inside a line of text.

## Semantic text elements

| Tag | Meaning | Typical rendering |
|---|---|---|
| `<em>` | Emphasis — stress emphasis | Italics |
| `<strong>` | Strong importance, seriousness, urgency | Bold |
| `<small>` | Side comments, disclaimers, legal fine print | Smaller text |
| `<del>` | Text deleted from a document | Strikethrough |
| `<ins>` | Text inserted into a document | Underlined |
| `<sup>` | Superscript — exponents, ordinals | Raised |
| `<sub>` | Subscript — chemical formulas | Lowered |
| `<mark>` | Highlighted for reference | Yellow background |
| `<abbr>` | An abbreviation; use `title` for the full form | Dotted underline |
| `<dfn>` | A term being defined | Italics |
| `<kbd>` | Keyboard input | Monospace |
| `<samp>` | Sample program output | Monospace |
| `<var>` | A variable in an expression | Italics |

```html
<p>E = mc<sup>2</sup></p>
<p>H<sub>2</sub>O is the chemical formula for water.</p>
<p>Press <kbd>Ctrl</kbd> + <kbd>S</kbd> to save.</p>
<p>The <abbr title="World Wide Web Consortium">W3C</abbr> develops web standards.</p>
```

`<em>` and `<strong>` are the semantic pair; `<i>` and `<b>` merely change appearance. Screen readers announce emphasis, which is why the semantic version is preferred.

## Quotations

- **`<blockquote>`** — longer, block-level quotations, usually indented.
- **`<q>`** — short, inline quotations, usually given quotation marks by the browser.
- **`<cite>`** — the title of a work (book, song, film, website).

## Lists

- **Unordered lists `<ul>`** — order doesn't matter; bullet points.
- **Ordered lists `<ol>`** — order is important; numbers or letters.
- **List items `<li>`** — each item, used inside `<ul>` or `<ol>`.

```html
<ul>
  <li>Coffee</li>
  <li>Tea
    <ul>
      <li>Black tea</li>
      <li>Green tea</li>
    </ul>
  </li>
  <li>Milk</li>
</ul>
```

Nesting a list inside an `<li>` — not between two of them — is what produces a sublist.

## Tables

```html
<table>
  <caption>Example Data Table</caption>
  <thead>
    <tr><th>Column 1 Header</th><th>Column 2 Header</th></tr>
  </thead>
  <tbody>
    <tr><td>Row 1, Data 1</td><td>Row 1, Data 2</td></tr>
  </tbody>
  <tfoot>
    <tr><td colspan="2">Table Footer Information</td></tr>
  </tfoot>
</table>
```

| Tag | Purpose |
|---|---|
| `<table>` | The table container |
| `<caption>` | Optional caption describing the content |
| `<thead>` / `<tbody>` / `<tfoot>` | Header, body, and footer sections |
| `<tr>` | A table row |
| `<th>` | A header cell — usually bold and centred |
| `<td>` | A standard data cell |

`colspan` and `rowspan` make a cell span several columns or rows. The `scope` attribute (`col`, `row`, `colgroup`, `rowgroup`) improves accessibility, especially for screen readers, by saying which cells a header applies to.

## Hyperlinks

```html
<a href="https://indexademics.com/">Visit Indexademics</a>
<a href="another_page.html">Another Page on this Site</a>
<a href="#section2">Jump to Section 2</a>
<a href="mailto:info@indexademics.com">Email Us</a>
<a href="tel:+1234567890">Call Us</a>
```

**`href`** specifies the destination:

- **Absolute URL** — a full web address to an external site.
- **Relative URL** — a path within the same site.
- **Anchor link** — a section of the same page, using `#` and the element's `id`.
- **Email link** and **telephone link** — `mailto:` and `tel:`.

**`target`** defines where to open the link; `_blank` opens a new tab.

**`rel`** specifies the relationship. `noopener` is a security measure that **prevents the new page from accessing the opener page via JavaScript**, and should accompany `target="_blank"`. `nofollow` tells search-engine crawlers not to follow the link, used for untrusted or user-generated content.

## Images

```html
<img src="images/logo.png" alt="Indexademics Logo" width="200" height="100">
```

- **`src`** — the path to the image file.
- **`alt`** — alternative text, for accessibility and for when the image fails to load. Also crucial for SEO.
- **`width`/`height`** — dimensions in pixels, though best practice is to control sizing with CSS.
- **`loading`** — `lazy` defers loading until the image is about to enter the viewport, good for performance on long pages; `eager` loads immediately (the default).

`alt` is not optional in practice. A screen-reader user encounters an image with no `alt` as an unlabelled obstacle.
