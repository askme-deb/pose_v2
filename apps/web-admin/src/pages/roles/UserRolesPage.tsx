import { FormEvent, useMemo, useState } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import {
  Search,
  Download,
  ShieldPlus,
  Shield,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Users as UsersIcon,
  Lock,
  FileText,
  Edit3,
  Trash2,
} from 'lucide-react';
import {
  Avatar,
  Badge,
  Checkbox,
  DataTable,
  Drawer,
  EmptyState,
  GlassCard,
  Input,
  KpiCard,
  Modal,
  PillTabs,
  Select,
  Textarea,
  cn,
  useToast,
} from '@pospe/ui-library';
import {
  roles as defaultRoles,
  accessScopeOptions,
  colorThemeOptions,
  rbacModules,
  rbacActions,
  RbacRole,
  RbacPermissions,
  RbacModuleKey,
  RbacAction,
  RbacColorTheme,
} from '../../services/mockData/roles';
import { users as defaultUsers, branchOptions, RbacUser } from '../../services/mockData/users';
import { auditLogs as defaultAuditLogs, AuditLogEntry } from '../../services/mockData/auditLogs';
import { formatDateTime } from '../../utils/format';
import { downloadCSV } from '../../utils/csv';

type RbacTab = 'roles' | 'matrix' | 'users' | 'audit';

interface RoleFormState {
  title: string;
  code: string;
  accessScope: string;
  colorTheme: RbacColorTheme;
  description: string;
  permissions: RbacPermissions;
}

interface RoleFormErrors {
  title?: string;
  code?: string;
}

interface UserFormState {
  fullName: string;
  email: string;
  roleId: string;
  branch: string;
  twoFaEnabled: boolean;
  active: boolean;
}

interface UserFormErrors {
  fullName?: string;
  email?: string;
}

const colorMap: Record<RbacColorTheme, { bg: string; text: string; border: string; dot: string }> = {
  purple: { bg: 'bg-purple-500/10', text: 'text-purple-600 dark:text-purple-400', border: 'border-purple-500/20', dot: 'bg-purple-600' },
  blue: { bg: 'bg-blue-500/10', text: 'text-blue-600 dark:text-blue-400', border: 'border-blue-500/20', dot: 'bg-blue-600' },
  indigo: { bg: 'bg-indigo-500/10', text: 'text-indigo-600 dark:text-indigo-400', border: 'border-indigo-500/20', dot: 'bg-indigo-600' },
  emerald: { bg: 'bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-500/20', dot: 'bg-emerald-600' },
  amber: { bg: 'bg-amber-500/10', text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-500/20', dot: 'bg-amber-600' },
  pink: { bg: 'bg-pink-500/10', text: 'text-pink-600 dark:text-pink-400', border: 'border-pink-500/20', dot: 'bg-pink-600' },
  teal: { bg: 'bg-teal-500/10', text: 'text-teal-600 dark:text-teal-400', border: 'border-teal-500/20', dot: 'bg-teal-600' },
};

const riskBadgeColor: Record<AuditLogEntry['riskRating'], 'emerald' | 'amber' | 'red'> = {
  low: 'emerald',
  medium: 'amber',
  high: 'red',
};

const defaultNewRolePermissions: RbacPermissions = {
  pos: { view: true, create: true, edit: true, delete: false, approve: false, export: false },
  inventory: { view: true, create: false, edit: false, delete: false, approve: false, export: false },
  finance: { view: false, create: false, edit: false, delete: false, approve: false, export: false },
  crm: { view: true, create: true, edit: false, delete: false, approve: false, export: false },
};

function clonePermissions(p: RbacPermissions): RbacPermissions {
  return {
    pos: { ...p.pos },
    inventory: { ...p.inventory },
    finance: { ...p.finance },
    crm: { ...p.crm },
  };
}

const emptyRoleForm: RoleFormState = {
  title: '',
  code: '',
  accessScope: accessScopeOptions[0].value,
  colorTheme: 'teal',
  description: '',
  permissions: clonePermissions(defaultNewRolePermissions),
};

const emptyUserForm: UserFormState = {
  fullName: '',
  email: '',
  roleId: defaultRoles[0]?.id ?? '',
  branch: branchOptions[0]?.value ?? '',
  twoFaEnabled: true,
  active: true,
};

function permSummary(role: RbacRole) {
  return {
    pos: role.permissions.pos.create ? 'Full' : role.permissions.pos.view ? 'Read' : 'None',
    inventory: role.permissions.inventory.edit ? 'Manage' : role.permissions.inventory.view ? 'View' : 'None',
    finance: role.permissions.finance.view ? 'Granted' : 'None',
    crm: role.permissions.crm.view ? 'Active' : 'Locked',
  };
}

export default function UserRolesPage() {
  const { showToast } = useToast();

  const [rolesState, setRolesState] = useState<RbacRole[]>(() => defaultRoles.map((r) => ({ ...r, permissions: clonePermissions(r.permissions) })));
  const [usersState, setUsersState] = useState<RbacUser[]>(() => defaultUsers.map((u) => ({ ...u })));
  const [auditState, setAuditState] = useState<AuditLogEntry[]>(() => defaultAuditLogs.map((l) => ({ ...l })));

  const [activeTab, setActiveTab] = useState<RbacTab>('roles');
  const [search, setSearch] = useState('');
  const [scopeFilter, setScopeFilter] = useState('all');

  const [roleDrawerOpen, setRoleDrawerOpen] = useState(false);
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [roleForm, setRoleForm] = useState<RoleFormState>(emptyRoleForm);
  const [roleFormErrors, setRoleFormErrors] = useState<RoleFormErrors>({});

  const [userModalOpen, setUserModalOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [userForm, setUserForm] = useState<UserFormState>(emptyUserForm);
  const [userFormErrors, setUserFormErrors] = useState<UserFormErrors>({});

  const defaultRoleIds = useMemo(() => new Set(defaultRoles.map((r) => r.id)), []);
  const roleTitleById = useMemo(() => new Map(rolesState.map((r) => [r.id, r.title])), [rolesState]);
  const roleSelectOptions = useMemo(() => rolesState.map((r) => ({ value: r.id, label: r.title })), [rolesState]);
  const assignedCountByRole = useMemo(() => {
    const map = new Map<string, number>();
    usersState.forEach((u) => map.set(u.roleId, (map.get(u.roleId) ?? 0) + 1));
    return map;
  }, [usersState]);

  const filteredRoles = useMemo(() => {
    let list = rolesState;
    if (scopeFilter !== 'all') list = list.filter((r) => r.accessScope === scopeFilter);
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (r) => r.title.toLowerCase().includes(q) || r.code.toLowerCase().includes(q) || r.description.toLowerCase().includes(q),
      );
    }
    return list;
  }, [rolesState, scopeFilter, search]);

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return usersState;
    return usersState.filter(
      (u) =>
        u.fullName.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (roleTitleById.get(u.roleId) ?? '').toLowerCase().includes(q),
    );
  }, [usersState, search, roleTitleById]);

  // KPI calculations
  const customRoleCount = rolesState.filter((r) => !defaultRoleIds.has(r.id)).length;
  const activeUserCount = usersState.filter((u) => u.active).length;
  const branchCount = new Set(usersState.map((u) => u.branch)).size;
  const twoFaPct = usersState.length ? Math.round((usersState.filter((u) => u.twoFaEnabled).length / usersState.length) * 100) : 0;
  const latestAuditTime = useMemo(
    () => auditState.reduce((max, l) => Math.max(max, new Date(l.timestamp).getTime()), 0),
    [auditState],
  );
  const audit24hCount = useMemo(
    () => auditState.filter((l) => latestAuditTime - new Date(l.timestamp).getTime() <= 24 * 60 * 60 * 1000).length,
    [auditState, latestAuditTime],
  );
  const highRiskCount = auditState.filter((l) => l.riskRating === 'high').length;

  const tabOptions = useMemo(
    () => [
      { value: 'roles', label: `Roles Overview (${rolesState.length})` },
      { value: 'matrix', label: 'Permission Matrix' },
      { value: 'users', label: `User Assignments (${usersState.length})` },
      { value: 'audit', label: `Audit Logs (${auditState.length})` },
    ],
    [rolesState.length, usersState.length, auditState.length],
  );

  // Role drawer handlers
  function openRoleDrawer(role?: RbacRole) {
    if (role) {
      setEditingRoleId(role.id);
      setRoleForm({
        title: role.title,
        code: role.code,
        accessScope: role.accessScope,
        colorTheme: role.colorTheme,
        description: role.description,
        permissions: clonePermissions(role.permissions),
      });
    } else {
      setEditingRoleId(null);
      setRoleForm({ ...emptyRoleForm, permissions: clonePermissions(defaultNewRolePermissions) });
    }
    setRoleFormErrors({});
    setRoleDrawerOpen(true);
  }

  function closeRoleDrawer() {
    setRoleDrawerOpen(false);
  }

  function toggleFormPermission(moduleKey: RbacModuleKey, action: RbacAction, checked: boolean) {
    setRoleForm((f) => ({
      ...f,
      permissions: { ...f.permissions, [moduleKey]: { ...f.permissions[moduleKey], [action]: checked } },
    }));
  }

  function handleSaveRole(e: FormEvent) {
    e.preventDefault();
    const title = roleForm.title.trim();
    const code = roleForm.code.trim();
    const errors: RoleFormErrors = {};
    if (!title) errors.title = 'Role title is required';
    if (!code) errors.code = 'Role code is required';
    if (Object.keys(errors).length) {
      setRoleFormErrors(errors);
      return;
    }

    if (editingRoleId) {
      setRolesState((prev) =>
        prev.map((r) =>
          r.id === editingRoleId
            ? {
                ...r,
                title,
                code,
                accessScope: roleForm.accessScope,
                colorTheme: roleForm.colorTheme,
                description: roleForm.description.trim(),
                permissions: roleForm.permissions,
              }
            : r,
        ),
      );
      showToast(`Role '${title}' updated successfully!`, 'success');
    } else {
      const newRole: RbacRole = {
        id: `role-${Date.now()}`,
        title,
        code,
        accessScope: roleForm.accessScope,
        colorTheme: roleForm.colorTheme,
        description: roleForm.description.trim(),
        isSystem: false,
        permissions: roleForm.permissions,
      };
      setRolesState((prev) => [...prev, newRole]);
      setAuditState((prev) => [
        {
          id: `log-${Date.now()}`,
          timestamp: new Date().toISOString(),
          actor: 'Aarav Sharma',
          eventType: 'ROLE_CREATED',
          details: `Created custom role ${title} (${code})`,
          ipAddress: '192.168.1.104',
          riskRating: 'low',
        },
        ...prev,
      ]);
      showToast(`New Custom Role '${title}' created!`, 'success');
    }
    closeRoleDrawer();
  }

  function handleDeleteRole(role: RbacRole) {
    if (role.isSystem) {
      showToast('System critical roles cannot be deleted!', 'danger');
      return;
    }
    setRolesState((prev) => prev.filter((r) => r.id !== role.id));
    showToast(`Role '${role.title}' deleted`, 'warning');
  }

  // Permission matrix handlers
  function handleToggleMatrix(roleId: string, moduleKey: RbacModuleKey, action: RbacAction, checked: boolean) {
    const role = rolesState.find((r) => r.id === roleId);
    setRolesState((prev) =>
      prev.map((r) =>
        r.id === roleId
          ? { ...r, permissions: { ...r.permissions, [moduleKey]: { ...r.permissions[moduleKey], [action]: checked } } }
          : r,
      ),
    );
    if (role) {
      showToast(`Updated ${role.title}: ${moduleKey.toUpperCase()} > ${action.toUpperCase()} set to ${checked ? 'Allowed' : 'Revoked'}`, 'info');
    }
  }

  function handleGrantAllRead() {
    setRolesState((prev) =>
      prev.map((r) => ({
        ...r,
        permissions: {
          pos: { ...r.permissions.pos, view: true },
          inventory: { ...r.permissions.inventory, view: true },
          finance: { ...r.permissions.finance, view: true },
          crm: { ...r.permissions.crm, view: true },
        },
      })),
    );
    showToast('Granted View access across all roles!', 'success');
  }

  function handleResetMatrix() {
    setRolesState((prev) =>
      prev.map((r) => {
        const def = defaultRoles.find((d) => d.id === r.id);
        return def ? { ...r, permissions: clonePermissions(def.permissions) } : r;
      }),
    );
    showToast('Reset RBAC Matrix to system default profiles', 'warning');
  }

  // User modal handlers
  function openUserModal(user?: RbacUser) {
    if (user) {
      setEditingUserId(user.id);
      setUserForm({
        fullName: user.fullName,
        email: user.email,
        roleId: user.roleId,
        branch: user.branch,
        twoFaEnabled: user.twoFaEnabled,
        active: user.active,
      });
    } else {
      setEditingUserId(null);
      setUserForm({ ...emptyUserForm, roleId: rolesState[0]?.id ?? '' });
    }
    setUserFormErrors({});
    setUserModalOpen(true);
  }

  function closeUserModal() {
    setUserModalOpen(false);
  }

  function handleSaveUser(e: FormEvent) {
    e.preventDefault();
    const fullName = userForm.fullName.trim();
    const email = userForm.email.trim();
    const errors: UserFormErrors = {};
    if (!fullName) errors.fullName = 'Full name is required';
    if (!email) errors.email = 'Email address is required';
    if (Object.keys(errors).length) {
      setUserFormErrors(errors);
      return;
    }

    if (editingUserId) {
      setUsersState((prev) =>
        prev.map((u) =>
          u.id === editingUserId
            ? { ...u, fullName, email, roleId: userForm.roleId, branch: userForm.branch, twoFaEnabled: userForm.twoFaEnabled, active: userForm.active }
            : u,
        ),
      );
      showToast(`Updated permissions for ${fullName}`, 'success');
    } else {
      const newUser: RbacUser = {
        id: `usr-${Date.now()}`,
        fullName,
        email,
        roleId: userForm.roleId,
        branch: userForm.branch,
        twoFaEnabled: userForm.twoFaEnabled,
        active: userForm.active,
        lastActivityAt: new Date().toISOString(),
      };
      setUsersState((prev) => [newUser, ...prev]);
      showToast(`User account created for ${fullName}`, 'success');
    }
    closeUserModal();
  }

  // Exports
  function handleExportRBAC() {
    downloadCSV(
      'ApexPOS_RBAC_Roles_Matrix.csv',
      ['Role Title', 'Role Code', 'Access Scope', 'POS View', 'POS Create', 'Inventory View', 'Inventory Edit', 'Finance View', 'CRM View'],
      rolesState.map((r) => [
        r.title,
        r.code,
        r.accessScope,
        String(r.permissions.pos.view),
        String(r.permissions.pos.create),
        String(r.permissions.inventory.view),
        String(r.permissions.inventory.edit),
        String(r.permissions.finance.view),
        String(r.permissions.crm.view),
      ]),
    );
    showToast('RBAC Roles & Matrix CSV Exported!', 'success');
  }

  function handleExportLogs() {
    downloadCSV(
      'ApexPOS_RBAC_Audit_Logs.csv',
      ['Timestamp', 'Actor', 'Event Type', 'Details', 'IP Address', 'Risk Rating'],
      auditState.map((l) => [formatDateTime(l.timestamp), l.actor, l.eventType, l.details, l.ipAddress, l.riskRating.toUpperCase()]),
    );
    showToast('Security audit log exported to CSV', 'success');
  }

  const userColumns: ColumnDef<RbacUser, any>[] = [
    {
      header: 'User Name & Email',
      accessorKey: 'fullName',
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <Avatar name={row.original.fullName} className="bg-gradient-to-tr from-teal-500 to-emerald-600" />
          <div>
            <h4 className="font-bold text-slate-900 dark:text-white">{row.original.fullName}</h4>
            <p className="text-[10px] text-slate-400 font-mono">{row.original.email}</p>
          </div>
        </div>
      ),
    },
    {
      header: 'Assigned Role',
      id: 'role',
      accessorFn: (u) => roleTitleById.get(u.roleId) ?? 'Unknown Role',
      cell: ({ row }) => <Badge color="teal">{roleTitleById.get(row.original.roleId) ?? 'Unknown Role'}</Badge>,
    },
    {
      header: 'Authorized Store Branch',
      accessorKey: 'branch',
      cell: ({ getValue }) => <span className="text-slate-600 dark:text-slate-300 font-semibold">{getValue() as string}</span>,
    },
    {
      header: '2FA Status',
      id: 'twoFa',
      accessorFn: (u) => u.twoFaEnabled,
      cell: ({ row }) =>
        row.original.twoFaEnabled ? (
          <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400">
            <ShieldCheck className="w-3.5 h-3.5" /> Enforced
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-amber-500">
            <AlertTriangle className="w-3.5 h-3.5" /> Optional
          </span>
        ),
    },
    {
      header: 'Account Status',
      id: 'status',
      accessorFn: (u) => u.active,
      cell: ({ row }) => (
        <Badge color={row.original.active ? 'emerald' : 'red'} pill>
          {row.original.active ? 'Active' : 'Suspended'}
        </Badge>
      ),
    },
    {
      header: 'Last Activity',
      accessorKey: 'lastActivityAt',
      cell: ({ getValue }) => <span className="text-slate-400 text-[11px]">{formatDateTime(getValue() as string)}</span>,
    },
    {
      header: 'Actions',
      id: 'actions',
      cell: ({ row }) => (
        <button
          onClick={() => openUserModal(row.original)}
          className="px-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 font-bold text-[11px] transition"
        >
          Edit Role
        </button>
      ),
    },
  ];

  const auditColumns: ColumnDef<AuditLogEntry, any>[] = [
    {
      header: 'Timestamp',
      accessorKey: 'timestamp',
      cell: ({ getValue }) => <span className="text-slate-400 font-mono text-[11px]">{formatDateTime(getValue() as string)}</span>,
    },
    {
      header: 'Actor',
      accessorKey: 'actor',
      cell: ({ getValue }) => <span className="font-bold text-slate-900 dark:text-white">{getValue() as string}</span>,
    },
    {
      header: 'Event Type',
      accessorKey: 'eventType',
      cell: ({ getValue }) => (
        <span className="px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-400 font-mono font-bold text-[10px]">
          {getValue() as string}
        </span>
      ),
    },
    {
      header: 'Event Details & Target',
      accessorKey: 'details',
      cell: ({ getValue }) => <span className="text-slate-600 dark:text-slate-300">{getValue() as string}</span>,
    },
    {
      header: 'IP Address',
      accessorKey: 'ipAddress',
      cell: ({ getValue }) => <span className="font-mono text-slate-400 text-[10px]">{getValue() as string}</span>,
    },
    {
      header: 'Risk Rating',
      id: 'risk',
      accessorKey: 'riskRating',
      cell: ({ row }) => (
        <Badge color={riskBadgeColor[row.original.riskRating]} pill>
          {row.original.riskRating.toUpperCase()} RISK
        </Badge>
      ),
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <GlassCard className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl lg:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Roles & Security RBAC</h1>
            <Badge color="teal" dot pill>
              {rolesState.length} Roles Defined • {activeUserCount} System Users Active
            </Badge>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Configure Role-Based Access Controls, manage granular module permissions, reassign user credentials, and audit security access
            logs.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search role, permission, module..."
              className="pl-10 pr-4 py-2 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-teal-500 w-64 shadow-inner"
            />
          </div>

          <select
            value={scopeFilter}
            onChange={(e) => setScopeFilter(e.target.value)}
            className="px-3.5 py-2 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer"
          >
            <option value="all">All Access Scopes</option>
            {accessScopeOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>

          <PillTabs options={tabOptions} value={activeTab} onChange={(v) => setActiveTab(v as RbacTab)} />

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportRBAC}
              className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 hover:border-teal-500 transition shadow-sm"
            >
              <Download className="w-3.5 h-3.5 text-teal-600" />
              <span>Export RBAC</span>
            </button>
            <button
              onClick={() => openRoleDrawer()}
              className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white text-xs font-bold shadow-lg shadow-teal-500/25 transition transform hover:scale-[1.02]"
            >
              <ShieldPlus className="w-4 h-4" />
              <span>+ Create Custom Role</span>
            </button>
          </div>
        </div>
      </GlassCard>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icon={Shield} label="Defined System Roles" value={`${rolesState.length} Roles`} delta={`${customRoleCount} Custom Role${customRoleCount === 1 ? '' : 's'} Created`} deltaTone="neutral" color="cyan" />
        <KpiCard icon={UsersIcon} label="Assigned User Accounts" value={`${usersState.length} Users`} delta={`Across ${branchCount} Store Branches`} deltaTone="neutral" color="blue" />
        <KpiCard icon={Lock} label="2FA Security Status" value={`${twoFaPct}% Enforced`} delta="Enterprise RBAC Compliant" deltaTone="positive" color="emerald" />
        <KpiCard
          icon={FileText}
          label="24h Security Audit Logs"
          value={`${audit24hCount} Events`}
          delta={highRiskCount === 0 ? 'Zero Privilege Escalation Errors' : `${highRiskCount} High Risk Event${highRiskCount > 1 ? 's' : ''} Flagged`}
          deltaTone={highRiskCount === 0 ? 'positive' : 'negative'}
          color="purple"
        />
      </div>

      {/* TAB 1: Roles Overview */}
      {activeTab === 'roles' && (
        <div className="space-y-4">
          {filteredRoles.length === 0 ? (
            <GlassCard>
              <EmptyState icon={ShieldAlert} title="No RBAC roles matched your search or scope filter" />
            </GlassCard>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredRoles.map((role) => {
                const c = colorMap[role.colorTheme];
                const summary = permSummary(role);
                const assigned = assignedCountByRole.get(role.id) ?? 0;
                return (
                  <div
                    key={role.id}
                    className="glass-card p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 flex flex-col justify-between hover:border-teal-500/50 transition group space-y-4"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className={cn('w-10 h-10 rounded-2xl flex items-center justify-center', c.bg, c.text)}>
                            {role.isSystem ? <ShieldCheck className="w-5 h-5" /> : <Shield className="w-5 h-5" />}
                          </div>
                          <div>
                            <h3 className="font-extrabold text-sm text-slate-900 dark:text-white group-hover:text-teal-600 transition">{role.title}</h3>
                            <p className="text-[10px] font-mono text-slate-400">{role.code}</p>
                          </div>
                        </div>
                        <span className={cn('px-2 py-0.5 rounded-lg text-[10px] font-bold border', c.bg, c.text, c.border)}>{role.accessScope}</span>
                      </div>

                      <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{role.description}</p>

                      <div className="flex flex-wrap gap-1.5 pt-1">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-600 dark:text-slate-300">
                          🛒 POS: {summary.pos}
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-600 dark:text-slate-300">
                          📦 Inv: {summary.inventory}
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-600 dark:text-slate-300">
                          💰 Fin: {summary.finance}
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-600 dark:text-slate-300">
                          👥 CRM: {summary.crm}
                        </span>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={cn('w-2 h-2 rounded-full', c.dot)} />
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{assigned} Assigned Users</span>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openRoleDrawer(role)}
                          title="Edit Permissions"
                          className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-teal-600 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        {!role.isSystem ? (
                          <button
                            onClick={() => handleDeleteRole(role)}
                            title="Delete Role"
                            className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-red-500 hover:bg-red-500/10 transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        ) : (
                          <span className="text-[10px] text-slate-400 font-bold px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg">System Role</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Permission Matrix */}
      {activeTab === 'matrix' && (
        <GlassCard className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/60 dark:border-slate-800 pb-4">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Granular Permission Matrix Grid</h3>
              <p className="text-xs text-slate-400">
                Toggle real-time access privileges (View, Create, Edit, Delete, Approve, Export) across system modules for each defined
                role.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleGrantAllRead}
                className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 font-bold text-xs transition"
              >
                Grant All Read
              </button>
              <button
                onClick={handleResetMatrix}
                className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 font-bold text-xs transition"
              >
                Reset Matrix
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] uppercase tracking-wider text-slate-400 font-extrabold bg-slate-50/50 dark:bg-slate-900/50">
                  <th className="py-3 px-4 rounded-l-xl">Module & Action Scope</th>
                  {rolesState.map((r) => (
                    <th key={r.id} className="py-3 px-4 whitespace-nowrap">
                      {r.title}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/60 dark:divide-slate-800/60 font-medium">
                {rbacModules.flatMap((mod) =>
                  rbacActions.map((action) => (
                    <tr key={`${mod.key}-${action}`} className="hover:bg-slate-50/80 dark:hover:bg-slate-900/50 transition">
                      <td className="py-2.5 px-4 font-bold text-slate-800 dark:text-slate-200">
                        <div className="flex items-center gap-2">
                          <span className="text-xs">
                            {mod.icon} {mod.matrixLabel}
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[9px] text-slate-500 font-mono">
                            {action.toUpperCase()}
                          </span>
                        </div>
                      </td>
                      {rolesState.map((role) => {
                        const checked = role.permissions[mod.key][action];
                        const disabled = role.id === 'super-admin';
                        return (
                          <td key={role.id} className="py-2.5 px-4">
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                checked={checked}
                                disabled={disabled}
                                onChange={(e) => handleToggleMatrix(role.id, mod.key, action, e.target.checked)}
                                className="sr-only peer"
                              />
                              <div className="w-8 h-4 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all dark:after:border-slate-600 peer-checked:bg-teal-600 peer-disabled:opacity-50" />
                            </label>
                          </td>
                        );
                      })}
                    </tr>
                  )),
                )}
              </tbody>
            </table>
          </div>
        </GlassCard>
      )}

      {/* TAB 3: User Assignments */}
      {activeTab === 'users' && (
        <GlassCard className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-slate-800 pb-4">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Active System User Accounts & Role Mapping</h3>
              <p className="text-xs text-slate-400">View personnel assigned to system roles, security status, and branch authorizations.</p>
            </div>
            <button
              onClick={() => openUserModal()}
              className="px-3.5 py-1.5 rounded-xl bg-blue-600 text-white font-bold text-xs shadow-md hover:bg-blue-700 transition"
            >
              + Add User Account
            </button>
          </div>

          <DataTable columns={userColumns} data={filteredUsers} emptyTitle="No users found" emptyDescription="Try adjusting your search terms." />
        </GlassCard>
      )}

      {/* TAB 4: Audit Logs */}
      {activeTab === 'audit' && (
        <GlassCard className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-slate-800 pb-4">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Real-Time Security Audit Trail & Access Logs</h3>
              <p className="text-xs text-slate-400">
                Immutable ledger of administrative role modifications, user privilege elevations, and login authentications.
              </p>
            </div>
            <button
              onClick={handleExportLogs}
              className="px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 font-bold text-xs hover:bg-slate-200 dark:hover:bg-slate-700 transition"
            >
              Export Logs
            </button>
          </div>

          <DataTable columns={auditColumns} data={auditState} emptyTitle="No audit events" emptyDescription="Security events will appear here as they occur." />
        </GlassCard>
      )}

      {/* Create / Edit Custom Role Drawer */}
      <Drawer
        open={roleDrawerOpen}
        onClose={closeRoleDrawer}
        title={editingRoleId ? `Edit Role: ${roleForm.title || ''}` : 'Create Custom RBAC Role'}
        subtitle="Define role identity, access scope, and select granular module permissions."
        width="xl"
        footer={
          <>
            <button
              type="button"
              onClick={closeRoleDrawer}
              className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 font-bold text-slate-600 dark:text-slate-300 text-xs"
            >
              Cancel
            </button>
            <button
              form="role-drawer-form"
              type="submit"
              className="px-5 py-2 rounded-xl bg-teal-600 text-white font-bold shadow-lg shadow-teal-500/20 hover:bg-teal-700 text-xs transition"
            >
              Save Role Configurations
            </button>
          </>
        }
      >
        <form id="role-drawer-form" onSubmit={handleSaveRole} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Role Title"
              required
              placeholder="e.g. Regional Audit Supervisor"
              value={roleForm.title}
              error={roleFormErrors.title}
              onChange={(e) => setRoleForm((f) => ({ ...f, title: e.target.value }))}
            />
            <Input
              label="Role Code"
              required
              placeholder="e.g. ROLE_REGIONAL_AUDITOR"
              className="font-mono"
              value={roleForm.code}
              error={roleFormErrors.code}
              onChange={(e) => setRoleForm((f) => ({ ...f, code: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Access Scope"
              options={accessScopeOptions}
              value={roleForm.accessScope}
              onChange={(e) => setRoleForm((f) => ({ ...f, accessScope: e.target.value }))}
            />
            <Select
              label="Color Theme"
              options={colorThemeOptions}
              value={roleForm.colorTheme}
              onChange={(e) => setRoleForm((f) => ({ ...f, colorTheme: e.target.value as RbacColorTheme }))}
            />
          </div>

          <Textarea
            label="Role Description"
            placeholder="Briefly describe operational responsibilities of this role..."
            value={roleForm.description}
            onChange={(e) => setRoleForm((f) => ({ ...f, description: e.target.value }))}
          />

          <div className="space-y-3 pt-2">
            <h4 className="font-extrabold text-slate-900 dark:text-white text-xs uppercase tracking-wider border-b border-slate-200 dark:border-slate-800 pb-1">
              Module Permissions Checklist
            </h4>

            <div className="space-y-2">
              {rbacModules.map((mod) => (
                <div key={mod.key} className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1.5">
                  <div className="font-bold text-slate-900 dark:text-white flex items-center justify-between">
                    <span>
                      {mod.icon} {mod.drawerLabel}
                    </span>
                    <span className="text-[10px] text-slate-400 font-normal">{mod.drawerGroup}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {rbacActions.map((action) => (
                      <Checkbox
                        key={action}
                        label={mod.actionLabels[action]}
                        checked={roleForm.permissions[mod.key][action]}
                        onChange={(e) => toggleFormPermission(mod.key, action, e.target.checked)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </form>
      </Drawer>

      {/* Add / Edit User Account Modal */}
      <Modal
        open={userModalOpen}
        onClose={closeUserModal}
        title={editingUserId ? 'Edit User Role Assignment' : 'Assign Role & Credentials'}
        maxWidth="md"
        footer={
          <>
            <button
              type="button"
              onClick={closeUserModal}
              className="flex-1 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-xs"
            >
              Cancel
            </button>
            <button
              form="user-modal-form"
              type="submit"
              className="flex-1 py-2 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 shadow-md text-xs transition"
            >
              Save User Assignment
            </button>
          </>
        }
      >
        <p className="text-xs text-slate-400 -mt-2">Modify system access permissions for user account.</p>
        <form id="user-modal-form" onSubmit={handleSaveUser} className="space-y-3">
          <Input
            label="Full Name"
            required
            placeholder="e.g. David Chen"
            value={userForm.fullName}
            error={userFormErrors.fullName}
            onChange={(e) => setUserForm((f) => ({ ...f, fullName: e.target.value }))}
          />
          <Input
            label="Email Address"
            required
            type="email"
            placeholder="david.c@apexsupermarket.com"
            value={userForm.email}
            error={userFormErrors.email}
            onChange={(e) => setUserForm((f) => ({ ...f, email: e.target.value }))}
          />
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Assign Role"
              options={roleSelectOptions}
              value={userForm.roleId}
              onChange={(e) => setUserForm((f) => ({ ...f, roleId: e.target.value }))}
            />
            <Select
              label="Authorized Branch"
              options={branchOptions}
              value={userForm.branch}
              onChange={(e) => setUserForm((f) => ({ ...f, branch: e.target.value }))}
            />
          </div>
          <div className="flex items-center justify-between pt-2">
            <Checkbox
              label="Mandatory 2-Factor Auth"
              checked={userForm.twoFaEnabled}
              onChange={(e) => setUserForm((f) => ({ ...f, twoFaEnabled: e.target.checked }))}
            />
            <Checkbox
              label="Account Active"
              checked={userForm.active}
              onChange={(e) => setUserForm((f) => ({ ...f, active: e.target.checked }))}
            />
          </div>
        </form>
      </Modal>
    </div>
  );
}
