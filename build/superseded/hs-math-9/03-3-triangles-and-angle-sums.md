# 3.3 Triangles and Angle Sums

This lesson establishes how the angles of a triangle relate, extends the result to any polygon, and sets out how triangles are classified. The triangle angle-sum theorem follows from the parallel-line results of 3.1, which is why it appears here rather than earlier.

## The Triangle Angle-Sum Theorem

**Theorem 3-12:** **The sum of the measures of the angles of a triangle is 180°.**

## Exterior angles

An **exterior angle** is an angle formed by a side of a triangle and an **extension of an adjacent side**.

For each exterior angle, the two **nonadjacent interior angles** are its **remote interior angles**.

**Theorem 3-13 (Triangle Exterior Angle Theorem):** The measure of each exterior angle of a triangle equals the **sum of the measures of its two remote interior angles**.

This follows from the angle-sum theorem. The exterior angle and its adjacent interior angle form a straight line, so together they make 180°; the three interior angles also total 180°; subtracting the shared angle leaves the exterior angle equal to the other two.

## Classifying triangles

**By angles:**

- **Equiangular** — all angles congruent.
- **Acute** — all angles acute.
- **Right** — one right angle.
- **Obtuse** — one obtuse angle.

**By sides:**

- **Equilateral** — all sides congruent.
- **Isosceles** — **at least** two sides congruent.
- **Scalene** — no sides congruent.

The phrase *at least* matters: an equilateral triangle is also isosceles.

## Testing a triangle from three side lengths

**Validity:** a triangle exists only if the **sum of the two shortest sides is greater than the longest side**. Otherwise the two shorter sides cannot reach across to close the figure.

**Type**, using $c$ for the longest side:

- **Acute** — $a^2 + b^2 > c^2$
- **Right** — $a^2 + b^2 = c^2$
- **Obtuse** — $a^2 + b^2 < c^2$

The right-triangle case is the Pythagorean theorem; the other two are the same comparison with the equality broken one way or the other. The larger $c$ is relative to the other sides, the more the angle opposite it opens out.

## Polygons

A **polygon** is a closed plane figure with **at least three sides that are segments**, where the sides intersect only at their endpoints.

- A **convex polygon** has no diagonal with points outside the polygon.
- A **concave polygon** has at least one diagonal with points outside it.

**Theorem 3-14 (Polygon Angle-Sum Theorem):** The sum of the measures of the angles of an $n$-gon is

$$(n-2)\,180°$$

The reasoning behind the formula: any $n$-gon can be divided into $n - 2$ triangles, each contributing 180°. For $n = 3$ it gives 180°, agreeing with Theorem 3-12.

**Theorem 3-15 (Polygon Exterior Angle-Sum Theorem):** The sum of the measures of the exterior angles of a polygon, **one at each vertex**, is **360°**.

This second result is striking because it does not depend on $n$ at all. A triangle and a hundred-sided polygon both have exterior angles totalling 360°.

## Special polygons

- **Equilateral polygon** — all sides congruent.
- **Equiangular polygon** — all angles congruent.
- **Regular polygon** — **both** equilateral and equiangular.

Both conditions are needed for regularity. A rhombus is equilateral but not equiangular; a rectangle is equiangular but not equilateral.
