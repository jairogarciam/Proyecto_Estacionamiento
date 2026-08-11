import { Request, Response } from 'express';
import prisma from '../../config/prisma';
import { AuthRequest } from '../../middlewares/auth.middleware';

// GET /api/cajones - Consultar el estado en tiempo real de todos los cajones
export const listarCajones = async (req: Request, res: Response): Promise<void> => {
    try {
        const cajones = await prisma.cajon.findMany({
            select: {
                id: true,
                identificador: true,
                fila: true,
                columna: true,
                distanciaEntrada: true,
                estado: true,
                placaOcupante: true
            },
            orderBy: { identificador: 'asc' }
        });

        res.json({ cajones });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener los cajones' });
    }
};

// POST /api/cajones - Agregar un nuevo cajón físico (Solo Admin)
export const crearCajon = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { identificador, fila, columna, distanciaEntrada, estado } = req.body;

        // Validaciones básicas
        if (!identificador || !fila || typeof columna !== 'number') {
            res.status(400).json({ error: 'Datos inválidos para crear el cajón' });
            return;
        }

        const existe = await prisma.cajon.findUnique({ where: { identificador } });
        if (existe) {
            res.status(400).json({ error: 'Ya existe un cajón con ese identificador' });
            return;
        }

        const nuevo = await prisma.cajon.create({
            data: {
                identificador,
                fila,
                columna,
                distanciaEntrada: distanciaEntrada ?? 0,
                estado: estado ?? 'LIBRE'
            }
        });

        res.status(201).json({ message: 'Cajón creado', cajon: nuevo });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al crear el cajón' });
    }
};

// PUT /api/cajones/:id/estado - Modificar manualmente el estado de un cajón (Admin o Guardia)
export const actualizarEstado = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const id = parseInt(req.params.id as string, 10);
        const { estado } = req.body;

        const estadosValidos = ['LIBRE', 'OCUPADO', 'MANTENIMIENTO'];
        if (!estadosValidos.includes(estado)) {
            res.status(400).json({ error: 'Estado inválido' });
            return;
        }

        const cajon = await prisma.cajon.findUnique({ where: { id } });
        if (!cajon) {
            res.status(404).json({ error: 'Cajón no encontrado' });
            return;
        }

        const actualizado = await prisma.cajon.update({
            where: { id },
            data: {
                estado,
                placaOcupante: estado === 'LIBRE' ? null : undefined
            }
        });

        res.json({ message: 'Estado actualizado', cajon: actualizado });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al actualizar el estado' });
    }
};

// PUT /api/cajones/:id - Editar la ubicación y distancia de un cajón (Solo Admin)
export const actualizarCajon = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const id = Number(req.params.id);
        const { identificador, fila, columna, distanciaEntrada } = req.body;

        if (!Number.isInteger(id) || id <= 0 || !identificador || !fila || !Number.isInteger(columna) || columna < 1 || !Number.isInteger(distanciaEntrada) || distanciaEntrada < 0) {
            res.status(400).json({ error: 'Identificador, fila, columna y distancia válidos son obligatorios' });
            return;
        }

        const cajon = await prisma.cajon.findUnique({ where: { id } });
        if (!cajon) {
            res.status(404).json({ error: 'Cajón no encontrado' });
            return;
        }

        const duplicado = await prisma.cajon.findFirst({ where: { identificador, id: { not: id } } });
        if (duplicado) {
            res.status(409).json({ error: 'Ya existe otro cajón con ese identificador' });
            return;
        }

        const actualizado = await prisma.cajon.update({
            where: { id },
            data: { identificador, fila, columna, distanciaEntrada }
        });
        res.json({ message: 'Cajón actualizado correctamente', cajon: actualizado });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al actualizar el cajón' });
    }
};

export default {};
