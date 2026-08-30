# 5.3 Plotting with matplotlib

matplotlib turns the data of 5.1 and 5.2 into figures. Every plot follows the same shape: call a plotting function, customise it, then show it.

## The plot types

```python
plt.plot([1, 2, 3, 4], [1, 4, 9, 16])                      # line plot
plt.scatter([1, 2, 3, 4], [1, 4, 9, 16])                   # scatter plot
plt.bar(['A', 'B', 'C', 'D'], [20, 35, 30, 25])            # bar plot
plt.barh(['A', 'B', 'C', 'D'], [20, 35, 30, 25])           # horizontal bars
plt.hist(np.random.randn(1000), bins=20)                   # histogram
plt.pie([15, 30, 45, 10], labels=['A', 'B', 'C', 'D'])     # pie chart
```

Note that `plot` and `scatter` take **two** sequences — x values and y values — while `bar` takes labels and heights, and `hist` takes a single set of raw values and counts them into `bins` itself.

## Global settings with rcParams

`rcParams` sets defaults for every plot that follows:

```python
plt.rcParams['font.family'] = 'Times New Roman'
plt.rcParams['font.size'] = 12
```

## Labels and legends

```python
plt.legend(loc='position')
```

Valid positions: `'best'`, `'upper right'`, `'upper left'`, `'lower left'`, `'lower right'`, `'right'`, `'center left'`, `'center right'`, `'lower center'`, `'upper center'`, `'center'`.

`'best'` lets matplotlib choose the spot that overlaps the data least — usually the right answer unless you need a fixed position across several figures.

## Axis customisation

```python
plt.xticks()      # set or read the tick positions and labels
plt.yticks()
plt.xlim()        # set the visible range
plt.ylim()

plt.grid(axis='x', linestyle='--')     # axis = 'x', 'y', or 'both'
```

## Figure size and twin axes

```python
plt.figure(figsize=(width, height))
```

`plt.twinx()` creates a second y-axis sharing the same x-axis. **Write the code for the other dataset directly after calling it** — everything plotted after `twinx()` goes on the new axis. This is how two quantities with different units (temperature and rainfall, say) share one figure.

## Subplots and GridSpec

`GridSpec` customises the grid structure of a figure, giving subplots of unequal size rather than a plain uniform grid.

## The zip() function

`zip()` combines several sequences into tuples, pairing up their elements:

```python
list1 = [1, 2, 3]
list2 = ['a', 'b', 'c']
zipped = zip(list1, list2)      # (1,'a'), (2,'b'), (3,'c')
```

This is the standard way to iterate data series, colours, and labels together:

```python
for data, color, label in zip(all_series, colors, labels):
    plt.plot(data, color=color, label=label)
plt.legend()
```

Without `zip`, the same loop needs an index variable and three subscripts — more code and more room for an off-by-one error.
