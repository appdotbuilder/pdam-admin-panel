
import { db } from '../db';
import { installationsTable } from '../db/schema';
import { type Installation } from '../schema';
import { eq } from 'drizzle-orm';

export async function getInstallations(customerId?: number): Promise<Installation[]> {
  try {
    let results;

    if (customerId !== undefined) {
      results = await db.select()
        .from(installationsTable)
        .where(eq(installationsTable.customer_id, customerId))
        .execute();
    } else {
      results = await db.select()
        .from(installationsTable)
        .execute();
    }

    // Convert numeric fields back to numbers
    return results.map(installation => ({
      ...installation,
      installation_fee: parseFloat(installation.installation_fee),
      total_material_cost: parseFloat(installation.total_material_cost),
      profit_loss: parseFloat(installation.profit_loss)
    }));
  } catch (error) {
    console.error('Failed to fetch installations:', error);
    throw error;
  }
}
