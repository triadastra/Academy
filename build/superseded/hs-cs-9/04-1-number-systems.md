# 4.1 Number Systems and Data Representation

Every value a computer stores is ultimately a pattern of bits. This lesson covers the positional number systems used to write those patterns down, and how to convert between them.

## The decimal system

The decimal system is a **positional** system using **10 digits (0–9)**. **Base-10:** each place value is a power of 10.

$$6352_{10} = 6 \times 10^3 + 3 \times 10^2 + 5 \times 10^1 + 2 \times 10^0$$

Base-10 is assumed if the base is omitted.

## The binary system

The binary system is widely used in computer science. It consists of only **two digits: 0 and 1**. **Base-2:** each place value is a power of 2.

$101110_2$ requires the base to be specified — without it, the number would be read as decimal.

## Bits and bytes

- Each 0 or 1 is called a **bit** (binary digit).
- A group of **eight bits is a byte**, abbreviated as an uppercase **B**.
- **Transmission speeds** are often measured in **bits per second (b/s)**.
- **Storage space** is typically measured in **bytes**.

$$1\ \text{byte} = 8\ \text{bits}, \qquad 1\ \text{KiB} = 1024\ \text{bytes}, \qquad 1\ \text{MiB} = 1024\ \text{KiB}$$

The lowercase/uppercase distinction is not decoration: a 100 Mb/s connection transfers about 12.5 MB per second, an eightfold difference.

## Binary to decimal

Multiply each digit by its place value and add:

$$10011101_2 = 128 + 16 + 8 + 4 + 1 = 157_{10}$$

```python
def bin_to_dec(b):
    total = 0
    for i in range(len(b)):
        total += int(b[len(b) - 1 - i]) * (2 ** i)
    return total
```

The loop walks the string from the **right**, since the rightmost digit carries the $2^0$ place.

## Decimal to binary

Divide by 2 repeatedly and collect the **remainders**, reading them **bottom to top**.

Converting 89:

```
89 / 2 = 44  remainder 1
44 / 2 = 22  remainder 0
22 / 2 = 11  remainder 0
11 / 2 =  5  remainder 1
 5 / 2 =  2  remainder 1
 2 / 2 =  1  remainder 0
 1 / 2 =  0  remainder 1
```

Reading upward: $1011001_2$. By the same method, $25_{10} = 11001_2$.

```python
def dec_to_bin(n):
    b = ''
    while n > 0:
        b = str(n % 2) + b       # prepend, so digits end up in the right order
        n //= 2
    return b
```

Sample input `114514` gives `11011111101010010`.

Python's built-in `bin()` also converts decimals to binary — but **it won't be available on the test**, so the manual method is the one to know.

Note the prepend `str(n % 2) + b` rather than append. Appending would produce the digits in reverse.

## Converting between arbitrary bases

Go through decimal as an intermediate: convert base $n$ to decimal, then decimal to base $m$.

```python
def n_to_m(num_str, base_n, base_m):
    decimal = 0
    for i in range(len(num_str)):
        decimal += int(num_str[len(num_str) - 1 - i]) * (base_n ** i)
    result = ''
    while decimal > 0:
        result = str(decimal % base_m) + result
        decimal //= base_m
    return result
```

## Hexadecimal

**Hexadecimal notation is based on 16**, using digits 0–9 then A–F for 10–15.

$$\mathrm{1A}_{16} = 26_{10}, \qquad 255_{10} = \mathrm{FF}_{16}$$

**Each hexadecimal digit represents exactly 4 bits.** This is what makes hex useful: converting between binary and hex requires no arithmetic at all, just grouping the bits in fours.

$$1011\,0110_2 = \mathrm{B6}_{16}$$

## Practice: solving for the base

These problems ask for an unknown value or base:

| Question | Answer |
|---|---|
| $1234 = X_{10}$, what is the number of digits $X$? | 4 |
| $123 = X_8$, what is $X$ in decimal? | 83 |
| $67_8 = X_{16}$ | $\mathrm{37}_{16}$ |
| $19_x = 25_{10}$, what is $x$? | 16 |

The last one is solved by setting up the equation: $1 \cdot x + 9 = 25$, so $x = 16$.
