import type {
  LanguageLevel,
  LanguageVocabularyItem,
  ReadingPassage,
  ShadowingLine,
  VocabPartOfSpeech,
} from "@/lib/language/types";
import { uid } from "@/lib/utils";

interface SeedWord {
  target: string;
  translation: string;
  pron: string;
  pos: VocabPartOfSpeech;
  ex?: string;
  exT?: string;
  exP?: string;
  tags?: string[];
  diff?: 1 | 2 | 3;
}

/* ------------------------------------------------------------------ */
/*  Vocabulary by language (core beginner sets)                        */
/* ------------------------------------------------------------------ */

const MANDARIN: SeedWord[] = [
  { target: "你好", translation: "Hello", pron: "nǐ hǎo", pos: "phrase", ex: "你好，我叫王明。", exT: "Hello, my name is Wang Ming.", exP: "nǐ hǎo, wǒ jiào wáng míng.", tags: ["greeting"], diff: 1 },
  { target: "谢谢", translation: "Thank you", pron: "xiè xie", pos: "phrase", ex: "谢谢你的帮助。", exT: "Thank you for your help.", exP: "xiè xie nǐ de bāng zhù.", tags: ["greeting"], diff: 1 },
  { target: "再见", translation: "Goodbye", pron: "zài jiàn", pos: "phrase", ex: "老师，再见！", exT: "Goodbye, teacher!", exP: "lǎo shī, zài jiàn!", tags: ["greeting"], diff: 1 },
  { target: "对不起", translation: "Sorry", pron: "duì bu qǐ", pos: "phrase", ex: "对不起，我迟到了。", exT: "Sorry, I'm late.", exP: "duì bu qǐ, wǒ chí dào le.", tags: ["greeting"], diff: 2 },
  { target: "我", translation: "I / me", pron: "wǒ", pos: "pronoun", ex: "我是学生。", exT: "I am a student.", exP: "wǒ shì xué shēng.", diff: 1 },
  { target: "你", translation: "you", pron: "nǐ", pos: "pronoun", ex: "你叫什么名字？", exT: "What is your name?", exP: "nǐ jiào shén me míng zì?", diff: 1 },
  { target: "是", translation: "to be", pron: "shì", pos: "verb", ex: "他是我的朋友。", exT: "He is my friend.", exP: "tā shì wǒ de péng you.", diff: 1 },
  { target: "不", translation: "not / no", pron: "bù", pos: "particle", ex: "我不知道。", exT: "I don't know.", exP: "wǒ bù zhī dào.", diff: 1 },
  { target: "好", translation: "good / OK", pron: "hǎo", pos: "adjective", ex: "这个主意很好。", exT: "This idea is good.", exP: "zhè ge zhǔ yì hěn hǎo.", diff: 1 },
  { target: "水", translation: "water", pron: "shuǐ", pos: "noun", ex: "我想喝水。", exT: "I want to drink water.", exP: "wǒ xiǎng hē shuǐ.", tags: ["food"], diff: 1 },
  { target: "吃", translation: "to eat", pron: "chī", pos: "verb", ex: "你想吃什么？", exT: "What do you want to eat?", exP: "nǐ xiǎng chī shén me?", tags: ["food"], diff: 1 },
  { target: "喝", translation: "to drink", pron: "hē", pos: "verb", ex: "他在喝茶。", exT: "He is drinking tea.", exP: "tā zài hē chá.", tags: ["food"], diff: 1 },
  { target: "朋友", translation: "friend", pron: "péng you", pos: "noun", ex: "她是我的好朋友。", exT: "She is my good friend.", exP: "tā shì wǒ de hǎo péng you.", diff: 1 },
  { target: "老师", translation: "teacher", pron: "lǎo shī", pos: "noun", ex: "我们的老师很好。", exT: "Our teacher is very nice.", exP: "wǒ men de lǎo shī hěn hǎo.", tags: ["school"], diff: 1 },
  { target: "学生", translation: "student", pron: "xué shēng", pos: "noun", ex: "我是大学学生。", exT: "I am a university student.", exP: "wǒ shì dà xué xué shēng.", tags: ["school"], diff: 1 },
  { target: "学习", translation: "to study", pron: "xué xí", pos: "verb", ex: "我每天学习中文。", exT: "I study Chinese every day.", exP: "wǒ měi tiān xué xí zhōng wén.", tags: ["school"], diff: 2 },
  { target: "学校", translation: "school", pron: "xué xiào", pos: "noun", ex: "我去学校。", exT: "I go to school.", exP: "wǒ qù xué xiào.", tags: ["school"], diff: 1 },
  { target: "今天", translation: "today", pron: "jīn tiān", pos: "noun", ex: "今天天气很好。", exT: "The weather is nice today.", exP: "jīn tiān tiān qì hěn hǎo.", tags: ["time"], diff: 1 },
  { target: "明天", translation: "tomorrow", pron: "míng tiān", pos: "noun", ex: "明天见！", exT: "See you tomorrow!", exP: "míng tiān jiàn!", tags: ["time"], diff: 1 },
  { target: "中文", translation: "Chinese (language)", pron: "zhōng wén", pos: "noun", ex: "我在学中文。", exT: "I'm learning Chinese.", exP: "wǒ zài xué zhōng wén.", tags: ["language"], diff: 2 },
  { target: "说", translation: "to speak / say", pron: "shuō", pos: "verb", ex: "请说慢一点。", exT: "Please speak slower.", exP: "qǐng shuō màn yì diǎn.", diff: 2 },
  { target: "想", translation: "to want / think", pron: "xiǎng", pos: "verb", ex: "我想去中国。", exT: "I want to go to China.", exP: "wǒ xiǎng qù zhōng guó.", diff: 2 },
  { target: "去", translation: "to go", pron: "qù", pos: "verb", ex: "你去哪里？", exT: "Where are you going?", exP: "nǐ qù nǎ lǐ?", diff: 1 },
  { target: "什么", translation: "what", pron: "shén me", pos: "pronoun", ex: "这是什么？", exT: "What is this?", exP: "zhè shì shén me?", diff: 2 },
];

const SPANISH: SeedWord[] = [
  { target: "hola", translation: "hello", pron: "OH-lah", pos: "phrase", ex: "Hola, ¿cómo estás?", exT: "Hello, how are you?", diff: 1 },
  { target: "gracias", translation: "thank you", pron: "GRAH-syahs", pos: "phrase", ex: "Muchas gracias.", exT: "Thank you very much.", diff: 1 },
  { target: "por favor", translation: "please", pron: "por fah-VOR", pos: "phrase", ex: "Un café, por favor.", exT: "A coffee, please.", diff: 1 },
  { target: "sí", translation: "yes", pron: "see", pos: "particle", ex: "Sí, claro.", exT: "Yes, of course.", diff: 1 },
  { target: "no", translation: "no", pron: "noh", pos: "particle", ex: "No, gracias.", exT: "No, thank you.", diff: 1 },
  { target: "agua", translation: "water", pron: "AH-gwah", pos: "noun", ex: "Quiero agua.", exT: "I want water.", diff: 1 },
  { target: "comida", translation: "food", pron: "koh-MEE-dah", pos: "noun", ex: "La comida está lista.", exT: "The food is ready.", diff: 1 },
  { target: "amigo", translation: "friend", pron: "ah-MEE-goh", pos: "noun", ex: "Él es mi amigo.", exT: "He is my friend.", diff: 1 },
  { target: "bueno", translation: "good", pron: "BWEH-noh", pos: "adjective", ex: "Es un libro bueno.", exT: "It is a good book.", diff: 1 },
  { target: "quiero", translation: "I want", pron: "KYEH-roh", pos: "verb", ex: "Quiero aprender español.", exT: "I want to learn Spanish.", diff: 2 },
  { target: "hablar", translation: "to speak", pron: "ah-BLAR", pos: "verb", ex: "Quiero hablar contigo.", exT: "I want to speak with you.", diff: 2 },
  { target: "hoy", translation: "today", pron: "oy", pos: "adverb", ex: "Hoy hace sol.", exT: "It's sunny today.", diff: 1 },
];

const CORE: SeedWord[] = [
  { target: "—", translation: "hello", pron: "", pos: "phrase", diff: 1 },
];

const JAPANESE: SeedWord[] = [
  { target: "こんにちは", translation: "hello", pron: "konnichiwa", pos: "phrase", diff: 1 },
  { target: "ありがとう", translation: "thank you", pron: "arigatō", pos: "phrase", diff: 1 },
  { target: "はい", translation: "yes", pron: "hai", pos: "particle", diff: 1 },
  { target: "いいえ", translation: "no", pron: "iie", pos: "particle", diff: 1 },
  { target: "水", translation: "water", pron: "mizu", pos: "noun", diff: 1 },
  { target: "食べる", translation: "to eat", pron: "taberu", pos: "verb", diff: 2 },
  { target: "友達", translation: "friend", pron: "tomodachi", pos: "noun", diff: 2 },
  { target: "今日", translation: "today", pron: "kyō", pos: "noun", diff: 1 },
  { target: "私", translation: "I / me", pron: "watashi", pos: "pronoun", diff: 1 },
  { target: "学校", translation: "school", pron: "gakkō", pos: "noun", diff: 2 },
];

const FRENCH: SeedWord[] = [
  { target: "bonjour", translation: "hello", pron: "bon-ZHOOR", pos: "phrase", diff: 1 },
  { target: "merci", translation: "thank you", pron: "mair-SEE", pos: "phrase", diff: 1 },
  { target: "s'il vous plaît", translation: "please", pron: "seel voo PLEH", pos: "phrase", diff: 1 },
  { target: "oui", translation: "yes", pron: "wee", pos: "particle", diff: 1 },
  { target: "non", translation: "no", pron: "nohn", pos: "particle", diff: 1 },
  { target: "eau", translation: "water", pron: "oh", pos: "noun", diff: 1 },
  { target: "ami", translation: "friend", pron: "ah-MEE", pos: "noun", diff: 1 },
  { target: "aujourd'hui", translation: "today", pron: "oh-zhoor-DWEE", pos: "adverb", diff: 2 },
  { target: "je veux", translation: "I want", pron: "zhuh vuh", pos: "verb", diff: 2 },
  { target: "parler", translation: "to speak", pron: "par-LAY", pos: "verb", diff: 2 },
];

const GERMAN: SeedWord[] = [
  { target: "hallo", translation: "hello", pron: "HAH-loh", pos: "phrase", diff: 1 },
  { target: "danke", translation: "thank you", pron: "DAHN-kuh", pos: "phrase", diff: 1 },
  { target: "bitte", translation: "please / you're welcome", pron: "BIT-tuh", pos: "phrase", diff: 1 },
  { target: "ja", translation: "yes", pron: "yah", pos: "particle", diff: 1 },
  { target: "nein", translation: "no", pron: "nine", pos: "particle", diff: 1 },
  { target: "Wasser", translation: "water", pron: "VAH-ser", pos: "noun", diff: 1 },
  { target: "Freund", translation: "friend", pron: "froynt", pos: "noun", diff: 1 },
  { target: "heute", translation: "today", pron: "HOY-tuh", pos: "adverb", diff: 1 },
  { target: "ich möchte", translation: "I would like", pron: "ikh MERKH-tuh", pos: "verb", diff: 2 },
  { target: "sprechen", translation: "to speak", pron: "SHPREKH-en", pos: "verb", diff: 2 },
];

const KOREAN: SeedWord[] = [
  { target: "안녕하세요", translation: "hello", pron: "annyeonghaseyo", pos: "phrase", diff: 1 },
  { target: "감사합니다", translation: "thank you", pron: "gamsahamnida", pos: "phrase", diff: 1 },
  { target: "네", translation: "yes", pron: "ne", pos: "particle", diff: 1 },
  { target: "아니요", translation: "no", pron: "aniyo", pos: "particle", diff: 1 },
  { target: "물", translation: "water", pron: "mul", pos: "noun", diff: 1 },
  { target: "친구", translation: "friend", pron: "chingu", pos: "noun", diff: 1 },
  { target: "오늘", translation: "today", pron: "oneul", pos: "noun", diff: 1 },
  { target: "저", translation: "I / me (formal)", pron: "jeo", pos: "pronoun", diff: 1 },
  { target: "학교", translation: "school", pron: "hakgyo", pos: "noun", diff: 2 },
  { target: "먹다", translation: "to eat", pron: "meokda", pos: "verb", diff: 2 },
];

const ITALIAN: SeedWord[] = [
  { target: "ciao", translation: "hello / bye", pron: "chow", pos: "phrase", diff: 1 },
  { target: "grazie", translation: "thank you", pron: "GRAH-tsyeh", pos: "phrase", diff: 1 },
  { target: "per favore", translation: "please", pron: "per fah-VOH-reh", pos: "phrase", diff: 1 },
  { target: "sì", translation: "yes", pron: "see", pos: "particle", diff: 1 },
  { target: "no", translation: "no", pron: "noh", pos: "particle", diff: 1 },
  { target: "acqua", translation: "water", pron: "AH-kwah", pos: "noun", diff: 1 },
  { target: "amico", translation: "friend", pron: "ah-MEE-koh", pos: "noun", diff: 1 },
  { target: "oggi", translation: "today", pron: "OH-jee", pos: "adverb", diff: 1 },
  { target: "voglio", translation: "I want", pron: "VOH-lyoh", pos: "verb", diff: 2 },
  { target: "parlare", translation: "to speak", pron: "par-LAH-reh", pos: "verb", diff: 2 },
];

const PORTUGUESE: SeedWord[] = [
  { target: "olá", translation: "hello", pron: "oh-LAH", pos: "phrase", diff: 1 },
  { target: "obrigado", translation: "thank you", pron: "oh-bree-GAH-doo", pos: "phrase", diff: 1 },
  { target: "por favor", translation: "please", pron: "poor fah-VOR", pos: "phrase", diff: 1 },
  { target: "sim", translation: "yes", pron: "seeng", pos: "particle", diff: 1 },
  { target: "não", translation: "no", pron: "nowng", pos: "particle", diff: 1 },
  { target: "água", translation: "water", pron: "AH-gwah", pos: "noun", diff: 1 },
  { target: "amigo", translation: "friend", pron: "ah-MEE-goo", pos: "noun", diff: 1 },
  { target: "hoje", translation: "today", pron: "OH-zheh", pos: "adverb", diff: 1 },
  { target: "eu quero", translation: "I want", pron: "eh-oo KEH-roo", pos: "verb", diff: 2 },
  { target: "falar", translation: "to speak", pron: "fah-LAR", pos: "verb", diff: 2 },
];

const BY_LANGUAGE: Record<string, SeedWord[]> = {
  mandarin: MANDARIN,
  spanish: SPANISH,
  japanese: JAPANESE,
  korean: KOREAN,
  french: FRENCH,
  german: GERMAN,
  italian: ITALIAN,
  portuguese: PORTUGUESE,
};

const nowIso = () => new Date().toISOString();

export function seedVocabForProfile(
  profileId: string,
  languageId: string,
  level: LanguageLevel,
): LanguageVocabularyItem[] {
  const words = BY_LANGUAGE[languageId] ?? CORE;
  // Give more starting content to more advanced learners.
  const take =
    level === "complete-beginner"
      ? Math.min(10, words.length)
      : level === "beginner"
        ? Math.min(16, words.length)
        : words.length;

  return words.slice(0, take).map((w) => ({
    id: uid("vocab"),
    profileId,
    languageId,
    target: w.target,
    translation: w.translation,
    pronunciation: w.pron,
    partOfSpeech: w.pos,
    exampleSentence: w.ex,
    exampleTranslation: w.exT,
    examplePronunciation: w.exP,
    imageUrl: null,
    tags: w.tags ?? [],
    difficulty: w.diff ?? 1,
    custom: false,
    createdAt: nowIso(),
    ease: 2.5,
    intervalDays: 0,
    repetitions: 0,
    dueAt: nowIso(),
    lastReviewedAt: null,
    lapses: 0,
  }));
}

/* ------------------------------------------------------------------ */
/*  Reading passages                                                   */
/* ------------------------------------------------------------------ */

export const SEED_READING: ReadingPassage[] = [
  {
    id: "read_zh_1",
    languageId: "mandarin",
    level: "beginner",
    title: "我的一天",
    target: "我今天去学校。我和朋友一起学习中文。老师很好。中午我们吃饭，喝水。",
    translation:
      "Today I go to school. My friend and I study Chinese together. The teacher is very nice. At noon we eat and drink water.",
    glossary: [
      { word: "今天", pronunciation: "jīn tiān", meaning: "today" },
      { word: "学校", pronunciation: "xué xiào", meaning: "school" },
      { word: "朋友", pronunciation: "péng you", meaning: "friend" },
      { word: "一起", pronunciation: "yì qǐ", meaning: "together" },
      { word: "学习", pronunciation: "xué xí", meaning: "to study" },
      { word: "中文", pronunciation: "zhōng wén", meaning: "Chinese" },
      { word: "老师", pronunciation: "lǎo shī", meaning: "teacher" },
      { word: "中午", pronunciation: "zhōng wǔ", meaning: "noon" },
      { word: "吃饭", pronunciation: "chī fàn", meaning: "to eat (a meal)" },
      { word: "喝水", pronunciation: "hē shuǐ", meaning: "to drink water" },
    ],
    comprehension: {
      prompt: "Where does the narrator go today?",
      options: ["Home", "School", "The market", "Work"],
      answer: "School",
    },
  },
  {
    id: "read_es_1",
    languageId: "spanish",
    level: "beginner",
    title: "Mi amigo",
    target:
      "Hoy voy a la escuela con mi amigo. Estudiamos español. La comida está lista y bebemos agua.",
    translation:
      "Today I go to school with my friend. We study Spanish. The food is ready and we drink water.",
    glossary: [
      { word: "hoy", pronunciation: "oy", meaning: "today" },
      { word: "escuela", pronunciation: "es-KWEH-lah", meaning: "school" },
      { word: "amigo", pronunciation: "ah-MEE-goh", meaning: "friend" },
      { word: "estudiamos", pronunciation: "es-too-DYAH-mos", meaning: "we study" },
      { word: "comida", pronunciation: "koh-MEE-dah", meaning: "food" },
      { word: "agua", pronunciation: "AH-gwah", meaning: "water" },
    ],
    comprehension: {
      prompt: "What do they study?",
      options: ["French", "Spanish", "Math", "History"],
      answer: "Spanish",
    },
  },
];

/* ------------------------------------------------------------------ */
/*  Shadowing lines                                                    */
/* ------------------------------------------------------------------ */

export const SEED_SHADOWING: ShadowingLine[] = [
  {
    id: "shad_zh_1",
    languageId: "mandarin",
    level: "beginner",
    target: "你好，你今天怎么样？",
    pronunciation: "Nǐ hǎo, nǐ jīntiān zěnmeyàng?",
    translation: "Hello, how are you today?",
  },
  {
    id: "shad_zh_2",
    languageId: "mandarin",
    level: "beginner",
    target: "我想学习中文。",
    pronunciation: "Wǒ xiǎng xuéxí zhōngwén.",
    translation: "I want to study Chinese.",
  },
  {
    id: "shad_zh_3",
    languageId: "mandarin",
    level: "beginner",
    target: "谢谢你的帮助，再见！",
    pronunciation: "Xièxie nǐ de bāngzhù, zàijiàn!",
    translation: "Thank you for your help, goodbye!",
  },
  {
    id: "shad_es_1",
    languageId: "spanish",
    level: "beginner",
    target: "Hola, ¿cómo estás hoy?",
    pronunciation: "OH-lah, KOH-moh es-TAHS oy?",
    translation: "Hello, how are you today?",
  },
];
