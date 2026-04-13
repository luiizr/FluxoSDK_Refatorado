import { Router } from 'express';
import { SdkController } from '../controllers/sdk.controller';

const sdkRoutes = Router();
const sdkController = new SdkController();

sdkRoutes.post('/events', sdkController.receiveEvents);
sdkRoutes.get('/events/recent', sdkController.listRecentEvents);

export { sdkRoutes };
