export interface LocalWinThorWindow {
  processId: number;
  processName: string;
  title: string;
}

export interface LocalWinThorDesktopDriver {
  findWindow(titleContains: string): Promise<LocalWinThorWindow | null>;
  launchEndpoint(endpoint: string): Promise<void>;
  openRoutine(processId: number, routineCode: number): Promise<void>;
}
