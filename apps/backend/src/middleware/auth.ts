import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service';

const authService = new AuthService();
export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const authorization = req.headers.authorization;
    if (!authorization?.startsWith('Bearer ')) {
      return res.status(401).json({ ok: false, message: 'Não autorizado' });
    }

    const token = authorization.slice('Bearer '.length).trim();
    const user = await authService.getUserFromToken(token);
    // Injetar usuário no request para uso posterior
    (req as any).user = user;
    
    next();
  } catch (error) {
    return res.status(401).json({ ok: false, message: 'Token inválido' });
  }
};
