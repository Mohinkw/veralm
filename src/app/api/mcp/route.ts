import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { and, eq, sql } from 'drizzle-orm';
import { db } from '@/db/client';
import { apiKeys, categories } from '@/db/schema';
import { extractClientIp, isRateLimited } from '@/lib/rate-limit';
import { searchKnowledgeBase } from '@/lib/services/search';

const MCP_TOOLS = [
  {
    name: 'query_verified_knowledge',
    description:
      'Search VeraLM verified, expert-authored Knowledge Vault articles and return grounded passages with author attribution.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'The question or topic to retrieve verified passages for.' },
        category: { type: 'string', description: 'Optional category slug filter (e.g. technology, science, finance).' },
        limit: { type: 'number', description: 'Maximum passages to return (1-8, default 4).' },
      },
      required: ['query'],
    },
  },
  {
    name: 'list_knowledge_categories',
    description: 'List active VeraLM knowledge categories available for grounding.',
    inputSchema: { type: 'object', properties: {} },
  },
];

function jsonRpcResult(id: string | number | null, result: unknown) {
  return NextResponse.json({ jsonrpc: '2.0', id, result });
}

function jsonRpcError(id: string | number | null, code: number, message: string, status = 200) {
  return NextResponse.json({ jsonrpc: '2.0', id, error: { code, message } }, { status });
}

export async function POST(request: NextRequest) {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return jsonRpcError(null, -32700, 'Parse error', 400);
  }

  const id = body?.id ?? null;
  const method = typeof body?.method === 'string' ? body.method : '';

  if (method === 'initialize') {
    return jsonRpcResult(id, {
      protocolVersion: '2024-11-05',
      capabilities: { tools: {} },
      serverInfo: { name: 'veralm-mcp', version: '1.0.0' },
    });
  }

  if (method === 'tools/list') {
    return jsonRpcResult(id, { tools: MCP_TOOLS });
  }

  if (method === 'tools/call') {
    const toolName = body?.params?.name;
    const args = body?.params?.arguments || {};

    const authHeader = request.headers.get('authorization')?.trim() || '';
    const rawKey = authHeader.toLowerCase().startsWith('bearer ') ? authHeader.slice(7).trim() : '';

    if (rawKey.startsWith('vlm_live_')) {
      const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');
      const [keyRec] = await db
        .select()
        .from(apiKeys)
        .where(and(eq(apiKeys.keyHash, keyHash), eq(apiKeys.isActive, true)))
        .limit(1);

      if (!keyRec) return jsonRpcError(id, -32001, 'Invalid or revoked API key.');
      if (keyRec.requestsUsed >= keyRec.monthlyQuota) {
        return jsonRpcError(id, -32002, 'Monthly API key quota exceeded.');
      }
      await db
        .update(apiKeys)
        .set({ requestsUsed: sql`${apiKeys.requestsUsed} + 1`, lastUsedAt: new Date() })
        .where(eq(apiKeys.id, keyRec.id));
    } else {
      const ip = extractClientIp(request);
      if (await isRateLimited(`mcp:${ip}`)) {
        return jsonRpcError(id, -32002, 'Demo MCP rate limit exceeded. Pass Bearer vlm_live_... API key.');
      }
    }

    if (toolName === 'list_knowledge_categories') {
      const rows = await db
        .select({ name: categories.name, slug: categories.slug, description: categories.description })
        .from(categories)
        .where(eq(categories.isActive, true))
        .limit(30);
      return jsonRpcResult(id, {
        content: [{ type: 'text', text: JSON.stringify({ categories: rows }, null, 2) }],
      });
    }

    if (toolName === 'query_verified_knowledge') {
      const query = typeof args.query === 'string' ? args.query.trim() : '';
      if (query.length < 2) {
        return jsonRpcError(id, -32602, 'Invalid params: query is required (min 2 chars).');
      }
      const category = typeof args.category === 'string' ? args.category.trim() : undefined;
      const limit = Math.min(8, Math.max(1, Math.floor(Number(args.limit ?? 4) || 4)));

      const { vaultResults, vaultSource } = await searchKnowledgeBase(query, {
        categorySlug: category,
        limit,
      });
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://veralm.com';

      const formatted = vaultResults.map((r, i) => ({
        index: i + 1,
        title: r.title,
        author: r.author_name,
        freshness: r.freshness_status || 'current',
        verified_domain: r.verified_domain || null,
        url: `${baseUrl}/articles/${r.slug}#passage-${r.chunk_index ?? 0}`,
        excerpt: r.chunk_text,
      }));

      return jsonRpcResult(id, {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ query, vault_source: vaultSource, results: formatted }, null, 2),
          },
        ],
      });
    }

    return jsonRpcError(id, -32601, `Unknown tool: ${String(toolName)}`);
  }

  return jsonRpcError(id, -32601, `Method not found: ${method}`);
}
