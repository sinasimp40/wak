import type { Express, Request, Response, NextFunction } from "express";
import { type Server } from "http";
import { storage } from "./storage";
import { onedashService } from "./onedash";
import { maxelpayService } from "./maxelpay";
import { insertUserSchema, loginSchema, createVpsRequestSchema } from "@shared/schema";
import bcrypt from "bcryptjs";
import { randomBytes, createHash } from "crypto";
import { z } from "zod";

const createPaymentSchema = z.object({
  amount: z.number().positive().min(1, "Amount must be at least 1"),
  currency: z.string().default("USD"),
});

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: any;
      cookies?: Record<string, string>;
    }
  }
}

// Hash session token for secure storage
function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

// Generate secure session token
function generateSecureToken(): string {
  return randomBytes(48).toString("hex");
}

// Cookie configuration
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

// Auth middleware - validates session and sets user
async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.session_token;
  if (!token) {
    return res.status(401).json({ message: "Authentication required" });
  }

  try {
    const hashedToken = hashToken(token);
    const user = await storage.getSessionUser(hashedToken);
    if (!user) {
      res.clearCookie("session_token", { path: "/" });
      return res.status(401).json({ message: "Invalid or expired session" });
    }

    if (user.status === "suspended") {
      return res.status(403).json({ message: "Account suspended" });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(500).json({ message: "Session validation error" });
  }
}

// Admin middleware - must be called after requireAuth
function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ message: "Admin access required" });
  }
  next();
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Cookie parser middleware
  app.use((req, _res, next) => {
    const cookies: Record<string, string> = {};
    const cookieHeader = req.headers.cookie;
    if (cookieHeader) {
      cookieHeader.split(";").forEach((cookie) => {
        const parts = cookie.split("=");
        const name = parts[0]?.trim();
        const value = parts.slice(1).join("=").trim();
        if (name) {
          cookies[name] = value;
        }
      });
    }
    req.cookies = cookies;
    next();
  });

  // ============ AUTH ROUTES ============
  app.post("/api/auth/register", async (req, res) => {
    try {
      const parsed = insertUserSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0].message });
      }

      const existingEmail = await storage.getUserByEmail(parsed.data.email);
      if (existingEmail) {
        return res.status(400).json({ message: "Email already registered" });
      }

      const existingUsername = await storage.getUserByUsername(parsed.data.username);
      if (existingUsername) {
        return res.status(400).json({ message: "Username already taken" });
      }

      const user = await storage.createUser(parsed.data);
      
      // Generate secure token, store hash
      const rawToken = generateSecureToken();
      const hashedToken = hashToken(rawToken);
      await storage.createSession(user.id, hashedToken);

      res.cookie("session_token", rawToken, COOKIE_OPTIONS);

      const { password: _, ...userWithoutPassword } = user;
      res.json({ user: userWithoutPassword });
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Registration failed" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const parsed = loginSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0].message });
      }

      const user = await storage.getUserByEmail(parsed.data.email);
      if (!user) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      const validPassword = await bcrypt.compare(parsed.data.password, user.password);
      if (!validPassword) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      if (user.status === "suspended") {
        return res.status(403).json({ message: "Account suspended" });
      }

      // Generate secure token, store hash
      const rawToken = generateSecureToken();
      const hashedToken = hashToken(rawToken);
      await storage.createSession(user.id, hashedToken);

      res.cookie("session_token", rawToken, COOKIE_OPTIONS);

      const { password: _, ...userWithoutPassword } = user;
      res.json({ user: userWithoutPassword });
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Login failed" });
    }
  });

  app.get("/api/auth/me", requireAuth, async (req, res) => {
    const { password: _, ...userWithoutPassword } = req.user;
    res.json({ user: userWithoutPassword });
  });

  app.post("/api/auth/logout", async (req, res) => {
    const token = req.cookies?.session_token;
    if (token) {
      const hashedToken = hashToken(token);
      await storage.deleteSession(hashedToken);
    }
    res.clearCookie("session_token", { path: "/", httpOnly: true });
    res.json({ success: true });
  });

  // ============ PUBLIC ROUTES ============
  app.get("/api/systems", async (req, res) => {
    try {
      const systems = await onedashService.getSystemsList();
      res.json(systems);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to fetch systems" });
    }
  });

  app.get("/api/tariffs", async (req, res) => {
    try {
      const tariffs = await onedashService.getTariffs();
      res.json(tariffs);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to fetch tariffs" });
    }
  });

  // ============ CUSTOMER ROUTES ============
  app.get("/api/dashboard/stats", requireAuth, async (req, res) => {
    try {
      const stats = await storage.getUserStats(req.user.id);
      res.json(stats);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to fetch stats" });
    }
  });

  app.get("/api/vps", requireAuth, async (req, res) => {
    try {
      const vpsList = await storage.getVpsByUserId(req.user.id);
      const userOrders = await storage.getOrdersByUserId(req.user.id);
      
      const enrichedVps = vpsList.map((vps) => {
        const order = userOrders.find((o) => o.id === vps.orderId);
        return {
          ...vps,
          location: order?.location || "msk",
          tariffName: order?.tariffName || "Unknown",
          finishDate: order?.finishDate,
          daysRemaining: order?.finishDate 
            ? Math.ceil((new Date(order.finishDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
            : null,
        };
      });
      
      res.json(enrichedVps);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to fetch VPS" });
    }
  });

  app.post("/api/vps/:id/reboot", requireAuth, async (req, res) => {
    try {
      const vps = await storage.getVpsById(req.params.id);
      if (!vps || vps.userId !== req.user.id) {
        return res.status(404).json({ message: "VPS not found" });
      }

      if (vps.onedashVpsId) {
        await onedashService.rebootVps(vps.onedashVpsId);
      }

      await storage.updateVps(vps.id, { status: "not_runned" });
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to reboot VPS" });
    }
  });

  app.post("/api/vps/:id/reinstall", requireAuth, async (req, res) => {
    try {
      const vps = await storage.getVpsById(req.params.id);
      if (!vps || vps.userId !== req.user.id) {
        return res.status(404).json({ message: "VPS not found" });
      }

      const { system } = req.body;
      if (!system) {
        return res.status(400).json({ message: "System is required" });
      }

      if (vps.onedashVpsId) {
        await onedashService.reinstallSystem(vps.onedashVpsId, system);
      }

      await storage.updateVps(vps.id, { os: system, status: "not_runned" });
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to reinstall OS" });
    }
  });

  app.get("/api/orders", requireAuth, async (req, res) => {
    try {
      const ordersList = await storage.getOrdersByUserId(req.user.id);
      
      const enrichedOrders = await Promise.all(
        ordersList.map(async (order) => {
          const vpsList = await storage.getVpsByOrderId(order.id);
          return {
            ...order,
            daysRemaining: order.finishDate 
              ? Math.ceil((new Date(order.finishDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
              : null,
            vpsList: vpsList.map((vps) => ({
              id: vps.id,
              ipAddress: vps.ipAddress,
              status: vps.status,
              os: vps.os,
            })),
          };
        })
      );
      
      res.json(enrichedOrders);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to fetch orders" });
    }
  });

  app.post("/api/orders", requireAuth, async (req, res) => {
    try {
      const parsed = createVpsRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0].message });
      }

      const { tariffId, location, system, period, count, additionalOptions, processor } = parsed.data;

      // Get tariff info
      const tariffs = await onedashService.getTariffs();
      const tariff = tariffs.find((t) => t.id === tariffId);
      if (!tariff) {
        return res.status(400).json({ message: "Invalid tariff" });
      }

      // Calculate price
      const prices = location === "msk" ? tariff.msk_prices : tariff.ams_prices;
      const priceInfo = prices.find((p) => period >= p.period) || prices[0];
      const dailyRate = priceInfo.price / priceInfo.period;
      let totalPrice = dailyRate * period * count;
      
      // Apply markup if exists
      const pricingRule = await storage.getPricingRule(tariffId, location);
      if (pricingRule && pricingRule.isActive) {
        const markupValue = parseFloat(pricingRule.markupValue?.toString() || "0");
        if (pricingRule.markupType === "percentage") {
          totalPrice *= (1 + markupValue / 100);
        } else {
          totalPrice += markupValue * count;
        }
      }

      // Create order in database
      const order = await storage.createOrder({
        userId: req.user.id,
        tariffId,
        tariffName: tariff.name,
        location,
        period,
        count,
        totalPrice: totalPrice.toFixed(2),
      });

      // Try to create VPS via OneDash API
      try {
        const result = await onedashService.createVps({
          period,
          tariff_id: tariffId,
          location,
          system,
          count,
          additional_options: additionalOptions ? {
            static_ip: additionalOptions.staticIp,
            nvme: additionalOptions.nvme,
            backup: additionalOptions.backup,
          } : undefined,
          processor,
        });

        // Update order with OneDash order ID
        await storage.updateOrder(order.id, {
          onedashOrderId: result.order_id,
          status: "active",
          finishDate: new Date(Date.now() + period * 24 * 60 * 60 * 1000),
        });

        // Create VPS instances in database
        for (let i = 0; i < count; i++) {
          await storage.createVpsInstance({
            orderId: order.id,
            userId: req.user.id,
            os: system,
            status: "not_runned",
          });
        }

        res.json({ success: true, orderId: order.id });
      } catch (apiError: any) {
        // If API fails, keep order as pending
        await storage.updateOrder(order.id, { status: "pending" });
        
        // Still create placeholder VPS instances
        for (let i = 0; i < count; i++) {
          await storage.createVpsInstance({
            orderId: order.id,
            userId: req.user.id,
            os: system,
            status: "not_runned",
          });
        }

        res.json({ success: true, orderId: order.id, pending: true });
      }
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to create order" });
    }
  });

  app.post("/api/orders/:id/extend", requireAuth, async (req, res) => {
    try {
      const order = await storage.getOrderById(req.params.id);
      if (!order || order.userId !== req.user.id) {
        return res.status(404).json({ message: "Order not found" });
      }

      const { period } = req.body;
      if (!period || period < 7 || period > 360) {
        return res.status(400).json({ message: "Period must be between 7 and 360 days" });
      }

      if (order.onedashOrderId) {
        await onedashService.renewOrder(order.onedashOrderId, period);
      }

      const newFinishDate = new Date(
        (order.finishDate ? new Date(order.finishDate).getTime() : Date.now()) + period * 24 * 60 * 60 * 1000
      );
      await storage.updateOrder(order.id, { finishDate: newFinishDate });

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to extend order" });
    }
  });

  // ============ ADMIN ROUTES ============
  app.get("/api/admin/stats", requireAuth, requireAdmin, async (req, res) => {
    try {
      const stats = await storage.getAdminStats();
      const balance = await onedashService.getBalance().catch(() => ({ balance: 0 }));
      const recentOrders = await storage.getAllOrders();
      const allUsers = await storage.getAllUsers();

      const enrichedOrders = recentOrders.slice(0, 10).map((order) => {
        const user = allUsers.find((u) => u.id === order.userId);
        return {
          id: order.id,
          username: user?.username || "Unknown",
          tariffName: order.tariffName,
          totalPrice: order.totalPrice,
          status: order.status,
          createdAt: order.createdAt,
        };
      });

      res.json({
        ...stats,
        onedashBalance: balance.balance,
        recentOrders: enrichedOrders,
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to fetch admin stats" });
    }
  });

  app.get("/api/admin/users", requireAuth, requireAdmin, async (req, res) => {
    try {
      const allUsers = await storage.getAllUsers();
      const allOrders = await storage.getAllOrders();
      const allVps = await storage.getAllVps();

      const enrichedUsers = allUsers.map((user) => {
        const userOrders = allOrders.filter((o) => o.userId === user.id);
        const userVps = allVps.filter((v) => v.userId === user.id);
        return {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          status: user.status,
          balance: user.balance,
          ordersCount: userOrders.length,
          vpsCount: userVps.length,
          createdAt: user.createdAt,
        };
      });

      res.json(enrichedUsers);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to fetch users" });
    }
  });

  app.patch("/api/admin/users/:id/status", requireAuth, requireAdmin, async (req, res) => {
    try {
      const { status } = req.body;
      if (!["active", "suspended"].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }

      await storage.updateUserStatus(req.params.id, status);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to update user status" });
    }
  });

  app.delete("/api/admin/users/:id", requireAuth, requireAdmin, async (req, res) => {
    try {
      await storage.deleteUser(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to delete user" });
    }
  });

  app.get("/api/admin/orders", requireAuth, requireAdmin, async (req, res) => {
    try {
      const allOrders = await storage.getAllOrders();
      const allUsers = await storage.getAllUsers();

      const enrichedOrders = await Promise.all(
        allOrders.map(async (order) => {
          const user = allUsers.find((u) => u.id === order.userId);
          const vpsList = await storage.getVpsByOrderId(order.id);
          return {
            ...order,
            username: user?.username || "Unknown",
            email: user?.email || "",
            daysRemaining: order.finishDate
              ? Math.ceil((new Date(order.finishDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
              : null,
            vpsList: vpsList.map((vps) => ({
              id: vps.id,
              ipAddress: vps.ipAddress,
              status: vps.status,
              os: vps.os,
            })),
          };
        })
      );

      res.json(enrichedOrders);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to fetch orders" });
    }
  });

  app.get("/api/admin/pricing", requireAuth, requireAdmin, async (req, res) => {
    try {
      const rules = await storage.getPricingRules();
      res.json(rules);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to fetch pricing rules" });
    }
  });

  app.post("/api/admin/pricing", requireAuth, requireAdmin, async (req, res) => {
    try {
      const { tariffId, location, markupType, markupValue } = req.body;
      
      // Check if rule already exists
      const existing = await storage.getPricingRule(tariffId, location);
      if (existing) {
        return res.status(400).json({ message: "Pricing rule already exists for this tariff and location" });
      }

      const rule = await storage.createPricingRule({
        tariffId,
        location,
        markupType,
        markupValue,
        isActive: true,
      });

      res.json(rule);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to create pricing rule" });
    }
  });

  app.patch("/api/admin/pricing/:id", requireAuth, requireAdmin, async (req, res) => {
    try {
      const { isActive, markupValue } = req.body;
      await storage.updatePricingRule(req.params.id, { isActive, markupValue });
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to update pricing rule" });
    }
  });

  app.get("/api/admin/health", requireAuth, requireAdmin, async (req, res) => {
    try {
      const connected = await onedashService.testConnection();
      
      if (connected) {
        const balance = await onedashService.getBalance();
        res.json({
          status: "connected",
          balance: balance.balance,
          currency: balance.currency,
          lastChecked: new Date().toISOString(),
        });
      } else {
        res.json({
          status: "error",
          balance: null,
          currency: null,
          lastChecked: new Date().toISOString(),
        });
      }
    } catch (error: any) {
      res.json({
        status: "error",
        balance: null,
        currency: null,
        lastChecked: new Date().toISOString(),
      });
    }
  });

  app.get("/api/admin/api-keys-status", requireAuth, requireAdmin, async (req, res) => {
    try {
      res.json({
        onedash: {
          configured: !!process.env.ONEDASH_API_KEY,
          keyPreview: process.env.ONEDASH_API_KEY 
            ? `${process.env.ONEDASH_API_KEY.substring(0, 4)}...${process.env.ONEDASH_API_KEY.slice(-4)}`
            : null,
        },
        maxelpay: {
          apiKeyConfigured: !!process.env.MAXELPAY_API_KEY,
          secretConfigured: !!process.env.MAXELPAY_API_SECRET,
          keyPreview: process.env.MAXELPAY_API_KEY
            ? `${process.env.MAXELPAY_API_KEY.substring(0, 4)}...${process.env.MAXELPAY_API_KEY.slice(-4)}`
            : null,
        },
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to fetch API keys status" });
    }
  });

  // ============ ONEDASH VPS SYNC ============
  app.get("/api/admin/onedash/orders", requireAuth, requireAdmin, async (req, res) => {
    try {
      const orders = await onedashService.getAllOrders();
      res.json(orders);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to fetch OneDash orders" });
    }
  });

  app.post("/api/admin/sync-vps", requireAuth, requireAdmin, async (req, res) => {
    try {
      const onedashOrders = await onedashService.getAllOrders();
      let synced = 0;
      let updated = 0;

      for (const odOrder of onedashOrders) {
        const existingOrder = await storage.getOrderByOnedashId(odOrder.order_id);

        if (existingOrder) {
          const finishDate = odOrder.finish_time?.epoch 
            ? new Date(odOrder.finish_time.epoch * 1000)
            : null;
          
          await storage.updateOrder(existingOrder.id, {
            status: "active",
            finishDate,
          });

          if (odOrder.vps_list) {
            for (const vps of odOrder.vps_list) {
              const existingVps = await storage.getVpsByOnedashId(vps.id);
              
              if (existingVps) {
                await storage.updateVps(existingVps.id, {
                  ipAddress: vps.vps_ip,
                  status: vps.vps_status,
                  os: vps.os,
                });
                updated++;
              } else {
                const localVpsList = await storage.getVpsByOrderId(existingOrder.id);
                const unmatchedVps = localVpsList.find(v => !v.onedashVpsId);
                if (unmatchedVps) {
                  await storage.updateVps(unmatchedVps.id, {
                    onedashVpsId: vps.id,
                    ipAddress: vps.vps_ip,
                    status: vps.vps_status,
                    os: vps.os,
                  });
                  updated++;
                }
              }
            }
          }
          synced++;
        }
      }

      res.json({ 
        success: true, 
        synced,
        updated,
        totalOneDash: onedashOrders.length 
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to sync VPS data" });
    }
  });

  // ============ PAYMENT ROUTES ============
  app.post("/api/payments/create", requireAuth, async (req, res) => {
    try {
      const parsed = createPaymentSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0].message });
      }
      
      const { amount, currency } = parsed.data;

      const transaction = await storage.createTransaction({
        userId: req.user.id,
        type: "topup",
        amount: amount.toString(),
        currency,
        status: "pending",
        paymentMethod: "maxelpay",
      });

      const baseUrl = `${req.protocol}://${req.get("host")}`;
      
      const result = await maxelpayService.createPayment({
        orderId: transaction.id,
        amount,
        currency,
        userName: req.user.username,
        userEmail: req.user.email,
        baseUrl,
      });

      if (result.success && result.paymentUrl) {
        await storage.updateTransaction(transaction.id, {
          externalId: transaction.id,
        });
        res.json({ success: true, paymentUrl: result.paymentUrl, transactionId: transaction.id });
      } else {
        await storage.updateTransaction(transaction.id, { status: "failed" });
        res.status(400).json({ message: result.error || "Failed to create payment" });
      }
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Payment creation failed" });
    }
  });

  app.post("/api/payments/webhook", async (req, res) => {
    try {
      const signature = req.headers["x-signature"] as string;
      const payload = JSON.stringify(req.body);

      if (!maxelpayService.verifyWebhook(payload, signature || "")) {
        return res.status(400).json({ message: "Invalid signature" });
      }

      const { orderID, status, amount } = req.body;
      
      const transaction = await storage.getTransactionById(orderID);
      if (!transaction) {
        return res.status(404).json({ message: "Transaction not found" });
      }

      if (status === "completed" || status === "success") {
        await storage.updateTransaction(transaction.id, { status: "completed" });
        await storage.addToUserBalance(transaction.userId, parseFloat(amount || transaction.amount?.toString() || "0"));
      } else if (status === "failed" || status === "cancelled") {
        await storage.updateTransaction(transaction.id, { status: status });
      }

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Webhook processing failed" });
    }
  });

  app.get("/api/payments/transactions", requireAuth, async (req, res) => {
    try {
      const transactions = await storage.getTransactionsByUserId(req.user.id);
      res.json(transactions);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to fetch transactions" });
    }
  });

  // Admin: Manually add balance to user
  app.post("/api/admin/users/:id/balance", requireAuth, requireAdmin, async (req, res) => {
    try {
      const { amount } = req.body;
      if (!amount || isNaN(parseFloat(amount))) {
        return res.status(400).json({ message: "Valid amount is required" });
      }

      await storage.addToUserBalance(req.params.id, parseFloat(amount));
      
      await storage.createTransaction({
        userId: req.params.id,
        type: "topup",
        amount: amount.toString(),
        currency: "USD",
        status: "completed",
        paymentMethod: "manual",
      });

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to add balance" });
    }
  });

  return httpServer;
}
