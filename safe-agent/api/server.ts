import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { CoreServices } from '../core/services/index.js';
import { validateEnvironment } from './validate-env.js';

// Import routes
import authRouter from './routes/auth.js';
import memeRouter from './routes/meme.js';
import agentRouter from './routes/agent.js';

// Load environment variables
dotenv.config();

// Validate environment
validateEnvironment();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Initialize services
console.log('Initializing services...');
const coreServices = new CoreServices();

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Error:', err);
    res.status(500).json({
        error: err.message || 'Internal Server Error',
        details: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
});

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

// Mount routes
app.use('/api/auth', authRouter);
app.use('/api/memes', memeRouter);
app.use('/api/agent', agentRouter);

// Make services available to routes
app.locals.services = coreServices;

const PORT = process.env.PORT || 3000;

// Start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log('Ready to accept requests');
}); 