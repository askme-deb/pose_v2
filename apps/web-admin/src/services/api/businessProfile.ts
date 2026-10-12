import { apiClient, API_BASE_URL } from './client';
import { useAuthStore } from '../../store/useAuthStore';

export interface LiveBusinessProfile {
  registeredName: string;
  tagline: string;
  logoUrl: string;
  retailCategory: string;
  cin: string;
  yearEstablished: number;
  supportEmail: string;
  helplinePhone: string;
  hqAddress: string;
  gstin: string;
  pan: string;
  stateCode: string;
  defaultTaxSlab: number;
  invoicePrefix: string;
  nextInvoiceNumber: number;
  currencySymbol: string;
  financialYearStart: string;
  ewayBillThreshold: number;
  receiptHeader: string;
  receiptSubHeader: string;
  receiptFooter: string;
  receiptReturnPolicy: string;
  receiptPaperWidth: '80mm' | '58mm';
  receiptShowUpiQr: boolean;
  razorpayKeyId: string;
  whatsappPhoneId: string;
}

export type BranchType = 'FLAGSHIP' | 'EXPRESS' | 'CENTRAL_WAREHOUSE';

export interface LiveBranch {
  id: string;
  name: string;
  code: string;
  type: BranchType;
  manager: string;
  phone: string;
  address: string;
  isPrimary: boolean;
  printers: number;
}

interface ApiProfile {
  registeredName: string;
  tagline: string | null;
  logoUrl: string | null;
  retailCategory: string;
  cin: string | null;
  yearEstablished: number | null;
  supportEmail: string | null;
  helplinePhone: string | null;
  hqAddress: string | null;
  gstin: string | null;
  pan: string | null;
  stateCode: string | null;
  defaultTaxSlab: number;
  invoicePrefix: string;
  nextInvoiceNumber: number;
  currencySymbol: string;
  financialYearStart: string;
  ewayBillThreshold: number;
  receiptHeader: string | null;
  receiptSubHeader: string | null;
  receiptFooter: string | null;
  receiptReturnPolicy: string | null;
  receiptPaperWidth: string;
  receiptShowUpiQr: boolean;
  razorpayKeyId: string | null;
  whatsappPhoneId: string | null;
}

interface ApiBranch {
  id: string;
  name: string;
  code: string | null;
  type: BranchType;
  manager: string | null;
  phone: string | null;
  address: string | null;
  isPrimary: boolean;
  printers: number;
}

// The backend returns a gateway-relative path (/api/sales/uploads/logos/...)
// so the stored value doesn't bake in one environment's host — resolve it to
// something an <img src> can actually load.
function resolveLogoUrl(logoUrl: string | null): string {
  if (!logoUrl) return '';
  return logoUrl.startsWith('/') ? `${API_BASE_URL}${logoUrl}` : logoUrl;
}

function toLiveProfile(p: ApiProfile): LiveBusinessProfile {
  return {
    registeredName: p.registeredName,
    tagline: p.tagline ?? '',
    logoUrl: resolveLogoUrl(p.logoUrl),
    retailCategory: p.retailCategory,
    cin: p.cin ?? '',
    yearEstablished: p.yearEstablished ?? new Date().getFullYear(),
    supportEmail: p.supportEmail ?? '',
    helplinePhone: p.helplinePhone ?? '',
    hqAddress: p.hqAddress ?? '',
    gstin: p.gstin ?? '',
    pan: p.pan ?? '',
    stateCode: p.stateCode ?? '',
    defaultTaxSlab: p.defaultTaxSlab,
    invoicePrefix: p.invoicePrefix,
    nextInvoiceNumber: p.nextInvoiceNumber,
    currencySymbol: p.currencySymbol,
    financialYearStart: p.financialYearStart,
    ewayBillThreshold: p.ewayBillThreshold,
    receiptHeader: p.receiptHeader ?? '',
    receiptSubHeader: p.receiptSubHeader ?? '',
    receiptFooter: p.receiptFooter ?? '',
    receiptReturnPolicy: p.receiptReturnPolicy ?? '',
    receiptPaperWidth: (p.receiptPaperWidth as '80mm' | '58mm') ?? '80mm',
    receiptShowUpiQr: p.receiptShowUpiQr,
    razorpayKeyId: p.razorpayKeyId ?? '',
    whatsappPhoneId: p.whatsappPhoneId ?? '',
  };
}

function toLiveBranch(b: ApiBranch): LiveBranch {
  return {
    id: b.id,
    name: b.name,
    code: b.code ?? '',
    type: b.type,
    manager: b.manager ?? '',
    phone: b.phone ?? '',
    address: b.address ?? '',
    isPrimary: b.isPrimary,
    printers: b.printers,
  };
}

export async function getBusinessProfile(): Promise<LiveBusinessProfile> {
  const profile = await apiClient.get<ApiProfile>('/api/sales/business-profile');
  return toLiveProfile(profile);
}

export async function updateBusinessProfile(input: Partial<LiveBusinessProfile>): Promise<LiveBusinessProfile> {
  const profile = await apiClient.put<ApiProfile>('/api/sales/business-profile', input);
  return toLiveProfile(profile);
}

// Multipart upload — bypasses ApiClient's JSON-only post()/put(), which
// JSON.stringifies every body and can't carry a File.
export async function uploadBusinessLogo(file: File): Promise<LiveBusinessProfile> {
  const formData = new FormData();
  formData.append('logo', file);

  const token = useAuthStore.getState().token;
  const res = await fetch(`${API_BASE_URL}/api/sales/business-profile/logo`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(typeof body.error === 'string' ? body.error : `Upload failed (${res.status})`);
  }
  return toLiveProfile(await res.json());
}

export async function listBranches(): Promise<LiveBranch[]> {
  const branches = await apiClient.get<ApiBranch[]>('/api/sales/branches');
  return branches.map(toLiveBranch);
}

export interface BranchInput {
  name: string;
  code?: string;
  type?: BranchType;
  manager?: string;
  phone?: string;
  address?: string;
  printers?: number;
}

export async function createBranch(input: BranchInput): Promise<LiveBranch> {
  const branch = await apiClient.post<ApiBranch>('/api/sales/branches', input);
  return toLiveBranch(branch);
}

export async function updateBranch(id: string, input: BranchInput): Promise<LiveBranch> {
  const branch = await apiClient.put<ApiBranch>(`/api/sales/branches/${id}`, input);
  return toLiveBranch(branch);
}
