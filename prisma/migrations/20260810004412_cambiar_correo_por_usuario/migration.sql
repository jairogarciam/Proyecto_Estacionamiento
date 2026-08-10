/*
  Warnings:

  - You are about to drop the column `correo` on the `usuarios` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[usuario]` on the table `usuarios` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `usuario` to the `usuarios` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX `usuarios_correo_key` ON `usuarios`;

-- AlterTable
ALTER TABLE `usuarios` DROP COLUMN `correo`,
    ADD COLUMN `usuario` VARCHAR(255) NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX `usuarios_usuario_key` ON `usuarios`(`usuario`);
