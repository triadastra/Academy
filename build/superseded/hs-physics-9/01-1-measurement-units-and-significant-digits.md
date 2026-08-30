# 1.1 Measurement, Units, and Significant Digits

Physics is a quantitative subject, and every quantity carries a unit and a precision. This lesson covers the SI system, the technique of dimensional analysis for converting between units, and the rules for significant digits — the conventions that stop a calculation claiming more precision than the measurements support.

## SI units

Measurements use **units** for standardisation: a number without a unit states nothing.

The **SI system** is a **base-10 system** used universally in science. It has **seven base units**:

| Quantity | Unit |
|---|---|
| Length | metre |
| Mass | kilogram |
| Time | second |
| Temperature | kelvin |
| Amount of substance | mole |
| Electric current | ampere |
| Luminous intensity | candela |

**Derived units** are combinations of base units — velocity in $\text{m/s}$, for example.

**SI prefixes** change unit scales by powers of 10, which is what makes the system convenient: converting between scales is a shift of the decimal point rather than an arbitrary multiplication.

## Dimensional analysis

The technique for converting units is to **treat units like algebraic quantities**, so that they cancel during the conversion.

A **conversion factor** is a multiplier equal to 1 — for example, since $1\ \text{kg} = 1000\ \text{g}$, the fraction $\frac{1000\ \text{g}}{1\ \text{kg}}$ equals 1. Multiplying by 1 cannot change the quantity, only the units it is expressed in.

To convert 1.34 kg to grams:

$$1.34\ \text{kg} \times \frac{1000\ \text{g}}{1\ \text{kg}} = 1340\ \text{g}$$

The kilograms cancel, leaving grams. Writing the units out and checking that the unwanted ones cancel is the reliable way to know the factor is the right way up.

## Significant digits

**Significant digits** are the valid digits in a measurement: all the digits actually measured, **plus one estimated digit**.

That definition explains the whole convention. A measurement is only as good as the instrument that produced it, and significant digits are how that limit is carried through a calculation.

The rules:

- **Nonzero digits are significant.**
- **Zeros between nonzero digits are significant** — in 1005, all four digits count.
- **Leading zeros are not significant** — in 0.0025, only the 2 and 5 count; the leading zeros only locate the decimal point.
- **Trailing zeros with a decimal point are significant** — 2.500 has four.
- **Trailing zeros without a decimal point are not significant** — 2500 is treated as having two.

The last two rules are the ones that cause errors. The presence or absence of the decimal point is what signals whether trailing zeros were measured or are merely placeholders.

## Scales measure weight, not mass

A practical consequence of units worth noting: **scales measure weight ($mg$), not mass ($m$)**.

On Earth this distinction is easy to ignore, because $g$ is effectively constant and a scale can be calibrated to display mass directly. **On other planets, scales give different readings**, because the gravitational acceleration differs while the mass does not. Mass is a property of the object; weight is a force that depends on where the object is.
