import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const JWT_SECRET = process.env.JWT_SECRET || 'metacall-local-dev-secret';
const JWT_EXPIRES_IN = '30d';

export interface TokenPayload {
	email: string;
	iat?: number;
	exp?: number;
}

// Sign a JWT token for a given email.
export function signToken(email: string): string {
	return jwt.sign({ email }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

// Verify a JWT token and return the payload, or null if invalid.
export function verifyToken(token: string): TokenPayload | null {
	try {
		return jwt.verify(token, JWT_SECRET) as TokenPayload;
	} catch {
		return null;
	}
}

// Hash a plain-text password.
export function hashPassword(plain: string): Promise<string> {
	return bcrypt.hash(plain, 10);
}

// Compare a plain-text password against a bcrypt hash.
export function comparePassword(plain: string, hash: string): Promise<boolean> {
	return bcrypt.compare(plain, hash);
}
