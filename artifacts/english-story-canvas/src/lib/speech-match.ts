/**
 * Closed-vocabulary matcher for children's speech.
 *
 * Browser speech recognition is trained on adult speech and an open
 * vocabulary, so young learners' words often come back slightly wrong
 * ("bee" → "be", "tree" → "three", "wind" → "win", "fly" → "fry").
 * Each page only listens for a handful of words, so we can be lenient:
 * every token in every alternative transcript is compared against the
 * page's small word list, by spelling and by a rough "sound key", and the
 * closest word wins if it is close enough.
 *
 * This file is framework-free so it can be unit-tested with plain Node
 * (see speech-match.test.ts).
 */

export type VocabEntry = {
  /** Canonical word the canvas understands, e.g. "blow". */
  word: string;
  /** Inflected forms that mean the same word, e.g. ["blows", "blew"]. */
  forms?: string[];
  /** Forms that should be kept as-is in the rebuilt sentence (e.g. "blows", "flies"), because the canvas reads them. */
  keepForms?: string[];
  /** Frequent mishearings that are safe to accept on their own. */
  aliases?: string[];
  /** Mishearings that are also everyday words ("it" for "eat"): only accepted when another vocabulary word was heard in the same sentence. */
  weakAliases?: string[];
};

export type HitKind = 'exact' | 'form' | 'alias' | 'fuzzy' | 'weak';

export type WordHit = {
  word: string;
  /** What the recogniser actually wrote. */
  heard: string;
  /** Token written into the rebuilt sentence. */
  output: string;
  kind: HitKind;
  score: number;
  /** Token index in the normalised transcript. */
  index: number;
};

export type MatchResult = {
  raw: string;
  /** The transcript with every matched token replaced by its vocabulary word. */
  canonical: string;
  hits: WordHit[];
  /** Words in the order they were heard (duplicates kept). */
  words: string[];
  score: number;
};

const NUMBER_WORDS: Record<string, string> = {
  '0': 'zero', '1': 'one', '2': 'two', '3': 'three', '4': 'four', '5': 'five',
  '6': 'six', '7': 'seven', '8': 'eight', '9': 'nine', '10': 'ten',
};

/** Everyday words that must never be fuzzy-matched to a vocabulary word. */
const STOPWORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'so', 'if', 'then', 'than', 'is', 'are', 'was', 'were', 'am', 'be', 'been',
  'it', 'its', 'to', 'too', 'two', 'of', 'in', 'on', 'at', 'by', 'for', 'from', 'with', 'into', 'onto', 'up', 'out',
  'i', 'me', 'my', 'you', 'your', 'he', 'him', 'his', 'she', 'her', 'we', 'us', 'our', 'they', 'them', 'their',
  'this', 'that', 'these', 'those', 'there', 'here', 'what', 'who', 'how', 'why', 'when', 'where', 'which',
  'oh', 'um', 'uh', 'ah', 'hmm', 'yes', 'yeah', 'no', 'not', 'ok', 'okay', 'hi', 'hello', 'bye', 'please',
  'can', 'do', 'does', 'did', 'go', 'get', 'got', 'see', 'look', 'like', 'want', 'now', 'just', 'very', 'one',
  'all', 'some', 'any', 'more', 'much', 'many', 'will', 'would', 'let', 'lets', 'make', 'has', 'have', 'had',
]);

export function normalizeTokens(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map((token) => NUMBER_WORDS[token] ?? token);
}

function mapVowelGroup(group: string): string {
  if (/^(ee|ea|ie|ei|ey|i|y|iy)$/.test(group)) return 'i';
  if (/^(a|ai|ay|ae|au)$/.test(group)) return 'a';
  if (group.includes('o')) return 'o';
  if (group.includes('u')) return 'u';
  if (group.includes('i')) return 'i';
  return group[0];
}

/**
 * A rough phonetic key tuned for young Chinese learners of English:
 * r/l, v/w and "th"/"t" are merged, silent letters dropped, vowel groups
 * reduced to one sound and doubled letters collapsed.
 */
export function soundKey(token: string): string {
  let s = token.toLowerCase().replace(/[^a-z]/g, '');
  if (!s) return '';
  s = s.replace(/^kn/, 'n').replace(/^wr/, 'r').replace(/^wh/, 'w').replace(/^ps/, 's');
  s = s.replace(/ph/g, 'f').replace(/gh/g, '').replace(/ck/g, 'k').replace(/tch/g, 'ch').replace(/sh/g, 's').replace(/th/g, 't');
  s = s.replace(/c(?=[eiy])/g, 's').replace(/c/g, 'k').replace(/q/g, 'k').replace(/x/g, 'ks').replace(/z/g, 's').replace(/dg/g, 'j');
  s = s.replace(/v/g, 'w').replace(/r/g, 'l');
  s = s.replace(/ow$/, 'o').replace(/ew$/, 'u');
  if (s.length > 3) s = s.replace(/([^aeiouy])e$/, '$1');
  s = s[0] + s.slice(1).replace(/h/g, '').replace(/y/g, 'i');
  s = s.replace(/[aeiouy]+/g, (group, offset: number) => (offset === 0 && s.length > 1 ? group[0] : mapVowelGroup(group)));
  return s.replace(/(.)\1+/g, '$1');
}

export function editDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i += 1) {
    const current = [i];
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      current[j] = Math.min(previous[j] + 1, current[j - 1] + 1, previous[j - 1] + cost);
    }
    previous = current;
  }
  return previous[b.length];
}

export function similarity(a: string, b: string): number {
  const longest = Math.max(a.length, b.length);
  return longest === 0 ? 1 : 1 - editDistance(a, b) / longest;
}

/** First sounds that young learners commonly swap. Vowels are treated as one sound. */
const FIRST_SOUND_GROUPS = ['bp', 'dt', 'gk', 'scjz', 'ln', 'fh', 'aeiou'];

function sameFirstSound(a: string, b: string): boolean {
  if (!a || !b) return false;
  if (a[0] === b[0]) return true;
  return FIRST_SOUND_GROUPS.some((group) => group.includes(a[0]) && group.includes(b[0]));
}

type TokenMatch = { entry: VocabEntry; output: string; kind: HitKind; score: number };

function scoreAgainstEntry(token: string, entry: VocabEntry): TokenMatch | null {
  const forms = entry.forms ?? [];
  const keep = (form: string) => (entry.keepForms?.includes(form) ? form : entry.word);
  if (token === entry.word) return { entry, output: entry.word, kind: 'exact', score: 1 };
  if (forms.includes(token)) return { entry, output: keep(token), kind: 'form', score: 1 };
  // A misheard "-s" word ("fries" for "flies") keeps its "-s" form, because the canvas reads "the tree flies".
  const aliasOutput = (/s$/.test(token) && entry.keepForms?.find((form) => /s$/.test(form))) || entry.word;
  if (entry.aliases?.includes(token)) return { entry, output: aliasOutput, kind: 'alias', score: 0.95 };
  if (entry.weakAliases?.includes(token)) return { entry, output: aliasOutput, kind: 'weak', score: 0.9 };
  if (STOPWORDS.has(token) || token.length < 2) return null;

  const tokenKey = soundKey(token);
  let best: TokenMatch | null = null;
  for (const candidate of [entry.word, ...forms]) {
    const letters = similarity(token, candidate);
    const sounds = similarity(tokenKey, soundKey(candidate));
    const score = 0.45 * letters + 0.55 * sounds;
    if (!best || score > best.score) best = { entry, output: keep(candidate), kind: 'fuzzy', score };
  }
  if (!best) return null;
  const needed = entry.word.length <= 3 ? 0.8 : 0.7;
  const firstOk = sameFirstSound(tokenKey, soundKey(entry.word));
  if (best.score < needed || (!firstOk && best.score < 0.86)) return null;
  return best;
}

function bestForToken(token: string, vocab: VocabEntry[]): TokenMatch | null {
  const scored = vocab
    .map((entry) => scoreAgainstEntry(token, entry))
    .filter((match): match is TokenMatch => match !== null)
    .sort((a, b) => b.score - a.score);
  const [first, second] = scored;
  if (!first) return null;
  // Two words almost equally close: too risky to guess.
  if (first.kind === 'fuzzy' && second && second.entry.word !== first.entry.word && first.score - second.score < 0.05) return null;
  return first;
}

export function matchUtterance(raw: string, vocab: VocabEntry[]): MatchResult {
  const tokens = normalizeTokens(raw);
  const output = [...tokens];
  const hits: WordHit[] = [];

  for (let index = 0; index < tokens.length; index += 1) {
    const single = bestForToken(tokens[index], vocab);
    // Recognisers sometimes split one word in two ("um brella", "pud dle").
    if (index + 1 < tokens.length && (!single || single.kind === 'fuzzy')) {
      const nextSingle = bestForToken(tokens[index + 1], vocab);
      const joined = bestForToken(tokens[index] + tokens[index + 1], vocab);
      const strongestSingle = Math.max(single?.score ?? 0, nextSingle && nextSingle.kind !== 'fuzzy' ? 1 : nextSingle?.score ?? 0);
      if (joined && joined.score >= 0.75 && joined.score > strongestSingle + 0.05) {
        hits.push({ word: joined.entry.word, heard: `${tokens[index]} ${tokens[index + 1]}`, output: joined.output, kind: joined.kind, score: joined.score, index });
        output[index] = joined.output;
        output[index + 1] = '';
        index += 1;
        continue;
      }
    }
    if (single) {
      hits.push({ word: single.entry.word, heard: tokens[index], output: single.output, kind: single.kind, score: single.score, index });
      output[index] = single.output;
    }
  }

  // Everyday-word aliases only count when the child clearly said another target word too.
  const hasStrongHit = hits.some((hit) => hit.kind !== 'weak');
  const kept = hasStrongHit ? hits : [];
  if (!hasStrongHit) hits.forEach((hit) => { output[hit.index] = tokens[hit.index]; });

  return {
    raw,
    canonical: output.filter(Boolean).join(' '),
    hits: kept,
    words: kept.map((hit) => hit.word),
    score: kept.reduce((total, hit) => total + hit.score, 0),
  };
}

/** Pick the alternative transcript that contains the most (and closest) vocabulary words. */
export function matchAlternatives(alternatives: string[], vocab: VocabEntry[]): MatchResult {
  const results = alternatives
    .filter((text) => text && text.trim())
    .map((text, rank) => ({ result: matchUtterance(text, vocab), rank }));
  if (!results.length) return matchUtterance('', vocab);
  results.sort((a, b) => (b.result.score - a.result.score) || (a.rank - b.rank));
  return results[0].result;
}

/** Turn a simple word list into vocabulary entries, merging in the shared mishearing tables below. */
export function buildVocab(words: string[]): VocabEntry[] {
  return words.map((word) => ({ word, ...(COMMON_VARIANTS[word] ?? {}) }));
}

/**
 * Forms and mishearings collected for the words used across the chapters.
 * Add to this table when a new word joins a scene.
 */
export const COMMON_VARIANTS: Record<string, Omit<VocabEntry, 'word'>> = {
  apple: { forms: ['apples'], aliases: ['appel', 'appo', 'apo', 'appl', 'apel'], weakAliases: ['able', 'happen', 'opal'] },
  bee: { forms: ['bees'], aliases: ['be', 'b', 'bea', 'bee', 'bi', 'bie'], weakAliases: ['pee', 'p', 'beat'] },
  eat: { forms: ['eats', 'eating', 'ate', 'eaten'], aliases: ['eet', 'eatt'], weakAliases: ['it', 'each', 'eight', 'heat', 'yeet'] },
  fly: { forms: ['flies', 'flying', 'flew'], keepForms: ['flies'], aliases: ['fli', 'flight', 'fry', 'flai'], weakAliases: ['fries', 'fried', 'fla', 'fine'] },
  wind: { forms: ['winds', 'windy'], aliases: ['wend', 'whind', 'vind', 'wint'], weakAliases: ['when', 'went', 'win', 'wins', 'wine'] },
  blow: { forms: ['blows', 'blew', 'blowing', 'blown'], keepForms: ['blows'], aliases: ['below', 'bloh', 'blo', 'bloe'], weakAliases: ['blue', 'blood', 'bro', 'brow', 'low', 'glow'] },
  umbrella: { forms: ['umbrellas'], aliases: ['embrella', 'umbrela', 'brella', 'umbrello', 'ambrella', 'umbella'] },
  tree: { forms: ['trees'], aliases: ['three', 'tre', 'trea', 'tri'], weakAliases: ['true', 'tray', 'tea', 'free', 'treat'] },
  softly: { forms: [], aliases: ['soft', 'softy', 'sofly', 'softlee', 'softli'] },
  strongly: { forms: [], aliases: ['strong', 'stronger', 'strongli', 'stronly', 'strangely'] },
  heavily: { forms: [], aliases: ['heavy', 'heavier', 'heavenly', 'heavly', 'heavili'] },
  rain: { forms: ['rains', 'raining', 'rained', 'rainy'], aliases: ['rein', 'reign', 'raine', 'lain'], weakAliases: ['ran', 'run', 'lane', 'train', 'brain'] },
  fall: { forms: ['falls', 'falling', 'fell', 'fallen'], aliases: ['fol', 'fawl', 'faul'], weakAliases: ['for', 'full', 'fault', 'ball', 'foul', 'fill'] },
  splash: { forms: ['splashes', 'splashing', 'splashed'], aliases: ['splosh', 'splatch', 'splas'], weakAliases: ['flash', 'slash', 'plush', 'splat'] },
  puddle: { forms: ['puddles'], aliases: ['paddle', 'poodle', 'puddel', 'pudle', 'paddles', 'poodles'], weakAliases: ['puzzle', 'bottle', 'battle', 'pedal', 'petal'] },
  alice: { forms: ['alices'], aliases: ['alis', 'ellis', 'allis', 'alyss', 'alise', 'elise'], weakAliases: ['alex', 'alas', 'allies', 'palace'] },
};

export type HeardToken = { text: string; word?: string };

/** Split a rebuilt sentence into tokens, marking the ones that are vocabulary words (for highlighting). */
export function toHeardTokens(sentence: string, vocab: VocabEntry[]): HeardToken[] {
  return sentence.split(/\s+/).filter(Boolean).map((text) => {
    const lower = text.toLowerCase();
    const entry = vocab.find(({ word, keepForms }) => word === lower || keepForms?.includes(lower));
    return entry ? { text, word: entry.word } : { text };
  });
}
