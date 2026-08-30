# 1.2 Variables, Data Types, and Operators

**Variables** are containers for storing data values. This lesson covers naming them, assigning to them, converting between types, and the operators that combine them.

## Naming variables

A variable name **can contain only letters, numbers, and underscores** — no spaces, no special characters, and **no number at the start**. Avoid reserved keywords.

Names should be **short and descriptive**. Three conventional styles:

| Style | Example |
|---|---|
| **Camel case** | `myOneMethod` |
| **Snake case** | `a_b_c` |
| **Pascal case** | `MyClass` |

Camel case makes compound names more readable: `myOneMethod` is easier to read than `myonemethod`. Python's own convention is snake case for variables and functions.

## Assignment

The `=` operator assigns a value to a variable.

```python
a = 0

x = y = z = 50          # one value to several variables
a, b, c = 5, 10, 15     # several values to several variables
```

## Type conversion and input

`str()`, `int()`, and `float()` convert to string, integer, and floating-point number respectively.

`input()` takes in a data value from the user — **always as a string**, so numeric input must be converted:

```python
n = int(input("Enter n: "))
```

Forgetting the `int()` is the classic first bug: `input()` returns `"5"`, not `5`, and `"5" + 1` is an error.

## Expressions

**Expressions** consist of values and operators, and always **evaluate down to a single value**:

```python
(2 * x + 2 * y) ** (1 / 2)
```

## Arithmetic operators

| Operator | Meaning | Example |
|---|---|---|
| `**` | Exponentiation | `2 ** 3` → 8 |
| `*` | Multiplication | `4 * 3` → 12 |
| `/` | Division (always float) | `4 / 3` → 1.333… |
| `%` | Remainder (modulo) | `4 % 3` → 1 |
| `//` | Floor division | `4 // 3` → 1 |
| `+` `-` | Addition, subtraction | |

**Modulo** returns the remainder after dividing the first operand by the second: `22 % 5` is 2.

**Floor division** returns the floor of the quotient — which for negative numbers is *not* truncation toward zero. Consider `-14 // 3`: the true quotient is $-4.67$, and the floor of that is $-5$, not $-4$. Python rounds **down**, always.

## Operator precedence

Evaluated in this order, highest first:

| Level | Operators |
|---|---|
| 1 | `**` |
| 2 | `*` `/` `%` `//` |
| 3 | `+` `-` |
| 4 | `<=` `<` `>` `>=` `!=` `==` |
| 5 | `not`, `and`, `or` |

Parentheses override everything. A useful digit-extraction idiom that relies on this ordering:

```python
import math
math.floor(123 / 10) % 10    # → 2, the tens digit of 123
```
