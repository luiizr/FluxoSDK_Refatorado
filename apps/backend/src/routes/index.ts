import { Router } from 'express';
import { sdkRoutes } from './sdk.routes';
import { sitesRoutes } from './sites.routes';
import { authRoutes } from './auth.routes';
import { adminRoutes } from './admin.routes';

const routes = Router();

routes.use('/sdk', sdkRoutes);
routes.use('/sites', sitesRoutes);
routes.use('/auth', authRoutes);
routes.use('/admin', adminRoutes);

export { routes };
