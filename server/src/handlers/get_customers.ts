
import { db } from '../db';
import { customersTable } from '../db/schema';
import { type Customer } from '../schema';
import { eq, and } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';

export const getCustomers = async (customerId?: number): Promise<Customer[]> => {
  try {
    // Execute query with optional filtering
    const results = customerId !== undefined 
      ? await db.select()
          .from(customersTable)
          .where(eq(customersTable.id, customerId))
          .execute()
      : await db.select()
          .from(customersTable)
          .execute();

    // No numeric conversions needed for customers table
    return results;
  } catch (error) {
    console.error('Get customers failed:', error);
    throw error;
  }
};
