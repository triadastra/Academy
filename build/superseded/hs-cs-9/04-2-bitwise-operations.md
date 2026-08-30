# 4.2 Bitwise Operations

Bitwise operations manipulate **individual bits** rather than whole numbers. They are the operations the processor actually performs, and they appear whenever a program packs several flags into one value or needs a fast multiply or divide by a power of two.

## The operators

| Operator | Name | Returns 1 when… | Example |
|---|---|---|---|
| `&` | AND | **Both** bits are 1 | `1010 & 1100 = 1000` |
| `\|` | OR | **At least one** bit is 1 | `1010 \| 1100 = 1110` |
| `^` | XOR | The bits are **different** | `1010 ^ 1100 = 0110` |
| `<<` | Left shift | — | `1010 << 1 = 10100` |
| `>>` | Right shift | — | `1010 >> 1 = 0101` |

Working `1010 & 1100` column by column, from the left: 1 and 1 gives 1; 0 and 1 gives 0; 1 and 0 gives 0; 0 and 0 gives 0 — hence `1000`.

## Comparing AND, OR, and XOR

The three differ only in how they treat the "one of each" case:

| a | b | `a & b` | `a \| b` | `a ^ b` |
|---|---|---|---|---|
| 0 | 0 | 0 | 0 | 0 |
| 0 | 1 | 0 | 1 | 1 |
| 1 | 0 | 0 | 1 | 1 |
| 1 | 1 | 1 | 1 | **0** |

XOR is the one that returns 0 for two 1s. That is what makes it the "are these different?" operator — and why `a ^ a` is always 0.

## Shifts

- **Left shift (`<<`)** shifts bits to the left, adding 0s on the right.
- **Right shift (`>>`)** shifts bits to the right, discarding the bits that fall off.

Because each position is a power of two, shifting left by one **doubles** the value and shifting right by one **halves** it (discarding any remainder):

$$1010_2 = 10, \qquad 1010_2 \ll 1 = 10100_2 = 20$$

$$1010_2 \gg 1 = 101_2 = 5$$

This is why shifts appear in performance-sensitive code — a shift is a single processor instruction, where a general multiplication is not.

## Bitwise versus Boolean operators

Do not confuse these with the Boolean operators of 2.1:

- `and` / `or` / `not` operate on **whole truth values** and return `True` or `False`.
- `&` / `|` / `^` operate on **each bit position independently** and return a number.

In pandas (5.2) the situation reverses: because a Boolean Series holds many truth values at once, the **bitwise** operators `&` and `|` are the ones used to combine conditions, not `and` and `or`.
