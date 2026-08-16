export type AuditRiskRating = 'low' | 'medium' | 'high';

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  actor: string;
  eventType: string;
  details: string;
  ipAddress: string;
  riskRating: AuditRiskRating;
}

export const auditLogs: AuditLogEntry[] = [
  {
    id: 'log-901',
    timestamp: '2026-08-16T09:15:00+05:30',
    actor: 'Aarav Sharma',
    eventType: 'ROLE_MODIFIED',
    details: 'Updated POS Terminal Cashier permission: Void Invoice toggled to Approved only',
    ipAddress: '192.168.1.104',
    riskRating: 'medium',
  },
  {
    id: 'log-902',
    timestamp: '2026-08-16T08:40:00+05:30',
    actor: 'Priya Nair',
    eventType: 'USER_REASSIGNED',
    details: 'Promoted Simran Kaur from POS Cashier to Assistant Store Manager candidate',
    ipAddress: '192.168.1.112',
    riskRating: 'low',
  },
  {
    id: 'log-903',
    timestamp: '2026-08-16T07:20:00+05:30',
    actor: 'System Security',
    eventType: '2FA_ENFORCED',
    details: 'Mandated 2-Factor Authentication for Ananya Reddy (ROLE_CASHIER)',
    ipAddress: '10.0.0.1',
    riskRating: 'low',
  },
  {
    id: 'log-904',
    timestamp: '2026-08-16T06:05:00+05:30',
    actor: 'Aarav Sharma',
    eventType: 'LOGIN_SUCCESS',
    details: 'Super Administrator authenticated via hardware security key from Downtown Flagship',
    ipAddress: '192.168.1.104',
    riskRating: 'low',
  },
  {
    id: 'log-905',
    timestamp: '2026-08-15T22:30:00+05:30',
    actor: 'Aarav Sharma',
    eventType: 'ROLE_CREATED',
    details: 'Created new custom role: CRM & Loyalty Specialist (ROLE_CRM_SPEC)',
    ipAddress: '192.168.1.104',
    riskRating: 'low',
  },
  {
    id: 'log-906',
    timestamp: '2026-08-15T19:45:00+05:30',
    actor: 'Rohan Verma',
    eventType: 'LOGIN_SUCCESS',
    details: 'Store General Manager authenticated from Suburban Outlet terminal',
    ipAddress: '192.168.4.22',
    riskRating: 'low',
  },
  {
    id: 'log-907',
    timestamp: '2026-08-15T16:10:00+05:30',
    actor: 'Rajesh Khanna',
    eventType: 'PERMISSION_ESCALATION_ATTEMPT',
    details: 'Attempted to access Ledger Edit without Finance Auditor approval scope, request blocked',
    ipAddress: '192.168.2.45',
    riskRating: 'high',
  },
  {
    id: 'log-908',
    timestamp: '2026-08-15T14:30:00+05:30',
    actor: 'Rajesh Khanna',
    eventType: 'SECURITY_AUDIT',
    details: 'Exported GSTR-1 Permission Audit Matrix for Q2 Compliance review',
    ipAddress: '192.168.2.45',
    riskRating: 'low',
  },
  {
    id: 'log-909',
    timestamp: '2026-08-15T11:25:00+05:30',
    actor: 'Vikram Desai',
    eventType: 'USER_REASSIGNED',
    details: 'Transferred Meera Pillai branch authorization to Central Warehouse A',
    ipAddress: '192.168.5.11',
    riskRating: 'low',
  },
  {
    id: 'log-910',
    timestamp: '2026-08-14T20:15:00+05:30',
    actor: 'System Security',
    eventType: 'ACCOUNT_SUSPENDED',
    details: 'Auto-suspended Karthik Iyer account after 5 failed login attempts, 2FA disabled flag raised',
    ipAddress: '10.0.0.1',
    riskRating: 'high',
  },
  {
    id: 'log-911',
    timestamp: '2026-08-14T17:50:00+05:30',
    actor: 'Priya Nair',
    eventType: 'ROLE_MODIFIED',
    details: 'Granted Inventory & Stock Lead role Stock Adjust approval privilege',
    ipAddress: '192.168.1.112',
    riskRating: 'medium',
  },
  {
    id: 'log-912',
    timestamp: '2026-08-13T18:05:00+05:30',
    actor: 'Divya Menon',
    eventType: 'LOGIN_SUCCESS',
    details: 'CRM & Loyalty Specialist authenticated from Airport Express Kiosk',
    ipAddress: '192.168.6.30',
    riskRating: 'low',
  },
  {
    id: 'log-913',
    timestamp: '2026-08-12T12:40:00+05:30',
    actor: 'Aarav Sharma',
    eventType: 'TENANT_SETTINGS_CHANGED',
    details: 'Updated white label branding parameters and enforced org-wide password rotation policy',
    ipAddress: '192.168.1.104',
    riskRating: 'medium',
  },
  {
    id: 'log-914',
    timestamp: '2026-08-11T09:55:00+05:30',
    actor: 'System Security',
    eventType: 'LOGIN_FAILED',
    details: 'Three consecutive failed login attempts detected for account rajesh.khanna@apexsupermarket.com',
    ipAddress: '203.0.113.77',
    riskRating: 'high',
  },
  {
    id: 'log-915',
    timestamp: '2026-08-10T15:20:00+05:30',
    actor: 'Aarav Sharma',
    eventType: 'ROLE_DELETED',
    details: 'Removed deprecated custom role Weekend Shift Supervisor (ROLE_WEEKEND_SUP)',
    ipAddress: '192.168.1.104',
    riskRating: 'medium',
  },
];
