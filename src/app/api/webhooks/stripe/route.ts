import { NextRequest, NextResponse } from 'next/server';
import { eq, sql } from 'drizzle-orm';
import { db } from '@/db/client';
import { apiCreditTransactions, users } from '@/db/schema';
import { isValidUuid } from '@/lib/auth/request';
import { verifyStripeSignature } from '@/lib/stripe-webhook';

type StripeObject = Record<string, unknown>;

interface StripeEvent {
  id: string;
  type: string;
  data?: {
    object?: StripeObject;
  };
}

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function asNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function asMetadata(value: unknown): Record<string, string> {
  if (!value || typeof value !== 'object') return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (typeof v === 'string') out[k] = v;
  }
  return out;
}

async function fetchSubscriptionPeriodEnd(subscriptionId: string): Promise<Date | null> {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) return null;

  try {
    const res = await fetch(`https://api.stripe.com/v1/subscriptions/${encodeURIComponent(subscriptionId)}`, {
      headers: { Authorization: `Bearer ${stripeKey}` },
    });
    if (!res.ok) return null;
    const sub = (await res.json()) as StripeObject;
    const periodEnd = asNumber(sub.current_period_end);
    return periodEnd ? new Date(periodEnd * 1000) : null;
  } catch {
    return null;
  }
}

async function updateUserSubscription(opts: {
  userId?: string | null;
  customerId?: string | null;
  email?: string | null;
  tier: 'pro' | 'free';
  proExpiresAt: Date | null;
}) {
  const now = new Date();

  if (opts.userId && isValidUuid(opts.userId)) {
    if (opts.tier === 'free') {
      // Never dummy-insert a new user on cancellation/deletion events
      await db
        .update(users)
        .set({
          subscriptionTier: 'free',
          proExpiresAt: null,
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
        stripeCustomerId: opts.customerId || null,
        isActive: true,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: users.id,
        set: {
          subscriptionTier: opts.tier,
          ...(opts.proExpiresAt ? { proExpiresAt: opts.proExpiresAt } : {}),
          ...(opts.customerId ? { stripeCustomerId: opts.customerId } : {}),
          updatedAt: now,
        },
      });
    return;
  }

  if (opts.customerId) {
    await db
      .update(users)
      .set({
        subscriptionTier: opts.tier,
        proExpiresAt: opts.proExpiresAt,
        updatedAt: now,
      })
      .where(eq(users.stripeCustomerId, opts.customerId));
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
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json(
      { error: 'STRIPE_WEBHOOK_SECRET is not configured.' },
      { status: 503 }
    );
  }

  const rawBody = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!verifyStripeSignature(rawBody, signature, webhookSecret)) {
    return NextResponse.json({ error: 'Invalid Stripe webhook signature.' }, { status: 400 });
  }

  let event: StripeEvent;
  try {
    event = JSON.parse(rawBody) as StripeEvent;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload.' }, { status: 400 });
  }

  const obj = event.data?.object ?? {};
  const metadata = asMetadata(obj.metadata);

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const paymentStatus = asString(obj.payment_status);
        if (paymentStatus && paymentStatus !== 'paid' && paymentStatus !== 'no_payment_required') {
          break;
        }
        const userId = metadata.userId || asString(obj.client_reference_id);
        const sessionId = asString(obj.id);

        if (metadata.type === 'api_credit_topup') {
          const amountCents = Number(metadata.amountCents || 0);
          if (userId && isValidUuid(userId) && Number.isFinite(amountCents) && amountCents > 0) {
            const existingTx = sessionId
              ? await db
                  .select({ id: apiCreditTransactions.id })
                  .from(apiCreditTransactions)
                  .where(eq(apiCreditTransactions.stripeSessionId, sessionId))
                  .limit(1)
              : [];

            if (existingTx.length === 0) {
              const [updatedUser] = await db
                .update(users)
                .set({
                  apiCreditBalanceCents: sql`${users.apiCreditBalanceCents} + ${Math.floor(amountCents)}`,
                  updatedAt: new Date(),
                })
                .where(eq(users.id, userId))
                .returning({ balance: users.apiCreditBalanceCents });

              if (updatedUser) {
                await db.insert(apiCreditTransactions).values({
                  userId,
                  amountCents: Math.floor(amountCents),
                  balanceAfterCents: updatedUser.balance,
                  txType: 'topup',
                  description: `Stripe wallet top-up ($${(amountCents / 100).toFixed(2)})`,
                  stripeSessionId: sessionId || null,
                });
              }
            }
          }
          break;
        }

        const customerId = asString(obj.customer);
        const customerDetails =
          obj.customer_details && typeof obj.customer_details === 'object'
            ? (obj.customer_details as StripeObject)
            : null;
        const email = asString(obj.customer_email) || asString(customerDetails?.email);
        const subscriptionId = asString(obj.subscription);
        const billingCycle = metadata.billingCycle === 'annual' ? 'annual' : 'monthly';

        let expiresAt = subscriptionId ? await fetchSubscriptionPeriodEnd(subscriptionId) : null;
        if (!expiresAt) {
          const days = billingCycle === 'annual' ? 365 : 30;
          expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
        }

        await updateUserSubscription({
          userId,
          customerId,
          email,
          tier: 'pro',
          proExpiresAt: expiresAt,
        });
        break;
      }

      case 'customer.subscription.updated': {
        const status = asString(obj.status);
        const customerId = asString(obj.customer);
        const userId = metadata.userId || null;
        const periodEnd = asNumber(obj.current_period_end);

        if (status === 'active' || status === 'trialing') {
          await updateUserSubscription({
            userId,
            customerId,
            tier: 'pro',
            proExpiresAt: periodEnd ? new Date(periodEnd * 1000) : null,
          });
        } else if (status === 'canceled' || status === 'unpaid' || status === 'incomplete_expired') {
          await updateUserSubscription({
            userId,
            customerId,
            tier: 'free',
            proExpiresAt: null,
          });
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const customerId = asString(obj.customer);
        const userId = metadata.userId || null;

        await updateUserSubscription({
          userId,
          customerId,
          tier: 'free',
          proExpiresAt: null,
        });
        break;
      }

      case 'invoice.payment_failed': {
        console.warn('[Stripe Webhook] Invoice payment failed for customer:', asString(obj.customer));
        break;
      }

      default:
        break;
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error('[Stripe Webhook] Handler error:', err);
    return NextResponse.json({ error: 'Webhook processing failed.' }, { status: 500 });
  }
}
