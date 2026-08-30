# 9.2 Tangents, Inscribed Angles, and Segment Lengths

This lesson covers lines that touch a circle, angles whose vertices sit on or off the centre, and the products of segment lengths formed by intersecting lines. The unifying idea is that an angle's measure depends on **where its vertex is** relative to the circle.

## Tangent lines

A **tangent** to a circle is a line in the plane of the circle that intersects it at **exactly one point** — the **point of tangency**.

For a line $\ell$ and circle $C$ with radius $R$, writing $d$ for the distance from the centre to the line:

- $d > R$ — the line is **exterior** to the circle (no intersection);
- $d = R$ — the line is **tangent**;
- $d < R$ — the line is a **secant**, intersecting at two points.

**Theorem 12-1:** If a line is tangent to a circle, it is **perpendicular to the radius at the point of tangency**.

**Converse of Theorem 12-1:** If a line is perpendicular to a radius at its endpoint on the circle, it is tangent to the circle.

**Theorem 12-3:** **Two segments tangent to a circle from a point outside it are congruent.** Through an exterior point there are exactly two tangent lines, and the two tangent segments have equal length.

## Inscribed angles

An **inscribed angle** has its **vertex on the circle** and both sides intersecting the circle. The arc it cuts off is its **intercepted arc**.

**Inscribed Angle Theorem:** The measure of an inscribed angle is **half** the measure of its intercepted arc.

**Corollary:** inscribed angles with the same or congruent intercepted arcs are congruent. A useful special case: an angle inscribed in a semicircle is a right angle, since the intercepted arc is 180°.

**Tangent-Chord Angle Theorem:** The measure of an angle formed by a **tangent and a chord** through the point of tangency is **half the measure of the intercepted arc**.

Note that the tangent-chord angle follows the same "half the arc" rule as the inscribed angle — the tangent behaves like the limiting case of a chord.

## Angles from intersecting lines

**Theorem 12-11:** The measure of an angle formed by two lines that

- **intersect inside** a circle is **half the sum** of the measures of the intercepted arcs;
- **intersect outside** a circle is **half the difference** of the measures of the intercepted arcs.

Collecting the cases gives a single pattern based on vertex position:

| Vertex | Measure |
|---|---|
| At the **centre** | The arc itself |
| **On** the circle | Half the arc |
| **Inside** the circle | Half the **sum** of two arcs |
| **Outside** the circle | Half the **difference** of two arcs |

Moving the vertex outward from the centre reduces the angle — from the full arc, to half, to half a difference.

## Segment lengths

**Theorem 12-12 (Power of a Point):** For a given point and circle, the **product of the lengths of the two segments from the point to the circle is constant** along any line through that point.

For a point $P$ not on $\odot O$, any line through $P$ meeting the circle at $A$ and $B$ satisfies

$$PA \cdot PB = |r^2 - OP^2|$$

The product depends only on the point and the circle, not on which line is drawn — which is what "power of a point" names.

## Cyclic quadrilaterals

A **cyclic quadrilateral** is one for which a circle can be drawn through all four vertices.

If $ABCD$ is cyclic, its **opposite angles are supplementary** — each pair intercepts the two arcs that together make the whole circle, and half of 360° is 180°.

To determine whether four points are **concyclic**, check any one of:

- the opposite angles of the quadrilateral are supplementary;
- an exterior angle equals the opposite interior angle;
- the angles subtended at two points by a common base are congruent;
- the four points are equidistant from a fixed point.

The last is simply the definition of a circle, and connects back to the circumcenter construction of 5.1.
