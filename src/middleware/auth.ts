import { Request, Response, NextFunction } from "express";
import { AuthUtils, JWTPayload } from "../utils/auth";
import prisma from "../config/database";

// ========================================
// EXTENDER REQUEST PARA INCLUIR USER
// ========================================
declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload & {
        isVerified?: boolean;
        isActive?: boolean;
      };
    }
  }
}

// ========================================
// MIDDLEWARE PRINCIPAL DE AUTENTICACIÓN
// ========================================
export const authenticateToken = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN

    if (!token) {
      res.status(401).json({
        success: false,
        error: "Token de acceso requerido",
        code: "NO_TOKEN",
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // Verificar token JWT
    const payload = AuthUtils.verifyAccessToken(token);

    // Verificar que el usuario existe y obtener información completa
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true,
        isVerified: true,
        firstName: true,
        lastName: true,
      },
    });

    if (!user) {
      res.status(401).json({
        success: false,
        error: "Usuario no encontrado",
        code: "USER_NOT_FOUND",
        timestamp: new Date().toISOString(),
      });
      return;
    }

    if (!user.isActive) {
      res.status(401).json({
        success: false,
        error: "Cuenta de usuario desactivada",
        code: "USER_INACTIVE",
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // NOTA: No validamos access tokens en BD, solo refresh tokens
    // Los access tokens son stateless y se validan solo por JWT
    // Solo validamos refresh tokens cuando se usan para renovar

    // Extender el payload con información adicional
    req.user = {
      ...payload,
      isVerified: user.isVerified,
      isActive: user.isActive,
    };

    // Log de acceso exitoso
    console.log(
      `✅ Auth success: User ${user.id} (${user.email}) accessed ${req.method} ${req.path}`,
    );

    next();
  } catch (error) {
    console.error("❌ Auth error:", error);

    if (error instanceof Error && error.name === "TokenExpiredError") {
      res.status(401).json({
        success: false,
        error: "Token expirado",
        code: "TOKEN_EXPIRED",
        timestamp: new Date().toISOString(),
      });
      return;
    }

    if (error instanceof Error && error.name === "JsonWebTokenError") {
      res.status(401).json({
        success: false,
        error: "Token inválido",
        code: "TOKEN_MALFORMED",
        timestamp: new Date().toISOString(),
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: "Error interno de autenticación",
      code: "AUTH_ERROR",
      timestamp: new Date().toISOString(),
    });
    return;
  }
};

// ========================================
// MIDDLEWARE DE ROLES
// ========================================

// Verificar rol de administrador
export const requireAdmin = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: "Autenticación requerida",
      code: "AUTH_REQUIRED",
      timestamp: new Date().toISOString(),
    });
    return;
  }

  // Cambiar a los enums correctos según tu schema: CLIENT/ADMIN
  if (req.user.role !== "ADMIN") {
    res.status(403).json({
      success: false,
      error: "Acceso denegado. Se requieren permisos de administrador",
      code: "ADMIN_REQUIRED",
      timestamp: new Date().toISOString(),
    });
    return;
  }

  console.log(
    `👑 Admin access: User ${req.user.userId} accessed ${req.method} ${req.path}`,
  );
  next();
};

// Verificar rol de cliente
export const requireClient = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: "Autenticación requerida",
      code: "AUTH_REQUIRED",
      timestamp: new Date().toISOString(),
    });
    return;
  }

  if (req.user.role !== "CLIENT") {
    res.status(403).json({
      success: false,
      error: "Acceso denegado. Solo para usuarios clientes",
      code: "CLIENT_REQUIRED",
      timestamp: new Date().toISOString(),
    });
    return;
  }

  next();
};

// ========================================
// MIDDLEWARE DE VERIFICACIÓN DE EMAIL
// ========================================
export const requireVerifiedEmail = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: "Autenticación requerida",
      code: "AUTH_REQUIRED",
      timestamp: new Date().toISOString(),
    });
    return;
  }

  if (!req.user.isVerified) {
    res.status(403).json({
      success: false,
      error: "Debes verificar tu email antes de acceder a esta función",
      code: "EMAIL_VERIFICATION_REQUIRED",
      timestamp: new Date().toISOString(),
    });
    return;
  }

  next();
};

// ========================================
// MIDDLEWARE OPCIONAL (sin error si no hay token)
// ========================================
export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
      // No hay token, continuar sin usuario
      req.user = undefined;
      return next();
    }

    // Si hay token, intentar validarlo
    const payload = AuthUtils.verifyAccessToken(token);

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true,
        isVerified: true,
      },
    });

    if (user && user.isActive) {
      req.user = {
        ...payload,
        isVerified: user.isVerified,
        isActive: user.isActive,
      };
    }

    next();
  } catch (error) {
    // Si hay error con el token, continuar sin usuario
    req.user = undefined;
    next();
  }
};

// ========================================
// MIDDLEWARE DE LOGGING
// ========================================
export const logAccess = (req: Request, res: Response, next: NextFunction) => {
  const timestamp = new Date().toISOString();
  const userId = req.user?.userId || "anonymous";
  const userRole = req.user?.role || "none";
  const ip = req.ip || req.connection.remoteAddress;

  console.log(
    `[${timestamp}] ${req.method} ${req.path} - User: ${userId} (${userRole}) - IP: ${ip}`,
  );

  next();
};
