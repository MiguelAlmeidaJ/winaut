export interface HealthResponse {
  status: 'ok';
  services: {
    api: 'up';
    database: 'up';
  };
  timestamp: string;
}
