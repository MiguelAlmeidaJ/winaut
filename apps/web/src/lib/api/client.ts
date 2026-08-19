import { createWinAutApiClient, WinAutApiError } from '@winaut/api-client';
import type {
  CompanyAutomationCatalog,
  UpdateCompanyAutomationInput,
} from '@winaut/contracts';

function getBaseUrl(): string {
  const value = process.env.NEXT_PUBLIC_WINAUT_API_URL;

  if (!value) {
    throw new Error(
      'NEXT_PUBLIC_WINAUT_API_URL não está configurada para o painel web.',
    );
  }

  return value;
}

const baseUrl = getBaseUrl().replace(/\/+$/, '');

export const apiClient = createWinAutApiClient({
  baseUrl,
});

async function companyAutomationRequest<T>(
  path: string,
  options?: {
    method?: 'GET' | 'PUT';
    body?: unknown;
  },
): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`${baseUrl}${path}`, {
      method: options?.method ?? 'GET',
      credentials: 'include',
      headers: {
        Accept: 'application/json',
        ...(options?.body === undefined
          ? {}
          : { 'Content-Type': 'application/json' }),
      },
      body:
        options?.body === undefined
          ? undefined
          : JSON.stringify(options.body),
    });
  } catch {
    throw new WinAutApiError(
      'Não foi possível conectar à API do WinAut.',
      0,
    );
  }

  const body: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      typeof body === 'object' &&
      body !== null &&
      'message' in body &&
      typeof body.message === 'string'
        ? body.message
        : 'Não foi possível atualizar as automações da empresa.';
    const code =
      typeof body === 'object' &&
      body !== null &&
      'code' in body &&
      typeof body.code === 'string'
        ? body.code
        : undefined;

    throw new WinAutApiError(message, response.status, code);
  }

  return body as T;
}

export const companyAutomationsApi = {
  get: (companyId: string) =>
    companyAutomationRequest<CompanyAutomationCatalog>(
      `/api/company-automations/${encodeURIComponent(companyId)}`,
    ),
  update: (
    companyId: string,
    automationCode: string,
    input: UpdateCompanyAutomationInput,
  ) =>
    companyAutomationRequest<CompanyAutomationCatalog>(
      `/api/company-automations/${encodeURIComponent(companyId)}/${encodeURIComponent(automationCode)}`,
      {
        method: 'PUT',
        body: input,
      },
    ),
};
