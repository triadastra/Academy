# 9.1 Circles, Arcs, and Chords

A circle is defined by a single distance, and almost every circle theorem traces back to that fact. This lesson covers the vocabulary of circles, arc measure and length, circumference and area, and the theorems relating chords to the centre.

## Definitions

A **circle** is the set of points in a plane **equidistant from a fixed point** (the centre). That distance is the **radius**.

For a point $P$ and a circle $C$ with radius $R$:

- $P$ is **interior** to $\odot C$ if $|PC| < R$
- $P$ is **on** $\odot C$ if $|PC| = R$
- $P$ is **exterior** to $\odot C$ if $|PC| > R$

**Concentric circles** lie in the same plane and share the same centre.

A **chord** is a segment whose endpoints both lie on the circle. A **diameter** is a chord through the centre — the longest possible chord.

## Arcs

An **arc** is a part of a circle.

- A **semicircle** is half of a circle, measuring **180°**.
- A **minor arc** is smaller than a semicircle.
- A **major arc** is greater than a semicircle.
- **Adjacent arcs** are arcs of the same circle with exactly one point in common.

A **central angle** is an angle whose vertex is the **centre** of the circle.

**The measure of an arc equals the measure of its central angle.** This is a definition rather than a theorem, and it is what connects angles to arcs throughout the chapter.

**Postulate 10-1 (Arc Addition Postulate):** The measure of the arc formed by two adjacent arcs is the sum of their measures.

## Circumference, arc length, area

**Theorem 10-9 (Circumference):**

$$C = \pi d = 2\pi r$$

The number $\pi$ is the **ratio of the circumference of a circle to its diameter** — the same for every circle, which is why it is a constant at all.

**Theorem 10-10 (Arc Length):** the length of an arc is the product of the circumference and the fraction of the circle the arc occupies:

$$\text{arc length} = \frac{m\widehat{AB}}{360°} \cdot 2\pi r$$

**Theorem 10-11 (Area of a Circle):**

$$A = \pi r^2$$

**Theorem 10-12 (Area of a Sector):** a **sector** is the region bounded by an arc and the two radii to its endpoints:

$$A_{\text{sector}} = \frac{m\widehat{AB}}{360°} \cdot \pi r^2$$

Arc length and sector area follow the same pattern: take the whole (circumference or area) and multiply by the fraction $\frac{\text{arc}}{360°}$.

A **segment** of a circle is the region bounded by an arc and the chord joining its endpoints. Its area is found by taking the sector and subtracting the triangle.

## Chords and central angles

**Theorem 12-4:** Within a circle, or in congruent circles, **congruent central angles have congruent chords** — and congruent chords have congruent arcs.

**Theorem 12-5:** **Chords equidistant from the centre are congruent**, and congruent chords are equidistant from the centre.

**Theorem 12-6:** A **diameter perpendicular to a chord bisects the chord and its arcs**.

**Theorem 12-7:** A diameter that **bisects a chord** (other than a diameter) **is perpendicular** to it.

**Theorem 12-8:** The **perpendicular bisector of a chord contains the centre** of the circle.

These are all consequences of the same symmetry. A chord and the centre form an isosceles triangle, since two of its sides are radii — so the perpendicular from the centre bisects the chord, exactly as Theorem 4-5 said of an isosceles triangle. Theorem 12-8 is also how three points determine a unique circle: intersect the perpendicular bisectors, which is the circumcenter construction from 5.1.

**Corollary:** arcs included between two **parallel chords are congruent**.
