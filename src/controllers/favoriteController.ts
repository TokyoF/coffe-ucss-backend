// src/controllers/favoriteController.ts
import { Request, Response } from "express";
import { validationResult } from "express-validator";
import prisma from "../config/database";

export class FavoriteController {
  // ========================================
  // OBTENER FAVORITOS DEL USUARIO (CLIENTE)
  // ========================================
  static async getUserFavorites(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;
      const { page = 1, limit = 20 } = req.query;

      const skip = (Number(page) - 1) * Number(limit);

      const [favorites, total] = await Promise.all([
        prisma.favorite.findMany({
          where: { userId },
          include: {
            product: {
              include: {
                category: {
                  select: {
                    id: true,
                    name: true,
                    description: true,
                  },
                },
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
          orderBy: { createdAt: "desc" },
          skip,
          take: Number(limit),
        }),
        prisma.favorite.count({ where: { userId } }),
      ]);

      res.json({
        success: true,
        message: "Favoritos obtenidos exitosamente",
        data: favorites,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit)),
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error al obtener favoritos:", error);
      res.status(500).json({
        success: false,
        error: "Error interno del servidor",
        code: "FAVORITES_FETCH_ERROR",
        timestamp: new Date().toISOString(),
      });
    }
  }

  // ========================================
  // AGREGAR PRODUCTO A FAVORITOS (CLIENTE)
  // ========================================
  static async addToFavorites(req: Request, res: Response) {
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

      const userId = req.user!.userId;
      const { productId } = req.body;

      const productIdNum = parseInt(productId);
      if (isNaN(productIdNum)) {
        res.status(400).json({
          success: false,
          error: "ID de producto inválido",
          code: "INVALID_PRODUCT_ID",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Verificar que el producto existe y está disponible
      const product = await prisma.product.findUnique({
        where: { id: productIdNum },
        include: {
          category: {
            select: {
              id: true,
              name: true,
              description: true,
            },
          },
        },
      });

      if (!product) {
        res.status(404).json({
          success: false,
          error: "Producto no encontrado",
          code: "PRODUCT_NOT_FOUND",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      if (!product.isAvailable) {
        res.status(400).json({
          success: false,
          error: "El producto no está disponible",
          code: "PRODUCT_NOT_AVAILABLE",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Verificar si ya está en favoritos
      const existingFavorite = await prisma.favorite.findUnique({
        where: {
          userId_productId: {
            userId,
            productId: productIdNum,
          },
        },
      });

      if (existingFavorite) {
        res.status(409).json({
          success: false,
          error: "El producto ya está en favoritos",
          code: "ALREADY_IN_FAVORITES",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Crear favorito
      const favorite = await prisma.favorite.create({
        data: {
          userId,
          productId: productIdNum,
        },
        include: {
          product: {
            include: {
              category: {
                select: {
                  id: true,
                  name: true,
                  description: true,
                },
              },
            },
          },
        },
      });

      res.status(201).json({
        success: true,
        message: "Producto agregado a favoritos exitosamente",
        data: favorite,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error al agregar a favoritos:", error);
      res.status(500).json({
        success: false,
        error: "Error interno del servidor",
        code: "FAVORITE_ADD_ERROR",
        timestamp: new Date().toISOString(),
      });
    }
  }

  // ========================================
  // QUITAR PRODUCTO DE FAVORITOS (CLIENTE)
  // ========================================
  static async removeFromFavorites(req: Request, res: Response) {
    try {
      const { productId } = req.params;
      const userId = req.user!.userId;

      const productIdNum = parseInt(productId);
      if (isNaN(productIdNum)) {
        res.status(400).json({
          success: false,
          error: "ID de producto inválido",
          code: "INVALID_PRODUCT_ID",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Verificar que el favorito existe y pertenece al usuario
      const favorite = await prisma.favorite.findUnique({
        where: {
          userId_productId: {
            userId,
            productId: productIdNum,
          },
        },
      });

      if (!favorite) {
        res.status(404).json({
          success: false,
          error: "Favorito no encontrado",
          code: "FAVORITE_NOT_FOUND",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Eliminar favorito
      await prisma.favorite.delete({
        where: {
          userId_productId: {
            userId,
            productId: productIdNum,
          },
        },
      });

      res.json({
        success: true,
        message: "Producto eliminado de favoritos exitosamente",
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error al eliminar de favoritos:", error);
      res.status(500).json({
        success: false,
        error: "Error interno del servidor",
        code: "FAVORITE_REMOVE_ERROR",
        timestamp: new Date().toISOString(),
      });
    }
  }

  // ========================================
  // VERIFICAR SI PRODUCTO ESTÁ EN FAVORITOS (CLIENTE)
  // ========================================
  static async checkFavoriteStatus(req: Request, res: Response) {
    try {
      const { productId } = req.params;
      const userId = req.user!.userId;

      const productIdNum = parseInt(productId);
      if (isNaN(productIdNum)) {
        res.status(400).json({
          success: false,
          error: "ID de producto inválido",
          code: "INVALID_PRODUCT_ID",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const favorite = await prisma.favorite.findUnique({
        where: {
          userId_productId: {
            userId,
            productId: productIdNum,
          },
        },
      });

      res.json({
        success: true,
        message: "Estado de favorito verificado",
        data: {
          productId: productIdNum,
          isFavorite: !!favorite,
          favoriteId: favorite?.id || null,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error al verificar favorito:", error);
      res.status(500).json({
        success: false,
        error: "Error interno del servidor",
        code: "FAVORITE_CHECK_ERROR",
        timestamp: new Date().toISOString(),
      });
    }
  }

  // ========================================
  // OBTENER ESTADÍSTICAS DE FAVORITOS (ADMIN)
  // ========================================
  static async getFavoriteStats(req: Request, res: Response) {
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

      const [totalFavorites, newFavorites, topProducts, favoritesByCategory] =
        await Promise.all([
          // Total de favoritos
          prisma.favorite.count(),

          // Nuevos favoritos en el período
          prisma.favorite.count({
            where: {
              createdAt: { gte: startDate, lte: endDate },
            },
          }),

          // Productos más favoritos
          prisma.favorite.groupBy({
            by: ["productId"],
            _count: { productId: true },
            orderBy: { _count: { productId: "desc" } },
            take: 10,
          }),

          // Favoritos por categoría
          prisma.favorite.groupBy({
            by: ["productId"],
            _count: { productId: true },
            where: {
              createdAt: { gte: startDate, lte: endDate },
            },
          }),
        ]);

      // Obtener nombres de productos más favoritos
      const productIds = topProducts.map((item) => item.productId);
      const products = await prisma.product.findMany({
        where: { id: { in: productIds } },
        include: {
          category: {
            select: { id: true, name: true },
          },
        },
      });

      const topProductsWithNames = topProducts.map((item) => {
        const product = products.find((p) => p.id === item.productId);
        return {
          productId: item.productId,
          name: product?.name || "Producto no encontrado",
          category: product?.category.name || "Sin categoría",
          favoriteCount: item._count.productId,
        };
      });

      res.json({
        success: true,
        message: "Estadísticas de favoritos obtenidas exitosamente",
        data: {
          stats: {
            totalFavorites,
            newFavorites,
            period,
          },
          topProducts: topProductsWithNames,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error al obtener estadísticas de favoritos:", error);
      res.status(500).json({
        success: false,
        error: "Error interno del servidor",
        code: "FAVORITE_STATS_ERROR",
        timestamp: new Date().toISOString(),
      });
    }
  }
}
