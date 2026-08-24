// انواع داده‌های پایه اپلیکیشن woYab

export interface Business {
  id: string;
  name: string;
  slug: string;
  category: string;
  description?: string;
  location?: string;
  rating?: number;
  imageUrl?: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  icon?: string;
  count?: number;
}

export interface SearchParams {
  query?: string;
  category?: string;
  location?: string;
  page?: number;
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
}
