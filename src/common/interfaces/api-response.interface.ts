/**
 * Standard API Response Interface
 */
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: {
    timestamp: Date;
    path?: string;
    method?: string;
  };
}

/**
 * Paginated Response Interface
 */
export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

/**
 * Query Parameters for Pagination
 */
export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

/**
 * Filter Parameters
 */
export interface FilterParams {
  search?: string;
  startDate?: Date;
  endDate?: Date;
  status?: string;
}
