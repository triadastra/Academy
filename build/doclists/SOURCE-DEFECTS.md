# Defects in the source guides

## FABRICATED CONTENT — needs a human decision

`HISTORY/S/1 G9 HIST S.docx`, mid-way through section 2.3 (Egyptian decline),
contains this inserted passage:

> The Roman conquest of France began after the dynasty of Guptania, followed by
> the siege of Lyon in 638 A.D., attack on Paris in 650 A.D. Then, the roman
> 6th army moved up, according to the guidance of Rommel, and took Frankfurt

None of it is history. Rommel is a 20th-century figure, "Guptania" does not
exist, Rome took Gaul in 58-50 BC, and the passage sits inside a section about
Egypt. It was excluded from the notes rather than taught.

A corpus-wide scan for the same signature (Rommel, Guptania, Panzer, Luftwaffe,
Wehrmacht, Blitzkrieg) found no other affected document — the WWII vocabulary
in the Grade 10 History review guides is legitimate course content. This is an
isolated insertion, not a pattern.

Note this is the same file whose header claims level H while its folder and
filename say S. Both anomalies sit in one document; someone should look at it.

Logged as agents encounter them. The strict sourcing rule means notes reproduce
the guides faithfully, so a factual error in a guide reaches students unless
someone fixes it upstream. Nothing here has been silently "corrected" in the
notes.

## Factual errors

(The two Chinese 9 S, Issue 8 entries that stood here — the 说明方法 list and
the 标志/标致 gloss — have been corrected under the corrected-claims policy; see
the section at the end of this file.)

(The Chemistry 9 S+ visible-spectrum ordering, the Chemistry 9 S hydrogen-bonding
partner list and the CS 10 S network-database definition that stood here have
been corrected under the corrected-claims policy — see the section at the end of
this file.)

## Errors corrected in the notes (guide contradicts itself)

Corrected ONLY where the same guide supplies the right answer elsewhere, so the
fix imports no outside material. Every instance is listed here.

- **Chemistry 9 S, 3.1.** Two arithmetic slips in worked examples: the
  $304\,000\,000$ conversion, and a scientific-notation product whose factors
  did not produce the stated answer. Both now compute correctly and the
  teaching point is unchanged.
- **Chemistry 9 S, periodic trends.** Atomic-size example given as
  "Li > Na > K", contradicting the same guide's stated down-a-group trend.
  Written as Li < Na < K.
- **Chemistry 9 S, bonding theories.** A $120^\circ$ centre labelled
  "pyramidal" where the same guide defines $120^\circ$ as trigonal planar.
- **Chemistry 9 S, 8.4.** A polar bond defined as one in which electrons "are
  shared equally". Written as *unequally* — the whole section depends on it.
- **CS 9 S, Issue 2 Lesson 08.** `'5' + '6' == '56'` given as evaluating to
  False. The same lesson's own worked example builds a string with
  `'Today, I ate ' + str(n) + ' apple'`, so `+` between strings concatenates and
  `'5' + '6'` is `'56'`. Written as True.
- **CS 9 S, Issue 2 Lesson 09.** The precedence illustration contains `a !> c`.
  `!>` is not among the relational operators the same guide tabulates one lesson
  earlier. Written as `!=`.
- **CS 9 S, Issue 2 Lesson 10.** "1 MiB = 1024 KiB = 104104 bytes". The stated
  byte count contradicts the same line's 1 KiB = 1024 bytes. Written as
  1 048 576.
- **CS 9 S, Issue 5 3.4.2.** `background-color: eee;` written without the `#`
  that the same guide requires for hex mode and uses in every other example
  (`#f9f9f9`, `#f0f0f0`, `#ddd`). Written as `#eee`.
- **CS 9 S, Issue 3.** "Yong, a British physician" — a spelling slip for Young,
  in the guide's own account of the three colour receptors of the eye. Written
  as Young.

- **Physics 9 S, 4.1.** Newton's third law given as "object B exerts an equal
  but opposite force on **force** A". Written as *on object A*, which the same
  guide's 4.3 requires — it states that interaction pairs "act on two different
  objects" and have "opposite system".
- **Physics 9 S, 1.3.** The quadratic relationship is described as "A
  hyperbola", the same descriptor the guide gives the inverse relationship two
  entries later. Dropped from the quadratic, which keeps the guide's own
  description ("rises more quickly as $x$ increases"); the hyperbola is kept
  for the inverse relationship, where the guide also places it.
- **Physics 9 S, momentum.** Section heading "Part 2: Conversation of Momentum"
  against the body's "Law of Conservation of Momentum". Written as
  *Conservation*.
- **Physics 9 S, 7.1.** Geocentrism dated "400 BC-1600 AC". Written as AD.

- **Math 9 H, Issue 8 (8.6).** Pyramid and cone surface area both given as
  `S.A. = L.A. + 2B`. The same guide defines a pyramid as having one polygon
  base and a cone as having a circular base, and states the prism rule as the
  lateral area plus the areas of the bases the solid actually has. Written as
  $S.A. = L.A. + B$ for both.
- **Math 9 H, Issue 8 (8.6).** A cone called "a polyhedron with a circular
  base", contradicting the same guide's definition of a polyhedron as a
  3-dimensional figure whose surfaces are polygons. Written as a solid figure
  with a circular base that tapers to a single point.
- **Math 9 H, Issue 2 (2.4).** Perpendicular bisector defined as "a line that
  perpendicular to the midpoint of the line". A line has no midpoint, and every
  theorem in that same section says "perpendicular bisector of a segment".
  Written as the line perpendicular to a segment at its midpoint.

- **Chinese 9 S, Issue 1 《荷塘月色》.** Quotation given as "要数书上的蝉声与
  水里的蛙声"; the same clause pairs it with 水里 and the section it sits in
  describes the trees round the pond. Written 树上. Same quotation block:
  "便在烟雾里也辩得出" written 辨得出.
- **Chinese 9 S, Issue 6 《药》.** Chapter 3's scene given as "拴家茶馆" where
  the same guide names the family 华老栓 / 华小栓 throughout. Written 栓家茶馆.
- **Chinese 9 S, S2 Finals 《再别康桥》.** Three slips, each contradicted by
  the same guide: "徐志摩有过两次婚宴" where the same sentence goes on to list
  第一任妻子 and 第二任妻子 (written 两次婚姻); "榆荫：玉树浓密的树荫" where
  the headword is 榆荫 (written 榆树); and 第七节 "事：不仁打扰康桥" where the
  same entry's 情 reads 不舍、不忍 (written 不忍打扰).

- **CS 10 S, Files.** The call list ends `f.write(string)` / `f.read(string)`.
  The same section defines `read()` as reading the entire file content and
  returning it as a string, so the `(string)` on `read` is its return type
  written into the argument slot. Written as `f.read()`.
- **CS 10 S, email protocols.** "IMPA internet message access protocol". The
  expansion on the same line is Internet Message Access Protocol — IMAP.
  Written as IMAP.
- **CS 10 S, ethics.** "software privacy is t unauthorised copying ad
  distrubuting of woftware". The definition on that same line is of software
  piracy, and the entry sits in the ethics list beside copyright and
  plagiarism. Written as software piracy.
- **CS 10 S, file transfer utilities.** Downloading given as "copy files from
  compter to special config serveis (downloading)" — the same direction the
  next bullet labels upload ("copy files from your computer to another
  computer"). Read as printed, the two would be one operation under two names.
  Written as the reverse of the guide's own upload bullet: downloading copies
  files from another computer onto yours.
- **CS 10 S, SQL Insert.** `Insert into Student values (1234, "Jason, "M",
  CHINAAAA)` has an unbalanced quote and an unquoted final value, against the
  quoting the same guide uses in its Select, Update and Delete examples.
  Written `(1234, "Jason", "M", "CHINAAAA")`. The prose under it also names the
  table "Students" where the statement itself and all three other examples say
  `Student`; written `Student`.
- **CS 10 S, throughout.** The document is heavily misspelt — "cimrinals",
  "ziombies", "pgroarsma", "internecet", "viertrual", "uplaod", "adminsitration
  substeym", "entitiy", "rables" and dozens more. Spellings were normalised
  silently where only the spelling was at stake. Logged here are the ones where
  the misspelling changed the term or the claim: the three above, plus "Ip
  addresses: cn trade the internecet activies to ttheir origin", written
  *trace*.

## Extraction losses (tables and images that did not survive the pipeline)

These exist in the original documents but not in the CSV text, so notes cover
the surrounding prose and omit the artefact rather than reconstructing it.

- Chemistry 9 S+ Issue 7: the naming-prefix table ("Here's a table to
  memorize"). Only `mono-` and `di-` survive, via worked examples.
- Chemistry 9 S+: the de Broglie formula (bare "Formula" placeholder).
- Chemistry 9 S+: the SI units / unit conversions table in Dimensional Analysis.
- Chemistry 9 S+ 8.1: the Lewis-symbols table. 8.3: the covalent-bond-count table.
- English 9 H+ Issue 1: a question and its poet's name, leaving an orphaned
  answer ("Both elements add a sense of rhythm and repetition to his sonnets").
  Kept the answer; poet and the two elements not guessed.
- English 9 H+ Issue 2 Q5: the first of two reasons Capulet is furious.
- English 9 H+ Issue 8: the reproduced Maus and graphic-novel panels. The guide
  hedges its own identifications ("I'm guessing... Bruce Wayne", "the Joker's
  (I think?)"); the hedges were kept rather than resolved.
- English 9 H+ Issue 4: two sentences truncated mid-clause ("the sound that
  comes out is that of Mr.", "the truth behind Mr."). Completed as Hyde, which
  the surrounding sentences require.
- CS 9 S Issue 5 2.2.26: the bullet naming the table accessibility attribute.
  Only its description and its values survive ("Improves accessibility,
  especially for screen readers. Common values: col, row, colgroup, rowgroup"),
  stranded on the `<table>` bullet. The claim is reproduced without naming the
  attribute, since the name is what was lost.
- CS 9 S Issue 5 3.4.4 "Display Properties": only the heading sentence
  survived. No display properties are listed anywhere in the guide.
- CS 9 S Issue 5 3.5.2: the `vw` and `vh` definitions break off at "1vw = 1",
  losing the percentage. Written as relative to viewport width and height.
- CS 9 S Issue 3: the document ends mid-sentence at "CRT • Cathode Ray Tubes •
  Uses electron". Written as working using electrons; nothing further guessed.
- CS 9 S S2 Finals 2.1: BIOS "Common settings" retains only Power Settings.
- CS 9 S S2 Finals 3.2: VPN "Types" retains only Voluntary Tunneling.
- CS 9 S S2 Finals 5.3: neural network "Structure" retains only the input
  layer, and the training bullet lost its verb ("Epochs weights/biases using
  backpropagation"). Written as epochs updating weights and biases by
  backpropagation, which the surrounding terms require.
- CS 9 S S2 Finals 6.1 "Types of System Software": only the BIOS entry
  survived, although the guide's own exam tip tells students to differentiate
  the types. The lesson therefore teaches one type where the exam expects
  several. Worth fixing upstream.

- **Physics 9 S: nearly every displayed equation.** The guides mark the slots
  ("Formula:", "Equations of Motion:", "Key equation final review") but the
  equation objects are absent from the CSV, so a physics course arrives with
  almost no maths. The notes supply the standard formula for each slot the
  guides name — $\bar v = \Delta d/\Delta t$, $F_{\text{net}} = ma$,
  $f_k = \mu_k F_N$, $a_c = v^2/r$, $F = Gm_1m_2/r^2$, $p = mv$,
  $KE = \tfrac12 mv^2$ and the rest — and add no formula the guides do not
  name. This is the largest single loss in the physics set and worth a
  re-extraction.
- Physics 9 S, 3.1: under the heading "Velocity-Time Graph" the only surviving
  sentence describes the *position*-time graph, and the "Graph Characteristics"
  entries ("Rising line:", "Descending line:", "Steeper slope = larger") lost
  their completions. Filled from the guide's own $a = \Delta v/\Delta t$.
- Physics 9 S, 6.1: the vertical half of "Independence of Motion" — only
  "Horizontal motion: Constant velocity" survives.
- Physics 9 S, 7.3: the "What is it?" and "How to measure it?" answers for
  inertial and gravitational mass are bare headings. Written from the formula
  and worked example the same section supplies.
- Physics 9 S, 8.2: "Recoil" is a heading with no body in either guide that
  carries it.
- Physics 9 S, 1.1: the significant-digit rules survive only as "Nonzero digits
  are significant", and the third check-your-understanding question lost its
  second operand ("Multiply 3.4 kg by , rounding for significant digits").
  1.2's question lost both quantities to be compared.
- Physics 9 S, 4.2: the value of $g$ in the bathroom-scale question ("a planet
  where the gravitational acceleration is ").

- **Math 9 H, `MATH/H AND H+/4 IDX G9 MATH H.docx`.** The entire issue is
  images. Only three section titles survive in the CSV — "Trigonometric Ratio
  in Acute Triangles", "Special Right Triangles", "Perimeter and Areas of
  Polygons" — with no body text at all. No lessons written for it. This leaves
  a real gap in the H syllabus: acute-triangle trigonometry, special right
  triangles and polygon area are taught but unrecoverable from the extract.
- **Math 9 H, Issue 6.** The Inscribed Angles theorems and the Secant
  definition and theorems are bare headings. Lesson 6.4 gives only the
  definitions the terms themselves fix (inscribed angle, intercepted arc,
  secant) and states no theorems, since which inscribed-angle results the guide
  taught cannot be recovered. The Locus definition is also a placeholder,
  written from the surviving "if the locus is in SPACE" caution that
  presupposes it.
- **Math 9 H, Issues 6 and 8.** Formula placeholders whose surrounding prose
  fixes them uniquely were written out rather than left blank: circle area and
  sector area (6.2); the quadratic formula, the three discriminant conditions,
  the max/min and steepness conditions on $a$, and the vertex form
  $y = a(x-h)^2 + k$ (8.1); approximate class width and the population and
  sample variance formulas (8.2).

- **Economics 10 S, `Economics/S Review Guide.pdf`.** The guide is a diagram-led
  document and none of its figures survived extraction; the CSV holds prose
  only. Three places lose content:
  - The absolute-advantage figure behind "in this case, Japan has an absolute
    advantage in the camera industry but Sweden has an absolute advantage in
    making cars". The output data is gone, but the guide states both
    conclusions and "Japan makes more cameras, and Sweden makes more cars", so
    lesson 1 teaches the conclusions and reproduces no figures.
  - The world-price graph for the EV cars example ("as shown in the graph").
    No axes, curves or surplus areas survive. Lesson 2 teaches only what the
    surrounding sentences state — domestic price above world price, imports
    encouraged, price decreases, total surplus increases — and invents no
    diagram.
  - The comparative-advantage output table for China and New Zealand. This one
    is recoverable: the guide's own ratios print the figures (China 21/35 and
    35/21, New Zealand 6/30 and 30/6), so lesson 1 sets out China 35 fruit /
    21 industrial goods and New Zealand 30 fruit / 6 industrial goods. Nothing
    beyond the four numbers the arithmetic already contains was supplied, and
    the units are the guide's own "one ton".

- **Economics 10 S, protectionism methods.** The four methods are given as a
  numbered list, but only markers "1." (Tariffs) and "3." (Subsidies) survive;
  Import Quotas and Non-Tariff Barriers lost theirs. Order is unambiguous from
  the two that remain, so the notes number them 1-4. More substantively, the
  Import Quotas entry carries a "Cons" line with no "Pros" line, where Tariffs
  and Subsidies both have the pair, and the Non-Tariff Barriers entry has
  neither. Likely a loss rather than an authorial choice; nothing was invented
  to fill it. Similarly "How Trade Benefits Nations" and "Trade makes it
  possible for countries:" each retain a single bullet where the punctuation
  implies a list.

- **Chemistry 10 S, 15.2 Hydrates.** The hydrates chart is missing. The guide
  points at it twice and flags it as compulsory — "the chart is required" and
  "Needs to be memorized!!" — but no chart, no hydrate name and no hydrate
  formula survives anywhere in the extract. This is the one place in the guide
  where a student is explicitly told to memorise something, and it is exactly
  the part that did not come through. Lesson 15.2 teaches the surrounding
  prose (hydrate, efflorescence, hygroscopic, desiccant, deliquescent) and
  reproduces the memorisation instruction without inventing a chart to attach
  it to. Worth a re-extraction.

- **CS 10 S, Selection Sort.** The whole topic survives as three bare openers:
  "Find the smallest unsorted element", "Steps: Find the smallest number in the
  whole array", and a "Comparison with Bubble Sort" retaining only the Bubble
  Sort half ("Swaps many times each round"). The selection-sort side of the
  comparison, and every step after the first, are gone. Lesson 7 teaches what
  survives and does not supply the missing contrast, so selection sort is
  covered far more thinly than the other two sorts. Worth a re-extraction.
- **CS 10 S, Insertion Sort example.** The example list is 49 38 65 97 76 13 27
  49 but the steps stop after "Insert 76 → [38 49 65 76 97]". The insertions of
  13, 27 and the second 49 are not in the extract; the four surviving steps are
  given and the example is not completed.
- **CS 10 S, 2D list grid.** The example list arrives as a bare digit run
  "1 2 3 4 5 6 7 8 9" where the guide printed a 3x3 table. Written as
  `[[1, 2, 3], [4, 5, 6], [7, 8, 9]]`, which the guide's own two lookups fix
  (`nums[2][1]` is 8, `nums[-1][-1]` is 9).
- **CS 10 S, 2D list sub-numbering.** A stray "5." survives in front of
  "Initializing a 2D List Using Loops", so that topic had numbered subsections
  and only the fifth number came through. Lesson 5 is written without them.
- **CS 10 S, Data Hierarchy.** "Record Record Record/Field field field" is all
  that is left of a diagram, and the field-type list reads "Num, string,
  boolean, date, string" with string twice, so a type is probably lost. Lesson
  6 gives number, string, Boolean and date, and omits the diagram.
- **CS 10 S, Connection Devices / Routers.** A block of the guide repeats as a
  comma-separated word run ("ms,is,all,acceptable,Routers,a,computer,...")
  which swallows the end of the Data speed sentence: "the speed that modems
  work at is called" resumes after the run at "transfer rate kbps". Written as
  transfer rate, measured in kbps.
- **All guides, the `rd.sh` reader.** Its `tr -d '"'` deletes every double
  quote, so Python and SQL string literals reach the agent unquoted (`s =
  hello`, `print(s.find(na))`, `Insert into Student values (1234, Jason...`).
  Quotes were restored in the CS 10 S code blocks, which are not valid code
  otherwise. A reader-script artefact rather than a defect in the sources, but
  it silently corrupts every code and SQL example in the corpus.

## Open questions for the house

- **English 9 H+ numbering.** The S2 Finals guide carries no issue number. It
  was given chapter 9, the next free slot after issue 8. Change if the house
  numbers finals guides differently.
- **English 9 H+ contradiction left standing.** Issue 7 tells students to avoid
  "utilizes"; the S2 Finals guide permits "use/utilises" in a topic sentence.
  Both are H+ material, so each was kept in its own lesson rather than
  silencing one. A student may notice.
- **English 9 H+ Issue 2 Q3** asks for Mercutio's take but the guide's answer
  never supplies it. Written as-is; the question is unanswered in the source.
- **Physics 9 S numbering.** Chapters 1-7 are numbered by the guides
  themselves. Three units are not. Issue 7's "Two Kinds of Mass & Einstein's
  Theory of Gravity" is labelled only "Chapter 7" and was given 7.3, the next
  free slot after the guide's own 7.1 and 7.2. The momentum unit (Issue 8 and
  S2 Finals, labelled "Part 1"/"Part 2") was given chapter 8, and the work and
  energy unit (S2 Finals) chapter 9, continuing the sequence. Change if the
  house numbers these differently.
- **Physics 9 S has no section 5.3.** The guides cover 5.1, 5.2 and 5.4 and
  never mention 5.3. Not written, rather than guessed at.

- **Math 9 H, linear equation forms.** Issue 8 opens its "Solving Quadratic
  Equations" section with three bare headings — point-slope form,
  slope-intercept form, standard form — which are forms of a *line*, not of a
  quadratic; and Issue 7 ends with a bare "Finding Equations of lines" heading
  with no body. They were written into lesson 7.2, where they belong
  mathematically and where the empty heading sits. Move them into 8.1 if the
  house prefers strict placement over sense.
- **Math 9 H, section numbering.** Only Issue 1 ("1.Sets and Venn Diagrams")
  and Issue 2 ("4.Bisectors in Triangles", "5.Concurrent Lines, Medians, and
  Altitudes") number their sections, and the numbering restarts per issue.
  Codes were assigned as issue number then section index, which reproduces
  Issue 2's own 4 and 5 exactly. Issues 4-8 carry no section numbers at all.
- **Math 9 H, 2.5.** The guide names the circumcentre, incentre and
  orthocentre but never names the point of concurrency of the medians. Left
  unnamed in the notes rather than importing the term.

- **Chinese 9 S numbering.** The level's seven guides are Issues 1, 2, 3, 6, 7,
  8 and an unnumbered S2 Finals guide. Lessons take the issue number as the
  chapter and number the texts within it (1.1, 1.2, 1.3, …). The finals guide
  was given chapter 9, the next free slot after issue 8 — the same choice
  logged above for English 9 H+. Issues 4 and 5 are not in this level's
  document list, so chapters 4 and 5 are empty by design, not by omission.
- **Chinese 9 S, 暌违 / 睽违.** Issue 1 defines the word as 暌违; Issue 2's
  self-test lists it as 睽违. Both are reproduced as written, in 1.1 and 2.1
  respectively. 暌违 is the correct form. A student may notice.
- **Chinese 9 S, Issues 2 and 3 are unanswered worksheets.** Both are blank
  self-test sheets. Issue 2's 《孔乙己》 items — the collection it comes from,
  鲁迅's 历史小说集, the 字词 大抵 and 颓唐, and the "大约"/"的确" question —
  have no answers anywhere in this level's documents; the same is true of
  朱自清's 原名/字 and the second half of "小李杜". Issue 3 (《暗恋桃花源》)
  supplies no answers at all: author, 籍贯, the 1984 剧团, 戏剧的四要素, every
  字词 and all eight content questions are blank. Lessons 2.1 and 3.1 present
  these as revision prompts marked 待补 rather than filling them from outside
  material, and answer the items the level's other guides do cover. Those two
  lessons consequently carry no `## Keywords` section — they define nothing.
- **Chinese 9 S, 《胖子和瘦子》.** The S2 Finals guide introduces the text but
  stops after 契诃夫's 文学常识 — no 字词 and no content questions. Lesson 9.2
  is short for that reason, not through omission.

- **Economics 10 S numbering.** The review guide carries no section numbers. It
  prints two titles — "Free Trade / Why Do Nations Trade?" and "Trade
  Protectionism / What Is Protectionism?" — plus an internal heading, "World
  Price and comparative advantage", whose level is not recoverable from the
  extract. It was read as a unit of its own because it teaches a separate
  decision rule ($P_D$ against $P_W$) rather than more opportunity-cost work,
  giving lessons 1-3 in the guide's own order. Fold lesson 2 back into lesson 1
  if the house reads that heading as a subsection of Free Trade.

- **Chemistry 10 S numbering.** Unlike the other Grade 10 review guides, this
  one numbers itself: "Chapter 15 Water and Aqueous Systems" with 15.1-15.3,
  and "Chapter 16 Solutions" with 16.1-16.4. BRIEF-G10 says to use a guide's
  own numbers where it has them, so the lessons are 15.1-16.4 and the course
  directory starts at chapter 15. Every other Grade 10 course in the corpus
  runs 01, 02, 03… because its guide supplies no numbers, so Chemistry 10 S
  looks anomalous beside them. It is following the rule, not breaking it — but
  if the house wants Grade 10 numbering uniform, this is the file to renumber,
  and the guide's own 15/16 codes should then be kept in the lesson titles so
  students can still match notes to guide.

- **CS 10 S numbering.** The review guide numbers nothing (one stray "5."
  aside), so its seven topics were numbered sequentially in the order it
  presents them: 1 String Operations, 2 The Internet, the Web and Electronic
  Commerce, 3 Files, 4 Privacy, Security and Ethics, 5 2D Lists, 6 Databases
  and DBMS, 7 Sorting Algorithms. Chapter 2 is by far the largest and could
  reasonably be split into several lessons, but the guide gives it as one
  titled unit and the split points would be invented. Change if the house
  prefers evener lessons to the guide's own units.
- **CS 10 S has one source and no practice set.** `hs-cs-10|S` in `g10.json`
  lists only `S Review Guide.pdf` — no Practice and no Answers PDF — so this
  level's notes carry no worked exam questions beyond the traces the guide
  itself prints (bubble sort, insertion sort, the SQL statements). If a
  practice set exists for S, it is missing from the document list.

## Garbled source text

- **Chemistry 9 S+, Issue 8 / S2 Finals.** The $\mathrm{SO_3^{2-}}$ shape
  question breaks off mid-answer and is followed by a square-planar polarity
  answer belonging to a lost XeF4 question. The agent completed the
  SO3^2- answer from the guide's own domain table and presented the
  square-planar line as a standalone example rather than attaching it to the
  wrong stem.

- **Chinese 9 S, all seven guides.** Recurring OCR-style garbles. Where the
  intended word is unambiguous from the immediate context it was read through;
  where it is not, the garbled word was dropped rather than guessed, and
  nothing was substituted for it.
  - Issue 1: 朱自清 introduced as "现代接触的作家". The adjective is
    unrecoverable, so 1.2 reads 现代作家、教育家、学者、民主战士 with no
    modifier.
  - Issue 1: "全文情景交触" read as 情景交融, which the same line then glosses
    as 以景带情，景中含情.
  - Issue 6: 人血馒头 glossed as "讽刺利用别人的不行来获取利益" — read as 不幸.
  - Issue 6: "恐怖压抑，寂静鬼气森" read as 鬼气森森.
  - Issue 6: 康大叔 "替华家帮忙把人血馒头治的馒头" is unrecoverable. 6.1 says
    替华家经手了那个人血馒头, which is all the surrounding clause supports.
  - Issue 7: "丽颖容易接受新思想" — 丽颖 is unrecoverable and was dropped;
    7.1 reads 容易接受新思想.
  - Issue 8: 《中学生》 labelled "主板杂志". 8.1 lists it simply as 杂志, the
    modifier dropped rather than guessed at.
  - Issue 3: "情概括《暗恋》讲述了怎样的故事" read as 请概括; "对于表达作品
    主治有什么作用" read as 主旨.
  - S2 Finals: "《再别康桥》传说是几年早年自己欧洲留学生活，以及与林徽因不成功
    的恋爱" breaks mid-clause. 9.1 renders it as 传说与他早年的欧洲留学生活，
    以及与林徽因不成功的恋爱有关, adding no claim the fragment does not carry.
  - S2 Finals: "你可以从本市中感受到诗人怎样的情感" read as 本诗.

- **CS 9 S, Issue 2 Lesson 10, the four base-N conversion items.** Subscripts
  were flattened into the digit runs, leaving "1234 = X10", "123 = X8",
  "678 = X16" and "19x = 25", with stated solutions 4, 5, 2B and 5. Read the
  standard way (digits, then base as a trailing subscript) only the second is
  self-consistent: $12_3 = 5_{10} = 5_8$, matching its stated solution. The
  other three do not yield their stated solutions under that reading or any
  other the digits permit — $123_4$ is 27, not 4; $67_8$ is 55 or $37_{16}$,
  not 2B; $19_x = 25$ gives $x = 16$, not 5. The coherent item is used as the
  worked example and the three unreadable ones are not reproduced, since what
  is missing is the question text itself rather than confidence in an answer.
  Source owner should supply the originals.

- **Chemistry 10 S, 16.4.** The $K_f$/$K_b$ constants table is cut in half and
  the two halves land in different places. Extraction emits the header and the
  acetic acid row, then the orphaned string "100.00°C + 1.54°C = 101.54°C",
  then the whole of section 3, and only then the remaining seven solvents plus
  a repeated column header. The table is reassembled in the notes in the
  guide's own solvent order; no value was altered. The 101.54 °C line is a
  worked answer whose question is gone — nothing anywhere in the guide states
  the solution, the solute or the molality it came from. It is presented as an
  illustration of adding $\Delta T_b$ to the pure solvent's boiling point,
  which is all it can support, and no molality was back-calculated for it.

- **Chemistry 10 S, 15.3, coagulation.** The sentence "Adding electrolytes
  neutralizes the charge, causing particles to clump together and settle out"
  is displaced by an intervening table, so in the extract the "Coagulation"
  entry reads as though coagulation were the mechanism that *prevents*
  aggregation. The two sentences are rejoined in lesson 15.3, which is what the
  original layout must have had. Nothing was added or dropped.

- **Chemistry 10 S, 16.4, mole fraction.** The formula slot after "Mole
  Fraction (X)" is empty; only the "Where:" glossary of $X_A$, $X_B$, $n_A$ and
  $n_B$ survives. Written as $X_A = n_A/(n_A+n_B)$, which is the guide's own
  definition ("the ratio of moles of the solute to the total number of moles of
  solvent and solute") in the guide's own symbols.

- **CS 10 S, the Privacy, Security and Ethics pages.** These degrade far worse
  than the rest of the document — "cookies -> small peoeces of inforamtion that
  are deposited on your har d disk form websites syou visit", "spyware: a wide
  range f pgroarsma that are designed to scecrelty record and report an
  individual's activies", "web bugs r esmall images". Every word there is fixed
  by its context and was read through; nothing was dropped and nothing was
  substituted. The one clause in the section that context did not fix is the
  download direction, logged above under errors corrected.

## Extraction: equations stripped from embedded objects

Where a guide's maths sat in Word/OMML equation objects, extraction kept the
prose and deleted the formulas, leaving labels with empty values. Severity
varies per document — some physics files kept equations as plain text, others
lost everything.

Agents reconstructed a formula only where the guide's own label named the
quantity, its variables and its units ($c=\lambda\nu$, $E=h\nu$, $a_c=v^2/r$,
$F=Gm_1m_2/r^2$, $W=Fd\cos\theta$, the constant-acceleration set). Where the
stripped value was a bare number with no recoverable definition, it was left
out rather than invented:

- Physics 9 S+: roller-coaster heights and PE values (6.4); string angles and
  tensions in the 20.0 N example (4.7); the Sun-Earth force answer (5.6); and
  the constants for lunar mass, Earth-Moon distance, solar mass, 1 AU, $c$ and
  the light-year.
- Physics 9 H: the connected-body pulley and ramp expressions in 4.7-4.8. The
  guide's stated method was given instead.
- Chemistry 9 H: the "Bond Type By Electronegativity" table (8.4) and the
  "Domain Geometry | Molecular Shape" table (9.2). The 9.2 loss is a real
  coverage gap — geometry names and bond angles are not stated in words
  anywhere in that level's guides.
- Math 9 S: the 1.9 Perimeter/Circumference/Area content, the number-set and
  interval-notation tables, and all Venn diagram figures.

Fixing these means re-running extraction with equation and table support, not
rewriting the notes.

## More errors corrected (guide contradicts itself)

- **Chemistry 9 H, 7.6.** "Metals tend to form anions" — 8.2 in the same
  syllabus says cations. Written as cations.
- **Chemistry 9 H, 8.2.** Monoatomic anion charge given as |8 - electrons|
  where the neighbouring rule requires valence electrons.
- **Math 9 S.** Division property "c != -" written as $c \neq 0$; slope
  denominator $x_1-x_2$ written as $x_2-x_1$; "transitive property: if a=b then
  b=a" is the symmetric property, taken from the index guide's correct wording.
- **Physics 9 S+, 4.8.** Inclined-plane example states a 5.0 kg box but the
  worked line writes 3.0 kg while quoting the 5.0 kg answers (24.5 N, 42.4 N).
  5.0 kg kept and the discrepancy flagged in the lesson.
- **History 9 S, 3.5.** Garbled header "3.5 Rule Rulers Unit China" written as
  "Rulers Unite China".
- **English 9 H, SPACECAT (6.4).** The finals guide prints "appeals of logic"
  beside ethos and "appeals of credibility" beside logos — swapped, as its own
  fuller descriptions show. Correct definitions written, with a one-line note in
  the lesson because students revise with this guide open beside them. Its T
  entry also repeats the Appeals question instead of describing tone.

## More factual errors left as written

(The Physics 9 H Cavendish date that stood here has been corrected under the
corrected-claims policy — see the section at the end of this file.)

## Numbering conflicts across guides at the same level

Where two guides at one level number the same material differently, the later
or more complete guide won. Each case:

- **History 9 S:** Issue 6 numbers Renaissance/Reformation 16.1-16.4; Issue 7
  numbers the same material 13.1-13.5 and adds the Scientific Revolution. 13.x
  used — 16 would leave a gap between chapters 12 and 14.
- **History 9 S+:** doc 5 labels Korea "10.3", colliding with doc 3's "10.3
  Muslim Civilisation's Golden Age". Filed as 12.3, where it sits in sequence.
  Doc 4's "83 The Crusades" is a lost decimal point, filed as 8.3.
- **English 9 S+:** Issue 2 numbers transversal angles in a way that
  contradicts the IDX index guide, because they come from different diagrams
  and neither survived extraction. Described positionally instead.
- **CS 9 S:** five guides, three numbering schemes. Issues 1 and 2 number
  lessons continuously (Issue 1 = Lessons 1-7, Issue 2 = Lessons 8-14), so
  those codes were used as-is. Issue 3 carries no numbering at all, and Issue 5
  and the S2 Finals guide restart at 1 internally (sections 1-5 and 1-6), which
  would collide head-on with the lesson numbers. The unnumbered and
  restarting guides were given the next free codes: 15 (Issue 3), 16-20
  (Issue 5), 21-26 (S2 Finals). Change if the house numbers multi-guide
  courses differently.
- **CS 9 S:** there is no Lesson 11. Issue 2 runs Lesson 10 (Number System)
  straight into Lesson 12 (While-Loop). The gap is reproduced rather than
  closed, so the codes keep matching the guide, but it may mean a lesson is
  missing from the corpus rather than from the course.
- **Math 9 H+: two strands, both numbered from chapter 1.** Issues 1-4 are a
  geometry strand — 1 Sets, Venn diagrams and reasoning; 2 Congruent Triangles;
  3 Polygons and Quadrilaterals; 4 Similarity and acute-triangle trigonometry;
  6 Circles. Issues 5-8 and the S2 Finals guide are an algebra and functions
  strand that restarts at 1 — 1 Basic Functions; 2 Equations and Inequalities;
  3 Exponential and Logarithmic Functions; 4 Functions; 5 Trigonometry. Eight
  codes collided outright (2.1, 2.2, 3.1, 3.2, 3.3, 3.4, 4.1, 4.2). The
  geometry strand keeps its printed numbers, because its chapter 1 is the
  shared `MATH/H AND H+/1 G9 MATH H.docx`, whose sections are already published
  as 1.1-1.4 at H — renumbering it would give one document two numberings. The
  algebra and functions strand was shifted uniformly by $+6$ to chapters 7-11,
  which preserves its internal order and spacing, starts it immediately after
  the geometry strand's last chapter, and leaves the notes in issue order.
  Change if the house prefers the strands the other way round.
- **Math 9 H+ has no geometry chapter 5.** Issue 4 runs 4.4 (applications of
  trigonometry) straight into 6.1 (circles), and no H+ guide carries a chapter
  5 of the geometry strand. The gap is reproduced rather than closed, so the
  codes keep matching the guides — but a unit may be missing from the corpus
  rather than from the course.

## Math 9: one document, two level markers

`MATH/H AND H+/1 G9 MATH H.docx` is filed under a folder named for both levels,
its filename says H, and its own header says "IDX G9 MATH H+ STUDY GUIDE ISSUE
1". It is the only issue 1 in the folder, and set theory is demonstrably taught
at S as well, so it is not level-exclusive advanced material.

Treated as shared: it is written at BOTH H and H+. Reading it as H+-only would
leave H without an issue 1; reading it as H-only would leave H+ without one.
Change this if the department says the two levels genuinely diverge here.

The document list disagrees with that treatment. `build/doclists/g9.json` lists
it under `hs-math-9|H` but not under `hs-math-9|H+`, so an agent working from
the H+ list alone never sees it and the H+ course silently loses its issue 1.
Its material is now written at H+ as 1.1-1.4. The list should name it at both
levels, as the folder already does.

## CS 10 H (Grade 10 finals guides)

Three documents: `H Review Guide.pdf`, `H Practice Set.pdf`, `H Practice Set
Answers.pdf`. Entries are grouped under the same categories used above.

### Extraction: equations stripped from embedded objects

- **CS 10 H Review Guide, KNN.** The Euclidean distance formula is gone; only
  its variable declaration survives, and extraction displaced it into the
  K-Means section, where it sits mid-sentence: "Recalculate the centroid of
  each cluster as the p = (p1, p2, ..., pn) and q = (q1, q2, ..., qn) xjCi mean
  of all data points assigned to that cluster". The guide names the quantity
  (Euclidean distance), its variables ($p$ and $q$) and its space
  ($n$-dimensional), so lesson 3 supplies
  $d(p,q)=\sqrt{\sum_{i=1}^{n}(p_i-q_i)^2}$ on the same basis used for the
  physics formulas logged above. The centroid sentence is read through as
  "recalculate the centroid of each cluster as the mean of all data points
  assigned to that cluster", which is what remains once the two stray fragments
  are lifted out.
- **CS 10 H Review Guide, Manhattan distance.** The bullet is "●Manhattan:"
  with nothing after it. Only the name survives, so lesson 3 names Manhattan as
  the second distance measure KNN may use and states no formula, rather than
  importing one. Source owner should supply it.
- **CS 10 H Review Guide, K-Means assignment step.** "●For each data point ,
  assign it to cluster if" — the symbols and the whole condition are stripped,
  and the fragment "xjCi" is all that reached the CSV. Written from the
  immediately preceding bullet, which states the same rule in words ("Assign
  each data point to the cluster whose centroid is closest"), as: a point $x_j$
  joins cluster $C_i$ when $C_i$ has the nearest centroid. No metric or
  threshold was invented.

### Factual errors left as written

(The SQL heading "Basic Definition Language" and the "Structure Query Language"
expansion that stood here have been corrected under the corrected-claims
policy — see the section at the end of this file.)

### Garbled source text

- **CS 10 H Review Guide, "V ALUES".** The SQL keyword `VALUES` is split by a
  spurious space in both `INSERT INTO` examples — a kerning artefact of PDF
  extraction, not a claim. Written `VALUES`.
- **CS 10 H Review Guide, the `SELECT` example.**
  `SELECT Stu_Name, Score FROM Students WHERE c.C_Name = 'Computer Science'`
  qualifies a column with an alias `c` that no `FROM` clause declares, and
  names the table `Students` where the guide's other three examples use
  `Student`. It reads like a join example that lost its join. Reproduced as
  written in lesson 2, since what is missing is source text rather than
  confidence in an answer. Source owner should supply the original.
- **CS 10 H Review Guide, the three "Detailed Explanation" links.** All three
  YouTube URLs are ligature-garbled — "hRps://www.youtube.com/watV?v=..." for
  https://www.youtube.com/watch?v=... . The protocol and path read through
  unambiguously, but the video IDs cannot be checked for the same substitution
  and a mistyped ID leads nowhere, so the links are not reproduced in the
  notes. They sit under KNN, K-Means and PCA. Source owner should supply
  working URLs.
- **CS 10 H Practice Set and Answers, underscores dropped from identifiers.**
  Wherever an identifier appears in prose rather than in a code listing its
  underscores are lost: "insert atallpositions", "binary search rec", "count
  islands", "numislands". The code listings themselves came through intact, so
  the notes use the code spelling throughout —
  `insert_at_all_positions`, `binary_search_rec`, `count_islands`,
  `num_islands`.
- **CS 10 H Practice Set, trailing index-keyword runs.** Several items end with
  a keyword run that the reader script's filter does not strip: "13. What is
  the purpose of the tracert command?,purpose,tracert,command"; "15.,B,C,E";
  and a long run after item 14 in the answers. These are CSV artefacts rather
  than question text and were ignored.
- **CS 10 H Practice Set, Problem 6.** The "(a)" part label is missing — the
  problem runs straight from the tree description into "Explain how you arrived
  at that number", with "(b)" present as normal. Both parts are covered.

### Open questions for the house

- **CS 10 H numbering and the recursion split.** The Review Guide numbers
  nothing, so lessons are numbered sequentially in the order it teaches:
  1 Networks, 2 Databases and SQL, 3 Machine Learning. Recursion is in the
  practice set's stated range ("Network, Database, Machine Learning,
  Recursion") but appears nowhere in the Review Guide, so it follows as
  chapters 4 and 5. The practice set's seven recursion problems were split
  where the material changes: 4 Recursion covers base cases, the call stack,
  factorial and Fibonacci (problems 1-2); 5 Recursive Algorithms covers
  permutations, the power set, binary search, binary-tree height and flood fill
  (problems 3-7), in the practice set's own order. Merge them into one chapter
  if the house prefers one lesson per practice-set range item.
- **CS 10 H: the Review Guide's Networks section is two bullets.** A definition
  and a list of three advantages, and nothing else. Subnetting, `tracert` and
  private IP address ranges reach this level only through practice questions
  12-14, and SVM and computer vision only through questions 4 and 15. Lesson 1
  is short for that reason, not through omission. If networking is genuinely
  examined at this level, the Review Guide is missing a section.

## Chemistry 10 H (Grade 10 finals guides)

Three documents: `H Review Guide.pdf`, `H Reivew Practice.pdf` (the filename
typo is in the source), `H Review Practice Answers.pdf`. Entries are grouped
under the same categories used above.

### Errors corrected in the notes (guide contradicts itself)

- **Chemistry 10 H practice set, True/False 4.** "Increasing temperature (in
  almost all cases) decreases gas solubility in liquids because $k_H$ increases
  with temperature", marked True. The trend is right, the reason is the wrong
  way round against the same practice set's own definition of $k_H$: question
  13 gives $k_H$ for $\mathrm{O_2}$ in water as $1.3\times10^{-3}$ M/atm and
  has the student compute solubility as $k_H P$. Under those units a solubility
  that falls at fixed pressure requires $k_H$ to fall, not rise. Lesson 13
  keeps the marked answer, since the trend is the examinable point, and adds
  one sentence telling the student to take the direction of the trend rather
  than the reason printed beside it. Source owner should fix the clause or
  restate $k_H$ in atm/M.

### Extraction losses (text that did not survive the pipeline)

- **Chemistry 10 H practice set, question 7.** Option B is missing entirely —
  the item runs A, C, D. The answer is A, so the lost option does not affect
  the teaching, and lesson 5.2 uses the question without enumerating options.
- **Chemistry 10 H practice set, questions 12 and 14.** Both stems are gone;
  only the four options survive ("A) -74.7 kJ/mol B) +74.7 kJ/mol C) -156.3
  kJ/mol D) +156.3 kJ/mol" and "A) -93 kJ B) +93 kJ C) -1476 kJ D) +1476 kJ"),
  with the answer key giving B and A. The magnitudes and the sign pattern say
  these are enthalpy calculations, but which method each tests — Hess's law,
  formation enthalpies or bond enthalpies — is not recoverable, so neither is
  written up as a worked example. Source owner should supply the stems.
- **Chemistry 10 H practice set, Section C.** The heading "C. Short Answer
  Questions (Calculations)" is the last line of the document; every calculation
  question under it is missing. The answer key supplies two answers, -50 kJ/mol
  and -890.3 kJ/mol, with no questions attached. Not written up, since what is
  missing is the question rather than confidence in an answer. This is the
  largest loss in the set — two of the paper's calculation items reach the
  student as bare numbers.

### Garbled source text

- **Chemistry 10 H Review Guide, ligature substitution throughout.** Every
  ligature pair in the document was replaced by a punctuation character or a
  stray capital: `st` appears as `/` or `'` ("Fir/ Law", "sy'em", "'udy"),
  `ch` as `-` or `U` ("Thermo-emi/ry", "Uange", "whiU"), `ti` as `C` or `H`
  ("reacCon", "funcHons"), and `ct` as `P` or `_` ("objeP", "produ_s"). Every
  instance is unambiguous from context, so the guide was read through rather
  than treated as lost. The practice set and answers have the same fault in a
  milder form, with `ti` rendered as `2` ("reac2on", "Prac2ce", "2mes"). No
  content was dropped for this reason. Re-extraction with ligature support
  would make these three documents readable as they stand.
- **Chemistry 10 H answer key, True/False 3 rationale.** Printed as
  "3.F (its -2 2mes)". Decoding the `2` substitution gives "it's - 2 times",
  and read as a dash plus "2 times" it matches the guide: the question asks
  whether $\Delta H$ for $\mathrm{2H_2(g) + O_2(g) \rightarrow 2H_2O(g)}$
  equals $\Delta H^\circ_f$ of $\mathrm{H_2O(g)}$, and the Review Guide's own
  summation $\sum n\Delta H^\circ_f(\text{products}) -
  \sum m\Delta H^\circ_f(\text{reactants})$ gives $2\Delta H^\circ_f$, the
  elements contributing zero. Lesson 5.7 writes it as twice. Read instead as
  the number $-2$, the rationale would contradict the guide's own formula.

### Open questions for the house

- **Chemistry 10 H numbering.** The Review Guide is one chapter, "Chapter 5
  Thermochemistry", and numbers its own sections 5.1 to 5.8, so the lessons
  take those codes directly rather than a sequential 1-8.
- **Chemistry 10 H, the solution chemistry has no chapter of its own.** Seven
  of the practice set's twenty items (MC 3, 6, 9, 10, 11, 13 and True/False 2
  and 4) test molarity, "like dissolves like", Henry's law, the temperature
  dependence of solubility and boiling-point elevation. None of it is in the
  Review Guide, which covers Chapter 5 only and signs off with "(Chapter 13 is
  covered in the past resources)". Per the Grade 10 brief the practice set is
  still this level's material, so it was written up as a lesson numbered 13 —
  the guide's own name for the material it points away from. The inference that
  the untaught solution chemistry *is* Chapter 13 is strong but not stated;
  renumber to 6 if the house prefers strict sequence. It also means this
  level's notes teach solution chemistry from exam questions alone, with no
  syllabus text behind it — the Review Guide should carry a Chapter 13 section
  or the past resource should be added to the document list.
- **Chemistry 10 H Review Guide, a stray section header inside 5.8.** The
  bond-enthalpy formula is followed immediately by "8.8 Strengths and Lengths
  of Covalent Bonds" and then the bond-order sentence, with no break and no
  chapter 8 anywhere else in the document. It reads as a textbook cross-
  reference that lost its formatting. The sentence is taught inside lesson 5.8,
  where the guide puts it; no chapter 8 lesson was created for one line.
- **Chemistry 10 H practice set, question 5 has two correct options.**
  "If a gas expands against a constant external pressure of 2 atm from 5 L to
  10 L, how much work is done? (1 L·atm = 101.3 J)" offers both
  "A) -10 L·atm" and "C) -1013 J". These are the same quantity in different
  units and both are right; the key marks C. Lesson 5.3 works the calculation
  through in both units and notes that C is the intended answer. Source owner
  should replace option A.

## Economics 10 H (Grade 10 finals guides)

Three documents: `H Review Guide.pdf`, `H Review Practice.pdf`,
`H Review Practice Answers.pdf`. Entries are grouped under the same categories
used above.

### Errors corrected in the notes (guide contradicts itself)

- **Economics 10 H Review Guide, the monetary policy worked example.** The
  recessionary-gap chain ends "→investment increase →AD increase (shift left)".
  The same guide states that expansionary fiscal policy — which increases AD —
  "shifts AD right", and prints the parallel inflationary-gap chain as "AD
  decrease (shift left)". Written as a rightward shift in lesson 2.2, with one
  sentence in the lesson saying so, because students revise with this guide
  open beside the notes.

### Extraction losses (diagrams and tables that did not survive the pipeline)

- **Economics 10 H: every diagram in a diagram-heavy course.** Nothing
  graphical survived, in either the guide or the practice set. The affected
  slots are: the money-market graph FRQ 1(c) asks the student to draw; the
  foreign-exchange graph FRQ 2(c) asks for — the answer key's entire answer to
  that part is the instruction "Draw a correctly labeled graph of the foreign
  exchange market for the ringgit", so it supplies no content either; the
  currency-market figure that practice MCQs 14-17 depend on ("in this figure",
  "At the price of $2 for £1 in this figure"); the guide's own "Demand Supply
  Diagrams" heading in the forex chapter, where only the two sentences
  explaining why each curve slopes as it does survive; and the tariff diagram
  the case study requires (see below). The lessons teach what the surrounding
  prose and the question stems state — the market being drawn, the equilibrium
  of $2 per £1, and the two slope explanations — and invent no axes, curves or
  values.
- **Economics 10 H case study, part (c) has no answer at all.** The question
  asks students to use a tariff diagram to explain the effects of extending the
  tariffs on producers, consumers and governments in both countries. The answer
  key prints "(c)" and then nothing, moving straight to (d). So neither the
  diagram nor a model answer exists anywhere in this level's documents. Lesson
  5.1 answers it from the guide's own statements about what a tariff does —
  price to domestic buyers and sellers becomes $P_W + T$, quantity of imports
  falls, government gains revenue — plus the stakeholder claims the case text
  and part (d) make, and says plainly that the key leaves the part blank.
- **Economics 10 H, "CHECK PPT: Monetary Policy and the Fed Funds Rate".** The
  guide defers to a slide deck that is not in the corpus. What follows the
  pointer (sell bonds → fewer reserves → smaller supply of federal funds → the
  rate rises) is taught; whatever the deck added is lost.
- **Economics 10 H, the multiplier formula.** The guide names the multiplier
  effect and gives $\text{MPC} = \Delta C/\Delta\text{Income}$, but never
  prints the multiplier itself. Practice MCQ 7 — raise AD by $600bn with
  MPC $=0.75$, stated answer $150bn — only follows from $1/(1-\text{MPC})$, so
  lesson 3.1 states that formula. No other formula was supplied.
- **Economics 10 H, FRQ 1 balance sheet.** Flattened into a run-on
  ("AssetsLiabilitiesRequired reserves $2,000Demand deposits $10,000Excess
  reserves $0 …"). Recovered rather than dropped: the fields split
  unambiguously, assets total $20,000 against demand deposits plus owner's
  equity of $20,000, and required reserves over demand deposits gives the 0.2
  the answer key states.

### Garbled source text

- **Economics 10 H Review Guide, typos read through.** Each is fixed by its own
  sentence: "the paper bills and coins in the hands of the (non-bank) republic"
  (public); "he could buy the good for P W in work markets" (world markets);
  "Why the supply curve Is upward sploing" (sloping); and the routine doubled
  letters — "suppply", "reeserves", "proc cess", "money supply expands".
- **Economics 10 H, "Budget balance= tax revenue=Govt spending".** Read as the
  definition of a balanced budget — tax revenue equal to government spending —
  which is what the surrounding lines on surplus, deficit and the stock-flow
  distinction require. Lesson 3.2 words it that way.
- **Economics 10 H, the abbreviation "FR".** Both policy examples act on "lower
  FR / raise FR" alongside RRR and government bond purchases, and the guide
  never expands it. It sits as the third of exactly the three tools the same
  guide tabulates, i.e. the discount rate. Lesson 2.2 keeps the guide's "FR"
  and presents the chain as acting on all three tools at once, rather than
  substituting a name the guide does not print there.
- **Economics 10 H, the crowding-out parenthesis.** Printed as "(G↑or I ↑, AD ↑,
  PL ↑(MD curve rightwards), R ↑)". The same guide defines a fiscal expansion as
  an increase in G and/or a decrease in T, so "or I ↑" reads as neither
  instrument. Lesson 3.1 gives the chain from G↑ and does not reproduce the
  ambiguous token; the rest of the chain is written out as printed.
- **Economics 10 H practice set, a cross-reference that cannot be followed.**
  "USE GRAPH in Q11 for Q 12, 13, 14" sits between questions 13 and 14. Q11 is
  a bank-reserves calculation with no graph, Q12 is about long-run growth and
  Q13 about the Phillips curve, and the questions that actually need a figure
  are 14-17. Ignored as printed; MCQs 14-17 are answered in lesson 6 from the
  equilibrium their own stems state.
- **Economics 10 H practice set, MCQ 6.** Option b is a joke distractor ("The
  illuminate", followed by an emoji) in an exam-revision paper. Not reproduced
  in the notes.

### Factual errors left as written

The entry formerly listed here (who wants foreign direct investment) has been
corrected in the notes and moved to "Errors corrected under the
corrected-claims policy" at the end of this file.

### Open questions for the house

- **Economics 10 H numbering.** The Review Guide numbers only three of its five
  units, and numbers them by the textbook chapters they are drawn from —
  "Chapter 3 Free Trade", "Chapter 9 Tariff and quota", "Chapter 31 Forex
  market and system" — while Monetary Policy and Fiscal Policy carry no number
  at all. Taking 3, 9 and 31 as lesson codes would leave the two unnumbered
  units, which come first, with nowhere to sit. Lessons are therefore numbered
  sequentially in the guide's own teaching order (1 pre-midterm topics, 2
  money and monetary policy, 3 fiscal policy, 4 free trade, 5 tariffs, quotas
  and protectionism, 6 foreign exchange), which is what the other Grade 10
  courses in the corpus do. Renumber to 3/9/31 if the house prefers the printed
  chapter numbers.
- **Economics 10 H, the pre-midterm 30% has no guide.** The Review Guide's own
  range line says "Before midterm 30%; M3 35%; M4 35%", but the document covers
  post-midterm content only. Practice MCQs 1, 2, 3, 4, 8 and 13 test the
  missing 30% — leakages from the circular flow, business cycles, value added,
  why the official unemployment rate understates unemployment, and the
  short-run Phillips curve including the effect of a rise in input prices. Per
  the Grade 10 brief the practice set is still this level's material, so these
  are collected in lesson 1 and taught from the stems and the answer key alone.
  That lesson consequently rests on exam questions with no syllabus text behind
  it; the guide should carry a pre-midterm section, or the pre-midterm resource
  should be added to the document list.

## Cross-course contamination in pre-rule drafts

Lessons written before the strict-sourcing rule was in force contain material
their course's own guides never teach. Two confirmed cases, both found by
checking the drafts against the sources rather than trusting them:

- **Economics 10** carried three microeconomics lessons (Demand/Supply/
  Elasticity, Welfare Economics/Costs/Production, Market Structures/Factor
  Markets). Searching every Economics source for micro vocabulary
  (elasticity, monopoly, oligopoly, marginal cost, consumer surplus, perfect
  competition) returns 1 hit across all four Grade 10 guides and 23 across the
  AP Economics guides. The material was imported from AP Economics — a
  different course. All seven flat lessons archived to
  `build/superseded/hs-economics-10/`; S and H now carry 12 properly sourced
  lessons between them.
- **Chemistry 10** drafts contained an invented Henry's law with a fabricated
  constant, a "like dissolves like" section on NaCl/CCl4/benzene/lattice
  energy, invented worked examples, citations to sections 7.2 and 3.1 that do
  not exist in its guides, and a claim that gases dissolve exothermically.
  All removed when the course was rewritten per level.

Every remaining pre-rule draft should be assumed contaminated until checked:
AP Calculus AB (9), AP Physics 1 (7), Biology 10 (4), Music (3), AP Chemistry
(1), AP World History (1), Chinese 10 (1).

## Reader script was stripping every double quote

`rd.sh` ran `tr -d '"'`, removing CSV field-quoting and content quotes alike.
704 content rows across 116 documents reached agents with quote marks gone —
book titles as `Principles of Geology:` instead of `"Principles of Geology"`,
and Python/SQL string literals as invalid code. Fixed to parse the CSV
properly; the replacement also recovers text the old trailing-keyword regex
was eating. Notes written before the fix may render quoted titles as bold or
italic instead of quoted.

## Math 10 H (Grade 10 finals guides)

One document: `H Review Guide.pdf` — the Precalculus H review guide, covering
chapters 7, 8, 9, 10 and 13. The doclist gives this level no practice set and
no answer key, so every lesson rests on the review guide alone and the only
worked examples available are the guide's own three. Entries are grouped under
the same categories used above.

### Errors corrected in the notes (guide contradicts itself)

- **Math 10 H, chapter 10, sum and difference formulas for sine.** Printed as
  "Sin(α+β)= sinα cosα+cosβ sinβ" and "Sin(α-β)=sinα cosα-cosβ sinβ". The
  angles under the cosines are wrong both times, and the same line carries the
  guide's own mnemonic — "Sincos Cossin, sign same" — which describes
  $\sin\alpha\cos\beta \pm \cos\alpha\sin\beta$ with the two angles
  alternating. Lesson 10 writes the formulas the mnemonic describes and adds
  one sentence telling the student the printed pair is the slip. Source owner
  should fix.
- **Math 10 H, chapter 10, worked example $\sin(4\pi/3)$.** Printed as
  "sin(3π/2-π/6)= sin3π/2 cos3π/2-cosπ/6 sinπ/6" — the same fault carried into
  the example, with the two cosine angles swapped. Corrected in lesson 10 from
  the guide's own mnemonic, giving
  $\sin\frac{3\pi}{2}\cos\frac{\pi}{6}-\cos\frac{3\pi}{2}\sin\frac{\pi}{6}$.
  Covered by the same one sentence as the entry above.
- **Math 10 H, chapter 9, law of cosines rearranged for an angle.** Printed
  "Cos B=(a2+c2-c2)/2ac". The guide's own worded form sits two lines below it —
  "Cos(angle)=[(adjacent)2+(adjacent)2-(opposite)2]/2(adjacent)*(adjacent)" —
  and requires the subtracted square to be the side opposite the angle. Lesson
  9 writes $\cos B = \frac{a^2+c^2-b^2}{2ac}$ and carries one sentence pointing
  the student at the worded form. Source owner should fix.
- **Math 10 H, chapter 13, definition of an arithmetic sequence.** "A sequence
  is an arithmetic sequence if there is a constant difference(d) for which
  a n=an1+d for all integers n<1". The bound is wrong: the parallel geometric
  definition in the same list says "for all integers n>1", and a recursion on
  $a_{n-1}$ is vacuous for $n<1$. Lesson 13 writes $n>1$ with one sentence
  noting it matches the geometric definition. Source owner should fix.

### Factual errors left as written

Both entries formerly listed here (chapter 9, the ambiguous case test; chapter
13, limits of $r^n$) have been corrected in the notes and moved to "Errors
corrected under the corrected-claims policy" at the end of this file.

### Extraction losses (images and equations that did not survive the pipeline)

- **Math 10 H, chapter 13, the geometric series sum formula.** The text runs
  "A series may be written using sigma Notation. The letter k is called the
  index of summation \\ For the geometric series formula r ≠1". The formula
  itself was an image and is gone, leaving only its side condition. Lesson 13
  can state the condition and nothing else, so this level's notes teach series
  without the sum of the first $n$ terms of a geometric series — the single
  largest gap in the course. Source owner should supply it as text.
- **Math 10 H, chapter 13, the "Sigma Notation" section.** The heading survives
  with nothing under it but the fragment "∑∞ 𝑘=1". Whatever expansion or
  example sat there is lost; what can be sourced is folded into the series
  section of lesson 13.
- **Math 10 H, chapter 13, arithmetic recursive formula.** Printed "a nan-1=d",
  the minus sign lost with the subscript formatting. Read as
  $a_n - a_{n-1} = d$, which is what the guide's explicit formula
  $a_n = a_1 + (n-1)d$ gives. Not treated as a content error.
- **Math 10 H, superscripts and subscripts flattened throughout.**
  "a2=c2+b2-2cb cosA", "a n=a1*rn-1", "A=θ/360*π r2", "Tan2 α= 2 tanα/1-(tanα)2",
  "lim 𝑛→∞𝑟𝑛=0". Every instance is unambiguous from the surrounding text and
  none was dropped; the notes restore the formatting. Fraction bars are
  likewise flat, so "Tan( α+β)= tanα+tanβ/1-tanα tanβ" has to be read with the
  bracketing the guide omits.

### Garbled source text

- **Math 10 H, spaced-out words throughout the guide.** "Measurem ent",
  "Coter minal An gles", "Chap ter", "Genera l Solutions", "Formu la",
  "Math ematical", "in finite", "t rue". Word-internal spaces appear across the
  whole document; all are readable from context and none affected the notes.
- **Math 10 H, chapter 13, typographic errors in the source.** "2 solutins" for
  solutions, "proceding" for preceding, "how many term in the sequence is
  related to the proceding term" for how each term, "increases without bond"
  for without bound, and "true for n=1m that i , P1 is t rue" for "true for
  n = 1, that is, P₁ is true". All read through and written correctly in the
  notes; none is a content claim.

### Open questions for the house

- **Math 10 H numbering.** The guide numbers its own chapters — 7, 8, 9, 10 and
  13 — and gives no section codes below chapter level, so the five lessons take
  the chapter numbers directly rather than a sequential 1-5. Note that the
  guide lays chapter 10 out *before* chapter 9; the lesson files sort in
  chapter order instead, which is also the order the guide's own range line
  reads for 7 and 8. Renumber sequentially if the house prefers presentation
  order.
- **Math 10 H, chapters 7 and 8 carry no content at all.** The guide's range
  line is "Chapter 9, 10,13(Mostly), Chapter 7,8", and the two secondary
  chapters arrive as ticked topic lists — "Definition of Radian, Standar d
  Position, Coter minal Angles", "Vertica l Dilation ( Stretch & Shrink )",
  "Reciprocal Ratio Identities, Pythagor ean Relationships, Cofunction
  Relationships" — with no definition, formula, graph or example anywhere in
  either. Lessons 7 and 8 are consequently revision checklists rather than
  taught material, and lesson 7 has no `## Keywords` section because the
  chapter defines no term. Two formulas were recovered from elsewhere in the
  same guide and placed where they belong: the sector-area pair
  ($A=\frac{\theta}{360}\pi r^2$ and $A=\frac12\theta r^2$), which the guide
  prints in its chapter 9 list, and $\tan\alpha = m$ for inclination, which it
  prints in chapter 10. Everything else in those two chapters is a topic name
  only. A student revising chapters 7 and 8 from these notes gets a syllabus,
  not an explanation; the guide should carry the definitions, or a chapter 7-8
  resource should be added to the document list.
- **Math 10 H, the three worked examples all stop before the answer.**
  $\cos 105^\circ$ ends at "cos45 cos60 -sin45 sin60", $\sin(4\pi/3)$ at the
  expansion, $\tan 195^\circ$ at the quotient of tangents, and the repeating-
  decimal example at "0.00134 0.999+164 100=fraction for this repeating
  decimal". Finishing any of them needs the numerical values of the special
  angles, which the guide tells the student to memorise but never lists, so the
  notes reproduce each example exactly as far as the guide takes it. Source
  owner should either finish the examples or print the special-angle table.

## English 10 H+ (Grade 10 finals guides)

### Garbled source text

- **All three H+ documents, ligature substitution throughout.** Every ligature
  pair was replaced by a stray capital or a punctuation mark, and the
  substitution table differs between the Review Guide and the practice
  materials. Review Guide: `ti` as `D` ("PracDce", "Dme", "CapDon",
  "idenDty"), `tt` as `W` ("GuWer", "uWerly", "maWer"), `ft` as a backtick
  ("o`en" for "often", "shi`" for "shift"). Practice Set and Answers: `ti` as
  `/` ("Prac/ce", "iden/ty", "detec/ve"), `tt` as `Y` ("leYer", "ShaYered",
  "aYempt"), `tti` as `n` ("Senng" for "Setting", in MCQ 9 option d), and once
  in the Answers `tt` as `l` ("ulerly" for "utterly", in the FRQ 3 key). Every
  instance is unambiguous from context, so the three documents were read
  through rather than treated as lost and no content was dropped. Re-extraction
  with ligature support would make them readable as they stand.
- **Review Guide, Motifs, Notebook entry.** Printed as "his too for case notes
  but then devolves as Quinn loses is grip on reality". Read as "his tool for
  case notes" and "loses his grip on reality" in lesson 7; both are typing
  slips rather than ligature damage, and neither reading is in doubt.
- **Review Guide, Motifs, Telephone entry.** "Marks the end aand the start as a
  callback" — "aand" for "and". Written through in lesson 7.
- **All three H+ documents, running header.** The header line reads "G10 PA
  Resource DepartmentFinals Review Prac/ce", with the department name run into
  the document title. A missing space or line break in the source, not a
  content loss.

### Open questions for the house

- **English 10 H+ Review Guide never names the work.** The Core Information
  block gives "Original Author: Paul Auster (from The New York Trilogy)",
  the adaptors, the genre and the themes, but no title. The title *City of
  Glass* appears only in the practice set's free-response prompts, and the
  notes use it on that authority. A student revising from the Review Guide
  alone would not learn what the book is called.
- **The Review Guide sets out no essay structure and no marking criteria.** The
  only marking guidance at this level is the "Answer Key Points" lists in the
  Practice Set Answers, which are reproduced in lessons 4 (FRQ 1), 5 (FRQ 2)
  and 6 (FRQ 3 and FRQ 4). Since the paper is four free-response questions plus
  ten MCQs, that leaves the guide silent on how the essays are to be built; the
  answer keys are doing the whole job.
- **The practice materials carry visual-analysis content the Review Guide does
  not.** MCQ 6 describes Mazzucchelli's style ("stark shadows, clean lines, and
  deliberate pacing") and the FRQ 2 key names chiaroscuro, distorted
  perspectives, binocular POV, negative space, silent panels, falling figures
  and the Tower of Babel — none of which appear in the Review Guide, whose
  comics lexis stops at eight definitions. Per the Grade 10 brief the practice
  set is still this level's material, so it is taught in lessons 1 and 5, but
  the Review Guide's visual-analysis section is thinner than the exam requires.
- **English 10 H+ MCQ key is heavily weighted to one option.** The ten answers
  are C, C, C, D, C, C, B, C, C, C — eight of ten are option c). Not an error,
  but a student guessing c) throughout would score 80%. Worth reshuffling
  upstream.
- **English 10 H+ numbering.** The Review Guide numbers nothing; its units are
  Lexis Terms, Core Information, Plot & Premise, Key Characters, Major Themes
  and Motifs. Lessons are numbered sequentially in that order, with two
  departures: the single "Lexis Terms" list is split into lesson 1 (the eight
  comics terms) and lesson 2 (the eight postmodernism terms), since the list
  contains two unrelated clusters; and the seven Major Themes are split into
  lesson 5 (Identity & Doubles, Language & Meaning, Reality vs. Illusion/
  Construction, Obsession & Descent, Isolation & Alienation) and lesson 6 (The
  Failure of Detection, Authorship & Creation), because those last two are the
  two the practice set turns into full essays. Merge back to six lessons if the
  house prefers the guide's own headings one for one.

## English 10 H (Grade 10 finals guides)

One document: `H Review Guide.pdf`. Unlike the other Grade 10 courses, this
level has no practice set and no answer key in the document list — the H+ level
of the same course has all three. Entries are grouped under the same categories
used above.

### Garbled source text

- **English 10 H Review Guide, parallel structure example.** Printed
  `'She likes reading, wriKng, and running.'` — a `ti` ligature lost in
  extraction, not a claim about the word. Written *writing* in lesson 2, which
  is also the only reading that makes the example parallel.
- **English 10 H Review Guide, the Exonerated quotation.** "I thought I was o
  the hook" — an `ff` ligature lost the same way. Written "off the hook" in
  lesson 8. Every other quotation in the vocabulary list was checked against
  the source and reproduced exactly.
- **English 10 H Review Guide, the antagonist line.** "Antagonist: Garrett
  Mille", where the plot summary and character 7 both give **Garrett Miller**.
  Written Miller.
- **English 10 H Review Guide, the Discarded entry.** "Discarded -to get rid of
  or throw away death" — the trailing "death" has bled in from the Condolence
  definition ("especially during a time of death") and belongs to no sentence
  where it stands. Written "to get rid of or throw away".
- **English 10 H Review Guide, "was easy".** Two stray words sit between the
  parallel-structure example and the voice section, attached to neither:
  "...running.' was easy (Not sure if this will be tested but you still need to
  know it): Journalistic voice:". The parenthesis is the author's note on the
  voice material and is kept in lesson 3; "was easy" is orphaned text and was
  ignored.
- **English 10 H Review Guide, the Condolence definition.** Printed "an
  expression or sympathy, especially during a time of death" — *or* for *of*.
  Reproduced as printed in lesson 8 so a student's notes match the guide, since
  it is a one-letter slip in the guide's own wording rather than a claim.
- **English 10 H Review Guide, the Condolence quotation.** Ends without
  punctuation mid-clause: "...she believed she had a role in what had
  happened—or maybe that Mayor did". Reproduced as it stands; nothing was
  invented to finish it. Source owner should supply the rest of the sentence.
- **English 10 H Review Guide, the novel's title.** The section heading reads
  "Book of unknown Americans". Lessons 4-5 use *The Book of Unknown Americans*.
- **English 10 H Review Guide, the Quizlet link.** The guide offers "Click
  here" followed by "If it doesn't work then use this link:" and a URL. The
  hyperlink behind "Click here" did not survive extraction; the fallback URL
  did, intact, and is the one reproduced in lesson 8.

### Factual errors left as written

The entry formerly listed here (Careened) has been corrected in the notes and
moved to "Errors corrected under the corrected-claims policy" at the end of
this file.

### Extraction losses (numbering that did not survive the pipeline)

- **English 10 H Review Guide, key themes.** The list is introduced "Key
  themes: 1. Immigration and the American Dream", and every theme after the
  first has lost its number — Isolation vs. Community, Love and Relationships,
  Trauma and Recovery, Family and Sacrifice and Identity and Belonging all run
  on as plain headings. The eight-item character list immediately above kept
  its numbers 1-8, so the numbering was there. Lesson 6 numbers the themes 1-6
  in the guide's own order.

### Open questions for the house

- **English 10 H numbering.** The Review Guide numbers no sections, so lessons
  are numbered sequentially in the order it teaches: 1 relative clauses,
  2 parallel structure, 3 journalistic and narrative voice, 4 the novel's
  context and plot, 5 characters, 6 key themes, 7 lexis, 8 vocabulary. The
  guide's own topic headings were taken as the lesson boundaries, which is why
  lesson 2 is three lines of source long — parallel structure gets a
  definition, a fix and one example and nothing else. Merge it into lesson 1 if
  the house prefers a single grammar chapter.
- **English 10 H: the guide never names the novel's author.** It gives dates,
  genre, setting, climax and antagonist for *The Book of Unknown Americans* but
  no author, so the notes name none. Strict sourcing forbids supplying it, and
  a student could reasonably be asked for it. The guide should carry it.
- **English 10 H: no essay structure and no marking criteria.** The guide sets
  out no paragraph frame, no question types and no rubric — nothing on how the
  literature material is to be written up in the exam. Every other section is
  content to be recalled. If the final has an essay, the guide is missing the
  section that tells students how it is marked.
- **English 10 H: climax line against plot summary.** The bullet list gives the
  climax as Arturo setting out to confront the boy "and he is shot and killed
  along the way"; the plot summary has him reach the house — "confronts
  Garrett's family and is fatally shot by Garrett's father" — and character 2
  agrees, calling it a death "following a misunderstanding with Garrett's
  family". The two accounts are reproduced where the guide puts them, since
  "along the way" can be read as during the errand rather than before arriving.
  Source owner should make the bullet match the summary.
- **English 10 H, essential vs non-essential clauses.** The guide defines a
  relative clause as one that "gives more information about a noun", then
  distinguishes the non-essential clause as one that "gives more information"
  from the essential clause as one that "doesn't give extra information" — so
  the head definition and the essential-clause definition read as opposites
  unless *extra* is taken to mean removable. Lesson 1 keeps both definitions
  verbatim and draws the distinction out of the guide's own two examples and
  their commas, without importing the that/which rule the guide does not state.

## Chinese 10 H (Grade 10 finals guides)

One document: `CLASS OF 7 PA S2 FINALS GUIDES/Chinese/H Review Guide.pdf`. There
is no practice set or answer key for this course. The guide covers two works —
《红楼梦》选段《林黛玉进贾府》 (numbered sections 1-5) and 陆游《游山西村》,
labelled 默写 and carrying no number. Entries use the categories above.

### Factual errors

(The commentator's name and 王熙凤's misquoted line that stood here have been
corrected under the corrected-claims policy — see the section at the end of this
file.)

### Errors corrected in the notes (guide contradicts itself)

- **Chinese 10 H Review Guide, 荣禧堂.** Printed as "显出贾家豪华奢侈；权利与
  地位的显赫". 权利 (rights) is a homophone slip for 权力 (power) — the same
  guide writes 权力 correctly two sections later, in 王熙凤's 作用 ("展现其张扬
  性格和在贾府的实际权力"). Lesson 2 writes 权力. No note in the lesson; the
  slip is not one a student would notice as a contradiction.

### Extraction losses (images that did not survive the pipeline)

- **Chinese 10 H Review Guide, section 4 人物关系.** The section is a heading
  and a colon with nothing under it — the extracted text runs straight from
  "4.人物关系：" into "5.字词注音/注释1.杜撰（dùzhuàn）". A relationship chart
  or family tree was almost certainly there as an image. Lesson 4 was assembled
  from the relationship statements the guide makes elsewhere (四大家族 贾史王薛;
  宁国府 and 荣国府; the order of 黛玉's拜见; 宝玉 as 王夫人唯一的儿子 and 贾母's
  favourite; 贾母's "凤辣子"; the 宝黛钗 main line), so no kinship the guide does
  not state has been asserted — which means the notes cannot tell a student how
  贾母, 贾赦, 贾政, 邢夫人 and 王夫人 are related to one another, or that 黛玉 is
  related to the 贾 family at all. That is exactly what the missing chart would
  have supplied. It should be re-extracted or supplied as text.

### Garbled source text

- **Chinese 10 H Review Guide, 贾府大门.** Printed as "贾府大门-宁、荣西府门面".
  西 fits nothing here; the guide names 宁国府 ("敕造宁国府"匾额) and 荣国府
  (林黛玉来到荣国府) elsewhere, so lesson 2 writes 宁国府与荣国府的门面. The
  likely original is 宁、荣二府 or 宁、荣东西二府.
- **Chinese 10 H Review Guide, two pinyin entries have no tone marks.** Item 29
  嫡（di） and item 42 便宜（bianyi）. Every other entry in the 注音 list carries
  tone marks, so this may be a loss in extraction rather than a fault in the
  PDF. Reproduced as printed in lesson 5; if it is the PDF, the tones should be
  restored, since the whole point of that list is the tone.

### Open questions for the house

- **Chinese 10 H numbering.** The guide numbers its 《红楼梦》 topics 1-5
  (文学常识, 整体剧情, 人物形象, 人物关系, 字词注音/注释), so the lessons take
  those codes. 《游山西村》 is a second work with no number of its own and is
  given 6, continuing the sequence in the guide's own order.
- **Chinese 10 H, 《游山西村》 has no teaching content.** The guide gives the
  title, the author 陆游, the label 默写 and the eight lines — no 赏析, no
  背景, no 字词. Lesson 6 is therefore the poem plus a statement of the
  requirement, and is the one lesson in this level with no `## Keywords`
  section, because the guide defines nothing for it. If the course expects the
  poem to be understood as well as memorised, the guide needs a 赏析 section.
- **Chinese 10 H, the pre-rule draft 《雷雨》 is unsupported.** The draft
  `content/notes/hs-chinese-10/01-1-thunderstorm.md` is on 曹禺《雷雨》 —
  characters, plot, themes. This level's only source contains no 雷雨, no 曹禺
  and no drama of any kind; the two works it covers are 《红楼梦》选段 and
  《游山西村》. Nothing in the draft is verifiable from the H material, so it was
  left untouched rather than folded into the level-scoped lessons. Whether it
  belongs to Chinese 10 S, to an earlier semester, or to no course in the
  corpus cannot be settled from the H list alone; someone with the S sources
  should check it before it is published or archived.

## Chinese 10 S (Grade 10 finals guides)

Three documents: `Chinese/S Review Guide.pdf`, `Chinese/S Review Practice.pdf`,
`Chinese/S Review Practice Answers.pdf`. The guide's own header states level S
and its stated range is 四大名著常识和雷雨. Entries grouped under the usual
categories.

### Errors corrected in the notes (guide contradicts itself)

- **Chinese 10 S, 周萍's parentage.** Practice 填空 3 asks "鲁侍萍的子女是＿＿和
  ＿＿" and the key answers "四凤；鲁大海". The same answer key, in 简答 3, calls
  周萍 四凤's "同母异父" brother — same mother, i.e. 侍萍 — and the Review Guide
  lists 鲁侍萍与周萍 among the four conflicts as "母子". So 周萍 is 侍萍's son
  too and the two-blank answer is not exhaustive. Lesson 4 prints the key's
  answer as given and adds one sentence saying the rest of the material treats
  周萍 as 侍萍's son as well, because a student revising with the answer sheet
  open would otherwise think the relationship table is wrong.

### Extraction losses (text and images that did not survive the pipeline)

- **Chinese 10 S Review Guide, section 2 人物关系 is empty.** The numbered
  heading "2. 人物关系" is followed immediately by "3. 情节梳理" — the entire
  character-relationship content (almost certainly a chart or family tree) is
  gone. This is the single most examinable section of the guide: the practice
  set devotes 填空 3, 填空 5 and MCQs 1, 4, 5 to it. Lesson 4 rebuilds the
  relationships from the practice set and its answers plus the guide's own
  conflict list, and invents nothing beyond them — so 周冲's mother, 鲁贵's
  occupation and 繁漪's own family are absent from the notes because no
  surviving source states them.
- **Chinese 10 S Review Guide, section 3 情节梳理 supplies only two captions.**
  All that survives is 第一场小标题：重逢 and 第二场小标题：对峙／斗争 with a
  parenthetical for each. There is no plot narration anywhere in this level's
  three documents, so lesson 5 teaches the two scene captions and the conflicts
  they name, and the plot beyond that (the ending) reaches the notes only
  through the practice answers' 简答 3.

### Garbled source text

- **Chinese 10 S, both practice PDFs: Kangxi radicals substituted for common
  characters.** Throughout `S Review Practice.pdf` and `S Review Practice
  Answers.pdf`, a set of frequent characters extracts as the visually identical
  Kangxi-radical codepoints — ⼀ for 一, ⼆ for 二, ⼤ for 大, ⼩ for 小, ⼈ for 人,
  ⽂ for 文, ⾬ for 雨, ⼯ for 工, ⼦ for 子, ⽗ for 父, ⺟ for 母, ⽣ for 生, ⽇ for
  日, ⾦ for 金, ⻓ for 长, ⻆ for 角, ⾯ for 面, ⽅ for 方, ⾃ for 自, ⽤ for 用,
  ⾏ for 行, ⽀ for 支, ⽌ for 止 and others. Every quotation in the notes uses the
  ordinary CJK characters. Anyone grepping these two documents for 人物, 雷雨,
  鲁大海 etc. will get no hits unless they normalise first.
- **Chinese 10 S, both practice PDFs: "Prac0ce" for "Practice".** The "ti"
  ligature is lost in the running header ("Finals Review Prac0ce"). Cosmetic.
- **Chinese 10 S Review Guide, three typos read through.** 鲁侍萍 is described
  as "善良，勤劳，顽强，正值，自尊" — 正值 for 正直, written as 正直 in lesson 7;
  "痛苦的经历已经把她的性格磨平的坚强勇敢" is ungrammatical and reads as 磨砺得
  坚强勇敢, written that way; and "倍受欺辱和压迫" is written 备受.

### Factual errors left as written

(The 金陵十二钗 entry that stood here has been corrected under the
corrected-claims policy — see the section at the end of this file.)

### Open questions for the house

- **Chinese 10 S, lesson numbering.** The guide numbers only the 《雷雨》 half of
  its content, 1-9 (话剧, 人物关系, 情节梳理, 矛盾冲突, 三段人物形象分析, 标题与
  主题, 戏剧人物语言特点), and leaves the 四大名著 block and the 曹禺 literary-
  history block in front of it unnumbered. Using the printed 1-9 would leave the
  two opening blocks without codes and collide with them. Lessons are therefore
  numbered 1-10 sequentially in the guide's own order, which shifts the guide's
  1-9 to 3-10. Change if the house prefers the printed numbers kept.
- **Chinese 10 S, MCQ 2 versus the guide's own analysis.** The MCQ asks the
  "主要原因" 周朴园 keeps 侍萍's furniture and remembers her birthday and keys the
  answer B, 塑造专情形象 ("本质是虚伪作态"), while the Review Guide says he
  "对过去那段感情有一定怀念" and that his feeling is "复杂的，有真实的怀念，也有
  虚伪的一面". Not treated as a contradiction: the guide also says the 怀念 is
  "更多是满足自己的情感和道德需求", which ranks the two sides and makes B the
  main reason. Lesson 6 says so explicitly, since a student who has read the
  guide's "真实的怀念" line will otherwise expect A.
- **Chinese 10 S, "（都市生活剧）".** The 文常 line reads "代表作《雷雨（处女作）》
  （都市生活剧）《日出》《原野》《北京人》" — it is not clear whether the label
  applies to 《雷雨》 alone or to the whole list. Lesson 2 reports it as a label
  the guide attaches after 《雷雨》 and claims nothing further.
- **Chinese 10 S, thirty years or thirty-odd.** The guide writes "30年来" and
  quotes "三十年的功夫你还是找到这儿来了" but also "三十多年前被自己赶出门的侍萍";
  the practice fill-in keys 三十. Both forms are reproduced where each occurs.

### The pre-rule draft at `content/notes/hs-chinese-10/01-1-thunderstorm.md`

Checked against all three S documents rather than deleted, and left in place.
Most of it is supported: 曹禺/万家宝/1934/悲剧/天津/周鲁两家/三十年, the character
table, 四凤 having no blood tie to 周朴园, 繁漪 as 周萍's 继母 with 不伦之恋,
鲁大海 as 工人代表 in the 罢工, 四凤 and 周冲 dying by electrocution, 侍萍's
除夕跳河 — all of it traces to the practice set and its answers, and it is folded
into the S lessons. Four claims are not in any S document and were not carried
over: that 周冲 is 繁漪's son (the sources give only "次子是周冲"); that 鲁贵 is a
servant in the 周 household (the sources say only that 侍萍 married him and that
四凤 is their daughter); that 繁漪 is "全剧最具反抗性的人物" with a "雷雨"性格
(the answers mention only 繁漪出轨 as a failed act of resistance and her being
囚禁 by the family); and that the play compresses thirty years into a single day
(the guide gives the 三一律 as "时间、地点和行动的高度集中" and never says 一日).
The draft is also unlevelled while this course is streamed S and H, and its
heading code `1.1` matches neither brief's convention for Grade 10.

## Physics 10 H (Grade 10 finals guides)

Three documents: `H Review Guide.pdf`, `H Review Practice.pdf`,
`H Review Practice Answers.pdf`. Entries are grouped under the same categories
used above.

### Errors corrected in the notes (guide contradicts itself)

- **Physics 10 H Review Guide, 18.1.** The worked account of a cell announces
  its own setup — "I will use sulfuric acid for electrolyte, zinc for anode,
  and copper for cathode" — then step 3 reads "Electrons are pulled off the
  carbon cathode" while the equation printed on that same line is
  $\mathrm{Cu \rightarrow Cu^{2+} + 2e^-}$. Written as the copper cathode, with
  one sentence in lesson 18.1 saying so, because students revise with the guide
  open beside the notes.
- **Physics 10 H Review Guide, 18.3.** The filament lamp entry reads
  "Filament lamps' $R$ increases as $V$ decreases. Thus, concave down curve for
  IV graph". Three things in the same guide contradict it: the slope of an
  $I$–$V$ graph is stated two lines earlier as $1/R$, so a concave-down curve is
  one whose $R$ rises with $V$; the parallel diode entry is phrased "as $V$
  increases"; and 18.4 states that a metal's resistance rises with temperature,
  which is what a filament does as $V$ rises. Written as *increases as $V$
  increases*.
- **Physics 10 H Review Guide, 20.4.** The Lorentz force extremes are printed
  "Fmax = $qvB$ when θ = 90°" and "Fmax = 0 when θ = 0°" — the same label on
  both. The same guide's 20.3 prints the corresponding pair for the Ampère
  force correctly as $F_{\max}$ and $F_{\min}$. Written as $F_{\min}$ in lesson
  20.4, with a one-sentence note.

### Extraction losses (figures, tables and equation objects)

- **Physics 10 H Review Guide, 18.2 "Circuit Symbols".** The heading survives
  and nothing under it does — the whole circuit-symbol table is gone. Lesson
  18.2 teaches the surrounding prose and reproduces no symbols.
- **Physics 10 H Review Guide, 20.2 "Important symbols".** Same fault: a bare
  heading where the into-the-page / out-of-the-page notation was. The practice
  set states those directions in words, so the notes use the words and show no
  symbols.
- **Physics 10 H Review Guide, 20.5 and 20.6 formulas.** The two headings
  "Magnetic field due to a long straight wire (section 20.5)" and "Magnitude of
  the force: (derived from Ampere's law)" both arrive with the formula object
  stripped, leaving only $\mu_0 = 4\pi\times10^{-7}\ \mathrm{T\cdot m/A}$ and
  the unit of $B$. Both are recoverable from this level's own practice set
  rather than from outside material, and both were checked numerically before
  being written:
  - $B = \mu_0 I/2\pi r$ — the practice MCQ options print it (garbled to
    "μ02πIa", "μ02πI2RR"), and Calculation 2's stated answer of
    $1.4\times10^{-6}\ \mathrm{T}$ follows from it exactly for two antiparallel
    $24.5\ \mathrm{A}$ wires $2.8\ \mathrm{mm}$ apart read at $10.0\ \mathrm{cm}$
    from their midpoint.
  - $F/l = \mu_0 I_1I_2/2\pi d$ — Calculation 3's stated answers,
    $4.4\times10^{-2}\ \mathrm{N/m}$ at $2.8\ \mathrm{mm}$ and
    $2.2\times10^{-2}\ \mathrm{N/m}$ at $5.6\ \mathrm{mm}$ for $25.0\ \mathrm{A}$
    against $24.5\ \mathrm{A}$, follow from it exactly.
  No other formula was supplied; the solenoid field, which the guide treats
  qualitatively throughout, was left qualitative.
- **Physics 10 H Review Guide, 19.1, the second power expression.** After the
  recoverable $P_T = P_R + P_r = I^2R + I^2r = I^2(R+r)$ the guide prints a
  second form which reaches the CSV as "7&'! )". The surrounding symbol map
  gives $V$ for the leading character and $r$ for the denominator, but no
  reading of it is both self-consistent and correct physics, so lesson 19.1
  gives the $I^2(R+r)$ form only. Source owner should supply the original.
- **Physics 10 H Review Guide, 19.2(2).** The two combined-circuit figures
  ("left: Parallel-series, right: Series-parallel") and the circuit for the
  switch example are gone. The switch example's own prose names its components
  — one $2\ \Omega$ resistor and two $4.0\ \Omega$ resistors, the pair in
  parallel and the pair in series with the $2\ \Omega$ when the switch is off —
  so lesson 19.2 works it through symbolically in $V_{\text{total}}$, which is
  as far as the surviving text determines it. The switch-on case is not
  written up: the guide says to consider it but the topology is only in the
  lost figure.
- **Physics 10 H answer key, Calculation 1.** The item number "1." is printed
  and then nothing — no working, no answers for any of parts (a) to (f), and
  the key resumes at Calculation 2. The question itself survives in full and is
  fully determined, so lesson 19.1 works it through ($R_1 = 600\ \Omega$,
  $P_2 = 2.50\times10^{-2}\ \mathrm{W}$, $V_{ab} = 8.00\ \mathrm{V}$,
  $r = 40\ \Omega$). Nothing was checked against a key, because there is none.
- **Physics 10 H practice set, the figures for MCQ 1, 5, 6, 8, 10, 12 and 14.**
  Every one of these items turns on a diagram that did not survive, and in each
  case the surrounding text does not fix it: the arrangement and current
  directions of four wires round point P (1); which bar magnet is cut across
  and which along (5); the orientation of the moving wire and which end goes
  positive (6, 10); the arrangement of three magnets in iron filings (8); where
  the compass sits relative to the coil (12); which way the solenoid is wound
  (14). Their answers are known (C, D, D, D, A, A, D) but the reasoning cannot
  be reconstructed, so none is written up as a worked example. Instead the
  principle each tests is taught in the relevant lesson — pole pairs and the
  non-existence of monopoles in 20.1, the 2nd right-hand rule and the
  S-to-N interior field of a solenoid in 20.2, and the Lorentz-force mechanism
  of charge separation in a moving wire in 20.4. This is the largest loss in
  the set: seven of sixteen multiple-choice items.
- **Physics 10 H practice set, MCQ 1 and MCQ 2 options.** Both items lost the
  formula attached to each option, so they read with duplicate choices —
  MCQ 1 offers "toward the upper left-hand corner" as both A and C, and MCQ 2
  offers "upward" as A and C and "downward" as B and D. The stripped magnitudes
  land as a floating run in the middle of MCQ 3
  ("μ02πIaμ02πIa2μ02πIa μ02πI2RRμ02πI2RRevμ02πI2RRevμ02πI2RR"), which is what
  identifies them as $\mu_0I/2\pi a$ and $\mu_0 evI/2\pi R$ forms. MCQ 2 is
  still written up in lesson 20.4, because its direction is derivable and comes
  out the same on either side of the wire; MCQ 1 is not.

### Garbled source text

- **Physics 10 H Review Guide, ligature substitution throughout chapters 18 and
  19.** `ti` is rendered `=` ("contrac=on", "poten=al", "resis=vity"), `tt` is
  rendered `D` ("baDery", "aDract", "transmiDed"), and `ft` is lost altogether
  ("afer" for after). Every instance is fixed by its context, so the guide was
  read through rather than treated as lost, and no content was dropped for this
  reason. Chapter 20 is clean — it appears to have been typed by a different
  hand. Re-extraction with ligature support would make the first two chapters
  readable as they stand.
- **Physics 10 H Review Guide, 18.1 "Electric Shell Structure".** The heading
  sits directly under "Electric Cells and Batteries" and introduces the parts of
  a cell. Read as *Electric Cell Structure*.
- **Physics 10 H Review Guide, 18.5.** "In easy collision, part of the
  electron's KE is transferred to the atom", inside a list whose previous line
  is "Many collisions occur". Read as *In each collision*.
- **Physics 10 H practice set, minor OCR slips.** "upper left-hand comer"
  (corner) in MCQ 1, "Follow a parabolic are" (arc) in MCQ 3, "opposite d
  irection" in MCQ 9. None changes a claim.

### Factual errors left as written

(The 18.1 Volta date and the 18.7 Edison/Tesla attribution that stood here have
been corrected under the corrected-claims policy — see the section at the end of
this file.)

### Open questions for the house

- **Physics 10 H numbering.** Unlike most Grade 10 review guides this one
  numbers itself throughout — "Chapter 18 – Electric Currents" with 18.1-18.7,
  "Chapter 19 – DC Circuit" with 19.1 and 19.2, and "Chapter 20 – Magnetism"
  with 20.1-20.4 — so BRIEF-G10's rule gives those codes directly and the
  course directory starts at chapter 18. It looks anomalous beside the Grade 10
  courses that run 01, 02, 03…, for the same reason Chemistry 10 S does.
- **Physics 10 H, section 19.2(2).** The guide restates chapter 19 partway
  through and gives combined circuits the code "19.2 (2)", i.e. a second part
  of 19.2 rather than a 19.3. That cannot be a filename, so it is written as
  the closing section of lesson 19.2, under its own heading carrying the guide's
  code. Split it into a lesson 19.3 if the house prefers one file per topic —
  but the code would then be invented, since the guide never prints 19.3.
- **Physics 10 H, sections 20.5, 20.6 and 20.7.** The guide's range line asks
  for 20.1-20.7, but the document has headings for 20.1-20.4 only and teaches
  the other three material inside them, flagging each with a parenthetical
  textbook cross-reference: "Magnetic field due to a long straight wire
  (section 20.5)" and "Magnetic field for coils (section 20.7 solenoids)" sit
  inside 20.2, and "Force between two parallel wires (section 20.6)" inside
  20.3. The notes keep them where the guide teaches them and name the section
  number in the heading, so a student working from the range line can still
  find each one. No 20.5, 20.6 or 20.7 lesson file exists. Create three more
  lessons if the house prefers the printed codes to the guide's own structure.
- **Physics 10 H, the guide's scope lines.** The header gives "Range: Chapter
  18-20. Focus: 19.2(2) Combined circuit + 20.1-20.7 (20.4 partA only)". The
  chapter 18 and 19.1-19.2 material is fully written up even though it is
  outside the stated focus, because the guide teaches it in full; the two scope
  statements themselves are reproduced where they bear on a lesson — combined
  circuits are flagged as a focus in 19.2, and 20.4 opens by saying Part A only
  is covered. The header's disclaimer that review guides are unofficial and do
  not hint at exam questions is not reproduced, being about the document rather
  than the physics.

## AP Economics (Class of 7 PA S2 finals guides)

Three documents: `AP Review Guide.pdf`, `AP Review Practice.pdf`,
`AP Review Practice Answers.pdf`. The guide's range line reads "AP
Microeconomics". This is the course whose material had leaked into Economics 10
(see "Cross-course contamination in pre-rule drafts" above); the fourteen
lessons now in `content/notes/ap-economics/` are written from these three
documents only.

### Errors corrected in the notes (guide contradicts itself)

- **AP Review Guide, Module 53, marginal utility.** The guide prints
  "Marginal utility of one unit / Price of one unit of the good = marginal
  utility per unit" and then, on the next line, "MUgood /Pgood = Total
  Utility". The second contradicts the first. Lesson 7.1 gives the ratio as
  marginal utility per unit, with one sentence noting the second printing,
  because practice MCQ 21 keys consumer equilibrium as MUx/Px = MUy/Py — the
  ratio, not a total.
- **AP Review Guide, Ch4, the first demand shifter.** The list is headed
  "Demand Curve shifters" and every other item on it moves demand (income
  "increase Demand", substitutes "increase in demand for the other"), but the
  first reads "Increase in # of buyers ➔ increases Qd". Written as an increase
  in demand in lesson 2.1.

### Extraction losses (diagrams, tables and symbols that did not survive)

- **Every diagram in a diagram-heavy course.** Nothing graphical survived in
  either document. The affected slots are the production possibility curve, the
  total product curve, the U-shaped ATC curve, the monopoly demand curve, the
  side-by-side market/firm graphs FRQ 1(a)-(b) asks the student to draw, the
  MSB/MPB/MSC/MPC graph FRQ 1(c) asks for, the figure practice MCQ 30 depends
  on ("The demand curve of a price-setting firm is shown below"), the payoff
  matrix MCQ 20 depends on, and the cost table MCQ 6 depends on. The lessons
  teach what the surrounding text and the question stems state and invent no
  axes, curves or values; MCQ 6 and MCQ 30 are flagged in the notes as only
  partly reconstructable.
- **Delta symbols stripped from the cost and product formulas.** Marginal
  product survives as "Marginal product = Q output/ Q input (labor) ∆∆ oMPL =
  Q / L", with the deltas dumped after the line, and marginal cost as "Marginal
  Cost= total cost/ Q output" with none at all. Lesson 8.1 writes them as
  ΔQ/ΔL and ΔTC/ΔQ, which is what the stranded delta pairs and the guide's own
  definitions require. Two further stray "∆∆ ∆∆" sit between the TR/TC
  profitability bullets in Modules 56-58.
- **Superscript stripped in practice MCQ 16.** The monopolist's total cost is
  printed "TC = 2Q2". Read as 2Q², which is the only reading that reproduces
  the answer key's 2%: MR = 120 − 2Q against MC = 4Q gives Q = 20 and P = 100,
  and against MC = 4Q + 12 gives Q = 18 and P = 102.
- **Two tables interleaved with the heading that follows them.** The
  micro/macro and positive/normative comparison cells were emitted inside the
  "Ch4 Demand and Supply:" heading, several lines after the headings they
  belong to. Both are recovered in lesson 1.1; the cells split unambiguously.
- **A stray "∑Marginal Utility" fragment** sits mid-sentence in the firm's
  optimal output rule ("producing the quantity of output ∑Marginal Utility at
  which the marginal cost…"), evidently a label lifted from a dropped figure.
  Omitted.
- **The midpoint method is named but never given.** Ch5 says PED is calculated
  by the midpoint method and prints no formula, so lesson 3.1 names it without
  arithmetic rather than importing a formula from outside.
- **The answers document is a bare key.** Thirty letters, no working, and for
  the free-response question and the case study only "Answer May Vary". Every
  worked solution in the notes is reconstructed from the stem plus the keyed
  letter.

### Garbled source text

- **Ligature substitutions throughout all three PDFs.** "ti" arrives as E in
  the guide's body ("QuesEons", "ScienEﬁc", "quanEty"), as 9 in its bold
  headings ("Posi9ve", "Elas9city", "Perfect compe99on") and as % in the
  practice set ("compe%%ve", "nega%ve"); "tt" arrives as i in the guide
  ("Beier", "ﬂaier" for better, flatter) and as g or Y in the practice set
  ("ligle", "lager", "SeYng"); "ft" as o ("leo" for left, "ofen" for often);
  "tf" as b ("plaborms"). Read through everywhere.
- **"Capital, land labor, interpreter"** — the PPC resource list. The fourth
  item is not recoverable, so lesson 7.1 gives capital, land and labour and
  stops there rather than guessing at entrepreneurship.
- **Opportunity cost "(inhibit+ exhibit)"** in Ch1. Read as implicit and
  explicit, which is what the same guide states in Module 52: explicit and
  implicit costs "add together equals to the total opportunity cost".
- **"how Q of output depends on G of a variable input"** — the total product
  curve. G read as quantity, per the marginal product formula two lines later.
- **Practice MCQ 8 lost the option letters for b, c and e.** The surviving
  order still matches the key (C = pollution from a factory), so the question
  is usable.
- **Practice MCQ 12 stem**: "Two straight-line demand curves intersect each
  other at the point of intersection." Taught as two curves that intersect.
- **"Neblix Premium"** (MCQ 8 distractor) and **"rebugal"** (case study, read
  as rebuttal).

### Factual errors left as written

All four entries formerly listed here (Ch1 principle 1; Ch1 positive versus
normative; Module 53 marginal utility; Module 52 accounting profit) have been
corrected in the notes and moved to "Errors corrected under the
corrected-claims policy" at the end of this file.

### Open questions for the house

- **AP Economics numbering.** The guide numbers its units in two incompatible
  series: chapters Ch1, Ch4, Ch5, Ch6, Ch7 from one textbook, then Modules 52,
  53, 54-55, 56-58 and 60-62 from another, then an unnumbered labour-market
  section, then a case study in the practice set. Taking the printed numbers as
  lesson codes would produce a course that runs 1, 4, 5, 6, 7, 52, 53, 54, 56,
  60 with two units left unnumbered. Lessons are therefore numbered
  sequentially in the guide's own teaching order (1 principles, 2 demand and
  supply, 3 elasticity, 4 price controls and market failure, 5 welfare, 6 costs
  and profit, 7 PPC and marginal utility, 8 production and costs, 9 revenue and
  market structures, 10 industry supply and monopoly, 11 labour market, 12 case
  study), which is the choice already made for Economics 10 H. Renumber to the
  printed chapter and module numbers if the house prefers them.
- **About a third of the examinable material has no syllabus text behind it.**
  The practice set tests, and the Review Guide never mentions: externalities
  and the policies that correct them, public goods and the MSC = MSB condition,
  the MPB/MSB/MPC/MSC apparatus, command versus capitalist economies, average
  product, average variable cost, monopolistic competition's long-run zero
  profit and the role of advertising, the kinked demand curve, why collusion
  fails, Nash equilibrium, Bertrand and Cournot oligopoly, allocative
  efficiency, derived demand, constant-cost industries, and the substitution
  effect in labour supply. Per BRIEF-G10 these are taught in the lesson each
  belongs to topically, so lesson 4.2 in particular rests entirely on question
  stems and a bare answer key. The guide should carry these topics.
- **The range line says AP Microeconomics, but the practice set ends in
  international trade.** The case study is the 2018 US steel, aluminium and
  automobile tariff dispute, with questions on the short- and long-run effects
  of protectionism and on tariff impacts in China and the EU. It is taught as
  lesson 12.1 because it is this course's material, but it does not sit inside
  the stated range. Related: the AP Economics document list contains no
  macroeconomics guide at all, so if the course examines macro, that resource
  is missing from the corpus.

## Chinese 10: the flat 雷雨 draft is archived

`content/notes/hs-chinese-10/01-1-thunderstorm.md` was written before this
course was level-scoped, so it showed at every level. Both level agents assessed
it independently against their own sources:

- The S agent found most of it supported (author, year, genre, 天津, 周鲁两家,
  三十年, the character table, 四凤's lack of blood tie, 繁漪 as 周萍's 继母,
  鲁大海 as 工人代表, the electrocutions, 除夕跳河) and that material is now in
  the ten S lessons. Four claims appear in NO S document: 周冲 as 繁漪's son;
  鲁贵 as a servant of the 周 household; 繁漪 as 全剧最具反抗性的人物 with a
  雷雨 character; and the play compressing thirty years into a single day.
- The H agent found its only source contains no 雷雨, no 曹禺 and no drama, so
  none of the draft is verifiable at H.

Archived to `build/superseded/hs-chinese-10/`. The four unsupported claims are
the reason it is not simply folded in.

## History 10 S+ (Grade 10 finals guides)

Source: `CLASS OF 7 PA S2 FINALS GUIDES/History/S+ Review Guide.pdf`, one
document, range "Causes of WWII - Cold War". Written as 9 lessons numbered
sequentially in the guide's own teaching order, since it prints no section codes.

### Errors corrected (guide contradicts itself)

- **The Elbe link-up is dated "April 25th 1944".** The guide's own sequence puts
  it after the December 1944 Battle of the Bulge and after the USSR reaching
  Poland and taking Berlin in 1945, and immediately before V-E Day in May 1945.
  Written as 1945, with one sentence in lesson 7 saying the guide prints 1944.

### Read through (garbled, sense recoverable)

- **The Nazi definition of who was Jewish** is printed as "Nazis defined them as
  people identified as Christians or anyone who didn't practice Judaism", which
  as written says the Nazis defined Jews as Christians. Its sense is that the
  racial definition *reached* people who were Christian or non-practising —
  which is why conversion offered no protection. Written that way, with a note
  in lesson 8 flagging the source's wording. This one matters: a student
  reproducing the guide's sentence in an exam would be stating the opposite of
  Nazi racial policy.
- "3 atomic bombs **denoted** by the US" — detonated.
- "**Postdam** excerpt" appears as the label on the first Yalta outcome, inside
  the Yalta section. Both conferences are named elsewhere in the guide, so the
  lesson keeps the outcome under Yalta and notes the label.

### Factual errors left as written

Both entries formerly listed here (the two end dates for the European theatre;
*Mein Kampf* dated to 1923) have been corrected in the notes and moved to
"Errors corrected under the corrected-claims policy" at the end of this file.

### Dropped rather than reproduced

- **"1932, President FDR insisted on participating in WW2."** Impossible on the
  guide's own timeline, which then runs November 1939, March 1941, August 1941.
  Originally handled by dropping the year. Now corrected under the
  corrected-claims policy — see that section at the end of this file.
- **Operation Market Garden's Allied losses, printed as "12,00".** The digits are
  damaged and no reading is recoverable from the guide, so the figure is omitted;
  the 250 aircraft shot down is kept.

### Note on the corpus-wide fabrication check

This guide was read after the Grade 9 History insertion (Rommel commanding Roman
armies in 638 AD) was found. Its WWII vocabulary — Blitzkrieg, Luftwaffe,
panzers, Rommel's absence — is all legitimate course content for this range.
Nothing anachronistic was found.

## Visual Arts (Grade 10 finals guide)

Source: `CLASS OF 7 PA S2 FINALS GUIDES/Visual Arts/Review Guide.pdf`, one
document. Written as 6 lessons carrying the guide's own unit numbers (1, 2, 3, 4,
5, 7).

### Ligature corruption throughout — the worst in the corpus

The whole document is systematically substituted, and every instance is
unambiguous, so nothing was dropped for it. The mapping:

| Printed | Reads as | Example |
|---|---|---|
| `T` | st | `Troke` = stroke, `arCT` = artist |
| `M` | ct | `objeM` = object, `faMors` = factors |
| `C` | ti | `composiCon` = composition |
| `c` | ch | `touc` = touch, `Frenc` = French |
| `f` | ck | `Blaf` = black, `baf` = back |
| `j` | tt | `pajern` = pattern, `bujress` = buttress |
| `k` | ft | `Oken` = often |
| `5`, `3`, `Q`, `0` | ti / ch | `Ma5sse` = Matisse, `Mono0roma3c` = monochromatic, `RomanQcism` = Romanticism |

Re-extraction with ligature support would make this document readable as it
stands; nothing else is wrong with it.

### Missing unit

**Unit 6 does not exist in the source.** The guide runs Unit 5 (vocabulary)
straight into Unit 7 (Neoclassicism onwards). The lessons keep the guide's own
numbering, so there is no 6 — a real gap, not a numbering choice.

### Garbled beyond recovery, omitted

- The shape bullets in Unit 3 read `so aﬀeM composiCon o contribute to the
  balance` — one bullet has lost its leading text. The recoverable claims (shapes
  affect composition; shapes contribute to balance) are kept as prose.
- Unit 4's foreshortening definition reads `them an objeM of ﬁgure is viewed`,
  read as "when an object or figure is viewed".

### Read through

- `sliver` for silver in the Illumination definition, and `Atmosphereic` for
  Atmospheric — ordinary typos, not ligature substitutions.
- `seem sheavier` in the Balance definition, read as "seems heavier".
- `at it puriT form`, read as "at its purest form".

### No image dependency

Unusually for an art guide, this one is vocabulary-based and reproduces no
plates, so no lesson depends on an image that failed to extract. The three
artists named in Unit 1 (Degas, Warhol, Matisse) come with descriptions rather
than works.

## AP English Language (Grade 10 finals guide)

Source: `CLASS OF 7 PA S2 FINALS GUIDES/English/AP Review Guide.pdf`, one
document. Range: *The Things They Carried* by Tim O'Brien, plus literary devices.
Written as 4 lessons on the guide's own sections I-IV.

### PART OF THIS GUIDE IS AI-GENERATED, AND SAYS SO

The guide carries its own disclaimer: **"Part IV was generated by ChatGPT"**, and
repeats it at the foot of that section as "(this section was generated by an AI
chatbot)". Part IV is the literary-analysis advice — a fifth of the document.

It is reproduced in lesson 4 because it is genuinely part of what students revise
from, and because the authors were straightforward about its provenance. The
lesson opens by restating that attribution rather than presenting the advice as
the writer's own.

Worth a decision from the house: whether AI-generated sections should be carried
into notes at all, and if so whether the attribution should be more prominent
than a note. The advice itself is unobjectionable, but it is the one section of
the corpus whose authority rests on nothing but a chatbot.

### Read through

- `the readers know than the characters` in the dramatic-irony definition, read as
  "know **more** than the characters" — the definition is unusable without it.
- Corrupted Wingdings smileys appear as a stray `J` twice ("i want to be excellent
  J", "Good Luck Everyone! J"). Omitted as document decoration.

### Nothing left out

Every theme, example, purpose and term in the guide is covered. The nine themes of
section I are written as one lesson because the guide presents them as a single
chart, with a heading per theme so they remain navigable.

## AP Precalculus (Grade 10 finals guide)

Source: `CLASS OF 7 PA S2 FINALS GUIDES/Math/AP Precalculus Review Guide.pdf`, one
document. Range given as "Chapter 1-5, 7-11, 13".

### The guide is mostly a checklist, not a review

Of the 33 sections it lists, it develops **six**: 3.4 (linear programming), 7.5
(inverse trig functions, and only barely), 8.2 (sine and cosine curves), 8.3
(modelling periodic behaviour), 10.4 (solving trigonometric equations and
inequalities) and 11.1 (polar coordinates). For the other 27 it prints the section
number and title and nothing else.

This is the largest scope-versus-content gap in the corpus. **Not one formula is
printed anywhere in the document** — the laws of sines and cosines, the
compound-angle and double-angle formulas, the binomial theorem, and every sequence
and series sum formula are named as examinable and never stated.

Nothing was supplied for them. Writing the law of cosines into an AP Precalculus
lesson would mean importing a formula the course's own guide never gives, which is
exactly what the sourcing rule forbids — but it does mean a student revising only
from these notes has the syllabus and none of the formulas.

### Numbering

The six developed sections keep the guide's own codes. The checklist of
heading-only sections is written as lesson **0**, following the precedent set in
Math 9 S where an unnumbered pre-chapter unit was filed at 0.1. It sits first so
the scope is visible before the content lessons.

### Read through

- `4.9 The binominal theorem` — binomial.
- `1 3 . 7 Mathematica induction` — mathematical induction; the spacing damage in
  "9 . 2 The a r e a o f a triangle" and "1 3 . 7" is character-level and harmless.
- `When θis negative` — missing space.

### Lesson 7.5 is deliberately short and has no Keywords table

The guide gives three pairings (each function and its inverse) and develops none of
them: no domains, ranges, graphs or principal values. The lesson says so and points
at 10.4, which is the only place the guide says anything substantive about the
inverse functions. It defines no term, so per the brief it carries no Keywords
section.

## AP Chemistry — audit of the pre-rule draft

Source: `G11 Advanced Placement(AP)/AP-Chemistry-Formula-Guide(2025).pdf`, one
document, ~4,000 words.

### The draft was accurate but covered a twelfth of the guide

`01-1-constants-and-exam-strategy.md` contained the constants table, standard
conditions, conversion factors, units, study strategies and the problem-solving
procedure. **All of it is genuinely in the source** — unlike the Chemistry 10 and
Economics 10 drafts, nothing was invented here.

The problem was scope. Those items are the guide's **last two sections**. The draft
covered none of the other ten: atomic structure, molecular and ionic compound
structure, intermolecular forces, chemical reactions and stoichiometry, kinetics,
thermodynamics, equilibrium, acids and bases, electrochemistry, and laboratory work
and measurement. A student revising from it would have had the constants and the
self-care advice, and not one line of chemistry.

Rewritten as **11 lessons** covering every section. The draft's own material is now
lesson 11, at the end where the guide puts it. The old file is in the session
scratchpad as `ap-chemistry-01-1.superseded.md`.

### This document is not an IDX student guide

It carries the line "Preview Sustained by the StandardCAS# Group" and reads as a
third-party or commercially produced formula guide, not a student-written review
guide like the rest of the corpus. Its content checks out, but its provenance is
different and the house may want to know that.

### Read through

Subscripts and superscripts are substituted throughout by the extractor:
`C¨H¡¨` for octane, `CH¤` for methane, `CH£COCH£` for acetone, `H z` for
$\mathrm{H^+}$, `OH {` for $\mathrm{OH^-}$, `1 × 10 {¹t` for $1\times10^{-14}$,
`10v` for $10^6$, `10x` for $10^8$, `£` for the summation sign, `³` for a reaction
arrow, `í` for the equilibrium arrow, and `j` for "approximately". Every instance
is unambiguous from context and none was dropped.

### Extraction losses

- The **ICE table procedure** breaks off after "Set up a table with initial
  concentrations 1." — the remaining steps are lost. Lesson 7 states what an ICE
  table is and its first step, and no more.
- The **titration procedure** similarly breaks off after "Placing a measured volume
  of the analyte solution in a flask 1." Lesson 10 gives that step and then the
  endpoint/equivalence-point distinction, which survives intact.
- **Enthalpy symbols lost their deltas** throughout the thermodynamics section
  (`H = £ Hproducts - £ Hreactants`, `q = mcT`, `G = H - TS`). Restored as
  $\Delta H$, $\Delta T$ and $\Delta G$, which the surrounding text requires —
  the guide describes them as *changes* in every case.

## AP World History — audit of the pre-rule draft

Source: `CLASS OF 7 PA S2 FINALS GUIDES/History/AP Review Guide.pdf`, one document,
~3,550 words covering Units 8 and 9.

### The draft compressed sixteen sections into one lesson

`09-1-decolonization-and-globalization.md` was **accurate where it went** — its
capitalism/communism table, Non-Aligned Movement material and post-war aftermath
all trace to the source. Nothing was invented, unlike the Chemistry 10 and
Economics 10 drafts.

The failure was scope and numbering. It was a single lesson coded 9.1 covering
material from across the whole guide, while the guide itself is organised as
**8.1-8.7 and 9.1-9.9**. Rewritten as **16 lessons on the guide's own section
codes**. The old file is in the session scratchpad as
`ap-world-history-09-1.superseded.md`.

### Corrected (guide contradicts itself)

- **The Korean DMZ is placed at the "28th parallel".** The guide describes it as
  near *the original* dividing line, which it elsewhere gives as the line dividing
  the Koreas — the 38th parallel. Written as the 38th, with a note in lesson 8.3
  recording the guide's figure.

### Ligature corruption in Unit 8 only

Unit 8 is systematically substituted: `?` = ti (`crea?on` = creation, `na?ons` =
nations), `[` = ft (`a[er` = after, `shi[s` = shifts), `,` = tt (`Se,ng` =
setting), `;` = ti (`Decoloniza;on`), `s` = tt in places (`boycos` = boycotts,
`asack` = attack, `Biser` = bitter, `plosed` = plotted, `presy` = pretty). All
unambiguous; nothing dropped.

**Unit 9 carries none of this corruption** and is uniformly structured as
Key Ideas / Developments / Impact bullet lists, unlike the discursive note-form of
Unit 8. The two halves of this document have different origins. Worth knowing given
the AP English guide in the same folder discloses that one of its sections was
AI-generated — this one makes no such disclosure, and nothing here asserts one.

### Left as written

- **Jawaharlal Nehru appears as "jawaharlal •"** in 8.2, the surname lost to a
  stray bullet. Written as Nehru, whom the same passage identifies as first prime
  minister of independent India.
- The guide's asides — "Dundundun cold war beings", "they s?ll looking across at
  each other", "oSo presy important guy I suppose", "Cia…?" — are authorial
  commentary, not content. The substantive point behind the Nasser aside (that he
  appears in four separate sections) is kept in lesson 8.6 as a revision cue.

## AP Physics 1 — audit of the pre-rule draft

Source: `G11 Advanced Placement(AP)/AP-Physics-1-Formula-Guide.pdf`, one document,
~2,000 words. Same publisher as the AP Chemistry guide — it carries the same
"Preview Sustained by the StandardCAS# Group" line and the same structure, so
neither is an IDX student guide.

### The drafts had the right shape and unsourced content inside it

The 7 draft lessons matched the guide's 7 topics exactly, and every formula in them
is in the guide. But each had been padded with standard physics teaching the guide
never contains. From `01-1-kinematics.md` alone:

- **The equation-selection heuristic** — "each equation is missing exactly one of
  the five quantities; identify the one you neither know nor need". Sound advice,
  entirely absent from the source.
- **The value $g \approx 9.8$ m/s²** — the guide names $g$ as "gravitational
  acceleration" in $F_g = mg$ and never gives its value anywhere.
- **The whole projectile-motion method** — decomposing into independent horizontal
  and vertical components, $a_x = 0$, $x = v_{0x}t$, and time as the shared
  variable. The guide mentions projectile motion once, in a list of applications.
- **The dropped-ball claim** — that a ball dropped and a ball fired horizontally
  from the same height land at the same moment.

All removed. Kinematics went from 334 words to the four equations the guide
actually prints, plus its own statement of where they apply.

This is the fourth pre-rule draft audited and the third to contain invented
material. The distinctive feature here is that the additions were **correct
physics** — which is exactly what makes them hard to spot and why the audit had to
be done against the source rather than by reading the notes.

The originals are in the session scratchpad under `ap-physics-1-superseded/`.

### Renumbered

Codes 1.1 through 7.1 became 1 through 7. The guide numbers nothing; its seven
topics are chapters, not sections, and there is no second section under any of them.

### Read through

Extractor substitutions: `»` for $\theta$, `Ç` for $\tau$, `³` for $\alpha$,
`Ë` for $\omega$, `Ã` for $\rho$, `¡`/`¢` for subscripts 1 and 2. All
unambiguous from context.

`Pressure at a Depth: P = P + Ãgh` has lost the subscript on the first term;
written as $P_0$, which the guide's own gloss ("where P is typically atmospheric
pressure") requires.

`Impulse: J = Ft = p` and `Work-Energy Theorem: Wnet = KE` both lost their deltas;
restored as $\Delta p$ and $\Delta KE$, which the surrounding text requires — the
guide describes both as *changes*.

## Music (Grade 10 finals guides, unlevelled)

Sources: `Reivew Guide.pdf`, `Practice Set.pdf`, `Practice Set Answers.pdf`
(the review guide's filename is misspelled in the corpus).

### Audit of the pre-rule drafts

The three drafts at `content/notes/hs-music/` (`01-1-historical-periods`,
`01-2-romantic-and-modern`, `02-1-instruments-and-orchestra`) were checked line by
line against the three sources. Both failure modes the audit brief describes were
present: invented explanatory material, and large omissions.

**Invented — removed.** None of the following appears in any of the three
documents:

- **A description of Cage's *4′33″***: "a performer sits silently for four minutes
  and thirty-three seconds, and whatever the audience hears — coughing, traffic,
  the building — becomes the piece". The guide prints only `John Cage (4'33"):
  music professor, what is music?`. This is exactly the invented-description-of-a-
  recording failure the brief warns about for music sources.
- **A definition of *ritornello***: "a recurring passage that returns between
  episodes". The practice set lists ritornello as a Baroque form; nothing in the
  three documents defines it.
- **A cause for terraced dynamics**: that the harpsichord "cannot play louder by
  being struck harder, so contrast had to be achieved by switching between
  registers".
- **A mechanism for the whole-tone scale**: "with no semitones, it has no leading
  note and therefore no pull toward a home key".
- **A mechanism for the twelve-tone system**: that it "gives all twelve pitches
  equal weight so that no note can function as a tonic".
- **A principle of instrument classification**: "families are defined by how the
  sound is produced, not by what the instrument is made of — which is why a flute
  is a woodwind even when made of metal, and a saxophone is a woodwind even though
  it is brass". Saxophones appear in these sources only in the transposing list.
- **A rationale for orchestral seating**: that it solves a loudness-balance
  problem, "so the loudest instruments sit furthest from the audience".
- **A reason the piano superseded the harpsichord** (touch-controlled volume), and
  the claim that "the disappearance of the harpsichord marks the end of basso
  continuo and therefore of the Baroque texture".
- **Brahms** as "the Romantic who deliberately kept Classical forms"; chant's lack
  of a steady beat explained by Latin prose determining the pace; the printing
  press tied to textual clarity as cause and effect.

**Omitted — added.** Part III (Transposing) had no lesson at all. The modern-era
"isms" had been compressed into a five-row single-trait table, losing Monet's
*Impression: Sunrise*, extended chords and floating rhythms, colour and texture
over clear form, Ravel, *Clair de Lune*, ostinato, savage rhythms, harsh
dissonance, simple motives, *The Rite of Spring* as Primitivism's key work,
Sprechstimme, Schoenberg/Berg/Webern, serialism and tone rows, steady pulse and
Philip Glass. Also missing: the Modern-era context line, the Romantic listening
focus, the orchestra's three worked examples (Haydn 31, *Ride of the Valkyries*,
*The Rite of Spring*), Weelkes, the per-period "key features" rows from the
practice answers, the degrees of the scale, and every instrument-family answer
from the practice set. No draft had a `## Keywords` section.

**Dropped source claims — restored.** Against the "never drop a claim you cannot
verify" rule, the drafts had quietly deleted Mozart's "nine symphonies", Wagner's
"Hungarian", the trombone's Italian gloss "(trombe)", Liszt's "womaniser",
Tchaikovsky's "gay", and "drums" from the Baroque rhythmic drive. All are back;
the ones that are wrong are logged below rather than fixed.

**No cross-course contamination.** Everything else in the drafts traces to the
Music sources. In particular "Realistic, linear perspective in art" reads like
Visual Arts material but is genuinely printed in the Music practice answers as a
Renaissance key feature.

Originals are in the session scratchpad under `music-superseded/`.

### Renumbered

Codes `1.1`, `1.2` and `2.1` became `1`, `2` and `3`. The review guide numbers its
own units — Part I, Part II, Part III — so the lessons now follow those, one
lesson per Part.

### Errors corrected in the notes (guide contradicts itself)

- **Polytonality assigned to the wrong movement.** The practice answers mark
  "Often makes use of polytonality" as **expressionism**. The review guide lists
  Polytonality among the traits of **primitivism**, defines it there, and gives
  expressionism atonality, extreme dissonance and Sprechstimme instead. The notes
  follow the review guide and carry one sentence telling the student the answer key
  disagrees.

- **Degrees of the scale: "subdominant" printed twice.** The answer key gives
  `Tonic supertonic mediant subdominant dominant subdominant Leading tone` for a
  seven-degree sequence. The fourth degree is named subdominant in the same list,
  so the sixth is wrong — but no document in this course supplies the missing name,
  so it could not be corrected from within the guide. The notes print the sequence
  with the sixth degree marked as unsupplied and one sentence explaining why.

### Factual errors left as written

Three entries formerly listed here (Wagner's nationality; Mozart's nine
symphonies; the trombone's Italian gloss) have been corrected in the notes and
moved to "Errors corrected under the corrected-claims policy" at the end of this
file.

- **Silent spelling normalisations.** `Faggotti` written as *fagotti*,
  `countrabassoon` as contrabassoon, `unision` as unison, `simulatenously` as
  simultaneously. Plain typos rather than content claims.

### Extraction losses (tables, notation and listening material)

- **The practice set's five-column period table is scrambled.** Extraction runs the
  header row together and then emits each row's cells as one unbroken string
  (`~500~1400~1600~1750~1820`, `MonophonicPolyphonicMostly polyphonic
  HomophonicHomophonic (mostly)`), and in the unanswered practice set the numbered
  prompts ("4.Name two", "11.Name one") float free of the column they belong to.
  Row-to-column association was reconstructed by matching the answer key against
  the review guide, which agrees with it throughout.

- **Practice question 35 lost its prompt.** It prints as four bare blanks. The
  answer key's corresponding line is the four instrument families, which is also
  the answer to question 33. Treated as a duplicate.

- **Letter-spaced text in the answer key.** `S a c r e d songs in L a t i n ,
  official music of R o m a n Catholic Church` — read as ordinary words.

- **No notation and no audio survive**, as expected from PDF-to-text. Two places
  where the guide depends on them are flagged in the lessons rather than filled in:
  Part III sets out a transposition procedure applied to "the piece" without
  supplying a piece or a worked example, and the orchestra section names three
  listening examples (Haydn's Symphony No. 31, Wagner's *Ride of the Valkyries*,
  Stravinsky's *The Rite of Spring*) as bare titles with nothing to listen for.
  Every per-period "Listening Focus" is described in words and did survive.

### Garbled source text

All three PDFs lose the **`ti` ligature only**, and replace it with a different
character in different places:

| Arrives as | Reads | Examples |
|---|---|---|
| `G` | ti | `quesGons`, `RomanGc` |
| `C` | ti | `PrimiCvism`, `SeaCng`, `EvoluCon` |
| `;` | ti | `pain;ng`, `basso con;nuo`, `Fantas;que` |
| `>` | ti | `absolu>sm`, `Inspira>on`, `Roman>c` |
| `*` | ti | `Prac*ce` (practice set and answers headers) |

This is **not** the Visual Arts pattern (`objeM` = object, `arCT` = artist). Only
the one ligature is affected, `fl` survives intact (`ﬂute`), and every instance is
unambiguous from context, so the documents were readable as they stand and no
content was dropped. Re-extraction with ligature support would still be worth
doing.

One ambiguity: `Brahms: Conservative, german, friends ;) with Clara Schumann`.
Under the mapping above `;` is `ti`, which gives nonsense here, so this was read as
a literal winking emoticon and dropped from the notes as tone rather than content.

### Open questions for the house

- **Four families or six?** The practice set answers "what are the four instrument
  families?" with string, woodwind, brass and percussion, while the same exercise
  sorts instruments into six labels (those four plus keyboard and electronic) and
  the review guide lists all six groups together. The notes teach both readings
  explicitly because the exam could ask either. Worth a ruling.

- **Ritornello is never defined.** It is listed as a Baroque form in the practice
  set and its answers and appears nowhere in the review guide. Written into the
  notes as an undefined name on the list.

- **The guide's asides were dropped.** The review guide carries in-jokes and
  remarks about named classmates and staff — "Check the Music chat you lazy bum",
  "(Except this one because it's partly taken from the Music chat WuJianJing sent,
  so if it's not tested, it's his fault)", "Yinte likes this a lot", "bro is an
  SHSID student". Not course content; removed.

- **Tone of the composer biographies.** Tchaikovsky "gay", Liszt "handsome
  womaniser", Wagner "Jew-hater", Chopin "weak", Mendelssohn and Schubert as Bach
  and Beethoven "glazers" are all the guide's own characterisations. Kept as
  content (rewritten into house register) rather than dropped, but the house may
  want to review whether they belong in published notes.

- **`Zu 2` is filed as a Classical form.** It is a performance direction, not a
  form or genre, but the review guide lists it under Classical "Key Forms/Genres".
  Left where the guide puts it.

## Biology 10 (Class of 7 PA S2 finals guides) — audit of the pre-rule draft

Sources: `CLASS OF 7 PA S2 FINALS GUIDES/Biology/Review Guide.pdf`, `... /Review
Practice.pdf`, `... /Review Practice Answers.pdf`. The course is unstreamed, so the
notes sit directly in `content/notes/hs-biology-10/` with no level folder.

### The draft was accurate but covered less than half the guide

The four pre-rule lessons contained almost nothing invented — the failure mode here
was coverage, not fabrication. The guide's stated range is **12.1–12.3 and
13.1–13.4**, seven numbered sections. The draft had four lessons and left three
sections out entirely:

- **12.3 DNA Replication** — only fragments of it survived, folded into the DNA
  structure lesson. Missing outright: the semi-conservative conclusion stated as
  such, the replication fork, the definition of an enzyme, the telomere's own
  bullets (ends of DNA are hard to replicate; telomerase often switched off in
  adults and reactivated in cancer cells), and the guide's whole
  prokaryotic/eukaryotic DNA comparison — histones, nucleosomes, chromatin,
  supercoiled chromatin, the 1000-fold difference in base pairs. The draft had only
  the two-line version from the practice answer key.
- **13.3 Mutations** — absent. Mutagens, the gene/chromosomal split, the three point
  mutations and why substitution is milder than insertion or deletion, all four
  structural chromosomal mutations, aneuploidy and Down syndrome, polyploidy, and
  the neutral/beneficial/harmful effects with their six named conditions. A short
  mutation table had been parked in the protein synthesis lesson instead.
- **13.4 Gene Regulation and Expression** — absent. Prokaryotic DNA binding
  proteins, operons, the lac operon, operon structure, RNA interference and the Fire
  and Mello 1998 experiment, differentiation. Only the homeotic/homeobox/Hox
  material had been kept, again inside the protein synthesis lesson.

Also missing from the sections the draft did cover: the three types of RNA (mRNA,
tRNA, rRNA), RNA's own three structural components, the three numbered steps of
transcription, the terminator, the role of rRNA, and the central dogma with the
"genes contain instructions for making proteins" material under it.

Rewritten as seven lessons, 12.1 through 13.4.

### Renumbered to the guide's own codes

The draft used `1.1`, `2.1`, `3.1`, `4.1`. The guide prints real section codes and a
range in its header; the notes now carry them. Chargaff's rule and Franklin's Photo
51 were also moved from the draft's lesson 1 to 12.2, where the guide puts them.

### Unsourced material removed

- **"Sulfur occurs in protein but not DNA, and phosphorus in DNA but not protein"**
  (Hershey–Chase). True, and the reason the labels work — but the guide states only
  that ³⁵S marks protein and ³²P marks DNA, and gives no chemistry behind it.
- **"That the same genes lay out the body plan across such distant animals is the
  strongest evidence in this unit for common ancestry"** (Hox genes). Editorial
  ranking the guide does not make; the guide says only "identical clusters in fruit
  flies, mice, humans".
- **The definition of a silent mutation** ("the base changes but the amino acid does
  not"). "Silent mutation" appears in the sources exactly once, as a wrong-answer
  option in MCQ 10, and is nowhere defined. The distractor is now handled by
  explaining why the answer is missense instead.

### Errors corrected in the notes (source contradicts itself)

- **RNA vs DNA comparison table, location row.** The table's last row reads
  `In | Nucleus | Nucleus, cytoplasm` under the column order RNA, DNA — i.e. RNA in
  the nucleus and DNA in nucleus and cytoplasm, which is the wrong way round for the
  eukaryotic comparison the table is making. The same guide states that transcription
  happens in the nucleus and protein synthesis in the cytoplasm, that mRNA "is
  transcribed in nucleus and enters cytoplasm", that translation is carried out by
  the ribosome in the cytoplasm, and that eukaryotic DNA is "located in cell
  nucleus". Written the corrected way round in 13.1, with the one permitted sentence
  telling a student holding the guide which way to read it.
- **"Messenger RNA (mRNA) -> carry instructions from RNA to other parts of cell."**
  Should be *from DNA*: the same guide defines RNA as containing "decoded genetic
  instruction from DNA", has transcription copy DNA into RNA, and states the central
  dogma as DNA to RNA to protein. Written as "from DNA" in 13.1.
- **Transcription step 2: "RNA polymerase builds RNA by base pairing rRNA
  nucleotides to one strand of DNA."** Should be *RNA nucleotides* — rRNA is one of
  the three specific RNA types the same guide has just defined as the structural RNA
  of ribosomes, and the guide's own summary of RNA polymerase two lines later says it
  "links RNA nucleotides together". Written as "RNA nucleotides" in 13.1.
- **Translation step 4: "Ribosome releases stop codon (UAA/UGA/UAG)"**, immediately
  followed by "Releases newly formed polypeptide and mRNA". The stop codon is the
  trigger, not something released; written as the ribosome coming to a stop codon in
  13.2.
- **The telomerase bullet filed under "Telomere".** "Often switched off in adults,
  may be activated again in cancer cell" sits in the bullet list for *telomere*,
  which is a structure and cannot be switched off. It describes telomerase, as the
  practice answer key confirms ("Somatic cells: Telomerase inactive… Cancer cells:
  Telomerase highly active"). Placed under telomerase in 12.3.
- **Practice answer key, FRQ 2(b) — a worked answer that does not match its own
  question.** Part (a) transcribes DNA template 3′-TAC GTA CTT GCA-5′ to mRNA
  5′-AUG CAU GAA CGU-3′, correctly. Part (b) mutates the template to
  3′-TAC GTA CTT CCA-5′ and the key answers "Original: Arginine (CGU) → Mutated:
  Proline (CCA)" — reading CCA straight off the DNA strand instead of transcribing
  it. Applying part (a)'s own rule gives mRNA GGU, whose amino acid is not in the
  five-codon table the question supplies, so the key's answer cannot be derived and
  cannot be replaced from within the sources either. The key's answer is reproduced
  in 13.3 with one sentence flagging the discrepancy, since the examinable point —
  a substitution changes one amino acid and leaves the rest of the chain intact — is
  the same on either reading. Source owner should fix.

### Garbled source text

- **"trismic 21"** for *trisomic*; written as trisomy 21 in 13.3.
- **"Polyploidy plants usually larger and stronger diploid plants"** — the
  comparative "than" is missing. Written with it.
- The `ti` ligature is rendered as `C` throughout the review guide extraction
  ("informaCon", "replicaCon", "TranscripCon"), `tt` as `ii` ("aiach" for attach),
  and `ft`/`ti` variants as `c`/`W` ("lec" for left, "leWng" for letting). All
  unambiguous.

### Extraction losses

- **The RNA/DNA comparison table** arrived as one run-on string with its cells
  concatenated (`RNADNANitrogen BaseAUGCATGCHow many strands…`), which is how the
  location-row ordering above had to be reconstructed. Rebuilt as a four-row table in
  13.1.
- **Section 13.4 lost its structure.** Everything from "Eukaryotic Gene Regulation"
  onwards came through as a flat auto-numbered list 1–14, so headings, sub-points and
  body text are interleaved at the same level ("1. Eukaryotic Gene Regulation
  2. RNA Interference (RNAi) Mechanism: …"). The hierarchy in the lesson is
  reconstructed from the content; the reading is not in doubt, but nobody should
  treat the numbers 1–14 as the guide's own topic numbering.

### One inference flagged here rather than hidden

The guide describes a single base insertion or deletion as changing "every amino acid
following mutation point" but never names the effect. **Frameshift** appears only as
a wrong-answer option in MCQs 10 and 17, undefined. The two answer keys rule it out
for a one-amino-acid substitution and for a new stop codon respectively, which
between them leave the insertion/deletion case, so 13.3 names it — explicitly as the
practice set's term — rather than leaving a student with a word they have seen on two
questions and nowhere else.

### Guide says to ignore what the practice set then tests

The review guide's DNA replication section ends "(ignore the lagging and leading
strand)". FRQ 1(b) then asks the student to explain why the lagging strand requires
discontinuous synthesis, and MCQs 6, 13 and 18 ask about topoisomerase, DNA
polymerase III proofreading and DNA ligase — none of which the review guide mentions.
Covered in 12.3 per the Grade 10 brief, with a line telling the student the guide
defers them and the practice set does not. Source owner should reconcile the two.

### Header names a level the course does not have

The review guide's first line reads "Biology S Review Guide", but the course is
unstreamed and neither the folder nor the filename carries a level. Written
unlevelled. This is a fourth instance of the mistyped-header pattern already logged
for `CS/S/1 G9 CS S.docx`, `HISTORY/S/1 G9 HIST S.docx` and `PHY/H/2 G9 PHY H.docx`.

The four superseded drafts are in the session scratchpad under
`hs-biology-10-superseded/`.

## AP Calculus AB — audit of the pre-rule draft

Sources: the five documents under `CLASS OF 7 PA S2 FINALS GUIDES/Math/` —
`AP Calculus Review Guide.pdf`, `AP Calculus Review Practice.pdf` and its
`... Answers.pdf`, `AP Calculus Practice Set.pdf` and its `... Answers.pdf`.

### The review guide contains no calculus

The document named `AP Calculus Review Guide.pdf` is the only source with
exposition rather than questions, and every word of it is pre-calculus:
polynomials, inequalities, transformations of graphs, and trigonometry. It stops
at the power-reduction identities. The whole of the calculus half of the course
therefore exists only as questions and answer sheets, and the lessons for it are
built from those — which is why they lean on worked answers and quote them.

The practice set states the range as "AP Calc 1.1-10.3, Pre-calc Chapters 9-12".

### The course is called AB and the papers examine BC

The two practice papers set series and tests of convergence, radius and interval
of convergence, Maclaurin series, the Lagrange error bound, polar area,
parametric first and second derivatives, and improper integrals. Written as the
sources give it, under the course id the house assigned. Someone should decide
whether the id or the material is wrong.

### The nine pre-rule drafts

All nine are in the session scratchpad under `superseded/`, each with a
`.superseded` suffix. Three filenames changed, because the drafts combined
topics the review guide keeps apart:
`01-2-inequalities-and-transformations.md` became `01-2-inequalities.md` and
`01-3-transformations-of-graphs.md`; `02-2-trigonometric-identities.md` became
`02-2-inverse-trigonometric-functions.md`, `02-3-triangle-trigonometry-and-circular-measure.md`
and `02-4-compound-angle-and-product-identities.md`;
`03-1-limits-and-derivatives.md` became `03-1-limits.md` and `03-2-derivatives.md`.
Four lessons are new: `00-1-examinable-scope.md`, `04-2-area-and-volume.md`,
`08-1-circles-and-the-hyperbola.md`, and the transformations lesson above.

### Unsourced material removed

Nothing below appears in any of the five documents. Most of it is true, and all
of it is standard calculus; none of it is in this course's material.

- **`05-1-differential-equations.md` was almost entirely invented.** Separable
  equations and the separation procedure; $y = Ae^{kx}$ as exponential growth
  and decay, with population growth, radioactive decay, compound interest and
  Newton's law of cooling named as its applications; the first-order linear form
  $y' + P(x)y = Q(x)$; the **integrating factor** $\mu = e^{\int P\,dx}$ and its
  use on both of the paper's questions; a method-selection table; **slope
  fields**; and **Euler's method** $y_{n+1} = y_n + hf(x_n,y_n)$ together with
  the claim that it underestimates a concave-up solution. The sources contain
  two differential equations, one answer, and no method at all.
- The same lesson **fabricated an answer**. It read the free-response equation
  $\frac{dy}{dx} = \frac{x+y}{x}$ as the multiple-choice equation
  $\frac{dy}{dx} = \frac{y}{x} + x$, called them "the same equation", and
  produced $y = x^2 - x$ for the initial-value problem. The right-hand sides are
  $1 + \frac{y}{x}$ and $x + \frac{y}{x}$; they are different equations, and the
  answer sheet prints no solution for the free-response one.
- **`07-1`**: the whole convergence-test table ($n$th term, geometric with sum
  $\frac{a}{1-r}$, the statement of the ratio test, the alternating series test,
  comparison and limit comparison, the integral test); "the ratio test is the
  default for anything containing factorials"; the general Taylor formula
  $f(x) = \sum \frac{f^{(n)}(a)}{n!}(x-a)^n$; four of the five "standard series
  worth memorising" ($e^x$, $\sin x$, $\cos x$, $\frac{1}{1-x}$ — only
  $\ln(1+x)$ is in the sources); the Lagrange bound
  $|R_n| \le \frac{M|x-a|^{n+1}}{(n+1)!}$; the claim that all derivatives of
  $\sin(5x+\frac{\pi}{4})$ are bounded by $5^n$; and the endpoint analysis of
  the interval $(-1,3)$.
- **`07-1` also carried a worked example that exists in no source**: a ratio-test
  proof that $\sum \frac{n!}{n^n}$ converges absolutely, with the limit
  $\left(\frac{n}{n+1}\right)^n \to \frac{1}{e}$. That series is not on either
  paper.
- **`04-1`**: both parts of the **Fundamental Theorem of Calculus**; the table of
  standard integrals ($\int x^n$, $\int \frac{1}{x} = \ln|x|$, $\int e^x$,
  $\int\sin$, $\int\cos$, $\int\sec^2 x = \tan x$,
  $\int\frac{1}{1+x^2} = \arctan x$); substitution and by parts stated as general
  methods ("reverse of the chain rule", $\int u\,dv = uv - \int v\,du$);
  $\tan^2 x = \sec^2 x - 1$ with the antiderivative $[\tan x - x]$;
  **partial fractions**, named nowhere in the sources; the convergence test for
  $\int_1^\infty x^{-p}dx$ and the remark that the condition reverses near zero;
  the disk and washer formulas as general statements; and the advice on
  choosing between disks, washers and shells.
- **`03-1`**: $\lim_{x\to0}\frac{1-\cos x}{x} = 0$ and
  $\lim_{x\to\infty}(1+\frac{1}{x})^x = e$; the list of indeterminate forms;
  **L'Hôpital's rule**, which no source names, and the claim that MCQ 1 is done
  by taking logarithms and applying it twice; the limit definition of the
  derivative; "the instantaneous rate of change and the slope of the tangent
  line"; the power, product, quotient and chain rules as general statements; the
  standard-derivative list ($\tan$, $e^x$, $a^x$, $\ln x$, $\arcsin$,
  $\arctan$); the first-derivative test, used in place of the guide's own
  second-derivative justification; concavity and points of inflection; and a
  fabricated error estimate for Newton's method ("$\approx 0.0262$ ... a second
  iteration would reduce it by roughly the square of that").
- **`02-2`**: the Pythagorean identities $\sin^2+\cos^2 = 1$,
  $\sec^2 = 1+\tan^2$ and $\csc^2 = 1+\cot^2$; the double-angle formulas for
  $\sin 2x$, $\cos 2x$ (all three forms) and $\tan 2x$; the claim that the
  power-reduction identities are "the standard tool for integrating $\sin^2$ and
  $\cos^2$ (4.2)" — a cross-reference to a section number the guides do not
  have; "check it against $\cos(0+0) = 1$ if unsure"; "the Law of Cosines is
  Pythagoras generalised to non-right triangles"; and the guidance on choosing
  between the Law of Sines and the Law of Cosines. $\sin^2+\cos^2=1$ is now
  derived in the lesson by adding the guide's own two power-reduction formulas,
  and $\sin 2x = 2\sin x\cos x$ by putting $y = x$ in the guide's own compound
  angle identity — both are used unremarked by the guide's own worked solutions.
- **`06-1`**: the polar conversions $x = r\cos\theta$, $y = r\sin\theta$,
  $r^2 = x^2+y^2$; the polar area formula $A = \frac{1}{2}\int r^2 d\theta$ and
  a worked derivation of the $r = 2\sin\theta$ area from it, including the
  warning about double-counting; and the general polar slope formula.
- **`02-1`**: "the unit-circle definition is worth preferring over the triangle
  definition"; "because the trigonometric functions are not one-to-one, their
  domains must be restricted"; "sine is odd and cosine is even"; and "both are
  derived by drawing a right triangle and using Pythagoras for the third side".
- **`01-1`**: the operation count justifying nested form ("only $n$
  multiplications and $n$ additions"); the identification of the Location
  Principle as "the Intermediate Value Theorem specialised to roots ... the
  justification for every numerical root-finding method"; "in lowest terms" in
  the Rational Root Theorem; the reduction of the sum-and-product formula to
  $x_1+x_2 = -\frac{b}{a}$; and "a real polynomial of odd degree must have at
  least one real root, since complex roots come in pairs".
- **`01-2`**: "never multiply both sides by a denominator whose sign you do not
  know", with the $\frac{1}{x} > 1$ example; extraneous roots from squaring; and
  the worked $|x-3| < 2 \Rightarrow 1 < x < 5$.

### Two formulas reconstructed rather than removed

Both are the guide's own printed line with the numbers taken out, and the
lesson says where each comes from.

- **Newton's method.** The answer sheet prints
  $x_1 = x_0 - \frac{\cos x_0 - x_0}{-\sin x_0 - 1}$. The lesson describes the
  iteration in words and the keyword table gives
  $x_1 = x_0 - \frac{f(x_0)}{f'(x_0)}$, which is that line with $f$ restored.
- **The parametric second derivative.** MCQ 11's answer of $\frac{3}{4}$ for
  $x = t^2$, $y = t^3$ at $t = 1$ is reproducible only by differentiating
  $\frac{dy}{dx}$ with respect to $t$ and dividing by $\frac{dx}{dt}$; the
  alternative reading gives 3. The lesson shows both and says which reproduces
  the guide's answer.

### Errors corrected in the notes (guide contradicts itself)

Each of these is an answer that disagrees with its own question, correctable
from material printed elsewhere in the same guides. Each carries one sentence in
the lesson, because a student holding the answer sheet would otherwise think the
notes were wrong.

- **Practice Set I.1(d).** $\lim_{x\to3}\frac{x^3-3x^2-x+3}{x^2-2x-3}$ is marked
  3. The factorisation is $\frac{(x-3)(x^2-1)}{(x-3)(x+1)} = x-1$, which is 2 at
  $x = 3$.
- **Practice Set I.3(f).** $\int_2^4 x^2dx$ is marked $-\frac{56}{3}$. The
  magnitude is right and the sign is not.
- **Practice Set II.1.** Three of the six inverse-trigonometric evaluations are
  marked with the *inner* angle instead of the value of the whole expression:
  $\sin(\cos^{-1}\frac{1}{2})$ is marked $\frac{\pi}{6}$ (the value is
  $\frac{\sqrt3}{2}$), $\cot(\tan^{-1}1)$ is marked $\frac{\pi}{4}$ (the value
  is 1), and $\sin^{-1}(\sin\frac{2\pi}{3})$ is marked $\frac{\pi}{4}$ (the
  guide's own range for $\arcsin$ and its own identity $\sin x = \sin(\pi-x)$
  give $\frac{\pi}{3}$). The two that are right, $\cos^{-1}(\cos\frac{11\pi}{6})
  = \frac{\pi}{6}$ and $\cos\frac{5\pi}{2} = 0$, are the worked examples in the
  lesson.
- **Practice Set II.3.** A sector of perimeter 12 with central angle 0.4 is
  marked $r = 6$. The guide's own definition of the radian gives
  $2r + r\theta = 2.4r = 12$, so $r = 5$.
- **Practice Set II.6.** The remainder of $x^3+ax^2+3x+b$ on division by
  $(x-1)$ is marked 6, which is the remainder the question supplies for the
  divisor $(x+1)$. The Remainder Theorem gives $f(-1) = 6 \Rightarrow a+b = 10$
  and then $f(1) = 4 + (a+b) = 14$.
- **Practice Set II.7.** $x^2-5x+6$ as a factor of $2x^3-15x^2+ax+b$ is marked
  $a = -1$, $b = -5$, which satisfies neither of the two equations the roots
  $x = 2, 3$ produce. Those give $a = 37$, $b = -30$.
- **Practice Set I.5(d).** The point of $r = \theta+\sin2\theta$ furthest from
  the origin on $[0,\frac{\pi}{2}]$ is marked $\theta = \frac{\pi}{2}$. The
  derivative the question itself supplies, $1+2\cos2\theta$, vanishes at
  $\frac{\pi}{3}$, and $r(\frac{\pi}{3}) \approx 1.91$ against
  $r(\frac{\pi}{2}) \approx 1.57$.
- **Review Practice B5.** $\arccos(\sin x) = \frac{5\pi}{2} - x$ is given for
  $x \in [2\pi, 3\pi)$. Past $x = \frac{5\pi}{2}$ that expression is negative
  and so lies outside the range $[0,\pi]$ the same guide prints for $\arccos$;
  there the value is $x - \frac{5\pi}{2}$.
- **Review Practice MCQ 3.** $\sum_{n=1}^{\infty} n!$ is marked "converges
  absolutely". The verdict fits $\sum\frac{1}{n!}$; the series as printed has
  terms that grow without bound.

### Answers that could not be reconciled

Reproduced as printed with no gloss, or omitted where the extraction is the
problem. Correcting any of them would need a formula that appears nowhere in the
five documents.

- **Practice Set I.4(b) and (c)**: $\frac{3\pi}{10}$ for the volume of
  revolution and $\frac{\pi}{105}$ for the semicircular-cross-section solid,
  built on a region whose area part (a) gives as
  $12+20\pi-40\tan^{-1}3 = 24.87$. Part (a) is internally consistent — the
  intersections are at $x = \pm3$, which is where the $\tan^{-1}3$ comes from —
  and the two volumes are smaller than 1. Printed in the lesson as the guide's
  answers.
- **Practice Set I.5(a) and (b)**: $6\pi$ for the area bounded by
  $r = \theta+\sin2\theta$ and the $x$-axis, and $\frac{\pi}{2}$ for the angle
  at the point with $x$-coordinate $-2$; at $\theta = \frac{\pi}{2}$ that curve
  has $x = 0$. Correcting either needs the polar area formula or the
  polar-to-Cartesian conversion, and neither is anywhere in the sources.
- **Practice Set I.5(c)** asks what a negative $\frac{dr}{d\theta}$ says about
  $r$; the answer given describes what a negative $r$ would mean.
- **Practice Set I.3(a), (b), (d), (h)**: $\int_0^5 e^x dx$ marked
  $\frac{1}{3}$, $\int_0^\pi\cos x\,dx$ marked 10, $\int_3^8 x^2\cos x\,dx$
  marked $e-1$, $\int_0^1\sin^{-1}x\,dx$ marked $\frac{\pi}{2}$ where the value
  is $\frac{\pi}{2}-1$. Not used. The items on the same question whose answers
  do align — the two DNE entries and $\int_2^4x^2dx$ — are.
- **Practice Set I.6**: the Taylor question on $\sin(5x+\frac{\pi}{4})$ is
  answered with $f'''(0) = -2$, a coefficient of $\frac{(-1)^{n-1}}{n}$, and a
  bound evaluated at 0.5. Those are the answers for $\ln(1+x)$ at $x = 0.5$; the
  question is about a different function at $\frac{1}{10}$. The lesson records
  what the question asks and none of the printed answers.
- **Review Practice FRQ Set 1 Q4** has no answer at all: the answer sheet runs
  straight from question 3 into the stray word "Patrick:" and then into Set 2.
- **Review Practice MCQ 6**: options (a) $\frac{1}{64}$ and (e)
  $\frac{(0.5)^4}{4}$ are the same number, so the item has two correct choices.
  Flagged in the lesson.

### Factual errors left as written

Both entries formerly listed here (the definition of sine and cosine; the
properties of the modulus) have been corrected in the notes and moved to
"Errors corrected under the corrected-claims policy" at the end of this file.

### Extraction losses

- The review guide's mathematics runs together throughout
  (`x1,2=−b±√ b2−4ac 2a`, `a sinA=b sinB=c sinC= 2r`,
  `sin2a=1−cos 2a 2`). Every instance is unambiguous and was restored.
- The practice set separates each question's prose from its formulas: the text
  says "Evaluate the following limits" and the expressions arrive in a block at
  the end of the item, in a different order from the lettering. Every pairing
  used in the notes was checked against its answer before being used.
- **Superscripts are flattened.** `2x` is $2^x$ and `ln(3x)` is $\ln(3^x)$, both
  identifiable from their answers ($2^x\ln2$ and $\ln3$).
- **Practice Set I.2(b)** — question `2x4−23x+5`, answer `−28x3−23`. Neither is
  readable; omitted.
- **Practice Set I.2(f)** — the derivative of $(\cos(x^3+\sin2x))^2$ is printed
  without its leading factor of 2 and without the 2 in $2\cos2x$, though the
  latter is what the same answer sheet gives for $\frac{d}{dx}\sin2x$. Restored
  in the lesson, with a sentence saying so.
- **Practice Set I.3(e)** — `∫100−2x−2(x−3)(x+1) dx`. Limits and integrand
  cannot be separated; omitted.
- **Practice Set I.1(e)** — the answer is missing from the sheet. The question,
  $\lim_{x\to0}\frac{x^2-2x}{x}$, is used as a cancellation example.
- **Practice Set II.4** — the cone question refers to a diagram that is not in
  the text. The answer $240°$ is recorded without working, and the lesson says
  the diagram is not in the guide.
- **Review Practice MCQ 13** lost its question text, which reappears as the last
  line of the document: "Evaluate the limit $\lim_{x\to\infty}
  x\left(\sqrt{x^2+1}-x\right)$". It fits the printed options and the answer
  B $= \frac{1}{2}$, and is used as MCQ 13.
- **Graphing questions** (Practice Set II.2, Review Practice B1) have graphs for
  answers, and nothing survived. Both are covered by the instructions the
  questions themselves give.

### Numbering

The practice set's pre-calculus section numbers its questions 1, 2, 4, 4, 5, 6,
7 — there is no question 3, and two questions numbered 4. The answer sheet
renumbers them 1 to 7. The alignment was confirmed at the flagpole question,
whose answer $62.49°$ appears under 5 and is reproducible from the question.

Neither the review guide nor either practice paper uses section codes, so the
lessons are numbered sequentially in the order the review guide teaches, with
the calculus lessons following in the order the practice papers set them.

## Errors corrected under the corrected-claims policy

The house decided that guide claims which are simply false should be corrected in
the notes rather than reproduced, even where the guide never contradicts itself.
Each correction carries one sentence in the lesson saying what the guide prints
and why it is wrong, because students revise with the guide open and an
unexplained disagreement reads as the notes being wrong.

Entries below moved here from the various "Factual errors left as written" lists.

### History 10 S+ (corrected by the main session)

- ***Mein Kampf* dated 1923.** Written as **1924-25, first volume published
  1925**, with a sentence noting that 1923 is the year of the Beer Hall Putsch,
  after which Hitler wrote the book in prison.
- **Two end dates for the European theatre.** The guide heads the section
  "officially ended on May 2nd 1945" and then gives 8 May as V-E Day. Written as
  **8 May**, with a sentence explaining that 2 May is the surrender of the Berlin
  garrison, not the end of the war in Europe.

### Physics 9 S

- **7.1, Copernicus.** Guide: "Nicolaus Copernicus: first human to propose
  planets revolve around sun." The note now says Copernicus **revived** the
  proposal, with one sentence recording that the guide calls him the first to
  propose it and that heliocentrism was already proposed in antiquity.
- **7.1, Kepler's first law.** Guide: "Planets, stars, comets all orbit sun in
  ellipses." The note now keeps the ellipse claim for planets and comets and
  **drops stars from the orbiting bodies**, with one sentence recording that the
  guide lists stars and that stars do not orbit the Sun.
- **8.1, collisions.** Guide: objects of different masses "experience the same
  force" in a collision "but their momentum changes depend on mass and
  velocity". The note now says that because the equal forces act for equal
  times, the impulse-momentum theorem makes the **momentum changes equal in
  magnitude and opposite in direction whatever the masses**, and that it is the
  **velocity** changes that depend on mass; one sentence records what the guide
  prints and that it is wrong.

### Physics 9 H

- **5.6, Cavendish.** Guide dates the measurement of $G$ to 1978; the year had
  previously been dropped from the note rather than printed. It is now restored
  as **1798**, with one sentence recording that the guide prints 1978.

### Physics 10 H

- **18.1, Volta.** Guide: Volta "designed and built the first electric battery;
  published discovery in 1900". The note now gives **1800**, with one sentence
  recording that the guide prints 1900 and that Volta's pile dates to 1800,
  immediately after Galvani's experiments of the 1780s.
- **18.7, dc and ac.** Guide: dc "First found by Thomas Alva Edison", ac "First
  found by Nikola Tesla". The note now says Edison **championed and
  commercialised** dc and Tesla **developed and championed** ac, with one
  sentence recording that the guide says "first found by" and that neither man
  discovered a kind of current — each promoted one side of the
  late-nineteenth-century distribution dispute.

### AP Economics

- **Ch1, principle 1.** Guide: "People Face tradeoff: Efficiency vs Quality".
  Lesson 1.1 now gives the trade-off as **efficiency against equality
  (equity)**, with one sentence recording that the guide prints "Efficiency vs
  Quality" and that it is an error.
- **Ch1, positive versus normative.** Guide puts "Price will rise in 5 years"
  in the normative column. Lesson 1.1 now lists it as a **positive** example
  alongside "The price is rising", the normative example cell marked as one the
  guide does not supply, with one sentence recording that the guide files the
  forecast as normative and that a forecast describes what will happen rather
  than what ought to happen.
- **Module 53, marginal utility.** Guide: "additional utility from spending one
  more dollar (unit) on that good or service", which the next line then divides
  by price. Lesson 7.1 now defines marginal utility as the additional utility
  from **consuming one more unit** of the good, so that the division by price is
  what yields utility per dollar; the Keywords entry is corrected to match, and
  one sentence records what the guide prints and that it is an error.
- **Module 52, accounting profit.** Guide defines it as revenue minus explicit
  costs *and depreciation*, then formulates it as "R – explicit cost". Lesson
  6.1 now prints the formula as $R - \text{explicit cost} - \text{depreciation}$
  so that definition and formula agree, with one sentence recording that the
  guide drops depreciation from the formula and that this is an error.

### Economics 10 H

- **Who wants foreign direct investment.** Guide: "Domestic government want
  because: it creates job opportunities, promotes technological advancement" /
  "Foreign government want because: efficiency". Lesson 6.1 now **reverses the
  two**, so the foreign (host) government wants the jobs and the technology and
  the domestic government wants the efficiency, which is what the guide's own
  definition of FDI implies; one sentence records that the guide prints the
  motives the other way round and that this is an error.

### English 10 H

- **Lesson 8, Careened.** Guide: "to fall into someone or something; out of
  control", against its own sentence "He careened around us and, as he passed
  by, yelled out his open window". Lesson 8.1 now defines it as **to swerve or
  lurch while moving at speed; out of control**, in both the body and the
  Keywords table, with one sentence recording that the guide prints the falling
  sense and that it is an error.

### History 10 S+, Roosevelt's date (second pass)

Restoring the Cavendish year in Physics 9 H made this entry's reasoning stale: it
had justified dropping Roosevelt's date by analogy with a case that is no longer
handled that way. Revisited under the same policy.

The lesson now says Roosevelt was **in office from 1933**, with a sentence noting
that the guide dates his push to 1932, before he was president and seven years
before the war began. The specific year in which he "insisted" is still not
supplied, because the guide does not give one and no source does.

### Chinese 9 S

- **Issue 8 《苏州园林》, the 说明方法 list.** Guide: 下定义、做比较、打比方、
  举例子、列数据、画图标、因资料. Lesson 8.1 now writes **画图表** and **引资料**
  in both the term table and the Keywords table, with one sentence recording that
  the guide prints 画图标 and 因资料 and that those spellings are wrong.
- **Issue 8 《故乡的婚礼》, 标志 glossed as 相貌美丽.** Lesson 8.2 now heads that
  字词 row **标致**, in both the 字词解释 table and the Keywords table, with one
  sentence recording that the guide prints 标志 and that 标志 means a mark or
  sign while the word meaning 相貌美丽 is 标致.

### Chinese 10 H

- **Lesson 1, the commentator's name.** Guide: the 1754 hand-copied 《石头记》
  carried "脂观斋"的批语. All three occurrences in lesson 1 (prose, timeline
  table, Keywords table) now read **脂砚斋**, with one sentence recording that the
  guide prints 脂观斋 and that the character is 砚 (inkstone), not 观.
- **Lesson 3, 王熙凤's line misquoted.** Guide: "天下真有这样标志的人物". The
  描写方法 table now quotes **标致**, with one sentence recording that the guide
  prints 标志, that the novel has 标致 (good-looking), and that 标志 means a mark
  or sign and changes what the sentence says.

### Chinese 10 S

- **Lesson 1, 金陵十二钗.** Guide: "其间插叙金陵十二钗（以及探春，迎春，惜春三姐妹）
  等众多人物的身世、经历和结局". The parenthesis now reads 探春、迎春、惜春三姐妹
  **也在十二钗之内**, with one sentence recording that the guide prints "以及" and
  that the three sisters are themselves among the twelve rather than additions to
  them. No roster of the twelve is given, since the guide supplies none.

### Chemistry 9 S+

- **6.1, visible spectrum ordering.** Guide (docs 3 and 4): wavelength,
  frequency AND energy all run violet < indigo < blue < green < yellow <
  orange < red. The lesson now gives that order for **wavelength only** and
  states that **frequency and energy run the opposite way** — violet highest,
  red lowest — with one sentence recording that the guide prints the single
  order for all three and that this is an error.

### Chemistry 9 S

- **8.4, hydrogen bonding partners.** Guide: hydrogen bonding forms between an
  H atom and an "F, O, S, or N" atom on another molecule. The lesson now gives
  the partners as **N, O or F** in the prose, the intermolecular-forces table
  and the Keywords table, with one sentence recording that the guide includes
  S and that sulfur does not belong — it is not electronegative enough.

### CS 10 S

- **Lesson 6, network database.** Guide: a network database is "a hierarchical
  arrangement of nodes" with a many-to-many relationship — which is the
  definition it gives one row above for the *hierarchical* database. The
  lesson's model table and Keywords table now define it as **an arrangement of
  nodes in which a child node may have several parent nodes**, with one
  sentence recording what the guide prints and that a hierarchy allows each
  child exactly one parent, so the network model is precisely what a hierarchy
  forbids.

### CS 10 H

- **Lesson 2, SQL statement class.** Guide: `INSERT INTO`, `UPDATE`,
  `DELETE FROM` and `SELECT` are filed under a heading reading "Basic
  Definition Language". The lesson now files them as **Data Manipulation
  Language (DML)** and names `CREATE`, `ALTER` and `DROP` as Data Definition
  Language, with a DML row added to the Keywords table.
- **Lesson 2, SQL expansion.** Guide: "Structure Query Language". Corrected to
  **Structured Query Language** in the prose and in the Keywords table. Both
  CS 10 H corrections are covered by the single sentence in the SQL section
  recording what the guide prints and that both are errors.

### Music (Grade 10 finals guides, unlevelled)

- **Wagner described as Hungarian.** Guide: `Richard Wagner: Hungarian,
  Jew-hater, Hitler's a fan`. Lesson 1 now says Wagner was **German**, with one
  sentence recording that the guide prints "Hungarian" and that it is an error.
  The same guide correctly calls Brahms German, so this is an isolated slip.
- **Mozart "famous for his nine symphonies".** Lesson 1 now gives Mozart's
  **forty-one or so symphonies**, with one sentence recording that the guide
  prints "nine symphonies" and that nine is Beethoven's number.
- **Trombone glossed as *trombe*.** Lesson 2 now glosses the trombone as
  ***tromboni***, with one sentence recording that the guide prints *trombe*
  and that *trombe* is the Italian for trumpets. The guide's other Italian
  instrument names (*flauto*, *oboi*, *corni*) are right.

### Math 10 H

- **Chapter 9, the ambiguous case test.** Guide: "b>asinB 2 solutins, b=asinB
  1 solution, b<asinB 0 solution". Lesson 9's table now gives **2 solutions for
  $a\sin B < b < a$** and **1 solution for $b \geq a$**, keeping the guide's
  other two lines, with one sentence recording that the guide prints
  $b > a\sin B$ alone for the two-solution case and that two triangles also
  require $b < a$.
- **Chapter 13, limits of $r^n$.** Guide: "If |r|<1, then lim n→∞ rⁿ=0. If
  |r|>1 or r=±1, it is divergent with no limits." Lesson 13's *sequence* table
  now carries a row for **$r = 1$, where $\lim_{n\to\infty} r^n = 1$**, and
  restricts the divergent line to $\lvert r \rvert > 1$ or $r = -1$; one
  sentence records what the guide prints and that it is an error for the
  sequence. The guide's claim about the *series* sum is left as it stands,
  since $r = 1$ does make the sum diverge.

### AP Calculus AB

- **Definition of sine and cosine.** Guide: the sine is "the distance of the
  point $A$ from the horizontal axis", and likewise the cosine from the
  vertical axis. Lesson 2.1 now defines each as the **signed coordinate** of
  $A$ on the unit circle ($y$ for sine, $x$ for cosine), in both the body and
  the Keywords table, with one sentence recording that the guide says "distance"
  and that a distance cannot produce the negative values the guide's own
  identity $\sin(-x) = -\sin x$ requires.
- **Properties of the modulus.** Guide: $|a| > 0$. Lesson 1.2 now prints
  **$|a| \ge 0$**, with one sentence recording that the guide gives $|a| > 0$,
  that $|0| = 0$, and that this is why the guide's next instruction has the
  student discuss the case $a = 0$.
