// src/routes/favoriteRoutes.ts
import { Router } from "express";
import { FavoriteController } from "../controllers/favoriteController";
import { body } from "express-validator";
import { authenticateToken, requireAdmin } from "../middleware/auth";

const router = Router();

// ========================================
// VALIDACIONES ESPECÍFICAS
// ========================================

const addFavoriteValidation = [
  body("productId")
    .notEmpty()
    .withMessage("El ID del producto es requerido")
    .isInt({ min: 1 })
    .withMessage("El ID del producto debe ser un número entero positivo"),
];

// ========================================
// RUTAS ESPECÍFICAS PRIMERO (MUY IMPORTANTE EL ORDEN)
// ========================================

// GET /api/favorites/admin/stats - Obtener estadísticas de favoritos (solo admin)
// DEBE IR ANTES DE /:productId para evitar conflictos
router.get(
  "/admin/stats",
  authenticateToken,
  requireAdmin,
  FavoriteController.getFavoriteStats,
);

// GET /api/favorites/check/:productId - Verificar si producto está en favoritos (PROTEGIDA)
// DEBE IR ANTES DE /:productId genérico para evitar conflictos
router.get(
  "/check/:productId",
  authenticateToken,
  FavoriteController.checkFavoriteStatus,
);

// ========================================
// TODAS LAS RUTAS REQUIEREN AUTENTICACIÓN
// ========================================

// GET /api/favorites - Obtener favoritos del usuario (PROTEGIDA)
router.get("/", authenticateToken, FavoriteController.getUserFavorites);

// POST /api/favorites - Agregar producto a favoritos (PROTEGIDA)
router.post(
  "/",
  authenticateToken,
  addFavoriteValidation,
  FavoriteController.addToFavorites,
);

// DELETE /api/favorites/:productId - Quitar producto de favoritos (PROTEGIDA)
// DEBE IR DESPUÉS de las rutas específicas como /admin/stats y /check/:productId
router.delete(
  "/:productId",
  authenticateToken,
  FavoriteController.removeFromFavorites,
);

export default router;
