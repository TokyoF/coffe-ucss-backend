import { Router } from "express";
import { CategoryController } from "../controllers/categoryController";
import {
  categoryValidation,
  updateCategoryValidation,
} from "../utils/validators";
import { authenticateToken, requireAdmin } from "../middleware/auth";

const router = Router();

// ========================================
// RUTAS ESPECÍFICAS PRIMERO (MUY IMPORTANTE EL ORDEN)
// ========================================

// GET /api/categories/admin/stats - Obtener estadísticas de categorías (solo admin)
// DEBE IR ANTES DE /:id para evitar conflictos
router.get(
  "/admin/stats",
  authenticateToken,
  requireAdmin,
  CategoryController.getCategoryStats,
);

// ========================================
// TODAS LAS RUTAS REQUIEREN AUTENTICACIÓN
// ========================================

// GET /api/categories - Obtener todas las categorías (PROTEGIDA)
router.get("/", authenticateToken, CategoryController.getAllCategories);

// GET /api/categories/:id - Obtener categoría por ID (PROTEGIDA)
// DEBE IR DESPUÉS de las rutas específicas como /admin/stats
router.get("/:id", authenticateToken, CategoryController.getCategoryById);

// ========================================
// RUTAS SOLO PARA ADMINISTRADORES
// ========================================

// POST /api/categories - Crear nueva categoría
router.post(
  "/",
  authenticateToken,
  requireAdmin,
  categoryValidation,
  CategoryController.createCategory,
);

// PUT /api/categories/:id - Actualizar categoría
router.put(
  "/:id",
  authenticateToken,
  requireAdmin,
  updateCategoryValidation,
  CategoryController.updateCategory,
);

// DELETE /api/categories/:id - Eliminar categoría
router.delete(
  "/:id",
  authenticateToken,
  requireAdmin,
  CategoryController.deleteCategory,
);

export default router;
