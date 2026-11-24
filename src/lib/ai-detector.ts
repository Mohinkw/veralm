/**
 * VeraLM AI Detection & Content Quality Auditor
 * Dual Engine: Statistical Burstiness/N-gram analysis + LLM-as-a-Judge (Gemini Free Tier / OpenAI)
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { validateContentHeuristics, HeuristicQualityReport } from './content-validator';

export interface ContentAuditResult {
  compositeQualityScore: number; // 0 - 100
  originalityScore: number;      // 0 - 100
  aiProbabilityScore: number;    // 0 - 100
  verdict: 'approved' | 'review_required' | 'revision_requested';
  summary: string;
  heuristicReport: HeuristicQualityReport;
  flaggedSignals: string[];
}

// Common patterns strongly correlated with unedited LLM output
const AI_PATTERNS = [
  /\bdelve into\b/i,
  /\ba testament to\b/i,
  /\bvibrant tapestry\b/i,
  /\brich tapestry\b/i,
  /\bin today's (fast-paced|rapidly evolving) world\b/i,
  /\bit is worth noting that\b/i,
  /\bfosters a sense of\b/i,
  /\bpaves the way for\b/i,
  /\bgame-changer\b/i,
  /\bin conclusion,?\b/i,
  /\bit remains to be seen\b/i,
];

/**
 * Calculates sentence length variance (burstiness).
 * High variance = Human writing (mixes 3-word punchy lines with 30-word complex thoughts).
 * Very low variance = Classic AI hallmark (uniform 15-22 word sentences).
 */
function calculateSentenceBurstiness(content: string): { burstinessScore: number; flaggedSignals: string[] } {
  const sentences = content
    .split(/[.!?]+(?:\s+|$)/)
    .map((s) => s.trim().split(/\s+/).filter(Boolean).length)
    .filter((len) => len > 2);

  const flaggedSignals: string[] = [];

  if (sentences.length < 5) {
    return { burstinessScore: 50, flaggedSignals };
  }

  const mean = sentences.reduce((a, b) => a + b, 0) / sentences.length;
  const variance =
    sentences.reduce((sum, len) => sum + Math.pow(len - mean, 2), 0) / sentences.length;
  const stdDev = Math.sqrt(variance);

  // If standard deviation is extremely low, sentences are unnaturally uniform
  if (stdDev < 3.2 && sentences.length > 8) {
    flaggedSignals.push('Low sentence length variance (uniform cadence typical of raw LLM text)');
  }

  // Check keyword patterns
  let patternHits = 0;
  for (const pattern of AI_PATTERNS) {
    if (pattern.test(content)) {
      patternHits++;
    }
  }

  if (patternHits >= 2) {
    flaggedSignals.push(`Detected ${patternHits} common AI transitional cliché phrases`);
  }

  // Base AI probability estimate from burstiness + phrases
  let heuristicAiProb = 10;
  if (stdDev < 3.5) heuristicAiProb += 20;
  if (patternHits > 0) heuristicAiProb += Math.min(40, patternHits * 15);

  return {
    burstinessScore: Math.min(100, Math.max(0, heuristicAiProb)),
    flaggedSignals,
  };
}

/**
 * Audits an article using Gemini (or OpenAI fallback) as an expert peer reviewer.
 */
export async function auditArticleSubmission(
  title: string,
  content: string
): Promise<ContentAuditResult> {
  // 1. Run deterministic heuristics
  const heuristicReport = validateContentHeuristics(content, title);
  const { burstinessScore, flaggedSignals } = calculateSentenceBurstiness(content);

  const apiKey = process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  let llmQuality = heuristicReport.heuristicQualityScore;
  let llmOriginality = 90;
  let llmAiProb = burstinessScore;
  let summary = 'Automated deterministic audit completed.';

  // 2. LLM-as-a-Judge inspection using Google Gemini (Free Tier)
  if (apiKey && !apiKey.includes('placeholder')) {
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({
        model: 'gemini-flash-lite-latest',
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.1,
        },
      });

      const auditPrompt = `You are the Lead Scientific & Technical Editor for VeraLM, a frontier AI model grounded exclusively on authoritative human knowledge.
Audit this creator submission for publication in the VeraLM knowledge base:

Article Title: "${title}"
Content Sample:
"""
${content.slice(0, 4500)}
"""

Evaluate across three metrics:
1. "compositeQualityScore" (0-100): Depth, accuracy, structure, clear domain knowledge, clarity.
2. "originalityScore" (0-100): Unique insights, practitioner evidence, or real-world details vs generic regurgitation.
3. "aiProbabilityScore" (0-100): Probability that this was generated directly by an LLM without human editing. Look for uniform sentence structures, lack of personal experience, and generic filler statements.

Respond ONLY with this exact JSON format:
{
  "compositeQualityScore": number,
  "originalityScore": number,
  "aiProbabilityScore": number,
  "evaluationSummary": "string",
  "aiSignals": ["string"]
}`;

      const res = await model.generateContent(auditPrompt);
      const data = JSON.parse(res.response.text());

      if (typeof data.compositeQualityScore === 'number') {
        llmQuality = Math.min(100, Math.max(0, Math.round(data.compositeQualityScore)));
      }
      if (typeof data.originalityScore === 'number') {
        llmOriginality = Math.min(100, Math.max(0, Math.round(data.originalityScore)));
      }
      if (typeof data.aiProbabilityScore === 'number') {
        llmAiProb = Math.min(100, Math.max(0, Math.round(data.aiProbabilityScore)));
      }
      if (data.evaluationSummary) {
        summary = data.evaluationSummary;
      }
      if (Array.isArray(data.aiSignals)) {
        flaggedSignals.push(...data.aiSignals);
      }
    } catch (err: any) {
      console.warn('[AI Detector] Gemini audit warning, checking OpenAI fallback:', err?.message || err);

      // Fallback to OpenAI if configured
      if (openaiKey && !openaiKey.includes('placeholder')) {
        try {
          const resp = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${openaiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'gpt-4o-mini',
              messages: [
                {
                  role: 'system',
                  content: 'Evaluate the article. Respond ONLY with valid JSON: {"compositeQualityScore": number, "originalityScore": number, "aiProbabilityScore": number, "evaluationSummary": "string", "aiSignals": []}',
                },
                {
                  role: 'user',
                  content: `Title: ${title}\n\nContent:\n${content.slice(0, 3000)}`,
                },
              ],
              response_format: { type: 'json_object' },
              temperature: 0.1,
            }),
          });

          if (resp.ok) {
            const parsed = await resp.json();
            const data = JSON.parse(parsed.choices[0].message.content);
            llmQuality = data.compositeQualityScore || llmQuality;
            llmOriginality = data.originalityScore || llmOriginality;
            llmAiProb = data.aiProbabilityScore || llmAiProb;
            summary = data.evaluationSummary || summary;
          }
        } catch (oaErr) {
          console.warn('[AI Detector] OpenAI fallback warning:', oaErr);
        }
      }
    }
  }

  // 3. Blend Heuristics with LLM Score
  const finalQuality = Math.round(llmQuality * 0.7 + heuristicReport.heuristicQualityScore * 0.3);
  const finalAiProb = Math.round(llmAiProb * 0.7 + burstinessScore * 0.3);
  const finalOriginality = Math.round(llmOriginality);

  // 4. Decision logic for VeraLM knowledge model
  let verdict: 'approved' | 'review_required' | 'revision_requested' = 'approved';

  if (!heuristicReport.passed || finalQuality < 50 || finalAiProb > 75) {
    verdict = 'revision_requested';
  } else if (finalQuality < 70 || finalAiProb > 45) {
    verdict = 'review_required';
  } else {
    verdict = 'approved';
  }

  return {
    compositeQualityScore: finalQuality,
    originalityScore: finalOriginality,
    aiProbabilityScore: finalAiProb,
    verdict,
    summary,
    heuristicReport,
    flaggedSignals: Array.from(new Set([...flaggedSignals, ...heuristicReport.issues])),
  };
}
