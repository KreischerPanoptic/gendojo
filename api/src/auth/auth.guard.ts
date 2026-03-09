import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { IS_PUBLIC_KEY } from './skip-auth.decorator';

@Injectable()
export class AuthGuard implements CanActivate {
  private readonly logger = new Logger(AuthGuard.name);
  private readonly authEnabled: boolean;

  constructor(
    private readonly jwtService: JwtService,
    private readonly reflector: Reflector,
  ) {
    const username = process.env.AUTH_USERNAME?.trim() ?? '';
    const password = process.env.AUTH_PASSWORD?.trim() ?? '';
    this.authEnabled = !!(username && password);
  }

  canActivate(context: ExecutionContext): boolean {
    // Checking @SkipAuth() on handler or class
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) return true;

    // Dev mode — AUTH_USERNAME/AUTH_PASSWORD not set
    if (!this.authEnabled) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException('Authorization header is missing');
    }

    try {
      request['user'] = this.jwtService.verify(token);
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }

    return true;
  }

  private extractToken(request: Request): string | null {
    const authHeader = request.headers['authorization'];
    if (!authHeader) return null;

    const [scheme, token] = authHeader.split(' ');
    if (scheme?.toLowerCase() !== 'bearer' || !token) return null;

    return token;
  }
}