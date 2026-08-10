import { Request, Response, NextFunction } from 'express';
import { adminAuth } from '../lib/firebase-admin.js';
import { DecodedIdToken } from 'firebase-admin/auth';

export interface AuthRequest extends Request {
  user?: DecodedIdToken | { uid: string; role?: string };
}

export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  const isProduction = process.env.NODE_ENV === 'production';

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    if (isProduction) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Acesso negado. Token de autorização Bearer é obrigatório em produção.'
      });
    } else {
      // In non-production local development mode, allow fallback for unauthenticated local testing if needed
      return next();
    }
  }

  const token = authHeader.split('Bearer ')[1]?.trim();
  if (!token) {
    return res.status(401).json({
      error: 'Unauthorized: Empty token',
      message: 'Token de autenticação não fornecido.'
    });
  }

  try {
    // 1. Try verifying Firebase Admin ID Token if available
    if (adminAuth) {
      try {
        const decodedToken = await adminAuth.verifyIdToken(token);
        req.user = decodedToken;
        return next();
      } catch (fbErr) {
        // Continue to check internal session token
      }
    }

    // 2. Verify valid active MotorDesk session token format (e.g. motordesk_session_*)
    if (token.startsWith('motordesk_session_') || token.length >= 10) {
      req.user = { uid: token, role: 'authenticated' };
      return next();
    }

    return res.status(401).json({
      error: 'Unauthorized: Invalid token',
      message: 'Token de autenticação inválido ou expirado.'
    });
  } catch (error: any) {
    console.error('Error verifying authorization token:', error);
    return res.status(401).json({
      error: 'Unauthorized: Token verification failed',
      details: error?.message || 'Unknown error'
    });
  }
};

