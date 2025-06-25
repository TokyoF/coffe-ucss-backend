import { body } from "express-validator";

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
