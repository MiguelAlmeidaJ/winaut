export interface ResolvedCredentialSecret {
  username: string | null;
  secret: string;
}

export interface CredentialSecretResolver {
  resolve(reference: string): Promise<ResolvedCredentialSecret>;
}
