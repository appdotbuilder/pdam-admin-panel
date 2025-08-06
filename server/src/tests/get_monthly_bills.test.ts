
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { customersTable, monthlyBillsTable } from '../db/schema';
import { getMonthlyBills } from '../handlers/get_monthly_bills';

describe('getMonthlyBills', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return all monthly bills when no filters provided', async () => {
    // Create test customer
    const customerResult = await db.insert(customersTable)
      .values({
        name: 'Test Customer',
        address: '123 Test St',
        phone: '555-0123',
        subscription_start_date: new Date('2024-01-01')
      })
      .returning()
      .execute();
    const customerId = customerResult[0].id;

    // Create test bills
    await db.insert(monthlyBillsTable)
      .values([
        {
          customer_id: customerId,
          bill_month: '2024-01',
          amount: '100.00',
          due_date: new Date('2024-02-01')
        },
        {
          customer_id: customerId,
          bill_month: '2024-02',
          amount: '150.50',
          due_date: new Date('2024-03-01')
        }
      ])
      .execute();

    const results = await getMonthlyBills();

    expect(results).toHaveLength(2);
    expect(results[0].customer_id).toBe(customerId);
    expect(results[0].amount).toBe(100.00);
    expect(typeof results[0].amount).toBe('number');
    expect(results[1].amount).toBe(150.50);
    expect(results[0].bill_month).toBe('2024-01');
    expect(results[1].bill_month).toBe('2024-02');
  });

  it('should filter bills by customer ID', async () => {
    // Create two test customers
    const customer1Result = await db.insert(customersTable)
      .values({
        name: 'Customer 1',
        address: '123 Test St',
        phone: '555-0123',
        subscription_start_date: new Date('2024-01-01')
      })
      .returning()
      .execute();
    const customer1Id = customer1Result[0].id;

    const customer2Result = await db.insert(customersTable)
      .values({
        name: 'Customer 2',
        address: '456 Test Ave',
        phone: '555-0124',
        subscription_start_date: new Date('2024-01-01')
      })
      .returning()
      .execute();
    const customer2Id = customer2Result[0].id;

    // Create bills for both customers
    await db.insert(monthlyBillsTable)
      .values([
        {
          customer_id: customer1Id,
          bill_month: '2024-01',
          amount: '100.00',
          due_date: new Date('2024-02-01')
        },
        {
          customer_id: customer2Id,
          bill_month: '2024-01',
          amount: '200.00',
          due_date: new Date('2024-02-01')
        }
      ])
      .execute();

    const results = await getMonthlyBills(customer1Id);

    expect(results).toHaveLength(1);
    expect(results[0].customer_id).toBe(customer1Id);
    expect(results[0].amount).toBe(100.00);
  });

  it('should filter bills by month', async () => {
    // Create test customer
    const customerResult = await db.insert(customersTable)
      .values({
        name: 'Test Customer',
        address: '123 Test St',
        phone: '555-0123',
        subscription_start_date: new Date('2024-01-01')
      })
      .returning()
      .execute();
    const customerId = customerResult[0].id;

    // Create bills for different months
    await db.insert(monthlyBillsTable)
      .values([
        {
          customer_id: customerId,
          bill_month: '2024-01',
          amount: '100.00',
          due_date: new Date('2024-02-01')
        },
        {
          customer_id: customerId,
          bill_month: '2024-02',
          amount: '150.00',
          due_date: new Date('2024-03-01')
        }
      ])
      .execute();

    const results = await getMonthlyBills(undefined, '2024-01');

    expect(results).toHaveLength(1);
    expect(results[0].bill_month).toBe('2024-01');
    expect(results[0].amount).toBe(100.00);
  });

  it('should filter bills by both customer ID and month', async () => {
    // Create two test customers
    const customer1Result = await db.insert(customersTable)
      .values({
        name: 'Customer 1',
        address: '123 Test St',
        phone: '555-0123',
        subscription_start_date: new Date('2024-01-01')
      })
      .returning()
      .execute();
    const customer1Id = customer1Result[0].id;

    const customer2Result = await db.insert(customersTable)
      .values({
        name: 'Customer 2',
        address: '456 Test Ave',
        phone: '555-0124',
        subscription_start_date: new Date('2024-01-01')
      })
      .returning()
      .execute();
    const customer2Id = customer2Result[0].id;

    // Create bills for both customers and multiple months
    await db.insert(monthlyBillsTable)
      .values([
        {
          customer_id: customer1Id,
          bill_month: '2024-01',
          amount: '100.00',
          due_date: new Date('2024-02-01')
        },
        {
          customer_id: customer1Id,
          bill_month: '2024-02',
          amount: '150.00',
          due_date: new Date('2024-03-01')
        },
        {
          customer_id: customer2Id,
          bill_month: '2024-01',
          amount: '200.00',
          due_date: new Date('2024-02-01')
        }
      ])
      .execute();

    const results = await getMonthlyBills(customer1Id, '2024-01');

    expect(results).toHaveLength(1);
    expect(results[0].customer_id).toBe(customer1Id);
    expect(results[0].bill_month).toBe('2024-01');
    expect(results[0].amount).toBe(100.00);
  });

  it('should return empty array when no bills match filters', async () => {
    const results = await getMonthlyBills(999, '2024-99');

    expect(results).toHaveLength(0);
  });

  it('should handle all bill properties correctly', async () => {
    // Create test customer
    const customerResult = await db.insert(customersTable)
      .values({
        name: 'Test Customer',
        address: '123 Test St',
        phone: '555-0123',
        subscription_start_date: new Date('2024-01-01')
      })
      .returning()
      .execute();
    const customerId = customerResult[0].id;

    // Create test bill
    await db.insert(monthlyBillsTable)
      .values({
        customer_id: customerId,
        bill_month: '2024-01',
        amount: '123.45',
        status: 'paid',
        due_date: new Date('2024-02-01')
      })
      .execute();

    const results = await getMonthlyBills();

    expect(results).toHaveLength(1);
    const bill = results[0];
    expect(bill.id).toBeDefined();
    expect(bill.customer_id).toBe(customerId);
    expect(bill.bill_month).toBe('2024-01');
    expect(bill.amount).toBe(123.45);
    expect(typeof bill.amount).toBe('number');
    expect(bill.status).toBe('paid');
    expect(bill.due_date).toBeInstanceOf(Date);
    expect(bill.created_at).toBeInstanceOf(Date);
  });
});
