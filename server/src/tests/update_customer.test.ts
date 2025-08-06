
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { customersTable } from '../db/schema';
import { type UpdateCustomerInput, type CreateCustomerInput } from '../schema';
import { updateCustomer } from '../handlers/update_customer';
import { eq } from 'drizzle-orm';

// Test data
const testCustomerInput: CreateCustomerInput = {
  name: 'Original Customer',
  address: '123 Original St',
  phone: '555-0001',
  subscription_start_date: new Date('2024-01-01')
};

describe('updateCustomer', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should update customer name', async () => {
    // Create test customer
    const created = await db.insert(customersTable)
      .values(testCustomerInput)
      .returning()
      .execute();

    const customerId = created[0].id;

    const updateInput: UpdateCustomerInput = {
      id: customerId,
      name: 'Updated Customer Name'
    };

    const result = await updateCustomer(updateInput);

    expect(result.id).toEqual(customerId);
    expect(result.name).toEqual('Updated Customer Name');
    expect(result.address).toEqual('123 Original St'); // Should remain unchanged
    expect(result.phone).toEqual('555-0001'); // Should remain unchanged
    expect(result.status).toEqual('active'); // Default status
  });

  it('should update customer status', async () => {
    // Create test customer
    const created = await db.insert(customersTable)
      .values(testCustomerInput)
      .returning()
      .execute();

    const customerId = created[0].id;

    const updateInput: UpdateCustomerInput = {
      id: customerId,
      status: 'inactive'
    };

    const result = await updateCustomer(updateInput);

    expect(result.id).toEqual(customerId);
    expect(result.status).toEqual('inactive');
    expect(result.name).toEqual('Original Customer'); // Should remain unchanged
  });

  it('should update multiple fields at once', async () => {
    // Create test customer
    const created = await db.insert(customersTable)
      .values(testCustomerInput)
      .returning()
      .execute();

    const customerId = created[0].id;

    const updateInput: UpdateCustomerInput = {
      id: customerId,
      name: 'Multi Update Customer',
      address: '456 New Address Ave',
      phone: '555-9999',
      status: 'inactive'
    };

    const result = await updateCustomer(updateInput);

    expect(result.id).toEqual(customerId);
    expect(result.name).toEqual('Multi Update Customer');
    expect(result.address).toEqual('456 New Address Ave');
    expect(result.phone).toEqual('555-9999');
    expect(result.status).toEqual('inactive');
  });

  it('should save updates to database', async () => {
    // Create test customer
    const created = await db.insert(customersTable)
      .values(testCustomerInput)
      .returning()
      .execute();

    const customerId = created[0].id;

    const updateInput: UpdateCustomerInput = {
      id: customerId,
      name: 'Database Test Customer',
      address: '789 Database St'
    };

    await updateCustomer(updateInput);

    // Verify changes in database
    const customers = await db.select()
      .from(customersTable)
      .where(eq(customersTable.id, customerId))
      .execute();

    expect(customers).toHaveLength(1);
    expect(customers[0].name).toEqual('Database Test Customer');
    expect(customers[0].address).toEqual('789 Database St');
    expect(customers[0].phone).toEqual('555-0001'); // Should remain unchanged
  });

  it('should handle null phone updates', async () => {
    // Create test customer
    const created = await db.insert(customersTable)
      .values(testCustomerInput)
      .returning()
      .execute();

    const customerId = created[0].id;

    const updateInput: UpdateCustomerInput = {
      id: customerId,
      phone: null
    };

    const result = await updateCustomer(updateInput);

    expect(result.id).toEqual(customerId);
    expect(result.phone).toBeNull();
    expect(result.name).toEqual('Original Customer'); // Should remain unchanged
  });

  it('should throw error for non-existent customer', async () => {
    const updateInput: UpdateCustomerInput = {
      id: 99999, // Non-existent ID
      name: 'Should Fail'
    };

    expect(updateCustomer(updateInput)).rejects.toThrow(/customer with id 99999 not found/i);
  });

  it('should handle partial updates correctly', async () => {
    // Create test customer
    const created = await db.insert(customersTable)
      .values(testCustomerInput)
      .returning()
      .execute();

    const customerId = created[0].id;

    // Update only address
    const updateInput: UpdateCustomerInput = {
      id: customerId,
      address: 'Only Address Updated'
    };

    const result = await updateCustomer(updateInput);

    expect(result.id).toEqual(customerId);
    expect(result.address).toEqual('Only Address Updated');
    expect(result.name).toEqual('Original Customer'); // Unchanged
    expect(result.phone).toEqual('555-0001'); // Unchanged
    expect(result.status).toEqual('active'); // Default unchanged
  });
});
