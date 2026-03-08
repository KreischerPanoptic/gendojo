import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { AuthGuard } from './auth.guard';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import * as ms from 'ms';
/**
 * AUTH_SECRET — секрет для подписи JWT.
 * Если не задан — используем fallback (только для dev!).
 * На RunPod обязательно задавать через template variables.
 */
const JWT_SECRET = process.env.AUTH_SECRET?.trim() || 'dev-secret-change-me-in-production';
const JWT_EXPIRES = process.env.AUTH_TOKEN_EXPIRES || '30d';

@Module({
  imports: [
    JwtModule.register({
      secret: JWT_SECRET,
      signOptions: { expiresIn: JWT_EXPIRES as ms.StringValue },
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
  ],
  exports: [AuthService],
})
export class AuthModule {}