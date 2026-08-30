# 6.2 HTML: Forms, Media, and Semantic Elements

## Attributes

**Attributes** provide additional information about HTML elements and are included in the **start tag**.

**Common attributes:**

- **`class`** — one or more class names, used for CSS styling and JavaScript. Reusable across many elements.
- **`id`** — a unique identifier. **Must be unique within a document.**

**Global attributes** can be used on almost any element — `accesskey` (a keyboard shortcut), `draggable`, `hidden`, `title`, and others.

**Event attributes** (`onclick`, `onload`, `onsubmit`) allow JavaScript to run in response to events. These go beyond basic HTML but are what makes a page interactive.

The `class`/`id` distinction matters for CSS in 6.3: a class selector may match many elements, an ID selector matches at most one.

## Forms

Forms collect user input.

```html
<form action="/submit-form" method="post">
  <label for="name">Name:</label><br>
  <input type="text" id="name" name="user_name" required><br><br>

  <label for="email">Email:</label><br>
  <input type="email" id="email" name="user_email"><br><br>

  <label for="message">Message:</label><br>
  <textarea id="message" name="user_message" rows="4" cols="50"></textarea><br><br>

  <input type="radio" id="option1" name="options" value="1">
  <label for="option1">Option 1</label><br>
  <input type="radio" id="option2" name="options" value="2">
  <label for="option2">Option 2</label><br><br>

  <select id="dropdown" name="dropdown_option">
    <option value="value1">Option 1</option>
    <option value="value2">Option 2</option>
  </select><br><br>

  <input type="checkbox" id="agree" name="agreement" value="agree">
  <label for="agree">I agree to terms</label><br><br>

  <button type="submit">Submit</button>
</form>
```

**`<form>` attributes:**

- **`action`** — the URL that processes the form data.
- **`method`** — the HTTP method, `get` or `post`. **`post` is generally preferred** for forms with sensitive data, since `get` puts the values in the URL.
- **`enctype`** — important for file uploads: `multipart/form-data`.
- **`autocomplete`** — `on` or `off`.

**Input types:**

| Type | Purpose |
|---|---|
| `text` | Single-line text |
| `email` | Email, with format validation |
| `password` | Masked text |
| `radio` | Select **one** option from many |
| `checkbox` | Select **one or more** options |
| `submit` / `reset` | Send or clear the form |
| `file` | File upload |
| `date`, `time`, `number`, `range`, `color` | HTML5 types with built-in validation and UI |

Radio buttons in the same group must share a **`name`** — that is what makes them mutually exclusive.

**Other form elements:**

- **`<textarea>`** — multi-line text input; `rows` and `cols` give its visible size in characters.
- **`<select>` and `<option>`** — a dropdown list. `<optgroup>` groups related options; the `selected` attribute pre-selects one.
- **`<label>`** — associates text with a control, improving accessibility. **The `for` attribute must match the `id` of the input.** This also makes clicking the label focus the field.
- **`<button>`** — a clickable button. `type` is `submit`, `reset`, or `button`; it **defaults to `submit` inside a form**, which surprises people who wanted a plain button.
- **`<fieldset>` and `<legend>`** — group related controls with a caption.

## Audio and video

```html
<audio controls>
  <source src="audio/sample.mp3" type="audio/mpeg">
  <source src="audio/sample.ogg" type="audio/ogg">
  Your browser does not support the audio element.
</audio>
```

```html
<video width="640" height="360" controls poster="images/video-poster.jpg">
  <source src="videos/sample.mp4" type="video/mp4">
  <source src="videos/sample.webm" type="video/webm">
  <track src="subtitles_en.vtt" kind="subtitles" srclang="en" label="English">
  Your browser does not support the video element.
</video>
```

- **`controls`** — displays play, pause, volume, and fullscreen controls. Essential for user interaction.
- **`<source>`** — several files for different browser support; `type` gives the MIME type so the browser can pick without downloading.
- **`preload`** — `auto`, `metadata`, or `none`.
- **`poster`** (video) — an image shown while the video downloads or before playback starts.
- **`<track>`** — subtitles or captions, typically WebVTT `.vtt` files.
- **Text inside the tag** — displayed only if the browser does not support the element.

Providing multiple `<source>` elements is how one page plays everywhere: the browser takes the first format it recognises and ignores the rest.

## Semantic elements

Semantic elements give **meaning** to structure, improving accessibility and SEO — where a page of nested `<div>`s tells a screen reader or a search engine nothing.

| Element | Content |
|---|---|
| `<header>` | Introductory content, at the top of a page or section |
| `<nav>` | Navigation links |
| `<main>` | The main content of the document |
| `<article>` | Self-contained content — a blog post, a news article |
| `<section>` | A thematic grouping of content |
| `<aside>` | Related but non-essential content — sidebars |
| `<footer>` | Footer of a document or section |
| `<address>` | Contact information for the author or owner |
| `<figure>` / `<figcaption>` | Self-contained media with a caption |

```html
<header>
  <h1>Website Name</h1>
  <nav>
    <ul>
      <li><a href="/">Home</a></li>
      <li><a href="/about">About</a></li>
    </ul>
  </nav>
</header>

<main>
  <article>
    <section>
      <h2>Article Title</h2>
      <p>This is the main content of the article...</p>
      <figure>
        <img src="images/diagram.png" alt="Diagram of something">
        <figcaption>Figure 1: Explanation of the diagram.</figcaption>
      </figure>
    </section>
  </article>
  <aside>
    <h3>Related Articles</h3>
  </aside>
</main>

<footer>
  <p>© 2023 Indexademics</p>
</footer>
```

Each of these renders exactly like a `<div>`. The entire benefit is machine-readable meaning.

## Interactive elements

**`<details>` and `<summary>`** create a collapsible widget with no JavaScript at all:

```html
<details>
  <summary>Click to see details</summary>
  <p>Hidden by default, revealed by the user.</p>
</details>
```

**`<dialog>`** represents a dialog box or modal window, controlled from JavaScript with `showModal()` and `close()`.

## Icons

**Font Awesome** — link the CSS in `<head>`, then use `<i>` tags with its classes:

```html
<i class="fas fa-home"></i> Home
<i class="fas fa-cog fa-spin"></i> Settings
```

**Material Icons** — link the Google Fonts stylesheet, then use `<span>` with the class:

```html
<span class="material-icons">home</span> Home
```

**SVG icons** can be embedded directly or used as image files:

```html
<svg width="24" height="24" viewBox="0 0 24 24">
  <path fill="currentColor" d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
</svg>
```

SVG is **scalable without loss of quality**, can be **styled with CSS** (note `fill="currentColor"`, which inherits the text colour), and has smaller file sizes than raster images for icons. Unlike the icon fonts, it also needs no external stylesheet.
