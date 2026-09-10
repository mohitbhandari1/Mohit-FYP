import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';

export interface AuthRequest extends Request {
  userId?: number;
  userRole?: string;
  /** Populated by authMiddleware so handlers can use req.user?.id / req.user?.role */
  user?: { id: number; role: string };
}

export const authMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
  // Try Authorization header first, then fall back to httpOnly cookie
  const token =
    req.headers.authorization?.split(' ')[1] ||
    req.cookies?.token;

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret-key') as any;
    req.userId = decoded.id;
    req.userRole = decoded.role;
    req.user = { id: decoded.id, role: decoded.role };
    next();
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    res.status(401).json({ error: 'Invalid token' });
  }
};

export const adminMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (req.userRole !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// Optional auth - attaches user info if token is present, but doesn't block
export const optionalAuth = (req: AuthRequest, _res: Response, next: NextFunction) => {
  const token =
    req.headers.authorization?.split(' ')[1] ||
    req.cookies?.token;

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret-key') as any;
      req.userId = decoded.id;
      req.userRole = decoded.role;
      req.user = { id: decoded.id, role: decoded.role };
    } catch {
      // Token invalid - continue without auth
    }
  }
  next();
};
