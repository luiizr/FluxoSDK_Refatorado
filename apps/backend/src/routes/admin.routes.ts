import { Router } from 'express';
import { AdminController } from '../controllers/admin.controller';

const adminRoutes = Router();
const adminController = new AdminController();

adminRoutes.get('/overview', adminController.overview);

export { adminRoutes };
