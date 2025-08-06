
import { db } from '../db';
import { paymentsTable } from '../db/schema';
import { type Payment } from '../schema';
import { eq, desc } from 'drizzle-orm';

export async function getPayments(customerId?: number): Promise<Payment[]> {
  try {
    // Build query based on whether customer filter is provided
    const results = customerId !== undefined
      ? await db.select()
          .from(paymentsTable)
          .where(eq(paymentsTable.customer_id, customerId))
          .orderBy(desc(paymentsTable.payment_date))
          .execute()
      : await db.select()
          .from(paymentsTable)
          .orderBy(desc(paymentsTable.payment_date))
          .execute();

    // Convert numeric fields back to numbers
    return results.map(payment => ({
      ...payment,
      amount: parseFloat(payment.amount)
    }));
  } catch (error) {
    console.error('Failed to get payments:', error);
    throw error;
  }
}
