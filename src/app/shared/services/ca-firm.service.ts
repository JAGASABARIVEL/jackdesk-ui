// src/app/shared/services/ca-firm.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { HOST } from '../../../environment';

@Injectable({
  providedIn: 'root'
})
export class CAFirmService {
  private baseUrl = `${HOST}`;

  constructor(private http: HttpClient) {}

  // ==================== PRODUCTS & SERVICES ====================
  
  // Categories
  listCategories(): Observable<any> {
    return this.http.get(`${this.baseUrl}/products/categories/`);
  }

  createCategory(data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/products/categories/`, data);
  }

  updateCategory(id: number, data: any): Observable<any> {
    return this.http.put(`${this.baseUrl}/products/categories/${id}/`, data);
  }

  deleteCategory(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/products/categories/${id}/`);
  }

  // Products/Services
  listProducts(params?: any): Observable<any> {
    let httpParams = new HttpParams();
    if (params) {
      Object.keys(params).forEach(key => {
        if (params[key]) httpParams = httpParams.set(key, params[key]);
      });
    }
    return this.http.get(`${this.baseUrl}/products/products/`, { params: httpParams });
  }

  createProduct(data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/products/products/`, data);
  }

  updateProduct(id: number, data: any): Observable<any> {
    return this.http.put(`${this.baseUrl}/products/products/${id}/`, data);
  }

  deleteProduct(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/products/products/${id}/`);
  }

  // Vendors
  listVendors(): Observable<any> {
    return this.http.get(`${this.baseUrl}/products/vendors/`);
  }

  createVendor(data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/products/vendors/`, data);
  }

  updateVendor(id: number, data: any): Observable<any> {
    return this.http.put(`${this.baseUrl}/products/vendors/${id}/`, data);
  }

  deleteVendor(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/products/vendors/${id}/`);
  }

  // Office Purchases
  listOfficePurchases(params?: any): Observable<any> {
    let httpParams = new HttpParams();
    if (params) {
      Object.keys(params).forEach(key => {
        if (params[key]) httpParams = httpParams.set(key, params[key]);
      });
    }
    return this.http.get(`${this.baseUrl}/products/purchases/`, { params: httpParams });
  }

  createOfficePurchase(data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/products/purchases/`, data);
  }

  updateOfficePurchase(id: number, data: any): Observable<any> {
    return this.http.put(`${this.baseUrl}/products/purchases/${id}/`, data);
  }

  deleteOfficePurchase(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/products/purchases/${id}/`);
  }

  recordPurchasePayment(data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/products/purchases/payments/`, data);
  }

  getExpenseSummary(params?: any): Observable<any> {
    let httpParams = new HttpParams();
    if (params) {
      Object.keys(params).forEach(key => {
        if (params[key]) httpParams = httpParams.set(key, params[key]);
      });
    }
    return this.http.get(`${this.baseUrl}/products/purchases/summary/`, { params: httpParams });
  }

  // ==================== CUSTOMERS ====================
  
  listCustomers(params?: any): Observable<any> {
    let httpParams = new HttpParams();
    if (params) {
      Object.keys(params).forEach(key => {
        if (params[key]) httpParams = httpParams.set(key, params[key]);
      });
    }
    return this.http.get(`${this.baseUrl}/contacts/customers/`, { params: httpParams });
  }

  createCustomer(data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/contacts/customers/`, data);
  }

  updateCustomer(id: number, data: any): Observable<any> {
    return this.http.put(`${this.baseUrl}/contacts/customers/${id}/`, data);
  }

  deleteCustomer(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/contacts/customers/${id}/`);
  }

  getCustomerSummary(id: number): Observable<any> {
    return this.http.get(`${this.baseUrl}/contacts/customers/${id}/summary/`);
  }

  // Customer Purchases
  listCustomerPurchases(params?: any): Observable<any> {
    let httpParams = new HttpParams();
    if (params) {
      Object.keys(params).forEach(key => {
        if (params[key]) httpParams = httpParams.set(key, params[key]);
      });
    }
    return this.http.get(`${this.baseUrl}/contacts/purchases/`, { params: httpParams });
  }

  createCustomerPurchase(data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/contacts/purchases/`, data);
  }

  updateCustomerPurchase(id: number, data: any): Observable<any> {
    return this.http.put(`${this.baseUrl}/contacts/purchases/${id}/`, data);
  }

  deleteCustomerPurchase(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/contacts/purchases/${id}/`);
  }

  recordCustomerPayment(data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/contacts/purchases/payments/`, data);
  }

  // ==================== DEPARTMENTS ====================
  
  listDepartments(): Observable<any> {
    return this.http.get(`${this.baseUrl}/users/departments/`);
  }

  createDepartment(data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/users/departments/`, data);
  }

  updateDepartment(id: number, data: any): Observable<any> {
    return this.http.put(`${this.baseUrl}/users/departments/${id}/`, data);
  }

  deleteDepartment(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/users/departments/${id}/`);
  }

  // ==================== EMPLOYEES ====================
  
  listEmployees(params?: any): Observable<any> {
    let httpParams = new HttpParams();
    if (params) {
      Object.keys(params).forEach(key => {
        if (params[key]) httpParams = httpParams.set(key, params[key]);
      });
    }
    return this.http.get(`${this.baseUrl}/users/employees/`, { params: httpParams });
  }

  createEmployee(data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/users/employees/`, data);
  }

  updateEmployee(id: number, data: any): Observable<any> {
    return this.http.put(`${this.baseUrl}/users/employees/${id}/`, data);
  }

  deleteEmployee(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/users/employees/${id}/`);
  }

  // ==================== SALARIES ====================
  
  listSalaries(params?: any): Observable<any> {
    let httpParams = new HttpParams();
    if (params) {
      Object.keys(params).forEach(key => {
        if (params[key]) httpParams = httpParams.set(key, params[key]);
      });
    }
    return this.http.get(`${this.baseUrl}/users/salaries/`, { params: httpParams });
  }

  createSalary(data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/users/salaries/`, data);
  }

  updateSalary(id: number, data: any): Observable<any> {
    return this.http.put(`${this.baseUrl}/users/salaries/${id}/`, data);
  }

  deleteSalary(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/users/salaries/${id}/`);
  }

  // ==================== DASHBOARD ====================
  
  getDashboard(params?: any): Observable<any> {
    let httpParams = new HttpParams();
    if (params) {
      Object.keys(params).forEach(key => {
        if (params[key]) httpParams = httpParams.set(key, params[key]);
      });
    }
    return this.http.get(`${this.baseUrl}/dashboard/dashboard/`, { params: httpParams });
  }

  getSalaryReport(params?: any): Observable<any> {
    let httpParams = new HttpParams();
    if (params) {
      Object.keys(params).forEach(key => {
        if (params[key]) httpParams = httpParams.set(key, params[key]);
      });
    }
    return this.http.get(`${this.baseUrl}/dashboard/reports/salary/`, { params: httpParams });
  }

  getFinancialYearReport(params?: any): Observable<any> {
    let httpParams = new HttpParams();
    if (params) {
      Object.keys(params).forEach(key => {
        if (params[key]) httpParams = httpParams.set(key, params[key]);
      });
    }
    return this.http.get(`${this.baseUrl}/dashboard/reports/financial-year/`, { params: httpParams });
  }

  getCustomerContacts(customerId: number): Observable<any> {
  return this.http.get(`${this.baseUrl}/contacts/customers/${customerId}/contacts/`);
}

addContactsToCustomer(customerId: number, payload: any): Observable<any> {
  /**
   * payload: {
   *   contact_ids: [1, 2, 3],
   *   roles: { 1: { role: 'primary', is_primary: true }, 2: { role: 'billing' } }
   * }
   */
  return this.http.post(`${this.baseUrl}/contacts/customers/${customerId}/contacts/manage/`, payload);
}

getCustomerContactRoles(customerId: number): Observable<any> {
  return this.http.get(`${this.baseUrl}/contacts/customers/${customerId}/contacts/roles/`);
}

createCustomerContactRole(customerId: number, payload: any): Observable<any> {
  return this.http.post(`${this.baseUrl}/contacts/customers/${customerId}/contacts/roles/`, payload);
}

updateCustomerContactRole(customerId: number, roleId: number, payload: any): Observable<any> {
  return this.http.put(`${this.baseUrl}/contacts/customers/${customerId}/contacts/roles/${roleId}/`, payload);
}

deleteCustomerContactRole(customerId: number, roleId: number): Observable<any> {
  return this.http.delete(`${this.baseUrl}/contacts/customers/${customerId}/contacts/roles/${roleId}/`);
}

getCustomerGroups(customerId: number): Observable<any> {
  return this.http.get(`${this.baseUrl}/contacts/customers/${customerId}/groups/`);
}

// ==================== ENHANCED CUSTOMER ENDPOINTS ====================

listCustomersWithContacts(params?: any): Observable<any> {
  /**
   * params: {
   *   include_contacts: true,
   *   include_groups: true
   * }
   */
  let httpParams = new HttpParams();
  if (params) {
    Object.keys(params).forEach(key => {
      if (params[key]) httpParams = httpParams.set(key, params[key]);
    });
  }
  return this.http.get(`${this.baseUrl}/contacts/customers/`, { params: httpParams });
}

createCustomerWithContacts(payload: any): Observable<any> {
  /**
   * payload: {
   *   customer_name: "ABC Corp",
   *   file_no: "CA-2024-001",
   *   ...customerFields,
   *   contacts: [
   *     { name: "John", phone: "1234567890", role: "primary", is_primary: true },
   *     { name: "Jane", phone: "0987654321", role: "billing" }
   *   ],
   *   groups: [
   *     { name: "Management Team", description: "..." }
   *   ]
   * }
   */
  return this.http.post(`${this.baseUrl}/contacts/customers/`, payload);
}

/**
   * List customers with server-side pagination and filtering
   */
  listCustomersPaginated(params: any = {}): Observable<any> {
    let httpParams = new HttpParams();
    
    // Add pagination params
    if (params.page) {
      httpParams = httpParams.set('page', params.page.toString());
    }
    if (params.page_size) {
      httpParams = httpParams.set('page_size', params.page_size.toString());
    }
    
    // Add search param
    if (params.search) {
      httpParams = httpParams.set('search', params.search);
    }
    
    // Add filter params
    if (params.assigned_employee) {
      httpParams = httpParams.set('assigned_employee', params.assigned_employee.toString());
    }
    if (params.is_active !== undefined) {
      httpParams = httpParams.set('is_active', params.is_active.toString());
    }
    
    // Add sorting param
    if (params.ordering) {
      httpParams = httpParams.set('ordering', params.ordering);
    }
    
    return this.http.get(`${this.baseUrl}/contacts/customers/`, { params: httpParams });
  }

  /**
   * Get customer statistics (for dashboard cards)
   */
  getCustomerStatistics(): Observable<any> {
    return this.http.get(`${this.baseUrl}/contacts/customers/statistics/`);
  }
}