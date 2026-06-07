import { Global, Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { RealtimeGateway } from "./realtime.gateway";
import { RealtimeService } from "./realtime.service";

@Global()
@Module({
  imports: [
    JwtModule.registerAsync({
      useFactory: () => ({
        secret: process.env.JWT_ACCESS_SECRET,
      }),
    }),
  ],
  providers: [RealtimeGateway, RealtimeService],
  exports: [RealtimeService, JwtModule],
})
export class RealtimeModule {}
