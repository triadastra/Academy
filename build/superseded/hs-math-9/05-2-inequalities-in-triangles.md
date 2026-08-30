# 5.2 Inequalities in Triangles

Most results so far have been equalities. This lesson covers what can be said when parts are *not* equal — which sides and angles must be larger, and which sets of three lengths can form a triangle at all.

## The comparison property

**Comparison Property of Inequality:** If $a = b + c$ and $c > 0$, then $a > b$.

This is the tool underlying the results below: showing one quantity equals another *plus something positive* proves it is larger.

**Corollary to the Triangle Exterior Angle Theorem:** The measure of an exterior angle of a triangle is **greater than the measure of either remote interior angle**.

This follows directly. Theorem 3-13 gave the exterior angle as the *sum* of the two remote interior angles; by the comparison property, that sum exceeds either one alone.

## Sides and angles

**Theorem 5-10:** If two **sides** of a triangle are not congruent, then the **larger angle lies opposite the longer side**.

**Theorem 5-11:** If two **angles** of a triangle are not congruent, then the **longer side lies opposite the larger angle**.

The two are converses, so the relationship works in both directions: **the longest side is always opposite the largest angle, and the shortest side opposite the smallest.**

These extend the Isosceles Triangle Theorem from 4.2, which handled the equal case. Together they cover every possibility: equal sides give equal opposite angles, and unequal sides give unequal opposite angles in the same order.

## The Triangle Inequality Theorem

**Theorem 5-12:** The **sum of the lengths of any two sides of a triangle is greater than the length of the third side**.

For $\triangle XYZ$, all three of the following must hold:

$$XY + YZ > XZ, \qquad YZ + ZX > YX, \qquad ZX + XY > ZY$$

In practice only one check is needed: **add the two shortest sides and compare with the longest.** If that inequality holds, the other two follow automatically.

### Worked examples

Can a triangle have sides of these lengths?

- **2 in, 3 in, 6 in** — $2 + 3 = 5 < 6$. **No.**
- **11 cm, 12 cm, 15 cm** — $11 + 12 = 23 > 15$. **Yes.**
- **8 m, 10 m, 19 m** — $8 + 10 = 18 < 19$. **No.**
- **1 cm, 15 cm, 15 cm** — $1 + 15 = 16 > 15$. **Yes.**
- **2 yd, 9 yd, 10 yd** — $2 + 9 = 11 > 10$. **Yes.**
- **4 m, 5 m, 9 m** — $4 + 5 = 9$, which is **not greater than** 9. **No** — the three points are collinear and the "triangle" is flat.

The last case is the instructive one. Equality gives a degenerate figure, not a triangle, which is why the theorem demands *strictly* greater.

## The Hinge Theorem

**Hinge Theorem:** In $\triangle ABC$ and $\triangle A'B'C'$, if $AB = A'B'$ and $BC = B'C'$ but $m\angle B > m\angle B'$, then $AC > A'C'$.

Two sides fixed, the included angle opened wider, and the opposite side grows — exactly like opening a door. It is the inequality version of SAS: where SAS says equal angles give congruent triangles, the Hinge Theorem says a larger angle gives a longer opposite side.
