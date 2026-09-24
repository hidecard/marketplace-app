import { laravelApi } from './laravelApi';

interface LaravelOrder {
  id: number;
  order_number: string;
  buyer_id: number;
  seller_id?: number;
  shop_id: number;
  subtotal: number;
  delivery_fee: number;
  discount: number;
  total: number;
  payment_method: 'cash' | 'kbzpay' | 'wavepay' | 'bank_transfer' | 'other' | 'cod';
  payment_status: 'pending' | 'paid' | 'refunded';
  status: 'pending' | 'confirmed' | 'preparing' | 'shipped' | 'out_for_delivery' | 'delivered' | 'completed' | 'cancelled' | 'rejected';
  delivery_address: {
    label: string;
    name: string;
    phone: string;
    address: string;
    city: string;
    region: string;
  };
  note?: string;
  created_at: string;
  updated_at: string;
}

interface LaravelPaginatedResponse<T> {
  data: T[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
  from: number | null;
  to: number | null;
}

interface LaravelSingleResponse<T> {
  order?: T;
}

interface LaravelCreateResponse<T> {
  order?: T;
  replayed?: boolean;
}

class OrderApiService {
  private baseUrl = import.meta.env.VITE_LARAVEL_API_URL || 'http://localhost:8000/api';

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T | null> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...options.headers as Record<string, string>,
    };

    if (laravelApi.isAuthenticated) {
      const token = (laravelApi as any).token;
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers,
      });

      if (!response.ok) {
        console.error('Order API error:', response.status);
        return null;
      }

      return await response.json();
    } catch (error) {
      console.error('Order API request error:', error);
      return null;
    }
  }

  async getOrders(params?: { status?: string; page?: number }): Promise<LaravelOrder[] | null> {
    const queryString = new URLSearchParams(params as any).toString();
    const response = await this.request<LaravelPaginatedResponse<LaravelOrder>>(`/orders${queryString ? `?${queryString}` : ''}`);
    return response?.data ?? null;
  }

  async getOrder(id: number): Promise<LaravelOrder | null> {
    const response = await this.request<LaravelSingleResponse<LaravelOrder>>(`/orders/${id}`);
    return response?.order ?? null;
  }

  async createOrder(data: {
    items: Array<{ product_id: number; quantity: number }>;
    delivery_address: {
      label: string;
      name: string;
      phone: string;
      address: string;
      city: string;
      region: string;
    };
    note?: string;
    idempotency_key: string;
  }): Promise<LaravelOrder | null> {
    const response = await this.request<LaravelCreateResponse<LaravelOrder>>('/orders', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response?.order ?? null;
  }

  async updateOrderStatus(id: number, status: string): Promise<LaravelOrder | null> {
    const response = await this.request<LaravelSingleResponse<LaravelOrder>>(`/orders/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
    return response?.order ?? null;
  }

  get isEnabled(): boolean {
    return laravelApi.isEnabled;
  }
}

export const orderApi = new OrderApiService();
export default orderApi;
