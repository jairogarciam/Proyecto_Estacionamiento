-- CreateTable
CREATE TABLE `usuarios` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(255) NOT NULL,
    `correo` VARCHAR(255) NOT NULL,
    `password` VARCHAR(255) NOT NULL,
    `rol` ENUM('ADMIN', 'GUARDIA', 'DOCENTE') NOT NULL,
    `qr_token` VARCHAR(255) NULL,

    UNIQUE INDEX `usuarios_correo_key`(`correo`),
    UNIQUE INDEX `usuarios_qr_token_key`(`qr_token`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `vehiculos` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `docente_id` INTEGER NOT NULL,
    `placa` VARCHAR(50) NOT NULL,
    `marca` VARCHAR(100) NOT NULL,
    `modelo` VARCHAR(100) NOT NULL,
    `color` VARCHAR(50) NOT NULL,

    UNIQUE INDEX `vehiculos_placa_key`(`placa`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `cajones` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `identificador` VARCHAR(50) NOT NULL,
    `fila` VARCHAR(10) NOT NULL,
    `columna` INTEGER NOT NULL,
    `distancia_entrada` INTEGER NOT NULL,
    `estado` ENUM('LIBRE', 'OCUPADO', 'MANTENIMIENTO') NOT NULL,

    UNIQUE INDEX `cajones_identificador_key`(`identificador`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `accesos` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `docente_id` INTEGER NOT NULL,
    `cajon_id` INTEGER NOT NULL,
    `vehiculo_id` INTEGER NOT NULL,
    `fecha_hora_entrada` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `fecha_hora_salida` DATETIME(3) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `quejas` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `docente_id` INTEGER NOT NULL,
    `cajon_id` INTEGER NOT NULL,
    `descripcion` TEXT NOT NULL,
    `estado` VARCHAR(50) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `vehiculos` ADD CONSTRAINT `vehiculos_docente_id_fkey` FOREIGN KEY (`docente_id`) REFERENCES `usuarios`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `accesos` ADD CONSTRAINT `accesos_docente_id_fkey` FOREIGN KEY (`docente_id`) REFERENCES `usuarios`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `accesos` ADD CONSTRAINT `accesos_cajon_id_fkey` FOREIGN KEY (`cajon_id`) REFERENCES `cajones`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `accesos` ADD CONSTRAINT `accesos_vehiculo_id_fkey` FOREIGN KEY (`vehiculo_id`) REFERENCES `vehiculos`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `quejas` ADD CONSTRAINT `quejas_docente_id_fkey` FOREIGN KEY (`docente_id`) REFERENCES `usuarios`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `quejas` ADD CONSTRAINT `quejas_cajon_id_fkey` FOREIGN KEY (`cajon_id`) REFERENCES `cajones`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
