import { appModule } from './app.module';
import { appConfig } from './config/app.config';

async function bootstrap() {
  await appModule.initDatabase();

  const PORT = appConfig.port;
  appModule.app.listen(PORT, () => {
    console.log(`🚀 AI Storyteller Enterprise Backend running on http://localhost:${PORT}`);
  });
}

bootstrap();
