export interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  companyName?: string;
  address?: string;
  city?: string;
  country?: string;
  isActive: boolean;
  isStaff: boolean;
  isSuperAdmin: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface ApiResponse<T> {
  data?: T;
  message?: string;
  success: boolean;
}

export interface ErrorResponse {
  message: string;
  error: string;
  statusCode: number;
}
