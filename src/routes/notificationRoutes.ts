import { Router } from "express";
import { NotificationController } from "../controllers/notificationController";
import { authenticateToken, requireAdmin } from "../middleware/auth";

const router = Router();

// ========================================
// RUTAS ESPECÍFICAS PRIMERO (MUY IMPORTANTE EL ORDEN)
// ========================================

// PATCH /api/notifications/mark-all-read - Marcar todas como leídas (PROTEGIDA)
// DEBE IR ANTES de /:id para evitar conflictos
router.patch(
  "/mark-all-read",
  authenticateToken,
  NotificationController.markAllAsRead,
);

// GET /api/notifications/admin/stats - Estadísticas de notificaciones (solo admin)
// DEBE IR ANTES de /:id para evitar conflictos
router.get(
  "/admin/stats",
  authenticateToken,
  requireAdmin,
  NotificationController.getNotificationStats,
);

// POST /api/notifications/admin/create - Crear notificación manual (solo admin)
router.post(
  "/admin/create",
  authenticateToken,
  requireAdmin,
  NotificationController.createNotification,
);

// ========================================
// TODAS LAS RUTAS REQUIEREN AUTENTICACIÓN
// ========================================

// GET /api/notifications - Obtener notificaciones del usuario (PROTEGIDA)
router.get("/", authenticateToken, NotificationController.getUserNotifications);

// PATCH /api/notifications/:id/read - Marcar notificación como leída (PROTEGIDA)
// DEBE IR DESPUÉS de las rutas específicas como /mark-all-read
router.patch("/:id/read", authenticateToken, NotificationController.markAsRead);

// DELETE /api/notifications/:id - Eliminar notificación (PROTEGIDA)
// DEBE IR DESPUÉS de las rutas específicas
router.delete(
  "/:id",
  authenticateToken,
  NotificationController.deleteNotification,
);

export default router;
