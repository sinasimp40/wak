import { storage } from "./storage";
import crypto from "crypto";

const NOWPAYMENTS_API_URL = "https://api.nowpayments.io/v1";
const NOWPAYMENTS_SANDBOX_URL = "https://api-sandbox.nowpayments.io/v1";

interface PaymentResponse {
  success: boolean;
  paymentUrl?: string;
  paymentId?: string;
  payAddress?: string;
  payAmount?: number;
  payCurrency?: string;
  error?: string;
}

interface DirectPaymentResponse {
  success: boolean;
  paymentId?: string;
  payAddress?: string;
  payAmount?: string;
  payCurrency?: string;
  expiresAt?: string;
  qrCodeUrl?: string;
  status?: string;
  error?: string;
}

interface NowPaymentsCreateResponse {
  payment_id: string;
  payment_status: string;
  pay_address: string;
  price_amount: number;
  price_currency: string;
  pay_amount: number;
  pay_currency: string;
  order_id: string;
  order_description: string;
  purchase_id: string;
  created_at: string;
  updated_at: string;
  expiration_estimate_date: string;
  invoice_url?: string;
}

class NowPaymentsService {
  private async getApiKey(): Promise<string> {
    const dbKey = await storage.getSetting("NOWPAYMENTS_API_KEY");
    const apiKey = dbKey || process.env.NOWPAYMENTS_API_KEY;
    if (!apiKey) {
      throw new Error("NOWPayments API key not configured. Please set it in Admin Settings.");
    }
    return apiKey;
  }

  private async isTestMode(): Promise<boolean> {
    const testMode = await storage.getSetting("NOWPAYMENTS_TEST_MODE");
    return testMode === "true";
  }

  private async getApiUrl(): Promise<string> {
    const isTest = await this.isTestMode();
    return isTest ? NOWPAYMENTS_SANDBOX_URL : NOWPAYMENTS_API_URL;
  }

  async createPayment(params: {
    orderId: string;
    amount: number;
    currency: string;
    userName: string;
    userEmail: string;
    baseUrl: string;
  }): Promise<PaymentResponse> {
    const apiKey = await this.getApiKey();
    const apiUrl = await this.getApiUrl();

    try {
      const response = await fetch(`${apiUrl}/invoice`, {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          price_amount: params.amount,
          price_currency: params.currency.toLowerCase(),
          order_id: params.orderId,
          order_description: `Balance top-up for ${params.userName}`,
          ipn_callback_url: `${params.baseUrl}/api/payments/webhook`,
          success_url: `${params.baseUrl}/dashboard?payment=success`,
          cancel_url: `${params.baseUrl}/dashboard?payment=cancelled`,
        }),
      });

      const contentType = response.headers.get("content-type") || "";
      
      if (!contentType.includes("application/json")) {
        const text = await response.text();
        console.error("NOWPayments returned non-JSON response:", text.substring(0, 500));
        return {
          success: false,
          error: `Payment provider returned an error (status ${response.status}). Please check API credentials in Admin Settings.`,
        };
      }

      const data = await response.json();
      console.log("NOWPayments response status:", response.status);
      console.log("NOWPayments response data:", JSON.stringify(data, null, 2));

      if (!response.ok) {
        console.error("NOWPayments error response:", data);
        return {
          success: false,
          error: data.message || data.error || `Payment provider error (status ${response.status})`,
        };
      }

      if (data.invoice_url) {
        return {
          success: true,
          paymentUrl: data.invoice_url,
          paymentId: data.id,
        };
      }

      return {
        success: false,
        error: data.message || data.error || "Failed to create payment - no invoice URL returned",
      };
    } catch (error: any) {
      console.error("NOWPayments error:", error);
      return {
        success: false,
        error: error.message || "Payment service unavailable",
      };
    }
  }

  async getAvailableCurrencies(): Promise<string[]> {
    try {
      const apiKey = await this.getApiKey();
      const apiUrl = await this.getApiUrl();

      const response = await fetch(`${apiUrl}/currencies`, {
        method: "GET",
        headers: {
          "x-api-key": apiKey,
        },
      });

      if (!response.ok) {
        return ["btc", "eth", "ltc", "usdt", "trx"];
      }

      const data = await response.json();
      return data.currencies || ["btc", "eth", "ltc", "usdt", "trx"];
    } catch (error) {
      console.error("Error fetching currencies:", error);
      return ["btc", "eth", "ltc", "usdt", "trx"];
    }
  }

  async getMinimumPaymentAmount(payCurrency: string, priceCurrency: string = "usd"): Promise<number> {
    try {
      const apiKey = await this.getApiKey();
      const apiUrl = await this.getApiUrl();

      const response = await fetch(`${apiUrl}/min-amount?currency_from=${payCurrency}&currency_to=${priceCurrency}`, {
        method: "GET",
        headers: {
          "x-api-key": apiKey,
        },
      });

      if (!response.ok) {
        return 0;
      }

      const data = await response.json();
      return data.min_amount || 0;
    } catch (error) {
      return 0;
    }
  }

  async createDirectPayment(params: {
    orderId: string;
    amount: number;
    currency: string;
    payCurrency: string;
    baseUrl: string;
  }): Promise<DirectPaymentResponse> {
    const apiKey = await this.getApiKey();
    const apiUrl = await this.getApiUrl();

    try {
      const response = await fetch(`${apiUrl}/payment`, {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          price_amount: params.amount,
          price_currency: params.currency.toLowerCase(),
          pay_currency: params.payCurrency.toLowerCase(),
          order_id: params.orderId,
          order_description: `Balance top-up - $${params.amount}`,
          ipn_callback_url: `${params.baseUrl}/api/payments/webhook`,
        }),
      });

      const contentType = response.headers.get("content-type") || "";
      
      if (!contentType.includes("application/json")) {
        const text = await response.text();
        console.error("NOWPayments returned non-JSON response:", text.substring(0, 500));
        return {
          success: false,
          error: `Payment provider returned an error (status ${response.status}). Please check API credentials.`,
        };
      }

      const data = await response.json();
      console.log("NOWPayments direct payment response:", JSON.stringify(data, null, 2));

      if (!response.ok) {
        console.error("NOWPayments error response:", data);
        return {
          success: false,
          error: data.message || data.error || `Payment provider error (status ${response.status})`,
        };
      }

      if (data.pay_address) {
        const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(data.pay_address)}`;
        
        return {
          success: true,
          paymentId: data.payment_id,
          payAddress: data.pay_address,
          payAmount: String(data.pay_amount),
          payCurrency: data.pay_currency,
          expiresAt: data.expiration_estimate_date,
          qrCodeUrl,
          status: data.payment_status,
        };
      }

      return {
        success: false,
        error: data.message || data.error || "Failed to create payment - no payment address returned",
      };
    } catch (error: any) {
      console.error("NOWPayments direct payment error:", error);
      return {
        success: false,
        error: error.message || "Payment service unavailable",
      };
    }
  }

  async getPaymentStatusFull(paymentId: string): Promise<{ status: string; payAddress?: string; payAmount?: string; payCurrency?: string } | null> {
    try {
      const apiKey = await this.getApiKey();
      const apiUrl = await this.getApiUrl();

      const response = await fetch(`${apiUrl}/payment/${paymentId}`, {
        method: "GET",
        headers: {
          "x-api-key": apiKey,
        },
      });

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      return {
        status: data.payment_status,
        payAddress: data.pay_address,
        payAmount: String(data.pay_amount),
        payCurrency: data.pay_currency,
      };
    } catch (error) {
      console.error("Error checking payment status:", error);
      return null;
    }
  }

  private sortObjectKeys(obj: any): any {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }
    if (Array.isArray(obj)) {
      return obj.map(item => this.sortObjectKeys(item));
    }
    const sortedKeys = Object.keys(obj).sort();
    const result: Record<string, any> = {};
    for (const key of sortedKeys) {
      result[key] = this.sortObjectKeys(obj[key]);
    }
    return result;
  }

  async verifyWebhook(payload: any, signature: string): Promise<boolean> {
    try {
      const ipnSecret = await storage.getSetting("NOWPAYMENTS_IPN_SECRET");
      if (!ipnSecret) {
        console.warn("NOWPayments IPN Secret not configured. Skipping signature verification.");
        return true;
      }

      if (!signature) {
        console.error("No signature provided in webhook request");
        return false;
      }

      const sortedPayload = this.sortObjectKeys(payload);
      const payloadString = JSON.stringify(sortedPayload);
      const calculatedSignature = crypto
        .createHmac("sha512", ipnSecret)
        .update(payloadString)
        .digest("hex");

      return calculatedSignature === signature;
    } catch (error) {
      console.error("Webhook verification error:", error);
      return false;
    }
  }

  async getPaymentStatus(paymentId: string): Promise<string | null> {
    try {
      const apiKey = await this.getApiKey();
      const apiUrl = await this.getApiUrl();

      const response = await fetch(`${apiUrl}/payment/${paymentId}`, {
        method: "GET",
        headers: {
          "x-api-key": apiKey,
        },
      });

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      return data.payment_status;
    } catch (error) {
      console.error("Error checking payment status:", error);
      return null;
    }
  }
}

export const nowpaymentsService = new NowPaymentsService();
