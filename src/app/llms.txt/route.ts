import { NextResponse } from 'next/server';
import { desc, eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { categories, creatorProfiles } from '@/db/schema';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const [activeCategories, topCreators] = await Promise.all([
      db
        .select({
          name: categories.name,
          slug: categories.slug,
          description: categories.description,
        })
        .from(categories)
        .where(eq(categories.isActive, true))
        .limit(30),
      db
        .select({
          displayName: creatorProfiles.displayName,
          slug: creatorProfiles.slug,
          verifiedDomain: creatorProfiles.verifiedDomain,
          totalArticlesApproved: creatorProfiles.totalArticlesApproved,
        })
        .from(creatorProfiles)
        .where(eq(creatorProfiles.isActive, true))
        .orderBy(desc(creatorProfiles.totalQueryContributions))
        .limit(15),
    ]);

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://veralm.com';

    const lines: string[] = [
      '# VeraLM — Verified Human Knowledge Vault & Grounding API',
      '',
      '> VeraLM is an expert-contributed, quality-scored, and licensed AI knowledge platform. Every citation returned by VeraLM attributes original human authors and splits platform revenue with contributors.',
      '',
      '## Grounding & AI Agent Endpoints',
      `- Grounding REST API: ${baseUrl}/api/v1/ground (POST, requires Bearer vlm_live_... API key)`,
      `- Model Context Protocol (MCP): ${baseUrl}/api/mcp (POST JSON-RPC 2.0: initialize, tools/list, tools/call)`,
      `- Developer Portal & API Keys: ${baseUrl}/developers`,
      `- Licensing & Crawler Policy: ${baseUrl}/licensing`,
      `- Robots Policy: ${baseUrl}/robots.txt`,
      '',
      '## Knowledge Categories',
      ...activeCategories.map(
        (c) => `- ${c.name} (${baseUrl}/?focus=${encodeURIComponent(c.name)}): ${c.description || c.slug}`
      ),
      '',
      '## Featured Verified Contributors',
      ...topCreators.map((cr) => {
        const domain = cr.verifiedDomain ? ` [${cr.verifiedDomain}]` : '';
        return `- ${cr.displayName}${domain} (${cr.totalArticlesApproved} approved articles): ${baseUrl}/authors/${cr.slug}`;
      }),
      '',
    ];

    return new NextResponse(lines.join('\n'), {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600',
      },
    });
  } catch (err) {
    console.error('[llms.txt] Error:', err);
    return new NextResponse('# VeraLM\n\nVerified Human Knowledge Vault.\n', {
      status: 200,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }
}
