import express, { NextFunction, Request, Response } from 'express';
import http from 'http';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { Server } from 'socket.io';

import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import branchRoutes from './routes/branches';
import courseTypeRoutes from './routes/courseTypes';
import seasonRoutes from './routes/seasons';
import closureRoutes from './routes/closures';
import courseRoutes from './routes/courses';
import teacherRoutes from './routes/teachers';
import eventRoutes from './routes/events';
import settingsRoutes from './routes/settings';
import auditLogRoutes from './routes/auditLog';
import pushRoutes from './routes/push';
import leadRoutes from './routes/leads';
import dropoutReasonRoutes from './routes/dropoutReasons';
import studentRoutes from './routes/students';
import reportRoutes from './routes/reports';
import { startAlertScheduler } from './services/alertScheduler';

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: process.env.FRONTEND_URL || 'http://localhost:5173', credentials: true },
});

app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173', credentials: true }));
app.use(express.json());
app.set('io', io);

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/branches', branchRoutes);
app.use('/api/course-types', courseTypeRoutes);
app.use('/api/seasons', seasonRoutes);
app.use('/api/closures', closureRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/teachers', teacherRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/audit-log', auditLogRoutes);
app.use('/api/push', pushRoutes);
app.use('/api/leads', leadRoutes);
app.use('/api/dropout-reasons', dropoutReasonRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/reports', reportRoutes);

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  if (err.name === 'ValidationError' || err.name === 'CastError') {
    res.status(400).json({ message: err.message });
    return;
  }
  res.status(500).json({ message: 'שגיאת שרת' });
});

io.on('connection', (socket) => {
  socket.on('join-branch', (branchId: string) => socket.join(`branch:${branchId}`));
  socket.on('leave-branch', (branchId: string) => socket.leave(`branch:${branchId}`));
});

const PORT = Number(process.env.PORT || 5000);

mongoose
  .connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/betnua')
  .then(() => {
    console.log('MongoDB connected');
    startAlertScheduler();
    server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

export { io };
