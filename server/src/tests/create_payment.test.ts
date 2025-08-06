
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { customersTable, monthlyBillsTable, paymentsTable } from '../db/schema';
import { type CreatePaymentInput } from '../schema';
import { createPayment } from '../handlers/create_payment';
import { eq } from 'drizzle-orm';

// Test customer data
const testCustomer = {
  name: 'Test Customer',
  address: '123 Test Street',
  phone: '555-0123',
  subscription_start_date: new Date('2024-01-01')
};

// Test bill data
const testBill = {
  bill_month: '2024-01',
  amount: '50.00',
  status: 'unpaid' as const,
  due_date: new Date('2024-01-31')
};

describe('createPayment', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a payment record', async () => {
    // Create prerequisite customer
    const customerResult = await db.insert(customersTable)
      .values(testCustomer)
      .returning()
      .execute();
    const customer = customerResult[0];

    const paymentInput: CreatePaymentInput = {
      customer_id: customer.id,
      bill_id: null,
      amount: 25.50,
      payment_date: new Date('2024-01-15'),
      notes: 'Arrears payment'
    };

    const result = await createPayment(paymentInput);

    // Verify payment fields
    expect(result.customer_id).toEqual(customer.id);
    expect(result.bill_id).toBeNull();
    expect(result.amount).toEqual(25.50);
    expect(typeof result.amount).toBe('number');
    expect(result.payment_date).toEqual(new Date('2024-01-15'));
    expect(result.notes).toEqual('Arrears payment');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save payment to database', async () => {
    // Create prerequisite customer
    const customerResult = await db.insert(customersTable)
      .values(testCustomer)
      .returning()
      .execute();
    const customer = customerResult[0];

    const paymentInput: CreatePaymentInput = {
      customer_id: customer.id,
      bill_id: null,
      amount: 100.00,
      payment_date: new Date('2024-02-01'),
      notes: null
    };

    const result = await createPayment(paymentInput);

    // Query database to verify payment was saved
    const payments = await db.select()
      .from(paymentsTable)
      .where(eq(paymentsTable.id, result.id))
      .execute();

    expect(payments).toHaveLength(1);
    expect(payments[0].customer_id).toEqual(customer.id);
    expect(parseFloat(payments[0].amount)).toEqual(100.00);
    expect(payments[0].payment_date).toEqual(new Date('2024-02-01'));
    expect(payments[0].notes).toBeNull();
  });

  it('should mark bill as paid when payment covers full amount', async () => {
    // Create prerequisite customer
    const customerResult = await db.insert(customersTable)
      .values(testCustomer)
      .returning()
      .execute();
    const customer = customerResult[0];

    // Create a bill
    const billResult = await db.insert(monthlyBillsTable)
      .values({
        customer_id: customer.id,
        ...testBill
      })
      .returning()
      .execute();
    const bill = billResult[0];

    const paymentInput: CreatePaymentInput = {
      customer_id: customer.id,
      bill_id: bill.id,
      amount: 50.00, // Exact bill amount
      payment_date: new Date('2024-01-20'),
      notes: 'Full payment'
    };

    await createPayment(paymentInput);

    // Check that bill status was updated to paid
    const bills = await db.select()
      .from(monthlyBillsTable)
      .where(eq(monthlyBillsTable.id, bill.id))
      .execute();

    expect(bills[0].status).toEqual('paid');
  });

  it('should mark bill as paid when payment exceeds bill amount', async () => {
    // Create prerequisite customer
    const customerResult = await db.insert(customersTable)
      .values(testCustomer)
      .returning()
      .execute();
    const customer = customerResult[0];

    // Create a bill
    const billResult = await db.insert(monthlyBillsTable)
      .values({
        customer_id: customer.id,
        ...testBill
      })
      .returning()
      .execute();
    const bill = billResult[0];

    const paymentInput: CreatePaymentInput = {
      customer_id: customer.id,
      bill_id: bill.id,
      amount: 75.00, // More than bill amount
      payment_date: new Date('2024-01-25'),
      notes: 'Overpayment'
    };

    await createPayment(paymentInput);

    // Check that bill status was updated to paid
    const bills = await db.select()
      .from(monthlyBillsTable)
      .where(eq(monthlyBillsTable.id, bill.id))
      .execute();

    expect(bills[0].status).toEqual('paid');
  });

  it('should not mark bill as paid for partial payment', async () => {
    // Create prerequisite customer
    const customerResult = await db.insert(customersTable)
      .values(testCustomer)
      .returning()
      .execute();
    const customer = customerResult[0];

    // Create a bill
    const billResult = await db.insert(monthlyBillsTable)
      .values({
        customer_id: customer.id,
        ...testBill
      })
      .returning()
      .execute();
    const bill = billResult[0];

    const paymentInput: CreatePaymentInput = {
      customer_id: customer.id,
      bill_id: bill.id,
      amount: 25.00, // Less than bill amount
      payment_date: new Date('2024-01-10'),
      notes: 'Partial payment'
    };

    await createPayment(paymentInput);

    // Check that bill status remains unpaid
    const bills = await db.select()
      .from(monthlyBillsTable)
      .where(eq(monthlyBillsTable.id, bill.id))
      .execute();

    expect(bills[0].status).toEqual('unpaid');
  });

  it('should handle arrears payment without bill_id', async () => {
    // Create prerequisite customer
    const customerResult = await db.insert(customersTable)
      .values(testCustomer)
      .returning()
      .execute();
    const customer = customerResult[0];

    const paymentInput: CreatePaymentInput = {
      customer_id: customer.id,
      bill_id: null, // No specific bill - arrears payment
      amount: 150.00,
      payment_date: new Date('2024-03-01'),
      notes: 'Arrears payment for multiple months'
    };

    const result = await createPayment(paymentInput);

    // Verify payment was created correctly
    expect(result.customer_id).toEqual(customer.id);
    expect(result.bill_id).toBeNull();
    expect(result.amount).toEqual(150.00);
    expect(result.notes).toEqual('Arrears payment for multiple months');
  });

  it('should throw error for non-existent customer', async () => {
    const paymentInput: CreatePaymentInput = {
      customer_id: 999, // Non-existent customer
      bill_id: null,
      amount: 50.00,
      payment_date: new Date(),
      notes: null
    };

    await expect(createPayment(paymentInput)).rejects.toThrow(/violates foreign key constraint/i);
  });

  it('should throw error for non-existent bill', async () => {
    // Create prerequisite customer
    const customerResult = await db.insert(customersTable)
      .values(testCustomer)
      .returning()
      .execute();
    const customer = customerResult[0];

    const paymentInput: CreatePaymentInput = {
      customer_id: customer.id,
      bill_id: 999, // Non-existent bill
      amount: 50.00,
      payment_date: new Date(),
      notes: null
    };

    await expect(createPayment(paymentInput)).rejects.toThrow(/violates foreign key constraint/i);
  });
});
