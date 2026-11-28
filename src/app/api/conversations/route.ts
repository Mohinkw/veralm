import { NextRequest, NextResponse } from 'next/server';
import { isValidUuid, parseJsonObject, requireUser } from '@/lib/auth/request';
import { executeRawSQL } from '@/db/client';

export async function GET(request: NextRequest) {
  const auth = await requireUser(request);
  if ('error' in auth) return auth.error;

  try {
    const convRes = await executeRawSQL(
      `SELECT id, title, category_slug, created_at, updated_at
       FROM conversations
       WHERE user_id = $1
       ORDER BY updated_at DESC
       LIMIT 30`,
      [auth.user.id]
    );
    const convRows = convRes?.rows || [];
    if (convRows.length === 0) {
      return NextResponse.json({ conversations: [] }, { headers: { 'Cache-Control': 'private, no-store' } });
    }

    const convIds = convRows.map((c: { id: string }) => c.id);
    const msgRes = await executeRawSQL(
      `SELECT id, conversation_id, role, content, response_json, feedback, created_at
       FROM conversation_messages
       WHERE conversation_id = ANY($1::uuid[]) AND user_id = $2
       ORDER BY created_at ASC`,
      [convIds, auth.user.id]
    );

    const byConv = new Map<string, Array<Record<string, unknown>>>();
    for (const m of msgRes?.rows || []) {
      const cid = String(m.conversation_id);
      if (!byConv.has(cid)) byConv.set(cid, []);
      byConv.get(cid)!.push({
        id: m.id,
        role: m.role,
        content: m.content,
        response: m.response_json || undefined,
        feedback: m.feedback ?? undefined,
      });
    }

    const conversations = convRows.map((c: Record<string, unknown>) => ({
      id: String(c.id),
      title: String(c.title || 'New Conversation'),
      categorySlug: typeof c.category_slug === 'string' ? c.category_slug : undefined,
      updatedAt: c.updated_at ? new Date(String(c.updated_at)).toISOString() : new Date().toISOString(),
      messages: byConv.get(String(c.id)) || [],
    }));

    return NextResponse.json({ conversations }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (err) {
    console.error('[Conversations GET] Error:', err);
    return NextResponse.json({ error: 'Could not load conversations.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireUser(request);
  if ('error' in auth) return auth.error;

  const parsed = await parseJsonObject(request);
  if ('error' in parsed) return parsed.error;
  const body = parsed.data;

  try {
    const rawId = typeof body.id === 'string' && isValidUuid(body.id) ? body.id : null;
    const title =
      typeof body.title === 'string' && body.title.trim()
        ? body.title.trim().slice(0, 120)
        : 'New Conversation';
    const categorySlug =
      typeof body.categorySlug === 'string' && body.categorySlug.trim()
        ? body.categorySlug.trim().slice(0, 80)
        : null;
    const messages = Array.isArray(body.messages) ? body.messages.slice(-40) : [];

    let convId = rawId;
    if (convId) {
      const upd = await executeRawSQL(
        `INSERT INTO conversations (id, user_id, title, category_slug, updated_at)
         VALUES ($1, $2, $3, $4, NOW())
         ON CONFLICT (id) DO UPDATE SET
           title = EXCLUDED.title,
           category_slug = EXCLUDED.category_slug,
           updated_at = NOW()
         WHERE conversations.user_id = $2
         RETURNING id`,
        [convId, auth.user.id, title, categorySlug]
      );
      if (!upd?.rows?.length) {
        return NextResponse.json({ error: 'Conversation not found.' }, { status: 404 });
      }
    } else {
      const ins = await executeRawSQL(
        `INSERT INTO conversations (user_id, title, category_slug)
         VALUES ($1, $2, $3)
         RETURNING id`,
        [auth.user.id, title, categorySlug]
      );
      convId = ins?.rows?.[0]?.id;
    }

    if (convId && messages.length > 0) {
      await executeRawSQL(
        `DELETE FROM conversation_messages WHERE conversation_id = $1 AND user_id = $2`,
        [convId, auth.user.id]
      );
      for (const m of messages) {
        if (!m || typeof m !== 'object') continue;
        const msg = m as Record<string, unknown>;
        const role = msg.role === 'assistant' ? 'assistant' : 'user';
        const content = typeof msg.content === 'string' ? msg.content.slice(0, 30000) : '';
        if (!content) continue;
        const responseJson = msg.response && typeof msg.response === 'object' ? JSON.stringify(msg.response) : null;
        const feedback = msg.feedback === 1 || msg.feedback === -1 ? msg.feedback : null;
        await executeRawSQL(
          `INSERT INTO conversation_messages (conversation_id, user_id, role, content, response_json, feedback)
           VALUES ($1, $2, $3, $4, $5::jsonb, $6)`,
          [convId, auth.user.id, role, content, responseJson, feedback]
        );
      }
    }

    return NextResponse.json({ id: convId, saved: true });
  } catch (err) {
    console.error('[Conversations POST] Error:', err);
    return NextResponse.json({ error: 'Could not save conversation.' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const auth = await requireUser(request);
  if ('error' in auth) return auth.error;

  try {
    const clearAll = request.nextUrl.searchParams.get('all') === '1';
    const id = request.nextUrl.searchParams.get('id');

    if (clearAll) {
      await executeRawSQL(`DELETE FROM conversations WHERE user_id = $1`, [auth.user.id]);
      return NextResponse.json({ deleted: true });
    }
    if (!isValidUuid(id)) {
      return NextResponse.json({ error: 'Valid conversation id required.' }, { status: 400 });
    }

    await executeRawSQL(
      `DELETE FROM conversations WHERE id = $1 AND user_id = $2`,
      [id, auth.user.id]
    );
    return NextResponse.json({ deleted: true });
  } catch (err) {
    console.error('[Conversations DELETE] Error:', err);
    return NextResponse.json({ error: 'Could not delete conversation.' }, { status: 500 });
  }
}
