# 2.4 Files and Exceptions

File manipulation lets a program interact with files on the computer, reading from them and writing to them. Python provides built-in functions for this.

## Opening a file

`open()` requires two arguments — the file name and the file mode:

```python
file = open('filename', mode)
```

| Mode | Behaviour |
|---|---|
| `'r'` | **Read** (default). Raises an error if the file does not exist. |
| `'w'` | **Write**. **Truncates** the file if it exists (deletes its contents); creates it if not. |
| `'a'` | **Append**. Writes at the end without truncating; creates the file if not present. |
| `'r+'` | Read **and** write. |

`'w'` silently destroys the existing contents. When you mean to add to a file, `'a'` is almost always the mode you want.

## Reading

| Method | Returns |
|---|---|
| `read()` | The entire file content as a single string |
| `readline()` | The next line; each call reads one more |
| `readlines()` | All the lines, as a list of strings |

```python
with open('example.txt', 'r') as file:
    content = file.read()
    print(content)
```

```python
with open('example.txt', 'r') as file:
    lines = file.readlines()
    print(lines)
```

Iterating the file object directly reads it line by line, which is the memory-efficient way for large files. `strip()` removes the trailing newline each line carries:

```python
with open('example.txt', 'r') as file:
    for line in file:
        print(line.strip())
```

## Writing

`write()` requires a string argument:

```python
with open('output.txt', 'w') as f:
    f.write("Hello, World!\n")
    f.write("This is a new line.")
```

Appending instead of overwriting:

```python
with open('example.txt', 'a') as file:
    file.write("\nHello, World!")
```

`write()` does **not** add a newline of its own — every line break must be written explicitly as `\n`.

## Closing a file

Close a file after use to free system resources:

```python
file = open('example.txt', 'r')
# perform operations
file.close()
```

Alternatively, use the `with` statement, which **automatically closes the file** when the block is exited. This is the preferred method, and the one used throughout this lesson: it closes the file even if an error occurs partway through, which a manual `close()` does not.

## Exceptions

To handle errors — a missing file, for instance — use `try`/`except`:

```python
try:
    with open('nonexistent.txt', 'r') as file:
        content = file.read()
except FileNotFoundError as e:
    print(f"An error occurred: {e}")
```

The general structure:

```python
try:
    # Code that may raise an error
    risky_operation()
except SomeException as e:
    # Code that runs if an exception occurs
    print(f"An error occurred: {e}")
    # e is the error that occurred
```

Only the code that can actually fail belongs inside `try`. Wrapping an entire program in one `try` block catches errors you never anticipated and hides real bugs behind a friendly message.

## Worked example: word count

Read a `.txt` file, count the occurrences of each word, and print the results:

```python
def count_words_in_file(filename):
    word_count = {}
    with open(filename, 'r') as f:
        words = f.read().split()

    for word in words:
        word = word.lower()       # case-insensitive counting
        if word in word_count:
            word_count[word] += 1
        else:
            word_count[word] = 1

    for word, count in word_count.items():
        print(f"{word}, {count}")

count_words_in_file('example.txt')
```

Run over the text of *The Picture of Dorian Gray*, the beginning of the output looks like:

```
the, 2761
project, 84
gutenberg, 25
of, 1672
picture, 38
dorian, 158
gray, 73
```

This program combines almost everything from the unit: file reading, `split()` from 1.3, a dictionary from 1.4, a loop from 2.2, and a function from 2.3.
