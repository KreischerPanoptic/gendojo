import { Body, Controller, Post, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';
import type { LoginResponse } from './auth.service'
import { LoginDto } from './dto/login.dto';
import { SkipAuth } from './skip-auth.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * POST /auth/login
   * Публичный эндпоинт — guard пропускает его через @SkipAuth()
   *
   * Body: { username: string, password: string }
   * Response: { accessToken: string, username: string }
   */
  @SkipAuth()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto): LoginResponse {
    return this.authService.login(dto);
  }
}