export interface Filter {
  field: string;
  operator: string;
  value: any;
}

export interface Sort {
  field: string;
  direction: 'asc' | 'desc';
}

export interface Pagination {
  limit: number;
  offset: number;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
  hasMore?: boolean;
  total?: number;
}

export interface QueryOptions {
  pagination?: Pagination;
  filters?: Filter[];
  sort?: Sort[];
  search?: string;
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
