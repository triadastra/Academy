# 6.5 Web Scraping

Web scraping fetches a page and extracts data from its HTML. It combines the HTTP request with the HTML structure of 6.1 and the selector syntax of 6.3.

## Making a request

```python
import requests
res = requests.get(url, headers=headers)
```

The response object carries several useful attributes:

| Attribute | Contents |
|---|---|
| `res.status_code` | An integer showing whether the page is accessible |
| `res.text` | The body as a **string** |
| `res.content` | The body as **binary** data |
| `res.encoding` | The webpage encoding |

**Status codes:**

- **200** — the request has succeeded.
- **403** — the client does not have access rights to the content.
- **404** — the server cannot find the requested resource.

Use `res.text` for HTML and `res.content` for images and video — writing binary data through `res.text` corrupts it.

## Parsing with Beautiful Soup

```python
import bs4
soup = bs4.BeautifulSoup(res.text, 'html.parser')
soup = bs4.BeautifulSoup(res.text, 'lxml')      # pip install lxml
```

`'html.parser'` is built in; `lxml` is faster but requires installation.

## Selecting elements

`soup.select()` takes **CSS selectors** — the same syntax as 6.3:

| Selector | Selects |
|---|---|
| `soup.select('div')` | All `<div>` elements |
| `soup.select('div#author')` | All `<div>` with `id="author"` |
| `soup.select('div.notice')` | All `<div>` with `class="notice"` |
| `soup.select('div span')` | All `<span>` **within** a `<div>` |
| `soup.select('div > span')` | All `<span>` **directly** within a `<div>` |
| `soup.select('input[name]')` | All `<input>` with a `name` attribute of any value |
| `soup.select('input[type="button"]')` | All `<input>` with `type="button"` |

`select()` always returns a **list**, even when one element matches — hence the `[0]` in the examples below.

## Extracting from an element

**Get an attribute** — three equivalent ways:

```python
soup.select('a')[0]['href']
soup.select('a')[0].get('href')
soup.select('a')[0].attrs['href']
```

**Get the text:**

```python
soup.select('a')[0].getText()
soup.select('a')[0].text
```

## Worked examples

Against a page with this structure:

```html
<div id="content">
  <h1>Welcome to Example.com</h1>
  <p class="text">First paragraph of text.</p>
  <p class="text">Second paragraph with a <a href="/page2">link</a>.</p>
</div>
<div class="gallery">
  <img src="image1.jpg" alt="Image 1">
  <img src="image2.png" alt="Image 2">
</div>
```

**1. Retrieve text:**

```python
import requests, bs4
res = requests.get("https://example.com")
soup = bs4.BeautifulSoup(res.text, 'html.parser')

for p in soup.select('p.text'):
    print(p.getText())
```

**2. Extract links:**

```python
for link in soup.select('a'):
    print(link.get('href'), link.getText())
```

**3. Download images:**

```python
import os
if not os.path.exists('images'):
    os.makedirs('images')

for i, img in enumerate(soup.select('img')):
    res_img = requests.get(img['src'])
    with open(f'images/image{i}.jpg', 'wb') as f:
        f.write(res_img.content)
```

Note `'wb'` — binary write mode — paired with `res.content`. Both halves must be binary.

**4. Scrape multiple pages:**

```python
base_url = "https://example.com/page"
for page in range(1, 4):
    res = requests.get(f"{base_url}{page}")
    soup = bs4.BeautifulSoup(res.text, 'html.parser')
    for title in soup.select('h1'):
        print(title.getText())
```

## Dynamic pages and APIs

When you scroll a page and new content appears **without the URL changing**, the page is loading **dynamically**. JavaScript interacts with HTML elements or nodes, manipulating them in response to user input or triggers.

**Benefits of dynamic loading:** page updates are much quicker, since you don't wait for a full refresh, so the site feels faster and more responsive; and **less data is downloaded on each update**, wasting less bandwidth.

**APIs** (Application Programming Interfaces) allow developers to build complex functionality more easily. A dynamic page typically makes an HTTP request to a server for specific resources, and the data requested is often **JSON** (JavaScript Object Notation) — a good format for structured data.

In Python, JSON data is usually represented as a string:

```python
json_data = res.json()
# or
import json
json_data = json.loads(res.text)
```

In the early days this technique was known as **Ajax** — Asynchronous JavaScript and XML — because it tended to request XML data. JSON has largely replaced XML, but the name persists.

The practical consequence for scraping: `requests.get()` fetches only the **initial** HTML, before any JavaScript runs. If the data you want is loaded dynamically, it will not be in `res.text` at all. Find the underlying API request instead and fetch its JSON directly — usually simpler than parsing HTML anyway.

## Scraping responsibly

- **Check `robots.txt`** — for example `https://example.com/robots.txt` — which states what the site permits.
- **Add delays** with `time.sleep(2)` between requests to avoid overloading servers.

These are not optional courtesies. A scraper that hammers a server without pause is indistinguishable from an attack, and will be blocked accordingly.
