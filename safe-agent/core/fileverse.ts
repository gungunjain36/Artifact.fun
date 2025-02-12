import { Agent } from '@fileverse/agents';
import { type MemeContent } from './story-protocol';

export class FileverseService {
    private agent: Agent;
    private namespace: string;

    constructor() {
        // Validate required environment variables
        if (!process.env.CHAIN || !process.env.PRIVATE_KEY || !process.env.PINATA_JWT || 
            !process.env.PINATA_GATEWAY || !process.env.PIMLICO_API_KEY) {
            throw new Error('Missing required environment variables for Fileverse');
        }

        // Initialize Fileverse agent
        this.agent = new Agent({ 
            chain: process.env.CHAIN,
            privateKey: process.env.PRIVATE_KEY,
            pinataJWT: process.env.PINATA_JWT,
            pinataGateway: process.env.PINATA_GATEWAY,
            pimlicoAPIKey: process.env.PIMLICO_API_KEY
        });

        this.namespace = 'artifact-fun';
    }

    async initialize() {
        try {
            console.log('Initializing Fileverse storage...');
            
            // Setup storage with namespace
            await this.agent.setupStorage(this.namespace);
            console.log('Fileverse storage initialized');

            const portal = await this.agent.getPortal();
            console.log('Portal address:', portal);

            return portal;
        } catch (error) {
            console.error('Failed to initialize Fileverse:', error);
            throw error;
        }
    }

    async storeMemeMetadata(meme: MemeContent) {
        try {
            // Create metadata file
            const metadata = {
                title: meme.title,
                description: meme.description,
                creator: meme.creator,
                imageUrl: meme.imageUrl,
                metadata: meme.metadata,
                createdAt: new Date().toISOString()
            };

            // Store metadata in Fileverse
            const file = await this.agent.create(JSON.stringify(metadata, null, 2));
            console.log('Meme metadata stored:', file);

            return file;
        } catch (error) {
            console.error('Failed to store meme metadata:', error);
            throw error;
        }
    }

    async getMemeMetadata(fileId: string) {
        try {
            const file = await this.agent.getFile(fileId);
            console.log('Retrieved meme metadata:', file);
            return file;
        } catch (error) {
            console.error('Failed to get meme metadata:', error);
            throw error;
        }
    }

    async updateMemeMetadata(fileId: string, meme: MemeContent) {
        try {
            // Update metadata
            const metadata = {
                title: meme.title,
                description: meme.description,
                creator: meme.creator,
                imageUrl: meme.imageUrl,
                metadata: meme.metadata,
                updatedAt: new Date().toISOString()
            };

            // Update file in Fileverse
            const file = await this.agent.update(fileId, JSON.stringify(metadata, null, 2));
            console.log('Meme metadata updated:', file);

            return file;
        } catch (error) {
            console.error('Failed to update meme metadata:', error);
            throw error;
        }
    }

    async deleteMemeMetadata(fileId: string) {
        try {
            const file = await this.agent.delete(fileId);
            console.log('Meme metadata deleted:', file);
            return file;
        } catch (error) {
            console.error('Failed to delete meme metadata:', error);
            throw error;
        }
    }

    async getBlockNumber() {
        try {
            return await this.agent.getBlockNumber();
        } catch (error) {
            console.error('Failed to get block number:', error);
            throw error;
        }
    }
}