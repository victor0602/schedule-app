"use strict";

module.exports = async function handler(req, res) {
  require("reflect-metadata");
  const { NestFactory } = require("@nestjs/core");
  const { ValidationPipe } = require("@nestjs/common");
  const { AppModule } = require("../apps/api/dist/app.module");

  const app = await NestFactory.create(AppModule, { cors: true });
  app.setGlobalPrefix("api/v1");
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }));
  await app.init();

  return app.getHttpAdapter().getInstance()(req, res);
};
