# 7.3 Databases and SQL

**Query languages** enable non-programmers to use easily understood commands to **search and generate reports from a database**. The most widely used is **SQL (Structured Query Language)**.

SQL is a 4GL by the classification in 7.1: it is like simplified coding — log in, log out, add or delete information — and you describe the **result you want** rather than the steps to compute it.

## Data hierarchy

Data is organised by **fields and records**:

$$\text{field} \rightarrow \text{record} \rightarrow \text{file (table)} \rightarrow \text{database}$$

- A **field** is one column — a single attribute, such as `Name`.
- A **record** is one row — all the fields for one entity.
- A **table** is a collection of records.
- A **database** is a collection of tables.

## Keys

- A **primary key** is a field that **uniquely identifies a record in its own table**.
- A **foreign key** is a field that **links to the primary key of another table**.

Foreign keys are what make a database *relational*: instead of repeating a student's details in every enrolment record, each enrolment stores the student's ID and points at the one authoritative row. That is the essence of **normalisation** — storing each fact exactly once.

## SQL commands

**SELECT** — retrieve data:

```sql
SELECT Name, Gender FROM Student WHERE Nationality = 'China';
SELECT * FROM Student ORDER BY Age DESC;
```

**INSERT** — add records:

```sql
INSERT INTO Student VALUES ('Hans', 'Male', 15, 'China');
```

This inserts all the following values into the table named `Student`.

**UPDATE** — change existing records:

```sql
UPDATE Student SET Nationality = 'China' WHERE Gender = 'Female';
```

This updates all students whose gender is female to have the nationality China.

**DELETE** — remove records:

```sql
DELETE FROM Student WHERE Name = 'Hans';
```

The `WHERE` clause is the dangerous one. `UPDATE` or `DELETE` without a `WHERE` applies to **every row in the table** — the single most destructive mistake in SQL, and the reason to run the equivalent `SELECT` first to see exactly which rows you are about to affect.

## Other clauses to know

- **`ORDER BY`** — sort the results, `ASC` or `DESC`.
- **`GROUP BY`** — collapse rows into groups, usually with an aggregate such as `COUNT()`, `SUM()`, or `AVG()`.
- **`JOIN`** — combine rows from two tables using a foreign-key relationship.

`JOIN` is where the relational design pays off: the student details live in one table, the enrolments in another, and a join reassembles them on demand without either table ever duplicating the other's data.

## Exam focus

Practice writing queries using `SELECT`, `JOIN`, `GROUP BY`, and `ORDER BY`, and be able to explain **table relationships** and **normalisation**.
