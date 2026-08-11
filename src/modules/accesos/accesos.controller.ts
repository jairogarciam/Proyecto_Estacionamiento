import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import prisma from '../../config/prisma';
import { AuthRequest } from '../../middlewares/auth.middleware';

export const registrarEntrada = async (req: Request, res: Response) => {
  try {
    const { nombreDocente, placaVehiculo } = req.body;

    if (!nombreDocente || !placaVehiculo) {
      return res.status(400).json({ error: 'Faltan datos del QR (nombre o placa).' });
    }

    const docente = await prisma.usuario.findFirst({
      where: { nombre: nombreDocente, rol: 'DOCENTE' }
    });

    if (!docente) {
      return res.status(404).json({ error: 'Docente no encontrado.' });
    }

    const vehiculo = await prisma.vehiculo.findFirst({
      where: { placa: placaVehiculo, docenteId: docente.id }
    });

    if (!vehiculo) {
      return res.status(404).json({ error: 'Vehículo no registrado para este docente.' });
    }

    const accesoActivo = await prisma.acceso.findFirst({
      where: { vehiculoId: vehiculo.id, fechaHoraSalida: null }
    });

    if (accesoActivo) {
      return res.status(400).json({ error: 'El vehículo ya se encuentra dentro del estacionamiento.' });
    }

    const cajonAsignado = await prisma.cajon.findFirst({
      where: { estado: 'LIBRE' },
      orderBy: { distanciaEntrada: 'asc' }
    });

    if (!cajonAsignado) {
      return res.status(409).json({ error: 'No hay cajones disponibles en este momento.' });
    }

    const nuevoAcceso = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const cajonActualizado = await tx.cajon.updateMany({
        where: { id: cajonAsignado.id, estado: 'LIBRE' },
        data: { estado: 'OCUPADO', placaOcupante: vehiculo.placa }
      });

      if (cajonActualizado.count === 0) {
        throw new Error('El cajón seleccionado ya no está disponible.');
      }

      return await tx.acceso.create({
        data: {
          docenteId: docente.id,
          cajonId: cajonAsignado.id,
          vehiculoId: vehiculo.id,
        }
      });
    });

    return res.status(201).json({
      mensaje: 'Entrada registrada exitosamente.',
      cajon_asignado: cajonAsignado.identificador,
      fila: cajonAsignado.fila,
      acceso: nuevoAcceso
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Error interno del servidor.' });
  }
};

export const registrarSalida = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const acceso = await prisma.acceso.findUnique({
      where: { id: Number(id) }
    });

    if (!acceso || acceso.fechaHoraSalida) {
      return res.status(404).json({ error: 'Registro de acceso no encontrado o ya cerrado.' });
    }

    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.acceso.update({
        where: { id: acceso.id },
        data: { fechaHoraSalida: new Date() }
      });

      await tx.cajon.update({
        where: { id: acceso.cajonId },
        data: { estado: 'LIBRE', placaOcupante: null }
      });
    });

    return res.status(200).json({ mensaje: 'Salida registrada y cajón liberado correctamente.' });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Error interno del servidor.' });
  }
};

export const obtenerHistorial = async (req: Request, res: Response) => {
  try {
    const historial = await prisma.acceso.findMany({
      include: {
        docente: { select: { nombre: true } },
        vehiculo: { select: { placa: true, marca: true } },
        cajon: { select: { identificador: true } }
      },
      orderBy: { fechaHoraEntrada: 'desc' }
    });

    return res.status(200).json(historial);
  } catch (error) {
    return res.status(500).json({ error: 'Error al obtener el historial.' });
  }
};

export const obtenerActivos = async (req: Request, res: Response) => {
  try {
    const accesos = await prisma.acceso.findMany({
      where: { fechaHoraSalida: null },
      include: {
        docente: { select: { nombre: true, usuario: true } },
        vehiculo: { select: { placa: true, marca: true, modelo: true } },
        cajon: { select: { identificador: true, fila: true, columna: true, placaOcupante: true } }
      },
      orderBy: { fechaHoraEntrada: 'desc' }
    });

    return res.status(200).json(accesos);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Error al obtener los accesos activos.' });
  }
};

export const obtenerMisAccesos = async (req: AuthRequest, res: Response) => {
  try {
    const accesos = await prisma.acceso.findMany({
      where: { docenteId: req.usuario.id },
      include: {
        vehiculo: { select: { placa: true, marca: true, modelo: true } },
        cajon: { select: { identificador: true, fila: true, columna: true, placaOcupante: true } }
      },
      orderBy: { fechaHoraEntrada: 'desc' }
    });

    return res.status(200).json(accesos);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Error al obtener tus accesos.' });
  }
};