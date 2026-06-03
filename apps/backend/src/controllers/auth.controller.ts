import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';

export class AuthController {
  private authService = new AuthService();

  register = async (request: Request, response: Response) => {
    try {
      // Pegar os dados do body (campos texto)
      const { name, email, password, twoFactor } = request.body;
      
      // Pegar o arquivo enviado (se existir)
      const avatarFile = request.file;
      let urlPhoto: string | undefined = undefined;
      
      // Se veio um arquivo, gerar a URL pública
      if (avatarFile) {
        // A URL será relativa ao servidor
        urlPhoto = `/uploads/avatars/${avatarFile.filename}`;
        console.info(`Foto salva: ${urlPhoto}`);
      }
      
      // Validar campos obrigatórios
      if (!name || !email || !password) {
        return response.status(400).json({
          ok: false,
          message: 'Nome, e-mail e senha são obrigatórios'
        });
      }
      
      // Chamar o serviço
      const user = await this.authService.register(
        name,
        email,
        password,
        twoFactor === 'true' || twoFactor === true,
        urlPhoto
      );
      
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
      const session = await this.authService.login(email, password);

      return response.status(200).json({ ok: true, data: session });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro interno';
      return response.status(400).json({ ok: false, message });
    }
  };

  me = async (request: Request, response: Response) => {
    try {
      const accessToken = this.getBearerToken(request);
      if (!accessToken) {
        return response.status(401).json({
          ok: false,
          message: 'Token de acesso não informado',
        });
      }

      const user = await this.authService.getUserFromToken(accessToken);
      return response.status(200).json({ ok: true, data: user });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro interno';
      return response.status(401).json({ ok: false, message });
    }
  };

  private getBearerToken(request: Request): string | null {
    const authorization = request.headers.authorization;
    if (!authorization?.startsWith('Bearer ')) {
      return null;
    }

    return authorization.slice('Bearer '.length).trim() || null;
  }
}
