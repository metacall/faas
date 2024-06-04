import { Request, Response } from 'express';

// TODO: Implement wait to autoDeploy to finish
export const validate = (_req: Request, res: Response): Response =>
	res.status(200).json({
		status: 'success',
		data: true
	});
