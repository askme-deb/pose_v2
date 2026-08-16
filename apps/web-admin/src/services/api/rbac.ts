import { apiClient } from './client';
import { useAuthStore } from '../../store/useAuthStore';

export type RbacModuleKey = 'pos' | 'inventory' | 'finance' | 'crm';
export type RbacAction = 'view' | 'create' | 'edit' | 'delete' | 'approve' | 'export';
export type ModulePermissionSet = Record<RbacAction, boolean>;
export type RbacPermissions = Record<RbacModuleKey, ModulePermissionSet>;

export interface LiveRole {
  id: string;
  title: string;
  code: string;
  accessScope: string;
  colorTheme: string;
  description: string;
  isSystem: boolean;
  permissions: RbacPermissions;
}

export interface LiveRbacUser {
  id: string;
  fullName: string;
  email: string;
  roleId: string;
  branch: string;
  branchId: string;
  twoFaEnabled: boolean;
  active: boolean;
  lastActivityAt: string | null;
}

export type AuditRiskRating = 'LOW' | 'MEDIUM' | 'HIGH';

export interface LiveAuditLogEntry {
  id: string;
  timestamp: string;
  actor: string;
  eventType: string;
  details: string;
  ipAddress: string;
  riskRating: AuditRiskRating;
}

interface ApiRole {
  id: string;
  title: string;
  code: string;
  accessScope: string;
  colorTheme: string;
  description: string | null;
  isSystem: boolean;
  permissions: RbacPermissions;
}

interface ApiUser {
  id: string;
  name: string;
  email: string;
  rbacRoleId: string | null;
  rbacRole: { id: string; title: string } | null;
  storeId: string | null;
  store: { id: string; name: string } | null;
  twoFaEnabled: boolean;
  isActive: boolean;
  lastActivityAt: string | null;
}

interface ApiAuditLog {
  id: string;
  timestamp: string;
  actor: string;
  eventType: string;
  details: string;
  ipAddress: string | null;
  riskRating: AuditRiskRating;
}

function toLiveRole(r: ApiRole): LiveRole {
  return {
    id: r.id,
    title: r.title,
    code: r.code,
    accessScope: r.accessScope,
    colorTheme: r.colorTheme,
    description: r.description ?? '',
    isSystem: r.isSystem,
    permissions: r.permissions,
  };
}

function toLiveUser(u: ApiUser): LiveRbacUser {
  return {
    id: u.id,
    fullName: u.name,
    email: u.email,
    roleId: u.rbacRoleId ?? '',
    branch: u.store?.name ?? '',
    branchId: u.storeId ?? '',
    twoFaEnabled: u.twoFaEnabled,
    active: u.isActive,
    lastActivityAt: u.lastActivityAt,
  };
}

function toLiveLog(l: ApiAuditLog): LiveAuditLogEntry {
  return {
    id: l.id,
    timestamp: l.timestamp,
    actor: l.actor,
    eventType: l.eventType,
    details: l.details,
    ipAddress: l.ipAddress ?? '',
    riskRating: l.riskRating,
  };
}

function actorName(): string {
  return useAuthStore.getState().user?.name ?? 'System Administrator';
}

export async function listRoles(): Promise<LiveRole[]> {
  const roles = await apiClient.get<ApiRole[]>('/api/auth/roles');
  return roles.map(toLiveRole);
}

export interface RoleInput {
  title: string;
  code: string;
  accessScope: string;
  colorTheme?: string;
  description?: string;
  permissions: RbacPermissions;
}

export async function createRole(input: RoleInput): Promise<LiveRole> {
  const role = await apiClient.post<ApiRole>('/api/auth/roles', { ...input, actorName: actorName() });
  return toLiveRole(role);
}

export async function updateRole(id: string, input: Partial<RoleInput>): Promise<LiveRole> {
  const role = await apiClient.put<ApiRole>(`/api/auth/roles/${id}`, { ...input, actorName: actorName() });
  return toLiveRole(role);
}

export async function deleteRole(id: string): Promise<void> {
  await apiClient.delete(`/api/auth/roles/${id}?actorName=${encodeURIComponent(actorName())}`);
}

export async function grantAllRead(): Promise<LiveRole[]> {
  const roles = await apiClient.post<ApiRole[]>('/api/auth/roles/grant-all-read', { actorName: actorName() });
  return roles.map(toLiveRole);
}

export async function resetMatrix(): Promise<LiveRole[]> {
  const roles = await apiClient.post<ApiRole[]>('/api/auth/roles/reset-matrix', { actorName: actorName() });
  return roles.map(toLiveRole);
}

export async function listRbacUsers(): Promise<LiveRbacUser[]> {
  const users = await apiClient.get<ApiUser[]>('/api/auth/users');
  return users.map(toLiveUser);
}

export interface RbacUserInput {
  name: string;
  email: string;
  rbacRoleId: string;
  storeId?: string;
  twoFaEnabled?: boolean;
  isActive?: boolean;
}

export async function createRbacUser(input: RbacUserInput): Promise<LiveRbacUser> {
  const user = await apiClient.post<ApiUser>('/api/auth/users', { ...input, actorName: actorName() });
  return toLiveUser(user);
}

export async function updateRbacUser(id: string, input: Partial<RbacUserInput>): Promise<LiveRbacUser> {
  const user = await apiClient.put<ApiUser>(`/api/auth/users/${id}`, { ...input, actorName: actorName() });
  return toLiveUser(user);
}

export async function listAuditLogs(): Promise<LiveAuditLogEntry[]> {
  const logs = await apiClient.get<ApiAuditLog[]>('/api/auth/audit-logs');
  return logs.map(toLiveLog);
}
