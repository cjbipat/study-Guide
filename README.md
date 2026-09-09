# Ember — a vivid flashcard learning platform

A modern, gamified spaced-repetition app. Build decks, study cards, and get a
programmatic fireworks celebration every time you nail an answer.

Inspired by the information architecture of open-source spaced-repetition tools,
but rebuilt as a bright, rewarding, premium learning product. Not affiliated with
Anki.

## Stack

- **Next.js 16** (App Router) · **React 19** · **TypeScript**
- **Tailwind CSS v4** (CSS-first config in `app/globals.css`)
- **Framer Motion** for UI motion
- **Canvas** for the fireworks particle engine (no libraries, no GIFs)
- **Lucide** icons

## Run it

```bash
npm install
npm run dev      # http://localhost:3000
```

```bash
npm run build && npm start   # production
```

## The signature feature: `<Fireworks />`

`components/fireworks/` contains a self-contained particle system:

- `fireworks-engine.ts` — framework-agnostic physics + rendering (rockets,
  multi-ring bursts, spark trails via additive blending, gravity, drag, glitter,
  auto-cleanup, hard particle cap).
- `Fireworks.tsx` — a click-through full-viewport `<canvas>`. The render loop is
  fully decoupled from React; a `trigger` prop change is the only input. Races
  `requestAnimationFrame` against a timeout so the animation still completes and
  cleans up in a backgrounded tab.
- `fireworks-context.tsx` — one canvas for the whole app: `useFireworks().celebrate({ intensity, durationMs, colors, originYRatio })`.
- `ReducedCelebration.tsx` — `prefers-reduced-motion` swap: a single calm success
  pulse instead of the particle storm.

Fireworks fire only on **Good / Easy** (and milestone achievements). "Again" gets
a gentle shake, a soft "Not quite", and a requeue — never a punishment.

## Data layer (mock now, swappable later)

All state lives in `lib/`:

- `types.ts` — `User`, `Deck`, `Card`, `StudyMaterial`, `LearningItem`, `Review`,
  `StudySession`, `Achievement`, `UserStats`, modelled like relational tables.
- `store.ts` — pure reducers over an immutable `DatabaseSnapshot`. Persistence is
  isolated to `loadSnapshot` / `saveSnapshot` (currently `localStorage`). Swap
  those two functions for Supabase and nothing else changes.
- `store-context.tsx` — the React binding (`useStore`, `useDecks`, `useStats`).
- `study/scheduler.ts` — an SM-2-inspired scheduler + mastery model.
- `xp.ts`, `achievements.ts` — the gamification rules.
- `mock-data.ts` — seed decks with real study content (Biology, Japanese, CS,
  Business, Spanish, World History) plus seeded study materials.

## Language Learning Mode

A second full product area, sharing the same store, fireworks, XP, and streak
systems. Study anything you upload **and** learn any language.

- `/languages` — onboarding + "My Languages". `/languages/new` runs a 4-step
  wizard (language → level → goal → daily minutes).
- `/languages/[id]` — the language dashboard: **Today's Session** plan (adapts to
  the time budget + weak skills), a `getLanguageRecommendation()` card, per-skill
  progress bars (Vocabulary / Listening / Speaking / Reading / Writing /
  Pronunciation), the practice grid, and daily challenges.
- `/languages/[id]/session` and `/languages/[id]/practice/[mode]` — chrome-free,
  driven by `PracticeRunner`. Modes: learn, review, listening, speaking,
  shadowing (Listen & Repeat), reading (tap words → add to vocab), writing
  (translate / arrange), characters, tones.
- `/languages/[id]/practice/conversation` — **Contextual Conversation Mode**. A
  library of pre-authored scenario trees (Meeting Someone, Ordering Food, Shopping,
  Getting Around, Family & Friends, Work & Career, Travel) → setup screen →
  immersive chat. Four honest response modes: suggested (multiple choice, graded
  against the authored `appropriate` flag), build-the-sentence (word tiles),
  type (**never graded** — shows *"Automatic conversation feedback is coming
  soon."* + a model line), speak (uses the `Recorder`, no fake pronunciation
  score). Progressive 💡 hints (vocab → structure → example). Tap any word in a
  partner line for meaning + *Add to Vocabulary* (dedupes — *"Already in your
  vocabulary."*). "Conversation Complete" review screen: *You Practiced* checklist,
  *Words to Remember* → *Add all to review* / *Choose vocabulary* into the normal
  spaced schedule. Difficulty adapts by learner level; Mandarin honours the
  `romanizationMode` (Always / On tap / Hide). Content:
  `lib/language/conversation-content.ts`; provider seam:
  `ConversationProvider` + `StructuredConversationProvider`
  (`lib/language/conversation.ts`) — deterministic today, drop-in
  `AIConversationProvider` later with no UI change. Progress is concrete
  (scenarios completed / words used / conversation streak — **no fluency score**).
  Fireworks only on milestones: 1st conversation, 10, 50, category completion.
  `buildSessionPlan()` folds a conversation block into Today's Session when the
  learner is ready; `getLanguageRecommendation()` adds *"Ready to Use What You've
  Learned?"* and *"Practice Travel Conversations"*.
- **Active recall — the answer is never shown before you try.** Vocabulary
  practice is a two-phase card: PHASE 1 shows only the question (`QUICK CHECK ·
  What does 吃 mean?`) with **Show Answer** (or an optional typed attempt) — no
  meaning, pinyin, or give-away example; PHASE 2 animates the reveal
  (吃 → chī → to eat → audio → example) then asks **How well did you remember?**
  → *Again / Hard / Good / Easy* straight into the scheduler. Keyboard: `Space`
  reveals, `1‑4` grade, `Enter` checks a typed answer.
- **`VocabularyExerciseGenerator`** (`lib/language/vocabulary-exercises.ts`)
  rotates the *direction* of practice deterministically (never random repeats),
  driven by familiarity, past mistakes, level, and skill balance:
  target→meaning, meaning→target, audio→meaning, audio→target,
  context-cloze, sentence-use. Multiple-choice options are always target-language
  forms — never an English meaning. More advanced words appear in context sooner.
- Typed answers are checked against the primary translation + deterministic
  alternates (`acceptedMeanings` — splits on `/`, drops `to `, strips
  parentheticals; pinyin tone-marks normalized). A typed answer that can't be
  confidently matched is **not marked wrong** — the answer is shown and the
  learner self-rates.
- Vocabulary integrates with spaced review via **`LanguageReviewScheduler`**
  (configurable, `lib/language/scheduler.ts`); `recordReview` now accepts an
  explicit `grade` from the self-rating.
- **Audio provider stack** (`lib/language/audio/`) — `LanguageAudioController`
  tries providers in priority order and falls back transparently:
  1. **`NeuralAudioProvider`** — a configurable cloud neural TTS, the preferred
     production source. Ships **unconfigured** (an honest seam like
     `PronunciationEvaluator`); `configureNeuralAudio({endpoint, apiKey, voices})`
     activates it with no UI change.
  2. **`AudioCache`** — clips are cached by `lang:voice:text:rate`
     (`zh-CN:default:吃:normal`); the same pronunciation is never regenerated.
  3. **`WebSpeechAudioProvider`** — browser `speechSynthesis`, always available,
     now with `selectBestBrowserVoice(lang)` (exact-locale > region-variant >
     bare tag, on-device voices preferred; **never** an English voice for
     Mandarin) instead of "first voice wins".
  `<AudioButton>` shows *Preparing pronunciation…* / playing / *Audio is
  temporarily unavailable → Try Again*, never marks audio played if it didn't,
  and has a built-in 🐢 **Slow** control. Voice + speed are picked per language in
  the dashboard's **Pronunciation audio** settings (`LanguageAudioSettings`,
  localStorage — device-specific, `useAudioPreference(lang)`).
- **`PronunciationEvaluator`** (`lib/language/pronunciation.ts`) returns
  `available: false` with *"Pronunciation feedback is coming soon."* — it never
  invents a score. Learners can still listen, record, and replay.
- **`CharacterDataProvider`** serves seed hanzi data (components, example words);
  `strokeOrder` is `null` — no faked animations.
- Skill percentages come only from real completed exercises. Too little data →
  `null` → *"Keep practicing to measure this skill."*
- Milestone fireworks: perfect challenge, 7/30-day streak, vocabulary mastery
  25/50/75/100% — proportional intensity, never per correct word.
- Service seams for future AI: `LanguageContentGenerator`, `TranslationProvider`,
  `GrammarFeedbackProvider`, `ConversationProvider` — see `lib/language/services.ts`.

## Study Material Learning Hub

Each uploaded material is a living workspace: **NEW → LEARNING → REVIEWING → MASTERED**.

- `/materials` — the library / command center. Upload PDF / TXT / MD / CSV /
  images (2 MB/file, ~10 MB total). Filter by status, sort by mastery / recency,
  mastery bar on every card.
- `/materials/[id]` — the hub: learning overview stats, an animated **Material
  Mastery** ring, a **Continue Learning** recommendation, a visual **Learning
  Path**, extracted **Topics**, a **Goal**, the create options, generated items,
  and a **Recent Activity** feed.
- `lib/materials/processor.ts` — the `StudyMaterialProcessor` service layer.
  `LocalHeuristicProcessor` does honest, deterministic text extraction on
  txt/md/csv only. It **never** claims to have analysed a file — PDFs and images
  report that extraction isn't wired up yet. Drop in an AI provider behind the
  same interface via `getProcessor()`.
- `lib/materials/progress.ts` — every mastery / status / topic number, derived
  only from real activity. `null` when there isn't enough data (empty states).
- `lib/materials/recommendation.ts` — `getRecommendedStudyAction()` (deterministic,
  never hardcoded in components) + a global variant for the dashboard.
- `LearningActivity` is the single source of study history (sessions, quiz
  attempts, item creation). `finishStudySession()` / `recordQuizResult()` write it
  and return the mastery movement + any milestone crossed.
- Generated flashcards become real `Card`s (`sourceMaterialId` set) studied with
  the normal loop + fireworks; the study screen shows a "From: …" source link.
  Guides / summaries are `LearningItem`s at `/learn/[itemId]`. Quizzes live in the
  Universal Quiz System (below).
- **Fireworks** fire on: excellent sessions (≥80%), quiz ≥80%, and mastery
  milestones (25 / 50 / 75 / 100%) — intensity proportional, 100% is special.

Reset to seed data anytime from **Settings → Reset to sample data**.

## Universal Quiz System

**One quiz engine** that tests you on anything you're learning:

    SOURCE → STUDY → QUIZ → IDENTIFY WEAKNESSES → REVIEW → RETAKE → MASTER

- **`lib/quiz/`** — `types.ts` (`Quiz`, `QuizSource`, `QuizQuestion`, `QuizAttempt`,
  `QuizResultView`), `generators.ts` (one generator per source, all emitting the
  same `QuizQuestion[]`), `store.ts` (reducers + `checkAnswer` — case-insensitive
  deterministic, **never** a fake AI grade), `selectors.ts` (leaf reads, no
  cycles). Snapshot gained `quizzes` + `quizAttempts` (SCHEMA 11).
- **Four `QuizSourceType`s**, one player: `material` (reuses the honest
  `LocalHeuristicProcessor` — PDFs/images show *"We Need Readable Text"* with
  manual fallbacks), `deck` (front/back → questions), `language` (vocabulary /
  listening / sentence / reading / conversation — another `QuizSource`), `manual`
  (the `QuizBuilder` — add / edit / reorder / delete, save as draft or publish).
- **Five question types**: multiple-choice, true-false, short-answer, fill-blank,
  matching. The correct answer is **never** revealed before the learner submits.
- Routes: `/quizzes` (dashboard — cards, last score, progress sparklines),
  `/quizzes/create` (source picker → per-source wizard: size 5/10/20/custom,
  question types, generate → review → save), `/quizzes/[id]` (player, chrome-free),
  `/quizzes/[id]/results` (score ring, per-topic performance when real `topic`
  metadata exists, else "Questions to review"), `/quizzes/[id]/review` (missed
  questions with real source links — *View source material* / *Review these cards*
  / *Practice these words*).
- **Retakes** never overwrite: each run is a fresh `QuizAttempt`; the quiz's
  questions stay frozen. `quiz.recipe` is kept so a future "new version" can
  regenerate (`regenerateQuiz`).
- **Fireworks** (not every completion): first quiz ever, score ≥ 80, **perfect
  (strongest)**, and a ≥ 15-point improvement over your best.
- Quiz attempts on a `material` source write a `quiz-attempt` `LearningActivity`
  with mastery before/after, so the Material Learning Hub stays in sync.
- **Quizzes** is a top-level nav item; the Material page, Deck "Quizzes" tab, and
  Language dashboard all link into the same engine.

## Routes

| Route | What |
| --- | --- |
| `/` | Marketing homepage — hero, interactive demo, animated stats, features |
| `/get-started`, `/login` | Demo onboarding (no real auth — goes straight to the product) |
| `/dashboard` | Greeting, today's progress, weekly chart, streak, decks, materials |
| `/materials` | Study Material library + upload |
| `/materials/[id]` | Source preview + create flashcards / quiz / guide / summary |
| `/learn/[itemId]` | Study guide · quick review (chrome-free) |
| `/quizzes` | Quiz dashboard — my quizzes, scores, progress over time |
| `/quizzes/create` | Pick a source (material / deck / language / manual) → build |
| `/quizzes/[id]` `/results` `/review` | Player · results · missed-question review (chrome-free) |
| `/decks` | Deck grid with search |
| `/decks/[id]` | Deck detail — tabs: Flashcards · Study Material · Quizzes · Study Guides |
| `/decks/[id]/cards/new` | Card editor (`?edit=<id>`, `?source=<materialId>`) |
| `/create` | Create-deck flow with live preview |
| `/study/[deckId]` | The study loop — chrome-free, keyboard-first (`?item=` to study one set) |
| `/achievements` | Achievement gallery + lifetime stats |
| `/settings` | Theme, profile, data export / reset, fireworks tester |

## Keyboard (study)

`Space` reveal · `1` Again · `2` Hard · `3` Good · `4` Easy · `Space`/`Enter` continue after a miss.

## Accessibility

Semantic landmarks, labelled controls, visible focus rings, `aria-live` for the
success toast, full keyboard nav, `prefers-reduced-motion` throughout, and
theme-aware contrast in light and dark.
# study-Guide
