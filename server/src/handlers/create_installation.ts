
import { db } from '../db';
import { installationsTable, customersTable } from '../db/schema';
import { type CreateInstallationInput, type Installation } from '../schema';
import { eq } from 'drizzle-orm';

export const createInstallation = async (input: CreateInstallationInput): Promise<Installation> => {
  try {
    // Check if customer exists to prevent foreign key constraint violation
    const customer = await db.select()
      .from(customersTable)
      .where(eq(customersTable.id, input.customer_id))
      .execute();

    if (customer.length === 0) {
      throw new Error(`Customer with ID ${input.customer_id} not found`);
    }

    // Use default installation fee (300000) if not provided
    const installationFee = input.installation_fee ?? 300000;

    // Insert installation record
    const result = await db.insert(installationsTable)
      .values({
        customer_id: input.customer_id,
        installation_fee: installationFee.toString(), // Convert number to string for numeric column
        fee_paid: false, // Default value
        status: 'pending', // Default value
        scheduled_date: input.scheduled_date,
        completed_date: null,
        total_material_cost: '0', // Default value as string for numeric column
        profit_loss: '0' // Default value as string for numeric column
      })
      .returning()
      .execute();

    // Convert numeric fields back to numbers before returning
    const installation = result[0];
    return {
      ...installation,
      installation_fee: parseFloat(installation.installation_fee),
      total_material_cost: parseFloat(installation.total_material_cost),
      profit_loss: parseFloat(installation.profit_loss)
    };
  } catch (error) {
    console.error('Installation creation failed:', error);
    throw error;
  }
};
