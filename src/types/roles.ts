export type Permission = {
  id: string;
  code: string;
  decription: string;
};

export type Role = {
  id: string;
  roleName: string;
  permissions: Permission[];
  createdBy: string;
  createdAt: string;
};

export type RoleListItem = {
  id: string;
  roleName: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  merchantId: string | null;
};

export type RolePage = {
  items: RoleListItem[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
};

export type CreateRoleBody = {
  roleName: string;
  permissionIds: string[];
};

export type PatchRoleBody = {
  roleName: string;
};
