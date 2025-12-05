import { eq, and, desc, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { 
  users, 
  orders, 
  vpsInstances, 
  pricingRules, 
  sessions,
  transactions,
  platformSettings,
  type User, 
  type InsertUser,
  type Order,
  type InsertOrder,
  type VpsInstance,
  type InsertVps,
  type PricingRule,
  type InsertPricingRule,
  type Transaction,
  type InsertTransaction,
  type PlatformSetting,
} from "@shared/schema";
import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});
const db = drizzle(pool);

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser & { role?: string; registrationIp?: string }): Promise<User>;
  getAllUsers(): Promise<User[]>;
  updateUserStatus(userId: string, status: string, suspendedUntil?: Date | null): Promise<void>;
  updateUserEmail(userId: string, email: string): Promise<void>;
  deleteUser(userId: string): Promise<void>;
  updateUserBalance(userId: string, balance: string): Promise<void>;
  addToUserBalance(userId: string, amount: number): Promise<void>;

  // Sessions
  createSession(userId: string, hashedToken: string): Promise<void>;
  getSessionUser(hashedToken: string): Promise<User | undefined>;
  deleteSession(hashedToken: string): Promise<void>;

  // Orders
  createOrder(order: InsertOrder): Promise<Order>;
  getOrderById(id: string): Promise<Order | undefined>;
  getOrderByOnedashId(onedashOrderId: number): Promise<Order | undefined>;
  getOrdersByUserId(userId: string): Promise<Order[]>;
  getAllOrders(): Promise<Order[]>;
  updateOrder(id: string, data: Partial<Order>): Promise<void>;

  // VPS Instances
  createVpsInstance(vps: InsertVps): Promise<VpsInstance>;
  getVpsById(id: string): Promise<VpsInstance | undefined>;
  getVpsByUserId(userId: string): Promise<VpsInstance[]>;
  getVpsByOrderId(orderId: string): Promise<VpsInstance[]>;
  getVpsByOnedashId(onedashVpsId: number): Promise<VpsInstance | undefined>;
  getAllVps(): Promise<VpsInstance[]>;
  updateVps(id: string, data: Partial<VpsInstance>): Promise<void>;

  // Pricing Rules
  createPricingRule(rule: InsertPricingRule): Promise<PricingRule>;
  getPricingRules(): Promise<PricingRule[]>;
  getPricingRule(tariffId: number, location: string): Promise<PricingRule | undefined>;
  updatePricingRule(id: string, data: Partial<PricingRule>): Promise<void>;
  deletePricingRule(id: string): Promise<void>;

  // Transactions
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  getTransactionById(id: string): Promise<Transaction | undefined>;
  getTransactionByExternalId(externalId: string): Promise<Transaction | undefined>;
  getTransactionsByUserId(userId: string): Promise<Transaction[]>;
  updateTransaction(id: string, data: Partial<Transaction>): Promise<void>;

  // Stats
  getUserStats(userId: string): Promise<{
    balance: number;
    activeVps: number;
    totalOrders: number;
    pendingOrders: number;
  }>;
  getAdminStats(): Promise<{
    totalUsers: number;
    activeUsers: number;
    totalOrders: number;
    activeOrders: number;
    totalVps: number;
    runningVps: number;
  }>;
}

export class DatabaseStorage implements IStorage {
  // Users
  async getUser(id: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username)).limit(1);
    return result[0];
  }

  async createUser(userData: InsertUser & { role?: string; registrationIp?: string }): Promise<User> {
    const hashedPassword = await bcrypt.hash(userData.password, 10);
    const result = await db.insert(users).values({
      username: userData.username,
      email: userData.email,
      password: hashedPassword,
      role: userData.role || "customer",
      registrationIp: userData.registrationIp || null,
    }).returning();
    return result[0];
  }

  async getAllUsers(): Promise<User[]> {
    return db.select().from(users).orderBy(desc(users.createdAt));
  }

  async updateUserStatus(userId: string, status: string, suspendedUntil?: Date | null): Promise<void> {
    await db.update(users).set({ 
      status, 
      suspendedUntil: suspendedUntil !== undefined ? suspendedUntil : (status === "active" ? null : undefined)
    }).where(eq(users.id, userId));
  }

  async updateUserEmail(userId: string, email: string): Promise<void> {
    await db.update(users).set({ email }).where(eq(users.id, userId));
  }

  async deleteUser(userId: string): Promise<void> {
    await db.delete(users).where(eq(users.id, userId));
  }

  async updateUserBalance(userId: string, balance: string): Promise<void> {
    await db.update(users).set({ balance }).where(eq(users.id, userId));
  }

  // Sessions
  async createSession(userId: string, hashedToken: string): Promise<void> {
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    await db.insert(sessions).values({ userId, token: hashedToken, expiresAt });
  }

  async getSessionUser(token: string): Promise<User | undefined> {
    const result = await db
      .select({ user: users })
      .from(sessions)
      .innerJoin(users, eq(sessions.userId, users.id))
      .where(and(
        eq(sessions.token, token),
        sql`${sessions.expiresAt} > NOW()`
      ))
      .limit(1);
    return result[0]?.user;
  }

  async deleteSession(token: string): Promise<void> {
    await db.delete(sessions).where(eq(sessions.token, token));
  }

  // Orders
  async createOrder(order: InsertOrder): Promise<Order> {
    const result = await db.insert(orders).values(order).returning();
    return result[0];
  }

  async getOrderById(id: string): Promise<Order | undefined> {
    const result = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
    return result[0];
  }

  async getOrderByOnedashId(onedashOrderId: number): Promise<Order | undefined> {
    const result = await db.select().from(orders).where(eq(orders.onedashOrderId, onedashOrderId)).limit(1);
    return result[0];
  }

  async getOrdersByUserId(userId: string): Promise<Order[]> {
    return db.select().from(orders).where(eq(orders.userId, userId)).orderBy(desc(orders.createdAt));
  }

  async getAllOrders(): Promise<Order[]> {
    return db.select().from(orders).orderBy(desc(orders.createdAt));
  }

  async updateOrder(id: string, data: Partial<Order>): Promise<void> {
    await db.update(orders).set(data).where(eq(orders.id, id));
  }

  // VPS Instances
  async createVpsInstance(vps: InsertVps): Promise<VpsInstance> {
    const result = await db.insert(vpsInstances).values(vps).returning();
    return result[0];
  }

  async getVpsById(id: string): Promise<VpsInstance | undefined> {
    const result = await db.select().from(vpsInstances).where(eq(vpsInstances.id, id)).limit(1);
    return result[0];
  }

  async getVpsByUserId(userId: string): Promise<VpsInstance[]> {
    return db.select().from(vpsInstances).where(eq(vpsInstances.userId, userId)).orderBy(desc(vpsInstances.createdAt));
  }

  async getVpsByOrderId(orderId: string): Promise<VpsInstance[]> {
    return db.select().from(vpsInstances).where(eq(vpsInstances.orderId, orderId));
  }

  async getVpsByOnedashId(onedashVpsId: number): Promise<VpsInstance | undefined> {
    const result = await db.select().from(vpsInstances).where(eq(vpsInstances.onedashVpsId, onedashVpsId)).limit(1);
    return result[0];
  }

  async getAllVps(): Promise<VpsInstance[]> {
    return db.select().from(vpsInstances).orderBy(desc(vpsInstances.createdAt));
  }

  async updateVps(id: string, data: Partial<VpsInstance>): Promise<void> {
    await db.update(vpsInstances).set(data).where(eq(vpsInstances.id, id));
  }

  // Pricing Rules
  async createPricingRule(rule: InsertPricingRule): Promise<PricingRule> {
    const result = await db.insert(pricingRules).values(rule).returning();
    return result[0];
  }

  async getPricingRules(): Promise<PricingRule[]> {
    return db.select().from(pricingRules).orderBy(desc(pricingRules.createdAt));
  }

  async getPricingRule(tariffId: number, location: string): Promise<PricingRule | undefined> {
    const result = await db.select().from(pricingRules)
      .where(and(
        eq(pricingRules.tariffId, tariffId),
        eq(pricingRules.location, location)
      ))
      .limit(1);
    return result[0];
  }

  async updatePricingRule(id: string, data: Partial<PricingRule>): Promise<void> {
    await db.update(pricingRules).set({ ...data, updatedAt: new Date() }).where(eq(pricingRules.id, id));
  }

  async deletePricingRule(id: string): Promise<void> {
    await db.delete(pricingRules).where(eq(pricingRules.id, id));
  }

  // Stats
  async getUserStats(userId: string): Promise<{
    balance: number;
    activeVps: number;
    totalOrders: number;
    pendingOrders: number;
  }> {
    const user = await this.getUser(userId);
    const userOrders = await this.getOrdersByUserId(userId);
    const userVps = await this.getVpsByUserId(userId);

    return {
      balance: parseFloat(user?.balance?.toString() || "0"),
      activeVps: userVps.filter(v => v.status === "runned").length,
      totalOrders: userOrders.length,
      pendingOrders: userOrders.filter(o => o.status === "pending").length,
    };
  }

  async getAdminStats(): Promise<{
    totalUsers: number;
    activeUsers: number;
    totalOrders: number;
    activeOrders: number;
    totalVps: number;
    runningVps: number;
  }> {
    const allUsers = await this.getAllUsers();
    const allOrders = await this.getAllOrders();
    const allVps = await this.getAllVps();

    return {
      totalUsers: allUsers.length,
      activeUsers: allUsers.filter(u => u.status === "active").length,
      totalOrders: allOrders.length,
      activeOrders: allOrders.filter(o => o.status === "active").length,
      totalVps: allVps.length,
      runningVps: allVps.filter(v => v.status === "runned").length,
    };
  }

  // Transactions
  async createTransaction(transaction: InsertTransaction): Promise<Transaction> {
    const result = await db.insert(transactions).values(transaction).returning();
    return result[0];
  }

  async getTransactionById(id: string): Promise<Transaction | undefined> {
    const result = await db.select().from(transactions).where(eq(transactions.id, id)).limit(1);
    return result[0];
  }

  async getTransactionByExternalId(externalId: string): Promise<Transaction | undefined> {
    const result = await db.select().from(transactions).where(eq(transactions.externalId, externalId)).limit(1);
    return result[0];
  }

  async getTransactionsByUserId(userId: string): Promise<Transaction[]> {
    return db.select().from(transactions).where(eq(transactions.userId, userId)).orderBy(desc(transactions.createdAt));
  }

  async updateTransaction(id: string, data: Partial<Transaction>): Promise<void> {
    await db.update(transactions).set({ ...data, updatedAt: new Date() }).where(eq(transactions.id, id));
  }

  async addToUserBalance(userId: string, amount: number): Promise<void> {
    const user = await this.getUser(userId);
    if (user) {
      const currentBalance = parseFloat(user.balance?.toString() || "0");
      const newBalance = (currentBalance + amount).toFixed(2);
      await this.updateUserBalance(userId, newBalance);
    }
  }

  // Platform Settings
  async getSetting(key: string): Promise<string | null> {
    try {
      const result = await db.select().from(platformSettings).where(eq(platformSettings.key, key)).limit(1);
      return result[0]?.value || null;
    } catch (error) {
      console.error("getSetting error:", error);
      return null;
    }
  }

  async getAllSettings(): Promise<PlatformSetting[]> {
    return db.select().from(platformSettings);
  }

  async upsertSetting(key: string, value: string, description?: string): Promise<void> {
    try {
      const existing = await db.select().from(platformSettings).where(eq(platformSettings.key, key)).limit(1);
      
      if (existing && existing.length > 0) {
        await db.update(platformSettings)
          .set({ value, description, updatedAt: new Date() })
          .where(eq(platformSettings.key, key));
      } else {
        await db.insert(platformSettings).values({ key, value, description });
      }
    } catch (error) {
      console.error("upsertSetting error:", error);
      throw error;
    }
  }

  async deleteSetting(key: string): Promise<void> {
    await db.delete(platformSettings).where(eq(platformSettings.key, key));
  }
}

export const storage = new DatabaseStorage();
