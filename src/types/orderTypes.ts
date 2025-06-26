// ========================================
// TIPOS PARA EL SISTEMA DE PEDIDOS
// ========================================

import { OrderStatus, PaymentMethod } from "@prisma/client";

// Tipo para item en el carrito/pedido
export interface OrderItemInput {
  productId: number;
  quantity?: number;
  customizations?: {
    size?: string;
    sugar?: string;
    milk?: string;
    temperature?: string;
    [key: string]: any;
  } | null;
  specialNotes?: string | null;
}

// Tipo para crear un pedido
export interface CreateOrderInput {
  items: OrderItemInput[];
  deliveryLocation: string;
  paymentMethod: PaymentMethod;
  notes?: string | null;
}

// Tipo para actualizar estado de pedido
export interface UpdateOrderStatusInput {
  status: OrderStatus;
}

// Tipo para filtros de pedidos
export interface OrderFilters {
  status?: OrderStatus;
  date?: string;
  page?: number;
  limit?: number;
}

// Tipo para item procesado internamente
export interface ProcessedOrderItem {
  productId: number;
  quantity: number;
  unitPrice: number;
  customizations: any | null;
  specialNotes: string | null;
  subtotal: number;
}

// Tipo para respuesta de pedido completo
export interface OrderResponse {
  id: number;
  userId: number;
  status: OrderStatus;
  deliveryLocation: string;
  paymentMethod: PaymentMethod;
  subtotal: number;
  deliveryFee: number;
  total: number;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  orderItems: {
    id: number;
    quantity: number;
    unitPrice: number;
    customizations: any;
    specialNotes: string | null;
    subtotal: number;
    product: {
      id: number;
      name: string;
      imageUrl: string | null;
      price: number;
    };
  }[];
  user?: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    phone: string | null;
  };
}

// Tipo para estadísticas de pedidos
export interface OrderStats {
  totalOrders: number;
  pendingOrders: number;
  completedOrders: number;
  totalRevenue: number;
  period: string;
}

// Tipo para productos populares
export interface PopularProduct {
  product:
    | {
        id: number;
        name: string;
        imageUrl: string | null;
      }
    | undefined;
  totalSold: number | null;
}
