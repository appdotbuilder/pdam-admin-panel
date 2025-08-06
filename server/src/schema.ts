
import { z } from 'zod';

// User schemas
export const userRoleSchema = z.enum(['admin', 'operator']);
export type UserRole = z.infer<typeof userRoleSchema>;

export const userSchema = z.object({
  id: z.number(),
  username: z.string(),
  password_hash: z.string(),
  role: userRoleSchema,
  created_at: z.coerce.date()
});
export type User = z.infer<typeof userSchema>;

export const createUserInputSchema = z.object({
  username: z.string().trim().min(3).max(50),
  password: z.string().trim().min(6).max(100),
  role: userRoleSchema
});
export type CreateUserInput = z.infer<typeof createUserInputSchema>;

export const loginInputSchema = z.object({
  username: z.string().trim().min(1),
  password: z.string().trim().min(1)
});
export type LoginInput = z.infer<typeof loginInputSchema>;

// Customer schemas
export const customerStatusSchema = z.enum(['active', 'inactive']);
export type CustomerStatus = z.infer<typeof customerStatusSchema>;

export const customerSchema = z.object({
  id: z.number(),
  name: z.string(),
  address: z.string(),
  phone: z.string().nullable(),
  status: customerStatusSchema,
  subscription_start_date: z.coerce.date(),
  created_at: z.coerce.date()
});
export type Customer = z.infer<typeof customerSchema>;

export const createCustomerInputSchema = z.object({
  name: z.string(),
  address: z.string(),
  phone: z.string().nullable(),
  subscription_start_date: z.coerce.date()
});
export type CreateCustomerInput = z.infer<typeof createCustomerInputSchema>;

export const updateCustomerInputSchema = z.object({
  id: z.number(),
  name: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().nullable().optional(),
  status: customerStatusSchema.optional()
});
export type UpdateCustomerInput = z.infer<typeof updateCustomerInputSchema>;

// Monthly bill schemas
export const billStatusSchema = z.enum(['unpaid', 'paid']);
export type BillStatus = z.infer<typeof billStatusSchema>;

export const monthlyBillSchema = z.object({
  id: z.number(),
  customer_id: z.number(),
  bill_month: z.string(), // Format: YYYY-MM
  amount: z.number(),
  status: billStatusSchema,
  due_date: z.coerce.date(),
  created_at: z.coerce.date()
});
export type MonthlyBill = z.infer<typeof monthlyBillSchema>;

export const generateMonthlyBillsInputSchema = z.object({
  month: z.string(), // Format: YYYY-MM
  amount: z.number().optional() // Optional override for default amount
});
export type GenerateMonthlyBillsInput = z.infer<typeof generateMonthlyBillsInputSchema>;

// Payment schemas
export const paymentSchema = z.object({
  id: z.number(),
  customer_id: z.number(),
  bill_id: z.number().nullable(), // Null for arrears payments
  amount: z.number(),
  payment_date: z.coerce.date(),
  notes: z.string().nullable(),
  created_at: z.coerce.date()
});
export type Payment = z.infer<typeof paymentSchema>;

export const createPaymentInputSchema = z.object({
  customer_id: z.number(),
  bill_id: z.number().nullable(),
  amount: z.number().positive(),
  payment_date: z.coerce.date(),
  notes: z.string().nullable()
});
export type CreatePaymentInput = z.infer<typeof createPaymentInputSchema>;

// Installation schemas
export const installationStatusSchema = z.enum(['pending', 'completed']);
export type InstallationStatus = z.infer<typeof installationStatusSchema>;

export const installationSchema = z.object({
  id: z.number(),
  customer_id: z.number(),
  installation_fee: z.number(),
  fee_paid: z.boolean(),
  status: installationStatusSchema,
  scheduled_date: z.coerce.date().nullable(),
  completed_date: z.coerce.date().nullable(),
  total_material_cost: z.number(),
  profit_loss: z.number(),
  created_at: z.coerce.date()
});
export type Installation = z.infer<typeof installationSchema>;

export const createInstallationInputSchema = z.object({
  customer_id: z.number(),
  installation_fee: z.number().optional(), // Optional override for default fee
  scheduled_date: z.coerce.date().nullable()
});
export type CreateInstallationInput = z.infer<typeof createInstallationInputSchema>;

export const updateInstallationInputSchema = z.object({
  id: z.number(),
  status: installationStatusSchema.optional(),
  fee_paid: z.boolean().optional(),
  completed_date: z.coerce.date().nullable().optional()
});
export type UpdateInstallationInput = z.infer<typeof updateInstallationInputSchema>;

// Installation material schemas
export const installationMaterialSchema = z.object({
  id: z.number(),
  installation_id: z.number(),
  material_name: z.string(),
  quantity: z.number(),
  unit_price: z.number(),
  total_cost: z.number(),
  created_at: z.coerce.date()
});
export type InstallationMaterial = z.infer<typeof installationMaterialSchema>;

export const createInstallationMaterialInputSchema = z.object({
  installation_id: z.number(),
  material_name: z.string(),
  quantity: z.number().positive(),
  unit_price: z.number().positive()
});
export type CreateInstallationMaterialInput = z.infer<typeof createInstallationMaterialInputSchema>;

// Material preset schemas
export const materialPresetSchema = z.object({
  id: z.number(),
  name: z.string(),
  default_unit_price: z.number(),
  unit: z.string(),
  created_at: z.coerce.date()
});
export type MaterialPreset = z.infer<typeof materialPresetSchema>;

export const createMaterialPresetInputSchema = z.object({
  name: z.string(),
  default_unit_price: z.number().positive(),
  unit: z.string()
});
export type CreateMaterialPresetInput = z.infer<typeof createMaterialPresetInputSchema>;

// Settings schemas
export const settingsSchema = z.object({
  id: z.number(),
  key: z.string(),
  value: z.string(),
  updated_at: z.coerce.date()
});
export type Settings = z.infer<typeof settingsSchema>;

export const updateSettingInputSchema = z.object({
  key: z.string(),
  value: z.string()
});
export type UpdateSettingInput = z.infer<typeof updateSettingInputSchema>;

// Report schemas
export const monthlyReportSchema = z.object({
  month: z.string(),
  subscription_income: z.number(),
  installation_income: z.number(),
  total_income: z.number(),
  material_expenses: z.number(),
  net_balance: z.number(),
  total_customers: z.number(),
  new_installations: z.number()
});
export type MonthlyReport = z.infer<typeof monthlyReportSchema>;

export const arrearsReportSchema = z.object({
  customer_id: z.number(),
  customer_name: z.string(),
  total_outstanding: z.number(),
  oldest_unpaid_month: z.string(),
  months_overdue: z.number()
});
export type ArrearsReport = z.infer<typeof arrearsReportSchema>;

export const installationReportSchema = z.object({
  installation_id: z.number(),
  customer_name: z.string(),
  installation_fee: z.number(),
  material_cost: z.number(),
  profit_loss: z.number(),
  status: installationStatusSchema,
  completed_date: z.coerce.date().nullable()
});
export type InstallationReport = z.infer<typeof installationReportSchema>;

export const reportQuerySchema = z.object({
  month: z.string().optional(),
  start_date: z.coerce.date().optional(),
  end_date: z.coerce.date().optional()
});
export type ReportQuery = z.infer<typeof reportQuerySchema>;
