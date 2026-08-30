# 1.3 Strings

Strings are the first data type where **indexing** matters, and the first where an important Python principle appears: **string methods never change the string itself** — they return a new one.

## Indexing

Syntax: `str[index]`. **The first item's index is 0.** Negative indices count from the end, with `-1` being the last character.

```python
s = 'Hello World!'
s[0]     # 'H'
s[4]     # 'o'
s[-1]    # '!'
```

## Slicing

`str[start:end]` — the **start is inclusive, the end is exclusive**.

```python
s = 'helloworld'
s[:-1]    # 'helloworl'
s[-1:]    # 'd'
s[:1]     # 'h'
s[1:]     # 'elloworld'
```

An omitted bound means "to the end of the string" in that direction. The exclusive end is why `s[:3]` and `s[3:]` fit together exactly, with no overlap and no gap.

## len() and membership

`len(str)` counts and returns the length of the string.

**Membership operators** determine whether a value is or is not in a string or list:

```python
s = 'helloworld'
print('h' in s)       # True
print(' ' in s)       # False
print('+' in '1+2')   # True
```

## Whitespace and character stripping

`str.strip()` returns a **new** string without any whitespace characters at the beginning or end.

```python
s = '   helloworld   '
print(s.strip())          # 'helloworld'
```

`str.strip('s')` removes leading and trailing occurrences of `'s'`:

```python
print('sshelloworldss'.strip('s'))    # 'helloworld'
print('sshelloworldshs'.strip('s'))   # 'helloworldsh'
```

The second example is the instructive one. Stripping stops at the first character that is not in the strip set, so the interior `s` in `worldshs` survives — `strip` works from the two ends inward, never from the middle.

`lstrip()` and `rstrip()` strip from one side only:

```python
print('sshelloworldss'.lstrip('s'))   # 'helloworldss'
print('sshelloworldss'.rstrip('s'))   # 'sshelloworld'
```

## split() and join()

`str.split()` with no argument splits on whitespace; with a delimiter it splits on that delimiter. **It will not change the string itself.**

```python
s = 'hello world'
print(s.split())      # ['hello', 'world']
print(s)              # 'hello world'  — unchanged

print('ABhelloABworldAB'.split('AB'))   # ['', 'hello', 'world', '']
```

`delimiter.join(list)` concatenates the strings in a list with the delimiter in between and returns a **new** string:

```python
lst = ['hello', 'world']
print(' '.join(lst))    # 'hello world'
print(lst)              # ['hello', 'world']  — unchanged
```

Joining a string rather than a list inserts the delimiter between every **character**:

```python
print(' '.join('helloworld'))    # 'h e l l o w o r l d'
```

`splitlines()` splits on line breaks:

```python
text = "Line 1\nLine 2\nLine 3"
print(text.splitlines())    # ['Line 1', 'Line 2', 'Line 3']
```

## Changing case

Also **will not change the string itself**:

```python
print('hello World'.upper())    # 'HELLO WORLD'
print('hello World'.lower())    # 'hello world'
print('hello World'.title())    # 'Hello World'
```

## Searching and replacing

```python
s = "banana"
print(s.find("na"))            # 2   — index of the first occurrence
print(s.count("a"))            # 3
print(s.replace("na", "NA"))   # 'baNANA'
```

## The isxxx() tests

Each returns a Boolean:

| Method | Returns True if |
|---|---|
| `str.isupper()` | All letters are uppercase |
| `str.islower()` | All letters are lowercase |
| `str.isalnum()` | The characters are alphanumeric |
| `str.isdigit()` | All the characters are digits |
| `str.isalpha()` | All the characters are letters |

## Worked example: cleaning input

Clean a string of leading and trailing special characters, including whitespace.

Sample input: `----***---- I am a student in SHSID ----***`
Sample output: `I am a student in SHSID`

```python
s = input()
print(s.strip('-*  '))
```

`strip` accepts a **set** of characters, not a substring, so passing `'-* '` removes any mixture of dashes, asterisks, and spaces from both ends until a character outside that set is reached.
