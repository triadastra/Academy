# 5.1 pandas: Series and DataFrames

pandas provides two data structures. A **Series** is one-dimensional; a **DataFrame** is two-dimensional. Everything else in the library builds on them.

## Series

A **Series** is a one-dimensional array consisting of a **set of index** and a **set of data**. The data can be any list, dictionary, or scalar value.

**From a list** — the index defaults to 0, 1, 2, …:

```python
s1 = pd.Series(["12", "34", "56", "78"])
```

**With a specific index:**

```python
s2 = pd.Series([1, 2, 3, 4], index=["line1", "line2", "line3", "line4"])
```

**From a dictionary** — the keys become the index:

```python
s3 = pd.Series({"a": 11, "b": 22, "c": 33, "d": 44})
```

The index is what distinguishes a Series from a plain Python list: elements can be reached by label, not only by position.

## DataFrame

A **DataFrame** is a two-dimensional array capable of storing various data types, with a set of index pairs (**rows and columns**) and a set of data (values).

There are six common ways to build one, and the important question for each is **which axis your data ends up on**.

**From a dictionary** — column names as keys, lists of values:

```python
data = {'state': ['Ohio', 'Texas'], 'year': [2020, 2021]}
df = pd.DataFrame(data)
```

**From a nested list** — each inner list is a **row**:

```python
s1 = ['Ohio', 2020]
s2 = ['Texas', 2021]
data = [s1, s2]
df1 = pd.DataFrame(data, columns=['state', 'year'])
```

**From a nested dictionary:**

```python
c1 = {'state': 'Ohio', 'year': 2020}
c2 = {'state': 'Texas', 'year': 2021}
df = pd.DataFrame({'line1': c1, 'line2': c2})
```

Note the transposition here: `line1` and `line2` become the **column** names, while `state` and `year` become the **row** names — the opposite of what the naming suggests. A nested dictionary maps outer key → column.

**From a list of Series** — each Series is one row:

```python
columnList = ['state', 'year']
s1 = pd.Series(['Ohio', 2020], index=columnList)
s2 = pd.Series(['Texas', 2021], index=columnList)
df = pd.DataFrame([s1, s2])
```

**From a dictionary of Series** — each Series is one column:

```python
columnList = ['line1', 'line2']       # row names
s1 = pd.Series(['Ohio', 'Texas'], index=columnList)
s2 = pd.Series([2020, 2021], index=columnList)
df = pd.DataFrame({'state': s1, 'year': s2})
```

**From a list of dictionaries** — each dictionary is one row:

```python
s1 = {'state': 'Ohio', 'year': 2020}
s2 = {'state': 'Texas', 'year': 2021}
df = pd.DataFrame([s1, s2])
```

The pattern to remember: a **list** of things gives rows; a **dictionary** of things gives columns.
