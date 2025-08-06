
import { db } from '../db';
import { installationsTable, customersTable } from '../db/schema';
import { type UpdateInstallationInput, type Installation } from '../schema';
import { eq, sum } from 'drizzle-orm';
import { installationMaterialsTable } from '../db/schema';

export const updateInstallation = async (input: UpdateInstallationInput): Promise<Installation> => {
  try {
    // First, get the current installation to check if it exists and get customer_id
    const existingInstallations = await db.select()
      .from(installationsTable)
      .where(eq(installationsTable.id, input.id))
      .execute();

    if (existingInstallations.length === 0) {
      throw new Error('Installation not found');
    }

    const existingInstallation = existingInstallations[0];

    // Recalculate profit_loss based on current material costs
    const materialCostResult = await db.select({
      total: sum(installationMaterialsTable.total_cost)
    })
      .from(installationMaterialsTable)
      .where(eq(installationMaterialsTable.installation_id, input.id))
      .execute();

    const totalMaterialCost = parseFloat(materialCostResult[0]?.total || '0');
    const installationFee = parseFloat(existingInstallation.installation_fee);
    const profitLoss = installationFee - totalMaterialCost;

    // Build update object
    const updateData: any = {
      total_material_cost: totalMaterialCost.toString(),
      profit_loss: profitLoss.toString()
    };

    if (input.status !== undefined) {
      updateData.status = input.status;
    }

    if (input.fee_paid !== undefined) {
      updateData.fee_paid = input.fee_paid;
    }

    if (input.completed_date !== undefined) {
      updateData.completed_date = input.completed_date;
    }

    // Update the installation
    const result = await db.update(installationsTable)
      .set(updateData)
      .where(eq(installationsTable.id, input.id))
      .returning()
      .execute();

    const updatedInstallation = result[0];

    // If status is set to 'completed', activate customer subscription
    if (input.status === 'completed') {
      await db.update(customersTable)
        .set({ status: 'active' })
        .where(eq(customersTable.id, updatedInstallation.customer_id))
        .execute();
    }

    // Convert numeric fields back to numbers before returning
    return {
      ...updatedInstallation,
      installation_fee: parseFloat(updatedInstallation.installation_fee),
      total_material_cost: parseFloat(updatedInstallation.total_material_cost),
      profit_loss: parseFloat(updatedInstallation.profit_loss)
    };
  } catch (error) {
    console.error('Installation update failed:', error);
    throw error;
  }
};
