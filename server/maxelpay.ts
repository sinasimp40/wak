import { createCipheriv } from "crypto";
import { storage } from "./storage";

const MAXELPAY_API_URL_PROD = "https://api.maxelpay.com/v1/prod/merchant/order/checkout";
const MAXELPAY_API_URL_STAGING = "https://api.maxelpay.com/v1/stg/merchant/order/checkout";

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

  private async isTestMode(): Promise<boolean> {
    const testMode = await storage.getSetting("MAXELPAY_TEST_MODE");
    return testMode === "true";
  }

  private async encryptPayload(payload: string, secretKey: string): Promise<string> {
    const key = Buffer.from(secretKey, 'utf8');
    const iv = Buffer.from(secretKey.substring(0, 16), 'utf8');
    
    const cipher = createCipheriv('aes-256-cbc', key, iv);
    let encrypted = cipher.update(payload, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    
    return encrypted;
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
    const apiKey = await this.getApiKey();
    const apiSecret = await this.getApiSecret();
    const isTestMode = await this.isTestMode();
    
    const apiUrl = isTestMode ? MAXELPAY_API_URL_STAGING : MAXELPAY_API_URL_PROD;

    try {
      const encryptedPayload = await this.encryptPayload(payloadString, apiSecret);
      
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "api-key": apiKey,
        },
        body: JSON.stringify({ data: encryptedPayload }),
      });

      const contentType = response.headers.get("content-type") || "";
      
      if (!contentType.includes("application/json")) {
        const text = await response.text();
        console.error("MaxelPay returned non-JSON response:", text.substring(0, 500));
        return {
          success: false,
          error: `Payment provider returned an error (status ${response.status}). Please check API credentials in Admin Settings.`,
        };
      }

      const data = await response.json();

      if (!response.ok) {
        console.error("MaxelPay error response:", data);
        return {
          success: false,
          error: data.message || data.error || `Payment provider error (status ${response.status})`,
        };
      }

      if (data.success && data.paymentUrl) {
        return {
          success: true,
          paymentUrl: data.paymentUrl,
        };
      }

      if (data.url || data.payment_url || data.checkout_url) {
        return {
          success: true,
          paymentUrl: data.url || data.payment_url || data.checkout_url,
        };
      }

      return {
        success: false,
        error: data.message || data.error || "Failed to create payment",
      };
    } catch (error: any) {
      console.error("MaxelPay error:", error);
      return {
        success: false,
        error: error.message || "Payment service unavailable",
      };
    }
  }

  async verifyWebhook(payload: string, signature: string): Promise<boolean> {
    return true;
  }
}

export const maxelpayService = new MaxelPayService();
