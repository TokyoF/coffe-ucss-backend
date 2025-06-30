import express from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import prisma from "./config/database";

// Importar rutas
import authRoutes from "./routes/authRoutes";
import productRoutes from "./routes/productRoutes";
import categoryRoutes from "./routes/categoryRoutes";
import orderRoutes from "./routes/orderRoutes";
import notificationRoutes from "./routes/notificationRoutes";
import favoriteRoutes from "./routes/favoriteRoutes";
// Cargar variables de entorno
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// ========================================
// MIDDLEWARE BÁSICO
// ========================================
app.use(helmet());
app.use(
  cors({
    origin:
      process.env.NODE_ENV === "production"
        ? ["https://tu-dominio.com"]
        : ["http://localhost:3000", "http://localhost:19006"], // Para Expo
    credentials: true,
  }),
);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// ========================================
// RUTAS DE LA API
// ========================================
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/favorites", favoriteRoutes);
// ========================================
// RUTA PRINCIPAL (PÚBLICA)
// ========================================
app.get("/", (req, res) => {
  res.json({
    message: "COFFE UCSS API is running!",
    version: "1.0.0",
    security: "🔒 Most endpoints require authentication",
    endpoints: {
      auth: "/api/auth",
      products: "/api/products (🔒 protected)",
      categories: "/api/categories (🔒 protected)",
      health: "/health",
    },
    documentation: {
      "🟢 PUBLIC (no auth required)": {
        register: "POST /api/auth/register",
        login: "POST /api/auth/login",
        refresh: "POST /api/auth/refresh",
        logout: "POST /api/auth/logout",
        health: "GET /health",
      },
      "🔒 PROTECTED (requires valid JWT token)": {
        profile: "GET /api/auth/profile",
        getAllProducts: "GET /api/products",
        getProductById: "GET /api/products/:id",
        getProductsByCategory: "GET /api/products/category/:categoryId",
        getAllCategories: "GET /api/categories",
        getCategoryById: "GET /api/categories/:id",
      },
      "👑 ADMIN ONLY (requires admin role)": {
        createProduct: "POST /api/products",
        updateProduct: "PUT /api/products/:id",
        deleteProduct: "DELETE /api/products/:id",
        createCategory: "POST /api/categories",
        updateCategory: "PUT /api/categories/:id",
        deleteCategory: "DELETE /api/categories/:id",
        categoryStats: "GET /api/categories/admin/stats",
      },
    },
    authentication: {
      header: "Authorization: Bearer <token>",
      note: "🚨 All product and category endpoints require authentication",
      howToGetToken: "Use POST /api/auth/login to get access token",
    },
    timestamp: new Date().toISOString(),
  });
});

// ========================================
// HEALTH CHECK MEJORADO (PÚBLICO)
// ========================================
app.get("/health", async (req, res) => {
  try {
    // Probar conexión a la base de datos
    await prisma.$connect();

    // Obtener estadísticas básicas
    const [usersCount, productsCount, categoriesCount, ordersCount] =
      await Promise.all([
        prisma.user.count(),
        prisma.product.count(),
        prisma.category.count(),
        prisma.order.count(),
      ]);

    res.json({
      status: "OK",
      database: "Connected ✅",
      security: "🔒 Authentication required for most endpoints",
      uptime: process.uptime(),
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + " MB",
        total:
          Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + " MB",
      },
      statistics: {
        users: usersCount,
        products: productsCount,
        categories: categoriesCount,
        orders: ordersCount,
      },
      environment: process.env.NODE_ENV || "development",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Health check failed:", error);
    res.status(500).json({
      status: "ERROR",
      database: "Disconnected ❌",
      error: "Database connection failed",
      timestamp: new Date().toISOString(),
    });
  }
});

// ========================================
// MANEJO DE RUTAS NO ENCONTRADAS
// ========================================
app.use("*", (req, res) => {
  res.status(404).json({
    success: false,
    error: "Endpoint no encontrado",
    message: `La ruta ${req.method} ${req.originalUrl} no existe`,
    availableEndpoints: {
      "🟢 public": ["/", "/health", "/api/auth/login", "/api/auth/register"],
      "🔒 protected": ["/api/products", "/api/categories", "/api/auth/profile"],
      "👑 admin": ["POST /api/products", "POST /api/categories"],
    },
    note: "🚨 Most endpoints require authentication. Use POST /api/auth/login first.",
    timestamp: new Date().toISOString(),
  });
});

// ========================================
// MANEJO DE ERRORES GLOBALES
// ========================================
app.use(
  (
    error: any,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) => {
    console.error("❌ Unhandled error:", error);

    res.status(500).json({
      success: false,
      error: "Error interno del servidor",
      message:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Algo salió mal",
      timestamp: new Date().toISOString(),
    });
  },
);

// ========================================
// GRACEFUL SHUTDOWN MEJORADO
// ========================================
const gracefulShutdown = async (signal: string) => {
  console.log(`\n🔄 Received ${signal}. Starting graceful shutdown...`);

  try {
    await prisma.$disconnect();
    console.log("✅ Database disconnected successfully");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error during shutdown:", error);
    process.exit(1);
  }
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

// Graceful shutdown original
process.on("beforeExit", async () => {
  await prisma.$disconnect();
});

// ========================================
// INICIAR SERVIDOR
// ========================================
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🟢 Public Auth API: http://localhost:${PORT}/api/auth`);
  console.log(
    `🔒 Protected Products API: http://localhost:${PORT}/api/products`,
  );
  console.log(
    `🔒 Protected Categories API: http://localhost:${PORT}/api/categories`,
  );
  console.log(`🗄️  Database: PostgreSQL with Prisma ORM`);
  console.log(`🔐 Security: Authentication required for most endpoints`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`⏰ Started at: ${new Date().toLocaleString()}`);
});

export default app;
