# 2.2 Loops

Loops repeat a block of statements. Python has two, and choosing between them comes down to one question: **do you know in advance how many times it will run?**

## for loops

A `for` loop iterates a block of statements several times, once per item in a collection.

```python
for variable in someList:
    statements
```

## for with range()

`range()` generates a sequence of numbers:

```python
for variable in range(start, stop, step):
    statements
```

`range(5)` produces 0, 1, 2, 3, 4 — the **stop value is excluded**, matching the slicing convention from 1.3. `range(2, 10, 3)` produces 2, 5, 8.

## while loops

```python
while condition:
    statements
```

Accumulating with a `while` loop:

```python
i, s = 1, 0
n = int(input("Enter n: "))
while i <= n:
    s += i
    i += 1
print(s)
```

Another accumulation, this one summing 0 through 5:

```python
n, nsum = 0, 0
while n <= 5:
    nsum += n
    n += 1
print(nsum)     # 15
```

`+=` is an **augmented assignment**: `n += 1` is shorthand for `n = n + 1`.

**Be cautious to avoid infinite loops.** `while True:` is an infinite loop by construction, useful only when the body contains a `break`. The more common accident is forgetting `i += 1`, which leaves the condition true forever.

## Choosing between them

- **`for` loops** are suitable when the **number of iterations is known in advance** — iterating a list, or counting to `n`.
- **`while` loops** are used when the **number of iterations is not known beforehand** — reading until input runs out, or repeating until a value converges.

## break and continue

**`break`** terminates a loop **prematurely**. When `break` is executed, the loop stops immediately and control transfers to the statement after the loop.

```python
for i in range(5):
    if i == 3:
        break
    print(i)
# prints 0 1 2
```

The value of `i` goes from 0, but when it reached 3 the loop was exited by the `break`, so 3 and 4 never print.

**`continue`** skips the **current iteration** and moves to the next one.

```python
for i in range(5):
    if i == 3:
        continue
    print(i)
# prints 0 1 2 4
```

When `i` was 3, `continue` merely exited that one iteration — the loop moved on to `i = 4` without executing the rest of the body.

The distinction: `break` leaves the loop entirely, `continue` skips one pass through it.
