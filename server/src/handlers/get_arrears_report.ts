
import { db } from '../db';
import { customersTable, monthlyBillsTable } from '../db/schema';
import { type ArrearsReport } from '../schema';
import { eq, and, sql } from 'drizzle-orm';

export async function getArrearsReport(): Promise<ArrearsReport[]> {
  try {
    // Query to get customers with unpaid bills and calculate arrears information
    const results = await db
      .select({
        customer_id: customersTable.id,
        customer_name: customersTable.name,
        total_outstanding: sql<string>`COALESCE(SUM(${monthlyBillsTable.amount}), 0)`,
        oldest_unpaid_month: sql<string>`MIN(${monthlyBillsTable.bill_month})`,
        unpaid_bill_count: sql<string>`COUNT(${monthlyBillsTable.id})`
      })
      .from(customersTable)
      .innerJoin(
        monthlyBillsTable,
        and(
          eq(monthlyBillsTable.customer_id, customersTable.id),
          eq(monthlyBillsTable.status, 'unpaid')
        )
      )
      .groupBy(customersTable.id, customersTable.name)
      .execute();

    // Convert the results to the expected format
    return results.map(result => ({
      customer_id: result.customer_id,
      customer_name: result.customer_name,
      total_outstanding: parseFloat(result.total_outstanding),
      oldest_unpaid_month: result.oldest_unpaid_month,
      months_overdue: parseInt(result.unpaid_bill_count, 10)
    }));
  } catch (error) {
    console.error('Arrears report generation failed:', error);
    throw error;
  }
}
