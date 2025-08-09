import { jwtDecode } from 'jwt-decode';

// JWT Token payload类型
interface JwtPayload {
  sub: string; // user id
  email: string;
  iat: number;
  exp: number;
}

// 认证相关的类型
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  confirmPassword: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken?: string;
}

export interface AuthUser {
  id: string;
  email: string;
}

export class AuthService {
  private readonly ACCESS_TOKEN_KEY = 'ai_prompt_optimizer_access_token';
  private readonly REFRESH_TOKEN_KEY = 'ai_prompt_optimizer_refresh_token';
  private readonly USER_KEY = 'ai_prompt_optimizer_user';

  // Token管理
  setTokens(tokens: AuthTokens): void {
    localStorage.setItem(this.ACCESS_TOKEN_KEY, tokens.accessToken);
    if (tokens.refreshToken) {
      localStorage.setItem(this.REFRESH_TOKEN_KEY, tokens.refreshToken);
    }
  }

  getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(this.ACCESS_TOKEN_KEY);
  }

  getRefreshToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(this.REFRESH_TOKEN_KEY);
  }

  removeTokens(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(this.ACCESS_TOKEN_KEY);
    localStorage.removeItem(this.REFRESH_TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
  }

  // 用户信息管理
  setUser(user: AuthUser): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
  }

  getUser(): AuthUser | null {
    if (typeof window === 'undefined') return null;
    const userStr = localStorage.getItem(this.USER_KEY);
    if (!userStr) return null;
    
    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  }

  // Token验证
  isTokenValid(token?: string): boolean {
    const tokenToCheck = token || this.getToken();
    if (!tokenToCheck) return false;

    try {
      const decoded = jwtDecode<JwtPayload>(tokenToCheck);
      const currentTime = Date.now() / 1000;
      
      // 检查token是否过期（提前5分钟判断为过期）
      return decoded.exp > currentTime + 300;
    } catch {
      return false;
    }
  }

  // 获取token中的用户信息
  getUserFromToken(token?: string): AuthUser | null {
    const tokenToCheck = token || this.getToken();
    if (!tokenToCheck) return null;

    try {
      const decoded = jwtDecode<JwtPayload>(tokenToCheck);
      return {
        id: decoded.sub,
        email: decoded.email,
      };
    } catch {
      return null;
    }
  }

  // 检查是否已认证
  isAuthenticated(): boolean {
    const token = this.getToken();
    const user = this.getUser();
    return !!(token && user && this.isTokenValid(token));
  }

  // 登录
  async login(credentials: LoginCredentials): Promise<{ user: AuthUser; tokens: AuthTokens }> {
    try {
      // 这里会通过API client调用，避免循环依赖，直接使用fetch
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001/api'}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Login failed');
      }

      const data = await response.json();
      const tokens: AuthTokens = {
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
      };

      // 从token中提取用户信息
      const user = this.getUserFromToken(tokens.accessToken);
      if (!user) {
        throw new Error('Invalid token received');
      }

      // 保存tokens和用户信息
      this.setTokens(tokens);
      this.setUser(user);

      return { user, tokens };
    } catch (error) {
      throw error;
    }
  }

  // 注册
  async register(data: RegisterData): Promise<{ user: AuthUser; tokens: AuthTokens }> {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001/api'}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Registration failed');
      }

      const responseData = await response.json();
      const tokens: AuthTokens = {
        accessToken: responseData.accessToken,
        refreshToken: responseData.refreshToken,
      };

      // 从token中提取用户信息
      const user = this.getUserFromToken(tokens.accessToken);
      if (!user) {
        throw new Error('Invalid token received');
      }

      // 保存tokens和用户信息
      this.setTokens(tokens);
      this.setUser(user);

      return { user, tokens };
    } catch (error) {
      throw error;
    }
  }

  // 刷新token
  async refreshToken(): Promise<AuthTokens> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001/api'}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${refreshToken}`,
        },
      });

      if (!response.ok) {
        throw new Error('Token refresh failed');
      }

      const data = await response.json();
      const tokens: AuthTokens = {
        accessToken: data.accessToken,
        refreshToken: data.refreshToken || refreshToken,
      };

      // 更新存储的tokens
      this.setTokens(tokens);

      // 更新用户信息
      const user = this.getUserFromToken(tokens.accessToken);
      if (user) {
        this.setUser(user);
      }

      return tokens;
    } catch (error) {
      // 刷新失败，清除所有认证信息
      this.logout();
      throw error;
    }
  }

  // 登出
  logout(): void {
    this.removeTokens();
    
    // 可以调用后端登出API（如果需要）
    // 这里暂时只清除本地存储
  }

  // 获取token过期时间
  getTokenExpiration(token?: string): Date | null {
    const tokenToCheck = token || this.getToken();
    if (!tokenToCheck) return null;

    try {
      const decoded = jwtDecode<JwtPayload>(tokenToCheck);
      return new Date(decoded.exp * 1000);
    } catch {
      return null;
    }
  }

  // 检查token是否即将过期（5分钟内）
  isTokenExpiringSoon(token?: string): boolean {
    const tokenToCheck = token || this.getToken();
    if (!tokenToCheck) return true;

    try {
      const decoded = jwtDecode<JwtPayload>(tokenToCheck);
      const currentTime = Date.now() / 1000;
      const fiveMinutesFromNow = currentTime + 300; // 5分钟
      
      return decoded.exp <= fiveMinutesFromNow;
    } catch {
      return true;
    }
  }

  // 自动刷新token（如果即将过期）
  async ensureValidToken(): Promise<string | null> {
    const currentToken = this.getToken();
    
    if (!currentToken) {
      return null;
    }

    if (this.isTokenValid(currentToken) && !this.isTokenExpiringSoon(currentToken)) {
      return currentToken;
    }

    try {
      const tokens = await this.refreshToken();
      return tokens.accessToken;
    } catch {
      return null;
    }
  }
}

// 导出单例实例
export const authService = new AuthService();
export default authService;