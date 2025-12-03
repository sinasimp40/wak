import type { OneDashTariff, OneDashOrder, OneDashBalance } from "@shared/schema";

const ONEDASH_API_URL = "https://rdp-onedash.com/web-api";

class OneDashService {
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.ONEDASH_API_KEY || "";
  }

  private async request<T>(
    endpoint: string,
    method: "GET" | "POST" = "GET",
    body?: Record<string, any>
  ): Promise<T> {
    const response = await fetch(`${ONEDASH_API_URL}${endpoint}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        "Api-Key": this.apiKey,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = await response.json();
    
    if (!data.type) {
      throw new Error(data.error || "OneDash API request failed");
    }

    return data;
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await this.request<{ type: boolean }>("/test-request");
      return response.type === true;
    } catch {
      return false;
    }
  }

  async getBalance(): Promise<OneDashBalance> {
    const response = await this.request<{ type: boolean; data: OneDashBalance }>("/balance");
    return response.data;
  }

  async getSystemsList(): Promise<string[]> {
    const response = await this.request<{ type: boolean; data: string[] }>("/systems-list");
    return response.data;
  }

  async getTariffs(): Promise<OneDashTariff[]> {
    const response = await this.request<{ type: boolean; data: OneDashTariff[] }>("/tariffs");
    return response.data;
  }

  async getAllOrders(): Promise<OneDashOrder[]> {
    const response = await this.request<{ type: boolean; data: OneDashOrder[] }>("/all-orders");
    return response.data || [];
  }

  async getOrderInfo(orderId: number): Promise<OneDashOrder> {
    const response = await this.request<{ type: boolean; data: OneDashOrder }>("/order-info", "POST", {
      order_id: orderId,
    });
    return response.data;
  }

  async createVps(params: {
    period: number;
    tariff_id: number;
    location: "msk" | "ams";
    system: string;
    count: number;
    additional_options?: {
      static_ip?: boolean;
      nvme?: boolean;
      backup?: boolean;
    };
    processor?: "intel" | "amd";
  }): Promise<{ order_id: number }> {
    const response = await this.request<{ type: boolean; order_id: number }>("/create-vps", "POST", params);
    return { order_id: response.order_id };
  }

  async rebootVps(vpsId: number): Promise<void> {
    await this.request("/restart-vps", "POST", { vps_id: vpsId });
  }

  async reinstallSystem(vpsId: number, system: string): Promise<void> {
    await this.request("/reinstall-system", "POST", { vps_id: vpsId, system });
  }

  async renewOrder(orderId: number, period: number): Promise<void> {
    await this.request("/renew-order", "POST", { order_id: orderId, period });
  }

  async changeTariff(orderId: number, newTariffId: number): Promise<void> {
    await this.request("/change-tariff", "POST", { order_id: orderId, new_tariff_id: newTariffId });
  }

  async cloningVps(sourceVpsId: number, targetVpses: number[]): Promise<void> {
    await this.request("/cloning-vps", "POST", { source_vps_id: sourceVpsId, target_vpses: targetVpses });
  }

  async topUpBalance(amount: number): Promise<{ url: string }> {
    const response = await this.request<{ type: boolean; url: string }>("/top-up-balance", "POST", { amount });
    return { url: response.url };
  }
}

export const onedashService = new OneDashService();
