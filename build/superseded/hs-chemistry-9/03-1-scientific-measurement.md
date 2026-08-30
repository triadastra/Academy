# 3.1 Scientific Measurement

Every chemical quantity is a measurement, and a measurement carries both a number and a limit on how much of that number is trustworthy. This lesson covers scientific notation, accuracy and precision, error, and significant figures.

## Scientific notation

A **measurement** is a quantity that has both a **number and a unit**.

Scientific notation writes it as

$$m \times 10^n$$

where the **coefficient** satisfies $1 \le m < 10$, and the **exponent** $n$ is the number of places the decimal point moves.

**Calculations:**

- **Addition and subtraction** — the **exponents must be the same** first; adjust one number before combining.
- **Multiplication** — multiply the coefficients, **add** the exponents.
- **Division** — divide the coefficients, **subtract** the denominator's exponent from the numerator's.

## Accuracy and precision

- **Accuracy** is how close a measurement comes to the **true value**.
- **Precision** is how close a series of measurements are **to one another**, irrespective of the true value.

All four combinations are possible:

1. Good accuracy, good precision
2. Poor accuracy, good precision
3. Poor accuracy, poor precision
4. Good accuracy, poor precision (uncommon, but possible)

**Reliable results should be both precise and accurate** — giving about the same result repeatedly, and close to the accepted value.

Worked identifications:

- *Four of five repetitions were numerically identical, the fifth differed* → a statement about **precision**.
- *Eight measurements were spread over a wide range* → **precision** (poor).
- *A single measurement is within 1% of the correct value* → **accuracy**.

The test: comparing measurements **to each other** is precision; comparing them **to the truth** is accuracy.

## Error

**Error** is the difference between the experimental value and the accepted value:

$$\text{error} = \text{experimental value} - \text{accepted value}$$

$$\text{percent error} = \frac{|\text{error}|}{\text{accepted value}} \times 100\%$$

The absolute value is taken, so percent error is never negative.

## Significant figures

**Significant figures** are all the digits of a measurement that are **known**, plus **one final digit that is estimated**.

**Counting them:**

- If a **decimal point is present**, start from the first non-zero digit and count **left to right** to the end.
  $30{,}400{,}000. = 3.0400000 \times 10^7$ — eight significant figures.
- If a **decimal point is absent**, start from the first non-zero digit counting **right to left**.
  $304{,}000{,}000 = 3.04 \times 10^7$ — three significant figures.

**Exact defined values and counting numbers have an unlimited number** of significant figures, and never limit a result.

## Significant figures in calculations

**Rounding:** below 5 round down; 5 or above round up.

- **Addition and subtraction** — the result has the same number of **decimal places** as the measurement with the fewest.
- **Multiplication and division** — the result has the same number of **significant figures** as the measurement with the fewest.

For multi-step calculations, keep intermediate results unrounded and round only at the end, so rounding errors do not accumulate.

The distinction between the two rules is worth fixing: adding is limited by **decimal places**, multiplying by **significant figures**. Using the wrong rule is the most common error in the topic.
