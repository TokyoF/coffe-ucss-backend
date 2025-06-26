import { Request, Response } from "express";
import { validationResult } from "express-validator";
import prisma from "../config/database";
import { OrderItemInput, ProcessedOrderItem } from "../types/orderTypes";

export class OrderController {
  // ========================================
  // CREAR NUEVO PEDIDO (CLIENTE)
  // ========================================
  static async createOrder(req: Request, res: Response) {
    try {
      // Verificar errores de validación
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
      const {
        items,
        deliveryLocation,
        paymentMethod,
        notes,
      }: {
        items: OrderItemInput[];
        deliveryLocation: string;
        paymentMethod: string;
        notes?: string;
      } = req.body;

      // Validar que hay items en el pedido
      if (!items || items.length === 0) {
        res.status(400).json({
          success: false,
          error: "El pedido debe contener al menos un producto",
          code: "NO_ITEMS_IN_ORDER",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Verificar productos y calcular totales
      let subtotal = 0;
      const orderItems: ProcessedOrderItem[] = [];

      for (const item of items) {
        const product = await prisma.product.findUnique({
          where: { id: item.productId },
        });

        if (!product) {
          res.status(404).json({
            success: false,
            error: `Producto con ID ${item.productId} no encontrado`,
            code: "PRODUCT_NOT_FOUND",
            timestamp: new Date().toISOString(),
          });
          return;
        }

        if (!product.isAvailable) {
          res.status(400).json({
            success: false,
            error: `El producto "${product.name}" no está disponible`,
            code: "PRODUCT_NOT_AVAILABLE",
            timestamp: new Date().toISOString(),
          });
          return;
        }

        const quantity = item.quantity || 1;
        const unitPrice = Number(product.price);
        const itemSubtotal = Number(unitPrice) * quantity;

        subtotal += itemSubtotal;

        orderItems.push({
          productId: item.productId,
          quantity,
          unitPrice,
          customizations: item.customizations || null,
          specialNotes: item.specialNotes || null,
          subtotal: itemSubtotal,
        });
      }

      // Validar monto mínimo (RN-004)
      if (subtotal < 2.0) {
        res.status(400).json({
          success: false,
          error: "El monto mínimo del pedido es S/ 2.00",
          code: "MINIMUM_ORDER_NOT_MET",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Calcular delivery fee (RN-004)
      const deliveryFee = 1.0; // Fee fijo de S/ 1.00
      const total = subtotal + deliveryFee;

      // Crear pedido en transacción
      const order = await prisma.$transaction(async (tx) => {
        // Crear el pedido
        const newOrder = await tx.order.create({
          data: {
            userId,
            deliveryLocation,
            paymentMethod: paymentMethod as any,
            subtotal,
            deliveryFee,
            total,
            notes,
            status: "PENDING",
          },
        });

        // Crear los items del pedido
        for (const item of orderItems) {
          await tx.orderItem.create({
            data: {
              orderId: newOrder.id,
              ...item,
            },
          });
        }

        // Crear notificación para el usuario
        await tx.notification.create({
          data: {
            userId,
            title: "Pedido confirmado",
            message: `Tu pedido #${newOrder.id} ha sido confirmado y está siendo procesado.`,
            type: "ORDER",
            orderId: newOrder.id,
          },
        });

        return newOrder;
      });

      // Obtener pedido completo con items
      const completeOrder = await prisma.order.findUnique({
        where: { id: order.id },
        include: {
          orderItems: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  imageUrl: true,
                  price: true,
                },
              },
            },
          },
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      });

      res.status(201).json({
        success: true,
        message: "Pedido creado exitosamente",
        data: completeOrder,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error al crear pedido:", error);
      res.status(500).json({
        success: false,
        error: "Error interno del servidor",
        code: "ORDER_CREATE_ERROR",
        timestamp: new Date().toISOString(),
      });
    }
  }

  // ========================================
  // OBTENER PEDIDOS DEL USUARIO (CLIENTE)
  // ========================================
  static async getUserOrders(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;
      const { status, page = 1, limit = 10 } = req.query;

      const skip = (Number(page) - 1) * Number(limit);

      const whereClause: any = { userId };
      if (status) {
        whereClause.status = status;
      }

      const [orders, total] = await Promise.all([
        prisma.order.findMany({
          where: whereClause,
          include: {
            orderItems: {
              include: {
                product: {
                  select: {
                    id: true,
                    name: true,
                    imageUrl: true,
                    price: true,
                  },
                },
              },
            },
          },
          orderBy: { createdAt: "desc" },
          skip,
          take: Number(limit),
        }),
        prisma.order.count({ where: whereClause }),
      ]);

      res.json({
        success: true,
        message: "Pedidos obtenidos exitosamente",
        data: orders,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit)),
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error al obtener pedidos del usuario:", error);
      res.status(500).json({
        success: false,
        error: "Error interno del servidor",
        code: "USER_ORDERS_FETCH_ERROR",
        timestamp: new Date().toISOString(),
      });
    }
  }

  // ========================================
  // OBTENER PEDIDO POR ID (CLIENTE/ADMIN)
  // ========================================
  static async getOrderById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user!.userId;
      const userRole = req.user!.role;

      const orderId = parseInt(id);
      if (isNaN(orderId)) {
        res.status(400).json({
          success: false,
          error: "ID de pedido inválido",
          code: "INVALID_ORDER_ID",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const whereClause: any = { id: orderId };

      // Si no es admin, solo puede ver sus propios pedidos
      if (userRole !== "ADMIN") {
        whereClause.userId = userId;
      }

      const order = await prisma.order.findUnique({
        where: whereClause,
        include: {
          orderItems: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  description: true,
                  imageUrl: true,
                  price: true,
                },
              },
            },
          },
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
            },
          },
        },
      });

      if (!order) {
        res.status(404).json({
          success: false,
          error: "Pedido no encontrado",
          code: "ORDER_NOT_FOUND",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      res.json({
        success: true,
        message: "Pedido obtenido exitosamente",
        data: order,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error al obtener pedido:", error);
      res.status(500).json({
        success: false,
        error: "Error interno del servidor",
        code: "ORDER_FETCH_ERROR",
        timestamp: new Date().toISOString(),
      });
    }
  }

  // ========================================
  // CANCELAR PEDIDO (CLIENTE)
  // ========================================
  static async cancelOrder(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user!.userId;

      const orderId = parseInt(id);
      if (isNaN(orderId)) {
        res.status(400).json({
          success: false,
          error: "ID de pedido inválido",
          code: "INVALID_ORDER_ID",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const order = await prisma.order.findUnique({
        where: { id: orderId },
      });

      if (!order) {
        res.status(404).json({
          success: false,
          error: "Pedido no encontrado",
          code: "ORDER_NOT_FOUND",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Verificar que es el dueño del pedido
      if (order.userId !== userId) {
        res.status(403).json({
          success: false,
          error: "No tienes permisos para cancelar este pedido",
          code: "ORDER_ACCESS_DENIED",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Solo se puede cancelar si está en PENDING (RN-005)
      if (order.status !== "PENDING") {
        res.status(400).json({
          success: false,
          error: "Solo se pueden cancelar pedidos en estado PENDING",
          code: "ORDER_CANNOT_BE_CANCELLED",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Actualizar pedido a cancelado
      const updatedOrder = await prisma.$transaction(async (tx) => {
        const updated = await tx.order.update({
          where: { id: orderId },
          data: { status: "CANCELLED" },
        });

        // Crear notificación
        await tx.notification.create({
          data: {
            userId,
            title: "Pedido cancelado",
            message: `Tu pedido #${orderId} ha sido cancelado exitosamente.`,
            type: "ORDER",
            orderId: orderId,
          },
        });

        return updated;
      });

      res.json({
        success: true,
        message: "Pedido cancelado exitosamente",
        data: updatedOrder,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error al cancelar pedido:", error);
      res.status(500).json({
        success: false,
        error: "Error interno del servidor",
        code: "ORDER_CANCEL_ERROR",
        timestamp: new Date().toISOString(),
      });
    }
  }

  // ========================================
  // OBTENER TODOS LOS PEDIDOS (ADMIN)
  // ========================================
  static async getAllOrders(req: Request, res: Response) {
    try {
      const { status, date, page = 1, limit = 20 } = req.query;

      const skip = (Number(page) - 1) * Number(limit);
      const whereClause: any = {};

      if (status) {
        whereClause.status = status;
      }

      if (date) {
        const startDate = new Date(date as string);
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 1);

        whereClause.createdAt = {
          gte: startDate,
          lt: endDate,
        };
      }

      const [orders, total] = await Promise.all([
        prisma.order.findMany({
          where: whereClause,
          include: {
            orderItems: {
              include: {
                product: {
                  select: {
                    id: true,
                    name: true,
                    imageUrl: true,
                  },
                },
              },
            },
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
          skip,
          take: Number(limit),
        }),
        prisma.order.count({ where: whereClause }),
      ]);

      res.json({
        success: true,
        message: "Todos los pedidos obtenidos exitosamente",
        data: orders,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit)),
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error al obtener todos los pedidos:", error);
      res.status(500).json({
        success: false,
        error: "Error interno del servidor",
        code: "ALL_ORDERS_FETCH_ERROR",
        timestamp: new Date().toISOString(),
      });
    }
  }

  // ========================================
  // ACTUALIZAR ESTADO DEL PEDIDO (ADMIN)
  // ========================================
  static async updateOrderStatus(req: Request, res: Response) {
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
      const { status } = req.body;

      const orderId = parseInt(id);
      if (isNaN(orderId)) {
        res.status(400).json({
          success: false,
          error: "ID de pedido inválido",
          code: "INVALID_ORDER_ID",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: { user: true },
      });

      if (!order) {
        res.status(404).json({
          success: false,
          error: "Pedido no encontrado",
          code: "ORDER_NOT_FOUND",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Validar transiciones de estado según el workflow
      const validTransitions: Record<string, string[]> = {
        PENDING: ["PREPARING", "CANCELLED"],
        PREPARING: ["READY", "CANCELLED"],
        READY: ["DELIVERED", "CANCELLED"],
        DELIVERED: [], // Estado final
        CANCELLED: [], // Estado final
      };

      if (!validTransitions[order.status].includes(status)) {
        res.status(400).json({
          success: false,
          error: `No se puede cambiar de ${order.status} a ${status}`,
          code: "INVALID_STATUS_TRANSITION",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Actualizar estado y crear notificación
      const updatedOrder = await prisma.$transaction(async (tx) => {
        const updated = await tx.order.update({
          where: { id: orderId },
          data: { status: status },
        });

        // Mensajes de notificación según el estado
        const statusMessages: Record<string, string> = {
          PREPARING: "Tu pedido está siendo preparado",
          READY: "Tu pedido está listo para entrega",
          DELIVERED: "Tu pedido ha sido entregado",
          CANCELLED: "Tu pedido ha sido cancelado",
        };

        // Crear notificación para el cliente
        await tx.notification.create({
          data: {
            userId: order.userId,
            title: "Estado del pedido actualizado",
            message: `Pedido #${orderId}: ${statusMessages[status]}`,
            type: "ORDER",
            orderId: orderId,
          },
        });

        return updated;
      });

      res.json({
        success: true,
        message: "Estado del pedido actualizado exitosamente",
        data: updatedOrder,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error al actualizar estado del pedido:", error);
      res.status(500).json({
        success: false,
        error: "Error interno del servidor",
        code: "ORDER_STATUS_UPDATE_ERROR",
        timestamp: new Date().toISOString(),
      });
    }
  }
}
