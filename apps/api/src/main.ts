import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { ValidationPipe, Logger } from "@nestjs/common";
import { AppModule } from "./app.module";

async function bootstrap() {
  // 生产环境检查：JWT 密钥必须显式设置
  if (process.env.NODE_ENV === "production") {
    if (!process.env.JWT_ACCESS_SECRET || !process.env.JWT_REFRESH_SECRET) {
      Logger.error(
        "FATAL: JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be set in production",
        "Bootstrap",
      );
      process.exit(1);
    }
    Logger.log("JWT secrets configured", "Bootstrap");
  }

  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
    cors: {
      origin: process.env.CORS_ORIGIN?.split(",") ?? [
        "http://localhost:8081",
      ],
      credentials: true,
    },
  });
  app.setGlobalPrefix("api/v1");
  app.useLogger(app.get(Logger));
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  const port = Number(process.env.PORT) || 3000;
  await app.listen(port);
  Logger.log(`API listening on http://localhost:${port}/api/v1`, "Bootstrap");

  // 优雅关闭
  process.on("SIGTERM", async () => {
    Logger.log("SIGTERM received, shutting down...", "Bootstrap");
    await app.close();
    process.exit(0);
  });
}

bootstrap();