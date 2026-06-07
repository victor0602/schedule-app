"use strict";

module.exports = async function handler(req, res) {
  try {
    require("reflect-metadata");
    const { NestFactory } = require("@nestjs/core");
    const { AppModule } = require("../apps/api/dist/app.module");
    
    const app = await NestFactory.create(AppModule, { cors: true });
    app.setGlobalPrefix("api/v1");
    await app.init();
    return app.getHttpAdapter().getInstance()(req, res);
  } catch (err) {
    console.error("CRASH:", err.message, err.stack);
    res.status(500).json({
      error: "Internal Server Error",
      message: err.message,
      code: err.code || "UNKNOWN",
      module: err.message.includes("Cannot find module") ? "MISSING_MODULE" : "INIT_FAILED",
    });
  }
};
