
import { serial, text, pgTable, timestamp, numeric, integer, boolean, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const userRoleEnum = pgEnum('user_role', ['admin', 'operator']);
export const customerStatusEnum = pgEnum('customer_status', ['active', 'inactive']);
export const billStatusEnum = pgEnum('bill_status', ['unpaid', 'paid']);
export const installationStatusEnum = pgEnum('installation_status', ['pending', 'completed']);

// Users table
export const usersTable = pgTable('users', {
  id: serial('id').primaryKey(),
  username: text('username').notNull().unique(),
  password_hash: text('password_hash').notNull(),
  role: userRoleEnum('role').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Customers table
export const customersTable = pgTable('customers', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  address: text('address').notNull(),
  phone: text('phone'),
  status: customerStatusEnum('status').notNull().default('active'),
  subscription_start_date: timestamp('subscription_start_date').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Monthly bills table
export const monthlyBillsTable = pgTable('monthly_bills', {
  id: serial('id').primaryKey(),
  customer_id: integer('customer_id').references(() => customersTable.id).notNull(),
  bill_month: text('bill_month').notNull(), // Format: YYYY-MM
  amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
  status: billStatusEnum('status').notNull().default('unpaid'),
  due_date: timestamp('due_date').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Payments table
export const paymentsTable = pgTable('payments', {
  id: serial('id').primaryKey(),
  customer_id: integer('customer_id').references(() => customersTable.id).notNull(),
  bill_id: integer('bill_id').references(() => monthlyBillsTable.id), // Nullable for arrears payments
  amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
  payment_date: timestamp('payment_date').notNull(),
  notes: text('notes'),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Installations table
export const installationsTable = pgTable('installations', {
  id: serial('id').primaryKey(),
  customer_id: integer('customer_id').references(() => customersTable.id).notNull(),
  installation_fee: numeric('installation_fee', { precision: 10, scale: 2 }).notNull(),
  fee_paid: boolean('fee_paid').notNull().default(false),
  status: installationStatusEnum('status').notNull().default('pending'),
  scheduled_date: timestamp('scheduled_date'),
  completed_date: timestamp('completed_date'),
  total_material_cost: numeric('total_material_cost', { precision: 10, scale: 2 }).notNull().default('0'),
  profit_loss: numeric('profit_loss', { precision: 10, scale: 2 }).notNull().default('0'),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Installation materials table
export const installationMaterialsTable = pgTable('installation_materials', {
  id: serial('id').primaryKey(),
  installation_id: integer('installation_id').references(() => installationsTable.id).notNull(),
  material_name: text('material_name').notNull(),
  quantity: numeric('quantity', { precision: 10, scale: 3 }).notNull(),
  unit_price: numeric('unit_price', { precision: 10, scale: 2 }).notNull(),
  total_cost: numeric('total_cost', { precision: 10, scale: 2 }).notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Material presets table
export const materialPresetsTable = pgTable('material_presets', {
  id: serial('id').primaryKey(),
  name: text('name').notNull().unique(),
  default_unit_price: numeric('default_unit_price', { precision: 10, scale: 2 }).notNull(),
  unit: text('unit').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Settings table
export const settingsTable = pgTable('settings', {
  id: serial('id').primaryKey(),
  key: text('key').notNull().unique(),
  value: text('value').notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Relations
export const customersRelations = relations(customersTable, ({ many }) => ({
  monthlyBills: many(monthlyBillsTable),
  payments: many(paymentsTable),
  installations: many(installationsTable),
}));

export const monthlyBillsRelations = relations(monthlyBillsTable, ({ one, many }) => ({
  customer: one(customersTable, {
    fields: [monthlyBillsTable.customer_id],
    references: [customersTable.id],
  }),
  payments: many(paymentsTable),
}));

export const paymentsRelations = relations(paymentsTable, ({ one }) => ({
  customer: one(customersTable, {
    fields: [paymentsTable.customer_id],
    references: [customersTable.id],
  }),
  bill: one(monthlyBillsTable, {
    fields: [paymentsTable.bill_id],
    references: [monthlyBillsTable.id],
  }),
}));

export const installationsRelations = relations(installationsTable, ({ one, many }) => ({
  customer: one(customersTable, {
    fields: [installationsTable.customer_id],
    references: [customersTable.id],
  }),
  materials: many(installationMaterialsTable),
}));

export const installationMaterialsRelations = relations(installationMaterialsTable, ({ one }) => ({
  installation: one(installationsTable, {
    fields: [installationMaterialsTable.installation_id],
    references: [installationsTable.id],
  }),
}));

// Export all tables
export const tables = {
  users: usersTable,
  customers: customersTable,
  monthlyBills: monthlyBillsTable,
  payments: paymentsTable,
  installations: installationsTable,
  installationMaterials: installationMaterialsTable,
  materialPresets: materialPresetsTable,
  settings: settingsTable,
};
