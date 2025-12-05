import type { Express, Request, Response, NextFunction } from "express";
import { type Server } from "http";
import { storage } from "./storage";
import { onedashService } from "./onedash";
import { nowpaymentsService } from "./nowpayments";
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
      if (user.suspendedUntil) {
        const suspendedUntilDate = new Date(user.suspendedUntil);
        if (suspendedUntilDate <= new Date()) {
          await storage.updateUserStatus(user.id, "active", null);
          user.status = "active";
          user.suspendedUntil = null;
        } else {
          const daysRemaining = Math.ceil((suspendedUntilDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
          return res.status(403).json({ 
            message: `Account suspended until ${suspendedUntilDate.toLocaleDateString()}. ${daysRemaining} day(s) remaining.` 
          });
        }
      } else {
        return res.status(403).json({ message: "Account suspended permanently" });
      }
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

      const registrationIp = req.headers['x-forwarded-for']?.toString().split(',')[0] || req.socket.remoteAddress || null;
      const user = await storage.createUser({ ...parsed.data, registrationIp: registrationIp || undefined });
      
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
        if (user.suspendedUntil) {
          const suspendedUntilDate = new Date(user.suspendedUntil);
          if (suspendedUntilDate <= new Date()) {
            await storage.updateUserStatus(user.id, "active", null);
            user.status = "active";
            user.suspendedUntil = null;
          } else {
            const daysRemaining = Math.ceil((suspendedUntilDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
            return res.status(403).json({ 
              message: `Account suspended until ${suspendedUntilDate.toLocaleDateString()}. ${daysRemaining} day(s) remaining.` 
            });
          }
        } else {
          return res.status(403).json({ message: "Account suspended permanently" });
        }
      }

      // Generate secure token, store hash
      const rawToken = generateSecureToken();
      const hashedToken = hashToken(rawToken);
      await storage.createSession(user.id, hashedToken);

      // Log the login IP
      const loginIp = req.headers['x-forwarded-for']?.toString().split(',')[0] || req.socket.remoteAddress || 'unknown';
      const userAgent = req.headers['user-agent'] || undefined;
      await storage.createLoginLog(user.id, loginIp, userAgent);

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

  app.get("/api/vps/:id/credentials", requireAuth, async (req, res) => {
    try {
      const vps = await storage.getVpsById(req.params.id);
      if (!vps || vps.userId !== req.user.id) {
        return res.status(404).json({ message: "VPS not found" });
      }

      res.json({
        username: vps.rdpUsername || "Administrator",
        password: vps.rdpPassword || null,
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to get credentials" });
    }
  });

  app.patch("/api/vps/:id/credentials", requireAuth, async (req, res) => {
    try {
      const vps = await storage.getVpsById(req.params.id);
      if (!vps || vps.userId !== req.user.id) {
        return res.status(404).json({ message: "VPS not found" });
      }

      const { username, password } = req.body;
      
      const updates: { rdpUsername?: string; rdpPassword?: string } = {};
      if (username !== undefined) {
        updates.rdpUsername = username;
      }
      if (password !== undefined) {
        updates.rdpPassword = password;
      }

      await storage.updateVps(vps.id, updates);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to update credentials" });
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

      // Create order and deduct balance in a single transaction
      let order;
      try {
        const result = await storage.createOrderWithBalanceDeduction({
          userId: req.user.id,
          tariffId,
          tariffName: tariff.name,
          location,
          period,
          count,
          totalPrice: totalPrice.toFixed(2),
        }, totalPrice);
        order = result.order;
      } catch (txError: any) {
        if (txError.message === "Insufficient balance") {
          const freshUser = await storage.getUser(req.user.id);
          const userBalance = parseFloat(freshUser?.balance?.toString() || "0");
          return res.status(400).json({ 
            message: `Insufficient balance. You need $${totalPrice.toFixed(2)} but have $${userBalance.toFixed(2)}. Please add funds to your account.` 
          });
        }
        throw txError;
      }

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

        // Fetch the order info from OneDash to get VPS details including password
        try {
          const orderInfo = await onedashService.getOrderInfo(result.order_id);
          
          if (orderInfo.vps_list && orderInfo.vps_list.length > 0) {
            // Create VPS instances with data from OneDash
            for (const vps of orderInfo.vps_list) {
              await storage.createVpsInstance({
                orderId: order.id,
                userId: req.user.id,
                onedashVpsId: vps.id,
                os: vps.os || system,
                ipAddress: vps.vps_ip,
                status: vps.vps_status || "not_runned",
                rdpUsername: vps.vps_login || "Administrator",
                rdpPassword: vps.vps_password,
              });
            }
          } else {
            // Fallback: create placeholder VPS instances if OneDash doesn't return list immediately
            for (let i = 0; i < count; i++) {
              await storage.createVpsInstance({
                orderId: order.id,
                userId: req.user.id,
                os: system,
                status: "not_runned",
              });
            }
          }
        } catch (fetchError) {
          // If fetching order info fails, create placeholder VPS instances
          for (let i = 0; i < count; i++) {
            await storage.createVpsInstance({
              orderId: order.id,
              userId: req.user.id,
              os: system,
              status: "not_runned",
            });
          }
        }

        res.json({ success: true, orderId: order.id });
      } catch (apiError: any) {
        // If API fails, refund the balance and mark order as failed
        await storage.addToUserBalance(req.user.id, totalPrice);
        await storage.updateOrder(order.id, { status: "failed" });
        
        res.status(500).json({ 
          message: "Failed to create VPS with OneDash. Your balance has been refunded. Please try again later.",
          refunded: true
        });
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
      const balance = await onedashService.getBalance().catch((err) => {
        console.log("OneDash balance fetch error:", err.message);
        return { balance: 0, error: err.message };
      });
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

  app.get("/api/admin/balance", requireAuth, requireAdmin, async (req, res) => {
    try {
      const balance = await onedashService.getBalance();
      res.json({ 
        balance: balance.balance,
        currency: balance.currency || "USD",
        success: true,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      res.status(500).json({ 
        balance: null, 
        success: false, 
        error: error.message || "Failed to fetch OneDash balance" 
      });
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
          registrationIp: user.registrationIp,
          suspendedUntil: user.suspendedUntil,
          ordersCount: userOrders.length,
          vpsCount: userVps.length,
          vpsList: userVps.map((vps) => ({
            id: vps.id,
            onedashVpsId: vps.onedashVpsId,
            os: vps.os,
            ipAddress: vps.ipAddress,
            status: vps.status,
            createdAt: vps.createdAt,
          })),
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
      const { status, suspendedUntil } = req.body;
      if (!["active", "suspended"].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }

      let suspendedUntilDate: Date | null = null;
      if (status === "suspended" && suspendedUntil) {
        suspendedUntilDate = new Date(suspendedUntil);
      }

      await storage.updateUserStatus(req.params.id, status, suspendedUntilDate);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to update user status" });
    }
  });

  app.patch("/api/admin/users/:id/email", requireAuth, requireAdmin, async (req, res) => {
    try {
      const { email } = req.body;
      if (!email || typeof email !== "string" || !email.includes("@")) {
        return res.status(400).json({ message: "Valid email is required" });
      }

      const existingUser = await storage.getUserByEmail(email);
      if (existingUser && existingUser.id !== req.params.id) {
        return res.status(400).json({ message: "Email already in use" });
      }

      await storage.updateUserEmail(req.params.id, email);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to update user email" });
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

  app.patch("/api/admin/users/:id/password", requireAuth, requireAdmin, async (req, res) => {
    try {
      const { password } = req.body;
      if (!password || typeof password !== "string" || password.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      await storage.updateUserPassword(req.params.id, hashedPassword);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to update user password" });
    }
  });

  app.get("/api/admin/users/:id/login-logs", requireAuth, requireAdmin, async (req, res) => {
    try {
      const logs = await storage.getLoginLogsByUserId(req.params.id);
      res.json(logs);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to fetch login logs" });
    }
  });

  app.post("/api/admin/vps/:vpsId/reboot", requireAuth, requireAdmin, async (req, res) => {
    try {
      const vpsId = parseInt(req.params.vpsId);
      if (isNaN(vpsId)) {
        return res.status(400).json({ message: "Invalid VPS ID" });
      }
      await onedashService.rebootVps(vpsId);
      res.json({ success: true, message: "VPS reboot initiated" });
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to reboot VPS" });
    }
  });

  app.post("/api/admin/vps/:vpsId/reinstall", requireAuth, requireAdmin, async (req, res) => {
    try {
      const vpsId = parseInt(req.params.vpsId);
      const { system } = req.body;
      if (isNaN(vpsId)) {
        return res.status(400).json({ message: "Invalid VPS ID" });
      }
      if (!system) {
        return res.status(400).json({ message: "System is required" });
      }
      await onedashService.reinstallSystem(vpsId, system);
      res.json({ success: true, message: "VPS reinstall initiated" });
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to reinstall VPS" });
    }
  });

  app.get("/api/admin/vps/:vpsId/credentials", requireAuth, requireAdmin, async (req, res) => {
    try {
      const vpsId = parseInt(req.params.vpsId);
      if (isNaN(vpsId)) {
        return res.status(400).json({ message: "Invalid VPS ID" });
      }
      
      const vps = await storage.getVpsByOnedashId(vpsId);
      if (!vps) {
        return res.json({
          username: "Administrator",
          password: null,
          message: "VPS not linked to local database. Credentials not stored."
        });
      }

      res.json({
        username: vps.rdpUsername || "Administrator",
        password: vps.rdpPassword || null,
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to get VPS credentials" });
    }
  });

  app.patch("/api/admin/vps/:vpsId/credentials", requireAuth, requireAdmin, async (req, res) => {
    try {
      const vpsId = parseInt(req.params.vpsId);
      if (isNaN(vpsId)) {
        return res.status(400).json({ message: "Invalid VPS ID" });
      }
      
      const { username, password } = req.body;
      
      if (username !== undefined && (typeof username !== "string" || username.length > 100)) {
        return res.status(400).json({ message: "Invalid username format" });
      }
      if (password !== undefined && (typeof password !== "string" || password.length > 200)) {
        return res.status(400).json({ message: "Invalid password format" });
      }
      
      const vps = await storage.getVpsByOnedashId(vpsId);
      if (!vps) {
        return res.status(404).json({ message: "VPS not found in local database. Please sync first." });
      }

      const updates: { rdpUsername?: string; rdpPassword?: string } = {};
      if (username !== undefined) {
        updates.rdpUsername = username.trim();
      }
      if (password !== undefined) {
        updates.rdpPassword = password;
      }

      await storage.updateVps(vps.id, updates);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to update VPS credentials" });
    }
  });

  app.get("/api/admin/vps-local/:vpsId/credentials", requireAuth, requireAdmin, async (req, res) => {
    try {
      const vpsId = req.params.vpsId;
      const vps = await storage.getVpsById(vpsId);
      if (!vps) {
        return res.status(404).json({ message: "VPS not found" });
      }
      
      res.json({
        username: vps.rdpUsername || "Administrator",
        password: vps.rdpPassword || null,
        ipAddress: vps.ipAddress,
        onedashVpsId: vps.onedashVpsId,
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to get VPS credentials" });
    }
  });

  app.patch("/api/admin/vps-local/:vpsId/credentials", requireAuth, requireAdmin, async (req, res) => {
    try {
      const vpsId = req.params.vpsId;
      const { username, password } = req.body;
      
      if (username !== undefined && (typeof username !== "string" || username.length > 100)) {
        return res.status(400).json({ message: "Invalid username format" });
      }
      if (password !== undefined && (typeof password !== "string" || password.length > 200)) {
        return res.status(400).json({ message: "Invalid password format" });
      }
      
      const vps = await storage.getVpsById(vpsId);
      if (!vps) {
        return res.status(404).json({ message: "VPS not found" });
      }

      const updates: { rdpUsername?: string; rdpPassword?: string } = {};
      if (username !== undefined) {
        updates.rdpUsername = username.trim();
      }
      if (password !== undefined) {
        updates.rdpPassword = password;
      }

      await storage.updateVps(vpsId, updates);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to update VPS credentials" });
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
      const onedashKey = await storage.getSetting("ONEDASH_API_KEY") || process.env.ONEDASH_API_KEY;
      const nowpaymentsKey = await storage.getSetting("NOWPAYMENTS_API_KEY") || process.env.NOWPAYMENTS_API_KEY;

      res.json({
        onedash: {
          configured: !!onedashKey,
          keyPreview: onedashKey 
            ? `${onedashKey.substring(0, 4)}...${onedashKey.slice(-4)}`
            : null,
        },
        nowpayments: {
          configured: !!nowpaymentsKey,
          keyPreview: nowpaymentsKey
            ? `${nowpaymentsKey.substring(0, 4)}...${nowpaymentsKey.slice(-4)}`
            : null,
        },
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to fetch API keys status" });
    }
  });

  app.post("/api/admin/api-keys", requireAuth, requireAdmin, async (req, res) => {
    try {
      const { key, value } = req.body;
      
      const allowedKeys = ["ONEDASH_API_KEY", "NOWPAYMENTS_API_KEY"];
      if (!allowedKeys.includes(key)) {
        return res.status(400).json({ message: "Invalid setting key" });
      }
      
      if (!value || typeof value !== "string" || value.trim().length === 0) {
        return res.status(400).json({ message: "Value is required" });
      }

      await storage.upsertSetting(key, value.trim());
      res.json({ success: true, message: `${key} updated successfully` });
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to update API key" });
    }
  });

  app.delete("/api/admin/api-keys/:key", requireAuth, requireAdmin, async (req, res) => {
    try {
      const { key } = req.params;
      
      const allowedKeys = ["ONEDASH_API_KEY", "NOWPAYMENTS_API_KEY"];
      if (!allowedKeys.includes(key)) {
        return res.status(400).json({ message: "Invalid setting key" });
      }

      await storage.deleteSetting(key);
      res.json({ success: true, message: `${key} removed successfully` });
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to delete API key" });
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

  // Debug endpoint to see raw OneDash response
  app.get("/api/admin/onedash/debug/:orderId", requireAuth, requireAdmin, async (req, res) => {
    try {
      const orderId = parseInt(req.params.orderId);
      if (isNaN(orderId)) {
        return res.status(400).json({ message: "Invalid order ID" });
      }
      const rawResponse = await onedashService.getRawOrderInfo(orderId);
      res.json(rawResponse);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to fetch order info" });
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
              
              const updateData: any = {
                ipAddress: vps.vps_ip,
                status: vps.vps_status,
                os: vps.os,
              };
              
              // Store password and username from OneDash if provided
              if (vps.vps_password) {
                updateData.rdpPassword = vps.vps_password;
              }
              if (vps.vps_login) {
                updateData.rdpUsername = vps.vps_login;
              }
              
              if (existingVps) {
                await storage.updateVps(existingVps.id, updateData);
                updated++;
              } else {
                const localVpsList = await storage.getVpsByOrderId(existingOrder.id);
                const unmatchedVps = localVpsList.find(v => !v.onedashVpsId);
                if (unmatchedVps) {
                  await storage.updateVps(unmatchedVps.id, {
                    ...updateData,
                    onedashVpsId: vps.id,
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
        paymentMethod: "nowpayments",
      });

      const baseUrl = `${req.protocol}://${req.get("host")}`;
      
      const result = await nowpaymentsService.createPayment({
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
      const signature = req.headers["x-nowpayments-sig"] as string;

      if (!(await nowpaymentsService.verifyWebhook(req.body, signature || ""))) {
        return res.status(400).json({ message: "Invalid signature" });
      }

      const { order_id, payment_status, price_amount } = req.body;
      
      const transaction = await storage.getTransactionById(order_id);
      if (!transaction) {
        return res.status(404).json({ message: "Transaction not found" });
      }

      if (payment_status === "finished" || payment_status === "confirmed") {
        await storage.updateTransaction(transaction.id, { status: "completed" });
        await storage.addToUserBalance(transaction.userId, parseFloat(price_amount || transaction.amount?.toString() || "0"));
      } else if (payment_status === "failed" || payment_status === "expired" || payment_status === "refunded") {
        await storage.updateTransaction(transaction.id, { status: payment_status });
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

  app.get("/api/payments/currencies", requireAuth, async (req, res) => {
    try {
      const currencies = await nowpaymentsService.getAvailableCurrencies();
      res.json({ currencies });
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to fetch currencies" });
    }
  });

  app.post("/api/payments/create-direct", requireAuth, async (req, res) => {
    try {
      const parsed = createPaymentSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0].message });
      }

      const { amount, currency } = parsed.data;
      const payCurrency = req.body.payCurrency || "btc";

      const transaction = await storage.createTransaction({
        userId: req.user.id,
        type: "topup",
        amount: amount.toString(),
        currency,
        status: "pending",
        paymentMethod: "nowpayments",
      });

      const baseUrl = `${req.protocol}://${req.get("host")}`;
      
      const result = await nowpaymentsService.createDirectPayment({
        orderId: transaction.id,
        amount,
        currency,
        payCurrency,
        baseUrl,
      });

      if (result.success && result.payAddress) {
        await storage.updateTransaction(transaction.id, {
          externalId: result.paymentId || transaction.id,
        });
        res.json({
          paymentId: result.paymentId,
          payAddress: result.payAddress,
          payAmount: result.payAmount,
          payCurrency: result.payCurrency,
          expiresAt: result.expiresAt,
          qrCodeUrl: result.qrCodeUrl,
          status: result.status,
          transactionId: transaction.id,
        });
      } else {
        await storage.updateTransaction(transaction.id, { status: "failed" });
        res.status(400).json({ message: result.error || "Failed to create payment" });
      }
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Payment creation failed" });
    }
  });

  app.get("/api/payments/status/:paymentId", requireAuth, async (req, res) => {
    try {
      const result = await nowpaymentsService.getPaymentStatusFull(req.params.paymentId);
      if (!result) {
        return res.status(404).json({ message: "Payment not found" });
      }
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to check payment status" });
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

  // Admin: Get all transactions
  app.get("/api/admin/transactions", requireAuth, requireAdmin, async (req, res) => {
    try {
      const allTransactions = await storage.getAllTransactions();
      const allUsers = await storage.getAllUsers();

      const enrichedTransactions = allTransactions.map((tx) => {
        const user = allUsers.find((u) => u.id === tx.userId);
        return {
          ...tx,
          username: user?.username || "Unknown",
          email: user?.email || "",
        };
      });

      res.json(enrichedTransactions);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to fetch transactions" });
    }
  });

  // Admin: Get pending transactions
  app.get("/api/admin/transactions/pending", requireAuth, requireAdmin, async (req, res) => {
    try {
      const pendingTransactions = await storage.getPendingTransactions();
      const allUsers = await storage.getAllUsers();

      const enrichedTransactions = pendingTransactions.map((tx) => {
        const user = allUsers.find((u) => u.id === tx.userId);
        return {
          ...tx,
          username: user?.username || "Unknown",
          email: user?.email || "",
        };
      });

      res.json(enrichedTransactions);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to fetch pending transactions" });
    }
  });

  // Admin: Sync pending payments with NOWPayments (atomic and idempotent)
  app.post("/api/admin/payments/sync", requireAuth, requireAdmin, async (req, res) => {
    try {
      const pendingTransactions = await storage.getPendingTransactions();
      let synced = 0;
      let completed = 0;
      let failed = 0;
      const results: Array<{ id: string; status: string; message: string }> = [];

      const allowedCompletedStatuses = ["finished", "confirmed"];
      const allowedFailedStatuses = ["failed", "expired", "refunded"];

      for (const tx of pendingTransactions) {
        if (!tx.externalId) {
          results.push({ id: tx.id, status: "skipped", message: "No external payment ID" });
          continue;
        }

        try {
          const paymentStatus = await nowpaymentsService.getPaymentStatus(tx.externalId);
          synced++;

          if (paymentStatus && allowedCompletedStatuses.includes(paymentStatus)) {
            const result = await storage.updateTransactionStatusAtomic(tx.id, "completed", true);
            if (result.success && result.previousStatus !== "completed") {
              completed++;
              results.push({ id: tx.id, status: "completed", message: `Payment confirmed, balance added: $${tx.amount}` });
            } else {
              results.push({ id: tx.id, status: "skipped", message: result.message });
            }
          } else if (paymentStatus && allowedFailedStatuses.includes(paymentStatus)) {
            const result = await storage.updateTransactionStatusAtomic(tx.id, paymentStatus, false);
            if (result.success) {
              failed++;
              results.push({ id: tx.id, status: paymentStatus, message: `Payment ${paymentStatus}` });
            } else {
              results.push({ id: tx.id, status: "error", message: result.message });
            }
          } else {
            results.push({ id: tx.id, status: "pending", message: `Payment status: ${paymentStatus || "unknown"}` });
          }
        } catch (err: any) {
          results.push({ id: tx.id, status: "error", message: err.message || "Failed to check status" });
        }
      }

      res.json({
        success: true,
        total: pendingTransactions.length,
        synced,
        completed,
        failed,
        results,
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to sync payments" });
    }
  });

  // Admin: Manually complete a specific transaction (atomic and idempotent)
  app.post("/api/admin/transactions/:id/complete", requireAuth, requireAdmin, async (req, res) => {
    try {
      const result = await storage.completeTransactionWithBalance(req.params.id);
      
      if (!result.success) {
        return res.status(400).json({ message: result.message });
      }

      res.json({ success: true, message: result.message });
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to complete transaction" });
    }
  });

  // Admin: Check a specific transaction status from NOWPayments
  app.get("/api/admin/transactions/:id/check", requireAuth, requireAdmin, async (req, res) => {
    try {
      const tx = await storage.getTransactionById(req.params.id);
      if (!tx) {
        return res.status(404).json({ message: "Transaction not found" });
      }

      if (!tx.externalId) {
        return res.status(400).json({ message: "Transaction has no external payment ID" });
      }

      const result = await nowpaymentsService.getPaymentStatusFull(tx.externalId);
      if (!result) {
        return res.status(404).json({ message: "Payment not found in NOWPayments" });
      }

      res.json({
        transactionId: tx.id,
        externalId: tx.externalId,
        localStatus: tx.status,
        remoteStatus: result.status,
        payAddress: result.payAddress,
        payAmount: result.payAmount,
        payCurrency: result.payCurrency,
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to check transaction status" });
    }
  });

  return httpServer;
}
