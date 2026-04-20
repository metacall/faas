import { Request, Response, Router } from 'express';
import { Applications } from '../app';

const router = Router();

router.delete('/:prefix/:name/v1/delete', (req: Request, res: Response) => {
	const { prefix, name } = req.params;
	const application = Applications[name];

	if (!application) {
		return res.status(404).json({
			error: 'NOT_FOUND',
			message: 'Deployment not found',
			statusCode: 404
		});
	}

	delete Applications[name];

	return res.status(200).json({
		message: 'Deployment deleted successfully',
		prefix,
		name
	});
});

export default router;
