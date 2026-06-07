import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ThrottlerModule, ThrottlerGuard } from "@nestjs/throttler";
import { APP_GUARD } from "@nestjs/core";
import { LoggerModule } from "nestjs-pino";
import { ServeStaticModule } from "@nestjs/serve-static";
import { join } from "path";
import { PrismaModule } from "./prisma/prisma.module";
import { AuthModule } from "./auth/auth.module";
import { ScheduleModule } from "./schedule/schedule.module";
import { CourseModule } from "./course/course.module";
import { GroupModule } from "./group/group.module";
import { RealtimeModule } from "./realtime/realtime.module";
import { HealthModule } from "./health/health.module";

@Module({
  imports: [
    LoggerModule.forRoot({
      pinoHttp: {
        transport:
          process.env.NODE_ENV !== "production"
            ? { target: "pino-pretty", options: { colorize: true } }
            : undefined,
        level: process.env.LOG_LEVEL ?? "info",
        serializers: {
          req: (req: any) => ({ method: req.method, url: req.url }),
          res: (res: any) => ({ statusCode: res.statusCode }),
        },
      },
    }),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, "..", "public"),
      exclude: ["/api/(.*)"],
    }),
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([
      {
        name: "short",
        ttl: 1000,
        limit: 10,
      },
      {
        name: "medium",
        ttl: 60000,
        limit: 50,
      },
    ]),
    PrismaModule,
    HealthModule,
    RealtimeModule,
    AuthModule,
    ScheduleModule,
    CourseModule,
    GroupModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
