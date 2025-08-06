
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { customersTable } from '../db/schema';
import { type CreateCustomerInput } from '../schema';
import { createCustomer } from '../handlers/create_customer';
import { eq } from 'drizzle-orm';

// Test input with all fields
const testInput: CreateCustomerInput = {
  name: 'Test Customer',
  address: '123 Test Street',
  phone: '555-0123',
  subscription_start_date: new Date('2024-01-15')
};

// Test input with nullable phone
const testInputNullPhone: CreateCustomerInput = {
  name: 'Customer No Phone',
  address: '456 Another Street',
  phone: null,
  subscription_start_date: new Date('2024-02-01')
};

describe('createCustomer', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a customer with all fields', async () => {
    const result = await createCustomer(testInput);

    // Basic field validation
    expect(result.name).toEqual('Test Customer');
    expect(result.address).toEqual('123 Test Street');
    expect(result.phone).toEqual('555-0123');
    expect(result.status).toEqual('active');
    expect(result.subscription_start_date).toEqual(new Date('2024-01-15'));
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should create a customer with null phone', async () => {
    const result = await createCustomer(testInputNullPhone);

    expect(result.name).toEqual('Customer No Phone');
    expect(result.address).toEqual('456 Another Street');
    expect(result.phone).toBeNull();
    expect(result.status).toEqual('active');
    expect(result.subscription_start_date).toEqual(new Date('2024-02-01'));
  });

  it('should save customer to database', async () => {
    const result = await createCustomer(testInput);

    // Query using proper drizzle syntax
    const customers = await db.select()
      .from(customersTable)
      .where(eq(customersTable.id, result.id))
      .execute();

    expect(customers).toHaveLength(1);
    expect(customers[0].name).toEqual('Test Customer');
    expect(customers[0].address).toEqual('123 Test Street');
    expect(customers[0].phone).toEqual('555-0123');
    expect(customers[0].status).toEqual('active');
    expect(customers[0].subscription_start_date).toEqual(new Date('2024-01-15'));
    expect(customers[0].created_at).toBeInstanceOf(Date);
  });

  it('should default status to active', async () => {
    const result = await createCustomer(testInput);
    
    expect(result.status).toEqual('active');
    
    // Verify in database
    const customers = await db.select()
      .from(customersTable)
      .where(eq(customersTable.id, result.id))
      .execute();
    
    expect(customers[0].status).toEqual('active');
  });

  it('should handle different subscription start dates', async () => {
    const futureDate = new Date('2025-06-15');
    const futureInput: CreateCustomerInput = {
      name: 'Future Customer',
      address: '789 Future Avenue',
      phone: '555-9999',
      subscription_start_date: futureDate
    };

    const result = await createCustomer(futureInput);

    expect(result.subscription_start_date).toEqual(futureDate);
    expect(result.subscription_start_date.getTime()).toEqual(futureDate.getTime());
  });
});
