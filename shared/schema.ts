import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp, decimal, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table with role-based access
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull().default("customer"), // "customer" | "admin"
  status: text("status").notNull().default("active"), // "active" | "suspended"
  balance: decimal("balance", { precision: 10, scale: 2 }).notNull().default("0"),
  registrationIp: text("registration_ip"),
  suspendedUntil: timestamp("suspended_until"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  email: true,
  password: true,
}).extend({
  username: z.string().min(3, "Username must be at least 3 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type LoginInput = z.infer<typeof loginSchema>;

// Orders table - tracks customer orders
export const orders = pgTable("orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  onedashOrderId: integer("onedash_order_id"), // ID from OneDash API
  tariffId: integer("tariff_id").notNull(),
  tariffName: text("tariff_name").notNull(),
  location: text("location").notNull(), // "msk" | "ams"
  period: integer("period").notNull(), // days
  count: integer("count").notNull().default(1),
  totalPrice: decimal("total_price", { precision: 10, scale: 2 }).notNull(),
  status: text("status").notNull().default("pending"), // "pending" | "active" | "expired" | "cancelled"
  finishDate: timestamp("finish_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertOrderSchema = createInsertSchema(orders).omit({
  id: true,
  createdAt: true,
  onedashOrderId: true,
  finishDate: true,
  status: true,
});

export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Order = typeof orders.$inferSelect;

// VPS instances table
export const vpsInstances = pgTable("vps_instances", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: varchar("order_id").notNull().references(() => orders.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  onedashVpsId: integer("onedash_vps_id"),
  os: text("os").notNull(),
  ipAddress: text("ip_address"),
  status: text("status").notNull().default("not_runned"), // "runned" | "not_runned" | "cloning"
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertVpsSchema = createInsertSchema(vpsInstances).omit({
  id: true,
  createdAt: true,
});

export type InsertVps = z.infer<typeof insertVpsSchema>;
export type VpsInstance = typeof vpsInstances.$inferSelect;

// Pricing rules - admin-defined markup on OneDash prices
export const pricingRules = pgTable("pricing_rules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tariffId: integer("tariff_id").notNull(),
  location: text("location").notNull(), // "msk" | "ams"
  markupType: text("markup_type").notNull().default("percentage"), // "percentage" | "fixed"
  markupValue: decimal("markup_value", { precision: 10, scale: 2 }).notNull().default("20"), // e.g., 20% or $20
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertPricingRuleSchema = createInsertSchema(pricingRules).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertPricingRule = z.infer<typeof insertPricingRuleSchema>;
export type PricingRule = typeof pricingRules.$inferSelect;

// Sessions for authentication
export const sessions = pgTable("sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Login logs for IP tracking
export const loginLogs = pgTable("login_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  ipAddress: text("ip_address").notNull(),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type LoginLog = typeof loginLogs.$inferSelect;

// Transactions table for payment tracking
export const transactions = pgTable("transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  type: text("type").notNull(), // "topup" | "purchase"
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("USD"),
  status: text("status").notNull().default("pending"), // "pending" | "completed" | "failed" | "cancelled"
  paymentMethod: text("payment_method"), // "maxelpay" | "manual"
  externalId: text("external_id"), // MaxelPay order ID
  metadata: jsonb("metadata"), // Additional payment data
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertTransactionSchema = createInsertSchema(transactions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type Transaction = typeof transactions.$inferSelect;

// Create VPS request schema for API
export const createVpsRequestSchema = z.object({
  tariffId: z.number().int().positive(),
  location: z.enum(["msk", "ams"]),
  system: z.string().min(1),
  period: z.number().int().min(7).max(360),
  count: z.number().int().min(1).max(10).default(1),
  additionalOptions: z.object({
    staticIp: z.boolean().default(false),
    nvme: z.boolean().default(false),
    backup: z.boolean().default(false),
  }).optional(),
  processor: z.enum(["intel", "amd"]).default("intel"),
});

export type CreateVpsRequest = z.infer<typeof createVpsRequestSchema>;

// Platform settings table for API keys (stored securely in database)
export const platformSettings = pgTable("platform_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
  description: text("description"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type PlatformSetting = typeof platformSettings.$inferSelect;

// OneDash API response types
export interface OneDashTariff {
  id: number;
  name: string;
  msk_prices: Array<{ price: number; discount: number; period: number }>;
  ams_prices: Array<{ price: number; discount: number; period: number }>;
  currency: string;
  config_info: { cpu: number; ram: number; hard: number };
}

export interface OneDashOrder {
  order_id: number;
  tariff: { id: number; name: string };
  location: string;
  vps_list: Array<{
    id: number;
    os: string;
    vps_ip: string;
    vps_status: "runned" | "not_runned" | "cloning";
  }>;
  finish_time: {
    epoch: number;
    days_remaining: number;
    date: string;
  };
}

export interface OneDashBalance {
  balance: number;
  currency: string;
}
