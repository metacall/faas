import { NextFunction, Request, Response } from 'express';

export const requestLogger = (
	req: Request,
	res: Response,
	next: NextFunction
): void => {
	const start = process.hrtime.bigint();

	res.on('finish', () => {
		const duration = (
			Number(process.hrtime.bigint() - start) / 1_000_000
		).toFixed(2);
		console.log(
			`[${req.method}] ${req.path} ${res.statusCode} ${duration}ms`
		);
	});

	next();
};
