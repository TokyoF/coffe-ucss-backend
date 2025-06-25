import { body } from "express-validator";

// ========================================
// VALIDADORES DE AUTENTICACIÓN (YA EXISTENTES)
// ========================================
export const registerValidation = [
  body("email")
    .isEmail()
    .withMessage("Email inválido")
    .custom((email) => {
      if (!email.endsWith("@ucss.pe")) {
        throw new Error("Solo se permiten correos @ucss.pe");
      }
      return true;
    }),

  body("password")
    .isLength({ min: 8 })
    .withMessage("La contraseña debe tener al menos 8 caracteres")
    .matches(/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage(
      "La contraseña debe contener al menos una minúscula, una mayúscula y un número",
    ),

  body("firstName")
    .notEmpty()
    .withMessage("El nombre es requerido")
    .isLength({ min: 2, max: 50 })
    .withMessage("El nombre debe tener entre 2 y 50 caracteres"),

  body("lastName")
    .notEmpty()
    .withMessage("El apellido es requerido")
    .isLength({ min: 2, max: 50 })
    .withMessage("El apellido debe tener entre 2 y 50 caracteres"),

  body("phone")
    .optional()
    .isMobilePhone("es-PE")
    .withMessage("Número de teléfono inválido"),
];

export const loginValidation = [
  body("email").isEmail().withMessage("Email inválido"),

  body("password").notEmpty().withMessage("La contraseña es requerida"),
];

// ========================================
// VALIDADORES DE PRODUCTOS (NUEVOS)
// ========================================

// Validación para crear producto
export const productValidation = [
  body("categoryId")
    .isInt({ min: 1 })
    .withMessage("ID de categoría debe ser un número entero positivo"),

  body("name")
    .notEmpty()
    .withMessage("El nombre del producto es requerido")
    .isLength({ min: 2, max: 100 })
    .withMessage("El nombre debe tener entre 2 y 100 caracteres")
    .trim(),

  body("description")
    .optional()
    .isLength({ max: 500 })
    .withMessage("La descripción no puede superar los 500 caracteres")
    .trim(),

  body("price")
    .isNumeric()
    .withMessage("El precio debe ser un número")
    .isFloat({ min: 0.01, max: 999.99 })
    .withMessage("El precio debe estar entre 0.01 y 999.99")
    .custom((value) => {
      // Verificar que tenga máximo 2 decimales
      const decimalPart = value.toString().split(".")[1];
      if (decimalPart && decimalPart.length > 2) {
        throw new Error("El precio no puede tener más de 2 decimales");
      }
      return true;
    }),

  body("imageUrl")
    .optional()
    .isURL()
    .withMessage("La URL de la imagen debe ser válida")
    .isLength({ max: 255 })
    .withMessage("La URL de la imagen no puede superar los 255 caracteres"),
];

// Validación para actualizar producto
export const updateProductValidation = [
  body("categoryId")
    .optional()
    .isInt({ min: 1 })
    .withMessage("ID de categoría debe ser un número entero positivo"),

  body("name")
    .optional()
    .notEmpty()
    .withMessage("El nombre del producto no puede estar vacío")
    .isLength({ min: 2, max: 100 })
    .withMessage("El nombre debe tener entre 2 y 100 caracteres")
    .trim(),

  body("description")
    .optional()
    .isLength({ max: 500 })
    .withMessage("La descripción no puede superar los 500 caracteres")
    .trim(),

  body("price")
    .optional()
    .isNumeric()
    .withMessage("El precio debe ser un número")
    .isFloat({ min: 0.01, max: 999.99 })
    .withMessage("El precio debe estar entre 0.01 y 999.99")
    .custom((value) => {
      if (value !== undefined) {
        const decimalPart = value.toString().split(".")[1];
        if (decimalPart && decimalPart.length > 2) {
          throw new Error("El precio no puede tener más de 2 decimales");
        }
      }
      return true;
    }),

  body("imageUrl")
    .optional()
    .isURL()
    .withMessage("La URL de la imagen debe ser válida")
    .isLength({ max: 255 })
    .withMessage("La URL de la imagen no puede superar los 255 caracteres"),

  body("isAvailable")
    .optional()
    .isBoolean()
    .withMessage("isAvailable debe ser un valor booleano"),
];

// ========================================
// VALIDADORES DE CATEGORÍAS (PARA FUTURO USO)
// ========================================

export const categoryValidation = [
  body("name")
    .notEmpty()
    .withMessage("El nombre de la categoría es requerido")
    .isLength({ min: 2, max: 50 })
    .withMessage("El nombre debe tener entre 2 y 50 caracteres")
    .trim(),

  body("description")
    .optional()
    .isLength({ max: 255 })
    .withMessage("La descripción no puede superar los 255 caracteres")
    .trim(),
];

export const updateCategoryValidation = [
  body("name")
    .optional()
    .notEmpty()
    .withMessage("El nombre de la categoría no puede estar vacío")
    .isLength({ min: 2, max: 50 })
    .withMessage("El nombre debe tener entre 2 y 50 caracteres")
    .trim(),

  body("description")
    .optional()
    .isLength({ max: 255 })
    .withMessage("La descripción no puede superar los 255 caracteres")
    .trim(),

  body("isActive")
    .optional()
    .isBoolean()
    .withMessage("isActive debe ser un valor booleano"),
];
