# 12.1 Sets and Inequalities

This lesson covers the language of sets — the basic vocabulary of all later algebra — and the methods for solving inequalities, including the sign-analysis technique used for polynomial and absolute-value inequalities.

## Sets

A **set** is a collection of distinct objects, called elements. Sets are written in braces: $\{2, 3, 5, 7, 11, 13, 17, 19\}$.

- **Two sets are equal** if they contain the same elements.
- **$A$ is a subset of $B$** if every element of $A$ is also an element of $B$.
- **$A$ is a proper subset of $B$** if $A$ is a subset but $A \neq B$.
- The **empty set** is $\{\ \}$ (or $\varnothing$) — a set containing **no** elements.
- A set is **finite** if $n(A)$ has a definite value, and **infinite** otherwise.

## Operations on sets

- **Intersection** ($A \cap B$) — the elements in **both** $A$ and $B$.
  $\{1,2,3,4,5,6,7\} \cap \{2,3,5,7,9,11\} = \{2,3,5,7\}$
- **Union** ($A \cup B$) — all the elements in **either** set.
  $\{1,2,3\} \cup \{4,5,6\} = \{1,2,3,4,5,6\}$
- **Complement** ($A'$) — the **universal set $U$** (the set of all elements under consideration) excluding $A$.
  If $U = \{1,2,3,4,5\}$ and $A = \{2,3,5\}$, then $A' = \{1,4\}$.

**Interval notation** describes a set on a number line, and is the usual way to express the solution of an inequality.

## Solving inequalities

Inequalities obey the same manipulations as equations, with one crucial exception: **multiplying or dividing by a negative number reverses the inequality sign.**

The connection between functions, equations, and inequalities is worth stating: solving $f(x) = 0$ finds where a graph crosses the $x$-axis, and solving $f(x) > 0$ finds where it lies **above** the axis. The zeros divide the line into intervals, and the sign can only change at a zero.

## Polynomial inequalities

The general method uses that fact directly:

1. Find the **zeros** and use them to cut the number line into intervals.
2. Mark all zeros on a sketch of the number line.
3. Determine the sign on the rightmost interval — for a positive leading coefficient, the left-hand side is positive there.
4. Move leftwards, changing sign at each zero **according to its multiplicity**.

The multiplicity rule is the part most often missed:

> Where a factor has **even** multiplicity, the graph **bounces back** at that zero and the sign does **not** change.
> Where it has **odd** multiplicity, the graph **crosses** and the sign does change.

## Absolute value inequalities

The basic forms split into two cases:

- $|x| < a$ becomes $-a < x < a$ — a single interval.
- $|x| > a$ becomes $x < -a$ **or** $x > a$ — two separate intervals.

For more complex absolute-value inequalities, either discuss the cases separately according to the sign of the expression inside, or — where both sides are known to be non-negative — **square both sides**, which is valid only under that condition.
