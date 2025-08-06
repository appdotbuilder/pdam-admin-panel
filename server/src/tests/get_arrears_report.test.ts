
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { customersTable, monthlyBillsTable } from '../db/schema';
import { getArrearsReport } from '../handlers/get_arrears_report';

describe('getArrearsReport', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no customers have arrears', async () => {
    const result = await getArrearsReport();
    expect(result).toEqual([]);
  });

  it('should return arrears for customers with unpaid bills', async () => {
    // Create test customer
    const customer = await db.insert(customersTable)
      .values({
        name: 'Test Customer',
        address: '123 Test St',
        phone: '555-0123',
        subscription_start_date: new Date('2024-01-01')
      })
      .returning()
      .execute();

    // Create unpaid bills
    await db.insert(monthlyBillsTable)
      .values([
        {
          customer_id: customer[0].id,
          bill_month: '2024-01',
          amount: '100.00',
          status: 'unpaid',
          due_date: new Date('2024-01-31')
        },
        {
          customer_id: customer[0].id,
          bill_month: '2024-02',
          amount: '150.00',
          status: 'unpaid',
          due_date: new Date('2024-02-28')
        }
      ])
      .execute();

    const result = await getArrearsReport();

    expect(result).toHaveLength(1);
    expect(result[0].customer_id).toEqual(customer[0].id);
    expect(result[0].customer_name).toEqual('Test Customer');
    expect(result[0].total_outstanding).toEqual(250.00);
    expect(result[0].oldest_unpaid_month).toEqual('2024-01');
    expect(result[0].months_overdue).toEqual(2);
  });

  it('should exclude customers with only paid bills', async () => {
    // Create test customer
    const customer = await db.insert(customersTable)
      .values({
        name: 'Paid Customer',
        address: '456 Test Ave',
        phone: '555-0456',
        subscription_start_date: new Date('2024-01-01')
      })
      .returning()
      .execute();

    // Create paid bills only
    await db.insert(monthlyBillsTable)
      .values([
        {
          customer_id: customer[0].id,
          bill_month: '2024-01',
          amount: '100.00',
          status: 'paid',
          due_date: new Date('2024-01-31')
        },
        {
          customer_id: customer[0].id,
          bill_month: '2024-02',
          amount: '100.00',
          status: 'paid',
          due_date: new Date('2024-02-28')
        }
      ])
      .execute();

    const result = await getArrearsReport();
    expect(result).toHaveLength(0);
  });

  it('should handle multiple customers with mixed bill statuses', async () => {
    // Create customers
    const customers = await db.insert(customersTable)
      .values([
        {
          name: 'Customer A',
          address: '123 Test St',
          phone: '555-0001',
          subscription_start_date: new Date('2024-01-01')
        },
        {
          name: 'Customer B',
          address: '456 Test Ave',
          phone: '555-0002',
          subscription_start_date: new Date('2024-01-01')
        }
      ])
      .returning()
      .execute();

    // Customer A: has unpaid bills
    await db.insert(monthlyBillsTable)
      .values([
        {
          customer_id: customers[0].id,
          bill_month: '2024-01',
          amount: '75.50',
          status: 'unpaid',
          due_date: new Date('2024-01-31')
        },
        {
          customer_id: customers[0].id,
          bill_month: '2024-02',
          amount: '80.00',
          status: 'paid',
          due_date: new Date('2024-02-28')
        }
      ])
      .execute();

    // Customer B: has multiple unpaid bills
    await db.insert(monthlyBillsTable)
      .values([
        {
          customer_id: customers[1].id,
          bill_month: '2023-12',
          amount: '100.00',
          status: 'unpaid',
          due_date: new Date('2023-12-31')
        },
        {
          customer_id: customers[1].id,
          bill_month: '2024-01',
          amount: '100.00',
          status: 'unpaid',
          due_date: new Date('2024-01-31')
        }
      ])
      .execute();

    const result = await getArrearsReport();

    expect(result).toHaveLength(2);
    
    // Find Customer A in results
    const customerA = result.find(r => r.customer_name === 'Customer A');
    expect(customerA).toBeDefined();
    expect(customerA!.total_outstanding).toEqual(75.50);
    expect(customerA!.oldest_unpaid_month).toEqual('2024-01');
    expect(customerA!.months_overdue).toEqual(1);

    // Find Customer B in results
    const customerB = result.find(r => r.customer_name === 'Customer B');
    expect(customerB).toBeDefined();
    expect(customerB!.total_outstanding).toEqual(200.00);
    expect(customerB!.oldest_unpaid_month).toEqual('2023-12');
    expect(customerB!.months_overdue).toEqual(2);
  });
});
