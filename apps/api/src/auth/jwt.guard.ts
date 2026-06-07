import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Request } from "express";

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<Request>();
    const header = req.headers.authorization;
    if (!header || !header.startsWith("Bearer ")) {
      throw new UnauthorizedException();
    }
    const token = header.slice(7);
    try {
      const payload = await this.jwt.verifyAsync<{ sub: string; email: string }>(
        token,
        {
          secret: process.env.JWT_ACCESS_SECRET,
        },
      );
      (req as Request & { userId: string }).userId = payload.sub;
      return true;
    } catch {
      throw new UnauthorizedException();
    }
  }
}
