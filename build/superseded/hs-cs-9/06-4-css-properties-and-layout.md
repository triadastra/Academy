# 6.4 CSS: Properties, Units, and Responsive Design

## Text and background properties

**Text:**

```css
p {
  color: red;                    /* text colour */
  font-family: Arial, sans-serif;
  font-size: 16px;
  font-weight: bold;
  text-align: center;
  text-decoration: underline;
  line-height: 1.6;
  letter-spacing: 0.02em;
}
```

`font-family` takes a **list** — the browser uses the first font it has, falling back rightward, which is why a generic family like `sans-serif` belongs at the end.

**Background:**

```css
body {
  background-color: #eee;
  background-image: url('images/bg.png');
  background-repeat: no-repeat;
  background-size: cover;
}
```

## The box model

The CSS box model describes the **rectangular boxes** that represent HTML elements. Working outward from the content:

| Property | Space it controls |
|---|---|
| **content** | The text or image itself |
| **`padding`** | Inside the border, between border and content |
| **`border`** | The edge of the element |
| **`margin`** | **Outside** the border, between this element and its neighbours |

```css
.card {
  margin: 10px;
  padding: 20px;
  border: 1px solid #ccc;
  border-radius: 6px;
}
```

`margin: auto` centres an element **horizontally** within its container — the classic use.

**`box-sizing`** decides how `width` and `height` are measured:

- **`content-box`** (default) — width covers the content **only**, so padding and border are added on top. A 200 px box with 20 px padding actually occupies 240 px.
- **`border-box`** — width **includes** padding and border, so the box occupies exactly what you asked for.

`border-box` is why the universal reset in 6.3 sets it: layout arithmetic becomes predictable.

Two more:

- **`overflow`** — what happens when content is too big: `visible`, `hidden`, `scroll`, `auto`. Also `overflow-x` and `overflow-y`.
- **`visibility`** — `hidden` hides the element **but it still takes up space**; `display: none` removes it from the layout entirely. That difference decides which one you want.

## Display

`display` controls how elements are laid out:

- **`block`** — takes the full width and starts a new line, like `<div>`.
- **`inline`** — flows within a line and ignores width/height, like `<span>`.
- **`inline-block`** — flows within a line **but accepts width and height**.
- **`none`** — removed from the layout entirely.
- **`flex`** and **`grid`** — modern layout systems.

## Positioning

| Value | Behaviour |
|---|---|
| **`static`** | Default; follows normal document flow |
| **`relative`** | Positioned relative to its **normal** position; use `top`/`right`/`bottom`/`left` to offset |
| **`absolute`** | **Removed from the flow**, positioned relative to the nearest positioned ancestor (or `<html>`) |
| **`fixed`** | Removed from the flow, positioned relative to the **viewport**; stays put during scrolling |
| **`sticky`** | Relative until a scroll threshold, then fixed |

**`z-index`** controls stack order — a higher value sits in front. It **only works on positioned elements** (relative, absolute, fixed, sticky), which is the usual reason a `z-index` "does nothing".

**`float`** positions an element left or right and allows text to wrap around it. It was once the main layout tool, but **Flexbox and Grid are generally preferred for modern layouts**. **`clear`** specifies which sides may not sit next to a floated element.

## Units

**Absolute units** — fixed sizes, not relative to anything:

- **`px` (pixels)** — the basic unit, device-dependent; generally recommended for screens.
- **`pt`, `pc`, `in`, `cm`, `mm`** — physical units, less common for screen work.

**Relative units** — sizes relative to other values:

| Unit | Relative to |
|---|---|
| **`%`** | The parent element or viewport |
| **`em`** | The font size of the **parent** element |
| **`rem`** | The font size of the **root** element (`<html>`) |
| **`vw`** | 1% of the **viewport width** |
| **`vh`** | 1% of the **viewport height** |
| **`vmin` / `vmax`** | 1% of the viewport's smaller / larger dimension |

`em` **compounds** — a nested element with `font-size: 1.2em` inside another at `1.2em` ends up at 1.44 times the base. `rem` always refers to the root, so it scales the whole site consistently from one place. That predictability is why `rem` is usually the better default.

## Styling lists and tables

```css
ul { list-style-type: square; }
ol { list-style-type: upper-roman; }

.custom-list {
  list-style-image: url('images/checkmark.png');
  list-style-position: inside;
  padding-left: 20px;
}
```

```css
table {
  border-collapse: collapse;    /* single borders rather than doubled ones */
  width: 100%;
}

th, td {
  border: 1px solid #ddd;
  padding: 8px;
  text-align: left;
}

th { background-color: #f0f0f0; font-weight: bold; }

tbody tr:nth-child(even) { background-color: #f9f9f9; }   /* zebra striping */

caption { caption-side: bottom; font-style: italic; color: gray; }
```

**Zebra striping** with `nth-child(even)` is a small change that makes wide tables much easier to read across.

## Responsive design with media queries

Media queries apply different styles based on device characteristics, most often **screen width**:

```css
/* Screens smaller than 768px — mobile */
@media screen and (max-width: 768px) {
  body { font-size: 14px; }
  .container { width: 100%; }
}

/* Screens 769px and wider — desktop */
@media screen and (min-width: 769px) {
  body { font-size: 16px; }
  .container { width: 960px; margin: 0 auto; }
}

/* By orientation */
@media screen and (orientation: portrait) {
  .menu { flex-direction: column; }
}
@media screen and (orientation: landscape) {
  .menu { flex-direction: row; }
}

/* High-resolution (Retina) screens */
@media (-webkit-min-device-pixel-ratio: 2), (min-resolution: 192dpi) {
  .logo { content: url("logo-2x.png"); width: 200px; }
}
```

Media queries use `@media` followed by a media type (`screen`, `print`, `all`) and conditions such as `max-width`, `min-width`, and `orientation`. Other features include `device-width`, `aspect-ratio`, `color`, and `resolution`. They can be combined with `and`, `or`, and `not`, and can target `@media print` for print stylesheets.

The `<meta name="viewport">` tag from 6.1 is a prerequisite: without it, a mobile browser pretends to be a desktop-width screen and the `max-width` queries never fire.
