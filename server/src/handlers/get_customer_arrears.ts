
import { db } from '../db';
import { customersTable, monthlyBillsTable } from '../db/schema';
import { type ArrearsReport } from '../schema';
import { eq, and, sql, type SQL } from 'drizzle-orm';

export async function getCustomerArrears(customerId?: number): Promise<ArrearsReport[]> {
  try {
    // Build conditions array
    const conditions: SQL<unknown>[] = [
      eq(monthlyBillsTable.status, 'unpaid')
    ];

    // Add customer filter if provided
    if (customerId !== undefined) {
      conditions.push(eq(customersTable.id, customerId));
    }

    // Build the query with all conditions at once
    const query = db.select({
      customer_id: customersTable.id,
      customer_name: customersTable.name,
      total_outstanding: sql<string>`COALESCE(SUM(${monthlyBillsTable.amount}), 0)`,
      oldest_unpaid_month: sql<string>`MIN(${monthlyBillsTable.bill_month})`,
      bill_count: sql<string>`COUNT(${monthlyBillsTable.id})`
    })
    .from(customersTable)
    .innerJoin(
      monthlyBillsTable,
      eq(monthlyBillsTable.customer_id, customersTable.id)
    )
    .where(conditions.length === 1 ? conditions[0] : and(...conditions))
    .groupBy(customersTable.id, customersTable.name);

    const results = await query.execute();

    // Transform results and calculate months overdue
    const currentDate = new Date();
    const currentMonth = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;

    return results.map(result => {
      // Calculate months overdue based on oldest unpaid month
      const [oldestYear, oldestMonth] = result.oldest_unpaid_month.split('-').map(Number);
      const [currentYear, currentMonthNum] = currentMonth.split('-').map(Number);
      
      const monthsOverdue = (currentYear - oldestYear) * 12 + (currentMonthNum - oldestMonth);

      return {
        customer_id: result.customer_id,
        customer_name: result.customer_name,
        total_outstanding: parseFloat(result.total_outstanding),
        oldest_unpaid_month: result.oldest_unpaid_month,
        months_overdue: Math.max(0, monthsOverdue) // Ensure non-negative
      };
    });
  } catch (error) {
    console.error('Failed to get customer arrears:', error);
    throw error;
  }
}
