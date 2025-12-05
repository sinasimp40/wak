import { storage } from "./storage";

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

  async verifyWebhook(payload: any, signature: string): Promise<boolean> {
    return true;
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
