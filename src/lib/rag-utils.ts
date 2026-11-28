/**
 * Pure RAG text chunking and citation-parsing utilities (zero DB or network dependencies).
 */

export interface ChunkWithMeta {
  index: number;
  text: string;
  heading: string | null;
  isIntroChunk: boolean;
}

/**
 * Finds a clean Markdown/paragraph/sentence/word boundary near `targetEnd`
 * without splitting UTF-16 surrogate pairs.
 */
function findCleanEnd(text: string, start: number, targetEnd: number): number {
  if (targetEnd >= text.length) return text.length;

  let end = targetEnd;
  const searchFloor = Math.max(start + Math.floor((targetEnd - start) * 0.55), start + 1);

  const paraBreak = text.lastIndexOf('\n\n', end);
  if (paraBreak >= searchFloor) {
    end = paraBreak;
  } else {
    const lineBreak = text.lastIndexOf('\n', end);
    if (lineBreak >= searchFloor) {
      end = lineBreak;
    } else {
      const space = text.lastIndexOf(' ', end);
      if (space >= searchFloor) {
        end = space;
      }
    }
  }

  // Avoid splitting a UTF-16 surrogate pair
  if (end > start && end < text.length) {
    const code = text.charCodeAt(end - 1);
    if (code >= 0xd800 && code <= 0xdbff) {
      end = Math.max(start + 1, end - 1);
    }
  }

  return end;
}

/**
 * Split text into Markdown-boundary-aware chunks with heading metadata.
 */
export function chunkTextWithMeta(
  text: string,
  chunkSize = 1800,
  overlap = 200
): ChunkWithMeta[] {
  const normalized = text.replace(/\r\n/g, '\n').trim();
  if (!normalized) return [];

  const safeSize = Math.max(200, chunkSize);
  const safeOverlap = Math.max(0, Math.min(overlap, Math.floor(safeSize / 2)));

  const chunks: ChunkWithMeta[] = [];
  let start = 0;
  let lastHeading: string | null = null;
  let index = 0;

  while (start < normalized.length) {
    const targetEnd = Math.min(start + safeSize, normalized.length);
    const end = findCleanEnd(normalized, start, targetEnd);
    const slice = normalized.slice(start, end).trim();

    if (slice) {
      const headings = [...slice.matchAll(/^#{1,4}\s+(.+)$/gm)];
      const chunkHeading = headings.length > 0 ? headings[headings.length - 1][1].trim() : lastHeading;
      if (headings.length > 0) {
        lastHeading = headings[headings.length - 1][1].trim();
      }
      chunks.push({
        index,
        text: slice,
        heading: chunkHeading,
        isIntroChunk: index === 0,
      });
      index++;
    }

    if (end >= normalized.length) break;

    let nextStart = Math.max(start + 1, end - safeOverlap);
    while (nextStart < end && /\s/.test(normalized[nextStart])) {
      nextStart++;
    }
    if (nextStart > 0 && nextStart < normalized.length) {
      const code = normalized.charCodeAt(nextStart);
      if (code >= 0xdc00 && code <= 0xdfff) nextStart++;
    }
    start = nextStart > start ? nextStart : end;
  }

  return chunks;
}

export function chunkText(text: string, chunkSize = 1800, overlap = 200): string[] {
  return chunkTextWithMeta(text, chunkSize, overlap).map((c) => c.text);
}

/**
 * Normalizes LaTeX math delimiters (\(...\), \[...\]) while shielding standalone prose
 * currency ranges (e.g. "$50 USD and $89/year") from remark-math single-dollar parsing.
 */
export function prepareMarkdownWithMath(content: string): string {
  if (!content) return '';

  const segments = content.split(/(```[\s\S]*?```|`[^`\n]+`)/g);
  return segments
    .map((segment, idx) => {
      // Leave fenced and inline code untouched
      if (idx % 2 === 1) return segment;

      // Normalize LaTeX block & inline delimiters to Markdown $ / $$
      let normalized = segment
        .replace(/\\\[([\s\S]*?)\\\]/g, (_, inner: string) => `\n$$\n${inner.trim()}\n$$\n`)
        .replace(/\\\(([^\n]*?)\\\)/g, (_, inner: string) => `$${inner.trim()}$`);

      // Escape numeric currency literals (e.g. "$50.00 USD and $89/year") while keeping math like "$1 + 2 = 3$"
      normalized = normalized.replace(
        /(?<![\\$])\$(?!\$)(?=\d[\d,]*(?:\.\d+)?(?:[kmbKMB]\b|\/(?:yr|mo|year|month|wk|day|hr)\b|[\s,.;:!?)]|$))/g,
        (match, offset: number, whole: string) => {
          const rest = whole.slice(offset + 1);
          const lineEnd = rest.indexOf('\n');
          const lineRest = lineEnd >= 0 ? rest.slice(0, lineEnd) : rest;
          const closeMatch = lineRest.match(/(?<!\\)\$/);
          if (closeMatch && typeof closeMatch.index === 'number') {
            const inner = lineRest.slice(0, closeMatch.index);
            const hasMathExpr =
              !/^\s|\s$/.test(inner) &&
              (/[\\^_=+*<>|]/.test(inner) || /\s[+\-*/=]\s/.test(inner)) &&
              !/\b(?:and|or|to|for|per|usd|eur|gbp|year|month|costs?|price|from)\b/i.test(inner);
            if (hasMathExpr) return match;
          }
          return '\\$';
        }
      );

      return normalized;
    })
    .join('');
}

/**
 * Reciprocal Rank Fusion (RRF) merges dense vector and sparse FTS ranked lists cleanly.
 */
export function fuseHybridResultsRRF<T extends { article_id: string }>(
  dense: T[],
  sparse: T[],
  limit = 5,
  k = 60
): T[] {
  const scores = new Map<string, { item: T; score: number }>();

  dense.forEach((item, rank) => {
    const rrf = 1 / (k + rank + 1);
    const existing = scores.get(item.article_id);
    if (existing) {
      existing.score += rrf;
    } else {
      scores.set(item.article_id, { item, score: rrf });
    }
  });

  sparse.forEach((item, rank) => {
    const rrf = 1 / (k + rank + 1);
    const existing = scores.get(item.article_id);
    if (existing) {
      existing.score += rrf;
      // Prefer dense chunk_text if present, otherwise keep existing
    } else {
      scores.set(item.article_id, { item, score: rrf });
    }
  });

  return Array.from(scores.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((entry) => entry.item);
}

/**
 * Extracts 1-based citation numbers actually referenced in the synthesized answer (`[1]`, `[2]`).
 */
export function extractCitedIndices(answer: string, totalSources: number): Set<number> {
  const cited = new Set<number>();
  const matches = answer.matchAll(/\[(\d{1,2})\]/g);
  for (const m of matches) {
    const idx = Number(m[1]);
    if (idx >= 1 && idx <= totalSources) {
      cited.add(idx);
    }
  }
  return cited;
}

/**
 * Detects pure greetings or VeraLM assistant identity/meta questions
 * so they are answered naturally without dumping unrelated Knowledge Vault articles.
 */
export function isConversationalOrMetaQuery(query: string): boolean {
  const clean = query
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s']/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!clean || clean.length > 90) return false;

  const greetingOnly =
    /^(hi|hello|hey|yo|hola|salam|assalamu\s*alaikum|good\s*(morning|afternoon|evening)|thanks|thank\s*you|ok|okay|bye|goodbye)(\s+(there|veralm|ai|bot|friend))?$/i;
  if (greetingOnly.test(clean)) return true;

  const identityPatterns = [
    /^(?:hi|hello|hey)?\s*(?:who|what|which)\s+(?:model|ai|llm|assistant|system|bot)\s+are\s+you$/,
    /^(?:hi|hello|hey)?\s*(?:who|what)\s+are\s+you$/,
    /^(?:hi|hello|hey)?\s*what\s+is\s+(?:your\s+name|veralm)$/,
    /^(?:hi|hello|hey)?\s*(?:who|which\s+company)\s+(?:made|built|created|trained)\s+you$/,
    /^(?:hi|hello|hey)?\s*how\s+do\s+you\s+work$/,
    /^(?:hi|hello|hey)?\s*what\s+can\s+you\s+do$/,
  ];
  return identityPatterns.some((re) => re.test(clean));
}

const INSUFFICIENT_SOURCES_RE =
  /do(?:es)? not contain|don't contain|do(?:es)? not mention|doesn't cover|not (?:covered|mentioned|found|available) in|no (?:relevant )?information|couldn't locate|cannot answer/i;

/**
 * Keeps only sources actually cited in the answer and renumbers inline [n] sequentially (1..k).
 * Drops all sources if the answer indicates the sources do not cover the question.
 * If the answer used the vault without printing [1], preserves the primary source [1].
 */
export function filterAndRenumberCitedSources<T>(
  answer: string,
  rows: T[]
): { answer: string; rows: T[] } {
  if (!rows.length) return { answer, rows: [] };
  const citedSet = extractCitedIndices(answer, rows.length);
  if (citedSet.size === 0) {
    if (INSUFFICIENT_SOURCES_RE.test(answer)) {
      return { answer, rows: [] };
    }
    return { answer: `${answer.trimEnd()} [1]`, rows: [rows[0]] };
  }

  const orderedOld = Array.from(citedSet).sort((a, b) => a - b);
  const oldToNew = new Map<number, number>();
  const keptRows: T[] = [];
  orderedOld.forEach((oldIdx, pos) => {
    oldToNew.set(oldIdx, pos + 1);
    keptRows.push(rows[oldIdx - 1]);
  });

  const renumbered = answer.replace(/\[(\d{1,2})\]/g, (full, numStr) => {
    const mapped = oldToNew.get(Number(numStr));
    return mapped ? `[${mapped}]` : full;
  });

  return { answer: renumbered, rows: keptRows };
}
