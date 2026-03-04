import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Помечает роут как публичный — AuthGuard его пропустит.
 * Используй для: POST /auth/login, health-check и т.п.
 *
 * @example
 * @SkipAuth()
 * @Get('health')
 * health() { return { status: 'ok' }; }
 */
export const SkipAuth = () => SetMetadata(IS_PUBLIC_KEY, true);