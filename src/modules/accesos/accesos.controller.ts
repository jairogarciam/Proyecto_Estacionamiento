import { Request, Response } from 'express';
import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

export const registrarEntrada = async (req: Request, res: Response) => {
  try {
    // 1. Recibir los datos del QR escaneado
    const { nombreDocente, placaVehiculo } = req.body;

    if (!nombreDocente || !placaVehiculo) {
      return res.status(400).json({ error: 'Faltan datos del QR (nombre o placa).' });
    }

    // 2. Validar que el docente y el vehículo existan
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

    // 3. Verificar si el vehículo ya tiene una entrada activa (sin salida)
    const accesoActivo = await prisma.acceso.findFirst({
      where: { vehiculoId: vehiculo.id, fechaHoraSalida: null }
    });

    if (accesoActivo) {
      return res.status(400).json({ error: 'El vehículo ya se encuentra dentro del estacionamiento.' });
    }

    // 4. ALGORITMO DE CERCANÍA: Buscar el cajón LIBRE más cercano a la entrada
    const cajonAsignado = await prisma.cajon.findFirst({
      where: { estado: 'LIBRE' },
      orderBy: { distanciaEntrada: 'asc' } // Usa el campo camelCase que definiste
    });

    if (!cajonAsignado) {
      return res.status(409).json({ error: 'No hay cajones disponibles en este momento.' });
    }

    // 5. Transacción para asegurar la integridad de datos
    const nuevoAcceso = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Cambiar estado del cajón
      await tx.cajon.update({
        where: { id: cajonAsignado.id },
        data: { estado: 'OCUPADO' }
      });

      // Crear el registro de acceso (fechaHoraEntrada se pone sola por @default(now()))
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
    const { id } = req.params; // ID del acceso a cerrar

    // 1. Buscar el acceso activo
    const acceso = await prisma.acceso.findUnique({
      where: { id: Number(id) }
    });

    if (!acceso || acceso.fechaHoraSalida) {
      return res.status(404).json({ error: 'Registro de acceso no encontrado o ya cerrado.' });
    }

    // 2. Transacción para marcar salida y liberar el cajón
    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.acceso.update({
        where: { id: acceso.id },
        data: { fechaHoraSalida: new Date() }
      });

      await tx.cajon.update({
        where: { id: acceso.cajonId },
        data: { estado: 'LIBRE' }
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