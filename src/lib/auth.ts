import { SignJWT, jwtVerify, type JWTPayload } from 'jose';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';

const SALT_ROUNDS = 12;
const JWT_EXPIRY = '7d';
const COOKIE_NAME = 'thabat_token';

function getJwtSecret(): Uint8Array {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('JWT_SECRET not configured');
    return new TextEncoder().encode(secret);
}

// ---- Password Hashing ----

export async function hashPassword(plain: string): Promise<string> {
    return bcrypt.hash(plain, SALT_ROUNDS);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plain, hash);
}

// ---- JWT ----

export interface TokenPayload extends JWTPayload {
    userId: string;
    orgId: string;
    role: string;
}

export async function signJWT(payload: {
    userId: string;
    orgId: string;
    role: string;
}): Promise<string> {
    return new SignJWT(payload as unknown as JWTPayload)
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime(JWT_EXPIRY)
        .setIssuer('thabat')
        .sign(getJwtSecret());
}

export async function verifyJWT(token: string): Promise<TokenPayload> {
    const { payload } = await jwtVerify(token, getJwtSecret(), {
        issuer: 'thabat',
    });
    return payload as TokenPayload;
}

// ---- Session Extraction ----

export async function getSession(): Promise<TokenPayload | null> {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get(COOKIE_NAME)?.value;
        if (!token) return null;
        return verifyJWT(token);
    } catch {
        return null;
    }
}

export { COOKIE_NAME };
