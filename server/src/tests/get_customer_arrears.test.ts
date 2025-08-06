
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { customersTable, monthlyBillsTable } from '../db/schema';
import { getCustomerArrears } from '../handlers/get_customer_arrears';

// Helper function to create test customers
const createTestCustomer = async (name: string) => {
  const result = await db.insert(customersTable)
    .values({
      name,
      address: '123 Test St',
      phone: '555-0100',
      subscription_start_date: new Date('2024-01-01')
    })
    .returning()
    .execute();
  return result[0];
};

// Helper function to create test bills
const createTestBill = async (customerId: number, month: string, amount: number, status: 'paid' | 'unpaid' = 'unpaid') => {
  const result = await db.insert(monthlyBillsTable)
    .values({
      customer_id: customerId,
      bill_month: month,
      amount: amount.toString(),
      status,
      due_date: new Date(`${month}-15`)
    })
    .returning()
    .execute();
  return result[0];
};

describe('getCustomerArrears', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no customers have arrears', async () => {
    // Create customer with paid bills only
    const customer = await createTestCustomer('John Doe');
    await createTestBill(customer.id, '2024-01', 100, 'paid');
    await createTestBill(customer.id, '2024-02', 100, 'paid');

    const result = await getCustomerArrears();

    expect(result).toHaveLength(0);
  });

  it('should calculate arrears for single customer', async () => {
    const customer = await createTestCustomer('Jane Smith');
    
    // Create unpaid bills
    await createTestBill(customer.id, '2024-01', 150);
    await createTestBill(customer.id, '2024-02', 150);
    await createTestBill(customer.id, '2024-03', 150);

    const result = await getCustomerArrears();

    expect(result).toHaveLength(1);
    expect(result[0].customer_id).toEqual(customer.id);
    expect(result[0].customer_name).toEqual('Jane Smith');
    expect(result[0].total_outstanding).toEqual(450);
    expect(result[0].oldest_unpaid_month).toEqual('2024-01');
    expect(result[0].months_overdue).toBeGreaterThan(0);
  });

  it('should calculate arrears for multiple customers', async () => {
    const customer1 = await createTestCustomer('Alice');
    const customer2 = await createTestCustomer('Bob');
    
    // Customer 1: 2 unpaid bills
    await createTestBill(customer1.id, '2024-02', 200);
    await createTestBill(customer1.id, '2024-03', 200);
    
    // Customer 2: 1 unpaid bill
    await createTestBill(customer2.id, '2024-01', 300);

    const result = await getCustomerArrears();

    expect(result).toHaveLength(2);
    
    // Find results by customer name for consistent testing
    const aliceResult = result.find(r => r.customer_name === 'Alice');
    const bobResult = result.find(r => r.customer_name === 'Bob');
    
    expect(aliceResult).toBeDefined();
    expect(aliceResult!.total_outstanding).toEqual(400);
    expect(aliceResult!.oldest_unpaid_month).toEqual('2024-02');
    
    expect(bobResult).toBeDefined();
    expect(bobResult!.total_outstanding).toEqual(300);
    expect(bobResult!.oldest_unpaid_month).toEqual('2024-01');
  });

  it('should filter by specific customer ID', async () => {
    const customer1 = await createTestCustomer('Customer 1');
    const customer2 = await createTestCustomer('Customer 2');
    
    // Both customers have arrears
    await createTestBill(customer1.id, '2024-01', 100);
    await createTestBill(customer2.id, '2024-02', 200);

    const result = await getCustomerArrears(customer1.id);

    expect(result).toHaveLength(1);
    expect(result[0].customer_id).toEqual(customer1.id);
    expect(result[0].customer_name).toEqual('Customer 1');
    expect(result[0].total_outstanding).toEqual(100);
  });

  it('should exclude customers with only paid bills', async () => {
    const customer1 = await createTestCustomer('Paid Customer');
    const customer2 = await createTestCustomer('Unpaid Customer');
    
    // Customer 1: only paid bills
    await createTestBill(customer1.id, '2024-01', 100, 'paid');
    await createTestBill(customer1.id, '2024-02', 100, 'paid');
    
    // Customer 2: unpaid bills
    await createTestBill(customer2.id, '2024-01', 150);

    const result = await getCustomerArrears();

    expect(result).toHaveLength(1);
    expect(result[0].customer_name).toEqual('Unpaid Customer');
  });

  it('should calculate months overdue correctly', async () => {
    const customer = await createTestCustomer('Test Customer');
    
    // Create bill from January (should be several months overdue)
    await createTestBill(customer.id, '2024-01', 100);

    const result = await getCustomerArrears();

    expect(result).toHaveLength(1);
    expect(result[0].months_overdue).toBeGreaterThanOrEqual(0);
    expect(typeof result[0].months_overdue).toBe('number');
  });

  it('should handle mixed paid and unpaid bills', async () => {
    const customer = await createTestCustomer('Mixed Bills Customer');
    
    // Mix of paid and unpaid bills
    await createTestBill(customer.id, '2024-01', 100, 'paid');
    await createTestBill(customer.id, '2024-02', 150); // unpaid
    await createTestBill(customer.id, '2024-03', 100, 'paid');
    await createTestBill(customer.id, '2024-04', 200); // unpaid

    const result = await getCustomerArrears();

    expect(result).toHaveLength(1);
    expect(result[0].total_outstanding).toEqual(350); // Only unpaid bills
    expect(result[0].oldest_unpaid_month).toEqual('2024-02');
  });
});
