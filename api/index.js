"use strict";
require("reflect-metadata");

let cachedApp;
let initError = null;

async function bootstrap() {
  if (cachedApp) return cachedApp;
  if (initError) throw initError;

  if (!process.env.DATABASE_URL) throw new Error("Missing DATABASE_URL");
  if (!process.env.JWT_ACCESS_SECRET || !process.env.JWT_REFRESH_SECRET) {
    throw new Error("Missing JWT secrets");
  }

  try {
    const { NestFactory } = require("@nestjs/core");
    const { ValidationPipe } = require("@nestjs/common");
    const { AppModule } = require("../apps/api/dist/app.module");

    cachedApp = await NestFactory.create(AppModule, {
      cors: {
        origin: process.env.CORS_ORIGIN?.split(",") ?? ["*"],
        credentials: true,
      },
    });
    cachedApp.setGlobalPrefix("api/v1");
    cachedApp.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }));
    await cachedApp.init();
    return cachedApp;
  } catch (err) {
    initError = err;
    console.error("[INIT ERROR]", err.message, err.stack);
    throw err;
  }
}

module.exports = async function handler(req, res) {
  try {
    const app = await bootstrap();
    return app.getHttpAdapter().getInstance()(req, res);
  } catch (err) {
    console.error("[HANDLER ERROR]", req.method, req.url, err.message);
    res.status(500).json({
      error: "Internal Server Error",
      message: process.env.NODE_ENV === "production" ? "Server error" : err.message,
      code: err.code || "UNKNOWN",
    });
  }
};
