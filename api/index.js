"use strict";
require("reflect-metadata");

const { NestFactory } = require("@nestjs/core");
const { ValidationPipe, Logger } = require("@nestjs/common");
const { AppModule } = require("../apps/api/dist/app.module");

let cachedApp;

async function bootstrap() {
  if (!cachedApp) {
    if (process.env.NODE_ENV === "production") {
      if (!process.env.JWT_ACCESS_SECRET || !process.env.JWT_REFRESH_SECRET) {
        Logger.error(
          "FATAL: JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be set in production",
          "Bootstrap"
        );
        throw new Error("Missing JWT secrets");
      }
    }

    cachedApp = await NestFactory.create(AppModule, {
      bufferLogs: true,
      cors: {
        origin: process.env.CORS_ORIGIN?.split(",") ?? [
          "http://localhost:8081",
        ],
        credentials: true,
      },
    });
    cachedApp.setGlobalPrefix("api/v1");
    cachedApp.useLogger(cachedApp.get(Logger));
    cachedApp.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      })
    );
    await cachedApp.init();
  }
  return cachedApp;
}

module.exports = async function handler(req, res) {
  const app = await bootstrap();
  return app.getHttpAdapter().getInstance()(req, res);
};