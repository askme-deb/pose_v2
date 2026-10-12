import { apiClient } from './client';

export interface LiveHsnCode {
  id: string;
  code: string;
  description: string;
  gstRate: number;
  isActive: boolean;
  /** How many products use this code. */
  productCount: number;
}

interface ApiHsnCode {
  id: string;
  code: string;
  description: string;
  gstRate: string;
  isActive: boolean;
  productCount: number;
}

const toLive = (h: ApiHsnCode): LiveHsnCode => ({
  id: h.id,
  code: h.code,
  description: h.description,
  gstRate: Number(h.gstRate),
  isActive: h.isActive,
  productCount: h.productCount,
});

export interface HsnCodeInput {
  code: string;
  description: string;
  gstRate: number;
  isActive?: boolean;
}

export async function listHsnCodes(): Promise<LiveHsnCode[]> {
  return (await apiClient.get<ApiHsnCode[]>('/api/inventory/hsn-codes')).map(toLive);
}

export async function getHsnCode(id: string): Promise<LiveHsnCode> {
  return toLive(await apiClient.get<ApiHsnCode>(`/api/inventory/hsn-codes/${encodeURIComponent(id)}`));
}

export async function createHsnCode(input: HsnCodeInput): Promise<LiveHsnCode> {
  return toLive(await apiClient.post<ApiHsnCode>('/api/inventory/hsn-codes', input));
}

export async function updateHsnCode(id: string, input: Partial<HsnCodeInput>): Promise<LiveHsnCode> {
  return toLive(await apiClient.put<ApiHsnCode>(`/api/inventory/hsn-codes/${id}`, input));
}

export async function deleteHsnCode(id: string): Promise<void> {
  await apiClient.delete(`/api/inventory/hsn-codes/${id}`);
}
