import { Request, Response } from 'express';
import { KpiService } from '../services/kpi.service';

export class KpiController {
  private kpiService = new KpiService();

  createMetricDefinition = async (request: Request, response: Response) => {
    try {
      const userId = this.getUserId(request);
      const metric = await this.kpiService.createMetricDefinition(request.params.siteId, userId, request.body);
      return response.status(201).json({ ok: true, data: metric });
    } catch (error) {
      return this.handleError(response, error);
    }
  };

  listMetricDefinitions = async (request: Request, response: Response) => {
    try {
      const userId = this.getUserId(request);
      const metrics = await this.kpiService.listMetricDefinitions(request.params.siteId, userId);
      return response.status(200).json({ ok: true, data: metrics });
    } catch (error) {
      return this.handleError(response, error);
    }
  };

  createKpi = async (request: Request, response: Response) => {
    try {
      const userId = this.getUserId(request);
      const kpi = await this.kpiService.createKpi(request.params.siteId, userId, request.body);
      return response.status(201).json({ ok: true, data: kpi });
    } catch (error) {
      return this.handleError(response, error);
    }
  };

  createIntentRule = async (request: Request, response: Response) => {
    try {
      const userId = this.getUserId(request);
      const rule = await this.kpiService.createIntentRule(request.params.siteId, userId, request.body);
      return response.status(201).json({ ok: true, data: rule });
    } catch (error) {
      return this.handleError(response, error);
    }
  };

  listIntentRules = async (request: Request, response: Response) => {
    try {
      const userId = this.getUserId(request);
      const rules = await this.kpiService.listIntentRules(request.params.siteId, userId);
      return response.status(200).json({ ok: true, data: rules });
    } catch (error) {
      return this.handleError(response, error);
    }
  };

  listKpis = async (request: Request, response: Response) => {
    try {
      const userId = this.getUserId(request);
      const kpis = await this.kpiService.listKpis(request.params.siteId, userId);
      return response.status(200).json({ ok: true, data: kpis });
    } catch (error) {
      return this.handleError(response, error);
    }
  };

  getKpiResult = async (request: Request, response: Response) => {
    try {
      const userId = this.getUserId(request);
      const result = await this.kpiService.getKpiResult(request.params.kpiId, userId);
      return response.status(200).json({ ok: true, data: result });
    } catch (error) {
      return this.handleError(response, error);
    }
  };

  getDashboardBySite = async (request: Request, response: Response) => {
    try {
      const userId = this.getUserId(request);
      const dashboard = await this.kpiService.getDashboardBySite(request.params.siteId, userId);
      return response.status(200).json({ ok: true, data: dashboard });
    } catch (error) {
      return this.handleError(response, error);
    }
  };

  createDashboard = async (request: Request, response: Response) => {
    try {
      const userId = this.getUserId(request);
      const dashboard = await this.kpiService.createDashboard(userId, request.body);
      return response.status(201).json({ ok: true, data: dashboard });
    } catch (error) {
      return this.handleError(response, error);
    }
  };

  getDashboard = async (request: Request, response: Response) => {
    try {
      const userId = this.getUserId(request);
      const dashboard = await this.kpiService.getDashboard(request.params.dashboardId, userId);
      return response.status(200).json({ ok: true, data: dashboard });
    } catch (error) {
      return this.handleError(response, error);
    }
  };

  updateDashboardItems = async (request: Request, response: Response) => {
    try {
      const userId = this.getUserId(request);
      const dashboard = await this.kpiService.updateDashboardItems(
        request.params.dashboardId,
        userId,
        request.body?.items,
      );
      return response.status(200).json({ ok: true, data: dashboard });
    } catch (error) {
      return this.handleError(response, error);
    }
  };

  private getUserId(request: Request) {
    const userId = request.headers['x-user-id'];
    if (!userId || Array.isArray(userId)) throw new Error('Usuario nao autenticado');
    return userId;
  }

  private handleError(response: Response, error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro interno';
    return response.status(message.includes('nao autenticado') ? 401 : 400).json({ ok: false, message });
  }
}
