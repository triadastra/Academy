# 7.1 Ratios, Proportions, and Similar Triangles

Congruent figures have the same size and shape. **Similar** figures have the same shape but not necessarily the same size. This lesson covers ratios and proportions, similarity in triangles, and the theorems that follow from a line drawn parallel to one side.

## Ratios and proportions

A **ratio** is a comparison of two quantities, expressed as $a : b$ or $\frac{a}{b}$.

A **proportion** is a statement that two ratios are equal. Its central property is **cross-multiplication**:

$$\frac{a}{b} = \frac{c}{d} \quad \Longrightarrow \quad ad = bc$$

The one ratio worth knowing by name is the **golden ratio**, approximately $1.618$ (or $0.618$ for its reciprocal).

## Similar triangles

If $\triangle ABC \sim \triangle DEF$, then:

- corresponding angles are **congruent**: $\angle A = \angle D$, $\angle B = \angle E$, $\angle C = \angle F$;
- corresponding sides are **proportional**.

Similarity requires both, but for triangles the angle condition alone is enough to force the side condition. **AA (Angle-Angle)** is therefore the usual test: two pairs of congruent angles prove similarity, since the third pair follows from the angle-sum theorem.

Compare this with 4.1, where AAA was explicitly *not* a congruence criterion. That is precisely the difference between the two ideas: equal angles fix the shape but not the size, which is similarity rather than congruence.

## The Side-Splitter Theorem

**Side-Splitter Theorem:** If a line parallel to one side of a triangle intersects the other two sides, it **divides those sides proportionally**.

**Similar triangle determination:** if line $\ell \parallel BC$ meets $AB$ at $D$ and $AC$ at $E$, then $\triangle ABC \sim \triangle ADE$.

The reason is the parallel-line work of 3.1: the parallel line creates congruent corresponding angles, giving AA similarity immediately. Every "line parallel to a side" problem reduces to this.

## The Euclidean Theorem

In right triangle $ABC$ with $\angle C = 90°$, if $CD \perp AB$ at $D$ — the altitude to the hypotenuse — then:

$$CD^2 = AD \cdot BD, \qquad AC^2 = AD \cdot AB, \qquad BC^2 = BD \cdot AB$$

The altitude to the hypotenuse divides a right triangle into two smaller triangles, each **similar to the original and to each other**. Each of the three relations above is a proportion between corresponding sides of a pair of those similar triangles.

## The Triangle Angle Bisector Theorem

In $\triangle ABC$, if $AD$ bisects $\angle A$ and meets $BC$ at $D$, then $D$ divides $BC$ in the ratio of the adjacent sides:

$$\frac{BD}{DC} = \frac{AB}{AC}$$

The converse also holds, so the relation can be used both to find a length and to prove that a segment is an angle bisector.
