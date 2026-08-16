# ApexPOS HTML → React conversion guide

Read this fully before writing any page. It documents the conventions already established in this repo so new pages are consistent with what exists.

## Source of truth

- Static HTML prototype: `D:\NodejsProjects\pospe\html\*.html` — pixel-match this. Read the **full** file(s) assigned to you before writing JSX; do not guess at markup you haven't read.
- Canonical CSS already ported to `apps/web-admin/src/styles/globals.css` (and identical copy in `apps/web-pos`): `.glass-panel`, `.glass-card`, `.bg-gradient-glow`, `.animate-fade-in`/`.animate-scale-in`, print rules for `#receipt-modal-body`, `#apex-calendar-popover`/`.calendar-day-btn` calendar system, `input[type=date]` picker styling.
- Tailwind config (`tailwind.config.ts` in each app) already defines `darkMode:'class'`, `colors.brand{50,500,600,700}`, `violet.600`, `cyan.500`, `fontFamily.sans = ['Plus Jakarta Sans','Inter','sans-serif']`. Use plain Tailwind utility classes matching the HTML — do NOT invent new custom CSS classes unless the HTML's `css/styles.css` already defines one (in which case it's already ported, just use the class name).
- Icons: `lucide-react` — map each `data-lucide="x"` in the HTML to the matching PascalCase icon import (e.g. `data-lucide="chevron-down"` → `import { ChevronDown } from 'lucide-react'`).
- Charts: use `react-apexcharts` (`import Chart from 'react-apexcharts'`), not Chart.js, configured to visually match the HTML's chart colors/types (line/donut/bar). Both apps already depend on `apexcharts`/`react-apexcharts`.

## Reusable components — `@pospe/ui-library` (packages/ui-library/src)

Import everything from `'@pospe/ui-library'`. Compose pages from these instead of hand-rolling raw markup for common patterns:

- `Button` — `variant?: 'primary'|'secondary'|'ghost'|'icon'|'danger'`, `size?: 'sm'|'md'`. `primary` = gradient CTA, `secondary` = outline, `ghost`/`icon` = chip buttons.
- `Input`, `Select`, `Textarea`, `Checkbox` — all accept `label`, `required`, `error`, `hint` plus native props. `Select` takes `options: {value,label}[]` and optional `placeholder`.
- `Badge` — `color?: 'blue'|'emerald'|'amber'|'red'|'purple'|'cyan'|'slate'|'pink'|'teal'`, `dot?: boolean`, `pill?: boolean`. Use for status pills (payment status, order status, tier badges, etc.) matching the HTML's color-per-status convention.
- `Avatar` — `name: string` (renders initials), `size?: 'sm'|'md'|'lg'`.
- `GlassCard` — `padding?: 'sm'|'md'|'lg'`. Use for every section panel (`p-6 rounded-3xl` HTML equivalent).
- `KpiCard` — `icon: LucideIcon`, `label`, `value`, `delta?`, `deltaTone?: 'positive'|'negative'|'neutral'`, `color?: 'blue'|'indigo'|'emerald'|'purple'|'amber'|'cyan'|'red'`. Use for every KPI row.
- `Modal` — `open`, `onClose`, `title?`, `maxWidth?: 'sm'|'md'|'lg'|'xl'`, `footer?`. Use for the small centered dialogs (e.g. device detail, invoice detail, confirmation).
- `Drawer` — `open`, `onClose`, `title`, `subtitle?`, `footer?`, `width?: 'md'|'lg'|'xl'`. Use for every right-side slide-over "Add/Edit X" form — this is the dominant CRUD pattern across the whole app.
- `PillTabs` — `options: {value,label}[]`, `value`, `onChange`. Use for the segmented tab switchers (e.g. Orders/Suppliers, Categories/Brands) and timeframe filters.
- `DropdownMenu` + `DropdownMenuItem` — `trigger: ({open,toggle}) => ReactNode`, `align?: 'left'|'right'`, `width?: string`.
- `DataTable` — generic TanStack-Table wrapper: `columns: ColumnDef<T>[]`, `data`, `loading?`, `emptyTitle?`, `emptyDescription?`, `pageSize?`, `onRowClick?`. Gives sorting + pagination + empty state + loading skeleton for free. Use for every ledger/list table.
- `EmptyState`, `Skeleton`/`TableSkeleton` — for manual empty/loading states outside DataTable.
- `ToastProvider` (already wraps `<App/>`) + `useToast()` → `showToast(message, type?: 'success'|'warning'|'danger'|'info')`. Use for the interactions the HTML drives via `showToast(...)` (save confirmations, refunds, etc.) instead of `alert()`.
- `cn(...)` — className joiner helper.

If a page needs a genuinely new primitive not listed above (e.g. a phone-frame simulator, a live receipt preview, a permission matrix grid), build it locally in that page's own component file — don't force it into ui-library unless it's truly reusable across pages.

## App structure (web-admin)

- Routing: `apps/web-admin/src/App.tsx` already wires every route to a page component. Your job is to replace the placeholder body of your assigned page file(s) (currently just `<PlaceholderPage title="..."/>` from `src/components/common/PlaceholderPage.tsx`) with the real pixel-accurate implementation — do not change the route paths or file names.
- Layout: authenticated pages render inside `<AppShell/>` (`src/layouts/AppShell.tsx`) which already provides the dual-tier header — your page component should NOT re-render a header/nav, just return the page content (KPI rows, cards, tables, etc.) as `<AppShell>`'s `<Outlet/>` child, matching the `<main>` content area of the corresponding HTML file (skip its `<header>`/nav markup entirely, that's already handled).
- Public/auth pages render inside `<PublicLayout/>` (`src/layouts/PublicLayout.tsx`) which provides the ambient background + minimal top bar — your page component is just the centered card content.
- Stores (zustand): `src/store/useThemeStore.ts`, `useAuthStore.ts` (current user/role), `useTenantStore.ts` (tenant/branch switcher). Reuse these; don't create parallel state for the same concerns.
- Utils: `src/utils/format.ts` → `formatINR(amount)`, `formatCompactINR(amount)`, `formatDate(iso)`, `formatDateTime(iso)`. Use these for all currency/date display (amounts in mock data are plain rupee numbers, not paise).
- Data fetching: `src/hooks/useResource.ts` → `useResource(fetcher, deps)` returns `{data, loading, error, reload}`. Use with a `services/api/*.ts` function per entity.

## Mock data conventions (`src/services/mockData/*.ts`)

Already created: `products.ts`, `categories.ts`, `brands.ts` — **read these as the reference pattern** before creating new mock data files for your module. Conventions to follow:
- One file per entity, exporting a typed interface + a `const items: Type[] = [...]` array of realistic Indian retail data (real product/brand/people/place names, real-looking GSTINs `22AAAAA0000A1Z5` format, ₹ amounts appropriate to an Indian supermarket chain, ISO date strings). No `Lorem`/`Test`/`ABC` placeholder values.
- Cross-reference related entities by id (e.g. a purchase order's `supplierId` must match a real id in `suppliers.ts`) — never duplicate the same entity as inline strings in two places.
- Where the HTML models something as free text but it's really structured data (e.g. PO "items" description, warehouse-transfer "items"), model it properly as an array of line items (`{productId, qty, unitPrice}[]`) in the mock data / form state even though the HTML only shows a single textarea — build the actual form as a small line-item table/list instead of one textarea, since that's a genuine data-modeling gap in the prototype worth fixing.
- 6–15 records per entity is enough — this is a demo dataset, not a stress test.
- If your module needs an entity another batch also touches (e.g. both Reports and Sales touch invoices), check whether the file already exists before creating a new one; extend it instead of forking a second copy.

## Style rules (do not deviate)

- No inline `style={}` for anything expressible in Tailwind. No CSS-in-JS.
- No `dangerouslySetInnerHTML`.
- Every interactive element needs a real `onClick`/`onChange` handler with React state — don't leave decorative dead buttons where the HTML's `js/app.js` had real behavior (open/close modals, filter tables, switch tabs, save forms with a toast confirmation, etc.).
- Match spacing/type scale exactly: page `space-y-8`, section `glass-card p-6 rounded-3xl`, KPI grid `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4` (adjust column count to however many KPIs the page has), table header `text-[10px] font-extrabold uppercase text-slate-400 tracking-wider`, page H1 `text-2xl lg:text-3xl font-extrabold tracking-tight`.
- Dark mode: every custom color class needs a `dark:` pair — copy the pairing pattern from the components already built in `packages/ui-library/src/components/*.tsx`.
- Responsive: stack to 1 column below `lg`, KPI grids collapse via the `sm:`/`lg:`/`xl:` breakpoints shown above; verify nothing overflows horizontally at 375px.

## When done

- Make sure the page compiles: no unused imports, no `any` where a real type is easy, no console errors.
- Wire real navigation: buttons like "+Create PO" should open the real `Drawer`, "Export CSV" should actually trigger a CSV blob download, row action links should navigate/open the right modal — don't leave TODO stubs.
