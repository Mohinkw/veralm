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
