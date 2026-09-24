const API_BASE_URL = import.meta.env.VITE_LARAVEL_API_URL || 'http://localhost:8000/api';
const USE_LARAVEL_API = import.meta.env.VITE_USE_LARAVEL_API === 'true';

interface ApiResponse<T> {
  data?: T;
  message?: string;
  error?: string;
  user?: any;
  token?: string;
  ability?: string;
}

interface LaravelUser {
  id: number;
  name: string;
  email: string;
  phone_number: string | null;
  role: 'user' | 'seller' | 'admin';
  status: 'active' | 'suspended' | 'banned';
  phone_verified: boolean;
  created_at: string;
  updated_at: string;
}

class LaravelApiService {
  private token: string | null = null;
  private ability: string | null = null;

  constructor() {
    this.loadToken();
  }

  private loadToken(): void {
    this.token = localStorage.getItem('laravel_token');
    this.ability = localStorage.getItem('laravel_ability');
  }

  private saveToken(token: string, ability: string): void {
    this.token = token;
    this.ability = ability;
    localStorage.setItem('laravel_token', token);
    localStorage.setItem('laravel_ability', ability);
  }

  private clearToken(): void {
    this.token = null;
    this.ability = null;
    localStorage.removeItem('laravel_token');
    localStorage.removeItem('laravel_ability');
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...options.headers as Record<string, string>,
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        return { error: data.message || data.error || 'Request failed' };
      }

      return data;
    } catch (error) {
      console.error('Laravel API request error:', error);
      return { error: 'Network error' };
    }
  }

  async register(data: {
    name: string;
    email: string;
    password: string;
    password_confirmation: string;
    phone_number?: string;
  }): Promise<ApiResponse<{ user: LaravelUser; token: string; ability: string }>> {
    const response = await this.request<{ user: LaravelUser; token: string; ability: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });

    if (response.token && response.ability) {
      this.saveToken(response.token, response.ability);
    }

    return response;
  }

  async login(email: string, password: string): Promise<ApiResponse<{ user: LaravelUser; token: string; ability: string }>> {
    const response = await this.request<{ user: LaravelUser; token: string; ability: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    if (response.token && response.ability) {
      this.saveToken(response.token, response.ability);
    }

    return response;
  }

  async logout(): Promise<ApiResponse<void>> {
    const response = await this.request<void>('/auth/logout', {
      method: 'POST',
    });

    this.clearToken();
    return response;
  }

  async logoutAll(): Promise<ApiResponse<void>> {
    const response = await this.request<void>('/auth/logout-all', {
      method: 'POST',
    });

    this.clearToken();
    return response;
  }

  async getCurrentUser(): Promise<ApiResponse<{ user: LaravelUser }>> {
    return this.request<{ user: LaravelUser }>('/auth/me');
  }

  async updateProfile(data: { name?: string; phone_number?: string }): Promise<ApiResponse<{ user: LaravelUser }>> {
    return this.request<{ user: LaravelUser }>('/auth/profile', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async changePassword(data: {
    current_password: string;
    password: string;
    password_confirmation: string;
  }): Promise<ApiResponse<{ user: LaravelUser; token: string; ability: string }>> {
    const response = await this.request<{ user: LaravelUser; token: string; ability: string }>('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify(data),
    });

    if (response.token && response.ability) {
      this.saveToken(response.token, response.ability);
    }

    return response;
  }

  get isAuthenticated(): boolean {
    return !!this.token;
  }

  get userAbility(): string | null {
    return this.ability;
  }

  get isEnabled(): boolean {
    return USE_LARAVEL_API;
  }
}

export const laravelApi = new LaravelApiService();
export default laravelApi;
