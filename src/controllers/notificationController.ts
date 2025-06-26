import { Request, Response } from "express";
import { validationResult } from "express-validator";
import prisma from "../config/database";

export class NotificationController {
  // ========================================
  // OBTENER NOTIFICACIONES DEL USUARIO (CLIENTE)
  // ========================================
  static async getUserNotifications(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;
      const { type, page = 1, limit = 20, unreadOnly = false } = req.query;

      const skip = (Number(page) - 1) * Number(limit);

      const whereClause: any = { userId };

      if (type) {
        whereClause.type = type;
      }

      if (unreadOnly === "true") {
        whereClause.isRead = false;
      }

      const [notifications, total, unreadCount] = await Promise.all([
        prisma.notification.findMany({
          where: whereClause,
          include: {
            order: {
              select: {
                id: true,
                status: true,
                total: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
          skip,
          take: Number(limit),
        }),
        prisma.notification.count({ where: whereClause }),
        prisma.notification.count({
          where: { userId, isRead: false },
        }),
      ]);

      res.json({
        success: true,
        message: "Notificaciones obtenidas exitosamente",
        data: notifications,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit)),
        },
        unreadCount,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error al obtener notificaciones:", error);
      res.status(500).json({
        success: false,
        error: "Error interno del servidor",
        code: "NOTIFICATIONS_FETCH_ERROR",
        timestamp: new Date().toISOString(),
      });
    }
  }

  // ========================================
  // MARCAR NOTIFICACIÓN COMO LEÍDA (CLIENTE)
  // ========================================
  static async markAsRead(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user!.userId;

      const notificationId = parseInt(id);
      if (isNaN(notificationId)) {
        res.status(400).json({
          success: false,
          error: "ID de notificación inválido",
          code: "INVALID_NOTIFICATION_ID",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const notification = await prisma.notification.findUnique({
        where: { id: notificationId },
      });

      if (!notification) {
        res.status(404).json({
          success: false,
          error: "Notificación no encontrada",
          code: "NOTIFICATION_NOT_FOUND",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Verificar que la notificación pertenece al usuario
      if (notification.userId !== userId) {
        res.status(403).json({
          success: false,
          error: "No tienes permisos para acceder a esta notificación",
          code: "NOTIFICATION_ACCESS_DENIED",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const updatedNotification = await prisma.notification.update({
        where: { id: notificationId },
        data: { isRead: true },
      });

      res.json({
        success: true,
        message: "Notificación marcada como leída",
        data: updatedNotification,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error al marcar notificación:", error);
      res.status(500).json({
        success: false,
        error: "Error interno del servidor",
        code: "NOTIFICATION_MARK_READ_ERROR",
        timestamp: new Date().toISOString(),
      });
    }
  }

  // ========================================
  // MARCAR TODAS LAS NOTIFICACIONES COMO LEÍDAS (CLIENTE)
  // ========================================
  static async markAllAsRead(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;

      const result = await prisma.notification.updateMany({
        where: {
          userId,
          isRead: false,
        },
        data: { isRead: true },
      });

      res.json({
        success: true,
        message: "Todas las notificaciones marcadas como leídas",
        updatedCount: result.count,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error al marcar todas las notificaciones:", error);
      res.status(500).json({
        success: false,
        error: "Error interno del servidor",
        code: "NOTIFICATION_MARK_ALL_READ_ERROR",
        timestamp: new Date().toISOString(),
      });
    }
  }

  // ========================================
  // ELIMINAR NOTIFICACIÓN (CLIENTE)
  // ========================================
  static async deleteNotification(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user!.userId;

      const notificationId = parseInt(id);
      if (isNaN(notificationId)) {
        res.status(400).json({
          success: false,
          error: "ID de notificación inválido",
          code: "INVALID_NOTIFICATION_ID",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const notification = await prisma.notification.findUnique({
        where: { id: notificationId },
      });

      if (!notification) {
        res.status(404).json({
          success: false,
          error: "Notificación no encontrada",
          code: "NOTIFICATION_NOT_FOUND",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Verificar que la notificación pertenece al usuario
      if (notification.userId !== userId) {
        res.status(403).json({
          success: false,
          error: "No tienes permisos para eliminar esta notificación",
          code: "NOTIFICATION_DELETE_DENIED",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      await prisma.notification.delete({
        where: { id: notificationId },
      });

      res.json({
        success: true,
        message: "Notificación eliminada exitosamente",
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error al eliminar notificación:", error);
      res.status(500).json({
        success: false,
        error: "Error interno del servidor",
        code: "NOTIFICATION_DELETE_ERROR",
        timestamp: new Date().toISOString(),
      });
    }
  }

  // ========================================
  // CREAR NOTIFICACIÓN MANUAL (ADMIN)
  // ========================================
  static async createNotification(req: Request, res: Response) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          error: "Datos de entrada inválidos",
          details: errors.array(),
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const { userIds, title, message, type = "SYSTEM" } = req.body;

      // Si no se especifican usuarios, enviar a todos los usuarios activos
      let targetUserIds = userIds;
      if (!targetUserIds || targetUserIds.length === 0) {
        const allUsers = await prisma.user.findMany({
          where: { isActive: true },
          select: { id: true },
        });
        targetUserIds = allUsers.map((user) => user.id);
      }

      // Crear notificaciones para todos los usuarios objetivo
      const notifications = await Promise.all(
        targetUserIds.map((userId: number) =>
          prisma.notification.create({
            data: {
              userId,
              title,
              message,
              type: type as any,
            },
          }),
        ),
      );

      res.status(201).json({
        success: true,
        message: "Notificaciones creadas exitosamente",
        count: notifications.length,
        data: notifications,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error al crear notificación:", error);
      res.status(500).json({
        success: false,
        error: "Error interno del servidor",
        code: "NOTIFICATION_CREATE_ERROR",
        timestamp: new Date().toISOString(),
      });
    }
  }

  // ========================================
  // OBTENER ESTADÍSTICAS DE NOTIFICACIONES (ADMIN)
  // ========================================
  static async getNotificationStats(req: Request, res: Response) {
    try {
      const { period = "week" } = req.query;

      let startDate: Date;
      const endDate = new Date();

      switch (period) {
        case "today":
          startDate = new Date();
          startDate.setHours(0, 0, 0, 0);
          break;
        case "week":
          startDate = new Date();
          startDate.setDate(startDate.getDate() - 7);
          break;
        case "month":
          startDate = new Date();
          startDate.setMonth(startDate.getMonth() - 1);
          break;
        default:
          startDate = new Date();
          startDate.setDate(startDate.getDate() - 7);
      }

      const [
        totalNotifications,
        unreadNotifications,
        notificationsByType,
        recentNotifications,
      ] = await Promise.all([
        // Total de notificaciones en el período
        prisma.notification.count({
          where: {
            createdAt: { gte: startDate, lte: endDate },
          },
        }),

        // Notificaciones no leídas
        prisma.notification.count({
          where: {
            isRead: false,
            createdAt: { gte: startDate, lte: endDate },
          },
        }),

        // Notificaciones por tipo
        prisma.notification.groupBy({
          by: ["type"],
          where: {
            createdAt: { gte: startDate, lte: endDate },
          },
          _count: { type: true },
        }),

        // Notificaciones recientes
        prisma.notification.findMany({
          where: {
            createdAt: { gte: startDate, lte: endDate },
          },
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
          take: 10,
        }),
      ]);

      const typeStats = notificationsByType.reduce(
        (acc, item) => {
          acc[item.type] = item._count.type;
          return acc;
        },
        {} as Record<string, number>,
      );

      res.json({
        success: true,
        message: "Estadísticas de notificaciones obtenidas exitosamente",
        data: {
          stats: {
            totalNotifications,
            unreadNotifications,
            readNotifications: totalNotifications - unreadNotifications,
            period,
          },
          typeStats,
          recentNotifications,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error al obtener estadísticas de notificaciones:", error);
      res.status(500).json({
        success: false,
        error: "Error interno del servidor",
        code: "NOTIFICATION_STATS_ERROR",
        timestamp: new Date().toISOString(),
      });
    }
  }
}
