import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { requireUser } from '@/lib/auth/request';
import { db } from '@/db/client';
import { users } from '@/db/schema';
import { getSiteUrl } from '@/lib/utils';

export async function POST(request: NextRequest) {
  const auth = await requireUser(request);
  if ('error' in auth) return auth.error;

  try {
    const body = await request.json().catch(() => ({}));
    const billingCycle = body.billingCycle === 'annual' ? 'annual' : 'monthly';
    const siteUrl = getSiteUrl();

    const stripeKey = process.env.STRIPE_SECRET_KEY;
    const priceId =
      billingCycle === 'annual'
        ? process.env.STRIPE_PRO_ANNUAL_PRICE_ID
        : process.env.STRIPE_PRO_MONTHLY_PRICE_ID;

    // Production path: Stripe Checkout Session via REST API (no extra SDK dependency)
    if (stripeKey && priceId) {
      const params = new URLSearchParams({
        mode: 'subscription',
        'line_items[0][price]': priceId,
        'line_items[0][quantity]': '1',
        success_url: `${siteUrl}/pro?upgraded=1`,
        cancel_url: `${siteUrl}/pro?canceled=1`,
        customer_email: auth.user.email || '',
        client_reference_id: auth.user.id,
        'metadata[userId]': auth.user.id,
        'metadata[billingCycle]': billingCycle,
        'subscription_data[metadata][userId]': auth.user.id,
        'subscription_data[metadata][billingCycle]': billingCycle,
      });

      const stripeRes = await fetch('https://api.stripe.com/v1/checkout/sessions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${stripeKey}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });

      const session = await stripeRes.json();
      if (!stripeRes.ok || !session.url) {
        return NextResponse.json(
          { error: session.error?.message || 'Stripe checkout failed.' },
          { status: 502 }
        );
      }

      return NextResponse.json({ url: session.url });
    }

    // Dev / pre-Stripe test activation when explicitly enabled
    if (process.env.NODE_ENV !== 'production' && process.env.ENABLE_DEV_PRO_UPGRADE === 'true') {
      const days = billingCycle === 'annual' ? 365 : 30;
      const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

      await db
        .insert(users)
        .values({
          id: auth.user.id,
          email: auth.user.email || `${auth.user.id}@veralm.user`,
          role: 'creator',
          subscriptionTier: 'pro',
          proExpiresAt: expiresAt,
          isActive: true,
        })
        .onConflictDoUpdate({
          target: users.id,
          set: {
            subscriptionTier: 'pro',
            proExpiresAt: expiresAt,
            updatedAt: new Date(),
          },
        });

      const res = NextResponse.json({
        upgraded: true,
        subscriptionTier: 'pro',
        proExpiresAt: expiresAt.toISOString(),
      });
      res.cookies.set('veralm_pro_uid', auth.user.id, {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        maxAge: days * 24 * 60 * 60,
      });
      return res;
    }

    return NextResponse.json(
      {
        requiresStripeConfig: true,
        error:
          'Stripe Pro checkout is not configured yet. Set STRIPE_SECRET_KEY and STRIPE_PRO_MONTHLY_PRICE_ID in environment variables.',
      },
      { status: 503 }
    );
  } catch (err) {
    console.error('[Pro Checkout] Error:', err);
    return NextResponse.json({ error: 'Could not start Pro checkout.' }, { status: 500 });
  }
}
