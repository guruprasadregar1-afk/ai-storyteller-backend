import express, { Express } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { validateEnv } from './config/env.validation';
import { prismaService } from './database/prisma/prisma.service';
import { errorHandlerMiddleware } from './common/errors/api.error';

import { healthRouter } from './modules/health/health.routes';
import { aiRouter } from './modules/ai/ai.routes';
import { authRouter } from './modules/auth/auth.routes';
import { usersRouter } from './modules/users/users.routes';
import { researchRouter } from './modules/research/research.routes';
import { sourcesRouter } from './modules/sources/sources.routes';
import { searchRouter } from './modules/search/search.routes';
import { storytellingRouter } from './modules/storytelling/storytelling.routes';

export class AppModule {
  public app: Express;

  constructor() {
    dotenv.config();
    validateEnv();
    this.app = express();
    this.configureMiddleware();
    this.configureRoutes();
    this.configureErrorHandling();
  }

  private configureMiddleware() {
    this.app.use(cors());
    this.app.use(express.json());
  }

  private configureRoutes() {
    this.app.use('/api', healthRouter);
    this.app.use('/api', aiRouter);
    this.app.use('/api', authRouter);
    this.app.use('/api', usersRouter);
    this.app.use('/api', researchRouter);
    this.app.use('/api', sourcesRouter);
    this.app.use('/api', searchRouter);
    this.app.use('/api/storytelling', storytellingRouter);
    this.app.use('/api', storytellingRouter);
  }

  private configureErrorHandling() {
    this.app.use(errorHandlerMiddleware);
  }

  async initDatabase() {
    await prismaService.connectDatabase();
  }
}

export const appModule = new AppModule();
export const app = appModule.app;
