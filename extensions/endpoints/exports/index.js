import { AuthMiddleware } from '../../middlewares/auth.middleware.js';
import { ExportData } from './export-data.controller.js';

export default (router, { exceptions }) => {
  const exportData = new ExportData(exceptions);
  const auth = new AuthMiddleware(exceptions);
  router.get(
    '/users',
    (request, response, next) => auth.verifyToken(request, response, next),
    (request, response, next) => exportData.exportUsers(request, response, next)
  );
  router.get(
    '/transactions',
    (request, response, next) => auth.verifyToken(request, response, next),
    (request, response, next) =>
      exportData.exportTransactions(request, response, next)
  );
};
