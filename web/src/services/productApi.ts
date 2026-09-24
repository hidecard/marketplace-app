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

class ProductApiService {
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
    return this.request<LaravelProduct[]>(`/products${queryString ? `?${queryString}` : ''}`);
  }

  async getProduct(id: number): Promise<LaravelProduct | null> {
    return this.request<LaravelProduct>(`/products/${id}`);
  }

  async createProduct(data: Partial<LaravelProduct>): Promise<LaravelProduct | null> {
    return this.request<LaravelProduct>('/seller/products', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateProduct(id: number, data: Partial<LaravelProduct>): Promise<LaravelProduct | null> {
    return this.request<LaravelProduct>(`/seller/products/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
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
