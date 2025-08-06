
import { db } from '../db';
import { paymentsTable, monthlyBillsTable } from '../db/schema';
import { type CreatePaymentInput, type Payment } from '../schema';
import { eq } from 'drizzle-orm';

export const createPayment = async (input: CreatePaymentInput): Promise<Payment> => {
  try {
    // Insert payment record
    const result = await db.insert(paymentsTable)
      .values({
        customer_id: input.customer_id,
        bill_id: input.bill_id,
        amount: input.amount.toString(), // Convert number to string for numeric column
        payment_date: input.payment_date,
        notes: input.notes
      })
      .returning()
      .execute();

    const payment = result[0];

    // If payment is linked to a specific bill, check if bill should be marked as paid
    if (input.bill_id) {
      // Get the bill to check its amount
      const bills = await db.select()
        .from(monthlyBillsTable)
        .where(eq(monthlyBillsTable.id, input.bill_id))
        .execute();

      if (bills.length > 0) {
        const bill = bills[0];
        const billAmount = parseFloat(bill.amount);
        
        // If payment amount covers the full bill amount, mark as paid
        if (input.amount >= billAmount) {
          await db.update(monthlyBillsTable)
            .set({ status: 'paid' })
            .where(eq(monthlyBillsTable.id, input.bill_id))
            .execute();
        }
      }
    }

    // Convert numeric fields back to numbers before returning
    return {
      ...payment,
      amount: parseFloat(payment.amount) // Convert string back to number
    };
  } catch (error) {
    console.error('Payment creation failed:', error);
    throw error;
  }
};
