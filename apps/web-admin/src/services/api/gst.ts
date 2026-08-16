import { apiClient } from './client';

export type GstFormType = 'GSTR1' | 'GSTR3B';
export type GstFilingStatus = 'PENDING' | 'FILED';

export interface LiveGstReturn {
  id: string;
  formType: GstFormType;
  periodMonth: string;
  billedTurnover: number;
  taxLiability: number;
  arn: string;
  status: GstFilingStatus;
}

export interface LiveTaxSlab {
  rate: number;
  taxableAmount: number;
  cgst: number;
  sgst: number;
  total: number;
  skuCount: number;
}

export interface LiveGstSummary {
  taxSlabs: LiveTaxSlab[];
  itcCredit: number;
}

interface ApiGstReturn {
  id: string;
  formType: GstFormType;
  periodMonth: string;
  billedTurnover: string;
  taxLiability: string;
  arn: string | null;
  status: GstFilingStatus;
}

function toLive(r: ApiGstReturn): LiveGstReturn {
  return {
    id: r.id,
    formType: r.formType,
    periodMonth: r.periodMonth,
    billedTurnover: Number(r.billedTurnover),
    taxLiability: Number(r.taxLiability),
    arn: r.arn ?? '',
    status: r.status,
  };
}

export async function listGstReturns(): Promise<LiveGstReturn[]> {
  const returns = await apiClient.get<ApiGstReturn[]>('/api/sales/gst-returns');
  return returns.map(toLive);
}

export interface GstReturnInput {
  formType: GstFormType;
  periodMonth: string; // yyyy-MM
  billedTurnover: number;
  taxLiability: number;
  arn?: string;
}

export async function fileGstReturn(input: GstReturnInput): Promise<LiveGstReturn> {
  const gstReturn = await apiClient.post<ApiGstReturn>('/api/sales/gst-returns', input);
  return toLive(gstReturn);
}

export async function markGstReturnFiled(id: string): Promise<LiveGstReturn> {
  const gstReturn = await apiClient.post<ApiGstReturn>(`/api/sales/gst-returns/${id}/file`, {});
  return toLive(gstReturn);
}

export async function getGstSummary(): Promise<LiveGstSummary> {
  return apiClient.get<LiveGstSummary>('/api/sales/gst-summary');
}
