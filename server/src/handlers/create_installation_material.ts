
import { db } from '../db';
import { installationMaterialsTable, installationsTable } from '../db/schema';
import { type CreateInstallationMaterialInput, type InstallationMaterial } from '../schema';
import { eq } from 'drizzle-orm';

export const createInstallationMaterial = async (input: CreateInstallationMaterialInput): Promise<InstallationMaterial> => {
  try {
    // First verify the installation exists
    const installation = await db.select()
      .from(installationsTable)
      .where(eq(installationsTable.id, input.installation_id))
      .execute();

    if (installation.length === 0) {
      throw new Error(`Installation with id ${input.installation_id} not found`);
    }

    // Calculate total cost
    const totalCost = input.quantity * input.unit_price;

    // Insert the material record
    const materialResult = await db.insert(installationMaterialsTable)
      .values({
        installation_id: input.installation_id,
        material_name: input.material_name,
        quantity: input.quantity.toString(), // Convert number to string for numeric column
        unit_price: input.unit_price.toString(), // Convert number to string for numeric column
        total_cost: totalCost.toString() // Convert number to string for numeric column
      })
      .returning()
      .execute();

    const material = materialResult[0];

    // Get current installation data to calculate new totals
    const currentInstallation = installation[0];
    const currentMaterialCost = parseFloat(currentInstallation.total_material_cost);
    const installationFee = parseFloat(currentInstallation.installation_fee);
    
    // Calculate new totals
    const newTotalMaterialCost = currentMaterialCost + totalCost;
    const newProfitLoss = installationFee - newTotalMaterialCost;

    // Update installation totals
    await db.update(installationsTable)
      .set({
        total_material_cost: newTotalMaterialCost.toString(),
        profit_loss: newProfitLoss.toString()
      })
      .where(eq(installationsTable.id, input.installation_id))
      .execute();

    // Return with numeric conversions
    return {
      ...material,
      quantity: parseFloat(material.quantity),
      unit_price: parseFloat(material.unit_price),
      total_cost: parseFloat(material.total_cost)
    };
  } catch (error) {
    console.error('Installation material creation failed:', error);
    throw error;
  }
};
