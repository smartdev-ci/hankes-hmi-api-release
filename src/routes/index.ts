import { Router } from 'express';
import authRoutes from './auth';
import etablissementsRoutes from './etablissements';
import diffusionsRoutes from './diffusions';
import dashboardRoutes from './dashboard';
import healthRoutes from './health';
import utilisateursRoutes from './utilisateurs';
import rapportsRoutes from './rapports';
import devicesRoutes from './devices';
import notificationsRoutes from './notifications';
import audioRoutes from './audio';
import uploadRoutes from './upload';
import artistesRoutes from './artistes';

const router = Router();

// Routes publiques
router.use('/auth', authRoutes);
router.use('/health', healthRoutes);
router.use('/artistes', artistesRoutes);

// Routes protégées
router.use('/etablissements', etablissementsRoutes);
router.use('/diffusions', diffusionsRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/utilisateurs', utilisateursRoutes);
router.use('/rapports', rapportsRoutes);
router.use('/devices', devicesRoutes);
router.use('/notifications', notificationsRoutes);
router.use('/audio', audioRoutes);
router.use('/upload', uploadRoutes);

export default router;
