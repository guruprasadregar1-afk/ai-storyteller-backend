import { appConfig } from './app.config';
import { databaseConfig } from './database.config';
import { aiConfig } from './ai.config';

export function validateEnv() {
  const missingKeys: string[] = [];

  if (!appConfig.port) missingKeys.push('PORT');

  if (missingKeys.length > 0) {
    console.warn(`[EnvValidation] Warning: Missing environment variables: ${missingKeys.join(', ')}`);
  } else {
    console.log(`[EnvValidation] Environment variables validated successfully (PORT: ${appConfig.port}, Default AI: ${aiConfig.defaultProvider})`);
  }
}
