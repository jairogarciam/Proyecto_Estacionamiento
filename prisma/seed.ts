import 'dotenv/config';
import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const usuarios = [
  { nombre: 'Administrador', usuario: 'admin', password: 'Admin123*', rol: 'ADMIN' as const },
  { nombre: 'Guardia de prueba', usuario: 'guardia', password: 'Guardia123*', rol: 'GUARDIA' as const },
  { nombre: 'Docente de prueba', usuario: 'docente', password: 'Docente123*', rol: 'DOCENTE' as const }
];

async function main() {
  const usuariosCreados = new Map<string, number>();

  for (const datos of usuarios) {
    const password = await bcrypt.hash(datos.password, 10);
    const usuario = await prisma.usuario.upsert({
      where: { usuario: datos.usuario },
      update: { nombre: datos.nombre, rol: datos.rol, password },
      create: { ...datos, password }
    });
    usuariosCreados.set(datos.usuario, usuario.id);
  }

  const docenteId = usuariosCreados.get('docente');
  if (!docenteId) throw new Error('No se pudo crear el docente de prueba');

  await prisma.vehiculo.upsert({
    where: { placa: 'ABC-123' },
    update: { docenteId, marca: 'Toyota', modelo: 'Corolla', color: 'Blanco' },
    create: { docenteId, placa: 'ABC-123', marca: 'Toyota', modelo: 'Corolla', color: 'Blanco' }
  });

  const cajones = [
    { identificador: 'A-01', fila: 'A', columna: 1, distanciaEntrada: 1 },
    { identificador: 'A-02', fila: 'A', columna: 2, distanciaEntrada: 2 },
    { identificador: 'B-01', fila: 'B', columna: 1, distanciaEntrada: 3 },
    { identificador: 'B-02', fila: 'B', columna: 2, distanciaEntrada: 4 },
    { identificador: 'C-01', fila: 'C', columna: 1, distanciaEntrada: 5 },
    { identificador: 'C-02', fila: 'C', columna: 2, distanciaEntrada: 6 }
  ];

  for (const cajon of cajones) {
    await prisma.cajon.upsert({
      where: { identificador: cajon.identificador },
      update: cajon,
      create: { ...cajon, estado: 'LIBRE' }
    });
  }

  console.log('Datos de prueba listos: admin, guardia, docente, vehículo y cajones.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
