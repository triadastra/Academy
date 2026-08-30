"""Generate the mock-test paper catalogue, and the database rows that point at it.

Run:  python3 scripts/generate_mock_pdfs.py

This script is the single source of truth for mock papers. It writes BOTH the
PDFs under public/mock-tests/ AND the `mockTests` table inside
src/database/synonance.database.json, so the catalogue the app lists can never
drift from the files it links to. Re-running it is idempotent: same spec in,
same bytes and same rows out.

Papers are keyed by SUBJECT, not by course id. A subject has one shared pool of
questions, and each of its five papers takes a rotating slice of that pool —
which is how a real mock series is assembled, and means every course in a
subject (MATH 9 and MATH AA HL alike) has papers to sit without authoring a
separate set for all 41 catalogue courses.

To add or change a paper, edit SUBJECT_BANKS / PAPER_TITLES below and re-run.
Do not hand-edit the mockTests rows in the database JSON; they are generated.
"""

import json
import re
from io import BytesIO
from pathlib import Path
from shutil import copyfile

from matplotlib.mathtext import math_to_image
from reportlab.lib.colors import Color, HexColor
from reportlab.lib.pagesizes import A4
from reportlab.lib.utils import ImageReader
from reportlab.pdfgen import canvas

ROOT = Path(__file__).resolve().parents[1]
OUTPUT_DIR = ROOT / "output" / "pdf"
PUBLIC_DIR = ROOT / "public" / "mock-tests"
DATABASE = ROOT / "src" / "database" / "synonance.database.json"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
PUBLIC_DIR.mkdir(parents=True, exist_ok=True)

PAPER = HexColor("#F7F8F7")
INK = HexColor("#16191A")
MUTED = HexColor("#5A6461")
RULE = HexColor("#D6DCD9")
BOARD = HexColor("#2F5D50")
BOARD_TINT = HexColor("#DCE7E2")
MARK = HexColor("#A63D40")

WIDTH, HEIGHT = A4
LEFT = 50
RIGHT = WIDTH - 50

QUESTIONS_PER_PAPER = 8
PAPERS_PER_SUBJECT = 5
# Rotating the pool by this much per paper keeps consecutive papers distinct
# while letting a pool smaller than papers x questions still cover them all.
ROTATION = 3

# ── question pools ─────────────────────────────────────────────────────────
# Each entry: (prompt, LaTeX equation or "", marks).

SUBJECT_BANKS = {
    "Mathematics": [
        ("Evaluate the limit and justify any algebraic simplification.", r"$\lim_{x\to 3}\frac{x^2-9}{x-3}$", 4),
        ("Differentiate the function and simplify your answer.", r"$y=(3x^2+1)^5$", 5),
        ("A rectangle has perimeter 40 cm. Find the dimensions that maximise its area, and show your result is a maximum.", "", 6),
        ("Evaluate the definite integral, showing the antiderivative you use.", r"$\int_0^2 (3x^2-4x+1)\,dx$", 5),
        ("Find the equation of the tangent to the curve below at the point where x = 2.", r"$y=x^3-2x$", 5),
        ("Solve the differential equation given that y(0)=2.", r"$\frac{dy}{dx}=3y$", 6),
        ("Decompose into partial fractions, stating the form you assume before finding the coefficients.", r"$\frac{5x+1}{(x-1)(x+2)}$", 6),
        ("Integrate by parts, stating your choice of u and dv.", r"$\int x e^{x}\,dx$", 5),
        ("Determine whether the improper integral converges, and evaluate it if it does.", r"$\int_1^{\infty}\frac{1}{x^2}\,dx$", 5),
        ("Find the stationary points and classify each using the second derivative.", r"$f(x)=x^3-3x^2+4$", 6),
        ("Use the chain rule to differentiate, then evaluate at x=0.", r"$y=\sin(2x^2+x)$", 5),
        ("Prove by induction that the statement holds for all positive integers n.", r"$\sum_{r=1}^{n} r = \frac{n(n+1)}{2}$", 6),
        ("A curve is defined implicitly. Find dy/dx in terms of x and y.", r"$x^2+xy+y^2=7$", 5),
        ("Find the area enclosed between the two curves.", r"$y=x^2,\quad y=2x$", 6),
    ],
    "Physics": [
        ("A wave has frequency 250 Hz and wavelength 1.4 m. Calculate its speed and state the equation used.", r"$v=f\lambda$", 4),
        ("Explain why sound cannot be polarised but light can, referring to the oscillation direction in each case.", "", 5),
        ("A trolley accelerates uniformly from rest. Derive the distance travelled in time t from first principles.", r"$s=ut+\frac{1}{2}at^2$", 6),
        ("State the principle of conservation of momentum and apply it to a head-on elastic collision.", r"$m_1u_1+m_2u_2=m_1v_1+m_2v_2$", 6),
        ("A resistor network has two 6 Ω resistors in parallel with a 3 Ω resistor in series. Find the total resistance.", "", 5),
        ("Sketch and explain the shape of a displacement-time graph for a wave, and state what the axes tell you.", "", 5),
        ("Calculate the energy released when a body of mass 2.0 kg falls through 15 m, stating any assumption.", r"$E=mgh$", 4),
        ("Describe an experiment to measure the acceleration due to gravity, identifying the main source of error.", "", 6),
        ("A 60 kg skater pushes off a 40 kg skater and moves at 2 m/s. Find the other skater's speed.", "", 5),
        ("Explain the difference between distance and displacement using a closed-loop journey.", "", 4),
        ("Calculate the current through a 12 Ω resistor connected across a 9 V supply, and the power dissipated.", r"$V=IR$", 5),
        ("Describe how refraction changes wavelength but not frequency, and explain why.", "", 5),
    ],
    "Chemistry": [
        ("Calculate the number of moles in 12.0 g of carbon-12, showing the relationship you use.", r"$n=\frac{m}{M}$", 4),
        ("Balance the equation and identify the limiting reactant when 4 mol of each reactant is supplied.", r"$\mathrm{N_2 + H_2 \rightarrow NH_3}$", 5),
        ("Describe how you would determine the empirical formula of a compound from its percentage composition.", "", 6),
        ("Explain, in terms of collision theory, why increasing temperature increases the rate of reaction.", "", 5),
        ("Determine the concentration of a solution made by dissolving 5.85 g of NaCl in 250 cm³ of water.", r"$c=\frac{n}{V}$", 5),
        ("Calculate the percentage yield when 8.4 g of product is obtained from a theoretical maximum of 10.0 g.", "", 4),
        ("Explain why ionic compounds conduct electricity when molten but not when solid.", "", 5),
        ("Describe the trend in reactivity down Group 1 and explain it in terms of atomic structure.", "", 6),
        ("Calculate the relative formula mass of calcium carbonate and the mass of 0.25 mol of it.", "", 4),
        ("Explain the difference between a strong acid and a concentrated acid, with an example of each.", "", 5),
        ("Describe a method to prepare a pure, dry sample of a soluble salt from an insoluble base.", "", 6),
        ("State Le Chatelier's principle and apply it to an exothermic equilibrium as temperature rises.", "", 5),
    ],
    "Biology": [
        ("Describe the structure of a cell membrane and explain how it controls what enters the cell.", "", 6),
        ("Explain the difference between diffusion, osmosis, and active transport, giving one example of each.", "", 6),
        ("Describe the role of enzymes and explain why activity falls sharply above an optimum temperature.", "", 5),
        ("Explain how the structure of an alveolus is adapted for gas exchange.", "", 5),
        ("Outline the process of photosynthesis and state the word equation.", "", 5),
        ("Describe how a reflex arc produces a rapid response, naming the neurones involved.", "", 6),
        ("Explain how natural selection can lead to antibiotic resistance in bacteria.", "", 6),
        ("Describe an experiment to investigate the effect of light intensity on the rate of photosynthesis.", "", 6),
        ("Explain the difference between mitosis and meiosis and state where each occurs.", "", 5),
        ("Use a Punnett square to predict the offspring ratio from two heterozygous parents.", "", 4),
        ("Describe how the body maintains a constant internal temperature.", "", 5),
        ("Explain the role of the placenta in exchanging substances between mother and fetus.", "", 4),
    ],
    "English": [
        ("Analyse how the writer uses structure to shape the reader's response in the extract provided.", "", 8),
        ("Compare the presentation of power in two texts you have studied, referring closely to language.", "", 8),
        ("Explain how an unreliable narrator affects the reader's judgement of events. Use one text you know well.", "", 6),
        ("Write the opening of a story set in a place undergoing change. Establish voice within the first paragraph.", "", 8),
        ("Evaluate the claim that a poem's form is inseparable from its meaning, using one poem to support your case.", "", 8),
        ("Discuss how imagery is used to convey isolation in a text you have studied.", "", 6),
        ("Analyse the effect of the writer's sentence-length variation in the passage supplied.", "", 5),
        ("Write a persuasive article arguing for or against a proposition of your choice. Use rhetorical devices deliberately.", "", 8),
        ("Explain how context shapes a modern reader's response to an older text.", "", 6),
        ("Compare how two writers open their narratives, and judge which is more effective and why.", "", 8),
        ("Discuss the function of a minor character in a text you have studied.", "", 6),
        ("Analyse how dialogue reveals the relationship between two characters in the extract.", "", 6),
    ],
    "Humanities": [
        ("Assess the most significant cause of the event studied, justifying your ranking against one alternative.", "", 8),
        ("Using a demand and supply diagram, explain the effect of an indirect tax on equilibrium price and quantity.", "", 6),
        ("Evaluate the usefulness of the source for a historian studying this period, referring to origin and purpose.", "", 6),
        ("Define price elasticity of demand and explain why it matters to a firm setting prices.", r"$PED=\frac{\%\Delta Q_d}{\%\Delta P}$", 5),
        ("Explain two consequences of the policy studied, distinguishing short-run from long-run effects.", "", 6),
        ("To what extent was economic pressure the main driver of the change studied? Justify your judgement.", "", 8),
        ("Explain how opportunity cost applies to a government choosing between two spending programmes.", "", 5),
        ("Analyse why two historians reach different conclusions about the same event.", "", 6),
        ("Using a diagram, explain how a maximum price can create a shortage.", "", 6),
        ("Describe one research method used in psychology and evaluate one strength and one limitation.", "", 6),
        ("Explain the difference between correlation and causation, using a study you have covered.", "", 5),
        ("Assess the reliability of eyewitness testimony, referring to evidence.", "", 8),
    ],
    "Technology": [
        ("Write pseudocode for a linear search and state its worst-case time complexity.", r"$O(n)$", 5),
        ("Explain the difference between a stack and a queue, giving one appropriate use for each.", "", 5),
        ("Trace the algorithm on the input [5, 2, 9, 1] and state the array after each pass.", "", 6),
        ("Convert the binary number to denary and explain the place-value method used.", r"$1011\,0110_2$", 4),
        ("Describe how a hash table resolves collisions, naming one strategy and its drawback.", "", 6),
        ("Write a function that returns the maximum value in a list without using a built-in max.", "", 5),
        ("Explain why binary search requires a sorted list, and state its complexity.", r"$O(\log n)$", 5),
        ("Compare compiled and interpreted execution, giving one advantage of each.", "", 5),
        ("Describe the purpose of a primary key in a relational database and why duplicates break it.", "", 4),
        ("Explain recursion using a worked example, and state the role of the base case.", "", 6),
        ("Identify the logic error in the described loop and explain the correction.", "", 5),
        ("Explain how HTTPS protects data in transit, naming the mechanism involved.", "", 6),
    ],
}

# ── answers, for the Question Base ─────────────────────────────────────────
# Joined to SUBJECT_BANKS BY INDEX, so a bank entry and its answer must stay in
# the same position. build_questions() asserts the lengths match rather than
# letting a silent off-by-one attach the wrong answer to a question.
#
# Each entry: (answer, [accept terms], [worked steps]).
# An empty accept list means "not auto-checkable" — essay prompts get a mark
# scheme in the steps instead of a substring match pretending to be marking.
ANSWERS = {
    "Mathematics": [
        ("6", ["6"], ["Factor the numerator: x² − 9 = (x − 3)(x + 3).", "Cancel the common factor x − 3, valid for x ≠ 3.", "Evaluate x + 3 as x → 3 to get 6."]),
        ("30x(3x² + 1)⁴", ["30x", "4"], ["Outer function is u⁵ with u = 3x² + 1.", "Differentiate the outer: 5u⁴.", "Differentiate the inner: 6x.", "Multiply and substitute back: 5(3x² + 1)⁴ · 6x = 30x(3x² + 1)⁴."]),
        ("10 cm by 10 cm, area 100 cm²", ["10", "100"], ["Let the sides be x and y, so 2x + 2y = 40 and y = 20 − x.", "Area A(x) = x(20 − x) = 20x − x².", "A′(x) = 20 − 2x; solve A′(x) = 0 to get x = 10.", "A″(x) = −2 < 0, so it is a maximum. Sides 10 cm, area 100 cm²."]),
        ("2", ["2"], ["Antiderivative: x³ − 2x² + x.", "At the upper bound: 8 − 8 + 2 = 2.", "At the lower bound: 0.", "Subtract: 2 − 0 = 2."]),
        ("y = 10x − 16", ["10", "16"], ["dy/dx = 3x² − 2, so the gradient at x = 2 is 10.", "At x = 2, y = 8 − 4 = 4.", "y − 4 = 10(x − 2), so y = 10x − 16."]),
        ("y = 2e^(3x)", ["2e", "3x"], ["Separate: (1/y) dy = 3 dx.", "Integrate: ln|y| = 3x + C.", "Exponentiate: y = Ae^(3x).", "Apply y(0) = 2 to get A = 2."]),
        ("A = 2, B = 3", ["2", "3"], ["Assume (5x + 1)/((x−1)(x+2)) = A/(x−1) + B/(x+2).", "Multiply through: 5x + 1 = A(x + 2) + B(x − 1).", "Set x = 1: 6 = 3A, so A = 2.", "Set x = −2: −9 = −3B, so B = 3."]),
        ("(x − 1)e^x + C", ["x-1", "e^x"], ["Take u = x and dv = e^x dx.", "Then du = dx and v = e^x.", "∫x e^x dx = x e^x − ∫e^x dx.", "= x e^x − e^x + C = (x − 1)e^x + C."]),
        ("1", ["1"], ["Antiderivative of x⁻² is −1/x.", "Evaluate from 1 to b: −1/b + 1.", "As b → ∞, −1/b → 0, so the integral converges to 1."]),
        ("(0, 4) maximum, (2, 0) minimum", ["0", "2"], ["f′(x) = 3x² − 6x = 3x(x − 2), zero at x = 0 and x = 2.", "f″(x) = 6x − 6.", "f″(0) = −6 < 0 → maximum at (0, 4).", "f″(2) = 6 > 0 → minimum at (2, 0)."]),
        ("1", ["1"], ["Outer is sin(u) with u = 2x² + x.", "dy/dx = cos(2x² + x) · (4x + 1).", "At x = 0: cos(0) · 1 = 1."]),
        ("", [], ["Base case: n = 1 gives LHS 1 and RHS 1(2)/2 = 1. ✓", "Assume true for n = k: sum = k(k+1)/2.", "For n = k + 1, add (k+1): k(k+1)/2 + (k+1) = (k+1)(k+2)/2.", "This is the formula with k+1, so by induction it holds for all n."]),
        ("dy/dx = −(2x + y)/(x + 2y)", ["2x", "y"], ["Differentiate both sides with respect to x.", "2x + y + x(dy/dx) + 2y(dy/dx) = 0.", "Group: (x + 2y) dy/dx = −(2x + y).", "So dy/dx = −(2x + y)/(x + 2y)."]),
        ("4/3", ["4/3", "1.33"], ["Curves meet where x² = 2x, so x = 0 and x = 2.", "Between them 2x lies above x².", "∫₀² (2x − x²) dx = [x² − x³/3]₀².", "= 4 − 8/3 = 4/3."]),
    ],
    "Physics": [
        ("350 m/s", ["350"], ["Use v = fλ.", "v = 250 × 1.4.", "v = 350 m/s."]),
        ("", [], ["Polarisation restricts oscillation to one plane.", "Only transverse waves oscillate perpendicular to travel, so a plane can be selected.", "Sound is longitudinal — oscillation is parallel to travel, so there is no perpendicular plane to filter.", "Light is transverse, so it can be polarised."]),
        ("s = ut + ½at²", ["ut", "at"], ["Average velocity over the interval is (u + v)/2.", "With v = u + at, average = u + ½at.", "Distance = average velocity × time = (u + ½at)t.", "So s = ut + ½at²."]),
        ("", [], ["Total momentum before equals total momentum after, for a closed system.", "m₁u₁ + m₂u₂ = m₁v₁ + m₂v₂.", "Apply along the line of collision, taking one direction as positive.", "For an elastic collision kinetic energy is also conserved."]),
        ("6 Ω", ["6"], ["Two 6 Ω in parallel: 1/R = 1/6 + 1/6, so R = 3 Ω.", "That 3 Ω is in series with the other 3 Ω.", "Total = 3 + 3 = 6 Ω."]),
        ("", [], ["A displacement–time graph is read at one point in space.", "Its horizontal axis is time, so the repeat distance is the period.", "A displacement–distance graph is a snapshot at one instant; its repeat distance is the wavelength.", "Always check the axis label before quoting either."]),
        ("300 J", ["300"], ["Use E = mgh.", "E = 2.0 × 10 × 15.", "E = 300 J, assuming g = 10 N/kg and no air resistance."]),
        ("", [], ["Time a pendulum of measured length for 20 oscillations and divide to get T.", "Repeat for several lengths.", "Plot T² against L; the gradient is 4π²/g.", "Main error is timing reaction; reduce it by timing many oscillations."]),
        ("3 m/s", ["3"], ["Momentum before is zero.", "So 60 × 2 + 40 × v = 0.", "v = −120/40 = −3, i.e. 3 m/s in the opposite direction."]),
        ("", [], ["Distance is the total path length travelled, a scalar.", "Displacement is the straight line from start to finish, a vector.", "On a closed loop the path length is non-zero.", "But start and finish coincide, so displacement is zero."]),
        ("0.75 A, 6.75 W", ["0.75", "6.75"], ["I = V/R = 9/12 = 0.75 A.", "P = VI = 9 × 0.75.", "P = 6.75 W."]),
        ("", [], ["Frequency is fixed by the source and does not change at a boundary.", "Wave speed changes because the medium changes.", "Since v = fλ and f is constant, λ must change with v.", "Entering a slower medium shortens the wavelength."]),
    ],
    "Chemistry": [
        ("1 mol", ["1"], ["Use n = m/M.", "Molar mass of carbon-12 is 12.0 g/mol.", "n = 12.0/12.0 = 1 mol."]),
        ("H₂ is limiting", ["h2", "hydrogen"], ["Balanced: N₂ + 3H₂ → 2NH₃.", "Divide by coefficients: N₂ 4/1 = 4; H₂ 4/3 ≈ 1.33.", "The smallest is H₂, so hydrogen is limiting."]),
        ("", [], ["Convert each percentage to grams, assuming 100 g of compound.", "Divide each mass by its molar mass to get moles.", "Divide all mole values by the smallest.", "Scale to the nearest whole numbers — divide by moles, never by mass."]),
        ("", [], ["Higher temperature gives particles more kinetic energy.", "They collide more frequently.", "A greater fraction of collisions exceeds the activation energy.", "Both effects raise the rate, the energy one more than the frequency one."]),
        ("0.4 mol/dm³", ["0.4"], ["M(NaCl) = 58.5 g/mol, so n = 5.85/58.5 = 0.1 mol.", "V = 250 cm³ = 0.25 dm³.", "c = n/V = 0.1/0.25 = 0.4 mol/dm³."]),
        ("84%", ["84"], ["Percentage yield = actual/theoretical × 100.", "= 8.4/10.0 × 100.", "= 84%."]),
        ("", [], ["Conduction requires charged particles free to move.", "In a solid ionic lattice the ions are held in fixed positions.", "Melting breaks the lattice so the ions can move.", "Molten ionic compounds therefore conduct; solids do not."]),
        ("", [], ["Reactivity increases down Group 1.", "Atomic radius increases, so the outer electron is further from the nucleus.", "There is more shielding from inner shells.", "The outer electron is lost more easily, so reactivity rises."]),
        ("100, 25 g", ["100", "25"], ["Ar: Ca 40, C 12, O 16 × 3 = 48.", "Mr(CaCO₃) = 40 + 12 + 48 = 100.", "m = n × M = 0.25 × 100 = 25 g."]),
        ("", [], ["Strong describes how fully an acid dissociates into ions.", "Concentrated describes how much acid there is per unit volume.", "Hydrochloric acid is strong; ethanoic acid is weak.", "A dilute strong acid and a concentrated weak acid are both possible."]),
        ("", [], ["Add excess insoluble base to warm acid until no more dissolves.", "Filter off the unreacted excess.", "Evaporate the filtrate to the point of crystallisation.", "Leave to crystallise, then dry the crystals between filter papers."]),
        ("", [], ["A system at equilibrium opposes any change imposed on it.", "The forward reaction is exothermic, so it releases heat.", "Raising the temperature is opposed by absorbing heat.", "The equilibrium shifts backwards, lowering the yield of product."]),
    ],
    "Biology": [
        ("", [], ["The membrane is a phospholipid bilayer with embedded proteins.", "Hydrophobic tails face inwards, so the core repels water-soluble substances.", "Small non-polar molecules diffuse straight through.", "Channel and carrier proteins control the passage of ions and polar molecules."]),
        ("", [], ["Diffusion: net movement down a concentration gradient, passive — e.g. oxygen into blood.", "Osmosis: movement of water across a partially permeable membrane — e.g. water into a root hair.", "Active transport: movement against the gradient using ATP — e.g. mineral ions into root cells.", "Only active transport requires energy."]),
        ("", [], ["Enzymes are biological catalysts with an active site complementary to the substrate.", "Raising temperature increases collisions and so raises the rate.", "Above the optimum the bonds holding the tertiary structure break.", "The active site changes shape and the enzyme is denatured, so activity falls sharply."]),
        ("", [], ["Alveoli give a very large total surface area.", "The wall is one cell thick, so the diffusion path is short.", "A dense capillary network maintains a steep concentration gradient.", "A moist lining lets gases dissolve before diffusing."]),
        ("", [], ["Carbon dioxide + water → glucose + oxygen, in the presence of light and chlorophyll.", "Light energy is absorbed by chlorophyll in the chloroplasts.", "It is converted to chemical energy in glucose.", "Oxygen is released as a by-product."]),
        ("", [], ["A receptor detects the stimulus.", "A sensory neurone carries the impulse to the spinal cord.", "A relay neurone passes it to a motor neurone.", "The motor neurone carries it to an effector, bypassing conscious thought so the response is rapid."]),
        ("", [], ["Random mutation produces variation, including some resistant bacteria.", "The antibiotic kills non-resistant bacteria.", "Resistant individuals survive and reproduce.", "The resistance allele becomes more common in the population."]),
        ("", [], ["Place pondweed in sodium hydrogencarbonate solution at a set distance from a lamp.", "Count oxygen bubbles produced per minute.", "Repeat at several distances, keeping temperature constant with a heat shield.", "Plot rate against 1/d² as a measure of light intensity."]),
        ("", [], ["Mitosis produces two genetically identical diploid cells.", "It occurs in growth and repair, and in asexual reproduction.", "Meiosis produces four genetically different haploid cells.", "It occurs in the reproductive organs to form gametes."]),
        ("3:1", ["3:1", "3", "1"], ["Both parents are Aa.", "Grid gives AA, Aa, aA, aa.", "Three offspring show the dominant phenotype, one recessive.", "The ratio is 3:1."]),
        ("", [], ["Thermoreceptors in the skin and hypothalamus detect temperature change.", "If too hot, vasodilation and sweating increase heat loss.", "If too cold, vasoconstriction and shivering conserve and generate heat.", "This is negative feedback returning the body to its set point."]),
        ("", [], ["The placenta provides a large surface area with a rich blood supply.", "Oxygen, glucose and amino acids diffuse from mother to fetus.", "Carbon dioxide and urea pass from fetus to mother.", "The two blood supplies stay separate, preventing pressure damage and blood-group mixing."]),
    ],
}

PAPER_TITLES = {
    "Mathematics": [
        ("Calculus foundations", "Limits, differentiation, and the definite integral"),
        ("Techniques of integration", "Substitution, parts, and partial fractions"),
        ("Applications of derivatives", "Optimisation, tangents, and curve analysis"),
        ("Algebra and proof", "Manipulation, induction, and implicit relations"),
        ("Mixed timed practice", "Full-syllabus paper under exam conditions"),
    ],
    "Physics": [
        ("Waves and motion", "Wave characteristics, kinematics, and momentum"),
        ("Forces and energy", "Newton's laws, work, and conservation"),
        ("Electricity", "Circuits, resistance, and power"),
        ("Practical and analysis", "Method design, error, and interpretation"),
        ("Mixed timed practice", "Full-syllabus paper under exam conditions"),
    ],
    "Chemistry": [
        ("Quantitative chemistry", "The mole, concentration, and limiting reactants"),
        ("Structure and bonding", "Ionic, covalent, and metallic structures"),
        ("Rates and equilibrium", "Collision theory and Le Chatelier's principle"),
        ("Practical and analysis", "Preparation, purification, and yield"),
        ("Mixed timed practice", "Full-syllabus paper under exam conditions"),
    ],
    "Biology": [
        ("Cells and transport", "Membranes, diffusion, osmosis, and active transport"),
        ("Enzymes and exchange", "Enzyme action and exchange surfaces"),
        ("Genetics and inheritance", "Mitosis, meiosis, and inheritance ratios"),
        ("Practical and analysis", "Experimental design and interpretation"),
        ("Mixed timed practice", "Full-syllabus paper under exam conditions"),
    ],
    "English": [
        ("Close reading", "Structure, language, and the reader's response"),
        ("Comparative essay", "Two texts, one argument"),
        ("Creative writing", "Voice, opening, and narrative control"),
        ("Poetry and form", "Form, imagery, and meaning"),
        ("Mixed timed practice", "Full-paper practice under exam conditions"),
    ],
    "Humanities": [
        ("Causation and significance", "Weighing causes and justifying a judgement"),
        ("Markets and prices", "Demand, supply, elasticity, and intervention"),
        ("Source evaluation", "Origin, purpose, and usefulness"),
        ("Methods and evidence", "Research design, reliability, and inference"),
        ("Mixed timed practice", "Full-syllabus paper under exam conditions"),
    ],
    "Technology": [
        ("Algorithms and complexity", "Search, sort, and Big-O reasoning"),
        ("Data structures", "Stacks, queues, and hash tables"),
        ("Programming constructs", "Functions, loops, and recursion"),
        ("Systems and data", "Representation, databases, and networks"),
        ("Mixed timed practice", "Full-syllabus paper under exam conditions"),
    ],
}

INSTRUCTIONS = [
    "Answer all eight questions. Show sufficient working for method marks.",
    "A calculator may be used unless a question states otherwise.",
    "Write clearly in the spaces provided. Additional pages may be attached.",
]


def slugify(value):
    return re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")


def build_papers():
    """Expand the spec into concrete papers. Pure — no file access."""
    papers = []
    for subject, bank in SUBJECT_BANKS.items():
        for index in range(PAPERS_PER_SUBJECT):
            picked = [
                bank[(index * ROTATION + offset) % len(bank)]
                for offset in range(QUESTIONS_PER_PAPER)
            ]
            questions = [
                {"number": n + 1, "prompt": p, "equation": e, "marks": m}
                for n, (p, e, m) in enumerate(picked)
            ]
            name, subtitle = PAPER_TITLES[subject][index]
            total = sum(q["marks"] for q in questions)
            slug = f"{slugify(subject)}-mock-{index + 1:02d}"
            papers.append(
                {
                    "id": f"mock-{slug}",
                    "subject": subject,
                    "number": index + 1,
                    "name": f"Mock Test {index + 1:02d}",
                    "title": name,
                    "subtitle": subtitle,
                    "slug": slug,
                    "questions": questions,
                    "totalMarks": total,
                    # ~7 minutes a mark, rounded to a sittable 15-minute block.
                    "timeMinutes": max(45, round(total * 1.6 / 15) * 15),
                }
            )
    return papers


def paginate(questions):
    """Page 1 carries the instructions, so it holds fewer questions."""
    return [questions[:2], questions[2:5], questions[5:]]


def earned_marks(question):
    """Deterministic 'student' score for the annotated copy — no randomness, so
    a re-run produces byte-identical files."""
    marks = question["marks"]
    return max(0, marks - (question["number"] % 3 == 0) - (question["number"] % 4 == 0))


ANNOTATION_NOTES = {
    0: "Correct and clearly justified.",
    1: "Method sound; final simplification omitted.",
    2: "Check the condition before applying the rule.",
}


def wrap_text(pdf, text, x, y, max_width, font="Helvetica", size=9, leading=12):
    pdf.setFont(font, size)
    line = ""
    for word in text.split():
        candidate = f"{line} {word}".strip()
        if pdf.stringWidth(candidate, font, size) <= max_width:
            line = candidate
        else:
            pdf.drawString(x, y, line)
            y -= leading
            line = word
    if line:
        pdf.drawString(x, y, line)
        y -= leading
    return y


def draw_header(pdf, paper, page_number, page_count, annotated):
    pdf.setFillColor(PAPER)
    pdf.rect(0, 0, WIDTH, HEIGHT, stroke=0, fill=1)
    pdf.setFillColor(BOARD)
    pdf.rect(0, HEIGHT - 58, WIDTH, 58, stroke=0, fill=1)
    pdf.setFillColor(Color(1, 1, 1))
    pdf.setFont("Helvetica-Bold", 11)
    pdf.drawString(LEFT, HEIGHT - 28, "SHSID")
    pdf.setFont("Helvetica", 8)
    pdf.drawString(LEFT, HEIGHT - 42, "Shanghai High School International Division")
    pdf.setFont("Helvetica-Bold", 11)
    pdf.drawRightString(RIGHT, HEIGHT - 28, f"{paper['subject'].upper()} - {paper['name'].upper()}")
    pdf.setFont("Helvetica", 8)
    pdf.drawRightString(
        RIGHT,
        HEIGHT - 42,
        f"{paper['title']} | {paper['timeMinutes']} minutes | {paper['totalMarks']} marks",
    )
    if annotated:
        pdf.setFillColor(MARK)
        pdf.roundRect(RIGHT - 104, HEIGHT - 82, 104, 17, 3, stroke=0, fill=1)
        pdf.setFillColor(Color(1, 1, 1))
        pdf.setFont("Helvetica-Bold", 8)
        pdf.drawCentredString(RIGHT - 52, HEIGHT - 76, "AGENT ANNOTATED")
    pdf.setStrokeColor(RULE)
    pdf.line(LEFT, 34, RIGHT, 34)
    pdf.setFillColor(MUTED)
    pdf.setFont("Helvetica", 8)
    pdf.drawString(LEFT, 21, "Generated from the indexed Synonance course question pool")
    pdf.drawRightString(RIGHT, 21, f"Page {page_number} of {page_count}")


def draw_equation(pdf, equation, centre_x, baseline_y, max_width=360, max_height=28):
    buffer = BytesIO()
    math_to_image(equation, buffer, dpi=180, format="png", color="#16191A")
    buffer.seek(0)
    image = ImageReader(buffer)
    image_width, image_height = image.getSize()
    scale = min(max_width / image_width, max_height / image_height)
    width, height = image_width * scale, image_height * scale
    pdf.drawImage(image, centre_x - width / 2, baseline_y - height, width=width, height=height, mask="auto")
    return baseline_y - height


def draw_cover_details(pdf, paper, annotated):
    y = HEIGHT - 92
    pdf.setFillColor(INK)
    pdf.setFont("Times-Bold", 18)
    pdf.drawString(LEFT, y, "Instructions")
    y -= 20
    for item in INSTRUCTIONS:
        pdf.setFillColor(BOARD)
        pdf.circle(LEFT + 3, y + 3, 2, stroke=0, fill=1)
        pdf.setFillColor(MUTED)
        y = wrap_text(pdf, item, LEFT + 14, y, RIGHT - LEFT - 14, size=9, leading=13)
        y -= 3
    if annotated:
        scored = sum(earned_marks(q) for q in paper["questions"])
        pdf.setFillColor(BOARD_TINT)
        pdf.roundRect(LEFT, y - 38, RIGHT - LEFT, 38, 4, stroke=0, fill=1)
        pdf.setFillColor(INK)
        pdf.setFont("Helvetica-Bold", 10)
        pdf.drawString(LEFT + 12, y - 15, "SCORE SAVED TO COURSE PROGRESS")
        pdf.setFillColor(MARK)
        pdf.setFont("Helvetica-Bold", 18)
        pdf.drawRightString(RIGHT - 12, y - 25, f"{scored} / {paper['totalMarks']}")
        y -= 55
    else:
        y -= 8
    return y


def draw_question(pdf, question, y, annotated):
    block_height = 205
    pdf.setFillColor(Color(1, 1, 1))
    pdf.setStrokeColor(RULE)
    pdf.roundRect(LEFT, y - block_height, RIGHT - LEFT, block_height, 5, stroke=1, fill=1)
    pdf.setFillColor(BOARD)
    pdf.circle(LEFT + 18, y - 20, 10, stroke=0, fill=1)
    pdf.setFillColor(Color(1, 1, 1))
    pdf.setFont("Helvetica-Bold", 9)
    pdf.drawCentredString(LEFT + 18, y - 23, str(question["number"]))
    pdf.setFillColor(MUTED)
    pdf.setFont("Helvetica", 9)
    pdf.drawRightString(RIGHT - 14, y - 23, f"[{question['marks']} marks]")
    pdf.setFillColor(INK)
    text_y = wrap_text(pdf, question["prompt"], LEFT + 38, y - 18, RIGHT - LEFT - 105, "Helvetica", 10, 14)
    if question["equation"]:
        text_y -= 6
        text_y = draw_equation(pdf, question["equation"], (LEFT + RIGHT) / 2, text_y)
        text_y -= 8
    line_start = max(text_y - 8, y - 86)
    pdf.setStrokeColor(HexColor("#C9CFCC"))
    for offset in range(0, 88, 18):
        pdf.line(LEFT + 20, line_start - offset, RIGHT - 20, line_start - offset)
    if annotated:
        pdf.setFillColor(MARK)
        pdf.setFont("Helvetica-Bold", 10)
        pdf.drawRightString(RIGHT - 18, y - block_height + 18, f"{earned_marks(question)}/{question['marks']}")
        note = ANNOTATION_NOTES[question["number"] % 3]
        pdf.setFont("Helvetica-Oblique", 8)
        wrap_text(pdf, note, LEFT + 20, y - block_height + 18, RIGHT - LEFT - 90, "Helvetica-Oblique", 8, 10)
    return y - block_height - 14


def build_pdf(path, paper, annotated=False):
    pdf = canvas.Canvas(str(path), pagesize=A4)
    suffix = " - Annotated" if annotated else ""
    pdf.setTitle(f"{paper['subject']} {paper['name']} - {paper['title']}{suffix}")
    pdf.setAuthor("Synonance for SHSID")
    pages = paginate(paper["questions"])
    for page_number, page_questions in enumerate(pages, start=1):
        draw_header(pdf, paper, page_number, len(pages), annotated)
        y = draw_cover_details(pdf, paper, annotated) if page_number == 1 else HEIGHT - 88
        for question in page_questions:
            y = draw_question(pdf, question, y, annotated)
        pdf.showPage()
    pdf.save()


# A course sits a paper series drawn from one question pool. Code keywords win
# over the catalogue subject, because "Science" bundles physics with chemistry —
# which is how PHYSICS 10 ended up being offered a Quantitative chemistry paper.
CODE_TRACKS = [
    ("PHYSICS", "Physics"),
    ("CHEMISTRY", "Chemistry"),
    ("BIOLOGY", "Biology"),
    ("MATH", "Mathematics"),
    ("CALCULUS", "Mathematics"),
    ("STATISTICS", "Mathematics"),
    ("ENGLISH", "English"),
    ("LITERATURE", "English"),
    ("COMPUTER", "Technology"),
    ("DESIGN", "Technology"),
    ("HISTORY", "Humanities"),
    ("ECONOMICS", "Humanities"),
    ("GEOGRAPHY", "Humanities"),
    ("PSYCHOLOGY", "Humanities"),
    ("BUSINESS", "Humanities"),
]

SUBJECT_TRACKS = {
    "Mathematics": "Mathematics",
    "English": "English",
    "Science": "Physics",
    "Humanities": "Humanities",
    "Technology": "Technology",
}


def track_for(code, subject):
    upper = (code or "").upper()
    for keyword, track in CODE_TRACKS:
        if keyword in upper:
            return track
    return SUBJECT_TRACKS.get(subject, "Mathematics")


DIFFICULTY = {4: "Foundation", 5: "Standard", 6: "Challenge"}


def build_questions(courses):
    """Question Base rows, from the same pools that build the papers.

    A paper only needs a prompt; the Question Base also needs an answer, an
    accept rule, and worked steps — so ANSWERS carries those, joined by index.
    """
    rows = []
    for track, bank in SUBJECT_BANKS.items():
        answers = ANSWERS.get(track)
        if not answers:
            continue
        if len(answers) != len(bank):
            raise SystemExit(
                f"ANSWERS['{track}'] has {len(answers)} entries but the bank has {len(bank)} — "
                "they are joined by index and must line up."
            )
        for course in courses:
            if track_for(course["code"], course["subject"]) != track:
                continue
            for index, ((prompt, equation, marks), (answer, accept, steps)) in enumerate(
                zip(bank, answers)
            ):
                unit, topic = PAPER_TITLES[track][index % PAPERS_PER_SUBJECT]
                rows.append(
                    {
                        "id": f"{course['id']}-q{index + 1:02d}",
                        "courseId": course["id"],
                        "subject": track,
                        "code": f"{index + 1}.{marks}-Q{index + 1:02d}",
                        "unit": unit,
                        "topic": topic,
                        "prompt": prompt,
                        **({"tex": equation.strip("$")} if equation else {}),
                        "type": "Short response" if accept else "Extended response",
                        "difficulty": DIFFICULTY.get(marks, "Standard"),
                        "marks": marks,
                        "source": f"{track} course pool, indexed revision 1",
                        "sourceType": "Course material",
                        "answer": answer or "See the mark scheme in the worked steps.",
                        # No accept terms means the prompt is not auto-checkable
                        # (essay/method answers) — the UI should teach, not mark.
                        "answerRule": {"mode": "includesAll", "values": accept},
                        "steps": steps,
                    }
                )
    return rows


def write_database_rows(papers):
    """Replace the generated mockTests table in place, leaving every other key
    of the database untouched.

    One row per (course, paper): a course lists exactly its own five papers.
    Rows share the PDFs of their track, so adding a course costs a row rather
    than ten more rendered files.
    """
    database = json.loads(DATABASE.read_text())
    by_track = {}
    for paper in papers:
        by_track.setdefault(paper["subject"], []).append(paper)

    courses = [
        {"id": c["id"], "code": c["code"], "subject": c.get("subject", "")}
        for c in database.get("courseCatalog", [])
    ] + [
        {"id": c["id"], "code": c["code"], "subject": ""}
        for c in database.get("seedCourses", [])
    ]

    rows = []
    for course in courses:
        track = track_for(course["code"], course["subject"])
        for paper in by_track.get(track, []):
            rows.append(
                {
                    "id": f"{course['id']}-{paper['slug']}",
                    "courseId": course["id"],
                    "track": track,
                    "subject": paper["subject"],
                    "name": paper["name"],
                    "title": paper["title"],
                    "subtitle": paper["subtitle"],
                    "timeMinutes": paper["timeMinutes"],
                    "totalMarks": paper["totalMarks"],
                    "questionCount": len(paper["questions"]),
                    "pageCount": len(paginate(paper["questions"])),
                    "pdfUrl": f"/mock-tests/{paper['slug']}.pdf",
                    "annotatedPdfUrl": f"/mock-tests/{paper['slug']}-annotated.pdf",
                    "downloadName": f"SHSID-{course['code'].replace(' ', '-')}-{paper['slug']}.pdf",
                    "sources": [
                        f"{len(SUBJECT_BANKS[track])} indexed {track.lower()} questions",
                        "2 de-identified student papers",
                        "Shared course notes · latest revision",
                    ],
                }
            )

    database["mockTests"] = rows

    # The Question Base is generated from the same pools, so a course that has
    # papers also has questions — no course is left with an empty bank because
    # its subject was never authored.
    questions = build_questions(courses)
    database["questions"] = questions

    DATABASE.write_text(json.dumps(database, indent=2, ensure_ascii=False) + "\n")
    print(f"{len(rows)} paper rows and {len(questions)} questions across {len(courses)} courses")


def main():
    papers = build_papers()
    for paper in papers:
        for annotated in (False, True):
            name = f"{paper['slug']}{'-annotated' if annotated else ''}.pdf"
            path = OUTPUT_DIR / name
            build_pdf(path, paper, annotated=annotated)
            copyfile(path, PUBLIC_DIR / name)
    write_database_rows(papers)
    print(f"{len(papers)} papers ({len(papers) * 2} PDFs) -> {PUBLIC_DIR}")
    print(f"mockTests rows -> {DATABASE}")


if __name__ == "__main__":
    main()
