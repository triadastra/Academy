# 5.2 pandas: Selection and Modification

Nearly all data work is selecting a subset and changing it. The two central tools are `loc` (select by **label**) and `iloc` (select by **integer position**).

## Selecting columns

```python
df['col']                          # one column, as a Series
df[['col1', 'col2', 'col3']]       # several columns, as a DataFrame
```

Single brackets give a Series; double brackets give a DataFrame. The inner brackets are a **list of column names**, not extra syntax.

## Selecting rows

```python
df.loc['rowname']       # by label
df.iloc[index]          # by integer position
```

## loc and iloc together

```python
df.iloc[[row index], [column index]]
df.iloc[start:end + 1, start:end + 1]     # end excluded, hence the +1

df.loc[['row labels'], ['col labels']]
df.loc['row1':'row3', 'col1':'col3']      # end INCLUDED with labels
```

The slicing conventions differ: **`iloc` excludes the end** like ordinary Python slicing from 1.3, while **`loc` includes it**, because a label slice would otherwise have no way to reach the last row.

## Selection with a condition

Comparing a column to a value produces a **Boolean Series** — one `True`/`False` per row:

```python
df.loc[df['col'] == value]
```

**Multiple conditions** use `&` (and) and `|` (or), with each condition **wrapped in parentheses**:

```python
boolSeries = (data['age'] >= 14) & (data['country'] == 'USA')
data = df[boolSeries]
```

Or in one line:

```python
data = df[(df['col1'] == value1) & (df['col2'] == value2)]
```

Two rules that are easy to get wrong here:

- Use the **bitwise** `&` and `|`, not the Boolean `and` and `or` from 2.1. A Boolean Series holds many truth values, and `and` cannot reduce it to one.
- The **parentheses are required**, because `&` binds more tightly than `==`. Without them, `df['age'] >= 14 & df['country'] == 'USA'` is parsed as nonsense.

## Extracting

```python
df1 = df.loc[df['col'] == 'condition', ['col1', 'col2']]
df2 = df.loc[df['col'] == 'condition'][['col1', 'col2']]
```

Both work; the first is preferred, since it selects rows and columns in a single operation rather than building an intermediate DataFrame.

## Modifying

**One cell:**

```python
df.loc['row', 'col'] = value
df.iloc[rowind, colind] = value
```

**One row, by condition:**

```python
df.loc[df['col'] == 'condition'] = [val1, val2, ...]
df.loc[df['col'] == 'condition', 'col'] = value
df.loc[df['col'] == 'condition', ['col1', 'col2']] = [value1, value2]
```

**Adding or modifying a column:**

```python
df['col'] = [value1, value2, ...]
df.loc[:, 'col'] = [value1, value2, ...]
```

The `:` means "all rows". Assigning to a column name that does not exist **creates** it, exactly as with dictionary keys in 1.4.

## Deleting

**By column label:**

```python
del df['col_name']
del df[df.columns[col_index]]
```

**By row or column label, with `drop`:**

```python
df = df.drop(['row_label1', 'row_label2'])
df = df.drop(['col_label'], axis=1)
```

**By row label number:**

```python
df = df.drop([row_label_num])
df = df.drop([row_label_num1, row_label_num2])
```

**By condition** — keep everything that does not match:

```python
df = df.loc[df['col'] != 'condition', :]
```

Note that `drop` **returns a new DataFrame** rather than modifying in place, which is why the result must be reassigned. Calling `df.drop(...)` without assigning it does nothing observable — one of the most common pandas mistakes.
