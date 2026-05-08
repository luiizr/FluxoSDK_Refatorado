import { Router } from 'express';
import { KpiController } from '../controllers/kpi.controller';

const kpiRoutes = Router();
const kpiController = new KpiController();

kpiRoutes.post('/sites/:siteId/metric-definitions', kpiController.createMetricDefinition);
kpiRoutes.get('/sites/:siteId/metric-definitions', kpiController.listMetricDefinitions);
kpiRoutes.post('/sites/:siteId/intent-rules', kpiController.createIntentRule);
kpiRoutes.get('/sites/:siteId/intent-rules', kpiController.listIntentRules);
kpiRoutes.post('/sites/:siteId/kpis', kpiController.createKpi);
kpiRoutes.get('/sites/:siteId/kpis', kpiController.listKpis);
kpiRoutes.get('/sites/:siteId/dashboard', kpiController.getDashboardBySite);
kpiRoutes.get('/kpis/:kpiId/result', kpiController.getKpiResult);
kpiRoutes.post('/dashboards', kpiController.createDashboard);
kpiRoutes.get('/dashboards/:dashboardId', kpiController.getDashboard);
kpiRoutes.put('/dashboards/:dashboardId/items', kpiController.updateDashboardItems);

export { kpiRoutes };
