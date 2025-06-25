import { Request, Response } from "express";
import { validationResult } from "express-validator";
import { AuthUtils } from "../utils/auth";
import prisma from "../config/database";

export class AuthController {
  // Registro de usuario
  static async register(req: Request, res: Response) {
    try {
      // Verificar errores de validación
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          error: "Datos de entrada inválidos",
          details: errors.array(),
        });
        return;
      }

      const { email, password, firstName, lastName, phone } = req.body;

      // Verificar si el usuario ya existe
      const existingUser = await prisma.user.findUnique({
        where: { email },
      });

      if (existingUser) {
        res.status(409).json({
          error: "Ya existe una cuenta con este correo electrónico",
        });
        return;
      }

      // Hashear password
      const hashedPassword = await AuthUtils.hashPassword(password);

      // Crear usuario
      const user = await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          firstName,
          lastName,
          phone,
          role: "CLIENT", // Por defecto todos son clientes
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          role: true,
          isVerified: true,
          createdAt: true,
        },
      });

      // Crear payload y tokens
      const payload = AuthUtils.createPayload(user as any);
      const accessToken = AuthUtils.generateAccessToken(payload);
      const refreshToken = AuthUtils.generateRefreshToken(payload);

      // Guardar refresh token en la base de datos
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 días

      await prisma.authToken.create({
        data: {
          userId: user.id,
          token: refreshToken,
          expiresAt,
        },
      });

      res.status(201).json({
        message: "Usuario registrado exitosamente",
        user,
        tokens: {
          accessToken,
          refreshToken,
        },
      });
    } catch (error) {
      console.error("Error en registro:", error);
      res.status(500).json({
        error: "Error interno del servidor",
      });
    }
  }

  // Login de usuario
  static async login(req: Request, res: Response) {
    try {
      // Verificar errores de validación
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          error: "Datos de entrada inválidos",
          details: errors.array(),
        });
        return;
      }

      const { email, password } = req.body;

      // Buscar usuario
      const user = await prisma.user.findUnique({
        where: { email },
      });

      if (!user) {
        res.status(401).json({
          error: "Credenciales inválidas",
        });
        return;
      }

      // Verificar password
      const isValidPassword = await AuthUtils.verifyPassword(
        password,
        user.password,
      );
      if (!isValidPassword) {
        res.status(401).json({
          error: "Credenciales inválidas",
        });
        return;
      }

      // Verificar que el usuario esté activo
      if (!user.isActive) {
        res.status(401).json({
          error: "Cuenta desactivada. Contacta al administrador",
        });
        return;
      }

      // Crear payload y tokens
      const payload = AuthUtils.createPayload(user);
      const accessToken = AuthUtils.generateAccessToken(payload);
      const refreshToken = AuthUtils.generateRefreshToken(payload);

      // Guardar refresh token
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      await prisma.authToken.create({
        data: {
          userId: user.id,
          token: refreshToken,
          expiresAt,
        },
      });

      // Respuesta sin password
      const { password: _, ...userWithoutPassword } = user;

      res.json({
        message: "Login exitoso",
        user: userWithoutPassword,
        tokens: {
          accessToken,
          refreshToken,
        },
      });
    } catch (error) {
      console.error("Error en login:", error);
      res.status(500).json({
        error: "Error interno del servidor",
      });
    }
  }

  // Refresh token
  static async refreshToken(req: Request, res: Response) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        res.status(401).json({
          error: "Refresh token requerido",
        });
        return;
      }

      // Verificar refresh token
      const payload = AuthUtils.verifyRefreshToken(refreshToken);

      // Verificar que el token existe en la base de datos y no está revocado
      const storedToken = await prisma.authToken.findFirst({
        where: {
          token: refreshToken,
          userId: payload.userId,
          isRevoked: false,
          expiresAt: {
            gt: new Date(),
          },
        },
      });

      if (!storedToken) {
        res.status(401).json({
          error: "Refresh token inválido o expirado",
        });
        return;
      }

      // Generar nuevo access token
      const newAccessToken = AuthUtils.generateAccessToken(payload);

      res.json({
        accessToken: newAccessToken,
      });
    } catch (error) {
      console.error("Error en refresh token:", error);
      res.status(401).json({
        error: "Refresh token inválido",
      });
    }
  }

  // Logout
  static async logout(req: Request, res: Response) {
    try {
      const { refreshToken } = req.body;

      if (refreshToken) {
        // Revocar refresh token
        await prisma.authToken.updateMany({
          where: {
            token: refreshToken,
          },
          data: {
            isRevoked: true,
          },
        });
      }

      res.json({
        message: "Logout exitoso",
      });
    } catch (error) {
      console.error("Error en logout:", error);
      res.status(500).json({
        error: "Error interno del servidor",
      });
    }
  }

  // Obtener perfil del usuario actual
  static async getProfile(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          role: true,
          isVerified: true,
          createdAt: true,
        },
      });

      if (!user) {
        res.status(404).json({
          error: "Usuario no encontrado",
        });
        return;
      }

      res.json({
        user,
      });
    } catch (error) {
      console.error("Error al obtener perfil:", error);
      res.status(500).json({
        error: "Error interno del servidor",
      });
    }
  }
}
