/*
  Warnings:

  - A unique constraint covering the columns `[category_id,name]` on the table `products` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "products_category_id_name_key" ON "products"("category_id", "name");
