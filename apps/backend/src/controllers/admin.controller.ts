import { Request, Response } from 'express';
import { AdminService } from '../services/admin.service';

export class AdminController {
  private adminService = new AdminService();

  overview = async (request: Request, response: Response) => {
    try {
      const userId = request.headers['x-user-id'] as string | undefined;
      if (!userId) {
        return response.status(401).json({ ok: false, message: 'Usuario nao autenticado' });
      }

      const data = await this.adminService.getOverview(userId);
      return response.status(200).json({ ok: true, data });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro interno';
      return response.status(400).json({ ok: false, message });
    }
  };
}
