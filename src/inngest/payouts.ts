import { inngest } from './client';
import { executeCreatorPayouts } from '@/lib/revenue/payouts';

/**
 * Monthly creator payout execution cron (1st of each month at 06:00 UTC),
 * running one hour after syncMonthlyCreatorRevenue.
 */
export const processMonthlyCreatorPayouts = inngest.createFunction(
  { id: 'process-monthly-creator-payouts', triggers: [{ cron: '0 6 1 * *' }] },
  async ({ step }) => {
    const summary = await step.run('execute-confirmed-payouts', async () => {
      return await executeCreatorPayouts();
    });

    return { status: 'completed', ...summary };
  }
);
