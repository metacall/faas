import { Request, Response } from 'express';
import fs from 'fs/promises';
import path from 'path';
import { signToken, hashPassword, comparePassword } from '../utils/auth';

const USERS_FILE = path.resolve(process.cwd(), 'users.json');

interface User {
	email: string;
	passwordHash: string;
}

async function readUsers(): Promise<User[]> {
	try {
		const data = await fs.readFile(USERS_FILE, 'utf-8');
		return JSON.parse(data) as User[];
	} catch {
		return [];
	}
}

async function writeUsers(users: User[]): Promise<void> {
	await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2), 'utf-8');
}

/**
 * Seed the default dev user from environment variables if users.json is empty.
 * Called once at server start.
 */
export async function seedDefaultUser(): Promise<void> {
	const users = await readUsers();
	const email = process.env.DEFAULT_EMAIL || 'dev@metacall.io';
	const password = process.env.DEFAULT_PASSWORD || 'metacall123';

	const exists = users.some(u => u.email === email);
	if (!exists) {
		const passwordHash = await hashPassword(password);
		users.push({ email, passwordHash });
		await writeUsers(users);
		console.log(`[Auth] Default dev user seeded: ${email}`);
	}
}

/**
 * POST /api/auth/login
 * Body: `email` (string), `password` (string)
 * Returns: `token` (string), `email` (string)
 */
export async function login(req: Request, res: Response): Promise<void> {
	const { email, password } = req.body as {
		email?: string;
		password?: string;
	};

	if (!email || !password) {
		res.status(400).json({ error: 'Email and password are required.' });
		return;
	}

	const users = await readUsers();
	const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());

	if (!user || !(await comparePassword(password, user.passwordHash))) {
		res.status(401).json({ error: 'Invalid email or password.' });
		return;
	}

	const token = signToken(user.email);
	res.status(200).json({ token, email: user.email });
}

/**
 * POST /api/auth/signup
 * Body: `email` (string), `password` (string)
 * Returns: `token` (string), `email` (string)
 */
export async function signup(req: Request, res: Response): Promise<void> {
	const { email, password } = req.body as {
		email?: string;
		password?: string;
	};

	if (!email || !password) {
		res.status(400).json({ error: 'Email and password are required.' });
		return;
	}

	if (password.length < 6) {
		res.status(400).json({
			error: 'Password must be at least 6 characters.'
		});
		return;
	}

	const users = await readUsers();
	const exists = users.some(
		u => u.email.toLowerCase() === email.toLowerCase()
	);

	if (exists) {
		res.status(409).json({
			error: 'An account with this email already exists.'
		});
		return;
	}

	const passwordHash = await hashPassword(password);
	users.push({ email, passwordHash });
	await writeUsers(users);

	const token = signToken(email);
	res.status(201).json({ token, email });
}
