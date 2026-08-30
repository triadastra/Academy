# 13.1 Powers, Exponents, and Logarithms

A logarithm answers the question "what power do I raise this base to?" — which makes it the inverse of exponentiation. This lesson covers the exponent rules, the definition of a logarithm, the laws that follow, and the standard equation types.

## Powers and exponents

For $a, b \in \mathbb{R}$ and $m, n \in \mathbb{Z}^+$:

- **Multiplication:** $a^m \times a^n = a^{m+n}$
- **Division, same base:** $\dfrac{a^m}{a^n} = a^{m-n}$
- **Power of a power:** $(a^m)^n = a^{mn}$
- **Power of a product:** $(ab)^n = a^n b^n$

Every rule reduces to counting factors: $a^m \times a^n$ writes $a$ down $m$ times and then $n$ more times.

For **rational exponents**, $a^{m/n} = \sqrt[n]{a^m}$. When $n$ is odd, $a^{m/n} \in \mathbb{R}$ even for negative $a$; when $n$ is even it is not, since no real number squares to a negative. The rules extend to real exponents.

## Definition of a logarithm

$$y = b^N \iff N = \log_b y, \qquad y > 0,\ b > 0,\ b \neq 1$$

**$N$ is the logarithm of $y$ to base $b$** — the exponent that produces $y$.

The restrictions are not arbitrary. The base must be positive and not 1 (since $1^N = 1$ always, giving no information), and only positive $y$ has a logarithm, because a positive base raised to any real power is positive.

**Special notations:**

- $\log_{10} x = \log x$ (also written $\lg x$)
- $\log_e x = \ln x$, where $e = \lim_{x \to \infty}\left(1 + \frac{1}{x}\right)^x$

## Laws of logarithms

For $x, y > 0$, $a > 0$, $a \neq 1$:

- **Addition:** $\log_a x + \log_a y = \log_a(xy)$
- **Difference:** $\log_a x - \log_a y = \log_a\left(\frac{x}{y}\right)$
- **Taking logarithms of both sides:** $x = y \iff \log_a x = \log_a y$
- **Change of base:** $\log_a b = \dfrac{\log_k b}{\log_k a}$, and $\log_a b = \dfrac{1}{\log_b a}$

Other properties: $\log_a a = 1$, $\log_a 1 = 0$, and $\log_a x^{-1} = -\log_a x$.

The first two laws are the exponent rules in disguise: multiplying numbers adds their exponents, so multiplying arguments adds their logarithms. This is what made logarithms historically valuable — they convert multiplication into addition.

## Exponential and logarithmic functions

**Exponential function** $f(x) = b^x$, for $b > 0$, $b \neq 1$:

| | $b \in (0,1)$ | $b \in (1,\infty)$ |
|---|---|---|
| Domain | $\mathbb{R}$ | $\mathbb{R}$ |
| Range | $(0,\infty)$ | $(0,\infty)$ |
| Even/odd | Neither | Neither |
| Monotonicity | Strictly decreasing | Strictly increasing |
| Asymptote | $y = 0$ | $y = 0$ |

**Logarithmic function** $f(x) = \log_b x$:

| | $b \in (0,1)$ | $b \in (1,\infty)$ |
|---|---|---|
| Domain | $(0,\infty)$ | $(0,\infty)$ |
| Range | $\mathbb{R}$ | $\mathbb{R}$ |
| Monotonicity | Strictly decreasing | Strictly increasing |

The two tables are mirror images: domain and range swap. That is exactly what being inverse functions means, and it is why their graphs are reflections of each other in the line $y = x$.

## Equation types

**Exponential equations:**

- $A \cdot a^{2x} + B \cdot a^x + C = 0$, for $a > 0$, $a \neq 1$ — substitute $u = a^x$ to get a quadratic.
- $A \cdot a^{2x} + B \cdot a^x b^x + C \cdot b^{2x} = 0$ — divide through by $b^{2x}$ to get a quadratic in $(a/b)^x$.

**Logarithmic equations:**

- $A(\log_a x)^2 + B\log_a x + C = 0$ — substitute $u = \log_a x$.
- $\log_a f(x) = \log_a \phi(x)$ requires **three** conditions: $f(x) > 0$, $\phi(x) > 0$, and $f(x) = \phi(x)$.

That last point is essential. Cancelling the logarithms is only valid where both arguments are positive, so solutions must be checked against the domain — a step that discards extraneous roots.
