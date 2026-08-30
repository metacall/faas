import { Request, Response, Router } from 'express';

const router = Router();

router.get('/health', (_req: Request, res: Response) => {
	const mem = process.memoryUsage();
	return res.status(200).json({
		status: 'ok',
		version: process.env.npm_package_version ?? 'unknown',
		uptime: Math.floor(process.uptime()),
		timestamp: new Date().toISOString(),
		runtime: 'metacall-faas-local',
		memory: {
			heapUsed: Math.round(mem.heapUsed / 1024 / 1024),
			heapTotal: Math.round(mem.heapTotal / 1024 / 1024),
			rss: Math.round(mem.rss / 1024 / 1024)
		}
	});
});

export default router;
