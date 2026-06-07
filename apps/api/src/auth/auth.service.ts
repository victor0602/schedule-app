import { Injectable, UnauthorizedException, ConflictException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcryptjs";
import { PrismaService } from "../prisma/prisma.service";
import type { LoginDto, RegisterDto, AuthResponse } from "@schedule/shared";

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResponse> {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException("Email already registered");
    }
    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        displayName: dto.displayName,
      },
    });
    return this.issueTokens(user.id, user.email, user.displayName);
  }

  async login(dto: LoginDto): Promise<AuthResponse> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (!user) throw new UnauthorizedException("Invalid credentials");
    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) throw new UnauthorizedException("Invalid credentials");
    return this.issueTokens(user.id, user.email, user.displayName);
  }

  async refresh(refreshToken: string, deviceId?: string): Promise<AuthResponse> {
    const record = await this.prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    });
    if (!record || record.expiresAt < new Date()) {
      throw new UnauthorizedException("Invalid refresh token");
    }
    // 按设备管理 refresh token
    if (deviceId) {
      await this.prisma.refreshToken.deleteMany({
        where: { userId: record.user.id, deviceId },
      });
    } else {
      // 无 deviceId：清除所有旧 token（向后兼容）
      await this.prisma.refreshToken.deleteMany({
        where: { userId: record.user.id },
      });
    }
    return this.issueTokens(
      record.user.id,
      record.user.email,
      record.user.displayName,
      deviceId,
    );
  }

  private async issueTokens(
    id: string,
    email: string,
    displayName: string,
    deviceId?: string,
  ): Promise<AuthResponse> {
    const accessToken = await this.jwt.signAsync(
      { sub: id, email },
      {
        secret: process.env.JWT_ACCESS_SECRET,
        expiresIn: "15m",
      },
    );
    const refreshTokenValue = await this.jwt.signAsync(
      { sub: id, type: "refresh" },
      {
        secret: process.env.JWT_REFRESH_SECRET,
        expiresIn: "7d",
      },
    );
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await this.prisma.refreshToken.create({
      data: { userId: id, token: refreshTokenValue, expiresAt, deviceId: deviceId ?? null },
    });
    return {
      accessToken,
      refreshToken: refreshTokenValue,
      user: { id, email, displayName, createdAt: new Date().toISOString() },
    };
  }
}
