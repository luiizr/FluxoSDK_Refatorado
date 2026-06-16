import { Router } from 'express';
import { SiteController } from '../controllers/site.controller';
import { authMiddleware } from '../middleware/auth';

const siteRoutes = Router();
const siteController = new SiteController();

siteRoutes.post('/', authMiddleware, siteController.create);
siteRoutes.get('/', authMiddleware, siteController.list);
siteRoutes.get('/:id/snippet', authMiddleware, siteController.getSnippet);
siteRoutes.patch('/:id/settings', authMiddleware, siteController.updateSettings);
siteRoutes.get('/settings/:publicKey', siteController.getSettingsByPublicKey);

export { siteRoutes };
