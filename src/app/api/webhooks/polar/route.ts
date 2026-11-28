import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { users } from '@/db/schema';
import { isValidUuid } from '@/lib/auth/request';
import { verifyPolarWebhookSignature } from '@/lib/polar-webhook';

type PolarObj = Record<string, unknown>;

function asString(v: unknown): string | null {
  return typeof v === 'string' && v.trim() ? v.trim() : null;
}

function asMetadata(v: unknown): Record<string, string> {
  if (!v || typeof v !== 'object') return {};
  const out: Record<string, string> = {};
  for (const [k, val] of Object.entries(v as PolarObj)) {
    if (typeof val === 'string') out[k] = val;
  }
  return out;
}

async function setProTier(opts: {
  userId?: string | null;
  email?: string | null;
  tier: 'pro' | 'free';
  proExpiresAt: Date | null;
}) {
  const now = new Date();
  if (opts.userId && isValidUuid(opts.userId)) {
    if (opts.tier === 'free') {
      await db
        .update(users)
        .set({
          subscriptionTier: 'free',
          proExpiresAt: opts.proExpiresAt,
          updatedAt: now,
        })
        .where(eq(users.id, opts.userId));
      return;
    }

    await db
      .insert(users)
      .values({
        id: opts.userId,
        email: opts.email || `${opts.userId}@veralm.user`,
        role: 'creator',
        subscriptionTier: opts.tier,
        proExpiresAt: opts.proExpiresAt,
        isActive: true,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: users.id,
        set: {
          subscriptionTier: opts.tier,
          ...(opts.proExpiresAt ? { proExpiresAt: opts.proExpiresAt } : {}),
          updatedAt: now,
        },
      });
    return;
  }

  if (opts.email) {
    await db
      .update(users)
      .set({
        subscriptionTier: opts.tier,
        proExpiresAt: opts.proExpiresAt,
        updatedAt: now,
      })
      .where(eq(users.email, opts.email));
  }
}

export async function POST(request: NextRequest) {
  const secret = process.env.POLAR_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: 'POLAR_WEBHOOK_SECRET is not configured.' },
      { status: 503 }
    );
  }

  const rawBody = await request.text();
  const valid = verifyPolarWebhookSignature(
    rawBody,
    {
      id: request.headers.get('webhook-id'),
      timestamp: request.headers.get('webhook-timestamp'),
      signature: request.headers.get('webhook-signature'),
    },
    secret
  );

  if (!valid) {
    return NextResponse.json({ error: 'Invalid Polar webhook signature.' }, { status: 400 });
  }

  let event: { type?: string; data?: PolarObj };
  try {
    event = JSON.parse(rawBody) as { type?: string; data?: PolarObj };
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload.' }, { status: 400 });
  }

  const data = event.data ?? {};
  const metadata = asMetadata(data.metadata);
  const customer =
    data.customer && typeof data.customer === 'object' ? (data.customer as PolarObj) : {};
  const userId = metadata.userId || asString(customer.external_id) || asString(data.customer_external_id);
  const email = asString(customer.email) || asString(data.customer_email);
  const periodEndStr = asString(data.current_period_end);
  const periodEnd = periodEndStr ? new Date(periodEndStr) : null;

  try {
    switch (event.type) {
      case 'subscription.active':
      case 'subscription.created': {
        const status = asString(data.status);
        if (event.type === 'subscription.active' || status === 'active' || status === 'trialing') {
          await setProTier({
            userId,
            email,
            tier: 'pro',
            proExpiresAt:
              periodEnd && !Number.isNaN(periodEnd.getTime())
                ? periodEnd
                : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          });
        }
        break;
      }

      case 'subscription.updated': {
        const status = asString(data.status);
        if (status === 'active' || status === 'trialing') {
          await setProTier({
            userId,
            email,
            tier: 'pro',
            proExpiresAt:
              periodEnd && !Number.isNaN(periodEnd.getTime())
                ? periodEnd
                : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          });
        } else if (status === 'canceled') {
          const stillActive = periodEnd && !Number.isNaN(periodEnd.getTime()) && periodEnd.getTime() > Date.now();
          await setProTier({
            userId,
            email,
            tier: stillActive ? 'pro' : 'free',
            proExpiresAt: stillActive ? periodEnd : null,
          });
        } else if (status === 'revoked' || status === 'unpaid') {
          await setProTier({ userId, email, tier: 'free', proExpiresAt: null });
        }
        break;
      }

      case 'subscription.revoked': {
        await setProTier({ userId, email, tier: 'free', proExpiresAt: null });
        break;
      }

      default:
        break;
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error('[Polar Webhook] Error:', err);
    return NextResponse.json({ error: 'Webhook processing failed.' }, { status: 500 });
  }
}
