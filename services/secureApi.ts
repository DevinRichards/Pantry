import { auth } from './firebase';

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '');
}

export function getOptionalProxyUrl(value: string | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed ? trimTrailingSlash(trimmed) : null;
}

export function getDevOnlyPublicKey(value: string | undefined): string | null {
  if (!__DEV__) return null;
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export async function buildProxyHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  const user = auth.currentUser;
  if (user) {
    headers.Authorization = `Bearer ${await user.getIdToken()}`;
  }

  return headers;
}

export function requireSecureProxy(featureName: string): never {
  throw new Error(`${featureName} requires a secure backend proxy in production.`);
}
