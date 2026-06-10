import { Router } from 'express';
import { SessionController } from '../controllers/session.controller';
import { authMiddleware } from '../middleware/auth';

const sessionRoutes = Router();
const sessionController = new SessionController();

sessionRoutes.get('/', authMiddleware, sessionController.list);
sessionRoutes.get('/:sessionId/events', authMiddleware, sessionController.getEvents);

export { sessionRoutes };
