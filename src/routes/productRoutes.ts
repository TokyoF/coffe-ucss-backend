import { Router } from "express";
import { ProductController } from "../controllers/productController";
import {
  productValidation,
  updateProductValidation,
} from "../utils/validators";
import { authenticateToken, requireAdmin } from "../middleware/auth";

const router = Router();

// ========================================
// TODAS LAS RUTAS REQUIEREN AUTENTICACIÓN
// ========================================

// GET /api/products/category/:categoryId - Obtener productos por categoría (PROTEGIDA)
router.get(
  "/category/:categoryId",
  authenticateToken,
  ProductController.getProductsByCategory,
);

// GET /api/products - Obtener todos los productos (PROTEGIDA)
router.get("/", authenticateToken, ProductController.getAllProducts);

// GET /api/products/:id - Obtener producto por ID (PROTEGIDA)
router.get("/:id", authenticateToken, ProductController.getProductById);

// ========================================
// RUTAS SOLO PARA ADMINISTRADORES
// ========================================

// POST /api/products - Crear nuevo producto
router.post(
  "/",
  authenticateToken,
  requireAdmin,
  productValidation,
  ProductController.createProduct,
);

// PUT /api/products/:id - Actualizar producto
router.put(
  "/:id",
  authenticateToken,
  requireAdmin,
  updateProductValidation,
  ProductController.updateProduct,
);

// DELETE /api/products/:id - Eliminar producto
router.delete(
  "/:id",
  authenticateToken,
  requireAdmin,
  ProductController.deleteProduct,
);

export default router;
