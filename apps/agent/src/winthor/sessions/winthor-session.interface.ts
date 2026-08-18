export interface WinThorSession {
  connect(): Promise<void>;
  ensureAuthenticated(): Promise<void>;
  openRoutine(routineCode: number): Promise<void>;
  disconnect(): Promise<void>;
}
