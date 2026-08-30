# 8.1 Right Triangle Trigonometry

Trigonometry attaches ratios to angles, which lets an unknown side or angle in a right triangle be calculated rather than measured. This lesson covers the Pythagorean theorem and its converse, the three ratios, and their standard applications.

## The Pythagorean theorem

**Theorem 8-1 (Pythagorean Theorem):** In a right triangle, the sum of the squares of the lengths of the legs equals the square of the length of the hypotenuse.

$$a^2 + b^2 = c^2$$

**Theorem 8-2 (Converse):** If the square of the length of one side of a triangle equals the sum of the squares of the other two, the triangle is a **right** triangle.

Two companion results classify non-right triangles, as used in 3.3:

**Theorem 8-3:** If the square of the longest side is **greater** than the sum of the squares of the others, the triangle is **obtuse**.

**Theorem 8-4:** If it is **smaller**, the triangle is **acute**.

A **Pythagorean triple** is a set of three positive integers satisfying $a^2 + b^2 = c^2$ — $3, 4, 5$ and $5, 12, 13$ being the common ones. Recognising them saves time.

## Naming the sides

Relative to a chosen acute angle:

- The **adjacent leg** is the side connected to that angle (other than the hypotenuse).
- The **opposite leg** is the side across from that angle.
- The **hypotenuse** is always the side opposite the right angle.

Only the hypotenuse is fixed. Opposite and adjacent **swap when you switch to the other acute angle**, which is the most common source of error.

## The three ratios

For an acute angle $A$ in a right triangle:

$$\sin A = \frac{\text{opposite}}{\text{hypotenuse}}, \qquad \cos A = \frac{\text{adjacent}}{\text{hypotenuse}}, \qquad \tan A = \frac{\text{opposite}}{\text{adjacent}}$$

The **tangent ratio** is the ratio of the opposite side to the adjacent side. Given the tangent of an angle, the opposite side can be found by multiplying.

The symbols $\tan$, $\sin$, and $\cos$ convert an angle **into** a ratio; the inverse functions $\tan^{-1}$, $\sin^{-1}$, $\cos^{-1}$ convert a ratio **back into** an angle. They undo each other.

Because the ratios depend only on the angle and not on the size of the triangle, they are well defined — a consequence of the similarity results in 7.1.

## Trigonometric identities

- **Reciprocal:** $\tan A \cdot \cot A = 1$
- **Quotient:** $\tan A = \dfrac{\sin A}{\cos A}$
- **Square (Pythagorean):** $\sin^2 A + \cos^2 A = 1$
- **Complement:** if $A$ and $B$ are complementary, $\sin A = \cos B$

The square identity is the Pythagorean theorem restated for a triangle with hypotenuse 1, which is why it holds for every angle.

## Area and the law of sines

The area of $\triangle ABC$ can be found from two sides and the included angle:

$$\text{Area} = \tfrac{1}{2}ab\sin C$$

Note that if $A$ and $B$ are **supplementary**, then $\sin A = \sin B$ — which is why a sine value alone does not identify an angle uniquely.

**Law of sines:** in $\triangle ABC$,

$$\frac{a}{\sin A} = \frac{b}{\sin B} = \frac{c}{\sin C}$$

## Applications

**Angle of elevation** — an angle measured **above** the horizontal.
**Angle of depression** — an angle measured **below** the horizontal.

Both are measured from the horizontal, not from the vertical. In a typical problem the angle of elevation from the ground to a treetop and the angle of depression from the treetop to the ground are equal, being alternate interior angles between parallel horizontals.

**Course and bearing:** a **course** is an angle measured **clockwise from north** to the direction of travel. This differs from the counterclockwise-from-east convention used in mathematics, so navigation problems must be converted with care.
