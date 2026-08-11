import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import prisma from '../../config/prisma';
import { AuthRequest } from '../../middlewares/auth.middleware';

const rolesValidos = ['ADMIN', 'GUARDIA', 'DOCENTE'] as const;

// Función para registrar usuarios
export const registrar = async (req: Request, res: Response): Promise<void> => {
    try {
        const { nombre, usuario, password, rol } = req.body;

        if (!nombre || !usuario || !password || !rol || !rolesValidos.includes(rol)) {
            res.status(400).json({ error: 'Nombre, usuario, contraseña y un rol válido son obligatorios' });
            return;
        }

        // 1. Verificar si el nombre de usuario ya existe
        const usuarioExistente = await prisma.usuario.findUnique({ where: { usuario } });
        if (usuarioExistente) {
            res.status(400).json({ error: 'El nombre de usuario ya está en uso' });
            return;
        }

        // 2. Encriptar la contraseña
        const salt = await bcrypt.genSalt(10);
        const passwordEncriptada = await bcrypt.hash(password, salt);

        // 3. Guardar el usuario en la BD
        const nuevoUsuario = await prisma.usuario.create({
            data: {
                nombre,
                usuario, // Guardamos el nuevo campo
                password: passwordEncriptada,
                rol
            }
        });

        res.status(201).json({ message: 'Usuario creado exitosamente', usuarioId: nuevoUsuario.id });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

// Función para iniciar sesión
export const login = async (req: Request, res: Response): Promise<void> => {
    try {
        const { usuario, password } = req.body;

        if (!usuario || !password) {
            res.status(400).json({ error: 'Usuario y contraseña son obligatorios' });
            return;
        }

        // 1. Buscar al usuario en la base de datos
        const usuarioEncontrado = await prisma.usuario.findUnique({ where: { usuario } });
        if (!usuarioEncontrado) {
            res.status(401).json({ error: 'Credenciales inválidas' });
            return;
        }

        // 2. Comparar contraseñas
        const passwordValida = await bcrypt.compare(password, usuarioEncontrado.password);
        if (!passwordValida) {
            res.status(401).json({ error: 'Credenciales inválidas' });
            return;
        }

        // 3. Generar el Token JWT
        const secret = process.env.JWT_SECRET || 'firma_secreta_por_defecto';
        const token = jwt.sign(
            { id: usuarioEncontrado.id, rol: usuarioEncontrado.rol }, 
            secret, 
            { expiresIn: '8h' }
        );

        res.status(200).json({
            message: 'Inicio de sesión exitoso',
            token,
            usuario: {
                id: usuarioEncontrado.id,
                nombre: usuarioEncontrado.nombre,
                usuario: usuarioEncontrado.usuario,
                rol: usuarioEncontrado.rol
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

export const listarUsuarios = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const usuarios = await prisma.usuario.findMany({
            select: { id: true, nombre: true, usuario: true, rol: true, qrToken: true },
            orderBy: [{ rol: 'asc' }, { nombre: 'asc' }]
        });
        res.json(usuarios);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener los usuarios' });
    }
};

export const actualizarUsuario = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const id = Number(req.params.id);
        const { nombre, usuario, password, rol } = req.body;

        if (!Number.isInteger(id) || id <= 0 || !nombre || !usuario || !rol || !rolesValidos.includes(rol)) {
            res.status(400).json({ error: 'Datos inválidos para actualizar el usuario' });
            return;
        }
        if (id === req.usuario?.id && rol !== 'ADMIN') {
            res.status(400).json({ error: 'No puedes quitarte el rol ADMIN durante tu sesión actual' });
            return;
        }

        const existente = await prisma.usuario.findUnique({ where: { id } });
        if (!existente) {
            res.status(404).json({ error: 'Usuario no encontrado' });
            return;
        }

        const usuarioDuplicado = await prisma.usuario.findFirst({ where: { usuario, id: { not: id } } });
        if (usuarioDuplicado) {
            res.status(409).json({ error: 'El nombre de usuario ya está en uso' });
            return;
        }

        const datos: { nombre: string; usuario: string; rol: typeof rolesValidos[number]; password?: string } = { nombre, usuario, rol };
        if (password) datos.password = await bcrypt.hash(password, 10);

        const actualizado = await prisma.usuario.update({
            where: { id },
            data: datos,
            select: { id: true, nombre: true, usuario: true, rol: true, qrToken: true }
        });
        res.json({ message: 'Usuario actualizado correctamente', usuario: actualizado });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al actualizar el usuario' });
    }
};

export const eliminarUsuario = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const id = Number(req.params.id);
        if (!Number.isInteger(id) || id <= 0) {
            res.status(400).json({ error: 'ID de usuario inválido' });
            return;
        }
        if (id === req.usuario?.id) {
            res.status(400).json({ error: 'No puedes eliminar tu propia cuenta' });
            return;
        }

        const usuario = await prisma.usuario.findUnique({
            where: { id },
            select: { id: true, accesos: { select: { id: true }, take: 1 }, quejas: { select: { id: true }, take: 1 } }
        });
        if (!usuario) {
            res.status(404).json({ error: 'Usuario no encontrado' });
            return;
        }
        if (usuario.accesos.length || usuario.quejas.length) {
            res.status(409).json({ error: 'No se puede eliminar: el usuario tiene historial de accesos o quejas' });
            return;
        }

        await prisma.usuario.delete({ where: { id } });
        res.json({ message: 'Usuario eliminado correctamente' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al eliminar el usuario' });
    }
};