import { Response } from 'express';
import prisma from '../../config/prisma';
import { AuthRequest } from '../../middlewares/auth.middleware';

// Crear queja y reasignar cajón
export const crearQueja = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const docenteId = req.usuario?.id;
        const { descripcion } = req.body;

        if (!docenteId) {
            res.status(401).json({ error: 'Usuario no autenticado' });
            return;
        }

        const accesoActivo = await prisma.acceso.findFirst({
            where: {
                docenteId,
                fechaHoraSalida: null
            },
            include: {
                cajon: true
            },
            orderBy: {
                fechaHoraEntrada: 'desc'
            }
        });

        if (!accesoActivo) {
            res.status(404).json({ error: 'El docente no tiene un acceso activo' });
            return;
        }

        const quejaExistente = await prisma.queja.findFirst({
            where: {
                docenteId,
                cajonId: accesoActivo.cajonId,
                estado: 'PENDIENTE'
            }
        });

        if (quejaExistente) {
            res.status(409).json({ error: 'Ya existe una queja pendiente para este cajón' });
            return;
        }

        const nuevoCajon = await prisma.cajon.findFirst({
            where: {
                estado: 'LIBRE',
                id: { not: accesoActivo.cajonId }
            },
            orderBy: {
                distanciaEntrada: 'asc'
            }
        });

        if (!nuevoCajon) {
            const queja = await prisma.queja.create({
                data: {
                    docenteId,
                    cajonId: accesoActivo.cajonId,
                    descripcion: descripcion || 'El cajón asignado se encuentra ocupado indebidamente',
                    estado: 'PENDIENTE'
                }
            });

            res.status(201).json({
                message: 'Queja registrada, pero no hay cajones disponibles',
                queja
            });
            return;
        }

        const [queja] = await prisma.$transaction([
            prisma.queja.create({
                data: {
                    docenteId,
                    cajonId: accesoActivo.cajonId,
                    descripcion: descripcion || 'El cajón asignado se encuentra ocupado indebidamente',
                    estado: 'PENDIENTE'
                }
            }),
            prisma.cajon.update({
                where: { id: nuevoCajon.id },
                data: { estado: 'OCUPADO' }
            }),
            prisma.acceso.update({
                where: { id: accesoActivo.id },
                data: { cajonId: nuevoCajon.id }
            })
        ]);

        res.status(201).json({
            message: 'Queja registrada y cajón reasignado correctamente',
            cajonAnterior: {
                id: accesoActivo.cajon.id,
                identificador: accesoActivo.cajon.identificador
            },
            nuevoCajon: {
                id: nuevoCajon.id,
                identificador: nuevoCajon.identificador,
                fila: nuevoCajon.fila,
                columna: nuevoCajon.columna
            },
            queja
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error interno del servidor' });
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