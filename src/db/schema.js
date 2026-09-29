import { pgTable, text, jsonb, timestamp } from "drizzle-orm/pg-core";
const appStore = pgTable("app_store", {
  id: text("id").primaryKey(),
  data: jsonb("data").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});
const clients = pgTable("clients", {
  id: text("id").primaryKey(),
  name: text("name").notNull()
});
const vehicles = pgTable("vehicles", {
  id: text("id").primaryKey(),
  plate: text("plate").notNull()
});
const parts = pgTable("parts", {
  id: text("id").primaryKey(),
  name: text("name").notNull()
});
const serviceOrders = pgTable("service_orders", {
  id: text("id").primaryKey(),
  number: text("number")
});
export {
  appStore,
  clients,
  parts,
  serviceOrders,
  vehicles
};
