# 15.1 Angle Measure and Trigonometric Ratios of Any Angle

Right-triangle trigonometry in 8.1 only handles acute angles. This lesson extends the ratios to angles of any size by placing them on the coordinate plane, and introduces radian measure.

## Radian measure

The **radian measure** of a central angle is the number of radius units in the length of the arc it subtends.

**Conversion:**

$$\frac{\alpha}{180°} = \frac{\theta}{\pi}$$

Two formulas follow directly, and both are simpler in radians than in degrees:

- **Arc length:** $l = \theta r$
- **Sector area:** $S = \tfrac{1}{2}lr = \tfrac{1}{2}\theta r^2$

This is why radians are the standard unit: measuring the angle by the arc it produces makes arc length a simple product.

## Angles in standard position

An angle is formed by **rotating a ray about the vertex** to another ray. Sign follows direction:

- **Counterclockwise** rotation gives a **positive** angle.
- **Clockwise** rotation gives a **negative** angle.

Because rotation can continue past a full turn, an angle's measure is not unique. **Coterminal angles** have different measures but the **same terminal side**:

$$\{x \mid x = \theta + 2k\pi,\ k \in \mathbb{Z}\}$$

**Quadrantal angles** have a terminal side on an axis: $\theta = \frac{k\pi}{2}$, $k \in \mathbb{Z}$.

## Trigonometric ratios of any angle

Let $\theta$ be in standard position and let $(x, y)$ be a point on its terminal ray, with $r = \sqrt{x^2 + y^2}$. Then:

$$\cos\theta = \frac{x}{r}, \qquad \sin\theta = \frac{y}{r}, \qquad \tan\theta = \frac{y}{x}$$

This definition agrees with 8.1 for acute angles, but now applies to any angle, since $x$ and $y$ may be negative.

On the **unit circle**, where $r = 1$, the coordinates of the point where the terminal ray meets the circle are exactly $(\cos\theta, \sin\theta)$.

## Basic properties

$$\sin\theta \in [-1, 1], \qquad \cos\theta \in [-1, 1], \qquad \tan\theta \in \mathbb{R}$$

Sine and cosine are bounded because $|y| \le r$ and $|x| \le r$; tangent is not, because its denominator can be arbitrarily small.

**Signs by quadrant:**

| Ratio | Positive in | Negative in |
|---|---|---|
| $\sin\theta$ | I, II | III, IV |
| $\cos\theta$ | I, IV | II, III |
| $\tan\theta$ | I, III | II, IV |

The signs follow from those of $x$ and $y$: sine tracks the sign of $y$, cosine the sign of $x$, and tangent their quotient.

## Formulas

**Addition and difference:**

$$\cos(\alpha \pm \beta) = \cos\alpha\cos\beta \mp \sin\alpha\sin\beta$$
$$\sin(\alpha \pm \beta) = \sin\alpha\cos\beta \pm \cos\alpha\sin\beta$$
$$\tan(\alpha \pm \beta) = \frac{\tan\alpha \pm \tan\beta}{1 \mp \tan\alpha\tan\beta}$$

Note the sign reversal in the cosine formula — the $\mp$ opposes the $\pm$ on the left.

**Double angle** formulas follow by setting $\beta = \alpha$; **half-angle** formulas by reversing that substitution.

**Harmonic form:** any combination of a sine and cosine of the same angle collapses into a single sine wave:

$$a\sin x + b\cos x = \sqrt{a^2 + b^2}\,\sin(x + \phi)$$

where $\sin\phi = \dfrac{b}{\sqrt{a^2+b^2}}$ and $\cos\phi = \dfrac{a}{\sqrt{a^2+b^2}}$, so that $\phi = \arctan\left(\frac{b}{a}\right)$.

This form makes the amplitude and phase shift immediately visible, which is what makes it useful for the modelling in 15.2.
