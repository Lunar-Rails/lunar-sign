/**
 * Role-Permission Matrix for Complyverse DEMS MVP
 *
 * Internal Roles:
 * - Super Admin: Full system access
 * - Company Admin: Company-scoped access
 * - Department Admin: Department-scoped access
 * - User: Document creator with standard permissions
 * - Viewer: Read-only access
 * - Auditor: Read-only oversight with audit focus
 *
 * External Signers: NOT internal users, document-level only
 */

export type InternalRole =
  | 'Super Admin'
  | 'Company Admin'
  | 'Department Admin'
  | 'User'
  | 'Viewer'
  | 'Auditor';

export interface PermissionContext {
  userRole: InternalRole;
  userCompanyId?: string;
  userDepartmentId?: string;
  documentOwnerId?: string;
  documentCompanyId?: string;
  documentDepartmentId?: string;
  documentStatus?: string;
}

/**
 * Navigation Permissions
 */
export const canAccessDashboard = (role: InternalRole): boolean => {
  return true;
};

export const canAccessDocuments = (role: InternalRole): boolean => {
  return true;
};

export const canAccessCompanies = (role: InternalRole): boolean => {
  return role === 'Super Admin';
};

export const canAccessUserManagement = (role: InternalRole): boolean => {
  return ['Super Admin', 'Company Admin', 'Department Admin'].includes(role);
};

export const canAccessAuditTrail = (role: InternalRole): boolean => {
  return true;
};

/**
 * Document Action Permissions
 */
export const canUploadDocument = (role: InternalRole): boolean => {
  return ['Super Admin', 'Company Admin', 'Department Admin', 'User'].includes(role);
};

export const canSendDocument = (ctx: PermissionContext): boolean => {
  const { userRole, documentStatus } = ctx;

  if (!['Super Admin', 'Company Admin', 'Department Admin', 'User'].includes(userRole)) {
    return false;
  }

  if (documentStatus && documentStatus !== 'Draft') {
    return false;
  }

  return canEditDocument(ctx);
};

export const canEditDocument = (ctx: PermissionContext): boolean => {
  const { userRole, documentOwnerId, documentCompanyId, documentDepartmentId, documentStatus, userCompanyId, userDepartmentId } = ctx;

  if (documentStatus && ['Completed', 'Cancelled', 'Rejected', 'Expired'].includes(documentStatus)) {
    return false;
  }

  if (userRole === 'Super Admin') return true;

  if (userRole === 'Company Admin') {
    return userCompanyId === documentCompanyId;
  }

  if (userRole === 'Department Admin') {
    return userDepartmentId === documentDepartmentId;
  }

  if (userRole === 'User') {
    return true;
  }

  return false;
};

export const canCancelDocument = (ctx: PermissionContext): boolean => {
  const { userRole, documentOwnerId, documentStatus, documentCompanyId, documentDepartmentId, userCompanyId, userDepartmentId } = ctx;

  if (documentStatus && ['Completed', 'Cancelled', 'Rejected', 'Expired'].includes(documentStatus)) {
    return false;
  }

  if (userRole === 'Super Admin') return true;

  if (userRole === 'Company Admin') {
    return userCompanyId === documentCompanyId;
  }

  if (userRole === 'Department Admin') {
    return userDepartmentId === documentDepartmentId;
  }

  if (userRole === 'User') {
    return true;
  }

  return false;
};

export const canSendReminder = (ctx: PermissionContext): boolean => {
  const { userRole, documentStatus } = ctx;

  if (documentStatus && !['Sent for Signature', 'Viewed', 'Signed (Partial)'].includes(documentStatus)) {
    return false;
  }

  return canEditDocument(ctx);
};

export const canDownloadDocument = (role: InternalRole): boolean => {
  return true;
};

export const canViewDocument = (role: InternalRole): boolean => {
  return true;
};

export const canAddSigners = (ctx: PermissionContext): boolean => {
  const { documentStatus } = ctx;

  if (documentStatus && documentStatus !== 'Draft') {
    return false;
  }

  return canEditDocument(ctx);
};

export const canRemoveSigners = (ctx: PermissionContext): boolean => {
  return canAddSigners(ctx);
};

/**
 * User Management Permissions
 */
export const canCreateUser = (role: InternalRole): boolean => {
  return ['Super Admin', 'Company Admin', 'Department Admin'].includes(role);
};

export const canEditUser = (role: InternalRole, targetUserRole?: InternalRole): boolean => {
  if (role === 'Super Admin') return true;

  if (role === 'Company Admin') {
    return targetUserRole !== 'Super Admin';
  }

  if (role === 'Department Admin') {
    return !['Super Admin', 'Company Admin'].includes(targetUserRole || '');
  }

  return false;
};

export const canDeleteUser = (role: InternalRole, targetUserRole?: InternalRole): boolean => {
  return canEditUser(role, targetUserRole);
};

export const canAssignRole = (role: InternalRole, targetRole: InternalRole): boolean => {
  if (role === 'Super Admin') return true;

  if (role === 'Company Admin') {
    return targetRole !== 'Super Admin';
  }

  if (role === 'Department Admin') {
    return ['User', 'Viewer', 'Auditor'].includes(targetRole);
  }

  return false;
};

/**
 * Company Management Permissions
 */
export const canCreateCompany = (role: InternalRole): boolean => {
  return role === 'Super Admin';
};

export const canEditCompany = (role: InternalRole): boolean => {
  return role === 'Super Admin';
};

export const canDeleteCompany = (role: InternalRole): boolean => {
  return role === 'Super Admin';
};

/**
 * Department Management Permissions
 */
export const canCreateDepartment = (role: InternalRole): boolean => {
  return ['Super Admin', 'Company Admin'].includes(role);
};

export const canEditDepartment = (role: InternalRole): boolean => {
  return ['Super Admin', 'Company Admin'].includes(role);
};

export const canDeleteDepartment = (role: InternalRole): boolean => {
  return ['Super Admin', 'Company Admin'].includes(role);
};

/**
 * Audit Trail Permissions
 */
export const canViewAuditTrail = (role: InternalRole): boolean => {
  return true;
};

export const canDownloadAuditReport = (role: InternalRole): boolean => {
  return ['Super Admin', 'Company Admin', 'Department Admin', 'Auditor'].includes(role);
};

/**
 * Helper: Get available roles that current user can assign
 */
export const getAssignableRoles = (role: InternalRole): InternalRole[] => {
  if (role === 'Super Admin') {
    return ['Super Admin', 'Company Admin', 'Department Admin', 'User', 'Viewer', 'Auditor'];
  }

  if (role === 'Company Admin') {
    return ['Company Admin', 'Department Admin', 'User', 'Viewer', 'Auditor'];
  }

  if (role === 'Department Admin') {
    return ['User', 'Viewer', 'Auditor'];
  }

  return [];
};

/**
 * Helper: Check if document is read-only
 */
export const isDocumentReadOnly = (status?: string): boolean => {
  return ['Completed', 'Cancelled', 'Rejected', 'Expired'].includes(status || '');
};

/**
 * Helper: Check if document can accept signatures
 */
export const canDocumentAcceptSignatures = (status?: string): boolean => {
  return ['Sent for Signature', 'Viewed', 'Signed (Partial)'].includes(status || '');
};
