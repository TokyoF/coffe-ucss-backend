import jwt, { SignOptions } from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { User } from "@prisma/client";

export interface JWTPayload {
  userId: number;
  email: string;
  role: string;
}

export class AuthUtils {
  private static JWT_SECRET = process.env.JWT_SECRET!;
  private static JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET!;
  private static JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "15m";
  private static JWT_REFRESH_EXPIRES_IN =
    process.env.JWT_REFRESH_EXPIRES_IN || "7d";

  // Hashear password
  static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 12);
  }

  // Verificar password
  static async verifyPassword(
    password: string,
    hashedPassword: string,
  ): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword);
  }

  // Generar access token
  static generateAccessToken(payload: JWTPayload): string {
    return (jwt.sign as any)(payload, this.JWT_SECRET, {
      expiresIn: this.JWT_EXPIRES_IN,
    });
  }
  // Generar refresh token
  static generateRefreshToken(payload: JWTPayload): string {
    return (jwt.sign as any)(payload, this.JWT_REFRESH_SECRET, {
      expiresIn: this.JWT_REFRESH_EXPIRES_IN,
    });
  }

  // Verificar access token
  static verifyAccessToken(token: string): JWTPayload {
    return jwt.verify(token, this.JWT_SECRET) as JWTPayload;
  }

  // Verificar refresh token
  static verifyRefreshToken(token: string): JWTPayload {
    return jwt.verify(token, this.JWT_REFRESH_SECRET) as JWTPayload;
  }

  // Validar email UCSS
  static validateUCSSEmail(email: string): boolean {
    return email.endsWith("@ucss.pe");
  }

  // Crear payload desde usuario
  static createPayload(user: User): JWTPayload {
    return {
      userId: user.id,
      email: user.email,
      role: user.role,
    };
  }
}
