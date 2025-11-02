import { Request, Response, NextFunction } from 'express';
import { ForbiddenError } from '../../core/types/errors';
import { hasPermission } from './permissions';

export function requirePermission(permission: string) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const role = req.user?.role;
    if (!role || !hasPermission(role, permission)) {
      return next(new ForbiddenError('Insufficient permissions'));
    }
    return next();
  };
}
