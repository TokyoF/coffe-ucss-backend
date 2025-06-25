import { Router } from "express";
import { AuthController } from "../controllers/authController";
import { registerValidation, loginValidation } from "../utils/validators";
import { authenticateToken } from "../middleware/auth";

const router = Router();

// Rutas públicas
router.post("/register", registerValidation, AuthController.register);
router.post("/login", loginValidation, AuthController.login);
router.post("/refresh", AuthController.refreshToken);
router.post("/logout", AuthController.logout);

// Rutas protegidas
router.get("/profile", authenticateToken, AuthController.getProfile);

export default router;
