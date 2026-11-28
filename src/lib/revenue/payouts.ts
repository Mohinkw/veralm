import { and, desc, eq, sql } from 'drizzle-orm';
import { db } from '@/db/client';
import {
  auditLog,
  creatorEarnings,
  creatorPayoutMethods,
  creatorProfiles,
} from '@/db/schema';

export interface PayoutExecutionItem {
  earningId: string;
  creatorId: string;
  revenuePeriod: string;
  amountUsd: number;
  methodType: string;
  status: 'paid' | 'pending_payout' | 'skipped';
  reference?: string;
  reason?: string;
}

export interface PayoutExecutionSummary {
  processed: number;
  paidCount: number;
  queuedCount: number;
  skippedCount: number;
  totalPaidUsd: number;
  items: PayoutExecutionItem[];
}

function maskIdentifier(val: string): string {
  if (val.length <= 6) return '***';
  return `${val.slice(0, 3)}***${val.slice(-3)}`;
}

async function createStripeConnectTransfer(opts: {
  amountUsd: number;
  destinationAccountId: string;
  revenuePeriod: string;
  earningId: string;
  creatorId: string;
}): Promise<string> {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) {
    throw new Error('STRIPE_SECRET_KEY is not configured');
  }

  const amountCents = Math.round(opts.amountUsd * 100);
  if (amountCents < 100) {
    throw new Error('Transfer amount below $1.00 minimum');
  }

  const params = new URLSearchParams({
    amount: String(amountCents),
    currency: 'usd',
    destination: opts.destinationAccountId,
    transfer_group: `veralm_${opts.revenuePeriod}`,
    'metadata[earningId]': opts.earningId,
    'metadata[creatorId]': opts.creatorId,
    'metadata[revenuePeriod]': opts.revenuePeriod,
  });

  const res = await fetch('https://api.stripe.com/v1/transfers', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${stripeKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Idempotency-Key': `veralm_payout_${opts.earningId}`,
    },
    body: params.toString(),
  });

  const data = (await res.json()) as { id?: string; error?: { message?: string } };
  if (!res.ok || !data.id) {
    throw new Error(data.error?.message || `Stripe transfer failed (${res.status})`);
  }

  return data.id;
}

/**
 * Executes payouts atomically for all `confirmed` creator_earnings rows belonging to active creators
 * that meet the creator's minimum payout threshold.
 */
export async function executeCreatorPayouts(options?: {
  period?: string;
  actorId?: string;
}): Promise<PayoutExecutionSummary> {
  const conditions = [
    eq(creatorEarnings.status, 'confirmed'),
    eq(creatorProfiles.isActive, true),
  ];
  if (options?.period) {
    conditions.push(eq(creatorEarnings.revenuePeriod, options.period));
  }

  const rows = await db
    .select({
      earningId: creatorEarnings.id,
      creatorId: creatorEarnings.creatorId,
      revenuePeriod: creatorEarnings.revenuePeriod,
      netEarnings: creatorEarnings.creatorNetEarnings,
      minimumPayout: creatorProfiles.minimumPayout,
      stripeAccountId: creatorProfiles.stripeAccountId,
    })
    .from(creatorEarnings)
    .innerJoin(creatorProfiles, eq(creatorEarnings.creatorId, creatorProfiles.id))
    .where(and(...conditions));

  const items: PayoutExecutionItem[] = [];
  let paidCount = 0;
  let queuedCount = 0;
  let skippedCount = 0;
  let totalPaidUsd = 0;

  for (const row of rows) {
    const amountUsd = Number(row.netEarnings || 0);
    const minPayout = Number(row.minimumPayout || '50');

    if (amountUsd <= 0 || amountUsd < minPayout) {
      skippedCount++;
      items.push({
        earningId: row.earningId,
        creatorId: row.creatorId,
        revenuePeriod: row.revenuePeriod,
        amountUsd,
        methodType: 'none',
        status: 'skipped',
        reason: `Below minimum payout threshold ($${minPayout.toFixed(2)})`,
      });
      continue;
    }

    const [defaultMethod] = await db
      .select({
        id: creatorPayoutMethods.id,
        methodType: creatorPayoutMethods.methodType,
        accountIdentifier: creatorPayoutMethods.accountIdentifier,
        currency: creatorPayoutMethods.currency,
      })
      .from(creatorPayoutMethods)
      .where(eq(creatorPayoutMethods.creatorId, row.creatorId))
      .orderBy(desc(creatorPayoutMethods.isDefault), desc(creatorPayoutMethods.createdAt))
      .limit(1);

    const methodType: string =
      defaultMethod?.methodType || (row.stripeAccountId ? 'stripe_connect' : 'none');

    if (methodType === 'none') {
      skippedCount++;
      items.push({
        earningId: row.earningId,
        creatorId: row.creatorId,
        revenuePeriod: row.revenuePeriod,
        amountUsd,
        methodType: 'none',
        status: 'skipped',
        reason: 'No payout method configured',
      });
      continue;
    }

    // Atomically claim the `confirmed` row before executing an external transfer to prevent concurrent double-payouts
    const [claimed] = await db
      .update(creatorEarnings)
      .set({ status: 'pending_payout', updatedAt: new Date() })
      .where(and(eq(creatorEarnings.id, row.earningId), eq(creatorEarnings.status, 'confirmed')))
      .returning({ id: creatorEarnings.id });

    if (!claimed) {
      skippedCount++;
      items.push({
        earningId: row.earningId,
        creatorId: row.creatorId,
        revenuePeriod: row.revenuePeriod,
        amountUsd,
        methodType,
        status: 'skipped',
        reason: 'Already claimed by concurrent payout run',
      });
      continue;
    }

    if (methodType === 'stripe_connect') {
      const destination =
        row.stripeAccountId ||
        (defaultMethod?.accountIdentifier.startsWith('acct_')
          ? defaultMethod.accountIdentifier
          : null);

      if (!destination || !process.env.STRIPE_SECRET_KEY) {
        await db
          .update(creatorEarnings)
          .set({
            notes: !process.env.STRIPE_SECRET_KEY
              ? 'Queued: STRIPE_SECRET_KEY not configured'
              : `Queued for Stripe Connect (${maskIdentifier(defaultMethod?.accountIdentifier || '')})`,
            updatedAt: new Date(),
          })
          .where(eq(creatorEarnings.id, row.earningId));

        queuedCount++;
        items.push({
          earningId: row.earningId,
          creatorId: row.creatorId,
          revenuePeriod: row.revenuePeriod,
          amountUsd,
          methodType,
          status: 'pending_payout',
          reason: !process.env.STRIPE_SECRET_KEY
            ? 'STRIPE_SECRET_KEY not configured'
            : 'No Stripe Connect account ID (acct_...)',
        });
        continue;
      }

      try {
        const transferId = await createStripeConnectTransfer({
          amountUsd,
          destinationAccountId: destination,
          revenuePeriod: row.revenuePeriod,
          earningId: row.earningId,
          creatorId: row.creatorId,
        });

        const now = new Date();
        await db.transaction(async (tx) => {
          await tx
            .update(creatorEarnings)
            .set({
              status: 'paid',
              stripeTransferId: transferId,
              paidAt: now,
              notes: `Paid via Stripe Connect (${transferId})`,
              updatedAt: now,
            })
            .where(eq(creatorEarnings.id, row.earningId));

          await tx
            .update(creatorProfiles)
            .set({
              totalLifetimeEarnings: sql`${creatorProfiles.totalLifetimeEarnings} + ${amountUsd.toFixed(4)}::numeric`,
              updatedAt: now,
            })
            .where(eq(creatorProfiles.id, row.creatorId));

          await tx.insert(auditLog).values({
            actorId: options?.actorId || null,
            actorRole: options?.actorId ? 'admin' : 'system',
            action: 'creator.payout_executed',
            entityType: 'creator_earnings',
            entityId: row.earningId,
            metadata: {
              creatorId: row.creatorId,
              revenuePeriod: row.revenuePeriod,
              amountUsd,
              methodType,
              transferId,
            },
          });
        });

        paidCount++;
        totalPaidUsd += amountUsd;
        items.push({
          earningId: row.earningId,
          creatorId: row.creatorId,
          revenuePeriod: row.revenuePeriod,
          amountUsd,
          methodType,
          status: 'paid',
          reference: transferId,
        });
      } catch (transferErr) {
        const msg = transferErr instanceof Error ? transferErr.message : 'Transfer error';
        await db
          .update(creatorEarnings)
          .set({
            status: 'confirmed',
            notes: `Transfer retry needed: ${msg.slice(0, 200)}`,
            updatedAt: new Date(),
          })
          .where(eq(creatorEarnings.id, row.earningId));

        skippedCount++;
        items.push({
          earningId: row.earningId,
          creatorId: row.creatorId,
          revenuePeriod: row.revenuePeriod,
          amountUsd,
          methodType,
          status: 'skipped',
          reason: msg,
        });
      }
      continue;
    }

    const masked = maskIdentifier(defaultMethod?.accountIdentifier || '');
    const batchNote = `Queued for ${methodType} payout (${masked}, ${defaultMethod?.currency || 'USD'})`;
    await db
      .update(creatorEarnings)
      .set({
        notes: batchNote,
        updatedAt: new Date(),
      })
      .where(eq(creatorEarnings.id, row.earningId));

    await db.insert(auditLog).values({
      actorId: options?.actorId || null,
      actorRole: options?.actorId ? 'admin' : 'system',
      action: 'creator.payout_queued',
      entityType: 'creator_earnings',
      entityId: row.earningId,
      metadata: {
        creatorId: row.creatorId,
        revenuePeriod: row.revenuePeriod,
        amountUsd,
        methodType,
      },
    });

    queuedCount++;
    items.push({
      earningId: row.earningId,
      creatorId: row.creatorId,
      revenuePeriod: row.revenuePeriod,
      amountUsd,
      methodType,
      status: 'pending_payout',
      reason: batchNote,
    });
  }

  return {
    processed: rows.length,
    paidCount,
    queuedCount,
    skippedCount,
    totalPaidUsd,
    items,
  };
}
