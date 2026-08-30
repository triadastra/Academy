# 2.3 Functions

In Python, **functions** are blocks of reusable code that perform a specific task. They fall into two types.

- **Built-in functions** come pre-defined in Python — `print()`, `len()`, `max()`, and many others. They provide essential functionality without any setup.
- **User-defined functions** are ones you create, defined with the `def` keyword followed by the function name.

## Defining a function

When defining a function, specify **parameters** (arguments) that allow you to pass data into it:

```python
def function_name(parameter1, parameter2):
    # Function body
    # Code to execute
```

```python
def greet(name):
    print(f"Hello, {name}!")

greet("Alice")    # Output: Hello, Alice!
```

## The return statement

`return` exits a function and sends a value back to the caller. **If no return statement is specified, the function returns `None`.**

```python
def add(a, b):
    return a + b

result = add(5, 3)
print(result)    # 8
```

The distinction between `print` and `return` is worth fixing early. `print` shows a value to a human; `return` hands it back to the program. A function that prints but does not return gives you nothing you can compute with.

## Worked example: isprime()

A function that checks whether a number is prime:

```python
def isprime(n):
    """Check if a number is prime."""
    if n <= 1:
        return False
    for i in range(2, int(n ** 0.5) + 1):
        if n % i == 0:
            return False
    return True

number = 29
if isprime(number):
    print(f"{number} is a prime number.")
else:
    print(f"{number} is not a prime number.")
```

The function checks every candidate factor of `n` from 2 up to $\sqrt{n}$. If no number in that range divides `n`, then `n` is prime.

**Why $\sqrt{n}$ is enough:** if $n = a \times b$ with $a \le b$, then $a \le \sqrt{n}$. So any composite number must have a factor at or below its square root — searching further finds nothing new. This single observation turns an $O(n)$ loop into an $O(\sqrt{n})$ one.

Note also the early `return False` inside the loop: once a factor is found there is no reason to keep testing, and returning immediately is both faster and clearer than setting a flag.

## Docstrings

The triple-quoted string on the first line of a function body is a **docstring** — a comment describing what the function does. It is conventional, and tools can read it, but it does not affect execution.
