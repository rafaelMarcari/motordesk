/**
 * Centralized API configuration for MotorDesk
 * Resolves the backend base URL dynamically depending on environment:
 * - In Vercel / Production: Uses VITE_API_URL (e.g., https://motordesk-api-xyz.run.app)
 * - In AI Studio / Monolithic Dev: Falls back to empty string (relative calls `/api/...`)
 */
export const getApiUrl = (): string => {
  const envUrl = (typeof import.meta !== 'undefined' && (import.meta as any)?.env?.VITE_API_URL) ||
                 (typeof process !== 'undefined' && process.env?.VITE_API_URL);
  if (envUrl && typeof envUrl === 'string') {
    return envUrl.replace(/\/+$/, '');
  }
  return '';
};

export const buildApiEndpoint = (endpoint: string): string => {
  const baseUrl = getApiUrl();
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${baseUrl}${cleanEndpoint}`;
};
