import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { type CreateCustomerInput } from '../schema';
import { createCustomer } from '../handlers/create_customer';
import { getCustomers } from '../handlers/get_customers';

const testCustomer1: CreateCustomerInput = {
  name: 'Test Customer 1',
  address: '123 Test Street',
  phone: '081234567890',
  subscription_start_date: new Date('2024-01-01')
};

const testCustomer2: CreateCustomerInput = {
  name: 'Test Customer 2', 
  address: '456 Another Street',
  phone: '081234567891',
  subscription_start_date: new Date('2024-01-15')
};

describe('getCustomers with optional customerId', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return all customers when no customerId provided', async () => {
    // Create multiple customers
    const customer1 = await createCustomer(testCustomer1);
    const customer2 = await createCustomer(testCustomer2);

    // Get all customers
    const allCustomers = await getCustomers();

    expect(allCustomers).toHaveLength(2);
    expect(allCustomers.find(c => c.id === customer1.id)).toBeDefined();
    expect(allCustomers.find(c => c.id === customer2.id)).toBeDefined();
  });

  it('should return single customer when customerId provided', async () => {
    // Create multiple customers
    const customer1 = await createCustomer(testCustomer1);
    const customer2 = await createCustomer(testCustomer2);

    // Get specific customer
    const specificCustomers = await getCustomers(customer1.id);

    expect(specificCustomers).toHaveLength(1);
    expect(specificCustomers[0].id).toEqual(customer1.id);
    expect(specificCustomers[0].name).toEqual('Test Customer 1');
    expect(specificCustomers[0].address).toEqual('123 Test Street');
  });

  it('should return empty array for non-existent customer', async () => {
    // Create one customer
    await createCustomer(testCustomer1);

    // Try to get non-existent customer
    const nonExistentCustomers = await getCustomers(999);

    expect(nonExistentCustomers).toHaveLength(0);
  });

  it('should handle edge case of customerId = 0', async () => {
    // Create customer
    await createCustomer(testCustomer1);

    // Get customer with ID 0 (shouldn't exist)
    const zeroCustomers = await getCustomers(0);

    expect(zeroCustomers).toHaveLength(0);
  });
});