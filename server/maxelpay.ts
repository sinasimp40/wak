import { createHash, createHmac } from "crypto";
import { storage } from "./storage";

const MAXELPAY_API_URL = "https://api.maxelpay.com/api/v1";

interface PaymentPayload {
  orderID: string;
  amount: string;
  currency: string;
  timestamp: number;
  userName: string;
  siteName: string;
  userEmail: string;
  redirectUrl: string;
  websiteUrl: string;
  cancelUrl: string;
  webhookUrl: string;
}

interface PaymentResponse {
  success: boolean;
  paymentUrl?: string;
  error?: string;
}

class MaxelPayService {
  private async getApiKey(): Promise<string> {
    const dbKey = await storage.getSetting("MAXELPAY_API_KEY");
    const apiKey = dbKey || process.env.MAXELPAY_API_KEY;
    if (!apiKey) {
      throw new Error("MaxelPay API key not configured. Please set it in Admin Settings.");
    }
    return apiKey;
  }

  private async getApiSecret(): Promise<string> {
    const dbSecret = await storage.getSetting("MAXELPAY_API_SECRET");
    const apiSecret = dbSecret || process.env.MAXELPAY_API_SECRET;
    if (!apiSecret) {
      throw new Error("MaxelPay API secret not configured. Please set it in Admin Settings.");
    }
    return apiSecret;
  }

  private async generateSignature(payload: string): Promise<string> {
    const secret = await this.getApiSecret();
    return createHmac("sha256", secret)
      .update(payload)
      .digest("hex");
  }

  async createPayment(params: {
    orderId: string;
    amount: number;
    currency: string;
    userName: string;
    userEmail: string;
    baseUrl: string;
  }): Promise<PaymentResponse> {
    const payload: PaymentPayload = {
      orderID: params.orderId,
      amount: params.amount.toString(),
      currency: params.currency,
      timestamp: Math.floor(Date.now() / 1000),
      userName: params.userName,
      siteName: "RDP Panel",
      userEmail: params.userEmail,
      redirectUrl: `${params.baseUrl}/dashboard?payment=success`,
      websiteUrl: params.baseUrl,
      cancelUrl: `${params.baseUrl}/dashboard?payment=cancelled`,
      webhookUrl: `${params.baseUrl}/api/payments/webhook`,
    };

    const payloadString = JSON.stringify(payload);
    const signature = await this.generateSignature(payloadString);
    const apiKey = await this.getApiKey();

    try {
      const response = await fetch(`${MAXELPAY_API_URL}/payment/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": apiKey,
          "X-Signature": signature,
        },
        body: payloadString,
      });

      const data = await response.json();

      if (data.success && data.paymentUrl) {
        return {
          success: true,
          paymentUrl: data.paymentUrl,
        };
      }

      return {
        success: false,
        error: data.message || "Failed to create payment",
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Payment service unavailable",
      };
    }
  }

  async verifyWebhook(payload: string, signature: string): Promise<boolean> {
    const expectedSignature = await this.generateSignature(payload);
    return expectedSignature === signature;
  }
}

export const maxelpayService = new MaxelPayService();
