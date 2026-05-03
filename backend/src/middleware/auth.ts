/**
 * @file backend/src/middleware/auth.ts
 * @description JWT authentication and role-based access control middleware.
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_here';

export interface AuthRequest extends Request {
  user?: {
    userId: number;
    role: 'admin' | 'user';
    tokenId?: number;
  };
}

export function verifyToken(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ 
      error: 'Unauthorized', 
      code: 'INVALID_TOKEN' 
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    req.user = {
      userId: decoded.userId,
      role: decoded.role,
      tokenId: decoded.tokenId
    };
    next();
  } catch (err) {
    console.error('JWT Verification Error:', err);
    return res.status(401).json({ 
      error: 'Unauthorized', 
      code: 'INVALID_TOKEN' 
    });
  }
}

export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ 
      error: 'Forbidden', 
      code: 'INSUFFICIENT_ROLE' 
    });
  }
  next();
}
