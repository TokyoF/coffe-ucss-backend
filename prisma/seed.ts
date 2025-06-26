import { PrismaClient } from "@prisma/client";
import { AuthUtils } from "../src/utils/auth";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Iniciando seed de la base de datos...");

  try {
    // ========================================
    // 1. CREAR USUARIO ADMINISTRADOR
    // ========================================
    console.log("👑 Creando usuario administrador...");

    const adminPassword = await AuthUtils.hashPassword("Admin123");

    // Verificar si ya existe
    const existingAdmin = await prisma.user.findUnique({
      where: { email: "admin@ucss.pe" },
    });

    let admin;
    if (existingAdmin) {
      console.log("✅ Admin ya existe");
      admin = existingAdmin;
    } else {
      admin = await prisma.user.create({
        data: {
          email: "admin@ucss.pe",
          password: adminPassword,
          firstName: "Admin",
          lastName: "UCSS",
          phone: "999888777",
          role: "ADMIN",
          isVerified: true,
          isActive: true,
        },
      });
      console.log(`✅ Admin creado: ${admin.email} (ID: ${admin.id})`);
    }

    // ========================================
    // 2. CREAR CATEGORÍAS
    // ========================================
    console.log("📂 Creando categorías...");

    // Coffee Category
    const existingCoffee = await prisma.category.findFirst({
      where: { name: "Coffee" },
    });

    let coffeeCategory;
    if (existingCoffee) {
      coffeeCategory = existingCoffee;
    } else {
      coffeeCategory = await prisma.category.create({
        data: {
          name: "Coffee",
          description: "Bebidas de café tradicionales y especiales",
          isActive: true,
        },
      });
    }

    // Mate Category
    const existingMate = await prisma.category.findFirst({
      where: { name: "Mate" },
    });

    let mateCategory;
    if (existingMate) {
      mateCategory = existingMate;
    } else {
      mateCategory = await prisma.category.create({
        data: {
          name: "Mate",
          description: "Infusiones de mate y hierbas tradicionales",
          isActive: true,
        },
      });
    }

    // Tea Category
    const existingTea = await prisma.category.findFirst({
      where: { name: "Tea" },
    });

    let teaCategory;
    if (existingTea) {
      teaCategory = existingTea;
    } else {
      teaCategory = await prisma.category.create({
        data: {
          name: "Tea",
          description: "Tés y tisanas especiales",
          isActive: true,
        },
      });
    }

    console.log(
      `✅ Categorías listas: Coffee (${coffeeCategory.id}), Mate (${mateCategory.id}), Tea (${teaCategory.id})`,
    );

    // ========================================
    // 3. CREAR PRODUCTOS DE CAFÉ
    // ========================================
    console.log("☕ Creando productos de café...");

    const coffeeProducts = [
      {
        name: "Espresso",
        description: "Café espresso tradicional italiano, intenso y aromático",
        price: 3.5,
        imageUrl:
          "https://images.unsplash.com/photo-1510707577719-ae7c14805e76?w=400",
        rating: 4.8,
      },
      {
        name: "Cappuccino",
        description: "Espresso con espuma de leche cremosa y canela",
        price: 4.5,
        imageUrl:
          "https://images.unsplash.com/photo-1557006021-b85faa2bc5e2?w=400",
        rating: 4.9,
      },
      {
        name: "Americano",
        description: "Café negro americano, suave y balanceado",
        price: 3.0,
        imageUrl:
          "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400",
        rating: 4.6,
      },
      {
        name: "Latte",
        description: "Espresso con leche vaporizada y arte latte",
        price: 4.2,
        imageUrl:
          "https://images.unsplash.com/photo-1561047029-3000c68339ca?w=400",
        rating: 4.7,
      },
      {
        name: "Flat White",
        description: "Café australiano con leche texturizada y microespuma",
        price: 4.8,
        imageUrl:
          "https://images.unsplash.com/photo-1442512595331-e89e73853f31?w=400",
        rating: 4.9,
      },
      {
        name: "Mocha",
        description: "Espresso con chocolate caliente y crema batida",
        price: 5.2,
        imageUrl:
          "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400",
        rating: 4.8,
      },
    ];

    for (const product of coffeeProducts) {
      const existing = await prisma.product.findFirst({
        where: {
          name: product.name,
          categoryId: coffeeCategory.id,
        },
      });

      if (!existing) {
        await prisma.product.create({
          data: {
            ...product,
            categoryId: coffeeCategory.id,
            isAvailable: true,
          },
        });
        console.log(`  ✅ ${product.name} creado`);
      }
    }

    // ========================================
    // 4. CREAR PRODUCTOS DE MATE
    // ========================================
    console.log("🧉 Creando productos de mate...");

    const mateProducts = [
      {
        name: "Mate Cocido",
        description:
          "Mate tradicional argentino en saquitos, suave y digestivo",
        price: 2.5,
        imageUrl:
          "https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=400",
        rating: 4.5,
      },
      {
        name: "Mate con Leche",
        description: "Mate cocido con leche caliente y miel",
        price: 3.2,
        imageUrl:
          "https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=400",
        rating: 4.6,
      },
      {
        name: "Mate de Hierbas",
        description: "Mezcla de mate con hierbas medicinales y menta",
        price: 3.0,
        imageUrl:
          "https://images.unsplash.com/photo-1597318281675-41e2850125b6?w=400",
        rating: 4.4,
      },
      {
        name: "Tereré",
        description: "Mate frío con hielo, menta y limón",
        price: 2.8,
        imageUrl:
          "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400",
        rating: 4.3,
      },
    ];

    for (const product of mateProducts) {
      const existing = await prisma.product.findFirst({
        where: {
          name: product.name,
          categoryId: mateCategory.id,
        },
      });

      if (!existing) {
        await prisma.product.create({
          data: {
            ...product,
            categoryId: mateCategory.id,
            isAvailable: true,
          },
        });
        console.log(`  ✅ ${product.name} creado`);
      }
    }

    // ========================================
    // 5. CREAR PRODUCTOS DE TÉ
    // ========================================
    console.log("🍵 Creando productos de té...");

    const teaProducts = [
      {
        name: "Té Verde",
        description: "Té verde natural con antioxidantes, ligero y refrescante",
        price: 2.2,
        imageUrl:
          "https://images.unsplash.com/photo-1556679542-d3d1d6e7e4f1?w=400",
        rating: 4.5,
      },
      {
        name: "Té Negro",
        description: "Té negro English Breakfast, fuerte y aromático",
        price: 2.5,
        imageUrl:
          "https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=400",
        rating: 4.4,
      },
      {
        name: "Chai Latte",
        description: "Té negro con especias, leche y miel",
        price: 4.0,
        imageUrl:
          "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400",
        rating: 4.7,
      },
      {
        name: "Té de Manzanilla",
        description: "Infusión relajante de manzanilla natural",
        price: 2.0,
        imageUrl:
          "https://images.unsplash.com/photo-1597318281675-41e2850125b6?w=400",
        rating: 4.3,
      },
    ];

    for (const product of teaProducts) {
      const existing = await prisma.product.findFirst({
        where: {
          name: product.name,
          categoryId: teaCategory.id,
        },
      });

      if (!existing) {
        await prisma.product.create({
          data: {
            ...product,
            categoryId: teaCategory.id,
            isAvailable: true,
          },
        });
        console.log(`  ✅ ${product.name} creado`);
      }
    }

    // ========================================
    // 6. CREAR PERSONALIZACIONES
    // ========================================
    console.log("⚙️ Creando personalizaciones...");

    // Obtener algunos productos para agregar personalizaciones
    const espresso = await prisma.product.findFirst({
      where: { name: "Espresso" },
    });

    const cappuccino = await prisma.product.findFirst({
      where: { name: "Cappuccino" },
    });

    if (espresso) {
      // Personalizaciones para Espresso
      const existingCustomizations = await prisma.customization.findMany({
        where: { productId: espresso.id },
      });

      if (existingCustomizations.length === 0) {
        await prisma.customization.createMany({
          data: [
            {
              productId: espresso.id,
              name: "Tamaño",
              type: "size",
              options: [
                { name: "Small (50ml)", price: 0 },
                { name: "Medium (75ml)", price: 0.5 },
                { name: "Large (100ml)", price: 1.0 },
              ],
              isRequired: true,
            },
            {
              productId: espresso.id,
              name: "Azúcar",
              type: "sugar",
              options: [
                { name: "Sin azúcar", price: 0 },
                { name: "1 cucharada", price: 0 },
                { name: "2 cucharadas", price: 0 },
              ],
              isRequired: false,
            },
          ],
        });
        console.log(`  ✅ Personalizaciones para ${espresso.name} creadas`);
      }
    }

    if (cappuccino) {
      // Personalizaciones para Cappuccino
      const existingCustomizations = await prisma.customization.findMany({
        where: { productId: cappuccino.id },
      });

      if (existingCustomizations.length === 0) {
        await prisma.customization.createMany({
          data: [
            {
              productId: cappuccino.id,
              name: "Tamaño",
              type: "size",
              options: [
                { name: "Small (150ml)", price: 0 },
                { name: "Medium (200ml)", price: 0.5 },
                { name: "Large (250ml)", price: 1.0 },
              ],
              isRequired: true,
            },
            {
              productId: cappuccino.id,
              name: "Tipo de leche",
              type: "milk",
              options: [
                { name: "Leche normal", price: 0 },
                { name: "Leche de avena", price: 0.5 },
                { name: "Leche de almendra", price: 0.5 },
                { name: "Leche deslactosada", price: 0.3 },
              ],
              isRequired: false,
            },
            {
              productId: cappuccino.id,
              name: "Temperatura",
              type: "temperature",
              options: [
                { name: "Caliente", price: 0 },
                { name: "Tibio", price: 0 },
                { name: "Frío", price: 0 },
              ],
              isRequired: false,
            },
          ],
        });
        console.log(`  ✅ Personalizaciones para ${cappuccino.name} creadas`);
      }
    }

    // ========================================
    // 7. MOSTRAR ESTADÍSTICAS FINALES
    // ========================================
    const stats = await Promise.all([
      prisma.user.count(),
      prisma.category.count(),
      prisma.product.count(),
      prisma.customization.count(),
    ]);

    console.log("\n🎉 ¡Seed completado exitosamente!");
    console.log("📊 Estadísticas finales:");
    console.log(`   👥 Usuarios: ${stats[0]}`);
    console.log(`   📂 Categorías: ${stats[1]}`);
    console.log(`   📦 Productos: ${stats[2]}`);
    console.log(`   ⚙️  Personalizaciones: ${stats[3]}`);
    console.log("\n🔑 Credenciales de admin:");
    console.log("   📧 Email: admin@ucss.pe");
    console.log("   🔒 Password: Admin123");
    console.log("\n🚀 ¡Listo para probar la API!");
  } catch (error) {
    console.error("❌ Error durante el seed:", error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
