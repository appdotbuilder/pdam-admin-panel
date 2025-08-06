
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { customersTable, installationsTable, installationMaterialsTable } from '../db/schema';
import { getInstallationMaterials } from '../handlers/get_installation_materials';

describe('getInstallationMaterials', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array for installation with no materials', async () => {
    // Create customer first
    const customerResult = await db.insert(customersTable)
      .values({
        name: 'Test Customer',
        address: '123 Test St',
        phone: '555-0123',
        subscription_start_date: new Date()
      })
      .returning()
      .execute();

    // Create installation
    const installationResult = await db.insert(installationsTable)
      .values({
        customer_id: customerResult[0].id,
        installation_fee: '500.00'
      })
      .returning()
      .execute();

    const result = await getInstallationMaterials(installationResult[0].id);

    expect(result).toHaveLength(0);
  });

  it('should return materials for specific installation', async () => {
    // Create customer
    const customerResult = await db.insert(customersTable)
      .values({
        name: 'Test Customer',
        address: '123 Test St',
        phone: '555-0123',
        subscription_start_date: new Date()
      })
      .returning()
      .execute();

    // Create installation
    const installationResult = await db.insert(installationsTable)
      .values({
        customer_id: customerResult[0].id,
        installation_fee: '500.00'
      })
      .returning()
      .execute();

    // Create materials
    const material1 = await db.insert(installationMaterialsTable)
      .values({
        installation_id: installationResult[0].id,
        material_name: 'Cable',
        quantity: '100.000',
        unit_price: '2.50',
        total_cost: '250.00'
      })
      .returning()
      .execute();

    const material2 = await db.insert(installationMaterialsTable)
      .values({
        installation_id: installationResult[0].id,
        material_name: 'Router',
        quantity: '1.000',
        unit_price: '150.00',
        total_cost: '150.00'
      })
      .returning()
      .execute();

    const result = await getInstallationMaterials(installationResult[0].id);

    expect(result).toHaveLength(2);
    
    // Check first material (ordered by created_at)
    expect(result[0].material_name).toEqual('Cable');
    expect(result[0].quantity).toEqual(100);
    expect(result[0].unit_price).toEqual(2.5);
    expect(result[0].total_cost).toEqual(250);
    expect(result[0].installation_id).toEqual(installationResult[0].id);
    expect(typeof result[0].quantity).toBe('number');
    expect(typeof result[0].unit_price).toBe('number');
    expect(typeof result[0].total_cost).toBe('number');

    // Check second material
    expect(result[1].material_name).toEqual('Router');
    expect(result[1].quantity).toEqual(1);
    expect(result[1].unit_price).toEqual(150);
    expect(result[1].total_cost).toEqual(150);
  });

  it('should only return materials for specified installation', async () => {
    // Create customer
    const customerResult = await db.insert(customersTable)
      .values({
        name: 'Test Customer',
        address: '123 Test St',
        phone: '555-0123',
        subscription_start_date: new Date()
      })
      .returning()
      .execute();

    // Create two installations
    const installation1Result = await db.insert(installationsTable)
      .values({
        customer_id: customerResult[0].id,
        installation_fee: '500.00'
      })
      .returning()
      .execute();

    const installation2Result = await db.insert(installationsTable)
      .values({
        customer_id: customerResult[0].id,
        installation_fee: '300.00'
      })
      .returning()
      .execute();

    // Add material to first installation
    await db.insert(installationMaterialsTable)
      .values({
        installation_id: installation1Result[0].id,
        material_name: 'Cable for Installation 1',
        quantity: '50.000',
        unit_price: '2.00',
        total_cost: '100.00'
      })
      .execute();

    // Add material to second installation
    await db.insert(installationMaterialsTable)
      .values({
        installation_id: installation2Result[0].id,
        material_name: 'Cable for Installation 2',
        quantity: '25.000',
        unit_price: '3.00',
        total_cost: '75.00'
      })
      .execute();

    // Get materials for first installation only
    const result = await getInstallationMaterials(installation1Result[0].id);

    expect(result).toHaveLength(1);
    expect(result[0].material_name).toEqual('Cable for Installation 1');
    expect(result[0].installation_id).toEqual(installation1Result[0].id);
  });

  it('should return materials ordered by creation date', async () => {
    // Create customer
    const customerResult = await db.insert(customersTable)
      .values({
        name: 'Test Customer',
        address: '123 Test St',
        phone: '555-0123',
        subscription_start_date: new Date()
      })
      .returning()
      .execute();

    // Create installation
    const installationResult = await db.insert(installationsTable)
      .values({
        customer_id: customerResult[0].id,
        installation_fee: '500.00'
      })
      .returning()
      .execute();

    // Create materials with slight delay to ensure different timestamps
    const material1 = await db.insert(installationMaterialsTable)
      .values({
        installation_id: installationResult[0].id,
        material_name: 'First Material',
        quantity: '1.000',
        unit_price: '10.00',
        total_cost: '10.00'
      })
      .returning()
      .execute();

    // Small delay to ensure different created_at timestamps
    await new Promise(resolve => setTimeout(resolve, 10));

    const material2 = await db.insert(installationMaterialsTable)
      .values({
        installation_id: installationResult[0].id,
        material_name: 'Second Material',
        quantity: '2.000',
        unit_price: '15.00',
        total_cost: '30.00'
      })
      .returning()
      .execute();

    const result = await getInstallationMaterials(installationResult[0].id);

    expect(result).toHaveLength(2);
    expect(result[0].material_name).toEqual('First Material');
    expect(result[1].material_name).toEqual('Second Material');
    expect(result[0].created_at <= result[1].created_at).toBe(true);
  });
});
