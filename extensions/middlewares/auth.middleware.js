import jwt from 'jsonwebtoken';
import * as dotenv from 'dotenv';
dotenv.config();

const secret = process.env.SECRET;

export class AuthMiddleware {
  exceptions;
  constructor(exceptions) {
    this.exceptions = exceptions;
  }

  verifyToken(request, response, next) {
    const token = request.headers.authorization?.split(' ')[1];

    if (!token) {
      return next(new this.exceptions.InvalidTokenException());
    }

    try {
      const decoded = jwt.verify(token, secret);
      const { role } = decoded;
      if (
        role !== process.env.ADMIN_ROLE &&
        role !== process.env.MANAGER_ROLE
      ) {
        return next(new this.exceptions.ForbiddenException());
      }

      request.user = decoded;
      next();
    } catch (error) {
      return next(new this.exceptions.InvalidTokenException());
    }
  }

  verifyAdminToken(request, response, next) {
    const token = request.headers.authorization?.split(' ')[1];

    if (!token) {
      return next(new this.exceptions.InvalidTokenException());
    }

    try {
      const decoded = jwt.verify(token, secret);
      const { role } = decoded;
      if (role !== process.env.ADMIN_ROLE) {
        return next(new this.exceptions.ForbiddenException());
      }
      request.user = decoded;
      next();
    } catch (error) {
      return next(new this.exceptions.InvalidTokenException());
    }
  }
}
