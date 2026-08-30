# Addendum for Grade 10 and AP courses

Read `BRIEF.md` first and follow all of it. Everything below only replaces the
parts that cannot apply to these sources. The strict sourcing rule and the
required `## Keywords` section are unchanged and absolute.

## The sources look different here

Grade 9 guides are numbered issues that build on one another. Grade 10 and AP
guides are exam-revision PDFs, and a course typically has three kinds:

- **`... Review Guide.pdf`** — the syllabus. This is what you write lessons from.
- **`... Practice.pdf` / `Practice Set.pdf`** — questions only.
- **`... Answers.pdf` / `Practice Answers.pdf`** — the worked solutions.

Write the lessons from the Review Guide. Use the practice set and its answers
as a source of **worked examples inside the relevant lesson** — a solved
question belongs under the topic it tests, written out as an example with its
reasoning. Do not turn a lesson into a problem set, and do not create a lesson
whose only content is questions.

If a practice set tests something the Review Guide never covers, the practice
set is still your level's material — cover it, but keep it in the lesson where
it belongs topically.

One course has a typo in a source filename (`H Reivew Practice.pdf`). Pass the
name exactly as your list gives it to the reader script.

## Numbering

These guides usually have no `4.2`-style section codes. When a guide numbers
its own units or topics, use those numbers. When it does not, number lessons
sequentially in the order the guide presents them:

    content/notes/<course-id>/<LEVEL>/01-1-<slug>.md
    content/notes/<course-id>/<LEVEL>/02-1-<slug>.md

The `# ` heading then carries the number you assigned and the topic title, e.g.
`# 3 Thermochemistry`. Keep the order the guide teaches in — it is the order
students revise in.

## AP, IB and A-Level courses have no level

These are taught to Grades 11 and 12 as a single shared course, so they are not
level-scoped. Write them straight into the course directory with no level
folder in the path:

    content/notes/<course-id>/<NN>-<N>-<slug>.md

Your assignment will name a level of `-` for these. That means "no level", not
a level you need to find.

## Unlevelled Grade 10 courses

Biology 10, Music and Visual Arts have guides with no level in the filename,
because those courses are not streamed. They follow the same no-level-folder
path as the AP courses above.
