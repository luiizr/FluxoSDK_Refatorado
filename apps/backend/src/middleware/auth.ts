import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service';

const authService = new AuthService();
console.info('AuthService instanciado no middleware de autenticação');
export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  console.info('Verificando autenticação...');
  console.info('req.headers:', req.headers);
  console.info('req.headers.authorization:', req.headers.authorization);
  console.info('req', req);

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
