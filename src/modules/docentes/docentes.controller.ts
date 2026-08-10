import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import prisma from '../../config/prisma';
import { AuthRequest } from '../../middlewares/auth.middleware';

// ==========================================
// RUTAS DE ADMINISTRADOR
// ==========================================

// GET /api/docentes - Listar todos los docentes
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

// POST /api/docentes - Registrar un nuevo docente
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

// ==========================================
// RUTAS DE DOCENTE
// ==========================================

// GET /api/docentes/perfil
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

// POST /api/docentes/vehiculos
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
                docenteId // <-- Adaptado a tu esquema
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

// GET /api/docentes/vehiculos
export const listarVehiculos = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const docenteId = req.usuario.id;

        const vehiculos = await prisma.vehiculo.findMany({ 
            where: { docenteId } // <-- Adaptado a tu esquema
        });
        
        res.json({ vehiculos });
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener los vehículos' });
    }
};

// DELETE /api/docentes/vehiculos/:id
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

        if (vehiculo.docenteId !== docenteIdReq) { // <-- Adaptado a tu esquema
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