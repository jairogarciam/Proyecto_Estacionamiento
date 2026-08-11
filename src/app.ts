import express, { Application } from 'express';
import cors from 'cors';
import path from 'node:path';
import authRoutes from './modules/auth/auth.routes';
import accesosRoutes from './modules/accesos/accesos.routes';
import cajonesRoutes from './modules/cajones/cajones.routes';
import docentesRoutes from './modules/docentes/docentes.routes';
import quejasRoutes from './modules/quejas/quejas.routes';

const app: Application = express();

app.use(cors());
app.use(express.json()); // Permite recibir JSON en los req.body de Postman
// Ruta base de prueba
app.get('/', (req, res) => {
    res.json({ message: 'API del Sistema de Estacionamiento funcionando correctamente 🚗' });
});

app.use('/panel', express.static(path.join(__dirname, '..', 'frontend')));

app.use('/api/auth', authRoutes);
app.use('/api/accesos', accesosRoutes);
app.use('/api/cajones', cajonesRoutes);
app.use('/api/docentes', docentesRoutes);
app.use('/api/quejas', quejasRoutes);


export default app;