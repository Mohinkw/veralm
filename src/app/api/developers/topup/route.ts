import { NextRequest, NextResponse } from 'next/server';
import { parseJsonObject, requireUser } from '@/lib/auth/request';
import { getSiteUrl } from '@/lib/utils';

export async function POST(request: NextRequest) {
  const auth = await requireUser(request);
  if ('error' in auth) return auth.error;

  const parsed = await parseJsonObject(request);
  if ('error' in parsed) return parsed.error;

  const rawAmount = Number(parsed.data.amountUsd);
  if (!Number.isFinite(rawAmount) || rawAmount < 5 || rawAmount > 100000) {
    return NextResponse.json(
      { error: 'Top-up amount must be between $5.00 and $100,000.00 USD per transaction.' },
      { status: 400 }
    );
  }

  const amountCents = Math.round(rawAmount * 100);
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) {
    return NextResponse.json(
      { error: 'Stripe billing is not configured in this environment.' },
      { status: 503 }
    );
  }

  try {
    const siteUrl = getSiteUrl();
    const params = new URLSearchParams({
      mode: 'payment',
      'line_items[0][price_data][currency]': 'usd',
      'line_items[0][price_data][unit_amount]': String(amountCents),
      'line_items[0][price_data][product_data][name]': 'VeraLM API Pay-As-You-Go Credits',
      'line_items[0][price_data][product_data][description]': `$${(amountCents / 100).toFixed(2)} non-expiring API wallet credit ($0.01/request)`,
      'line_items[0][quantity]': '1',
      success_url: `${siteUrl}/developers?topup=success`,
      cancel_url: `${siteUrl}/developers?topup=canceled`,
      client_reference_id: auth.user.id,
      'metadata[type]': 'api_credit_topup',
      'metadata[userId]': auth.user.id,
      'metadata[amountCents]': String(amountCents),
    });

    if (auth.user.email) {
      params.set('customer_email', auth.user.email);
    }

    const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${stripeKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    const session = await res.json();
    if (!res.ok || !session.url) {
      return NextResponse.json(
        { error: session.error?.message || 'Could not create top-up checkout session.' },
        { status: 502 }
      );
    }

    return NextResponse.json({ url: session.url, amountCents });
  } catch (err) {
    console.error('[Developer Topup POST] Error:', err);
    return NextResponse.json({ error: 'Top-up initialization failed.' }, { status: 500 });
  }
}
