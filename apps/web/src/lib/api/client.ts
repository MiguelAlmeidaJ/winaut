import { createWinAutApiClient } from '@winaut/api-client';

function getBaseUrl(): string {
  const value = process.env.NEXT_PUBLIC_WINAUT_API_URL;

  if (!value) {
    throw new Error(
      'NEXT_PUBLIC_WINAUT_API_URL não está configurada para o painel web.',
    );
  }

  return value;
}

export const apiClient = createWinAutApiClient({
  baseUrl: getBaseUrl(),
});
