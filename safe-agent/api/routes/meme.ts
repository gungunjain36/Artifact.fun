import { Router, Request, Response, NextFunction } from 'express';
import { VeniceAIService } from '../../core/venice-ai';
import { StoryProtocolService } from '../../core/story-protocol';
import { FileverseService } from '../../core/fileverse';
import { SocialEngagementService } from '../../core/social-engagement';
import { type MemeContent } from '../../core/types';
import { ethers } from 'ethers';
// Import ABI from frontend
const ArtixMemeContestABI = require('../../../frontend/src/abi/ArtixMemeContest.json');

interface CreateMemeRequest {
    prompt: string;
    safeAddress: string;
    style?: string;
    generateVariations?: boolean;
}

interface SubmitMemeRequest {
    userAddress: string;
    title: string;
    description: string;
    socialLinks: string;
    networkId: string;
    fileId: string;
    registerIP?: boolean;
    metadata?: {
        tags?: string[];
        category?: string;
        aiGenerated?: boolean;
        style?: string;
        prompt?: string;
    };
}

const router = Router();

// Initialize services after environment variables are loaded
let veniceAI: VeniceAIService;
let storyProtocol: StoryProtocolService;
let fileverse: FileverseService;
let socialEngagement: SocialEngagementService;

const initializeServices = () => {
    if (!process.env.ADMIN_PRIVATE_KEY || !process.env.VENICE_API_KEY || !process.env.PIMLICO_API_KEY) {
        throw new Error('Required environment variables are not set');
    }

    // Ensure private key has 0x prefix
    const privateKey = process.env.ADMIN_PRIVATE_KEY.startsWith('0x') 
        ? process.env.ADMIN_PRIVATE_KEY 
        : `0x${process.env.ADMIN_PRIVATE_KEY}`;

    veniceAI = new VeniceAIService({
        apiKey: process.env.VENICE_API_KEY
    });

    storyProtocol = new StoryProtocolService(privateKey);
    fileverse = new FileverseService();
    socialEngagement = new SocialEngagementService(
        privateKey,
        process.env.PIMLICO_API_KEY
    );
};

// Create meme
router.post('/', async (req: Request<{}, any, CreateMemeRequest>, res: Response) => {
    try {
        // Initialize services if not already initialized
        if (!veniceAI) {
            initializeServices();
        }

        const { prompt, style, generateVariations = false } = req.body;

        if (!prompt) {
            return res.status(400).json({ 
                success: false,
                error: 'Missing required parameters' 
            });
        }

        try {
            // Step 1: Generate main meme
            console.log('Generating meme with prompt:', prompt);
            const { imageUrl, base64Data } = await veniceAI.generateMeme(prompt, style);

            // Step 2: Store image in IPFS
            console.log('Storing image in IPFS...');
            const imageFile = await fileverse.uploadFile(base64Data, 'image/png');
            console.log('Image stored:', imageFile);

            // Step 3: Return response with both URL and base64 data
            res.json({
                success: true,
                data: {
                    meme: {
                        imageUrl: imageFile.url,
                        imageData: `data:image/png;base64,${base64Data}`,
                        id: imageFile.id,
                        title: prompt,
                        description: `AI-generated meme: ${prompt}`,
                        metadata: {
                            prompt,
                            style,
                            aiGenerated: true
                        }
                    }
                }
            });
        } catch (error: any) {
            console.error('Error in meme generation:', error);
            return res.status(500).json({
                success: false,
                error: 'Failed to generate meme',
                details: error.message
            });
        }
    } catch (error: any) {
        console.error('Server error:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error',
            details: error.message
        });
    }
});

// Helper function to serialize BigInt values
function serializeBigInts(obj: any): any {
    if (obj === null || obj === undefined) {
        return obj;
    }
    if (typeof obj === 'bigint') {
        return obj.toString();
    }
    if (Array.isArray(obj)) {
        return obj.map(serializeBigInts);
    }
    if (typeof obj === 'object') {
        const result: any = {};
        for (const [key, value] of Object.entries(obj)) {
            result[key] = serializeBigInts(value);
        }
        return result;
    }
    return obj;
}

// Submit meme to blockchain and Story Protocol
router.post('/submit', async (req: Request<{}, any, SubmitMemeRequest>, res: Response, next: NextFunction) => {
    try {
        const { 
            userAddress, 
            title, 
            description, 
            socialLinks, 
            networkId, 
            fileId,
            registerIP, 
            metadata 
        } = req.body;

        if (!fileverse) {
            initializeServices();
        }

        try {
            // Get the file URL directly from IPFS gateway
            const ipfsUrl = `${process.env.PINATA_GATEWAY}/ipfs/${fileId}`;
            
            // Create meme content without fetching from Fileverse
            const meme: MemeContent = {
                title,
                description,
                creator: userAddress,
                imageUrl: ipfsUrl,
                metadata: {
                    tags: metadata?.tags || [],
                    category: metadata?.category || 'User Generated',
                    aiGenerated: metadata?.aiGenerated || false
                }
            };

            // Only register with Story Protocol if explicitly requested
            let registration;
            if (registerIP) {
                registration = await storyProtocol.mintAndRegisterMeme(meme);
            }

            // Store final metadata in IPFS
            const fileMetadata = await fileverse.storeMemeMetadata(meme);

            // Serialize the response to handle BigInt values
            const response = {
                success: true,
                meme: {
                    ...meme,
                    registration,
                    file: {
                        id: fileId,
                        url: ipfsUrl
                    }
                }
            };

            res.json(serializeBigInts(response));
        } catch (error: any) {
            console.error('Error processing meme:', error);
            throw new Error(`Failed to process meme: ${error.message}`);
        }
    } catch (error: any) {
        console.error('Error submitting meme:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to submit meme',
            details: error.message
        });
    }
});

// Get meme metadata
router.get('/:fileId', async (req: Request<{ fileId: string }>, res: Response, next: NextFunction) => {
    try {
        if (!fileverse) {
            initializeServices();
        }

        const { fileId } = req.params;
        const metadata = await fileverse.getMemeMetadata(fileId);
        res.json({
            success: true,
            metadata
        });
    } catch (error: any) {
        next(error);
    }
});

// Update meme metadata
router.put('/:fileId', async (req, res, next) => {
    try {
        // Initialize services if not already initialized
        if (!fileverse) {
            initializeServices();
        }

        const { fileId } = req.params;
        const meme: MemeContent = req.body;
        const result = await fileverse.updateMemeMetadata(fileId, meme);
        res.json(result);
    } catch (error: any) {
        next(error);
    }
});

// Delete meme metadata
router.delete('/:fileId', async (req, res, next) => {
    try {
        // Initialize services if not already initialized
        if (!fileverse) {
            initializeServices();
        }

        const { fileId } = req.params;
        const result = await fileverse.deleteMemeMetadata(fileId);
        res.json(result);
    } catch (error: any) {
        next(error);
    }
});

// Register meme with Story Protocol
router.post('/register', async (req: Request, res: Response) => {
    try {
        if (!storyProtocol) {
            initializeServices();
        }

        const { memeId, title, description, creator, imageUrl, metadata } = req.body;

        // Create meme content
        const memeContent: MemeContent = {
            title,
            description,
            creator,
            imageUrl,
            metadata: {
                tags: metadata?.tags || [],
                category: metadata?.category || 'Community Meme',
                aiGenerated: metadata?.aiGenerated || false
            }
        };

        // Register with Story Protocol
        const registration = await storyProtocol.mintAndRegisterMeme(memeContent);

        res.json({
            success: true,
            data: {
                ipId: registration.ipId,
                txHash: registration.txHash
            }
        });
    } catch (error: any) {
        console.error('Error registering meme with Story Protocol:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to register meme',
            details: error.message
        });
    }
});

// Mint NFT for a meme
router.post('/:memeId/mint-nft', async (req: Request, res: Response) => {
    try {
        if (!storyProtocol) {
            initializeServices();
        }

        const { memeId } = req.params;
        const { ipId } = req.body;

        // Log the registration details
        console.log('Meme registered with Story Protocol:', {
            memeId,
            ipId
        });

        // Return success response with registration details
        res.json({
            success: true,
            data: {
                memeId,
                ipId,
                message: 'Meme successfully registered with Story Protocol'
            }
        });
    } catch (error: any) {
        console.error('Error in Story Protocol registration:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to register meme',
            details: error.message
        });
    }
});

export default router; 