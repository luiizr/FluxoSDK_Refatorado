import { Router } from 'express';
import { SdkController } from '../controllers/sdk.controller';

const sdkRoutes = Router();
const sdkController = new SdkController();

sdkRoutes.put('/events', sdkController.receiveEvents);
sdkRoutes.get('/events/recent', sdkController.listRecentEvents);
sdkRoutes.get('/stats', sdkController.getStats);

export { sdkRoutes };
