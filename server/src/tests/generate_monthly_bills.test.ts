
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { customersTable, monthlyBillsTable } from '../db/schema';
import { type GenerateMonthlyBillsInput } from '../schema';
import { generateMonthlyBills } from '../handlers/generate_monthly_bills';
import { eq } from 'drizzle-orm';

describe('generateMonthlyBills', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should generate bills for active customers subscribed before bill month', async () => {
    // Create test customers
    const customers = await db.insert(customersTable)
      .values([
        {
          name: 'Customer 1',
          address: 'Address 1',
          phone: '123456789',
          status: 'active',
          subscription_start_date: new Date('2023-11-01')
        },
        {
          name: 'Customer 2', 
          address: 'Address 2',
          phone: '987654321',
          status: 'active',
          subscription_start_date: new Date('2023-10-15')
        }
      ])
      .returning()
      .execute();

    const input: GenerateMonthlyBillsInput = {
      month: '2023-12'
    };

    const result = await generateMonthlyBills(input);

    expect(result).toHaveLength(2);
    expect(result[0].customer_id).toBe(customers[0].id);
    expect(result[0].bill_month).toBe('2023-12');
    expect(result[0].amount).toBe(30000); // Default amount
    expect(typeof result[0].amount).toBe('number');
    expect(result[0].status).toBe('unpaid');
    expect(result[0].due_date).toBeInstanceOf(Date);
  });

  it('should use custom amount when provided', async () => {
    // Create test customer
    await db.insert(customersTable)
      .values({
        name: 'Customer 1',
        address: 'Address 1',
        phone: '123456789',
        status: 'active',
        subscription_start_date: new Date('2023-11-01')
      })
      .execute();

    const input: GenerateMonthlyBillsInput = {
      month: '2023-12',
      amount: 35000
    };

    const result = await generateMonthlyBills(input);

    expect(result).toHaveLength(1);
    expect(result[0].amount).toBe(35000);
  });

  it('should not generate bills for inactive customers', async () => {
    // Create inactive customer
    await db.insert(customersTable)
      .values({
        name: 'Inactive Customer',
        address: 'Address 1',
        phone: '123456789',
        status: 'inactive',
        subscription_start_date: new Date('2023-11-01')
      })
      .execute();

    const input: GenerateMonthlyBillsInput = {
      month: '2023-12'
    };

    const result = await generateMonthlyBills(input);

    expect(result).toHaveLength(0);
  });

  it('should not generate bills for customers subscribed after bill month', async () => {
    // Create customer subscribed after bill month
    await db.insert(customersTable)
      .values({
        name: 'New Customer',
        address: 'Address 1', 
        phone: '123456789',
        status: 'active',
        subscription_start_date: new Date('2023-12-15') // After December 1st
      })
      .execute();

    const input: GenerateMonthlyBillsInput = {
      month: '2023-12'
    };

    const result = await generateMonthlyBills(input);

    expect(result).toHaveLength(0);
  });

  it('should not duplicate bills for existing month', async () => {
    // Create test customer
    const customers = await db.insert(customersTable)
      .values({
        name: 'Customer 1',
        address: 'Address 1',
        phone: '123456789',
        status: 'active',
        subscription_start_date: new Date('2023-11-01')
      })
      .returning()
      .execute();

    // Create existing bill for this month
    await db.insert(monthlyBillsTable)
      .values({
        customer_id: customers[0].id,
        bill_month: '2023-12',
        amount: '25000',
        due_date: new Date('2023-12-15')
      })
      .execute();

    const input: GenerateMonthlyBillsInput = {
      month: '2023-12'
    };

    const result = await generateMonthlyBills(input);

    expect(result).toHaveLength(0);

    // Verify only one bill exists in database
    const allBills = await db.select()
      .from(monthlyBillsTable)
      .where(eq(monthlyBillsTable.bill_month, '2023-12'))
      .execute();

    expect(allBills).toHaveLength(1);
  });

  it('should save bills to database correctly', async () => {
    // Create test customer
    const customers = await db.insert(customersTable)
      .values({
        name: 'Customer 1',
        address: 'Address 1',
        phone: '123456789',
        status: 'active',
        subscription_start_date: new Date('2023-11-01')
      })
      .returning()
      .execute();

    const input: GenerateMonthlyBillsInput = {
      month: '2023-12',
      amount: 32000
    };

    const result = await generateMonthlyBills(input);

    // Verify bill was saved to database
    const savedBills = await db.select()
      .from(monthlyBillsTable)
      .where(eq(monthlyBillsTable.customer_id, customers[0].id))
      .execute();

    expect(savedBills).toHaveLength(1);
    expect(savedBills[0].bill_month).toBe('2023-12');
    expect(parseFloat(savedBills[0].amount)).toBe(32000);
    expect(savedBills[0].status).toBe('unpaid');
    expect(savedBills[0].created_at).toBeInstanceOf(Date);
  });
});
