
import { db } from '../db';
import { customersTable, monthlyBillsTable } from '../db/schema';
import { type GenerateMonthlyBillsInput, type MonthlyBill } from '../schema';
import { eq, and, lt } from 'drizzle-orm';

export async function generateMonthlyBills(input: GenerateMonthlyBillsInput): Promise<MonthlyBill[]> {
  try {
    const { month, amount = 30000 } = input;
    
    // Parse the month to create bill month start date for comparison
    const [year, monthNum] = month.split('-').map(Number);
    const billMonthStart = new Date(year, monthNum - 1, 1); // monthNum - 1 because Date months are 0-indexed
    
    // Get all active customers who were subscribed before this bill month
    const eligibleCustomers = await db.select()
      .from(customersTable)
      .where(
        and(
          eq(customersTable.status, 'active'),
          lt(customersTable.subscription_start_date, billMonthStart)
        )
      )
      .execute();

    if (eligibleCustomers.length === 0) {
      return [];
    }

    // Check which customers already have bills for this month
    const existingBills = await db.select()
      .from(monthlyBillsTable)
      .where(eq(monthlyBillsTable.bill_month, month))
      .execute();

    const existingCustomerIds = new Set(existingBills.map(bill => bill.customer_id));

    // Filter out customers who already have bills for this month
    const customersNeedingBills = eligibleCustomers.filter(
      customer => !existingCustomerIds.has(customer.id)
    );

    if (customersNeedingBills.length === 0) {
      return [];
    }

    // Generate due date (e.g., 15th of the bill month)
    const dueDate = new Date(year, monthNum - 1, 15);

    // Create bills for eligible customers
    const billsToInsert = customersNeedingBills.map(customer => ({
      customer_id: customer.id,
      bill_month: month,
      amount: amount.toString(), // Convert to string for numeric column
      due_date: dueDate
    }));

    const result = await db.insert(monthlyBillsTable)
      .values(billsToInsert)
      .returning()
      .execute();

    // Convert numeric fields back to numbers before returning
    return result.map(bill => ({
      ...bill,
      amount: parseFloat(bill.amount)
    }));
  } catch (error) {
    console.error('Monthly bills generation failed:', error);
    throw error;
  }
}
