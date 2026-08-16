export interface RbacUser {
  id: string;
  fullName: string;
  email: string;
  roleId: string;
  branch: string;
  twoFaEnabled: boolean;
  active: boolean;
  lastActivityAt: string;
}

export const branchOptions = [
  { value: 'Downtown Flagship', label: 'Downtown Flagship' },
  { value: 'Suburban Outlet', label: 'Suburban Outlet' },
  { value: 'Airport Express Kiosk', label: 'Airport Express Kiosk' },
  { value: 'Central Warehouse A', label: 'Central Warehouse A' },
];

export const users: RbacUser[] = [
  {
    id: 'usr-101',
    fullName: 'Aarav Sharma',
    email: 'aarav.sharma@apexsupermarket.com',
    roleId: 'super-admin',
    branch: 'Downtown Flagship',
    twoFaEnabled: true,
    active: true,
    lastActivityAt: '2026-08-16T09:20:00+05:30',
  },
  {
    id: 'usr-102',
    fullName: 'Priya Nair',
    email: 'priya.nair@apexsupermarket.com',
    roleId: 'store-manager',
    branch: 'Downtown Flagship',
    twoFaEnabled: true,
    active: true,
    lastActivityAt: '2026-08-16T08:55:00+05:30',
  },
  {
    id: 'usr-103',
    fullName: 'Rohan Verma',
    email: 'rohan.verma@apexsupermarket.com',
    roleId: 'store-manager',
    branch: 'Suburban Outlet',
    twoFaEnabled: true,
    active: true,
    lastActivityAt: '2026-08-15T19:40:00+05:30',
  },
  {
    id: 'usr-104',
    fullName: 'Simran Kaur',
    email: 'simran.kaur@apexsupermarket.com',
    roleId: 'pos-cashier',
    branch: 'Suburban Outlet',
    twoFaEnabled: true,
    active: true,
    lastActivityAt: '2026-08-16T07:15:00+05:30',
  },
  {
    id: 'usr-105',
    fullName: 'Karthik Iyer',
    email: 'karthik.iyer@apexsupermarket.com',
    roleId: 'pos-cashier',
    branch: 'Airport Express Kiosk',
    twoFaEnabled: false,
    active: false,
    lastActivityAt: '2026-08-10T13:05:00+05:30',
  },
  {
    id: 'usr-106',
    fullName: 'Ananya Reddy',
    email: 'ananya.reddy@apexsupermarket.com',
    roleId: 'pos-cashier',
    branch: 'Downtown Flagship',
    twoFaEnabled: true,
    active: true,
    lastActivityAt: '2026-08-16T06:30:00+05:30',
  },
  {
    id: 'usr-107',
    fullName: 'Vikram Desai',
    email: 'vikram.desai@apexsupermarket.com',
    roleId: 'inventory-lead',
    branch: 'Central Warehouse A',
    twoFaEnabled: true,
    active: true,
    lastActivityAt: '2026-08-15T22:10:00+05:30',
  },
  {
    id: 'usr-108',
    fullName: 'Meera Pillai',
    email: 'meera.pillai@apexsupermarket.com',
    roleId: 'inventory-lead',
    branch: 'Central Warehouse A',
    twoFaEnabled: true,
    active: true,
    lastActivityAt: '2026-08-14T17:45:00+05:30',
  },
  {
    id: 'usr-109',
    fullName: 'Rajesh Khanna',
    email: 'rajesh.khanna@apexsupermarket.com',
    roleId: 'finance-auditor',
    branch: 'Downtown Flagship',
    twoFaEnabled: true,
    active: true,
    lastActivityAt: '2026-08-15T11:25:00+05:30',
  },
  {
    id: 'usr-110',
    fullName: 'Divya Menon',
    email: 'divya.menon@apexsupermarket.com',
    roleId: 'crm-loyalty-spec',
    branch: 'Airport Express Kiosk',
    twoFaEnabled: true,
    active: true,
    lastActivityAt: '2026-08-13T09:50:00+05:30',
  },
];
