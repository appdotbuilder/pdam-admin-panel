
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { customersTable, installationsTable, installationMaterialsTable } from '../db/schema';
import { type UpdateInstallationInput, type CreateCustomerInput } from '../schema';
import { updateInstallation } from '../handlers/update_installation';
import { eq } from 'drizzle-orm';

describe('updateInstallation', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should update installation status', async () => {
    // Create test customer
    const customerData: CreateCustomerInput = {
      name: 'Test Customer',
      address: '123 Test St',
      phone: '555-0123',
      subscription_start_date: new Date()
    };

    const customerResult = await db.insert(customersTable)
      .values({
        name: customerData.name,
        address: customerData.address,
        phone: customerData.phone,
        subscription_start_date: customerData.subscription_start_date
      })
      .returning()
      .execute();

    const customer = customerResult[0];

    // Create test installation
    const installationResult = await db.insert(installationsTable)
      .values({
        customer_id: customer.id,
        installation_fee: '500000',
        scheduled_date: new Date()
      })
      .returning()
      .execute();

    const installation = installationResult[0];

    const updateInput: UpdateInstallationInput = {
      id: installation.id,
      status: 'completed',
      fee_paid: true,
      completed_date: new Date()
    };

    const result = await updateInstallation(updateInput);

    expect(result.id).toEqual(installation.id);
    expect(result.status).toEqual('completed');
    expect(result.fee_paid).toEqual(true);
    expect(result.completed_date).toBeInstanceOf(Date);
    expect(typeof result.installation_fee).toBe('number');
    expect(typeof result.total_material_cost).toBe('number');
    expect(typeof result.profit_loss).toBe('number');
  });

  it('should activate customer when status is completed', async () => {
    // Create test customer with inactive status
    const customerResult = await db.insert(customersTable)
      .values({
        name: 'Test Customer',
        address: '123 Test St',
        phone: '555-0123',
        status: 'inactive',
        subscription_start_date: new Date()
      })
      .returning()
      .execute();

    const customer = customerResult[0];

    // Create test installation
    const installationResult = await db.insert(installationsTable)
      .values({
        customer_id: customer.id,
        installation_fee: '500000'
      })
      .returning()
      .execute();

    const installation = installationResult[0];

    const updateInput: UpdateInstallationInput = {
      id: installation.id,
      status: 'completed'
    };

    await updateInstallation(updateInput);

    // Verify customer status was activated
    const updatedCustomers = await db.select()
      .from(customersTable)
      .where(eq(customersTable.id, customer.id))
      .execute();

    expect(updatedCustomers[0].status).toEqual('active');
  });

  it('should recalculate profit_loss based on material costs', async () => {
    // Create test customer
    const customerResult = await db.insert(customersTable)
      .values({
        name: 'Test Customer',
        address: '123 Test St',
        phone: '555-0123',
        subscription_start_date: new Date()
      })
      .returning()
      .execute();

    const customer = customerResult[0];

    // Create test installation
    const installationResult = await db.insert(installationsTable)
      .values({
        customer_id: customer.id,
        installation_fee: '500000' // 500,000 IDR
      })
      .returning()
      .execute();

    const installation = installationResult[0];

    // Add some materials
    await db.insert(installationMaterialsTable)
      .values([
        {
          installation_id: installation.id,
          material_name: 'Cable',
          quantity: '100',
          unit_price: '1000',
          total_cost: '100000' // 100,000 IDR
        },
        {
          installation_id: installation.id,
          material_name: 'Router',
          quantity: '1',
          unit_price: '200000',
          total_cost: '200000' // 200,000 IDR
        }
      ])
      .execute();

    const updateInput: UpdateInstallationInput = {
      id: installation.id,
      status: 'completed'
    };

    const result = await updateInstallation(updateInput);

    // Expected: 500,000 (fee) - 300,000 (materials) = 200,000 profit
    expect(result.total_material_cost).toEqual(300000);
    expect(result.profit_loss).toEqual(200000);
    expect(result.installation_fee).toEqual(500000);
  });

  it('should throw error for non-existent installation', async () => {
    const updateInput: UpdateInstallationInput = {
      id: 999,
      status: 'completed'
    };

    await expect(updateInstallation(updateInput)).rejects.toThrow(/installation not found/i);
  });

  it('should handle zero material costs correctly', async () => {
    // Create test customer
    const customerResult = await db.insert(customersTable)
      .values({
        name: 'Test Customer',
        address: '123 Test St',
        phone: '555-0123',
        subscription_start_date: new Date()
      })
      .returning()
      .execute();

    const customer = customerResult[0];

    // Create test installation
    const installationResult = await db.insert(installationsTable)
      .values({
        customer_id: customer.id,
        installation_fee: '300000'
      })
      .returning()
      .execute();

    const installation = installationResult[0];

    const updateInput: UpdateInstallationInput = {
      id: installation.id,
      fee_paid: true
    };

    const result = await updateInstallation(updateInput);

    // No materials, so full fee should be profit
    expect(result.total_material_cost).toEqual(0);
    expect(result.profit_loss).toEqual(300000);
    expect(result.fee_paid).toEqual(true);
  });
});
