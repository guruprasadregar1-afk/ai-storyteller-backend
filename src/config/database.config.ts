export const databaseConfig = {
  url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/aistoryteller?schema=public',
  maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS || '10', 10),
  connectionTimeoutMs: parseInt(process.env.DB_TIMEOUT_MS || '5000', 10)
};
