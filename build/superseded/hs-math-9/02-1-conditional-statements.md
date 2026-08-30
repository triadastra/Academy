# 2.1 Conditional Statements

Proof requires precision about what a statement actually claims. This lesson covers conditionals and the three statements derived from every conditional — converse, inverse, and contrapositive — only one of which is guaranteed to share its truth value.

## Conditionals

A **conditional** is an **if–then statement**.

- The **hypothesis** is the part following "if".
- The **conclusion** is the part following "then".

A conditional has a **truth value**: it is either true or false.

Example:

> **Conditional:** If two angles have the same measure, then the angles are congruent.

## The three related statements

From any conditional $p \rightarrow q$, three others can be formed. In symbols, where $\sim p$ means "not $p$":

| Statement | Form | Description |
|---|---|---|
| Conditional | $p \rightarrow q$ | The original |
| Converse | $q \rightarrow p$ | Switches hypothesis and conclusion |
| Inverse | $\sim p \rightarrow \sim q$ | Negates both |
| Contrapositive | $\sim q \rightarrow \sim p$ | Switches **and** negates both |

The **negation** of a statement has the opposite truth value.

For example, from "If it is finals, then students are sad":

- **Converse:** If students are sad, then it is finals.
- **Inverse:** If it is not finals, then students are not sad.
- **Contrapositive:** If students are not sad, then it is not finals.

## Which ones must be true?

This is the point of the lesson. **Equivalent statements have the same truth value**, and:

> A conditional and its **contrapositive** are equivalent — if one is true, so is the other.

The **converse and inverse are not equivalent to the original**. A true conditional may have a false converse. "If it is finals, then students are sad" does not establish that sad students imply finals.

(The converse and inverse are, however, equivalent to *each other* — the inverse is the contrapositive of the converse.)

The practical consequence: when a proof needs a statement in the other direction, the contrapositive is available for free, but the converse must be proved separately.

## Biconditionals

When a conditional **and its converse are both true**, they can be combined into a single **biconditional**, written with **"if and only if"**.

> **Biconditional:** Two angles are congruent **if and only if** they have the same measure.

A biconditional asserts both directions at once, which is why it is the form used for definitions.

## What makes a good definition

A good definition is a statement that helps you identify or classify an object. It must:

- **use clearly understood terms** — terms that are commonly understood or already defined;
- **be precise** — avoiding words such as "large", "sort of", and "almost";
- **be reversible** — it can be rewritten as a true biconditional.

Reversibility is the test that matters. If a definition cannot be stated as a biconditional, it is describing a property rather than defining the object.
