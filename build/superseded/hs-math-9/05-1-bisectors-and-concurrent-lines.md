# 5.1 Bisectors, Medians, and Concurrent Lines

Every triangle contains four special sets of lines, and each set meets at a single point. This lesson covers the bisector theorems those results depend on, then the four centres themselves.

## The bisector theorems

**Theorem 5-2 (Perpendicular Bisector Theorem):** If a point is **on the perpendicular bisector** of a segment, then it is **equidistant from the endpoints** of the segment.

**Theorem 5-3 (Converse):** If a point is **equidistant from the endpoints** of a segment, then it is **on the perpendicular bisector**.

**Theorem 5-4 (Angle Bisector Theorem):** If a point is on the **bisector of an angle**, then it is **equidistant from the sides** of the angle.

**Theorem 5-5 (Converse):** If a point is equidistant from the sides of an angle, then it is on the bisector.

Each pair is biconditional, and each identifies a bisector as a **locus** — the set of all points with a particular distance property. This is what makes the concurrency results below work: a point on two bisectors inherits the distance property of both.

## Midsegments

A **midsegment** is a segment connecting the midpoints of two sides of a triangle.

**Theorem 5-1 (Triangle Midsegment Theorem):** A midsegment is **parallel to the third side and half its length**.

## Concurrency

When **three or more lines intersect in one point**, they are **concurrent**, and that point is the **point of concurrency**.

**For any triangle, four different sets of lines are concurrent** — which is not obvious. Three arbitrary lines generally form a triangle rather than meeting at a point; that these four families always meet is a genuine result.

### Circumcenter

**Theorem 5-6:** The **perpendicular bisectors** of the sides of a triangle are concurrent at a point **equidistant from the vertices**.

That point is the **circumcenter**. Because it is equidistant from all three vertices, a circle centred there passes through them — when a circle is **circumscribed** about a triangle, it surrounds the triangle.

Why it works: a point on two perpendicular bisectors is equidistant from two pairs of vertices by Theorem 5-2, hence equidistant from all three, hence on the third bisector by Theorem 5-3.

### Incenter

**Theorem 5-7:** The **angle bisectors** of a triangle are concurrent at a point **equidistant from the sides**.

That point is the **incenter**. A circle centred there touches all three sides — when a circle is **inscribed** in a triangle, it lies inside it.

The same argument applies, using the angle bisector theorems instead.

### Centroid

A **median** is a segment whose endpoints are a vertex and the **midpoint of the opposite side**.

**Theorem 5-8:** The medians of a triangle are concurrent at a point **two-thirds of the distance from each vertex to the midpoint of the opposite side**.

That point is the **centroid**. Equivalently, the distance from the centroid to a vertex is twice its distance to the opposite midpoint.

### Orthocenter

An **altitude** is the **perpendicular segment from a vertex to the line containing the opposite side**. Unlike a median, an altitude may fall outside the triangle — which is why the theorem refers to the *line containing* the side.

**Theorem 5-9:** The **lines containing the altitudes** of a triangle are concurrent at the **orthocenter**.

## Keeping the four straight

| Lines | Point | Property |
|---|---|---|
| Perpendicular bisectors | Circumcenter | Equidistant from the **vertices** |
| Angle bisectors | Incenter | Equidistant from the **sides** |
| Medians | Centroid | Two-thirds along each median |
| Altitudes | Orthocenter | — |

The first two are the pair most often confused, and the distinction is exactly the one from the bisector theorems: perpendicular bisectors concern distance to *points*, angle bisectors distance to *sides*.
