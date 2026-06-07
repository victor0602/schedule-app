import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { ValidationPipe, Logger } from "@nestjs/common";
import { AppModule } from "../apps/api/src/app.module";

let cachedApp: any;

async function bootstrap() {
  if (!cachedApp) {
    if (process.env.NODE_ENV === "production") {
      if (!process.env.JWT_ACCESS_SECRET || !process.env.JWT_REFRESH_SECRET) {
        Logger.error(
          "FATAL: JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be set in production",
          "Bootstrap",
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
      }),
    );
    await cachedApp.init();
  }
  return cachedApp;
}

export default async function handler(req: any, res: any) {
  const app = await bootstrap();
  const expressInstance = app.getHttpAdapter().getInstance();
  return expressInstance(req, res);
}