# 14.1 Properties and Transformations of Functions

This lesson covers how functions combine, the properties used to classify them, and the rules for translating, reflecting, and dilating a graph — rules that apply to every family of functions, not just the ones met so far.

## Operations on functions

Two functions can be combined pointwise:

- **Sum:** $(f + g)(x) = f(x) + g(x)$
- **Difference:** $(f - g)(x) = f(x) - g(x)$
- **Product:** $(fg)(x) = f(x)\,g(x)$
- **Quotient:** $\left(\frac{f}{g}\right)(x) = \frac{f(x)}{g(x)}$, where $g(x) \neq 0$

**Composite functions** combine two functions by **successive application**: $(f \circ g)(x) = f(g(x))$, read "$f$ of $g$ of $x$". The domain of the composite consists of those $x$ in the domain of $g$ for which $g(x)$ lies in the domain of $f$ — both conditions, not just the first.

## Properties of functions

**Monotonicity.** Let $f$ be defined on an interval $I$. Then $f$ is **strictly increasing** on $I$ if larger inputs always give larger outputs, and **strictly decreasing** if larger inputs always give smaller outputs.

**Even and odd functions:**

- $f$ is **even** if $f(-x) = f(x)$ — symmetric about the $y$-axis.
- $f$ is **odd** if $f(-x) = -f(x)$ — symmetric about the origin.

Most functions are neither.

Any function of the form $y = \dfrac{ax + b}{cx + d}$ with $ad \neq bc$ can be rewritten as $y = \dfrac{k}{x}$ shifted — that is, every such rational function is a translated hyperbola.

## Inverse functions

A function $f$ has an inverse $f^{-1}$ only if it is **one-to-one**.

Properties:

1. The **domain and range of $f$ are the range and domain of $f^{-1}$** respectively.
2. All functions must be one-to-one to have an inverse.
3. The graph of $f^{-1}$ is the **reflection of the graph of $f$ about $y = x$**.
4. $f\big(f^{-1}(x)\big) = x$ and $f^{-1}\big(f(x)\big) = x$, each on the appropriate domain.

The one-to-one requirement exists because an inverse must assign a single output to each input; a function taking the same value twice cannot be undone unambiguously.

## Transformations of graphs

Given $y = f(x)$:

**Translation**

- **Horizontal**, left/right by $k$ units: $y = f(x \pm k)$
- **Vertical**, up/down by $k$ units: $y = f(x) \pm k$

Horizontal translations behave counterintuitively: $f(x + k)$ shifts the graph **left**, not right, because the input reaches its value $k$ units earlier.

**Reflection**

- About the $x$-axis: $y = -f(x)$
- About the $y$-axis: $y = f(-x)$

**Dilation**

- **Vertical:** $y = cf(x)$ — stretches by a factor of $c$ away from the $x$-axis.
- **Horizontal:** $y = f(cx)$ — compresses by a factor of $c$ toward the $y$-axis.

Again the horizontal case is inverted: a factor $c$ inside the function **compresses** rather than stretches.

**Absolute value transformations**

- $y = |f(x)|$ — keep the graph above the $x$-axis and reflect the part below it upward.
- $y = f(|x|)$ — keep the graph on the right of the $y$-axis and reflect it across.

The pattern throughout: **changes outside the function affect the output and behave as expected; changes inside affect the input and behave in reverse.**

## Locus

A **locus** is a set of points, all of which meet a stated condition.

The general method for finding the equation of a locus:

1. Let the point be $(x, y)$.
2. Write an equation expressing the stated condition.
3. Simplify.

A circle is the standard example — the locus of points at a fixed distance from a centre, which yields its equation directly from the distance formula.

## Symmetry in functions

A function is **symmetric about a line** if reflecting in that line leaves it unchanged, and **symmetric about a point** if a 180° rotation about that point leaves it unchanged. Even functions are the first case with the line $x = 0$; odd functions the second with the origin.
