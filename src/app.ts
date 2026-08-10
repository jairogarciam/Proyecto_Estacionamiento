import express, { Application } from 'express';
import cors from 'cors';

const app: Application = express();

// Middlewares
app.use(cors());
app.use(express.json()); // Permite recibir JSON en los req.body de Postman
import authRoutes from './modules/auth/auth.routes';
// Ruta base de prueba
app.get('/', (req, res) => {
    res.json({ message: 'API del Sistema de Estacionamiento funcionando correctamente 🚗' });
});

// Aquí iremos importando y conectando nuestras rutas (auth, docentes, cajones, etc.)
app.use('/api/auth', authRoutes);

export default app;