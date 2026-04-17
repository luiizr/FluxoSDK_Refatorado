import { Request, Response } from 'express';
import { SdkService } from '../services/sdk.service';

export class SdkController {
  private sdkService = new SdkService();

  receiveEvents = async (request: Request, response: Response) => {
    try {
      const result = await this.sdkService.receiveEvents(request.body);

      return response.status(202).json({
        ok: true,
        message: 'Eventos do SDK recebidos com sucesso',
        data: result,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro interno';

      return response.status(400).json({
        ok: false,
        message,
      });
    }
  };

  listRecentEvents = async (request: Request, response: Response) => {
    try {
      const siteKey = request.query.siteKey as string | undefined;
      const events = await this.sdkService.listRecentEvents(20, siteKey);

      return response.status(200).json({
        ok: true,
        data: events,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro interno';

      return response.status(400).json({
        ok: false,
        message,
      });
    }
  };

  getStats = async (request: Request, response: Response) => {
    try {
      const siteKey = request.query.siteKey as string;
      if (!siteKey) {
        return response.status(400).json({ ok: false, message: 'siteKey é obrigatório' });
      }

      const stats = await this.sdkService.getStats(siteKey);

      return response.status(200).json({
        ok: true,
        data: stats,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro interno';

      return response.status(400).json({
        ok: false,
        message,
      });
    }
  };
}
