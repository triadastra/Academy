# 2.1 Booleans and Conditionals

Every decision a program makes reduces to a **Boolean** — a value that is either `True` or `False`. This lesson covers the operators that produce Booleans, the operators that combine them, and the `if` statement that acts on them.

## Boolean values

Boolean values have only two possible values: `True` or `False`.

```python
'5' + '6' == '56'    # False  — '5' + '6' is '56', so this is... True?
```

Careful with that one. `'5' + '6'` concatenates to `'56'`, so the expression **is** `True`. The version that evaluates to `False` is comparing a string to a number, as below.

```python
1 != '1'    # True   — an int is never equal to a str
8 >= 8      # True
```

## Relational operators

| Operator | Meaning | Example |
|---|---|---|
| `<` | Less than | `2 ** 3 < 9` → True |
| `>` | Greater than | `0 > 1` → False |
| `<=` | Less than or equal to | `4 <= 5` → True |
| `>=` | Greater than or equal to | `9 ** 0.5 >= 3` → True |
| `==` | Equal to | `1 == 2` → False |
| `!=` | Not equal to | `'B' != 'B'` → False |

Note `=` assigns while `==` compares. Writing `if x = 5:` is a syntax error in Python, which is the language doing you a favour.

## Boolean operators

There are three: `not`, `and`, `or`. Like relational operators, they evaluate expressions down to a Boolean value.

- **`and`** — `True` only if **both** values are `True`.
- **`or`** — `True` if **either** one is `True`.
- **`not`** — the **opposite** Boolean value.

## Truth tables

A **truth table** shows all possible results of a Boolean operator.

**and:**

| Expression | Evaluates to |
|---|---|
| `True and True` | `True` |
| `True and False` | `False` |
| `False and True` | `False` |
| `False and False` | `False` |

**or:**

| Expression | Evaluates to |
|---|---|
| `True or True` | `True` |
| `True or False` | `True` |
| `False or True` | `True` |
| `False or False` | `False` |

**not:**

| Expression | Evaluates to |
|---|---|
| `not True` | `False` |
| `not False` | `True` |

## Precedence

Operator precedence follows this order:

$$() \;>\; \texttt{not} \;>\; \texttt{and} \;>\; \texttt{or}$$

So `not` binds tightest and `or` loosest. In `a > b and c > d or not b == c`, the relational comparisons happen first, then `not`, then `and`, then `or`. When in doubt, add parentheses — they cost nothing and remove all ambiguity.

## Practice

Which of these evaluate to `True`?

```python
2 >= 2 and 1 < 3          # True
1 <= 2 or 1 != 1          # True
not "A" == "a"            # True

not 1 == 1                # False
"a" == "A" or "b" == "B"  # False
3 > 4 and 3 < 5           # False
```

Further exercises — evaluate each:

```python
"T" == "t" or 4 > 1
13 % 5 > 3 and not 3 == 2
(3 * 5) % (12 / 2) >= 9 ** (1 / 2)
9 > 3 * 3 or not 11 - 5 < 6 and 2 + 5 >= 7
```

The last one exercises precedence fully: `and` is resolved before `or`, so it reads as `(9 > 9) or ((not (6 < 6)) and (7 >= 7))`.

## The if statement

```python
if condition:
    statements
elif other_condition:
    statements
else:
    statements
```

Only the **first** matching branch runs. `elif` is checked only when every condition above it was `False`, which is why ordering the branches matters when their conditions overlap.
