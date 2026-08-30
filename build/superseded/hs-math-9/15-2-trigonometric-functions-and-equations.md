# 15.2 Trigonometric Functions and Equations

Treating $\sin$, $\cos$, and $\tan$ as functions rather than ratios makes them tools for describing anything that repeats. This lesson covers periodic functions, the sine and cosine curves and their transformations, inverse trigonometric functions, and solving trigonometric equations.

## Periodic functions

A function is **periodic** if there is a positive number $p$ such that $f(x + p) = f(x)$ for all $x$. The **fundamental period** is the **smallest** such $p$.

Three quantities describe a sinusoidal graph:

- **Amplitude** $A = \tfrac{1}{2}(M - m)$ — **half the difference** between the maximum and minimum values.
- **Midline** — determined by the **average** of the maximum and minimum.
- **Frequency** — the number of cycles the graph completes over a given interval.

Amplitude is half the difference, not the maximum. For $y = 3\sin x + 5$ the amplitude is 3 and the midline is $y = 5$.

## The sine and cosine curves

For $y = \sin x$:

- **Domain:** $\mathbb{R}$
- **Range:** $[-1, 1]$
- **Period:** $2\pi$
- **Zeros:** $x = k\pi$, $k \in \mathbb{Z}$
- **Odd function:** symmetric about the origin

For $y = \cos x$ the shape is identical but shifted: it is an **even** function, symmetric about the $y$-axis, with zeros at $x = \frac{\pi}{2} + k\pi$.

$y = \tan x$ has period $\pi$ rather than $2\pi$, and vertical asymptotes where $\cos x = 0$.

## Transformations

Applying 14.1 to sinusoids:

- **Vertical dilation:** $y = a\sin x$ — changes the **amplitude** to $|a|$.
- **Horizontal dilation:** $y = \sin(bx)$ — changes the **period** to $\frac{2\pi}{b}$.
- **Horizontal translation:** $y = \sin(x + c)$ — a **phase shift**.
- **Vertical translation:** $y = \sin x + d$ — moves the **midline** to $y = d$.

Note the inversion warned about in 14.1: a larger $b$ *compresses* the graph, shortening the period.

## Modelling periodic behaviour

To fit a sinusoidal model to data:

- The **period** is the smallest interval of input values over which the pattern of maximum and minimum outputs repeats.
- The **maximum and minimum** output values determine the **amplitude** and the **vertical shift**.
- **Choose sine or cosine according to the situation**, whichever makes the equation easier — a curve starting at its midline suits sine, one starting at a maximum suits cosine. The two differ only by a phase shift, so either can model any sinusoid.

## Inverse trigonometric functions

Trigonometric functions are not one-to-one, so — by the rule in 14.1 — their domains must be restricted before an inverse exists.

| Function | Domain | Range |
|---|---|---|
| $y = \arcsin x$ | $[-1, 1]$ | $\left[-\frac{\pi}{2}, \frac{\pi}{2}\right]$ |
| $y = \arccos x$ | $[-1, 1]$ | $[0, \pi]$ |
| $y = \arctan x$ | $\mathbb{R}$ | $\left(-\frac{\pi}{2}, \frac{\pi}{2}\right)$ |

The restricted ranges are why a calculator returns only one angle: $\arcsin(0.5)$ gives $\frac{\pi}{6}$, though infinitely many angles have that sine.

## Trigonometric equations

Because the functions are periodic, equations have infinitely many solutions, expressed by general formulas:

| Equation | General solution |
|---|---|
| $\sin x = a$, $\|a\| < 1$ | $x = k\pi + (-1)^k \arcsin a$ |
| $\cos x = a$, $\|a\| < 1$ | $x = 2k\pi \pm \arccos a$ |
| $\tan x = a$ | $x = k\pi + \arctan a$ |

for $k \in \mathbb{Z}$.

Each formula reflects a symmetry of its graph. Cosine is even, so solutions come in $\pm$ pairs each period; sine's alternating $(-1)^k$ reflects its symmetry about $x = \frac{\pi}{2}$; tangent's period is $\pi$, so its solutions are spaced by $\pi$ rather than $2\pi$.
