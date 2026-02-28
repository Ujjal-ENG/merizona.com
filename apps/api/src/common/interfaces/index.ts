/**
 * Common interfaces used across the application.
 */

export interface UserContext {
  _id: string;
  email: string;
  role: "platform_admin" | "customer";
  vendorId?: string;
  membership?: {
    role: "owner" | "manager" | "staff";
    permissions: string[];
  };
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
  sort?: string;
  order?: "asc" | "desc";
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
