
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { customersTable, monthlyBillsTable, paymentsTable } from '../db/schema';
import { getPayments } from '../handlers/get_payments';

describe('getPayments', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return all payments when no customer filter is provided', async () => {
    // Create test customer
    const customer = await db.insert(customersTable)
      .values({
        name: 'Test Customer',
        address: '123 Test St',
        phone: '555-0123',
        subscription_start_date: new Date()
      })
      .returning()
      .execute();

    // Create test bill
    const bill = await db.insert(monthlyBillsTable)
      .values({
        customer_id: customer[0].id,
        bill_month: '2024-01',
        amount: '50.00',
        due_date: new Date()
      })
      .returning()
      .execute();

    // Create test payments
    await db.insert(paymentsTable)
      .values([
        {
          customer_id: customer[0].id,
          bill_id: bill[0].id,
          amount: '25.00',
          payment_date: new Date('2024-01-15'),
          notes: 'Partial payment'
        },
        {
          customer_id: customer[0].id,
          bill_id: null,
          amount: '30.00',
          payment_date: new Date('2024-01-20'),
          notes: 'Arrears payment'
        }
      ])
      .execute();

    const result = await getPayments();

    expect(result).toHaveLength(2);
    
    // Check first payment (should be ordered by date descending)
    expect(result[0].amount).toEqual(30.00);
    expect(typeof result[0].amount).toBe('number');
    expect(result[0].customer_id).toEqual(customer[0].id);
    expect(result[0].bill_id).toBeNull();
    expect(result[0].notes).toEqual('Arrears payment');
    expect(result[0].payment_date).toBeInstanceOf(Date);

    // Check second payment
    expect(result[1].amount).toEqual(25.00);
    expect(typeof result[1].amount).toBe('number');
    expect(result[1].customer_id).toEqual(customer[0].id);
    expect(result[1].bill_id).toEqual(bill[0].id);
    expect(result[1].notes).toEqual('Partial payment');
  });

  it('should filter payments by customer ID', async () => {
    // Create two test customers
    const customers = await db.insert(customersTable)
      .values([
        {
          name: 'Customer 1',
          address: '123 Test St',
          phone: '555-0123',
          subscription_start_date: new Date()
        },
        {
          name: 'Customer 2',
          address: '456 Test Ave',
          phone: '555-0456',
          subscription_start_date: new Date()
        }
      ])
      .returning()
      .execute();

    // Create payments for both customers
    await db.insert(paymentsTable)
      .values([
        {
          customer_id: customers[0].id,
          bill_id: null,
          amount: '25.00',
          payment_date: new Date('2024-01-15'),
          notes: 'Customer 1 payment'
        },
        {
          customer_id: customers[1].id,
          bill_id: null,
          amount: '35.00',
          payment_date: new Date('2024-01-16'),
          notes: 'Customer 2 payment'
        },
        {
          customer_id: customers[0].id,
          bill_id: null,
          amount: '45.00',
          payment_date: new Date('2024-01-17'),
          notes: 'Another customer 1 payment'
        }
      ])
      .execute();

    const result = await getPayments(customers[0].id);

    expect(result).toHaveLength(2);
    result.forEach(payment => {
      expect(payment.customer_id).toEqual(customers[0].id);
      expect(typeof payment.amount).toBe('number');
      expect(payment.payment_date).toBeInstanceOf(Date);
    });

    // Check ordering (most recent first)
    expect(result[0].amount).toEqual(45.00);
    expect(result[0].notes).toEqual('Another customer 1 payment');
    expect(result[1].amount).toEqual(25.00);
    expect(result[1].notes).toEqual('Customer 1 payment');
  });

  it('should return empty array when no payments exist', async () => {
    const result = await getPayments();
    expect(result).toHaveLength(0);
  });

  it('should return empty array when filtering by non-existent customer', async () => {
    // Create a customer with payments
    const customer = await db.insert(customersTable)
      .values({
        name: 'Test Customer',
        address: '123 Test St',
        phone: '555-0123',
        subscription_start_date: new Date()
      })
      .returning()
      .execute();

    await db.insert(paymentsTable)
      .values({
        customer_id: customer[0].id,
        bill_id: null,
        amount: '25.00',
        payment_date: new Date(),
        notes: 'Test payment'
      })
      .execute();

    // Filter by different customer ID
    const result = await getPayments(999);
    expect(result).toHaveLength(0);
  });

  it('should handle payments with both bill_id and null bill_id correctly', async () => {
    // Create test data
    const customer = await db.insert(customersTable)
      .values({
        name: 'Test Customer',
        address: '123 Test St',
        phone: '555-0123',
        subscription_start_date: new Date()
      })
      .returning()
      .execute();

    const bill = await db.insert(monthlyBillsTable)
      .values({
        customer_id: customer[0].id,
        bill_month: '2024-01',
        amount: '50.00',
        due_date: new Date()
      })
      .returning()
      .execute();

    await db.insert(paymentsTable)
      .values([
        {
          customer_id: customer[0].id,
          bill_id: bill[0].id,
          amount: '50.00',
          payment_date: new Date('2024-01-15'),
          notes: 'Bill payment'
        },
        {
          customer_id: customer[0].id,
          bill_id: null,
          amount: '25.00',
          payment_date: new Date('2024-01-20'),
          notes: 'Arrears payment'
        }
      ])
      .execute();

    const result = await getPayments(customer[0].id);

    expect(result).toHaveLength(2);
    
    // Find payments by notes to verify handling
    const billPayment = result.find(p => p.notes === 'Bill payment');
    const arrearsPayment = result.find(p => p.notes === 'Arrears payment');

    expect(billPayment).toBeDefined();
    expect(billPayment!.bill_id).toEqual(bill[0].id);
    expect(billPayment!.amount).toEqual(50.00);

    expect(arrearsPayment).toBeDefined();
    expect(arrearsPayment!.bill_id).toBeNull();
    expect(arrearsPayment!.amount).toEqual(25.00);
  });
});
