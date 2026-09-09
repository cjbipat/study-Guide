/**
 * CharacterDataProvider — logographic character data (Mandarin hanzi, etc.).
 *
 * The default provider serves a small hand-checked seed set. It exposes
 * `strokeOrder: null` — stroke-order animation is NOT faked. A future provider
 * (e.g. a hanzi-writer data source) implements the same interface.
 */

export interface CharacterComponent {
  char: string;
  meaning: string;
}

export interface CharacterData {
  char: string;
  pronunciation: string;
  meaning: string;
  components: CharacterComponent[];
  exampleWords: { word: string; pronunciation: string; meaning: string }[];
  /** null until a stroke-order data source is connected */
  strokeOrder: null;
}

export interface CharacterDataProvider {
  readonly id: string;
  get(char: string): CharacterData | null;
  has(char: string): boolean;
}

const SEED: Record<string, Omit<CharacterData, "strokeOrder">> = {
  你: {
    char: "你",
    pronunciation: "nǐ",
    meaning: "you",
    components: [
      { char: "亻", meaning: "person radical" },
      { char: "尔", meaning: "you (archaic) / phonetic" },
    ],
    exampleWords: [
      { word: "你好", pronunciation: "nǐ hǎo", meaning: "hello" },
      { word: "你们", pronunciation: "nǐ men", meaning: "you (plural)" },
    ],
  },
  好: {
    char: "好",
    pronunciation: "hǎo",
    meaning: "good / well",
    components: [
      { char: "女", meaning: "woman" },
      { char: "子", meaning: "child" },
    ],
    exampleWords: [
      { word: "你好", pronunciation: "nǐ hǎo", meaning: "hello" },
      { word: "好吃", pronunciation: "hǎo chī", meaning: "delicious" },
    ],
  },
  我: {
    char: "我",
    pronunciation: "wǒ",
    meaning: "I / me",
    components: [
      { char: "手", meaning: "hand" },
      { char: "戈", meaning: "spear / weapon" },
    ],
    exampleWords: [
      { word: "我们", pronunciation: "wǒ men", meaning: "we / us" },
      { word: "我的", pronunciation: "wǒ de", meaning: "my / mine" },
    ],
  },
  学: {
    char: "学",
    pronunciation: "xué",
    meaning: "to study / learn",
    components: [
      { char: "⺍", meaning: "child (top)" },
      { char: "子", meaning: "child" },
    ],
    exampleWords: [
      { word: "学习", pronunciation: "xué xí", meaning: "to study" },
      { word: "学校", pronunciation: "xué xiào", meaning: "school" },
      { word: "学生", pronunciation: "xué shēng", meaning: "student" },
    ],
  },
  校: {
    char: "校",
    pronunciation: "xiào",
    meaning: "school",
    components: [
      { char: "木", meaning: "tree / wood" },
      { char: "交", meaning: "to cross / phonetic" },
    ],
    exampleWords: [
      { word: "学校", pronunciation: "xué xiào", meaning: "school" },
      { word: "校长", pronunciation: "xiào zhǎng", meaning: "principal" },
    ],
  },
  今: {
    char: "今",
    pronunciation: "jīn",
    meaning: "now / today",
    components: [{ char: "人", meaning: "person" }],
    exampleWords: [
      { word: "今天", pronunciation: "jīn tiān", meaning: "today" },
      { word: "今年", pronunciation: "jīn nián", meaning: "this year" },
    ],
  },
  天: {
    char: "天",
    pronunciation: "tiān",
    meaning: "day / sky / heaven",
    components: [
      { char: "一", meaning: "one (top line)" },
      { char: "大", meaning: "big" },
    ],
    exampleWords: [
      { word: "今天", pronunciation: "jīn tiān", meaning: "today" },
      { word: "天气", pronunciation: "tiān qì", meaning: "weather" },
    ],
  },
  谢: {
    char: "谢",
    pronunciation: "xiè",
    meaning: "to thank",
    components: [
      { char: "讠", meaning: "speech radical" },
      { char: "射", meaning: "to shoot / phonetic" },
    ],
    exampleWords: [
      { word: "谢谢", pronunciation: "xiè xie", meaning: "thank you" },
      { word: "感谢", pronunciation: "gǎn xiè", meaning: "to be grateful" },
    ],
  },
  水: {
    char: "水",
    pronunciation: "shuǐ",
    meaning: "water",
    components: [],
    exampleWords: [
      { word: "喝水", pronunciation: "hē shuǐ", meaning: "to drink water" },
      { word: "水果", pronunciation: "shuǐ guǒ", meaning: "fruit" },
    ],
  },
  朋: {
    char: "朋",
    pronunciation: "péng",
    meaning: "friend",
    components: [{ char: "月", meaning: "moon (x2)" }],
    exampleWords: [
      { word: "朋友", pronunciation: "péng you", meaning: "friend" },
    ],
  },
};

class SeedCharacterDataProvider implements CharacterDataProvider {
  readonly id = "seed";
  get(char: string): CharacterData | null {
    const d = SEED[char];
    return d ? { ...d, strokeOrder: null } : null;
  }
  has(char: string): boolean {
    return char in SEED;
  }
}

let provider: CharacterDataProvider | null = null;
export function getCharacterDataProvider(): CharacterDataProvider {
  if (!provider) provider = new SeedCharacterDataProvider();
  return provider;
}
