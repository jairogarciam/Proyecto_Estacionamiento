import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import prisma from '../../config/prisma';
import { AuthRequest } from '../../middlewares/auth.middleware';

export const listarDocentes = async (req: Request, res: Response): Promise<void> => {
    try {
        const docentes = await prisma.usuario.findMany({
            where: { rol: 'DOCENTE' },
            select: { id: true, nombre: true, usuario: true, qrToken: true }
        });
        res.json(docentes);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener la lista de docentes' });
    }
};

export const registrarDocente = async (req: Request, res: Response): Promise<void> => {
    try {
        const { nombre, usuario } = req.body;

        const existe = await prisma.usuario.findUnique({ where: { usuario } });
        if (existe) {
            res.status(400).json({ error: 'La matrícula/usuario ya está registrada' });
            return;
        }

        const salt = await bcrypt.genSalt(10);
        const passwordEncriptada = await bcrypt.hash(usuario, salt);

        const qrToken = crypto.randomBytes(20).toString('hex');

        const nuevoDocente = await prisma.usuario.create({
            data: {
                nombre,
                usuario,
                password: passwordEncriptada,
                rol: 'DOCENTE',
                qrToken 
            }
        });

        res.status(201).json({ 
            message: 'Docente registrado exitosamente', 
            docenteId: nuevoDocente.id,
            qrTokenGenerado: qrToken 
        });
    } catch (error) {
        res.status(500).json({ error: 'Error al registrar al docente' });
    }
};

export const verPerfil = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const docenteId = req.usuario.id;
        
        const perfil = await prisma.usuario.findUnique({
            where: { id: docenteId },
            select: { id: true, nombre: true, usuario: true, qrToken: true }
        });

        res.json(perfil);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener el perfil' });
    }
};

export const registrarVehiculo = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const docenteId = req.usuario.id;
        const { placa, marca, modelo, color } = req.body;

        const nuevoVehiculo = await prisma.vehiculo.create({
            data: { 
                placa, 
                marca, 
                modelo, 
                color, 
                docenteId
            }
        });

        res.status(201).json({ 
            message: 'Vehículo registrado exitosamente', 
            vehiculo: nuevoVehiculo 
        });
    } catch (error) {
        res.status(500).json({ error: 'Error al registrar el vehículo' });
    }
};

export const listarVehiculos = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const docenteId = req.usuario.id;

        const vehiculos = await prisma.vehiculo.findMany({ 
            where: { docenteId }
        });
        
        res.json({ vehiculos });
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener los vehículos' });
    }
};

export const eliminarVehiculo = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const docenteIdReq = req.usuario.id;
        const vehiculoId = parseInt(req.params.id as string);

        const vehiculo = await prisma.vehiculo.findUnique({ 
            where: { id: vehiculoId } 
        });

        if (!vehiculo) {
            res.status(404).json({ error: 'Vehículo no encontrado' });
            return;
        }

        if (vehiculo.docenteId !== docenteIdReq) {
            res.status(403).json({ error: 'No tienes permiso para eliminar este vehículo' });
            return;
        }

        await prisma.vehiculo.delete({ 
            where: { id: vehiculoId } 
        });

        res.json({ message: 'Vehículo eliminado correctamente' });
    } catch (error) {
        res.status(500).json({ error: 'Error al eliminar el vehículo' });
    }
};

export const listarCatalogoAcceso = async (req: Request, res: Response): Promise<void> => {
    try {
        const docentes = await prisma.usuario.findMany({
            where: { rol: 'DOCENTE' },
            select: {
                id: true,
                nombre: true,
                usuario: true,
                vehiculos: {
                    select: { id: true, placa: true, marca: true, modelo: true, color: true },
                    orderBy: { placa: 'asc' }
                }
            },
            orderBy: { nombre: 'asc' }
        });
        res.json(docentes);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener el catálogo de docentes' });
    }
};

export const actualizarVehiculo = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const docenteId = req.usuario.id;
        const vehiculoId = Number(req.params.id);
        const { placa, marca, modelo, color } = req.body;

        if (!Number.isInteger(vehiculoId) || vehiculoId <= 0 || !placa || !marca || !modelo || !color) {
            res.status(400).json({ error: 'Todos los datos del vehículo son obligatorios' });
            return;
        }

        const vehiculo = await prisma.vehiculo.findFirst({ where: { id: vehiculoId, docenteId } });
        if (!vehiculo) {
            res.status(404).json({ error: 'Vehículo no encontrado o no pertenece al docente' });
            return;
        }

        const placaDuplicada = await prisma.vehiculo.findFirst({ where: { placa, id: { not: vehiculoId } } });
        if (placaDuplicada) {
            res.status(409).json({ error: 'La placa ya está registrada' });
            return;
        }

        const actualizado = await prisma.$transaction(async (tx) => {
            const vehiculoActualizado = await tx.vehiculo.update({
                where: { id: vehiculoId },
                data: { placa, marca, modelo, color }
            });
            await tx.cajon.updateMany({
                where: { placaOcupante: vehiculo.placa },
                data: { placaOcupante: placa }
            });
            return vehiculoActualizado;
        });
        res.json({ message: 'Vehículo actualizado correctamente', vehiculo: actualizado });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al actualizar el vehículo' });
    }
};