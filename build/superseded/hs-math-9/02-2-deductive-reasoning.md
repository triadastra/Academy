# 2.2 Deductive Reasoning

Inductive reasoning in 1.1 produced conjectures. **Deductive reasoning** produces conclusions that are guaranteed. This lesson covers the two laws that license a deduction, the algebraic properties used in proofs, and indirect reasoning.

## What deductive reasoning is

**Deductive reasoning**, also called logical reasoning, is the process of reasoning logically from given statements to a conclusion. **If the given statements are true, then the conclusion will be true.**

That conditional guarantee is the whole difference from inductive reasoning. Induction makes a conjecture likely; deduction makes a conclusion certain — provided the premises hold.

## The Law of Detachment

> **If a conditional is true and its hypothesis is true, then its conclusion is true.**

Given "If a number ends in 0, then it is divisible by 10", and given that a particular number ends in 0, you may conclude it is divisible by 10.

The common error is to reason backwards: knowing the *conclusion* is true tells you nothing about the hypothesis. That would be assuming the converse, which 2.1 showed is not equivalent.

## The Law of Syllogism

> **If $p \rightarrow q$ and $q \rightarrow r$ are true statements, then $p \rightarrow r$ is true.**

It allows you to state a conclusion from two true conditionals when the conclusion of one is the hypothesis of the other — chaining them together.

Correct example:

- If a number ends in 0, then it is divisible by 10.
- If a number is divisible by 10, then it is divisible by 5.
- **Therefore:** if a number ends in 0, then it is divisible by 5.

The chain only forms where the statements genuinely link — the conclusion of the first must be exactly the hypothesis of the second. Two true conditionals that do not overlap in this way cannot be combined.

## Properties used in algebraic proofs

Proofs justify every step by name. The properties of equality:

- **Addition** — if $a = b$, then $a + c = b + c$.
- **Subtraction** — if $a = b$, then $a - c = b - c$.
- **Multiplication** — if $a = b$, then $ac = bc$.
- **Division** — if $a = b$ and $c \neq 0$, then $\frac{a}{c} = \frac{b}{c}$.
- **Reflexive** — $a = a$.
- **Symmetric** — if $a = b$, then $b = a$.
- **Transitive** — if $a = b$ and $b = c$, then $a = c$.
- **Substitution** — if $a = b$, then $b$ can replace $a$ in any expression.
- **Distributive** — $a(b + c) = ab + ac$.

The condition $c \neq 0$ on division is the one to remember; the others hold unconditionally.

## Indirect reasoning

In **indirect reasoning**, all possibilities are considered and then all but one are proved false. The remaining possibility must be true.

An **indirect proof** uses the fact that a statement and its negation are often the only two possibilities. Assume the negation of what you want to prove, derive a contradiction, and conclude that the assumption was false — so the original statement is true.

This is the method of choice when proving something *cannot* happen, since a direct proof would have to rule out every alternative individually.
