import { MezzoCoin } from './mezzo-coin.controller.js';
import { AuthMiddleware } from '../../middlewares/auth.middleware.js';

export default (router, { exceptions, database }) => {
  const mezzoCoin = new MezzoCoin(exceptions, database);
  const auth = new AuthMiddleware(exceptions);

  router.post(
    '/deposit',
    (req, res, next) => auth.verifyToken(req, res, next),
    (req, res, next) => mezzoCoin.deposit(req, res, next)
  );

  router.post(
    '/withdraw',
    (req, res, next) => auth.verifyToken(req, res, next),
    (req, res, next) => mezzoCoin.withdraw(req, res, next)
  );

  router.post(
    '/discount',
    (req, res, next) => auth.verifyToken(req, res, next),
    (req, res, next) => mezzoCoin.discount(req, res, next)
  );

  router.post('/users', (req, res, next) =>
    mezzoCoin.insertUsers(req, res, next)
  );

  router.post('/companies', (req, res, next) =>
    mezzoCoin.inserCompanies(req, res, next)
  );
};
