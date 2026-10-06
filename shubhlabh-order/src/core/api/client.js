import { ENV } from '../config/env';

class ApiClient {
  constructor() {
    this.baseURL = ENV.API_URL;
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    this.token = null;
  }

  setToken(token) {
    this.token = token;
    if (token) {
      this.defaultHeaders['Authorization'] = `Bearer ${token}`;
    } else {
      delete this.defaultHeaders['Authorization'];
    }
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    
    // Setup timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
    
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...this.defaultHeaders,
          ...options.headers,
        },
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);

      if (response.status === 401) {
        // Handle unauthorized (e.g., clear session, redirect)
        this.handleUnauthorized();
      }

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error('Request timed out');
      }
      throw this.handleNetworkError(error);
    }
  }

  handleUnauthorized() {
    console.warn('Unauthorized access. Clearing session.');
    // TODO: integrate with store to clear state
  }

  handleNetworkError(error) {
    console.error('Network Error:', error);
    return error;
  }
}

export const api = new ApiClient();
