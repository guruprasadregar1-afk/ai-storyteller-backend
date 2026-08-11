import { appModule } from './app.module';

export const app = appModule.app;

if (require.main === module) {
  import('./main');
}
