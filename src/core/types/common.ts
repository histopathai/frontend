export interface Pagination {
  limit: number;
  offset: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  hasMore?: boolean;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: Pagination;
}

export interface ApiError {
  errorType: string;
  message: string;
  details?: Record<string, any>;
  errors?: Record<string, string[]>;
}
