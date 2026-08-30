# 6.1 Momentum and Impulse

Momentum measures how hard something is to stop, and impulse measures what it takes to change it. This lesson defines both, connects them through the impulse–momentum theorem, and shows why that theorem explains airbags and crumple zones.

## Momentum

**Momentum ($p$)** is the product of an object's mass and its velocity:

$$\vec{p} = m\vec{v}$$

- **Unit:** $\text{kg·m/s}$
- **Vector quantity**, with direction the same as the velocity.

Because momentum depends on **both mass and velocity**, a truck and a roller skate can have the same momentum if the skate is moving much faster.

The scaling is linear in both:

- If **velocity doubles**, momentum doubles.
- If **mass doubles**, momentum doubles.
- If **both double**, momentum quadruples.

Contrast this with kinetic energy from 5.1, which depends on $v^2$. Momentum and kinetic energy are different measures of motion and behave differently — a point that matters when analysing collisions.

## Impulse

**Impulse ($I$)** is the product of the force on an object and the time interval over which it acts:

$$\vec{I} = \vec{F}\Delta t$$

- **Unit:** newton-second ($\text{N·s}$)
- **Vector quantity**, with direction the same as the force.

When the force is constant, $I = F\Delta t$. When the force is **not** constant, **impulse is the area under a force–time graph** — the same area principle as elsewhere.

## Newton's second law in terms of momentum

$$\sum \vec{F} = \frac{\Delta \vec{p}}{\Delta t}$$

**The rate of change of momentum of an object equals the net force applied to it.** This is a more general statement of the second law than $F = ma$, since it also covers situations where mass changes.

## The impulse–momentum theorem

Rearranging gives:

$$\vec{I} = \Delta\vec{p} \quad \Longrightarrow \quad \vec{F}\Delta t = \vec{p}_f - \vec{p}_i$$

> **The impulse on an object equals the object's final momentum minus its initial momentum.**

### Why this matters in a crash

The theorem has a consequence that saves lives. For a given change in momentum — a car coming to rest, say — the product $F\Delta t$ is **fixed**. The force and the time are therefore inversely related:

- **Large $\Delta t$ ⇒ small $F$.** Airbags increase the collision time and so reduce the force on the occupant.
- **Small $\Delta t$ ⇒ large $F$.** Hitting a concrete wall stops a car almost instantly, exerting an enormous force.

Nothing about the change in momentum can be avoided once a crash begins. All safety engineering can do is spread that change over more time.

## A note on signs

**You must define a positive direction when solving problems involving impulse and momentum.** Both are vectors, and in a collision one object's momentum is typically negative in the chosen frame. Omitting this step is the most common source of error in these problems.
