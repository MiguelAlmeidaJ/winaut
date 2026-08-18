export class AgentApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly responseBody: string,
  ) {
    super(
      `WinAut API request failed with HTTP ${status}.`,
    );

    this.name = 'AgentApiError';
  }
}