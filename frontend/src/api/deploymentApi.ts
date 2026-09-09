import apiClient from './client';

export interface ProductDeploymentDto {
  id: number;
  productId: number;
  productName: string;
  productCode: string;
  clientId: number;
  clientCompanyName: string;
  clientCustomerName: string;
  issue: string;
  issueDate: string;
  formattedIssueDate: string;
  raisedBy: string;
  modeOfContact?: string;
  contactedPerson?: string;
  description: string;
  developmentProcess: string;
  currentStatus: string;
  movedToTesting: boolean;
  movedToTestingBy?: number;
  movedToTestingByName?: string;
  movedToTestingAt?: string;
  formattedMovedToTestingAt?: string;
  testingCompleted: boolean;
  testingCompletedBy?: number;
  testingCompletedByName?: string;
  testingCompletedAt?: string;
  formattedTestingCompletedAt?: string;
  deliveryDate?: string;
  formattedDeliveryDate?: string;
  deliveredBy?: number;
  deliveredByName?: string;
  deliveredAt?: string;
  version?: string;
  createdBy?: number;
  createdByName?: string;
  createdAt: string;
  formattedCreatedAt: string;
  modifiedBy?: number;
  modifiedByName?: string;
  updatedAt: string;
  formattedUpdatedAt: string;
  isActive: boolean;
  activitiesCount: number;
}

export interface ProductDeploymentActivityDto {
  id: number;
  deploymentId: number;
  actionType: string;
  previousStatus?: string;
  newStatus?: string;
  remarks?: string;
  changedBy: number;
  changedByName: string;
  changedAt: string;
  formattedChangedAt: string;
}

export interface CreateProductDeploymentRequest {
  productId: number;
  clientId: number;
  issue?: string;
  issueDate: string;
  raisedBy: string;
  modeOfContact?: string;
  contactedPerson?: string;
  description: string;
  developmentProcess?: string;
  currentStatus?: string;
  deliveryDate?: string;
  version?: string;
  remarks?: string;
}

export interface UpdateProductDeploymentRequest {
  productId: number;
  clientId: number;
  issue?: string;
  issueDate: string;
  raisedBy: string;
  modeOfContact?: string;
  contactedPerson?: string;
  description: string;
  developmentProcess?: string;
  currentStatus: string;
  deliveryDate?: string;
  version?: string;
  remarks?: string;
}

export interface ChangeDeploymentStatusRequest {
  newStatus: string;
  remarks?: string;
  version?: string;
  deliveryDate?: string;
}

export interface AuthorizedClientOptionDto {
  clientId: number;
  companyName: string;
  customerName: string;
}

export interface AuthorizedProductOptionDto {
  productId: number;
  productName: string;
  productCode: string;
  mappedClients: AuthorizedClientOptionDto[];
}

export interface EmployeeProductAccessDto {
  employeeId: number;
  employeeCode: string;
  employeeName: string;
  email: string;
  departmentName: string;
  designationName: string;
  hasPermission: boolean;
  assignedProductIds: number[];
  assignedProductNames: string[];
}

export interface UpdateEmployeeProductAccessRequest {
  employeeId: number;
  hasPermission: boolean;
  assignedProductIds: number[];
}

export interface ProductDeploymentFilter {
  search?: string;
  productId?: number;
  clientId?: number;
  status?: string;
  version?: string;
  employeeId?: number;
  issueDateFrom?: string;
  issueDateTo?: string;
  deliveryDateFrom?: string;
  deliveryDateTo?: string;
  page?: number;
  pageSize?: number;
}

export interface PagedResult<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
}

export const deploymentApi = {
  getDeployments: async (filter?: ProductDeploymentFilter) => {
    const params = new URLSearchParams();
    if (filter) {
      if (filter.search) params.append('search', filter.search);
      if (filter.productId) params.append('productId', filter.productId.toString());
      if (filter.clientId) params.append('clientId', filter.clientId.toString());
      if (filter.status) params.append('status', filter.status);
      if (filter.version) params.append('version', filter.version);
      if (filter.employeeId) params.append('employeeId', filter.employeeId.toString());
      if (filter.issueDateFrom) params.append('issueDateFrom', filter.issueDateFrom);
      if (filter.issueDateTo) params.append('issueDateTo', filter.issueDateTo);
      if (filter.deliveryDateFrom) params.append('deliveryDateFrom', filter.deliveryDateFrom);
      if (filter.deliveryDateTo) params.append('deliveryDateTo', filter.deliveryDateTo);
      if (filter.page) params.append('page', filter.page.toString());
      if (filter.pageSize) params.append('pageSize', filter.pageSize.toString());
    }
    const response = await apiClient.get<{ success: boolean; data: PagedResult<ProductDeploymentDto>; message?: string }>(
      `/product-deployment?${params.toString()}`
    );
    return response.data.data;
  },

  getDeploymentById: async (id: number) => {
    const response = await apiClient.get<{ success: boolean; data: ProductDeploymentDto; message?: string }>(
      `/product-deployment/${id}`
    );
    return response.data.data;
  },

  createDeployment: async (data: CreateProductDeploymentRequest) => {
    const response = await apiClient.post<{ success: boolean; data: ProductDeploymentDto; message?: string }>(
      '/product-deployment',
      data
    );
    return response.data.data;
  },

  updateDeployment: async (id: number, data: UpdateProductDeploymentRequest) => {
    const response = await apiClient.put<{ success: boolean; data: ProductDeploymentDto; message?: string }>(
      `/product-deployment/${id}`,
      data
    );
    return response.data.data;
  },

  changeStatus: async (id: number, data: ChangeDeploymentStatusRequest) => {
    const response = await apiClient.post<{ success: boolean; data: ProductDeploymentDto; message?: string }>(
      `/product-deployment/${id}/status`,
      data
    );
    return response.data.data;
  },

  getActivities: async (id: number) => {
    const response = await apiClient.get<{ success: boolean; data: ProductDeploymentActivityDto[]; message?: string }>(
      `/product-deployment/${id}/activities`
    );
    return response.data.data;
  },

  getAuthorizedProductsAndClients: async () => {
    const response = await apiClient.get<{ success: boolean; data: AuthorizedProductOptionDto[]; message?: string }>(
      '/product-deployment/meta/authorized-products'
    );
    return response.data.data;
  },

  getEmployeeProductAccessList: async () => {
    const response = await apiClient.get<{ success: boolean; data: EmployeeProductAccessDto[]; message?: string }>(
      '/product-deployment/admin/employee-access'
    );
    return response.data.data;
  },

  updateEmployeeProductAccess: async (employeeId: number, data: UpdateEmployeeProductAccessRequest) => {
    const response = await apiClient.put<{ success: boolean; data: EmployeeProductAccessDto; message?: string }>(
      `/product-deployment/admin/employee-access/${employeeId}`,
      data
    );
    return response.data.data;
  },

  exportToExcel: async (filter?: ProductDeploymentFilter) => {
    const params = new URLSearchParams();
    if (filter) {
      if (filter.search) params.append('search', filter.search);
      if (filter.productId) params.append('productId', filter.productId.toString());
      if (filter.clientId) params.append('clientId', filter.clientId.toString());
      if (filter.status) params.append('status', filter.status);
      if (filter.version) params.append('version', filter.version);
      if (filter.issueDateFrom) params.append('issueDateFrom', filter.issueDateFrom);
      if (filter.issueDateTo) params.append('issueDateTo', filter.issueDateTo);
    }
    const response = await apiClient.get(`/product-deployment/export?${params.toString()}`, {
      responseType: 'blob',
    });

    // Trigger browser download
    const blob = new Blob([response.data], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `OLMS_Product_Deployment_History_${new Date().toISOString().slice(0, 10)}.xlsx`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },
};
