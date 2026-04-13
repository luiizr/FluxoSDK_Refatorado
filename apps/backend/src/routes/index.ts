import { Router } from 'express';
import { sdkRoutes } from './sdk.routes';

const routes = Router();

routes.use('/sdk', sdkRoutes);

export { routes };
