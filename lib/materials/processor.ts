/**
 * Study material processing — service layer.
 *
 *   UI  →  StudyMaterialService  →  StudyMaterialProcessor  →  (future) AI provider
 *
 * The UI never talks to a processor directly. Today the only processor is
 * `LocalHeuristicProcessor`, which does honest, deterministic text wrangling on
 * material we can actually read (txt / md / csv). It never claims to have
 * "understood" a file — for PDFs and images it reports that extraction isn't
 * available yet.
 *
 * To add AI later: implement `StudyMaterialProcessor` with an API-backed class
 * and return it from `getProcessor()` based on config. Nothing else changes.
 */

import type {
  GenerationConfig,
  QuizQuestion,
  StudyGuideSection,
  StudyMaterial,
  SummaryContent,
} from "@/lib/types";
import { isExtractable } from "@/lib/materials/text-extract";
import { uid } from "@/lib/utils";

export class ProcessorUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProcessorUnavailableError";
  }
}

export interface DraftFlashcard {
  question: string;
  answer: string;
  tags: string[];
}

export interface GenerateArgs {
  material: StudyMaterial;
  config: GenerationConfig;
}

export interface StudyMaterialProcessor {
  readonly id: string;
  readonly label: string;
  /** Can we get usable text out of this material right now? */
  canProcess(material: StudyMaterial): boolean;
  extractText(material: StudyMaterial): Promise<{ text: string; truncated: boolean }>;
  generateFlashcards(args: GenerateArgs): Promise<DraftFlashcard[]>;
  generateQuiz(args: GenerateArgs): Promise<QuizQuestion[]>;
  generateStudyGuide(args: GenerateArgs): Promise<StudyGuideSection[]>;
  generateSummary(args: GenerateArgs): Promise<SummaryContent>;
}

/* ------------------------------------------------------------------ */
/*  Text helpers                                                       */
/* ------------------------------------------------------------------ */

export interface Pair {
  term: string;
  definition: string;
}

function splitSentences(text: string): string[] {
  return text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+(?=[A-Z0-9"'À-ſ])/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function splitParagraphs(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\s+\n/g, "\n").trim())
    .filter(Boolean);
}

function stripMd(s: string): string {
  return s
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/__(.+?)__/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/`(.+?)`/g, "$1")
    .replace(/^#+\s*/, "")
    .replace(/^>\s?/, "")
    .replace(/^[-*+]\s+/, "")
    .replace(/^\d+[.)]\s+/, "")
    .trim();
}

function cleanText(text: string): string {
  return text.replace(/\r\n/g, "\n").replace(/ /g, " ").trim();
}

type MatKind = "pdf" | "image" | "text" | "markdown" | "csv" | "other";

function splitCsvLine(line: string, delim: string): string[] {
  // minimal quote-aware split
  const out: string[] = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQ && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else inQ = !inQ;
    } else if (ch === delim && !inQ) {
      out.push(cur);
      cur = "";
    } else cur += ch;
  }
  out.push(cur);
  return out.map((c) => c.trim());
}

export function cleanMaterialText(text: string): string {
  return cleanText(text);
}

/** Extract term → definition pairs using real, explainable rules. */
export function extractPairs(text: string, kind: MatKind): Pair[] {
  const pairs: Pair[] = [];
  const seen = new Set<string>();
  const push = (term: string, definition: string) => {
    term = stripMd(term).replace(/[\s:–—-]+$/, "").trim();
    definition = stripMd(definition).replace(/^[\s:–—-]+/, "").trim();
    // a term is a label, not a sentence
    const words = term.split(/\s+/);
    if (term.length < 2 || term.length > 60 || words.length > 6) return;
    if (/[.!?]$/.test(term)) return;
    if (definition.length < 10 || definition.length > 700) return;
    const key = term.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    pairs.push({ term, definition });
  };

  const lines = text.split("\n");

  // ---- CSV / TSV: only for actual spreadsheet files ----
  if (kind === "csv") {
    const nonEmpty = lines.filter((l) => l.trim());
    const delim = nonEmpty[0]?.includes("\t")
      ? "\t"
      : nonEmpty[0]?.includes(";") && !nonEmpty[0].includes(",")
        ? ";"
        : ",";
    let first = true;
    for (const line of nonEmpty) {
      const cols = splitCsvLine(line, delim);
      if (cols.length < 2) continue;
      if (
        first &&
        /^(term|question|front|word|concept|key|name)$/i.test(cols[0]) &&
        /^(definition|answer|back|meaning|value|description|notes?)$/i.test(cols[1])
      ) {
        first = false;
        continue;
      }
      first = false;
      push(cols[0], cols.slice(1).join(" — "));
    }
    return pairs;
  }

  // ---- Markdown / notes: heading + following block is the strongest signal ----
  for (let i = 0; i < lines.length; i++) {
    const h = lines[i].match(/^\s*#{1,6}\s+(.{2,60})\s*$/);
    if (!h) continue;
    let j = i + 1;
    while (j < lines.length && !lines[j].trim()) j++;
    const body: string[] = [];
    while (
      j < lines.length &&
      lines[j].trim() &&
      !/^\s*#{1,6}\s/.test(lines[j])
    ) {
      body.push(stripMd(lines[j]));
      j++;
    }
    if (body.length) push(h[1], body.join(" ").replace(/\s+/g, " ").slice(0, 520));
  }

  // ---- Explicit "Term: definition" (colon only) and "**Term** — definition" ----
  for (const raw of lines) {
    const line = raw.trim();
    if (!line || /^https?:/i.test(line) || /^#{1,6}\s/.test(line)) continue;

    // bold-led definition list item
    const bold = line.match(
      /^\s*(?:[-*+]\s+|\d+[.)]\s+)?\*\*(.{2,50}?)\*\*\s*[:–—-]?\s+(.{10,})$/,
    );
    if (bold) {
      push(bold[1], bold[2]);
      continue;
    }

    // "Short Label: definition" — label must be short, capitalised-ish, colon
    const colon = line.match(/^\s*(?:[-*+]\s+|\d+[.)]\s+)?([^:]{2,45}?):\s+(.{10,})$/);
    if (colon) {
      const label = colon[1].trim();
      const labelWords = label.split(/\s+/).length;
      if (
        labelWords <= 5 &&
        !/[.!?,]$/.test(label) &&
        /^[A-Z0-9"'(]/.test(label)
      ) {
        push(label, colon[2]);
      }
    }
  }

  return pairs;
}

/** Cloze ("fill the blank") cards from salient sentences — a fallback. */
export function clozeCards(text: string, limit: number): DraftFlashcard[] {
  const out: DraftFlashcard[] = [];
  // strip markdown structure so we cloze real prose, not "# Heading"
  const prose = text
    .split("\n")
    .filter((l) => l.trim() && !/^\s*#{1,6}\s/.test(l))
    .map((l) => stripMd(l))
    .join(" ");
  for (const sentence of splitSentences(prose)) {
    const words = sentence.split(/\s+/);
    if (words.length < 7 || words.length > 30) continue;
    let idx = -1;
    for (let i = 2; i < words.length - 1; i++) {
      const w = words[i].replace(/[^\p{L}\p{N}%°-]/gu, "");
      if (!w || w.length < 4) continue;
      if (/^\d[\d.,%]*$/.test(w) || /^\p{Lu}/u.test(w)) {
        idx = i;
        break;
      }
    }
    if (idx === -1) continue;
    const answer = words[idx].replace(/[.,;:!?)]+$/, "").replace(/^[("]+/, "");
    if (answer.length < 3) continue;
    const blanked = words
      .map((w, i) => (i === idx ? w.replace(answer, "_____") : w))
      .join(" ");
    out.push({
      question: `Fill in the blank: ${blanked}`,
      answer,
      tags: ["cloze"],
    });
    if (out.length >= limit) break;
  }
  return out;
}

/**
 * Honestly extract the topics / knowledge areas covered by a material — only
 * from text we can actually read (markdown headings, CSV/term columns, or clear
 * "Term:" lines). Never invents topics for PDFs or images.
 */
export function extractTopics(material: StudyMaterial): string[] {
  if (
    !isExtractable(material.kind) ||
    typeof material.extractedText !== "string" ||
    !material.extractedText.trim()
  ) {
    return [];
  }
  const text = cleanText(material.extractedText);
  const topics: string[] = [];
  const seen = new Set<string>();
  const add = (t: string) => {
    const clean = stripMd(t).replace(/[:–—-]\s*$/, "").trim();
    const key = clean.toLowerCase();
    if (clean.length >= 2 && clean.length <= 48 && !seen.has(key)) {
      seen.add(key);
      topics.push(clean);
    }
  };

  // markdown headings (skip the document title, i.e. a lone level-1 heading)
  const headings = text
    .split("\n")
    .map((l) => l.match(/^\s*(#{1,6})\s+(.{2,60})\s*$/))
    .filter(Boolean) as RegExpMatchArray[];
  const nonTitle = headings.filter((h) => h[1].length >= 2);
  (nonTitle.length ? nonTitle : headings).forEach((h) => add(h[2]));

  if (topics.length < 2) {
    for (const p of extractPairs(text, material.kind)) add(p.term);
  }

  return topics.slice(0, 12);
}

function questionFor(pair: Pair, focus: GenerationConfig["focus"]): string {
  const t = pair.term;
  if (/[?]$/.test(t)) return t;
  if (focus === "definitions") return `Define ${t}.`;
  if (focus === "facts") return `What's the key fact about ${t}?`;
  return /^[A-Z0-9]/.test(t) ? `What is ${t}?` : `What is "${t}"?`;
}

function pickDistractors(all: string[], correct: string, n: number): string[] {
  const pool = all.filter((x) => x.toLowerCase() !== correct.toLowerCase());
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, n);
}

/* ------------------------------------------------------------------ */
/*  Local heuristic processor                                          */
/* ------------------------------------------------------------------ */

class LocalHeuristicProcessor implements StudyMaterialProcessor {
  readonly id = "local-heuristic";
  readonly label = "Text extraction (on-device)";

  canProcess(material: StudyMaterial): boolean {
    return (
      isExtractable(material.kind) &&
      typeof material.extractedText === "string" &&
      material.extractedText.trim().length > 0
    );
  }

  private text(material: StudyMaterial): string {
    if (!this.canProcess(material)) {
      throw new ProcessorUnavailableError(
        "We can't read the text inside this file yet. Upload a .txt, .md, or .csv file, or connect an AI provider to process PDFs and images.",
      );
    }
    return cleanText(material.extractedText as string);
  }

  async extractText(material: StudyMaterial) {
    return {
      text: this.text(material),
      truncated: material.textTruncated,
    };
  }

  async generateFlashcards({ material, config }: GenerateArgs): Promise<DraftFlashcard[]> {
    const text = this.text(material);
    const count = config.count ?? 15;
    const pairs = extractPairs(text, material.kind);
    const cards: DraftFlashcard[] = pairs.map((p) => ({
      question: questionFor(p, config.focus),
      answer: p.definition,
      tags: [],
    }));

    if (cards.length < count) {
      cards.push(...clozeCards(text, count - cards.length));
    }

    // difficulty nudges ordering / trimming
    if (config.difficulty === "beginner") {
      cards.sort((a, b) => a.answer.length - b.answer.length);
    } else if (config.difficulty === "advanced") {
      cards.sort((a, b) => b.answer.length - a.answer.length);
    }

    return cards.slice(0, count);
  }

  async generateQuiz({ material, config }: GenerateArgs): Promise<QuizQuestion[]> {
    const text = this.text(material);
    const count = config.count ?? 10;
    const pairs = extractPairs(text, material.kind);
    const terms = pairs.map((p) => p.term);
    const questions: QuizQuestion[] = [];

    pairs.forEach((pair, i) => {
      if (questions.length >= count) return;
      const mode = i % 3;
      if (mode === 0 && terms.length >= 4) {
        const distractors = pickDistractors(terms, pair.term, 3);
        const options = [pair.term, ...distractors].sort(() => Math.random() - 0.5);
        questions.push({
          id: uid("q"),
          type: "multiple-choice",
          prompt: `Which term matches this description?\n\n"${pair.definition}"`,
          options,
          answer: pair.term,
          explanation: `${pair.term}: ${pair.definition}`,
        });
      } else if (mode === 1 && pairs.length >= 2) {
        const flip = Math.random() < 0.5;
        const other = pairs[(i + 1) % pairs.length];
        const shownDef = flip ? other.definition : pair.definition;
        questions.push({
          id: uid("q"),
          type: "true-false",
          prompt: `True or false: "${pair.term}" means — ${shownDef}`,
          answer: flip ? "False" : "True",
          explanation: flip
            ? `False. ${pair.term}: ${pair.definition}`
            : `True. ${pair.term}: ${pair.definition}`,
        });
      } else {
        questions.push({
          id: uid("q"),
          type: "short-answer",
          prompt: `In your own words, define: ${pair.term}`,
          answer: pair.definition,
          explanation: `Reference answer — ${pair.definition}`,
        });
      }
    });

    if (questions.length < count) {
      for (const c of clozeCards(text, count - questions.length)) {
        questions.push({
          id: uid("q"),
          type: "short-answer",
          prompt: c.question,
          answer: c.answer,
        });
      }
    }

    return questions.slice(0, count);
  }

  async generateStudyGuide({ material }: GenerateArgs): Promise<StudyGuideSection[]> {
    const text = this.text(material);
    const sections: StudyGuideSection[] = [];

    // Markdown headings define sections
    const lines = text.split("\n");
    let current: StudyGuideSection | null = null;
    for (const line of lines) {
      const h = line.match(/^#{1,4}\s+(.{2,100})$/);
      if (h) {
        if (current && current.points.length) sections.push(current);
        current = { heading: stripMd(h[1]), points: [] };
        continue;
      }
      const t = line.trim();
      if (!t) continue;
      if (!current) current = { heading: "Overview", points: [] };
      if (/^[-*+]\s+/.test(t) || /^\d+\.\s+/.test(t)) {
        current.points.push(stripMd(t));
      } else {
        for (const s of splitSentences(t)) {
          if (s.length > 12) current.points.push(s);
        }
      }
    }
    if (current && current.points.length) sections.push(current);

    // Plain text with no headings → paragraphs become sections
    if (sections.length <= 1 && splitParagraphs(text).length > 1) {
      sections.length = 0;
      splitParagraphs(text).forEach((para, i) => {
        const sents = splitSentences(para);
        if (!sents.length) return;
        const heading =
          sents[0].length <= 70
            ? sents[0].replace(/[.!?]$/, "")
            : `Section ${i + 1}`;
        sections.push({
          heading,
          points: (sents[0].length <= 70 ? sents.slice(1) : sents).filter(
            (s) => s.length > 12,
          ),
        });
      });
    }

    return sections
      .map((s) => ({ ...s, points: s.points.slice(0, 8) }))
      .filter((s) => s.points.length)
      .slice(0, 12);
  }

  async generateSummary({ material }: GenerateArgs): Promise<SummaryContent> {
    const text = this.text(material);
    const pairs = extractPairs(text, material.kind);
    // paragraphs that are actual prose (not just a heading line)
    const proseParas = splitParagraphs(text)
      .map((p) =>
        p
          .split("\n")
          .filter((l) => !/^\s*#{1,6}\s/.test(l))
          .map((l) => stripMd(l))
          .join(" ")
          .trim(),
      )
      .filter((p) => p.length > 30);

    let overview: string;
    if (proseParas[0]) {
      overview =
        proseParas[0].length > 340
          ? proseParas[0].slice(0, 340).trim() + "…"
          : proseParas[0];
    } else if (pairs.length) {
      overview = `This material covers ${pairs.length} key topic${
        pairs.length === 1 ? "" : "s"
      }: ${pairs.map((p) => p.term).slice(0, 6).join(", ")}.`;
    } else {
      overview = stripMd(splitSentences(text).slice(0, 2).join(" "));
    }

    const keyPoints: string[] = [];
    if (pairs.length >= 3) {
      for (const p of pairs) {
        const first = splitSentences(p.definition)[0] ?? p.definition;
        keyPoints.push(first.length > 140 ? first.slice(0, 140).trim() + "…" : first);
        if (keyPoints.length >= 7) break;
      }
    } else {
      for (const para of proseParas.slice(0, 7)) {
        const first = splitSentences(para)[0];
        if (first && first.length > 20 && !keyPoints.includes(first))
          keyPoints.push(first);
      }
    }

    return {
      overview,
      keyPoints: keyPoints.slice(0, 7),
      keyTerms: pairs.slice(0, 8).map((p) => ({
        term: p.term,
        definition:
          p.definition.length > 170
            ? p.definition.slice(0, 170).trim() + "…"
            : p.definition,
      })),
    };
  }
}

/* ------------------------------------------------------------------ */
/*  Service                                                            */
/* ------------------------------------------------------------------ */

const localProcessor = new LocalHeuristicProcessor();

/**
 * Returns the active processor. When an AI provider is configured this is where
 * you'd branch (e.g. `return env.AI_ENABLED ? aiProcessor : localProcessor`).
 */
export function getProcessor(): StudyMaterialProcessor {
  return localProcessor;
}

/** Small delay so the "Preparing your study material…" state is visible. */
export function processingDelay(ms = 700): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export const StudyMaterialService = {
  canGenerate(material: StudyMaterial): boolean {
    return getProcessor().canProcess(material);
  },
  extractText(material: StudyMaterial) {
    return getProcessor().extractText(material);
  },
  generateFlashcards(args: GenerateArgs) {
    return getProcessor().generateFlashcards(args);
  },
  generateQuiz(args: GenerateArgs) {
    return getProcessor().generateQuiz(args);
  },
  generateStudyGuide(args: GenerateArgs) {
    return getProcessor().generateStudyGuide(args);
  },
  generateSummary(args: GenerateArgs) {
    return getProcessor().generateSummary(args);
  },
};
