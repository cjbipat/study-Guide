import type {
  Card,
  DailyStat,
  DatabaseSnapshot,
  Deck,
  DeckTheme,
  LearningActivity,
  LearningItem,
  MaterialGoal,
  StudyMaterial,
  User,
  UserStats,
} from "@/lib/types";
import type {
  LanguageActivity,
  LanguageProfile,
  LanguageReview,
  LanguageVocabularyItem,
} from "@/lib/language/types";
import type { ConversationSession } from "@/lib/language/conversation-types";
import type { Quiz, QuizAttempt } from "@/lib/quiz/types";
import { seedVocabForProfile } from "@/lib/language/seed";
import { todayKey } from "@/lib/utils";

export const SCHEMA_VERSION = 11;

const now = Date.now();
const DAY = 86_400_000;
const iso = (msAgo: number) => new Date(now - msAgo).toISOString();

export const MOCK_USER: User = {
  id: "user_local",
  name: "Chris",
  email: "cjbipat@gmail.com",
  avatarColor: "violet",
  createdAt: iso(120 * DAY),
};

interface SeedCard {
  q: string;
  a: string;
  tags?: string[];
}

interface SeedDeck {
  id: string;
  name: string;
  description: string;
  theme: DeckTheme;
  icon: string;
  lastStudiedDaysAgo: number | null;
  cards: SeedCard[];
}

const SEED: SeedDeck[] = [
  {
    id: "deck_biology",
    name: "Biology",
    description: "Cell biology, genetics, and how living systems keep themselves running.",
    theme: "emerald",
    icon: "🧬",
    lastStudiedDaysAgo: 0,
    cards: [
      { q: "What is the primary function of mitochondria?", a: "To produce ATP through aerobic respiration — the cell's main energy currency.", tags: ["cell"] },
      { q: "What is photosynthesis?", a: "The process by which plants, algae, and some bacteria convert light energy, water, and CO₂ into glucose and oxygen.", tags: ["plants", "energy"] },
      { q: "What are the four nitrogenous bases in DNA?", a: "Adenine, Thymine, Guanine, and Cytosine (A–T and G–C pair together).", tags: ["genetics"] },
      { q: "What is the difference between mitosis and meiosis?", a: "Mitosis produces two identical diploid cells for growth/repair; meiosis produces four genetically unique haploid gametes.", tags: ["genetics", "cell"] },
      { q: "What is an enzyme?", a: "A biological catalyst (usually a protein) that lowers the activation energy of a reaction without being consumed.", tags: ["biochem"] },
      { q: "What is the role of ribosomes?", a: "They synthesize proteins by translating messenger RNA into chains of amino acids.", tags: ["cell"] },
      { q: "Define homeostasis.", a: "The maintenance of a stable internal environment despite changes in external conditions.", tags: ["physiology"] },
      { q: "What is the central dogma of molecular biology?", a: "Genetic information flows DNA → RNA → protein (transcription then translation).", tags: ["genetics"] },
      { q: "What distinguishes prokaryotic from eukaryotic cells?", a: "Eukaryotes have a membrane-bound nucleus and organelles; prokaryotes (bacteria, archaea) do not.", tags: ["cell"] },
      { q: "What is natural selection?", a: "The process where organisms better adapted to their environment tend to survive and produce more offspring.", tags: ["evolution"] },
      { q: "What is ATP?", a: "Adenosine triphosphate — the molecule that stores and transfers energy within cells.", tags: ["energy", "biochem"] },
      { q: "What is the function of the cell membrane?", a: "A selectively permeable phospholipid bilayer that controls what enters and leaves the cell.", tags: ["cell"] },
      { q: "What is a gene?", a: "A segment of DNA that codes for a functional product, typically a protein or RNA molecule.", tags: ["genetics"] },
      { q: "What are the products of glycolysis?", a: "2 pyruvate, a net 2 ATP, and 2 NADH — from one glucose molecule, in the cytoplasm.", tags: ["energy", "biochem"] },
      { q: "What is osmosis?", a: "The diffusion of water across a semipermeable membrane from lower to higher solute concentration.", tags: ["cell"] },
      { q: "What is the role of chlorophyll?", a: "A pigment in chloroplasts that absorbs light (mostly red and blue) to power photosynthesis.", tags: ["plants"] },
    ],
  },
  {
    id: "deck_japanese",
    name: "Japanese",
    description: "Core vocabulary, particles, and phrases for JLPT N5–N4.",
    theme: "rose",
    icon: "🗾",
    lastStudiedDaysAgo: 1,
    cards: [
      { q: "ありがとうございます", a: "Thank you very much (polite).", tags: ["phrase"] },
      { q: "How do you say \"good morning\" (polite)?", a: "おはようございます (ohayō gozaimasu)", tags: ["greeting"] },
      { q: "What does the particle は (wa) mark?", a: "The topic of the sentence — what the sentence is about.", tags: ["grammar", "particle"] },
      { q: "What does the particle を (o) mark?", a: "The direct object of a transitive verb.", tags: ["grammar", "particle"] },
      { q: "水 (みず)", a: "Water", tags: ["noun"] },
      { q: "食べる (たべる)", a: "To eat (ichidan verb)", tags: ["verb"] },
      { q: "How do you count \"three people\"?", a: "三人 (さんにん / san-nin)", tags: ["counter"] },
      { q: "What is the difference between これ, それ, and あれ?", a: "これ = this (near me), それ = that (near you), あれ = that over there (far from both).", tags: ["grammar"] },
      { q: "行きます (いきます)", a: "To go (polite present/future)", tags: ["verb"] },
      { q: "What does 〜ください mean?", a: "\"Please give me\" / \"please do\" — a polite request, e.g. 水をください.", tags: ["grammar"] },
      { q: "大きい (おおきい)", a: "Big (i-adjective)", tags: ["adjective"] },
      { q: "What is the te-form of 飲む (のむ)?", a: "飲んで (nonde) — used for requests, linking actions, and continuous form.", tags: ["grammar", "verb"] },
      { q: "今日 (きょう)", a: "Today", tags: ["time"] },
      { q: "How do you say \"I don't understand\"?", a: "わかりません (wakarimasen)", tags: ["phrase"] },
      { q: "What does the particle に indicate with time?", a: "A specific point in time — e.g. 7時に起きます (I wake up at 7).", tags: ["grammar", "particle"] },
      { q: "友達 (ともだち)", a: "Friend", tags: ["noun"] },
    ],
  },
  {
    id: "deck_cs",
    name: "Computer Science",
    description: "Data structures, algorithms, and systems fundamentals for interviews.",
    theme: "blue",
    icon: "💻",
    lastStudiedDaysAgo: 2,
    cards: [
      { q: "What is the average time complexity of a hash table lookup?", a: "O(1) — constant time, assuming a good hash function and low load factor.", tags: ["complexity"] },
      { q: "What is the time complexity of binary search?", a: "O(log n) — it halves the search space each step, requires a sorted array.", tags: ["algorithms"] },
      { q: "Explain the difference between a stack and a queue.", a: "A stack is LIFO (last in, first out); a queue is FIFO (first in, first out).", tags: ["data-structures"] },
      { q: "What is a binary search tree?", a: "A tree where each node's left subtree holds smaller keys and right subtree holds larger keys, enabling O(log n) search when balanced.", tags: ["data-structures"] },
      { q: "What does Big-O notation describe?", a: "The upper bound on an algorithm's growth rate as input size approaches infinity.", tags: ["complexity"] },
      { q: "What is the difference between BFS and DFS?", a: "BFS explores level by level using a queue; DFS goes as deep as possible first using a stack or recursion.", tags: ["algorithms", "graphs"] },
      { q: "What is dynamic programming?", a: "Solving problems by breaking them into overlapping subproblems and caching results to avoid recomputation.", tags: ["algorithms"] },
      { q: "What is a race condition?", a: "A bug where the outcome depends on the non-deterministic timing of concurrent operations on shared state.", tags: ["concurrency"] },
      { q: "What is the CAP theorem?", a: "A distributed system can guarantee at most two of: Consistency, Availability, Partition tolerance.", tags: ["systems"] },
      { q: "What is the difference between a process and a thread?", a: "Processes have isolated memory; threads share the parent process's memory and are cheaper to create.", tags: ["os"] },
      { q: "What is a hash collision and how is it handled?", a: "When two keys hash to the same bucket. Handled by chaining (linked lists) or open addressing (probing).", tags: ["data-structures"] },
      { q: "What is memoization?", a: "Caching the return values of a function so repeated calls with the same arguments are instant.", tags: ["algorithms"] },
      { q: "What is the time complexity of merge sort?", a: "O(n log n) in all cases, with O(n) extra space.", tags: ["algorithms"] },
      { q: "What is a deadlock?", a: "A state where two or more threads each wait for a resource the other holds, so none can proceed.", tags: ["concurrency"] },
      { q: "What is normalization in databases?", a: "Organizing tables to reduce redundancy and improve integrity, typically to 3rd normal form.", tags: ["databases"] },
      { q: "What is the difference between TCP and UDP?", a: "TCP is connection-oriented and reliable with ordering; UDP is connectionless, faster, no delivery guarantees.", tags: ["networking"] },
    ],
  },
  {
    id: "deck_business",
    name: "Business",
    description: "Finance, strategy, and operating metrics every founder should know cold.",
    theme: "amber",
    icon: "📈",
    lastStudiedDaysAgo: 4,
    cards: [
      { q: "What is CAC?", a: "Customer Acquisition Cost — total sales & marketing spend divided by new customers acquired in a period.", tags: ["metrics"] },
      { q: "What is LTV?", a: "Lifetime Value — the total gross margin a business expects from a customer over the whole relationship.", tags: ["metrics"] },
      { q: "What is a healthy LTV:CAC ratio for SaaS?", a: "Roughly 3:1 or higher, with CAC payback under ~12 months.", tags: ["metrics"] },
      { q: "What is gross margin?", a: "(Revenue − Cost of Goods Sold) / Revenue — the share of revenue left after direct costs.", tags: ["finance"] },
      { q: "What is burn rate?", a: "The rate at which a company spends cash in excess of revenue, usually stated per month.", tags: ["finance"] },
      { q: "What is runway?", a: "Cash on hand divided by net monthly burn — how many months until the company runs out of money.", tags: ["finance"] },
      { q: "What is ARR?", a: "Annual Recurring Revenue — the normalized annualized value of recurring subscription revenue.", tags: ["metrics"] },
      { q: "What is net revenue retention?", a: "Revenue from existing customers this period vs. last period, including expansion and churn. Above 100% means growth without new logos.", tags: ["metrics"] },
      { q: "What are Porter's Five Forces?", a: "Competitive rivalry, supplier power, buyer power, threat of substitution, threat of new entry.", tags: ["strategy"] },
      { q: "What is a moat?", a: "A durable structural advantage (network effects, switching costs, scale, brand) that protects margins from competition.", tags: ["strategy"] },
      { q: "What is working capital?", a: "Current assets minus current liabilities — the short-term liquidity available to run operations.", tags: ["finance"] },
      { q: "What is EBITDA?", a: "Earnings Before Interest, Taxes, Depreciation, and Amortization — a proxy for operating cash generation.", tags: ["finance"] },
      { q: "What is product-market fit?", a: "When a product satisfies strong market demand — evidenced by retention, organic growth, and users who'd be very disappointed without it.", tags: ["strategy"] },
      { q: "What is the difference between a fixed and variable cost?", a: "Fixed costs don't change with output (rent); variable costs scale with each unit produced (materials).", tags: ["finance"] },
    ],
  },
  {
    id: "deck_spanish",
    name: "Spanish",
    description: "High-frequency verbs and travel phrases for confident conversation.",
    theme: "cyan",
    icon: "🌮",
    lastStudiedDaysAgo: 9,
    cards: [
      { q: "How do you say \"I would like...\" politely?", a: "Me gustaría... (e.g. Me gustaría un café).", tags: ["phrase"] },
      { q: "Conjugate \"ser\" in the present (yo, tú, él).", a: "yo soy, tú eres, él/ella es", tags: ["verb"] },
      { q: "What is the difference between \"ser\" and \"estar\"?", a: "Ser = permanent traits/identity; estar = temporary states and location.", tags: ["grammar"] },
      { q: "¿Dónde está el baño?", a: "Where is the bathroom?", tags: ["phrase", "travel"] },
      { q: "How do you say \"yesterday\"?", a: "ayer", tags: ["time"] },
      { q: "Conjugate \"tener\" (yo, tú, nosotros).", a: "yo tengo, tú tienes, nosotros tenemos", tags: ["verb"] },
      { q: "What does \"tener ganas de\" mean?", a: "To feel like (doing something) — Tengo ganas de dormir.", tags: ["idiom"] },
      { q: "How do you form the near future?", a: "ir + a + infinitive — Voy a estudiar (I'm going to study).", tags: ["grammar"] },
      { q: "la cuenta, por favor", a: "The check/bill, please.", tags: ["phrase", "travel"] },
      { q: "What is the \"personal a\"?", a: "The preposition 'a' placed before a direct object that is a specific person — Veo a María.", tags: ["grammar"] },
      { q: "How do you say \"there is / there are\"?", a: "hay (invariable) — Hay dos problemas.", tags: ["grammar"] },
      { q: "Conjugate \"hacer\" (yo, tú, ellos).", a: "yo hago, tú haces, ellos hacen", tags: ["verb"] },
    ],
  },
  {
    id: "deck_history",
    name: "World History",
    description: "Turning points, revolutions, and the ideas that reshaped societies.",
    theme: "violet",
    icon: "🏛️",
    lastStudiedDaysAgo: null,
    cards: [
      { q: "What triggered World War I?", a: "The assassination of Archduke Franz Ferdinand in Sarajevo (1914), which set off a chain of alliance obligations.", tags: ["20th-century"] },
      { q: "What was the Renaissance?", a: "A period of renewed interest in classical art, science, and humanism in Europe, roughly 14th–17th century, beginning in Italy.", tags: ["early-modern"] },
      { q: "What was the Columbian Exchange?", a: "The transfer of plants, animals, people, and diseases between the Americas and the Old World after 1492.", tags: ["early-modern"] },
      { q: "What were the main causes of the French Revolution?", a: "Fiscal crisis, an inequitable estate system, Enlightenment ideas, and food scarcity.", tags: ["revolutions"] },
      { q: "What was the Industrial Revolution?", a: "The shift from agrarian, handmade production to machine manufacturing beginning in Britain around 1760.", tags: ["modern"] },
      { q: "What was the significance of the printing press?", a: "Gutenberg's press (c. 1440) made texts cheap and widespread, accelerating literacy, the Reformation, and the spread of ideas.", tags: ["early-modern"] },
      { q: "What was the Cold War?", a: "A geopolitical rivalry between the US-led and Soviet-led blocs (1947–1991) without direct large-scale war between them.", tags: ["20th-century"] },
      { q: "What was the Silk Road?", a: "A network of trade routes connecting East Asia to the Mediterranean, exchanging goods, technology, religion, and disease.", tags: ["ancient"] },
      { q: "What was the Enlightenment?", a: "An 18th-century intellectual movement emphasizing reason, individual liberty, and skepticism of traditional authority.", tags: ["early-modern"] },
      { q: "What ended the Western Roman Empire?", a: "Conventionally 476 CE, when Odoacer deposed Romulus Augustulus — the culmination of economic decline, overextension, and migration pressure.", tags: ["ancient"] },
      { q: "What was decolonization?", a: "The mostly post-1945 process by which colonies in Africa, Asia, and the Caribbean gained independence from European powers.", tags: ["20th-century"] },
      { q: "What was the Meiji Restoration?", a: "Japan's rapid modernization and industrialization after 1868, replacing the shogunate with centralized imperial rule.", tags: ["modern"] },
    ],
  },
];

function makeCards(deckId: string, seeds: SeedCard[], fresh: boolean): Card[] {
  return seeds.map((s, i) => {
    // Vary scheduling state so mastery and due counts look realistic.
    const bucket = (i * 7 + deckId.length) % 10;
    const isNewCard = fresh || bucket >= 8;
    const reps = isNewCard ? 0 : Math.min(6, 1 + (bucket % 5));
    const interval = isNewCard ? 0 : [1, 2, 4, 8, 15, 26, 40][Math.min(6, reps)];
    const dueOffset = isNewCard
      ? 0
      : (bucket % 3 === 0 ? -1 : 1) * (1 + bucket) * DAY;
    const ease = isNewCard ? 2.5 : 2.5 + ((bucket % 5) - 2) * 0.12;
    return {
      id: `${deckId}_c${i + 1}`,
      deckId,
      question: s.q,
      answer: s.a,
      tags: s.tags ?? [],
      createdAt: iso((60 - i) * DAY),
      ease: Number(ease.toFixed(2)),
      intervalDays: interval,
      repetitions: reps,
      dueAt: new Date(now - dueOffset).toISOString(),
      lastReviewedAt: isNewCard ? null : iso((interval + 1) * DAY),
      lapses: bucket === 4 ? 2 : bucket === 7 ? 1 : 0,
    };
  });
}

function buildDailyStats(): DailyStat[] {
  const out: DailyStat[] = [];
  const base = new Date();
  const pattern = [
    { reviewed: 32, correct: 27 },
    { reviewed: 18, correct: 16 },
    { reviewed: 41, correct: 35 },
    { reviewed: 25, correct: 23 },
    { reviewed: 0, correct: 0 },
    { reviewed: 37, correct: 31 },
    { reviewed: 24, correct: 21 },
  ];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(base.getTime() - i * DAY);
    const p = pattern[6 - i];
    out.push({
      date: todayKey(d),
      reviewed: p.reviewed,
      correct: p.correct,
      xp: p.correct * 10 + (p.reviewed - p.correct) * 3,
    });
  }
  return out;
}

/* ------------------------------------------------------------------ */
/*  Seed study material (a real markdown notes file)                   */
/* ------------------------------------------------------------------ */

const BIO_NOTES_MD = `# Cell Biology — Chapter 4 Notes

## Mitochondria
The mitochondria is the powerhouse of the cell. It produces ATP through aerobic respiration, which is the cell's main source of usable energy. Mitochondria have their own DNA and a double membrane.

## Photosynthesis
Photosynthesis is the process by which plants, algae, and some bacteria convert light energy, water, and carbon dioxide into glucose and oxygen. The light reactions occur in the thylakoid membrane; the Calvin cycle occurs in the stroma.

## Ribosomes
Ribosomes synthesize proteins by translating messenger RNA into chains of amino acids. They can be free in the cytoplasm or bound to the endoplasmic reticulum.

## Enzymes
An enzyme is a biological catalyst, usually a protein, that lowers the activation energy of a reaction without being consumed. Enzyme activity depends on temperature and pH.

## Cell membrane
The cell membrane is a selectively permeable phospholipid bilayer that controls what enters and leaves the cell. Embedded proteins handle transport and signalling.

## Osmosis
Osmosis is the diffusion of water across a semipermeable membrane from a region of lower solute concentration to a region of higher solute concentration.
`;

const CS_CHEATSHEET_CSV = `term,definition
Big-O notation,Describes the upper bound on an algorithm's growth rate as input size approaches infinity
Hash table lookup,Average time complexity is O(1) assuming a good hash function and low load factor
Binary search,O(log n) search that halves the range each step and requires a sorted array
Stack,A LIFO structure where the last item added is the first removed
Queue,A FIFO structure where the first item added is the first removed
Dynamic programming,Breaking a problem into overlapping subproblems and caching results to avoid recomputation
`;

function textDataUrl(text: string, mime: string): string {
  // btoa is a global on both Node 18+ and browsers; encode UTF-8 to latin1 first.
  const b64 = btoa(unescape(encodeURIComponent(text)));
  return `data:${mime};base64,${b64}`;
}

function seedMaterials(): {
  materials: StudyMaterial[];
  learningItems: LearningItem[];
  activities: LearningActivity[];
} {
  const bioNotes: StudyMaterial = {
    id: "mat_bio_notes",
    deckId: "deck_biology",
    name: "Cell Biology — Chapter 4.md",
    mime: "text/markdown",
    kind: "markdown",
    size: BIO_NOTES_MD.length,
    dataUrl: textDataUrl(BIO_NOTES_MD, "text/markdown"),
    addedAt: iso(9 * DAY),
    status: "ready",
    extractedText: BIO_NOTES_MD,
    textTruncated: false,
  };

  const csCheat: StudyMaterial = {
    id: "mat_cs_cheatsheet",
    deckId: "deck_cs",
    name: "Algorithms cheat sheet.csv",
    mime: "text/csv",
    kind: "csv",
    size: CS_CHEATSHEET_CSV.length,
    dataUrl: textDataUrl(CS_CHEATSHEET_CSV, "text/csv"),
    addedAt: iso(3 * DAY),
    status: "ready",
    extractedText: CS_CHEATSHEET_CSV,
    textTruncated: false,
  };

  const bioFlashcards: LearningItem = {
    id: "li_bio_flashcards",
    type: "flashcards",
    materialId: "mat_bio_notes",
    deckId: "deck_biology",
    title: "Flashcards from Cell Biology — Chapter 4",
    createdAt: iso(9 * DAY),
    config: { count: 6, difficulty: "intermediate", focus: "concepts" },
    source: "extracted",
    cardIds: [
      "deck_biology_c1",
      "deck_biology_c2",
      "deck_biology_c5",
      "deck_biology_c6",
      "deck_biology_c12",
      "deck_biology_c15",
    ],
  };

  const bioSummary: LearningItem = {
    id: "li_bio_summary",
    type: "summary",
    materialId: "mat_bio_notes",
    deckId: "deck_biology",
    title: "Quick review — Cell Biology Chapter 4",
    createdAt: iso(8 * DAY),
    config: {},
    source: "extracted",
    summary: {
      overview:
        "Chapter 4 covers the core cell organelles and processes: how mitochondria make energy, how photosynthesis captures it, and how ribosomes, enzymes, and the cell membrane keep the cell running.",
      keyPoints: [
        "The mitochondria produces ATP through aerobic respiration.",
        "Photosynthesis converts light, water, and CO₂ into glucose and oxygen.",
        "Ribosomes translate mRNA into proteins.",
        "Enzymes lower activation energy without being consumed.",
        "The cell membrane is a selectively permeable phospholipid bilayer.",
      ],
      keyTerms: [
        { term: "Mitochondria", definition: "The powerhouse of the cell; produces ATP via aerobic respiration." },
        { term: "Photosynthesis", definition: "Conversion of light energy, water, and CO₂ into glucose and oxygen." },
        { term: "Ribosomes", definition: "Synthesize proteins by translating messenger RNA." },
        { term: "Enzyme", definition: "A biological catalyst that lowers a reaction's activation energy." },
      ],
    },
  };

  const activities: LearningActivity[] = [
    {
      id: "act_bio_1",
      type: "material-added",
      materialId: "mat_bio_notes",
      deckId: "deck_biology",
      at: iso(9 * DAY),
      detail: bioNotes.name,
    },
    {
      id: "act_bio_2",
      type: "flashcards-created",
      materialId: "mat_bio_notes",
      deckId: "deck_biology",
      learningItemId: "li_bio_flashcards",
      at: iso(9 * DAY - 60_000),
      detail: "6 flashcards",
    },
    {
      id: "act_bio_3",
      type: "summary-created",
      materialId: "mat_bio_notes",
      deckId: "deck_biology",
      learningItemId: "li_bio_summary",
      at: iso(8 * DAY),
      detail: "Quick review — Cell Biology Chapter 4",
    },
    {
      id: "act_bio_4",
      type: "flashcard-session",
      materialId: "mat_bio_notes",
      deckId: "deck_biology",
      at: iso(4 * DAY),
      reviewed: 6,
      correct: 5,
      incorrect: 1,
      accuracy: 83,
      xpEarned: 58,
      masteryBefore: 0,
      masteryAfter: 41,
      detail: "6 cards reviewed",
    },
    {
      id: "act_bio_5",
      type: "flashcard-session",
      materialId: "mat_bio_notes",
      deckId: "deck_biology",
      at: iso(1 * DAY),
      reviewed: 6,
      correct: 6,
      incorrect: 0,
      accuracy: 100,
      xpEarned: 70,
      masteryBefore: 41,
      masteryAfter: 58,
      detail: "6 cards reviewed",
    },
  ];

  return {
    materials: [bioNotes, csCheat],
    learningItems: [bioFlashcards, bioSummary],
    activities,
  };
}

export function buildSeedSnapshot(): DatabaseSnapshot {
  const decks: Deck[] = SEED.map((s) => ({
    id: s.id,
    userId: MOCK_USER.id,
    name: s.name,
    description: s.description,
    theme: s.theme,
    icon: s.icon,
    createdAt: iso(90 * DAY),
    lastStudiedAt: s.lastStudiedDaysAgo === null ? null : iso(s.lastStudiedDaysAgo * DAY),
  }));

  const cards: Card[] = SEED.flatMap((s) =>
    makeCards(s.id, s.cards, s.lastStudiedDaysAgo === null),
  );

  const { materials, learningItems, activities } = seedMaterials();
  // Link the seeded flashcard set's cards back to their source material, and give
  // them a realistic "part-way learned" scheduling state so the material's
  // mastery reads ~55-65% (matching the seeded session history).
  const linkedCardIds = new Set(
    learningItems.find((i) => i.id === "li_bio_flashcards")?.cardIds ?? [],
  );
  let li = 0;
  for (const c of cards) {
    if (!linkedCardIds.has(c.id)) continue;
    c.sourceMaterialId = "mat_bio_notes";
    const profile = [
      { reps: 4, interval: 15, ease: 2.6 },
      { reps: 2, interval: 3, ease: 2.4 },
      { reps: 5, interval: 26, ease: 2.7 },
      { reps: 3, interval: 8, ease: 2.5 },
      { reps: 1, interval: 1, ease: 2.4 },
      { reps: 3, interval: 8, ease: 2.5 },
    ][li % 6];
    li++;
    c.repetitions = profile.reps;
    c.intervalDays = profile.interval;
    c.ease = profile.ease;
    c.lapses = 0;
    c.lastReviewedAt = iso((profile.interval > 4 ? 1 : 0.4) * DAY);
    c.dueAt = new Date(now + (profile.interval - 1) * DAY).toISOString();
  }

  const daily = buildDailyStats();
  const totalReviews = 878;
  const totalCorrect = 761;

  const stats: UserStats = {
    userId: MOCK_USER.id,
    totalXp: 7860,
    totalReviews,
    totalCorrect,
    currentStreak: 12,
    longestStreak: 21,
    lastStudyDate: daily[daily.length - 1].reviewed > 0 ? daily[daily.length - 1].date : daily[daily.length - 2].date,
    daily,
    unlocked: [
      { id: "first-deck", unlockedAt: iso(88 * DAY) },
      { id: "first-session", unlockedAt: iso(87 * DAY) },
      { id: "hundred-cards", unlockedAt: iso(60 * DAY) },
      { id: "five-hundred-cards", unlockedAt: iso(20 * DAY) },
      { id: "streak-7", unlockedAt: iso(30 * DAY) },
      { id: "perfect-session", unlockedAt: iso(6 * DAY) },
      { id: "level-10", unlockedAt: iso(12 * DAY) },
    ],
  };

  const goals: MaterialGoal[] = [];

  const lang = seedLanguages();
  const { quizzes, quizAttempts, quizActivities } = seedQuizzes();
  activities.push(...quizActivities);

  return {
    version: SCHEMA_VERSION,
    user: MOCK_USER,
    decks,
    cards,
    materials,
    learningItems,
    activities,
    goals,
    reviews: [],
    sessions: [],
    stats,
    languages: lang.languages,
    vocab: lang.vocab,
    languageReviews: lang.reviews,
    languageSessions: [],
    languageActivities: lang.activities,
    pronunciationAttempts: [],
    languageGoals: [],
    conversationSessions: lang.conversationSessions,
    quizzes,
    quizAttempts,
  };
}

/* ------------------------------------------------------------------ */
/*  Seed a Mandarin language profile with real progress               */
/* ------------------------------------------------------------------ */

function seedLanguages(): {
  languages: LanguageProfile[];
  vocab: LanguageVocabularyItem[];
  reviews: LanguageReview[];
  activities: LanguageActivity[];
  conversationSessions: ConversationSession[];
} {
  const profile: LanguageProfile = {
    id: "lang_mandarin",
    userId: MOCK_USER.id,
    languageId: "mandarin",
    level: "beginner",
    goal: "travel",
    dailyMinutes: 15,
    romanizationMode: "tap",
    createdAt: iso(21 * DAY),
    streak: 6,
    longestStreak: 9,
    lastSessionDate: todayKey(new Date(now - DAY)),
    xp: 640,
  };

  const vocab = seedVocabForProfile(profile.id, "mandarin", "beginner");
  // Give the first ~10 words real review history so Vocabulary scores ~65%.
  const profiles = [
    { reps: 4, interval: 15, ease: 2.6 },
    { reps: 3, interval: 8, ease: 2.5 },
    { reps: 5, interval: 26, ease: 2.7 },
    { reps: 2, interval: 3, ease: 2.4 },
    { reps: 3, interval: 8, ease: 2.5 },
    { reps: 1, interval: 1, ease: 2.4 },
    { reps: 4, interval: 15, ease: 2.6 },
    { reps: 2, interval: 3, ease: 2.4 },
    { reps: 3, interval: 8, ease: 2.5 },
    { reps: 1, interval: 1, ease: 2.4 },
  ];
  vocab.forEach((v, i) => {
    const p = profiles[i];
    if (!p) return;
    v.repetitions = p.reps;
    v.intervalDays = p.interval;
    v.ease = p.ease;
    v.lastReviewedAt = iso((p.interval > 4 ? 2 : 0.5) * DAY);
    v.dueAt = new Date(now + (p.interval - 2) * DAY).toISOString();
  });

  const reviews: LanguageReview[] = [];
  const pushReviews = (
    skill: LanguageReview["skill"],
    mode: LanguageReview["mode"],
    results: boolean[],
    daysAgo: number,
  ) => {
    results.forEach((ok, i) => {
      reviews.push({
        id: `lr_${skill}_${mode}_${i}`,
        profileId: profile.id,
        vocabId: vocab[i % vocab.length]?.id ?? null,
        skill,
        mode,
        correct: ok,
        responseMs: 3000 + i * 200,
        xpEarned: ok ? 6 : 2,
        at: iso(daysAgo * DAY - i * 60_000),
      });
    });
  };
  pushReviews("vocabulary", "review", [true, true, true, false, true, true, true, true], 2);
  pushReviews("listening", "listening", [true, false, false, true, false, true], 2);
  pushReviews("reading", "reading", [true, true, false, true], 3);

  const activities: LanguageActivity[] = [
    {
      id: "la_1",
      profileId: profile.id,
      languageId: "mandarin",
      type: "language-added",
      at: iso(21 * DAY),
      detail: "Started learning Mandarin Chinese",
    },
    {
      id: "la_2",
      profileId: profile.id,
      languageId: "mandarin",
      type: "session-completed",
      at: iso(2 * DAY),
      reviewed: 14,
      correct: 12,
      accuracy: 86,
      xpEarned: 90,
      skills: ["vocabulary", "listening"],
      detail: "15-minute session",
    },
    {
      id: "la_3",
      profileId: profile.id,
      languageId: "mandarin",
      type: "session-completed",
      at: iso(1 * DAY),
      reviewed: 12,
      correct: 11,
      accuracy: 92,
      xpEarned: 84,
      skills: ["vocabulary", "reading"],
      detail: "15-minute session",
    },
  ];

  const conversationSessions: ConversationSession[] = [
    {
      id: "cs_seed_1",
      profileId: profile.id,
      languageId: "mandarin",
      scenarioId: "cn-ordering-food",
      scenarioTitle: "Ordering Food & Drinks",
      category: "food",
      startedAt: iso(2 * DAY + 6 * 60_000),
      endedAt: iso(2 * DAY),
      turnsCompleted: 4,
      modesUsed: ["suggested", "build"],
      vocabEncountered: ["咖啡", "我要", "一杯", "多少钱", "面包", "谢谢"],
      vocabAdded: ["咖啡", "多少钱"],
      appropriateChoices: 4,
      gradedChoices: 4,
      xpEarned: 53,
    },
  ];

  activities.push({
    id: "la_conv_1",
    profileId: profile.id,
    languageId: "mandarin",
    type: "conversation-completed",
    at: iso(2 * DAY),
    detail: "Ordering Food & Drinks — 6 vocabulary words",
    xpEarned: 53,
  });

  return { languages: [profile], vocab, reviews, activities, conversationSessions };
}

/* ------------------------------------------------------------------ */
/*  Seed quizzes — one per source type, with real attempt history      */
/* ------------------------------------------------------------------ */

function seedQuizzes(): {
  quizzes: Quiz[];
  quizAttempts: QuizAttempt[];
  quizActivities: LearningActivity[];
} {
  const bioQuiz: Quiz = {
    id: "quiz_bio",
    title: "Cell Biology — Chapter 4",
    source: {
      type: "material",
      id: "mat_bio_notes",
      label: "Cell Biology — Chapter 4",
      icon: "📄",
    },
    createdAt: iso(9 * DAY),
    status: "ready",
    recipe: {
      size: 6,
      types: ["multiple-choice", "true-false", "short-answer"],
      difficulty: "intermediate",
      focus: "concepts",
    },
    questions: [
      {
        id: "qbio1",
        type: "multiple-choice",
        prompt:
          'Which term matches this description?\n\n"Produces ATP through aerobic respiration — the cell\'s main energy currency."',
        options: ["Ribosomes", "Mitochondria", "Cell membrane", "Enzymes"],
        answer: "Mitochondria",
        explanation:
          "Mitochondria: the powerhouse of the cell; produces ATP via aerobic respiration.",
        topic: "Mitochondria",
      },
      {
        id: "qbio2",
        type: "true-false",
        prompt:
          'True or false — "Photosynthesis" means: the diffusion of water across a semipermeable membrane.',
        answer: "False",
        explanation:
          "False. Photosynthesis converts light energy, water, and CO₂ into glucose and oxygen.",
        topic: "Photosynthesis",
      },
      {
        id: "qbio3",
        type: "short-answer",
        prompt: "In your own words, define: Ribosomes",
        acceptedAnswers: [
          "Ribosomes synthesize proteins by translating messenger RNA into chains of amino acids.",
          "Synthesize proteins by translating mRNA into chains of amino acids.",
        ],
        explanation:
          "Reference answer — Ribosomes synthesize proteins by translating messenger RNA into chains of amino acids.",
        topic: "Ribosomes",
      },
      {
        id: "qbio4",
        type: "multiple-choice",
        prompt:
          'Which term matches this description?\n\n"A biological catalyst, usually a protein, that lowers the activation energy of a reaction."',
        options: ["Osmosis", "Enzyme", "Ribosome", "Chloroplast"],
        answer: "Enzyme",
        explanation:
          "Enzyme: a biological catalyst that lowers activation energy without being consumed.",
        topic: "Enzymes",
      },
      {
        id: "qbio5",
        type: "true-false",
        prompt:
          'True or false — "Cell membrane" means: a selectively permeable phospholipid bilayer that controls what enters and leaves the cell.',
        answer: "True",
        explanation:
          "True. The cell membrane is a selectively permeable phospholipid bilayer.",
        topic: "Cell membrane",
      },
      {
        id: "qbio6",
        type: "short-answer",
        prompt: "In your own words, define: Osmosis",
        acceptedAnswers: [
          "Osmosis is the diffusion of water across a semipermeable membrane from lower to higher solute concentration.",
          "Diffusion of water across a semipermeable membrane toward higher solute concentration.",
        ],
        explanation:
          "Reference answer — the diffusion of water across a semipermeable membrane from a region of lower solute concentration to a region of higher solute concentration.",
        topic: "Osmosis",
      },
    ],
  };

  const marketingQuiz: Quiz = {
    id: "quiz_marketing",
    title: "Marketing Fundamentals",
    source: { type: "manual", id: null, label: "Marketing Fundamentals", icon: "✍️" },
    createdAt: iso(2 * DAY),
    status: "ready",
    questions: [
      {
        id: "qmk1",
        type: "multiple-choice",
        prompt: "What does CAC stand for?",
        options: [
          "Customer Acquisition Cost",
          "Customer Account Credit",
          "Cost Analysis Control",
          "Channel Attribution Curve",
        ],
        answer: "Customer Acquisition Cost",
      },
      {
        id: "qmk2",
        type: "true-false",
        prompt:
          "True or false — a healthy LTV:CAC ratio for SaaS is roughly 3:1 or higher.",
        answer: "True",
      },
      {
        id: "qmk3",
        type: "short-answer",
        prompt: "What is a 'moat' in business strategy?",
        acceptedAnswers: [
          "a durable structural advantage that protects margins from competition",
          "a durable competitive advantage",
        ],
      },
      {
        id: "qmk4",
        type: "fill-blank",
        prompt: "The four Ps of marketing are Product, Price, Place, and ____.",
        acceptedAnswers: ["Promotion"],
      },
      {
        id: "qmk5",
        type: "multiple-choice",
        prompt: "Which metric measures revenue retained from existing customers?",
        options: [
          "Net Revenue Retention",
          "Gross Margin",
          "Burn Rate",
          "Runway",
        ],
        answer: "Net Revenue Retention",
      },
    ],
  };

  const langQuiz: Quiz = {
    id: "quiz_lang_food",
    title: "Mandarin — Food & Drinks",
    source: {
      type: "language",
      id: "lang_mandarin",
      label: "Mandarin — Food & Drinks",
      icon: "🇨🇳",
      languageMode: "vocabulary",
    },
    createdAt: iso(1 * DAY),
    status: "ready",
    recipe: { size: 5, types: ["multiple-choice", "true-false"], languageMode: "vocabulary" },
    questions: [
      {
        id: "qlf1",
        type: "multiple-choice",
        prompt: "What does 水 mean?",
        options: ["water", "tea", "rice", "food"],
        answer: "water",
        explanation: "水 (shuǐ) — water",
      },
      {
        id: "qlf2",
        type: "multiple-choice",
        prompt: "What does 吃 mean?",
        options: ["to drink", "to eat", "to want", "to go"],
        answer: "to eat",
        explanation: "吃 (chī) — to eat",
      },
      {
        id: "qlf3",
        type: "true-false",
        prompt: 'True or false — 喝 means "to drink"',
        answer: "True",
        explanation: "喝 (hē) — to drink",
      },
      {
        id: "qlf4",
        type: "multiple-choice",
        prompt: "What does 谢谢 mean?",
        options: ["hello", "goodbye", "thank you", "sorry"],
        answer: "thank you",
        explanation: "谢谢 (xiè xie) — thank you",
      },
      {
        id: "qlf5",
        type: "true-false",
        prompt: 'True or false — 你好 means "goodbye"',
        answer: "False",
        explanation: "你好 (nǐ hǎo) — hello",
      },
    ],
  };

  const bioAttempts: QuizAttempt[] = [
    mkAttempt("quiz_bio", bioQuiz.questions, [true, false, true, true, false, false], 8, 372_000),
    mkAttempt("quiz_bio", bioQuiz.questions, [true, true, true, false, true, false], 4, 402_000),
    mkAttempt("quiz_bio", bioQuiz.questions, [true, true, true, true, true, false], 1, 341_000),
  ];
  const langAttempts: QuizAttempt[] = [
    mkAttempt("quiz_lang_food", langQuiz.questions, [true, true, true, true, false], 0.5, 96_000),
  ];

  const quizActivities: LearningActivity[] = [
    {
      id: "act_quiz_bio_1",
      type: "quiz-attempt",
      materialId: "mat_bio_notes",
      deckId: null,
      at: iso(8 * DAY),
      reviewed: 6,
      correct: 3,
      incorrect: 3,
      accuracy: 50,
      xpEarned: 24,
      detail: "50% score",
    },
    {
      id: "act_quiz_bio_2",
      type: "quiz-attempt",
      materialId: "mat_bio_notes",
      deckId: null,
      at: iso(4 * DAY),
      reviewed: 6,
      correct: 4,
      incorrect: 2,
      accuracy: 67,
      xpEarned: 32,
      detail: "67% score",
    },
    {
      id: "act_quiz_bio_3",
      type: "quiz-attempt",
      materialId: "mat_bio_notes",
      deckId: null,
      at: iso(1 * DAY),
      reviewed: 6,
      correct: 5,
      incorrect: 1,
      accuracy: 83,
      xpEarned: 40,
      detail: "83% score",
    },
  ];

  return {
    quizzes: [bioQuiz, marketingQuiz, langQuiz],
    quizAttempts: [...bioAttempts, ...langAttempts],
    quizActivities,
  };
}

function mkAttempt(
  quizId: string,
  questions: { id: string; type: Quiz["questions"][number]["type"] }[],
  results: boolean[],
  daysAgo: number,
  durationMs: number,
): QuizAttempt {
  const answers = questions.map((q, i) => ({
    questionId: q.id,
    type: q.type,
    correct: results[i] ?? false,
    given: results[i] ? "—" : "—",
  }));
  const correct = answers.filter((a) => a.correct).length;
  return {
    id: `qa_${quizId}_${Math.round(daysAgo * 10)}`,
    quizId,
    startedAt: iso(daysAgo * DAY + durationMs),
    finishedAt: iso(daysAgo * DAY),
    answers,
    correct,
    total: answers.length,
    score: Math.round((correct / answers.length) * 100),
    durationMs,
  };
}

/** Homepage marketing statistics (aspirational product-level numbers). */
export const LANDING_STATS = [
  { value: 10_000, suffix: "+", label: "Cards mastered daily" },
  { value: 92, suffix: "%", label: "Average recall accuracy" },
  { value: 1.2, suffix: "M+", label: "Flashcards created", decimals: 1 },
  { value: 14, suffix: " days", label: "Average streak length" },
];
