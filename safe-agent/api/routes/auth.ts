import { Router } from 'express';
import { SafeAccountManager } from '../../core/safe-account-manager';
import { ElizaMemeAgent } from '../../core/eliza-meme-agent';

const router = Router();

// Store user Safe addresses (in production, use a proper database)
const userSafes = new Map<string, string>();

router.post('/create-safe', async (req, res, next) => {
    try {
        const { userAddress } = req.body;

        if (!userAddress) {
            res.status(400).json({ error: 'User address is required' });
            return;
        }

        // Check if user already has a Safe
        if (userSafes.has(userAddress)) {
            res.json({ safeAddress: userSafes.get(userAddress) });
            return;
        }

        // Create new Safe for user
        const safeManager = new SafeAccountManager(process.env.ADMIN_PRIVATE_KEY!, process.env.PIMLICO_API_KEY!);
        await safeManager.setupSafe();
        const safeAddress = await safeManager.getAddress();

        // Store Safe address
        userSafes.set(userAddress, safeAddress);

        // Initialize ElizaMemeAgent for this Safe
        const agent = new ElizaMemeAgent(
            process.env.ADMIN_PRIVATE_KEY!,
            process.env.PIMLICO_API_KEY!
        );

        res.json({
            safeAddress,
            message: 'Safe account created successfully'
        });
    } catch (error: any) {
        next(error);
    }
});

router.get('/user-safe/:userAddress', async (req, res, next) => {
    try {
        const { userAddress } = req.params;
        let safeAddress = userSafes.get(userAddress);

        if (!safeAddress) {
            // Create new Safe for user
            const safeManager = new SafeAccountManager(process.env.ADMIN_PRIVATE_KEY!, process.env.PIMLICO_API_KEY!);
            await safeManager.setupSafe();
            safeAddress = await safeManager.getAddress();

            // Store Safe address
            userSafes.set(userAddress, safeAddress);

            // Initialize ElizaMemeAgent for this Safe
            const agent = new ElizaMemeAgent(
                process.env.ADMIN_PRIVATE_KEY!,
                process.env.PIMLICO_API_KEY!
            );

            res.json({
                safeAddress,
                message: 'New Safe account created successfully'
            });
            return;
        }

        res.json({ safeAddress });
    } catch (error: any) {
        next(error);
    }
});

export default router; 