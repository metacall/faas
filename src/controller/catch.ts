import { NextFunction, Request, RequestHandler, Response } from 'express';

export const catchAsync = (
	fn: (
		req: Request,
		res: Response,
		next: NextFunction
	) => Promise<Response | void>
): RequestHandler => {
	return (req: Request, res: Response, next: NextFunction) => {
		return fn(req, res, next).catch(err => next(err));
	};
};
