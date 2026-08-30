# 3.1 Recursion

A **recursive** function is one that calls itself. Every recursive function needs two things: a **base case** that stops the recursion, and a **recursive case** that moves toward it.

## Why a base case is necessary

Consider the factorial, defined recursively as $0! = 1$ and, for $n > 0$, $n! = n \times (n-1)!$.

The base case is $0! = 1$. (In fact $1!$ is also 1, since $1 \times 0! = 1$.) **Without a base case the function would call itself forever** — or until a **stack overflow**. Defining $0! = 1$ provides a stopping point and is consistent with the mathematical definition.

```python
def factorial(n):
    if n == 0:          # base case
        return 1
    else:
        return n * factorial(n - 1)
```

If `n` is 0 the function returns 1. Otherwise it returns `n` multiplied by the factorial of $n-1$, directly mirroring the definition.

**Tracing `factorial(5)`:**

```
factorial(5) = 5 × factorial(4)
             = 5 × (4 × factorial(3))
             = 5 × (4 × (3 × factorial(2)))
             = 5 × (4 × (3 × (2 × (1 × 1))))     [factorial(0) = 1]
             = 5 × (4 × 6)
             = 5 × 24
             = 120
```

The function calls itself down from 5 to 0, then the results propagate back up, multiplying together.

## Fibonacci and the cost of naive recursion

The Fibonacci sequence: $F(0) = 0$, $F(1) = 1$, and for $n \ge 2$, $F(n) = F(n-1) + F(n-2)$.

$$F(2) = 1 + 0 = 1, \quad F(3) = 1 + 1 = 2, \quad F(4) = 2 + 1 = 3, \quad F(5) = 3 + 2 = 5$$

```python
def fib(n):
    if n == 0:
        return 0
    elif n == 1:
        return 1
    else:
        return fib(n - 1) + fib(n - 2)
```

**Why this is inefficient.** The naive recursive approach is elegant but recomputes values many times. To compute `fib(5)`, the function computes `fib(4)` and `fib(3)` — but `fib(4)` itself calls `fib(3)` and `fib(2)`. So `fib(3)` is computed **twice** and `fib(2)` **three times**.

In general `fib(n)` recalculates lower Fibonacci numbers repeatedly. This **exponential blow-up** makes it very slow for larger `n`. The problem is **overlapping subproblems** — the same value is recomputed along different branches of the call tree. (Factorial has no such overlap, which is why its recursion is efficient.)

## Permutations

All permutations of `[1, 2, 3]`:

$$[1,2,3],\; [1,3,2],\; [2,1,3],\; [2,3,1],\; [3,1,2],\; [3,2,1]$$

A helper that inserts an element at every position of a list:

```python
def insert_at_all_positions(x, perm):
    result = []
    for i in range(len(perm) + 1):
        new_perm = perm[:i] + [x] + perm[i:]
        result.append(new_perm)
    return result
```

`insert_at_all_positions(3, [1, 2])` returns `[[3,1,2], [1,3,2], [1,2,3]]`.

The recursive permutation function:

```python
def permute(lst):
    if len(lst) == 0:
        return [[]]                    # base case
    first = lst[0]
    rest = lst[1:]
    perms_of_rest = permute(rest)
    result = []
    for perm in perms_of_rest:
        result.extend(insert_at_all_positions(first, perm))
    return result
```

It removes the first element, recursively finds all permutations of the rest, then inserts the removed element into every possible position of each. The base case returns `[[]]` — a list containing one empty list, the single permutation of an empty list. Returning `[]` instead would give an empty result all the way back up.

## Power set

All subsets of $\{1, 2\}$ are the empty set, $\{1\}$, $\{2\}$, and $\{1,2\}$ — in list form `[]`, `[1]`, `[2]`, `[1,2]`. It is important to include **both** the empty set and the full set.

**The include/exclude idea.** Suppose you already have all subsets of $\{2, 3, \ldots, n\}$ — these are exactly the subsets of $\{1, \ldots, n\}$ that do **not** include 1. For each of them, adding the element 1 gives a subset that **does** include 1. The two groups together are all subsets of $\{1, \ldots, n\}$.

For $n = 3$: subsets of $\{2,3\}$ are $\{\}, \{2\}, \{3\}, \{2,3\}$. Adding 1 to each gives $\{1\}, \{1,2\}, \{1,3\}, \{1,2,3\}$, and the eight together are all subsets of $\{1,2,3\}$.

```python
def subsets(lst):
    if len(lst) == 0:
        return [[]]                    # base case
    first = lst[0]
    rest = lst[1:]
    subsets_without_first = subsets(rest)
    subsets_with_first = []
    for sub in subsets_without_first:
        subsets_with_first.append([first] + sub)
    return subsets_without_first + subsets_with_first
```

Note that the number of subsets doubles with each element — $2^n$ in total — which is exactly what "each element is either in or out" predicts.

## Binary search: divide and conquer

Binary search works by repeatedly **dividing the search interval in half**. Compare the target to the element at the middle of the current range:

- If the target **equals** the middle element, the search succeeds.
- If the target is **smaller**, discard the upper half and continue in the lower half.
- If the target is **larger**, discard the lower half and continue in the upper half.

By always choosing the half that could contain the target, the algorithm halves the search space at each step.

```python
def binary_search_rec(arr, target, low, high):
    if low > high:
        return -1                      # target not found
    mid = (low + high) // 2
    if arr[mid] == target:
        return mid
    elif target > arr[mid]:
        return binary_search_rec(arr, target, mid + 1, high)
    else:
        return binary_search_rec(arr, target, low, mid - 1)

def binary_search(arr, target):
    return binary_search_rec(arr, target, 0, len(arr) - 1)
```

`binary_search` is a **wrapper** that calls the recursive helper with the initial full range.

**Trace for target 7 in `[1, 3, 5, 7, 9]`:**

| Call | low | mid | high | `arr[mid]` | Action |
|---|---|---|---|---|---|
| 1 | 0 | 2 | 4 | 5 | 7 > 5 → search right half |
| 2 | 3 | 3 | 4 | 7 | match → return 3 |

The sequence of `(low, mid, high)` was `(0,2,4)` then `(3,3,4)`, and the answer is index 3.

Binary search requires a **sorted** list. On an unsorted list, discarding half the range is unjustified and the result is meaningless.

## Height of a binary tree

Assume a binary tree of nodes, each with a value and pointers to a left and right child (which may be `None`). The **height** is the number of nodes on the longest path from the root down to a leaf. By definition an empty tree has height 0, and a tree with one node has height 1.

For a tree with root 10, left child 5 (whose right child is 7), and right child 15 (whose left child is 12): the longest root-to-leaf paths are $10 \to 5 \to 7$ and $10 \to 15 \to 12$, each 3 nodes, so the **height is 3**.

```python
def height(root):
    if root is None:
        return 0                       # base case: empty tree
    left_height = height(root.left)
    right_height = height(root.right)
    return 1 + max(left_height, right_height)
```

This captures the definition directly: $\text{height}(root) = 1 + \max(\text{height}(root.left), \text{height}(root.right))$.

## Counting islands: recursive flood fill

Imagine a 2D grid where each cell is 0 or 1. A cell with value 1 is **land**, 0 is **water**. Land cells adjacent **horizontally or vertically** form an **island**.

```
1 0 0 1
1 0 1 0
0 0 1 0
```

There are **three** islands: the cluster at $(0,0)$ and $(1,0)$ (vertically connected), the isolated cell at $(0,3)$, and the cluster at $(1,2)$ and $(2,2)$.

The flood-fill helper:

```python
def exploreIsland(grid, r, c):
    # Stop if out of bounds
    if r < 0 or r >= len(grid) or c < 0 or c >= len(grid[0]):
        return
    # Stop if water (or already visited)
    if grid[r][c] == 0:
        return
    grid[r][c] = 0                 # mark visited by sinking it
    exploreIsland(grid, r + 1, c)  # down
    exploreIsland(grid, r - 1, c)  # up
    exploreIsland(grid, r, c + 1)  # right
    exploreIsland(grid, r, c - 1)  # left
```

Marking the cell as 0 **before** recursing is what stops the recursion: without it, two adjacent land cells would call each other forever. Diagonal neighbours are not considered, per the usual definition of adjacency in grid problems.

```python
def count_islands(grid):
    if not grid:
        return 0
    num_islands = 0
    for r in range(len(grid)):
        for c in range(len(grid[0])):
            if grid[r][c] == 1:
                num_islands += 1
                exploreIsland(grid, r, c)
    return num_islands
```

Every time a land cell is found that has not been visited, a new island has been discovered: increment the counter and flood-fill it away. By the time the helper returns, that island is fully sunk, so no cell in it can trigger another count. On the example grid the function returns 3, and afterwards the grid is all zeros.
