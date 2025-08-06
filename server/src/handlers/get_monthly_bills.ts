
import { db } from '../db';
import { monthlyBillsTable } from '../db/schema';
import { type MonthlyBill } from '../schema';
import { eq, and } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';

export async function getMonthlyBills(customerId?: number, month?: string): Promise<MonthlyBill[]> {
  try {
    const conditions: SQL<unknown>[] = [];

    if (customerId !== undefined) {
      conditions.push(eq(monthlyBillsTable.customer_id, customerId));
    }

    if (month !== undefined) {
      conditions.push(eq(monthlyBillsTable.bill_month, month));
    }

    const query = conditions.length > 0
      ? db.select().from(monthlyBillsTable).where(conditions.length === 1 ? conditions[0] : and(...conditions))
      : db.select().from(monthlyBillsTable);

    const results = await query.execute();

    return results.map(bill => ({
      ...bill,
      amount: parseFloat(bill.amount)
    }));
  } catch (error) {
    console.error('Failed to get monthly bills:', error);
    throw error;
  }
}
