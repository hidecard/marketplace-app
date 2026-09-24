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
  shipping_address: {
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

interface LaravelOrderItem {
  id: number;
  order_id: number;
  product_id: number;
  title: string;
  image: string;
  price: number;
  quantity: number;
  subtotal: number;
}

class OrderApiService {
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T | null> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...options.headers,
    };

    if (laravelApi['token']) {
      headers['Authorization'] = `Bearer ${laravelApi['token']}`;
    }

    try {
      const response = await fetch(`${import.meta.env.VITE_LARAVEL_API_URL || 'http://localhost:8000/api'}${endpoint}`, {
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
    return this.request<LaravelOrder[]>(`/orders${queryString ? `?${queryString}` : ''}`);
  }

  async getOrder(id: number): Promise<LaravelOrder | null> {
    return this.request<LaravelOrder>(`/orders/${id}`);
  }

  async createOrder(data: {
    items: Array<{ product_id: number; quantity: number }>;
    shipping_address: {
      label: string;
      name: string;
      phone: string;
      address: string;
      city: string;
      region: string;
    };
    note?: string;
  }): Promise<LaravelOrder | null> {
    return this.request<LaravelOrder>('/orders', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateOrderStatus(id: number, status: string): Promise<LaravelOrder | null> {
    return this.request<LaravelOrder>(`/orders/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }

  get isEnabled(): boolean {
    return laravelApi.isEnabled;
  }
}

export const orderApi = new OrderApiService();
export default orderApi;
