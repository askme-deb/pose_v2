import { useState } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Menu,
  X,
  ChevronDown,
  Search,
  ShoppingCart,
  Sun,
  Moon,
  Bell,
  Store,
  Command,
} from 'lucide-react';
import { Avatar, DropdownMenu, DropdownMenuItem, Badge } from '@pospe/ui-library';
import logo from '../assets/logo.svg';
import { useThemeStore } from '../store/useThemeStore';
import { useTenantStore } from '../store/useTenantStore';
import { useAuthStore } from '../store/useAuthStore';
import {
  dashboardLinks,
  salesLinks,
  masterDataLinks,
  productsLinks,
  inventoryLinks,
  reportsLinks,
  administrationLinks,
  superAdminLinks,
  publicLinks,
  type NavLink,
} from '../constants/nav';
import SearchModal from '../components/layout/SearchModal';
import MobileDrawer from '../components/layout/MobileDrawer';

function NavDropdown({ label, links, badgeColor, align = 'left', columns = 3 }: {
  label: string;
  links: NavLink[];
  badgeColor: 'blue' | 'purple' | 'slate';
  align?: 'left' | 'right';
  columns?: 1 | 2 | 3;
}) {
  const location = useLocation();

  const badgeClasses = {
    blue: 'bg-blue-600/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 border border-blue-500/20',
    purple: 'bg-purple-600/10 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400 border border-purple-500/20',
    slate: 'bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300',
  }[badgeColor];

  const iconBg = {
    blue: 'bg-blue-50 dark:bg-blue-500/10',
    purple: 'bg-purple-50 dark:bg-purple-500/10',
    slate: 'bg-slate-100 dark:bg-slate-800',
  }[badgeColor];

  const widthClass = { 1: 'w-56', 2: 'w-[420px]', 3: 'w-[640px]' }[columns];
  const gridColsClass = { 1: 'grid-cols-1', 2: 'grid-cols-2', 3: 'grid-cols-3' }[columns];

  return (
    <DropdownMenu
      align={align}
      width={widthClass}
      trigger={({ toggle }) => (
        <button
          onClick={toggle}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold transition ${badgeClasses}`}
        >
          {label}
          <ChevronDown className="w-3.5 h-3.5 opacity-60" />
        </button>
      )}
    >
      <div className="px-2.5 py-1.5 mb-1 font-bold uppercase text-[10px] tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-800">
        {label}
      </div>
      <div className={`grid ${gridColsClass} gap-0.5 p-0.5`}>
        {links.map((link) => {
          const active = location.pathname === link.href;
          return (
            <Link
              key={link.href}
              to={link.href}
              className={`flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-semibold transition ${
                active
                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60'
              }`}
            >
              <span className={`w-7 h-7 shrink-0 rounded-lg flex items-center justify-center ${iconBg}`}>
                <link.icon className={`w-3.5 h-3.5 ${link.color}`} />
              </span>
              <span className="truncate">{link.label}</span>
            </Link>
          );
        })}
      </div>
    </DropdownMenu>
  );
}

function NavPill({ link, badgeColor }: { link: NavLink; badgeColor: 'blue' | 'purple' | 'slate' }) {
  const location = useLocation();
  const active = location.pathname === link.href;

  const badgeClasses = {
    blue: 'bg-blue-600/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 border border-blue-500/20',
    purple: 'bg-purple-600/10 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400 border border-purple-500/20',
    slate: 'bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300',
  }[badgeColor];

  return (
    <Link
      to={link.href}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold transition ${
        active ? badgeClasses : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60'
      }`}
    >
      <link.icon className="w-3.5 h-3.5" />
      {link.label}
    </Link>
  );
}

export default function AppShell() {
  const { dark, toggleTheme } = useThemeStore();
  const { tenant, branch, tenants, branches, selectTenant, selectBranch } = useTenantStore();
  const { user, logout } = useAuthStore();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <header className="sticky top-0 z-40 w-full glass-panel border-b border-slate-200/80 dark:border-slate-800/80 shadow-md">
        <div className="px-4 lg:px-8 py-3 flex items-center justify-between border-b border-slate-200/60 dark:border-slate-800/60">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="md:hidden p-2 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 transition"
            >
              <Menu className="w-5 h-5" />
            </button>

            <Link to="/dashboard" className="flex items-center gap-2.5 group">
              <img src={logo} alt="ApexPOS Logo" className="h-8 md:h-9 group-hover:scale-105 transition-transform" />
            </Link>

            <div className="hidden md:flex items-center gap-2 ml-4 pl-4 border-l border-slate-200 dark:border-slate-800">
              <DropdownMenu
                width="w-64"
                trigger={({ toggle }) => (
                  <button
                    onClick={toggle}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-200/70 transition"
                  >
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>{tenant}</span>
                    <ChevronDown className="w-3.5 h-3.5 opacity-60" />
                  </button>
                )}
              >
                <div className="px-3 py-1.5 font-bold uppercase text-[10px] text-slate-400">Select Business Tenant</div>
                {tenants.map((t) => (
                  <DropdownMenuItem key={t} onClick={() => selectTenant(t)}>
                    <span className="flex-1 text-left">{t}</span>
                    {t === tenant && <span className="w-2 h-2 rounded-full bg-emerald-500" />}
                  </DropdownMenuItem>
                ))}
              </DropdownMenu>

              <DropdownMenu
                width="w-56"
                trigger={({ toggle }) => (
                  <button
                    onClick={toggle}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 transition"
                  >
                    <Store className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    <span>{branch}</span>
                    <ChevronDown className="w-3.5 h-3.5 opacity-60" />
                  </button>
                )}
              >
                <div className="px-3 py-1.5 font-bold uppercase text-[10px] text-slate-400">Select Branch</div>
                {branches.map((b) => (
                  <DropdownMenuItem key={b} onClick={() => selectBranch(b)}>
                    <span className="flex-1 text-left">{b}</span>
                    {b === branch && <span className="w-2 h-2 rounded-full bg-emerald-500" />}
                  </DropdownMenuItem>
                ))}
              </DropdownMenu>
            </div>
          </div>

          <div className="hidden lg:flex items-center max-w-md w-full mx-4">
            <button
              onClick={() => setSearchOpen(true)}
              className="w-full flex items-center justify-between px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500 text-xs hover:border-blue-400 transition shadow-inner"
            >
              <span className="flex items-center gap-2">
                <Search className="w-4 h-4" />
                Search tenants, invoices, products...
              </span>
              <kbd className="flex items-center gap-1 px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-[10px] font-mono text-slate-500 dark:text-slate-400 font-semibold border border-slate-300 dark:border-slate-700">
                <Command className="w-3 h-3" />K
              </kbd>
            </button>
          </div>

          <div className="flex items-center gap-2 md:gap-2.5">
            <button
              onClick={() => setSearchOpen(true)}
              className="lg:hidden p-2 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300"
            >
              <Search className="w-4 h-4" />
            </button>

            <a
              href={import.meta.env.VITE_POS_URL ?? 'http://localhost:5174/pos'}
              className="hidden sm:flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold shadow-lg shadow-blue-500/25 transition transform hover:scale-[1.02]"
            >
              <ShoppingCart className="w-3.5 h-3.5" />
              POS Terminal
            </a>

            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 transition"
            >
              {dark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-600" />}
            </button>

            <button className="relative p-2 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 transition">
              <Bell className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-red-500" />
            </button>

            <DropdownMenu
              align="right"
              width="w-56"
              trigger={({ toggle }) => (
                <button onClick={toggle}>
                  <Avatar name={user?.name ?? 'Guest User'} />
                </button>
              )}
            >
              <div className="px-3 py-2 border-b border-slate-200 dark:border-slate-800">
                <p className="font-bold text-slate-900 dark:text-white">{user?.name ?? 'Guest User'}</p>
                <p className="text-[10px] text-slate-400">{user?.email}</p>
              </div>
              <DropdownMenuItem onClick={() => navigate('/settings/business-profile')}>Company Settings</DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/roles')}>Roles & RBAC</DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  logout();
                  navigate('/login');
                }}
                className="text-red-600 dark:text-red-400"
              >
                Sign Out
              </DropdownMenuItem>
            </DropdownMenu>
          </div>
        </div>

        <nav className="hidden md:flex flex-wrap px-4 lg:px-8 py-2.5 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md items-center gap-1.5 text-xs font-semibold">
          <NavPill link={dashboardLinks[0]} badgeColor="blue" />
          <NavDropdown label="Sales" links={salesLinks} badgeColor="blue" columns={2} />
          <NavDropdown label="Master Data" links={masterDataLinks} badgeColor="blue" columns={1} />
          <NavPill link={productsLinks[0]} badgeColor="blue" />
          <NavDropdown label="Inventory" links={inventoryLinks} badgeColor="blue" columns={1} />
          <NavDropdown label="Reports" links={reportsLinks} badgeColor="blue" columns={1} />
          <NavDropdown label="Administration" links={administrationLinks} badgeColor="blue" columns={1} />
          <NavDropdown label="Super Admin Portal" links={superAdminLinks} badgeColor="purple" columns={2} />
          <NavDropdown label="Public & Design" links={publicLinks} badgeColor="slate" columns={1} />
        </nav>
      </header>

      <main className="flex-1 overflow-y-auto p-4 lg:p-8 space-y-8 animate-fade-in max-w-[1600px] w-full mx-auto">
        <Outlet />
      </main>

      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
      <MobileDrawer open={mobileOpen} onClose={() => setMobileOpen(false)} />
    </div>
  );
}
