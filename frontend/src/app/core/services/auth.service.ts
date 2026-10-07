import { Injectable, computed, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, finalize, map, of, tap } from 'rxjs';

import {
  clearCachedUser,
  clearToken,
  readCachedUser,
  readToken,
  writeCachedUser,
  writeToken
} from './token-storage';
import { ROLE_HOME, UserRole, UserStatus } from '../models/status';
import { environment } from '../../../environments/environment';

const API_URL = `${environment.apiUrl}/auth`;

export interface CurrentUser {
  id: string;
  _id?: string;
  name: string;
  email: string;
  phone: string | null;
  role: UserRole;
  status: UserStatus;
  profileImage: string | null;
  unitId: string | null;
  specializations: string[];
  rating: number;
  totalReviews: number;
  lastLoginAt: string | null;
}

interface LoginResponse {
  success: boolean;
  message: string;
  data: {
    token: string;
    user: CurrentUser;
  };
}

interface RegisterResponse {
  success: boolean;
  message: string;
  data: {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    status: UserStatus;
  };
}

interface MeResponse {
  success: boolean;
  message: string;
  data: CurrentUser;
}

export interface AuthMessageResponse {
  success: boolean;
  message: string;
}


@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly userSignal = signal<CurrentUser | null>(
    readCachedUser<CurrentUser>()
  );
  private readonly loadingSignal = signal(false);

  readonly user = this.userSignal.asReadonly();
  readonly loading = this.loadingSignal.asReadonly();
  readonly isAuthenticated = computed(
    () => !!this.userSignal() && !!this.getToken()
  );

  constructor(private http: HttpClient) {}



  
  initializeSession(): Observable<CurrentUser | null> {
    if (!this.getToken()) {
      return of(null);
    }

    this.loadingSignal.set(true);

    return this.getMe().pipe(
      map(response => response.data ?? null),
      catchError(() => {
        this.logout();
        return of(null);
      }),
      finalize(() => this.loadingSignal.set(false))
    );
  }

  login(email: string, password: string): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${API_URL}/login`, {
        email: this.normalizeEmail(email),
        password
      })
      .pipe(
        tap(response => {
          writeToken(response.data.token);
          this.setUser(response.data.user);
        })
      );
  }

  register(data: {
    name: string;
    phone: string;
    email: string;
    password: string;
    role: 'RESIDENT' | 'TECHNICIAN' | 'SECURITY';
    unitId?: string;
    specializations?: string[];
  }): Observable<RegisterResponse> {
    return this.http.post<RegisterResponse>(`${API_URL}/register`, {
      ...data,
      email: this.normalizeEmail(data.email),
      name: data.name?.trim()
    });
  }

  getMe(): Observable<MeResponse> {
    return this.http.get<MeResponse>(`${API_URL}/me`).pipe(
      tap(response => {
        if (response?.data) {
          this.setUser(response.data);
        }
      })
    );
  }

  
  uploadProfileImage(file: File): Observable<MeResponse> {
    const formData = new FormData();
    formData.append('image', file);

    return this.http
      .post<MeResponse>(`${environment.apiUrl}/uploads/profile-image`, formData)
      .pipe(
        tap(response => {
          if (response?.data) {
            this.setUser(response.data);
          }
        })
      );
  }

  updateProfile(data: {
    name?: string;
    phone?: string;
    profileImage?: string | null;
  }): Observable<MeResponse> {
    return this.http.patch<MeResponse>(`${API_URL}/me`, data).pipe(
      tap(response => {
        if (response?.data) {
          this.setUser(response.data);
        }
      })
    );
  }

  forgotPassword(email: string): Observable<AuthMessageResponse> {
    return this.http.post<AuthMessageResponse>(`${API_URL}/forgot-password`, {
      email: this.normalizeEmail(email)
    });
  }

  resetPassword(
    token: string,
    password: string
  ): Observable<AuthMessageResponse> {
    return this.http.post<AuthMessageResponse>(`${API_URL}/reset-password`, {
      token,
      password
    });
  }

  
  changePassword(
    currentPassword: string,
    newPassword: string
  ): Observable<AuthMessageResponse> {
    return this.http.patch<AuthMessageResponse>(
      `${API_URL}/change-password`,
      { currentPassword, newPassword }
    );
  }

  logout(): void {
    clearToken();
    clearCachedUser();
    this.userSignal.set(null);
  }



  
  getToken(): string | null {
    return readToken();
  }

  
  getUser(): CurrentUser | null {
    return this.userSignal();
  }

  isLoggedIn(): boolean {
    return this.isAuthenticated();
  }

  get userRole(): UserRole | null {
    return this.userSignal()?.role ?? null;
  }

  get userName(): string {
    return this.userSignal()?.name ?? '';
  }

  hasRole(...roles: UserRole[]): boolean {
    const role = this.userRole;
    return !!role && roles.includes(role);
  }

  
  get homeRoute(): string {
    const role = this.userRole;
    return role ? ROLE_HOME[role] : '/';
  }

  
  private normalizeEmail(email: string): string {
    return (email ?? '').trim().toLowerCase();
  }

  private setUser(user: CurrentUser): void {
    this.userSignal.set(user);
    writeCachedUser(user);
  }
}
