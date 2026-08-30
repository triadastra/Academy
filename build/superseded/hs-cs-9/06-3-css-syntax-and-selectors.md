# 6.3 CSS: Syntax and Selectors

CSS (Cascading Style Sheets) controls the **presentation** of HTML elements — layout, colours, fonts, and spacing. HTML says what something is; CSS says how it looks.

## Syntax

A CSS rule consists of a **selector** and a **declaration block**:

```css
selector {
  property: value;
  property: value;
  /* more declarations */
}
```

- **Selector** — targets the HTML element(s) to be styled.
- **Declaration block** — enclosed in curly braces `{}`.
- **Declaration** — a property and a value separated by a colon `:`, each ending with a semicolon `;`.

## Element selectors

Select all elements of a given type:

```css
p {
  color: #333;
  font-family: sans-serif;
  line-height: 1.6;
}
```

## Class selectors

Select elements with a specific `class` attribute. Class selectors **start with a dot**:

```css
.highlight-text {
  background-color: yellow;
  padding: 5px;
  font-weight: bold;
}
```

## ID selectors

Select the element with a specific `id`. ID selectors **start with a hash `#`**, and **IDs should be unique**:

```css
#main-navigation {
  background-color: #f9f9f9;
  border-bottom: 1px solid #ddd;
}
```

Because an ID matches at most one element, class selectors are the right default for anything you might want to reuse.

## Universal selector

Selects **all** elements, written as `*`:

```css
* {
  box-sizing: border-box;   /* include padding and border in width/height */
  margin: 0;
  padding: 0;
}
```

This particular rule is the common "reset": browsers ship with their own default margins, and clearing them gives a predictable starting point. `box-sizing: border-box` is worth understanding — see the box model in 6.4.

## Attribute selectors

Select elements by the presence or value of an attribute:

```css
input[type="text"] {
  border: 1px solid #ccc;
  padding: 8px;
}

a[target="_blank"] {
  color: blue;
}
```

## Pseudo-class selectors

Select elements based on **state or position**. Pseudo-classes start with a **single colon `:`**.

```css
a:hover { color: red; }              /* on mouse hover */
button:focus { outline: 2px solid blue; }

/* Structural */
li:first-child { font-weight: bold; }
li:last-child { border-bottom: none; }
p:nth-child(odd)  { background-color: #f0f0f0; }
p:nth-child(even) { background-color: #e0e0e0; }

/* UI state */
input:enabled  { border-color: green; }
input:disabled { background-color: #ddd; color: #999; }
input:checked + label { font-weight: bold; }
```

## Pseudo-element selectors

Select **specific parts** of an element. Pseudo-elements start with a **double colon `::`**.

```css
p::first-line { font-weight: bold; }

ul::before {
  content: "List: ";
  font-weight: bold;
}

li::marker { color: blue; }           /* the bullet or number */
::selection { background-color: #ffcc80; }   /* user-selected text */
input::placeholder { color: #aaa; font-style: italic; }
```

The single-versus-double colon is the whole distinction: a pseudo-**class** selects an existing element in some state, a pseudo-**element** selects part of an element that has no tag of its own.

## Combinators

Combinators define the **relationship** between selectors:

| Combinator | Symbol | Selects |
|---|---|---|
| Descendant | space | All descendants of an element |
| Child | `>` | Only **direct** children |
| Adjacent sibling | `+` | The **immediately following** sibling |
| General sibling | `~` | **All** following siblings |

```css
div p   { color: green; }          /* all <p> anywhere inside a <div> */
ul > li { list-style-type: circle; }  /* only direct <li> children */
h2 + p  { margin-top: 0; }         /* the first <p> right after an <h2> */
div ~ p { font-size: 0.9em; }      /* all <p> siblings after a <div> */
```

The descendant/child difference catches people out: `div p` reaches a paragraph nested three levels deep, `div > p` does not.

## Three ways to include CSS

**Inline CSS** — styles applied directly in the tag with the `style` attribute:

```html
<p style="color: green; font-size: 16px;">Styled inline.</p>
```

*Pros:* quick for testing or one-off styles. *Cons:* not maintainable, impossible to reuse, mixes content with presentation. **Generally discouraged.**

**Internal CSS** — rules inside a `<style>` tag in the `<head>`:

```html
<head>
  <style>
    p { color: blue; font-size: 16px; }
  </style>
</head>
```

*Pros:* useful for page-specific styles, keeps everything in one file. *Cons:* less maintainable for larger sites.

**External CSS** — rules in a separate `.css` file, linked with `<link>`:

```html
<head>
  <link rel="stylesheet" href="styles.css">
</head>
```

*Pros:* best for **maintainability, reusability, and organisation**; clear separation of content from presentation; easier to update styles site-wide; **improves performance through caching** — the browser downloads the stylesheet once for the whole site. *Cons:* requires managing separate files.

**This is the recommended method for most projects.**
