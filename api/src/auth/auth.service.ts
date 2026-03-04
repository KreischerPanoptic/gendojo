import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { LoginDto } from './dto/login.dto';

export interface LoginResponse {
  accessToken: string;
  username: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  private readonly username: string;
  private readonly password: string;
  private readonly authEnabled: boolean;

  constructor(private readonly jwtService: JwtService) {
    this.username = process.env.AUTH_USERNAME?.trim() ?? '';
    this.password = process.env.AUTH_PASSWORD?.trim() ?? '';
    this.authEnabled = !!(this.username && this.password);

    if (!this.authEnabled) {
      this.logger.warn(
        'AUTH_USERNAME / AUTH_PASSWORD not set — authentication is DISABLED (dev mode)',
      );
    }
  }

  get isAuthEnabled(): boolean {
    return this.authEnabled;
  }

  login(dto: LoginDto): LoginResponse {
    if (!this.authEnabled) {
      // Dev режим — принимаем любые credentials, токен всё равно игнорируется guard-ом
      const devToken = this.jwtService.sign({ sub: dto.username || 'dev' });
      return { accessToken: devToken, username: dto.username || 'dev' };
    }

    if (dto.username !== this.username || dto.password !== this.password) {
      this.logger.warn(`Failed login attempt for username "${dto.username}"`);
      throw new UnauthorizedException('Invalid username or password');
    }

    const payload = { sub: this.username };
    const accessToken = this.jwtService.sign(payload);

    this.logger.log(`User "${this.username}" logged in`);
    return { accessToken, username: this.username };
  }
}