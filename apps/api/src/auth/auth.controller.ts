import { Body, Controller, Get, Post, UseGuards, Req } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { LoginBody, RefreshBody, RegisterBody } from "./dto";
import { JwtAuthGuard } from "./jwt.guard";
import { PrismaService } from "../prisma/prisma.service";
import type { Request } from "express";

@Controller("auth")
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly prisma: PrismaService,
  ) {}

  @Post("register")
  register(@Body() body: RegisterBody) {
    return this.auth.register(body);
  }

  @Post("login")
  login(@Body() body: LoginBody) {
    return this.auth.login(body);
  }

  @Post("refresh")
  refresh(@Body() body: RefreshBody, @Req() req: Request) {
    const deviceId = (req.headers["x-device-id"] as string) || body.deviceId;
    return this.auth.refresh(body.refreshToken, deviceId);
  }

  @UseGuards(JwtAuthGuard)
  @Get("me")
  async me(@Req() req: Request & { userId: string }) {
    const user = await this.prisma.user.findUnique({
      where: { id: req.userId },
    });
    if (!user) return null;
    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      createdAt: user.createdAt.toISOString(),
    };
  }
}
