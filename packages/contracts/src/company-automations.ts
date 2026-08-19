export interface CompanyAutomationItem {
  code: string;
  name: string;
  enabled: boolean;
  updatedAt: string | null;
}

export interface CompanyAutomationCatalog {
  company: {
    id: string;
    name: string;
    active: boolean;
  };
  automations: CompanyAutomationItem[];
}

export interface UpdateCompanyAutomationInput {
  enabled: boolean;
}
