import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import prisma from '../../config/prisma';

// Función para registrar usuarios
export const registrar = async (req: Request, res: Response): Promise<void> => {
    try {
        // Recibimos 'usuario' en lugar de 'correo'
        const { nombre, usuario, password, rol } = req.body;

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
        // Recibimos 'usuario' en lugar de 'correo'
        const { usuario, password } = req.body;

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