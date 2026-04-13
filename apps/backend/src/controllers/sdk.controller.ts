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

  listRecentEvents = async (_request: Request, response: Response) => {
    try {
      const events = await this.sdkService.listRecentEvents();

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
}
