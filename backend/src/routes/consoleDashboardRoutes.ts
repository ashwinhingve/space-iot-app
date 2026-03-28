import { Router } from 'express';
import { auth } from '../middleware/auth';
import { apiLimiter } from '../middleware/rateLimiter';
import {
  getTemplates,
  getDashboards,
  createDashboard,
  getDashboard,
  updateDashboard,
  saveDashboardLayout,
  deleteDashboard,
  addWidget,
  updateWidget,
  deleteWidget,
} from '../controllers/consoleDashboardController';

const router = Router();

router.use(apiLimiter);
router.use(auth);

router.get('/templates',                       getTemplates);
router.get('/',                                getDashboards);
router.post('/',                               createDashboard);
router.get('/:id',                             getDashboard);
router.patch('/:id',                           updateDashboard);
router.put('/:id/layout',                      saveDashboardLayout);
router.delete('/:id',                          deleteDashboard);
router.post('/:id/widgets',                    addWidget);
router.patch('/:id/widgets/:widgetId',         updateWidget);
router.delete('/:id/widgets/:widgetId',        deleteWidget);

export default router;
