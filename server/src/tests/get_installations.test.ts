
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { customersTable, installationsTable } from '../db/schema';
import { type CreateCustomerInput, type CreateInstallationInput } from '../schema';
import { getInstallations } from '../handlers/get_installations';

const testCustomer: CreateCustomerInput = {
  name: 'Test Customer',
  address: '123 Test Street',
  phone: '555-1234',
  subscription_start_date: new Date('2024-01-01')
};

const testInstallation: CreateInstallationInput = {
  customer_id: 1, // Will be set after customer creation
  scheduled_date: new Date('2024-02-01')
};

describe('getInstallations', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no installations exist', async () => {
    const result = await getInstallations();
    expect(result).toEqual([]);
  });

  it('should return all installations when no customer filter', async () => {
    // Create customer
    const customerResult = await db.insert(customersTable)
      .values({
        name: testCustomer.name,
        address: testCustomer.address,
        phone: testCustomer.phone,
        subscription_start_date: testCustomer.subscription_start_date
      })
      .returning()
      .execute();

    const customerId = customerResult[0].id;

    // Create installations
    await db.insert(installationsTable)
      .values([
        {
          customer_id: customerId,
          installation_fee: '100.00',
          scheduled_date: testInstallation.scheduled_date
        },
        {
          customer_id: customerId,
          installation_fee: '150.00',
          scheduled_date: new Date('2024-02-15')
        }
      ])
      .execute();

    const result = await getInstallations();

    expect(result).toHaveLength(2);
    expect(typeof result[0].installation_fee).toBe('number');
    expect(typeof result[0].total_material_cost).toBe('number');
    expect(typeof result[0].profit_loss).toBe('number');
    expect(result[0].installation_fee).toEqual(100);
    expect(result[1].installation_fee).toEqual(150);
  });

  it('should filter installations by customer_id', async () => {
    // Create two customers
    const customer1Result = await db.insert(customersTable)
      .values({
        name: 'Customer 1',
        address: '123 Test Street',
        phone: '555-1234',
        subscription_start_date: new Date('2024-01-01')
      })
      .returning()
      .execute();

    const customer2Result = await db.insert(customersTable)
      .values({
        name: 'Customer 2',
        address: '456 Test Avenue',
        phone: '555-5678',
        subscription_start_date: new Date('2024-01-02')
      })
      .returning()
      .execute();

    const customer1Id = customer1Result[0].id;
    const customer2Id = customer2Result[0].id;

    // Create installations for both customers
    await db.insert(installationsTable)
      .values([
        {
          customer_id: customer1Id,
          installation_fee: '100.00',
          scheduled_date: new Date('2024-02-01')
        },
        {
          customer_id: customer2Id,
          installation_fee: '200.00',
          scheduled_date: new Date('2024-02-02')
        },
        {
          customer_id: customer1Id,
          installation_fee: '150.00',
          scheduled_date: new Date('2024-02-03')
        }
      ])
      .execute();

    const result = await getInstallations(customer1Id);

    expect(result).toHaveLength(2);
    expect(result[0].customer_id).toEqual(customer1Id);
    expect(result[1].customer_id).toEqual(customer1Id);
    expect(result[0].installation_fee).toEqual(100);
    expect(result[1].installation_fee).toEqual(150);
  });

  it('should return empty array for non-existent customer', async () => {
    const result = await getInstallations(999);
    expect(result).toEqual([]);
  });

  it('should handle installations with all numeric fields', async () => {
    // Create customer
    const customerResult = await db.insert(customersTable)
      .values({
        name: testCustomer.name,
        address: testCustomer.address,
        phone: testCustomer.phone,
        subscription_start_date: testCustomer.subscription_start_date
      })
      .returning()
      .execute();

    const customerId = customerResult[0].id;

    // Create installation with custom numeric values
    await db.insert(installationsTable)
      .values({
        customer_id: customerId,
        installation_fee: '250.75',
        total_material_cost: '123.45',
        profit_loss: '127.30',
        scheduled_date: testInstallation.scheduled_date
      })
      .execute();

    const result = await getInstallations(customerId);

    expect(result).toHaveLength(1);
    expect(typeof result[0].installation_fee).toBe('number');
    expect(typeof result[0].total_material_cost).toBe('number');
    expect(typeof result[0].profit_loss).toBe('number');
    expect(result[0].installation_fee).toEqual(250.75);
    expect(result[0].total_material_cost).toEqual(123.45);
    expect(result[0].profit_loss).toEqual(127.30);
  });
});
