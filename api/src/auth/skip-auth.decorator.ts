import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Marking route as public — AuthGuard skips it.
 * Used for: POST /auth/login, health-check, etc.
 *
 * @example
 * @SkipAuth()
 * @Get('health')
 * health() { return { status: 'ok' }; }
 */
export const SkipAuth = () => SetMetadata(IS_PUBLIC_KEY, true);