import { Response } from 'express';
import { Prisma } from '@prisma/client';
import prisma from '../../config/prisma';
import { AuthRequest } from '../../middlewares/auth.middleware';

// Crear queja y reasignar cajón
export const crearQueja = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const docenteId = req.usuario?.id;
        const { descripcion, placaOcupante: placaOcupanteEntrada } = req.body;
        const placaOcupante = String(placaOcupanteEntrada || '').trim().toUpperCase();

        if (!docenteId) {
            res.status(401).json({ error: 'Usuario no autenticado' });
            return;
        }

        if (!placaOcupante) {
            res.status(400).json({ error: 'Indica la placa del vehículo que ocupó el cajón.' });
            return;
        }

        const resultado = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
            const accesoReclamante = await tx.acceso.findFirst({
                where: { docenteId, fechaHoraSalida: null },
                include: { cajon: true, vehiculo: { select: { placa: true } } },
                orderBy: { fechaHoraEntrada: 'desc' }
            });

            if (!accesoReclamante) throw new Error('El docente no tiene un acceso activo');
            if (placaOcupante === accesoReclamante.vehiculo.placa.trim().toUpperCase()) {
                throw new Error('La placa intrusa debe ser diferente a la placa del docente');
            }

            const quejaExistente = await tx.queja.findFirst({
                where: { docenteId, cajonId: accesoReclamante.cajonId, estado: 'PENDIENTE' }
            });
            if (quejaExistente) throw new Error('Ya existe una queja pendiente para este cajón');

            const vehiculoIntruso = await tx.vehiculo.findUnique({
                where: { placa: placaOcupante },
                select: { id: true, placa: true }
            });
            if (!vehiculoIntruso) throw new Error('La placa intrusa no pertenece a un vehículo registrado');

            const accesoIntruso = await tx.acceso.findFirst({
                where: { vehiculoId: vehiculoIntruso.id, fechaHoraSalida: null, docenteId: { not: docenteId } },
                include: { cajon: true, docente: { select: { nombre: true } } }
            });
            if (!accesoIntruso) throw new Error('No hay un acceso activo asociado a la placa intrusa');
            if (accesoIntruso.cajonId === accesoReclamante.cajonId) {
                throw new Error('La placa intrusa ya está registrada en el cajón reclamado');
            }

            const nuevoCajon = await tx.cajon.findFirst({
                where: { estado: 'LIBRE', id: { notIn: [accesoReclamante.cajonId, accesoIntruso.cajonId] } },
                orderBy: { distanciaEntrada: 'asc' }
            });
            if (!nuevoCajon) throw new Error('No hay un tercer cajón libre para reasignar al docente');

            const queja = await tx.queja.create({
                data: {
                    docenteId,
                    cajonId: accesoReclamante.cajonId,
                    placaOcupante,
                    descripcion: descripcion || 'El cajón asignado se encuentra ocupado indebidamente',
                    estado: 'PENDIENTE'
                }
            });

            await tx.cajon.update({ where: { id: accesoIntruso.cajonId }, data: { estado: 'LIBRE', placaOcupante: null } });
            await tx.cajon.update({ where: { id: accesoReclamante.cajonId }, data: { estado: 'OCUPADO', placaOcupante } });
            await tx.cajon.update({ where: { id: nuevoCajon.id }, data: { estado: 'OCUPADO', placaOcupante: accesoReclamante.vehiculo.placa } });
            await tx.acceso.update({ where: { id: accesoIntruso.id }, data: { cajonId: accesoReclamante.cajonId } });
            await tx.acceso.update({ where: { id: accesoReclamante.id }, data: { cajonId: nuevoCajon.id } });

            return { queja, accesoReclamante, accesoIntruso, nuevoCajon };
        });

        res.status(201).json({
            message: 'Queja registrada: se corrigió la ocupación cruzada y se reasignaron ambos accesos',
            cajonAnterior: {
                id: resultado.accesoReclamante.cajon.id,
                identificador: resultado.accesoReclamante.cajon.identificador
            },
            nuevoCajon: {
                id: resultado.nuevoCajon.id,
                identificador: resultado.nuevoCajon.identificador,
                fila: resultado.nuevoCajon.fila,
                columna: resultado.nuevoCajon.columna
            },
            cajonLiberado: {
                id: resultado.accesoIntruso.cajon.id,
                identificador: resultado.accesoIntruso.cajon.identificador
            },
            queja: resultado.queja
        });
    } catch (error) {
        console.error(error);
        const message = error instanceof Error ? error.message : 'Error interno del servidor';
        const status = message.includes('no tiene un acceso') || message.includes('No hay un acceso') ? 404
            : message.includes('Ya existe') ? 409
                : message.includes('No hay un tercer') || message.includes('debe ser diferente') || message.includes('no pertenece') ? 400
                    : 500;
        res.status(status).json({ error: message });
    }
};

// Listar quejas pendientes
export const listarQuejas = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const quejas = await prisma.queja.findMany({
            where: { estado: 'PENDIENTE' },
            include: {
                docente: {
                    select: {
                        id: true,
                        nombre: true,
                        usuario: true
                    }
                },
                cajon: true
            },
            orderBy: { id: 'desc' }
        });

        res.status(200).json({
            total: quejas.length,
            quejas
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

// Resolver queja
export const resolverQueja = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const id = Number(req.params.id);

        if (isNaN(id)) {
            res.status(400).json({ error: 'ID de queja inválido' });
            return;
        }

        const queja = await prisma.queja.findUnique({
            where: { id }
        });

        if (!queja) {
            res.status(404).json({ error: 'La queja no existe' });
            return;
        }

        if (queja.estado === 'RESUELTA') {
            res.status(400).json({ error: 'La queja ya fue resuelta' });
            return;
        }

        const quejaResuelta = await prisma.queja.update({
            where: { id },
            data: { estado: 'RESUELTA' }
        });

        res.status(200).json({
            message: 'Queja resuelta correctamente',
            queja: quejaResuelta
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};