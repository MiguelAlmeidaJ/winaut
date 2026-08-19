export interface AgentInstallation {
  apiUrl: string;
  token: string;
}

export interface AgentInstallationStore {
  load(): Promise<AgentInstallation | null>;
  save(installation: AgentInstallation): Promise<void>;
}
