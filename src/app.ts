import express, { Application } from 'express';
import cors from 'cors';
import authRoutes from './modules/auth/auth.routes';
import quejasRoutes from './modules/quejas/quejas.routes';

const app: Application = express();

app.use(cors());
app.use(express.json()); // Permite recibir JSON en los req.body de Postman
import authRoutes from './modules/auth/auth.routes';
// Ruta base de prueba
app.get('/', (req, res) => {
    res.json({ message: 'API del Sistema de Estacionamiento funcionando correctamente 🚗' });
});

app.use('/api/auth', authRoutes);

export default app;