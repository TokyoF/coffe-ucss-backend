import express from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import prisma from "./config/database";

// Cargar variables de entorno
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware básico
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Ruta de prueba
app.get("/", (req, res) => {
  res.json({
    message: "COFFE UCSS API is running!",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
  });
});

// Health check con base de datos
app.get("/health", async (req, res) => {
  try {
    // Probar conexión a la base de datos
    await prisma.$connect();

    res.json({
      status: "OK",
      database: "Connected ✅",
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      status: "ERROR",
      database: "Disconnected ❌",
      error: "Database connection failed",
    });
  }
});

// Graceful shutdown
process.on("beforeExit", async () => {
  await prisma.$disconnect();
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🗄️  Database: PostgreSQL`);
});

export default app;
