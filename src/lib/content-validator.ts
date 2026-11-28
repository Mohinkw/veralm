/**
 * VeraLM Content Validation & Algorithmic Heuristics
 * Performs fast, deterministic structural and quality checks with 0ms external latency.
 * Supports Latin and non-Latin Unicode scripts (including Bengali, Arabic, CJK, etc.).
 */

export interface HeuristicQualityReport {
  wordCount: number;
  readingTimeMin: number;
  fleschScore: number;
  lexicalDiversity: number; // 0.0 - 1.0 (Type-Token Ratio)
  hasHeadings: boolean;
  hasLists: boolean;
  hasReferences: boolean;
  hasCodeOrMedia: boolean;
  heuristicQualityScore: number; // 0 - 100
  passed: boolean;
  issues: string[];
}

/**
 * Counts rough syllables in a word (Latin heuristic, safe fallback for non-Latin scripts).
 */
function countSyllables(word: string): number {
  const clean = word.toLowerCase().replace(/[^a-z]/g, '');
  if (!clean) {
    // Rough Unicode syllable estimate for non-Latin words (e.g., Bengali / CJK)
    return Math.max(1, Math.min(6, Math.ceil(word.length / 3)));
  }
  if (clean.length <= 3) return 1;

  const syllables = clean
    .replace(/(?:[^laeiouy]|ed|es|e)$/, '')
    .replace(/^y/, '')
    .match(/[aeiouy]{1,2}/g);

  return syllables ? Math.max(1, syllables.length) : 1;
}

export function validateContentHeuristics(
  content: string,
  title: string
): HeuristicQualityReport {
  const issues: string[] = [];
  const trimmed = content.trim();

  const words = trimmed.split(/\s+/).filter((w) => w.length > 0);
  const wordCount = words.length;

  // Support English punctuation plus Bengali Dari (।, \u0964) and Arabic question mark
  const sentences = trimmed
    .split(/[.!?।\u0964؟]+(?:\s+|$)/)
    .filter((s) => s.trim().length > 0);
  const sentenceCount = Math.max(1, sentences.length);

  // 1. Word Count Checks
  if (wordCount < 150) {
    issues.push('Article must be at least 150 words to ground model responses effectively.');
  }

  // 2. Lexical Diversity (Unicode-aware Type-Token Ratio across all scripts)
  const cleanWords = words
    .map((w) => w.toLowerCase().replace(/[^\p{L}\p{N}\p{M}]/gu, ''))
    .filter(Boolean);
  const uniqueWords = new Set(cleanWords);
  const lexicalDiversity =
    cleanWords.length > 0
      ? Number((uniqueWords.size / cleanWords.length).toFixed(3))
      : 0;

  if (cleanWords.length > 100 && lexicalDiversity < 0.22) {
    issues.push('High repetition detected. Content appears redundant or keyword-stuffed.');
  }

  // 3. Structural Elements
  const hasHeadings = /(^|\n)#{1,4}\s+.+/m.test(trimmed);
  if (!hasHeadings && wordCount > 250) {
    issues.push('Recommend adding Markdown headings (e.g. ## Section Title) to improve grounding precision.');
  }

  const hasLists = /(^|\n)\s*[-*+\d.]\s+.+/m.test(trimmed);
  const hasReferences = /(https?:\/\/|\[.+\]\(.+\))/i.test(trimmed);
  const hasCodeOrMedia = /(```|`[^`]+`|!\[.+\]\(.+\))/i.test(trimmed);

  // 4. Flesch Reading Ease Formula
  let totalSyllables = 0;
  for (const w of cleanWords) {
    totalSyllables += countSyllables(w);
  }
  const avgSentenceLength = wordCount / sentenceCount;
  const avgSyllablesPerWord = cleanWords.length > 0 ? totalSyllables / cleanWords.length : 1;
  const fleschRaw = 206.835 - 1.015 * avgSentenceLength - 84.6 * avgSyllablesPerWord;
  const fleschScore = Math.max(0, Math.min(100, Math.round(fleschRaw)));

  // 5. Calculate Heuristic Quality Score (0-100)
  let score = 50;

  if (wordCount >= 800) score += 20;
  else if (wordCount >= 400) score += 15;
  else if (wordCount >= 250) score += 10;
  else if (wordCount < 150) score -= 25;

  if (hasHeadings) score += 10;
  if (hasLists) score += 5;
  if (hasReferences || hasCodeOrMedia) score += 5;

  if (lexicalDiversity >= 0.45) score += 10;
  else if (lexicalDiversity >= 0.35) score += 5;
  else if (cleanWords.length > 50 && lexicalDiversity < 0.22) score -= 15;

  const heuristicQualityScore = Math.max(10, Math.min(100, score));
  const readingTimeMin = Math.max(1, Math.ceil(wordCount / 220));

  return {
    wordCount,
    readingTimeMin,
    fleschScore,
    lexicalDiversity,
    hasHeadings,
    hasLists,
    hasReferences,
    hasCodeOrMedia,
    heuristicQualityScore,
    passed: issues.length === 0,
    issues,
  };
}
