# 3.2 Sorting Algorithms

Sorting **improves efficiency** and **makes data more readable** — it is why an online store can offer "sort by price, low to high", and it is the precondition for binary search in 3.1.

## Selection sort

**Steps:**

1. Find the **smallest** number in the whole array.
2. Swap it into the first position.
3. Repeat for the remaining unsorted portion, starting one position further right each round.

**Comparison with bubble sort:** bubble sort **swaps many times each round**, comparing and exchanging adjacent pairs repeatedly. Selection sort scans the whole unsorted region but performs **exactly one swap per round**. Both make roughly the same number of comparisons; selection sort simply moves less data.

```python
def selection_sort(arr):
    for i in range(len(arr)):
        smallest = i
        for j in range(i + 1, len(arr)):
            if arr[j] < arr[smallest]:
                smallest = j
        arr[i], arr[smallest] = arr[smallest], arr[i]
    return arr
```

The inner loop records the **index** of the smallest element, not the value. Recording the value would leave you with nothing to swap.

## Insertion sort

Insertion sort **maintains a sorted sublist on the left**. It takes one element from the unsorted portion and **inserts it into the correct position** of the sorted sublist.

**Steps:** start with the second item, and for each item, move it left past every larger element until it sits in place.

**Example.** Sorting `49 38 65 97 76 13 27 49`:

```
Insert 38 into [49]          → [38 49]
Insert 65                    → [38 49 65]
Insert 97                    → [38 49 65 97]
Insert 76                    → [38 49 65 76 97]
Insert 13                    → [13 38 49 65 76 97]
Insert 27                    → [13 27 38 49 65 76 97]
Insert 49                    → [13 27 38 49 49 65 76 97]
```

```python
def insertion_sort(arr):
    for i in range(1, len(arr)):
        key = arr[i]
        j = i - 1
        while j >= 0 and arr[j] > key:
            arr[j + 1] = arr[j]
            j -= 1
        arr[j + 1] = key
    return arr
```

The loop starts at index 1, not 0, because a single-element sublist is already sorted — there is nothing to insert it into.

Insertion sort is fast on **nearly sorted** data: each element moves only a short distance, so the inner `while` exits almost immediately. On reversed data it is at its worst, moving every element the full length of the sorted region.

## Choosing an algorithm

Both algorithms shown are $O(n^2)$ — doubling the input roughly quadruples the work — which is fine for the small lists in this course but not for large data. The important idea is the trade-off: selection sort minimises **swaps**, insertion sort exploits **existing order**. Real library sorts use $O(n \log n)$ algorithms built on the divide-and-conquer principle behind binary search in 3.1.
