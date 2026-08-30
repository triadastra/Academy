# 1.4 Lists and Dictionaries

Both store collections. The difference is how you reach an element: a **list** is ordered and reached by **position**, a **dictionary** is reached by **key**.

## Lists

A **list** is a collection of items in a particular order. Square brackets `[]` indicate a list, and individual elements are separated by commas.

```python
lst = [1, 2, 3, 4]
numList = [0, 1, 2, 3, 4, 5]
```

### Indexing

Access any element by giving its **index** — its position. Write the name of the list followed by the index in square brackets. Indexing **starts from 0**:

```python
lst[0]    # 1
lst[-1]   # 4
```

`len()` returns the number of elements:

```python
len(numList)    # 6
```

### Adding elements

`append()` adds a new element to the **end** of the list:

```python
numList.append(12)
# [0, 1, 2, 3, 4, 5, 12]
```

`insert()` adds at **any position** — specify the index and the value:

```python
numList.insert(2, 12)
# [0, 1, 12, 2, 3, 4, 5]
```

### Removing elements

Use the `del` statement when you know the **position**:

```python
del numList[2]
# [0, 1, 3, 4, 5]
```

Use the `remove()` method when you only know the **value**. It **deletes only the first occurrence** of the value you specify.

Unlike strings, **lists are mutable** — `append`, `insert`, `del`, and `remove` change the list in place rather than returning a new one. This is the opposite of the string behaviour in 1.3, and mixing the two up is a common source of bugs.

### Finding an element

`lst.index(value)` returns the index of the **first occurrence** of the value.

## Two-dimensional lists

A 2D list is a list whose elements are themselves lists — the standard representation of a grid or table.

Access elements with **double indices**, `nums[row][column]`, with indexing again starting at 0:

```python
nums = [[1, 2, 3],
        [4, 5, 6],
        [7, 8, 9]]

print(nums[2][1])     # 8
print(nums[-1][-1])   # 9
```

### Initialising with loops

```python
nums = []
for i in range(x):
    row = []
    for j in range(x):
        row.append(i)
    nums.append(row)
```

The inner loop builds one row; the outer loop collects the rows. Build the row **inside** the outer loop — creating `row = []` before the outer loop would append the same list object every time, so every row would be the same row.

## Dictionaries

A **dictionary** stores key–value pairs. Values are reached by key rather than by position.

```python
person = {"Name": "John", "Age": 30}
print(person["Name"])    # John
```

### Modifying

```python
person["Age"] = 31                 # change an existing value
person["City"] = "Shanghai"        # add a new key
del person["City"]                 # remove a key
```

Assigning to a key that does not exist **creates** it; there is no separate "add" method. Reading a key that does not exist, by contrast, raises an error.

### Iterating

```python
for key, value in person.items():
    print(f"{key}: {value}")
```

Output:

```
Name: John
Age: 30
```

## Choosing between them

Use a **list** when the data has a natural order and you access it by position — a sequence of scores, the rows of a grid. Use a **dictionary** when each item has a natural name — a student's fields, a word-frequency count as in 1.9.
