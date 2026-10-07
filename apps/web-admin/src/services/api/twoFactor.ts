import { apiClient } from './client';

export interface TwoFaStatus {
  twoFaEnabled: boolean;
}

export interface TwoFaSetup {
  secret: string;
  otpauthUrl: string;
}

export function getTwoFaStatus(): Promise<TwoFaStatus> {
  return apiClient.get<TwoFaStatus>('/api/auth/2fa/status');
}

export function setupTwoFa(): Promise<TwoFaSetup> {
  return apiClient.post<TwoFaSetup>('/api/auth/2fa/setup', {});
}

export function confirmTwoFa(token: string): Promise<{ success: boolean }> {
  return apiClient.post<{ success: boolean }>('/api/auth/2fa/confirm', { token });
}

// Requires a current authenticator code, so a stolen session can't strip 2FA.
export function disableTwoFa(token: string): Promise<{ success: boolean }> {
  return apiClient.post<{ success: boolean }>('/api/auth/2fa/disable', { token });
}

export function changePassword(currentPassword: string, newPassword: string): Promise<{ success: boolean }> {
  return apiClient.post<{ success: boolean }>('/api/auth/password/change', { currentPassword, newPassword });
}
