import { Request, Response } from "express";
import { validationResult } from "express-validator";
import prisma from "../config/database";

export class CategoryController {
  // ========================================
  // OBTENER TODAS LAS CATEGORÍAS (PÚBLICO)
  // ========================================
  static async getAllCategories(req: Request, res: Response) {
    try {
      const { active } = req.query;

      const where: any = {};
      if (active !== undefined) {
        where.isActive = active === "true";
      }

      const categories = await prisma.category.findMany({
        where,
        include: {
          products: {
            where: {
              isAvailable: true,
            },
            select: {
              id: true,
              name: true,
              price: true,
              imageUrl: true,
              rating: true,
            },
          },
        },
        orderBy: {
          name: "asc",
        },
      });

      res.json({
        success: true,
        message: "Categorías obtenidas exitosamente",
        data: categories,
        count: categories.length,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error al obtener categorías:", error);
      res.status(500).json({
        success: false,
        error: "Error interno del servidor",
        code: "CATEGORIES_FETCH_ERROR",
        timestamp: new Date().toISOString(),
      });
    }
  }

  // ========================================
  // OBTENER CATEGORÍA POR ID (PÚBLICO)
  // ========================================
  static async getCategoryById(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const categoryId = parseInt(id);
      if (isNaN(categoryId)) {
        res.status(400).json({
          success: false,
          error: "ID de categoría inválido",
          code: "INVALID_CATEGORY_ID",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const category = await prisma.category.findUnique({
        where: { id: categoryId },
        include: {
          products: {
            where: {
              isAvailable: true,
            },
            select: {
              id: true,
              name: true,
              description: true,
              price: true,
              imageUrl: true,
              rating: true,
              customizations: {
                select: {
                  id: true,
                  name: true,
                  type: true,
                  options: true,
                  isRequired: true,
                },
              },
            },
          },
        },
      });

      if (!category) {
        res.status(404).json({
          success: false,
          error: "Categoría no encontrada",
          code: "CATEGORY_NOT_FOUND",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      res.json({
        success: true,
        message: "Categoría obtenida exitosamente",
        data: category,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error al obtener categoría:", error);
      res.status(500).json({
        success: false,
        error: "Error interno del servidor",
        code: "CATEGORY_FETCH_ERROR",
        timestamp: new Date().toISOString(),
      });
    }
  }

  // ========================================
  // CREAR CATEGORÍA (SOLO ADMIN)
  // ========================================
  static async createCategory(req: Request, res: Response) {
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

      const { name, description } = req.body;

      // Verificar que no existe una categoría con el mismo nombre
      const existingCategory = await prisma.category.findFirst({
        where: {
          name: {
            equals: name,
            mode: "insensitive",
          },
        },
      });

      if (existingCategory) {
        res.status(409).json({
          success: false,
          error: "Ya existe una categoría con ese nombre",
          code: "CATEGORY_NAME_EXISTS",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const category = await prisma.category.create({
        data: {
          name,
          description,
        },
      });

      res.status(201).json({
        success: true,
        message: "Categoría creada exitosamente",
        data: category,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error al crear categoría:", error);
      res.status(500).json({
        success: false,
        error: "Error interno del servidor",
        code: "CATEGORY_CREATE_ERROR",
        timestamp: new Date().toISOString(),
      });
    }
  }

  // ========================================
  // ACTUALIZAR CATEGORÍA (SOLO ADMIN)
  // ========================================
  static async updateCategory(req: Request, res: Response) {
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

      const { id } = req.params;
      const { name, description, isActive } = req.body;

      const categoryId = parseInt(id);
      if (isNaN(categoryId)) {
        res.status(400).json({
          success: false,
          error: "ID de categoría inválido",
          code: "INVALID_CATEGORY_ID",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Verificar que la categoría existe
      const existingCategory = await prisma.category.findUnique({
        where: { id: categoryId },
      });

      if (!existingCategory) {
        res.status(404).json({
          success: false,
          error: "Categoría no encontrada",
          code: "CATEGORY_NOT_FOUND",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Verificar nombre único si se va a cambiar
      if (name && name !== existingCategory.name) {
        const nameExists = await prisma.category.findFirst({
          where: {
            name: {
              equals: name,
              mode: "insensitive",
            },
            id: {
              not: categoryId,
            },
          },
        });

        if (nameExists) {
          res.status(409).json({
            success: false,
            error: "Ya existe una categoría con ese nombre",
            code: "CATEGORY_NAME_EXISTS",
            timestamp: new Date().toISOString(),
          });
          return;
        }
      }

      // Preparar datos de actualización
      const updateData: any = {};
      if (name !== undefined) updateData.name = name;
      if (description !== undefined) updateData.description = description;
      if (isActive !== undefined) updateData.isActive = isActive;

      const updatedCategory = await prisma.category.update({
        where: { id: categoryId },
        data: updateData,
      });

      res.json({
        success: true,
        message: "Categoría actualizada exitosamente",
        data: updatedCategory,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error al actualizar categoría:", error);
      res.status(500).json({
        success: false,
        error: "Error interno del servidor",
        code: "CATEGORY_UPDATE_ERROR",
        timestamp: new Date().toISOString(),
      });
    }
  }

  // ========================================
  // ELIMINAR CATEGORÍA (SOLO ADMIN)
  // ========================================
  static async deleteCategory(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const categoryId = parseInt(id);
      if (isNaN(categoryId)) {
        res.status(400).json({
          success: false,
          error: "ID de categoría inválido",
          code: "INVALID_CATEGORY_ID",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Verificar que la categoría existe
      const existingCategory = await prisma.category.findUnique({
        where: { id: categoryId },
      });

      if (!existingCategory) {
        res.status(404).json({
          success: false,
          error: "Categoría no encontrada",
          code: "CATEGORY_NOT_FOUND",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Verificar si la categoría tiene productos asociados
      const hasProducts = await prisma.product.findFirst({
        where: { categoryId: categoryId },
      });

      if (hasProducts) {
        // En lugar de eliminar, marcar como inactiva
        const updatedCategory = await prisma.category.update({
          where: { id: categoryId },
          data: { isActive: false },
        });

        res.json({
          success: true,
          message:
            "Categoría marcada como inactiva (tiene productos asociados)",
          data: updatedCategory,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Si no tiene productos, eliminar completamente
      await prisma.category.delete({
        where: { id: categoryId },
      });

      res.json({
        success: true,
        message: "Categoría eliminada exitosamente",
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error al eliminar categoría:", error);
      res.status(500).json({
        success: false,
        error: "Error interno del servidor",
        code: "CATEGORY_DELETE_ERROR",
        timestamp: new Date().toISOString(),
      });
    }
  }

  // ========================================
  // OBTENER ESTADÍSTICAS DE CATEGORÍAS (ADMIN)
  // ========================================
  static async getCategoryStats(req: Request, res: Response) {
    try {
      const stats = await prisma.category.findMany({
        select: {
          id: true,
          name: true,
          isActive: true,
          _count: {
            select: {
              products: true,
            },
          },
        },
        orderBy: {
          name: "asc",
        },
      });

      const summary = {
        totalCategories: stats.length,
        activeCategories: stats.filter((cat) => cat.isActive).length,
        inactiveCategories: stats.filter((cat) => !cat.isActive).length,
        totalProducts: stats.reduce((sum, cat) => sum + cat._count.products, 0),
      };

      res.json({
        success: true,
        message: "Estadísticas de categorías obtenidas exitosamente",
        data: stats,
        summary,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error al obtener estadísticas:", error);
      res.status(500).json({
        success: false,
        error: "Error interno del servidor",
        code: "CATEGORY_STATS_ERROR",
        timestamp: new Date().toISOString(),
      });
    }
  }
}
