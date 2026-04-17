import { Request, Response } from 'express';
import { SitesService } from '../services/sites.service';

export class SitesController {
  private sitesService = new SitesService();

  createSite = async (request: Request, response: Response) => {
    try {
      const { name, domain } = request.body;
      const userId = request.headers['x-user-id'] as string;
      if (!userId) return response.status(401).json({ ok: false, message: 'Usuário não autenticado' });

      const site = await this.sitesService.registerSite(name, domain, userId);

      return response.status(201).json({
        ok: true,
        message: 'Site registrado com sucesso',
        data: site,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro interno';
      return response.status(400).json({ ok: false, message });
    }
  };

  listSites = async (request: Request, response: Response) => {
    try {
      const userId = request.headers['x-user-id'] as string;
      if (!userId) return response.status(401).json({ ok: false, message: 'Usuário não autenticado' });

      const sites = await this.sitesService.listSites(userId);
      return response.status(200).json({ ok: true, data: sites });
    } catch (error) {
      return response.status(400).json({ ok: false, message: 'Erro interno' }); 
    }
  };

  deleteSite = async (request: Request, response: Response) => {
    try {
      const userId = request.headers['x-user-id'] as string;
      const { id } = request.params;
      
      if (!userId) return response.status(401).json({ ok: false, message: 'Usuário não autenticado' });

      await this.sitesService.deleteSite(id, userId);
      return response.status(200).json({ ok: true, message: 'Site deletado' });
    } catch (error) {
      return response.status(400).json({ ok: false, message: 'Erro interno' });
    }
  };
}