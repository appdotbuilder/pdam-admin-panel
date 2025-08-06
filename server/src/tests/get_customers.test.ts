
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { customersTable } from '../db/schema';
import { type CreateCustomerInput } from '../schema';
import { getCustomers } from '../handlers/get_customers';

// Test customer data
const testCustomer1: CreateCustomerInput = {
  name: 'John Doe',
  address: '123 Main St',
  phone: '555-1234',
  subscription_start_date: new Date('2024-01-01')
};

const testCustomer2: CreateCustomerInput = {
  name: 'Jane Smith',
  address: '456 Oak Ave',
  phone: null,
  subscription_start_date: new Date('2024-02-01')
};

describe('getCustomers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no customers exist', async () => {
    const result = await getCustomers();
    
    expect(result).toEqual([]);
  });

  it('should return all customers', async () => {
    // Create test customers
    await db.insert(customersTable)
      .values([
        {
          name: testCustomer1.name,
          address: testCustomer1.address,
          phone: testCustomer1.phone,
          subscription_start_date: testCustomer1.subscription_start_date
        },
        {
          name: testCustomer2.name,
          address: testCustomer2.address,
          phone: testCustomer2.phone,
          subscription_start_date: testCustomer2.subscription_start_date
        }
      ])
      .execute();

    const result = await getCustomers();

    expect(result).toHaveLength(2);
    
    // Check first customer
    const customer1 = result.find(c => c.name === 'John Doe');
    expect(customer1).toBeDefined();
    expect(customer1!.name).toEqual('John Doe');
    expect(customer1!.address).toEqual('123 Main St');
    expect(customer1!.phone).toEqual('555-1234');
    expect(customer1!.status).toEqual('active'); // Default status
    expect(customer1!.subscription_start_date).toBeInstanceOf(Date);
    expect(customer1!.created_at).toBeInstanceOf(Date);
    expect(customer1!.id).toBeDefined();

    // Check second customer
    const customer2 = result.find(c => c.name === 'Jane Smith');
    expect(customer2).toBeDefined();
    expect(customer2!.name).toEqual('Jane Smith');
    expect(customer2!.address).toEqual('456 Oak Ave');
    expect(customer2!.phone).toBeNull();
    expect(customer2!.status).toEqual('active'); // Default status
    expect(customer2!.subscription_start_date).toBeInstanceOf(Date);
    expect(customer2!.created_at).toBeInstanceOf(Date);
    expect(customer2!.id).toBeDefined();
  });

  it('should return customers with different statuses', async () => {
    // Create customers with different statuses
    await db.insert(customersTable)
      .values([
        {
          name: 'Active Customer',
          address: '123 Active St',
          phone: '555-1111',
          status: 'active',
          subscription_start_date: new Date('2024-01-01')
        },
        {
          name: 'Inactive Customer',
          address: '456 Inactive Ave',
          phone: '555-2222',
          status: 'inactive',
          subscription_start_date: new Date('2024-02-01')
        }
      ])
      .execute();

    const result = await getCustomers();

    expect(result).toHaveLength(2);

    const activeCustomer = result.find(c => c.name === 'Active Customer');
    const inactiveCustomer = result.find(c => c.name === 'Inactive Customer');

    expect(activeCustomer!.status).toEqual('active');
    expect(inactiveCustomer!.status).toEqual('inactive');
  });

  it('should preserve date types correctly', async () => {
    const subscriptionDate = new Date('2024-03-15T10:30:00Z');
    
    await db.insert(customersTable)
      .values({
        name: 'Date Test Customer',
        address: '789 Date St',
        phone: '555-9999',
        subscription_start_date: subscriptionDate
      })
      .execute();

    const result = await getCustomers();

    expect(result).toHaveLength(1);
    expect(result[0].subscription_start_date).toBeInstanceOf(Date);
    expect(result[0].created_at).toBeInstanceOf(Date);
  });
});
