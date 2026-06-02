import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';

export class AuthController {
  private authService = new AuthService();

  register = async (request: Request, response: Response) => {
    console.info("register:", request.body);
    try {
      const { name, email, password, twoFactor, urlPhoto } = request.body;
      const user = await this.authService.register(name, email, password, twoFactor, urlPhoto);
      return response.status(201).json({
        ok: true,
        message: 'Usuário registrado com sucesso',
        data: user,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro interno';
      return response.status(400).json({ ok: false, message });
    }
  };

  login = async (request: Request, response: Response) => {
    try {
      const { email, password } = request.body;
      const user = await this.authService.login(email, password);

      return response.status(200).json({ ok: true, data: user });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro interno';
      return response.status(400).json({ ok: false, message });
    }
  };
}