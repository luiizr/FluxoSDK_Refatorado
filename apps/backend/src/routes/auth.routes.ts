import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { upload } from '../middleware/upload.service';

const authRoutes = Router();
const authController = new AuthController();

authRoutes.post('/register', upload.single('avatar'), authController.register);
authRoutes.post('/login', authController.login);
authRoutes.get('/me', authController.me);

export { authRoutes };
