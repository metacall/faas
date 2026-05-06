import { NextFunction, Request, Response } from 'express';

interface ErrorResponse {
	error: string;
	message: string;
	statusCode: number;
}

export const errorHandler = (
	err: Error & { statusCode?: number; code?: string },
	_req: Request,
	res: Response,
	_next: NextFunction
): void => {
	const statusCode = err.statusCode ?? 500;
	const code = err.code ?? 'INTERNAL_ERROR';

	console.log(`[ERROR] ${code}: ${err.message}`);

	const body: ErrorResponse = {
		error: code,
		message: err.message,
		statusCode
	};

	res.status(statusCode).json(body);
};
