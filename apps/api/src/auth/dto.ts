import { IsEmail, IsOptional, IsString, Matches, MinLength } from "class-validator";
import type { LoginDto, RegisterDto } from "@schedule/shared";

export class RegisterBody implements RegisterDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(6)
  @Matches(/^(?=.*[A-Za-z])(?=.*\d)/, {
    message: "密码必须包含至少一个字母和一个数字",
  })
  password!: string;

  @IsString()
  @MinLength(1)
  displayName!: string;
}

export class LoginBody implements LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  password!: string;
}

export class RefreshBody {
  @IsString()
  refreshToken!: string;

  @IsOptional()
  @IsString()
  deviceId?: string;
}
