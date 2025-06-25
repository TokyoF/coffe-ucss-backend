import { Request, Response } from "express";
import { validationResult } from "express-validator";
import prisma from "../config/database";

export class ProductController {
  // ========================================
  // OBTENER TODOS LOS PRODUCTOS (PÚBLICO)
  // ========================================
  static async getAllProducts(req: Request, res: Response) {
    try {
      const { category, search, available } = req.query;

      // Construir filtros dinámicos
      const where: any = {};

      if (category) {
        where.category = {
          name: {
            contains: category as string,
            mode: "insensitive",
          },
        };
      }

      if (search) {
        where.OR = [
          {
            name: {
              contains: search as string,
              mode: "insensitive",
            },
          },
          {
            description: {
              contains: search as string,
              mode: "insensitive",
            },
          },
        ];
      }

      if (available !== undefined) {
        where.isAvailable = available === "true";
      }

      const products = await prisma.product.findMany({
        where,
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
        orderBy: {
          name: "asc",
        },
      });

      res.json({
        success: true,
        message: "Productos obtenidos exitosamente",
        data: products,
        count: products.length,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error al obtener productos:", error);
      res.status(500).json({
        success: false,
        error: "Error interno del servidor",
        code: "PRODUCTS_FETCH_ERROR",
        timestamp: new Date().toISOString(),
      });
    }
  }

  // ========================================
  // OBTENER PRODUCTO POR ID (PÚBLICO)
  // ========================================
  static async getProductById(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const productId = parseInt(id);
      if (isNaN(productId)) {
        res.status(400).json({
          success: false,
          error: "ID de producto inválido",
          code: "INVALID_PRODUCT_ID",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const product = await prisma.product.findUnique({
        where: { id: productId },
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

      res.json({
        success: true,
        message: "Producto obtenido exitosamente",
        data: product,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error al obtener producto:", error);
      res.status(500).json({
        success: false,
        error: "Error interno del servidor",
        code: "PRODUCT_FETCH_ERROR",
        timestamp: new Date().toISOString(),
      });
    }
  }

  // ========================================
  // CREAR PRODUCTO (SOLO ADMIN)
  // ========================================
  static async createProduct(req: Request, res: Response) {
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

      const { categoryId, name, description, price, imageUrl } = req.body;

      // Verificar que la categoría existe
      const category = await prisma.category.findUnique({
        where: { id: categoryId },
      });

      if (!category) {
        res.status(400).json({
          success: false,
          error: "Categoría no encontrada",
          code: "CATEGORY_NOT_FOUND",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Verificar que no existe un producto con el mismo nombre
      const existingProduct = await prisma.product.findFirst({
        where: {
          name: {
            equals: name,
            mode: "insensitive",
          },
        },
      });

      if (existingProduct) {
        res.status(409).json({
          success: false,
          error: "Ya existe un producto con ese nombre",
          code: "PRODUCT_NAME_EXISTS",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const product = await prisma.product.create({
        data: {
          categoryId,
          name,
          description,
          price: parseFloat(price),
          imageUrl,
        },
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

      res.status(201).json({
        success: true,
        message: "Producto creado exitosamente",
        data: product,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error al crear producto:", error);
      res.status(500).json({
        success: false,
        error: "Error interno del servidor",
        code: "PRODUCT_CREATE_ERROR",
        timestamp: new Date().toISOString(),
      });
    }
  }

  // ========================================
  // ACTUALIZAR PRODUCTO (SOLO ADMIN)
  // ========================================
  static async updateProduct(req: Request, res: Response) {
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
      const { categoryId, name, description, price, imageUrl, isAvailable } =
        req.body;

      const productId = parseInt(id);
      if (isNaN(productId)) {
        res.status(400).json({
          success: false,
          error: "ID de producto inválido",
          code: "INVALID_PRODUCT_ID",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Verificar que el producto existe
      const existingProduct = await prisma.product.findUnique({
        where: { id: productId },
      });

      if (!existingProduct) {
        res.status(404).json({
          success: false,
          error: "Producto no encontrado",
          code: "PRODUCT_NOT_FOUND",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Si se proporciona categoryId, verificar que existe
      if (categoryId) {
        const category = await prisma.category.findUnique({
          where: { id: categoryId },
        });

        if (!category) {
          res.status(400).json({
            success: false,
            error: "Categoría no encontrada",
            code: "CATEGORY_NOT_FOUND",
            timestamp: new Date().toISOString(),
          });
          return;
        }
      }

      // Preparar datos de actualización
      const updateData: any = {};
      if (categoryId !== undefined) updateData.categoryId = categoryId;
      if (name !== undefined) updateData.name = name;
      if (description !== undefined) updateData.description = description;
      if (price !== undefined) updateData.price = parseFloat(price);
      if (imageUrl !== undefined) updateData.imageUrl = imageUrl;
      if (isAvailable !== undefined) updateData.isAvailable = isAvailable;

      const updatedProduct = await prisma.product.update({
        where: { id: productId },
        data: updateData,
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

      res.json({
        success: true,
        message: "Producto actualizado exitosamente",
        data: updatedProduct,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error al actualizar producto:", error);
      res.status(500).json({
        success: false,
        error: "Error interno del servidor",
        code: "PRODUCT_UPDATE_ERROR",
        timestamp: new Date().toISOString(),
      });
    }
  }

  // ========================================
  // ELIMINAR PRODUCTO (SOLO ADMIN)
  // ========================================
  static async deleteProduct(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const productId = parseInt(id);
      if (isNaN(productId)) {
        res.status(400).json({
          success: false,
          error: "ID de producto inválido",
          code: "INVALID_PRODUCT_ID",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Verificar que el producto existe
      const existingProduct = await prisma.product.findUnique({
        where: { id: productId },
      });

      if (!existingProduct) {
        res.status(404).json({
          success: false,
          error: "Producto no encontrado",
          code: "PRODUCT_NOT_FOUND",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Verificar si el producto tiene pedidos asociados
      const hasOrders = await prisma.orderItem.findFirst({
        where: { productId: productId },
      });

      if (hasOrders) {
        // En lugar de eliminar, marcar como no disponible
        const updatedProduct = await prisma.product.update({
          where: { id: productId },
          data: { isAvailable: false },
        });

        res.json({
          success: true,
          message:
            "Producto marcado como no disponible (tiene pedidos asociados)",
          data: updatedProduct,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Si no tiene pedidos, eliminar completamente
      await prisma.product.delete({
        where: { id: productId },
      });

      res.json({
        success: true,
        message: "Producto eliminado exitosamente",
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error al eliminar producto:", error);
      res.status(500).json({
        success: false,
        error: "Error interno del servidor",
        code: "PRODUCT_DELETE_ERROR",
        timestamp: new Date().toISOString(),
      });
    }
  }

  // ========================================
  // OBTENER PRODUCTOS POR CATEGORÍA (PÚBLICO)
  // ========================================
  static async getProductsByCategory(req: Request, res: Response) {
    try {
      const { categoryId } = req.params;

      const categoryIdNum = parseInt(categoryId);
      if (isNaN(categoryIdNum)) {
        res.status(400).json({
          success: false,
          error: "ID de categoría inválido",
          code: "INVALID_CATEGORY_ID",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Verificar que la categoría existe
      const category = await prisma.category.findUnique({
        where: { id: categoryIdNum },
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

      const products = await prisma.product.findMany({
        where: {
          categoryId: categoryIdNum,
          isAvailable: true,
        },
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
        orderBy: {
          name: "asc",
        },
      });

      res.json({
        success: true,
        message: `Productos de la categoría ${category.name} obtenidos exitosamente`,
        data: products,
        category: category,
        count: products.length,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error al obtener productos por categoría:", error);
      res.status(500).json({
        success: false,
        error: "Error interno del servidor",
        code: "CATEGORY_PRODUCTS_ERROR",
        timestamp: new Date().toISOString(),
      });
    }
  }
}
