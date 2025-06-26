import { Router } from "express";
import { OrderController } from "../controllers/orderController";
import { authenticateToken, requireAdmin } from "../middleware/auth";

const router = Router();

// ========================================
// RUTAS ESPECÍFICAS PRIMERO (MUY IMPORTANTE EL ORDEN)
// ========================================

// GET /api/orders/my-orders - Obtener pedidos del usuario actual (PROTEGIDA)
// DEBE IR ANTES DE /:id para evitar conflictos
router.get("/my-orders", authenticateToken, OrderController.getUserOrders);

// GET /api/orders/admin/all - Obtener todos los pedidos (solo admin)
// DEBE IR ANTES de /:id para evitar conflictos
router.get(
  "/admin/all",
  authenticateToken,
  requireAdmin,
  OrderController.getAllOrders,
);

// PATCH /api/orders/admin/:id/status - Actualizar estado del pedido (solo admin)
router.patch(
  "/admin/:id/status",
  authenticateToken,
  requireAdmin,
  OrderController.updateOrderStatus,
);

// ========================================
// TODAS LAS RUTAS REQUIEREN AUTENTICACIÓN
// ========================================

// POST /api/orders - Crear nuevo pedido (PROTEGIDA)
router.post("/", authenticateToken, OrderController.createOrder);

// GET /api/orders/:id - Obtener pedido por ID (PROTEGIDA)
// DEBE IR DESPUÉS de las rutas específicas como /my-orders y /admin/all
router.get("/:id", authenticateToken, OrderController.getOrderById);

// PATCH /api/orders/:id/cancel - Cancelar pedido (PROTEGIDA - solo cliente)
router.patch("/:id/cancel", authenticateToken, OrderController.cancelOrder);

export default router;
