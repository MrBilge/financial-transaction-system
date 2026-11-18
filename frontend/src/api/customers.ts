import { apiRequest } from "@/api/client";
import type {
  CreateCustomerRequest,
  Customer,
  CustomerListQuery,
  PaginatedResponse,
  UpdateCustomerRequest,
} from "@/types/api";

export const getCustomers = (
  query: CustomerListQuery = {},
): Promise<PaginatedResponse<Customer>> => {
  return apiRequest<PaginatedResponse<Customer>>("/customers", { query });
};

export const getCustomer = (customerId: string): Promise<Customer> => {
  return apiRequest<Customer>(`/customers/${encodeURIComponent(customerId)}`);
};

export const createCustomer = (
  request: CreateCustomerRequest,
): Promise<Customer> => {
  return apiRequest<Customer>("/customers", { method: "POST", body: request });
};

export const updateCustomer = (
  customerId: string,
  request: UpdateCustomerRequest,
): Promise<Customer> => {
  return apiRequest<Customer>(`/customers/${encodeURIComponent(customerId)}`, {
    method: "PATCH",
    body: request,
  });
};
