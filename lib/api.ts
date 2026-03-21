import type { User, ApiResponse } from './types';

const API_BASE_URL = '/api/proxy';
const SMARTEVENT_API_URL = '/api/smartevent';

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<ApiResponse<T>> {
  try {
    const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...((options.headers as Record<string, string>) || {}),
    };

    if (token) headers['Authorization'] = `Bearer ${token}`;

    const response = await fetch(`${API_BASE_URL}${endpoint}`, { ...options, headers });
    const data = await response.json();

    if (!response.ok) {
      return { success: false, message: data.message || 'Request failed' };
    }

    return { success: true, data: data.data as T, message: data.message };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : 'Network error' };
  }
}

async function smartEventRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${SMARTEVENT_API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...((options.headers as Record<string, string>) || {}),
    },
  });
  return response.json() as Promise<T>;
}

export const authApi = {
  login: async (credentials: { email: string; password: string }) => {
    return apiRequest<{ user: User; token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  },

  register: async (userData: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phoneNumber?: string;
    companyName?: string;
    address?: string;
    city?: string;
    country?: string;
  }) => {
    return apiRequest<{ user: User; token: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  },
};

// --- SmartEvent / Conference Registration types ---

export interface RegistrationCategory {
  id: number;
  name_english: string;
  name_french: string;
  fee: string;
  early_payment_date: string;
  end_date: string;
}

export interface FormInputOption {
  id: number;
  contentEnglish: string;
  contentFrench: string;
}

export interface FormInput {
  inputcode: string;
  nameEnglish: string;
  nameFrench: string;
  is_mandatory: 'YES' | 'NO';
  allow_other: 'YES' | 'NO';
  inputtype: {
    id: number;
    name: string;
  };
}

export interface FormInputGroup {
  group: {
    id: number;
    name: string;
    nameFrench: string;
  };
  inputs: Array<{
    input: FormInput;
    options: FormInputOption[];
    value: string;
  }>;
}

export interface RegistrationPageResponse {
  about: {
    english_description: string;
    french_description: string;
    banner: string;
  };
  event_description: {
    event_type: 'HYBRID' | 'PHYSICAL' | 'VIRTUAL';
  };
}

export interface CategoriesResponse {
  data: RegistrationCategory[];
}

export interface CategoryFormResponse {
  data: FormInputGroup[];
  category: {
    form_type: 'SINGLE' | 'MULTI';
    is_free: 'YES' | 'NO';
  };
}

export const registrationApi = {
  getRegistrationPage: (): Promise<RegistrationPageResponse> =>
    smartEventRequest<RegistrationPageResponse>('/Registration-Page-Api', { method: 'GET' }),

  getCategories: (attendanceType: 'PHYSICAL' | 'VIRTUAL'): Promise<CategoriesResponse> =>
    smartEventRequest<CategoriesResponse>('/Display-Registration-Categories', {
      method: 'POST',
      body: JSON.stringify({ attendence: attendanceType, operation: 'get-categories' }),
    }),

  getCategoryForm: (categoryId: number, attendanceType: 'PHYSICAL' | 'VIRTUAL'): Promise<CategoryFormResponse> =>
    smartEventRequest<CategoryFormResponse>('/Display-Categories-Form-Inputs', {
      method: 'POST',
      body: JSON.stringify({ category: categoryId, attendence: attendanceType, operation: 'get-form-inputs' }),
    }),

  submitRegistration: async (data: FormData): Promise<{ success: boolean; message: string | string[]; data?: Record<string, unknown> }> => {
    const response = await fetch(`${SMARTEVENT_API_URL}/Register-Delegate`, {
      method: 'POST',
      body: data,
    });
    const result = await response.json();
    return { success: response.ok, message: result.message, data: result.data };
  },

  inviteBulkDelegates: async (data: FormData): Promise<{ success: boolean; message: string | string[] }> => {
    const response = await fetch(`${SMARTEVENT_API_URL}/Invite-Bulk-Delegates`, {
      method: 'POST',
      body: data,
    });
    const result = await response.json();
    return { success: response.ok, message: result.message };
  },
};
