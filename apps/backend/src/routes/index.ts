import { Router } from 'express';
import { authRoutes } from './auth.routes';
import { siteRoutes } from './site.routes';
import { sessionRoutes } from './session.routes';

const routes = Router();

routes.use('/auth', authRoutes);
routes.use('/sites', siteRoutes);
routes.use('/sessions', sessionRoutes);

export { routes };
