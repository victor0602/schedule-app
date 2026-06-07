"use strict";
require("reflect-metadata");

const { NestFactory } = require("@nestjs/core");
const { ValidationPipe } = require("@nestjs/common");
const { AppModule } = require("../apps/api/dist/app.module");

let cachedApp;

async function bootstrap() {
  if (cachedApp) return cachedApp;

  if (process.env.NODE_ENV === "production") {
    if (!process.env.JWT_ACCESS_SECRET || !process.env.JWT_REFRESH_SECRET) {
      throw new Error("Missing JWT_ACCESS_SECRET or JWT_REFRESH_SECRET");
    }
    if (!process.env.DATABASE_URL) {
      throw new Error("Missing DATABASE_URL");
    }
  }

  try {
    cachedApp = await NestFactory.create(AppModule, {
      bufferLogs: true,
      cors: {
        origin: process.env.CORS_ORIGIN?.split(",") ?? ["http://localhost:8081"],
        credentials: true,
      },
    });
    cachedApp.setGlobalPrefix("api/v1");
    cachedApp.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    cachedApp.enableShutdownHooks();
    await cachedApp.init();
  } catch (err) {
    console.error("[bootstrap] NestJS init failed:", err.message, err.stack);
    throw err;
  }

  return cachedApp;
}

module.exports = async function handler(req, res) {
  try {
    const app = await bootstrap();
    return app.getHttpAdapter().getInstance()(req, res);
  } catch (err) {
    console.error("[handler]", req.method, req.url, err.message);
    res.status(500).json({
      error: "Internal Server Error",
      message: err.message,
    });
  }
};
