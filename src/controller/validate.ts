import { Request, Response } from 'express';

export const validate = (req: Request, res: Response): Response =>
	res.status(200).json({
		status: 'success',
		data: true
	});
