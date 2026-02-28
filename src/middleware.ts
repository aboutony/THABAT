import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';
import { NextRequest, NextResponse } from 'next/server';

const intlMiddleware = createMiddleware(routing);

// Public paths that don't require authentication
const PUBLIC_PATHS = ['/login', '/signup'];

export default async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Skip API routes and static assets
    if (pathname.startsWith('/api') || pathname.startsWith('/_next') || pathname.includes('.')) {
        return NextResponse.next();
    }

    // Run intl middleware first to handle locale routing
    const response = intlMiddleware(request);

    // Check if the path (without locale prefix) is public
    const pathWithoutLocale = pathname.replace(/^\/(en|ar)/, '') || '/';
    const isPublicPath = PUBLIC_PATHS.some(p => pathWithoutLocale.startsWith(p));

    // Check for auth token
    const token = request.cookies.get('thabat_token')?.value;

    if (!token && !isPublicPath) {
        // Not authenticated → redirect to login
        const locale = pathname.startsWith('/ar') ? 'ar' : 'en';
        const loginUrl = new URL(`/${locale}/login`, request.url);
        return NextResponse.redirect(loginUrl);
    }

    if (token && isPublicPath) {
        // Already authenticated → redirect to dashboard
        const locale = pathname.startsWith('/ar') ? 'ar' : 'en';
        const dashUrl = new URL(`/${locale}`, request.url);
        return NextResponse.redirect(dashUrl);
    }

    return response;
}

export const config = {
    matcher: ['/((?!api|_next|.*\\..*).*)'],
};
