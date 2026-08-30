# 1.1 Getting Started with Python

This lesson covers the two ways of running Python, the output function, indentation, comments, and modules — everything needed before the first real program.

## Script mode and interactive mode

| | Script mode | Interactive mode |
|---|---|---|
| **Prompt** | No `>>>` prompt | Has the `>>>` prompt |
| **Running** | File must be created and saved before executing | Result returned immediately after pressing Enter |
| **Editing** | Direct way of editing your code | No direct method to edit code |

Use interactive mode to test a single expression and check what it evaluates to; use script mode for anything you intend to keep.

## The print() function

`print()` is used to print values to the screen. When Python calls `print()`, a value is **passed to the function**.

```python
print("Hello, World!")
```

## Indentation

**Indentation** is space at the beginning of a code line. In Python it defines **a block of code**; in most other languages indentation is only for readability and carries **no specific meaning**.

This is the single most important syntactic difference between Python and the C-family languages. A misplaced indent in Python is not a style problem — it changes what the program does.

```python
if x > 0:
    print("positive")     # inside the if block
print("done")             # outside it, always runs
```

## Comments

**Comments** annotate code, providing notes that are **not executed** by the Python interpreter. There are two kinds:

**Single-line** — begins with `#`:

```python
# This is a single-line comment
print("Hello, World!")  # This prints a message; the comment has no impact
```

**Multi-line** — enclosed in triple quotes:

```python
'''
This comment
spans several lines.
'''
```

## Modules

Import a module with the `import` statement. After you import a module you can use all the functions of that module.

```python
import math
print(math.floor(123 / 10) % 10)
```

The `random` module contains functions that generate random numbers in a variety of ways. `randint(a, b)` returns an integer in the range $[a, b]$ — note that **both ends are included**, unlike `range()` in 1.7.

```python
import random
for i in range(10):
    print(random.randint(1, 6))    # simulates a die
```
