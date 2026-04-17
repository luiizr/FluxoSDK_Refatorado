import { Router } from 'express';
import { SitesController } from '../controllers/sites.controller';

const sitesRoutes = Router();
const sitesController = new SitesController();

sitesRoutes.post('/', sitesController.createSite);
sitesRoutes.get('/', sitesController.listSites);
sitesRoutes.delete('/:id', sitesController.deleteSite);

export { sitesRoutes };