import { pgTable, text, jsonb, timestamp } from 'drizzle-orm/pg-core';

export const appStore = pgTable('app_store', {
  id: text('id').primaryKey(),
  data: jsonb('data').notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const clients = pgTable('clients', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
});

export const vehicles = pgTable('vehicles', {
  id: text('id').primaryKey(),
  plate: text('plate').notNull(),
});

export const parts = pgTable('parts', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
});

export const serviceOrders = pgTable('service_orders', {
  id: text('id').primaryKey(),
  number: text('number'),
});
