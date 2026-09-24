import { laravelApi } from './laravelApi';

interface LaravelProduct {
  id: number;
  title: string;
  description: string;
  price: number;
  stock: number;
  category_id: number;
  seller_id: number;
  shop_id?: number;
  images: string[];
  condition: 'new' | 'used' | 'refurbished';
  status: 'active' | 'inactive' | 'sold' | 'hidden';
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
  product?: T;
  order?: T;
}

interface LaravelCreateResponse<T> {
  product?: T;
}

class ProductApiService {
  private baseUrl = import.meta.env.VITE_LARAVEL_API_URL || 'http://localhost:8000/api';

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T | null> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...options.headers as Record<string, string>,
    };

    if (laravelApi.isAuthenticated) {
      // Access token via the service's internal state
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
        console.error('Product API error:', response.status);
        return null;
      }

      return await response.json();
    } catch (error) {
      console.error('Product API request error:', error);
      return null;
    }
  }

  async getProducts(params?: { category_id?: number; search?: string; page?: number }): Promise<LaravelProduct[] | null> {
    const queryString = new URLSearchParams(params as any).toString();
    const response = await this.request<LaravelPaginatedResponse<LaravelProduct>>(`/products${queryString ? `?${queryString}` : ''}`);
    return response?.data ?? null;
  }

  async getProduct(id: number): Promise<LaravelProduct | null> {
    const response = await this.request<LaravelSingleResponse<LaravelProduct>>(`/products/${id}`);
    return response?.product ?? null;
  }

  async createProduct(data: Partial<LaravelProduct>): Promise<LaravelProduct | null> {
    const response = await this.request<LaravelCreateResponse<LaravelProduct>>('/seller/products', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response?.product ?? null;
  }

  async updateProduct(id: number, data: Partial<LaravelProduct>): Promise<LaravelProduct | null> {
    const response = await this.request<LaravelCreateResponse<LaravelProduct>>(`/seller/products/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    return response?.product ?? null;
  }

  async deleteProduct(id: number): Promise<boolean> {
    const response = await this.request(`/seller/products/${id}`, {
      method: 'DELETE',
    });
    return response !== null;
  }

  get isEnabled(): boolean {
    return laravelApi.isEnabled;
  }
}

export const productApi = new ProductApiService();
export default productApi;
