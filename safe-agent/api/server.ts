import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { CoreServices } from '../core/services';
import { AgentService } from '../core/services/agent-service';
import { type MemeContent, type TrendData } from '../core/types';
import { validateEnvironment } from './validate-env';

// Load environment variables
dotenv.config();

// Validate environment
validateEnvironment();

const app = express();
app.use(cors());
app.use(express.json());

// Initialize services
console.log('Initializing services...');
const coreServices = new CoreServices();
const agentService = new AgentService();

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

// Meme Routes
app.post('/memes', async (req, res) => {
    try {
        const meme: MemeContent = req.body;
        const result = await coreServices.createMeme(meme);
        res.json(result);
    } catch (error) {
        console.error('Error creating meme:', error);
        res.status(500).json({ error: 'Failed to create meme' });
    }
});

app.post('/memes/derivative', async (req, res) => {
    try {
        const { meme, parentIpId, licenseTermsId } = req.body;
        const result = await coreServices.createDerivativeMeme(meme, parentIpId, licenseTermsId);
        res.json(result);
    } catch (error) {
        console.error('Error creating derivative meme:', error);
        res.status(500).json({ error: 'Failed to create derivative meme' });
    }
});

// Trend Routes
app.post('/trends/meme', async (req, res) => {
    try {
        const trend: TrendData = req.body;
        const result = await coreServices.handleTrendingMeme(trend);
        res.json(result);
    } catch (error) {
        console.error('Error handling trend:', error);
        res.status(500).json({ error: 'Failed to handle trend' });
    }
});

app.post('/trends/derivative', async (req, res) => {
    try {
        const { trend, parentIpId, licenseTermsId } = req.body;
        const result = await coreServices.handleDerivativeTrend(trend, parentIpId, licenseTermsId);
        res.json(result);
    } catch (error) {
        console.error('Error handling derivative trend:', error);
        res.status(500).json({ error: 'Failed to handle derivative trend' });
    }
});

// Royalty Routes
app.post('/royalties/pay', async (req, res) => {
    try {
        const { memeId, amount } = req.body;
        const result = await coreServices.payRoyalties(memeId, amount);
        res.json(result);
    } catch (error) {
        console.error('Error paying royalties:', error);
        res.status(500).json({ error: 'Failed to pay royalties' });
    }
});

app.post('/royalties/claim', async (req, res) => {
    try {
        const { memeId } = req.body;
        const result = await coreServices.claimRoyalties(memeId);
        res.json(result);
    } catch (error) {
        console.error('Error claiming royalties:', error);
        res.status(500).json({ error: 'Failed to claim royalties' });
    }
});

// Agent Routes
app.get('/agent/allowance', async (req, res) => {
    try {
        const allowance = await agentService.getCurrentAllowance();
        res.json(allowance);
    } catch (error) {
        console.error('Error getting allowance:', error);
        res.status(500).json({ error: 'Failed to get allowance' });
    }
});

app.post('/agent/spend', async (req, res) => {
    try {
        const { amount } = req.body;
        const result = await agentService.spendAllowance(BigInt(amount));
        res.json(result);
    } catch (error) {
        console.error('Error spending allowance:', error);
        res.status(500).json({ error: 'Failed to spend allowance' });
    }
});

// Metadata Routes
app.get('/metadata/:fileId', async (req, res) => {
    try {
        const { fileId } = req.params;
        const metadata = await coreServices.getMemeMetadata(fileId);
        res.json(metadata);
    } catch (error) {
        console.error('Error getting metadata:', error);
        res.status(500).json({ error: 'Failed to get metadata' });
    }
});

app.put('/metadata/:fileId', async (req, res) => {
    try {
        const { fileId } = req.params;
        const meme = req.body;
        const result = await coreServices.updateMemeMetadata(fileId, meme);
        res.json(result);
    } catch (error) {
        console.error('Error updating metadata:', error);
        res.status(500).json({ error: 'Failed to update metadata' });
    }
});

app.delete('/metadata/:fileId', async (req, res) => {
    try {
        const { fileId } = req.params;
        const result = await coreServices.deleteMemeMetadata(fileId);
        res.json(result);
    } catch (error) {
        console.error('Error deleting metadata:', error);
        res.status(500).json({ error: 'Failed to delete metadata' });
    }
});

const PORT = process.env.PORT || 3000;

// Start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log('Ready to accept requests');
}); 