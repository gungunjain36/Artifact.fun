import { Router } from 'express';
import { ethers } from 'ethers';
import { ElizaMemeAgent } from '../../core/eliza-meme-agent';

const router = Router();

// Initialize provider and signer (for hackathon, using a single admin signer)
const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
const adminSigner = new ethers.Wallet(process.env.ADMIN_PRIVATE_KEY!, provider);

// Store agent instances (in production, use a proper service manager)
const agents = new Map<string, ElizaMemeAgent>();

router.post('/initialize', async (req, res, next) => {
    try {
        const { userAddress } = req.body;

        if (!userAddress) {
            res.status(400).json({ error: 'User address is required' });
            return;
        }

        // Get or create agent for this user
        let agent = agents.get(userAddress);
        if (!agent) {
            agent = new ElizaMemeAgent(process.env.ADMIN_PRIVATE_KEY!, process.env.PIMLICO_API_KEY!);
            agents.set(userAddress, agent);
        }

        // Initialize agent
        await agent.initialize();

        res.json({
            success: true,
            message: 'Agent initialized successfully'
        });
    } catch (error: any) {
        next(error);
    }
});

router.post('/message', async (req, res, next) => {
    try {
        const { userAddress, message } = req.body;

        if (!userAddress || !message) {
            res.status(400).json({ error: 'User address and message are required' });
            return;
        }

        // Get agent for this user
        const agent = agents.get(userAddress);
        if (!agent) {
            res.status(404).json({ error: 'No agent found for this user' });
            return;
        }

        // Handle message
        const response = await agent.handleMessage(message);
        res.json({ success: true, response });
    } catch (error: any) {
        next(error);
    }
});

router.post('/stop', async (req, res, next) => {
    try {
        const { userAddress } = req.body;

        if (!userAddress) {
            res.status(400).json({ error: 'User address is required' });
            return;
        }

        // Get agent for this user
        const agent = agents.get(userAddress);
        if (!agent) {
            res.status(404).json({ error: 'No agent found for this user' });
            return;
        }

        // Stop agent
        await agent.stop();
        agents.delete(userAddress);

        res.json({
            success: true,
            message: 'Agent stopped successfully'
        });
    } catch (error: any) {
        next(error);
    }
});

export default router; 