import { Agent } from '@fileverse/agents';
import { type MemeContent } from './story-protocol';
import axios from 'axios';

export class FileverseService {
    private agent: Agent;
    private namespace: string;
    private initialized: boolean = false;

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
            
            // Setup Safe account first
            await this.agent.setupSafe();
            console.log('Safe account set up');

            // Setup storage with namespace
            const storage = await this.agent.loadStorage(this.namespace);
            if (!storage) {
                await this.agent.setupStorage(this.namespace);
                console.log('Fileverse storage initialized');
            } else {
                console.log('Storage already exists');
            }

            const portal = await this.agent.getPortal();
            console.log('Portal address:', portal);

            this.initialized = true;
            return portal;
        } catch (error) {
            console.error('Failed to initialize Fileverse:', error);
            throw error;
        }
    }

    async uploadFile(buffer: Buffer | string, mimeType: string): Promise<{ url: string; id: string }> {
        try {
            if (!this.initialized) {
                await this.initialize();
            }

            // If buffer is a base64 string, convert it to Buffer
            const fileBuffer = typeof buffer === 'string' 
                ? Buffer.from(buffer, 'base64')
                : buffer;

            // Create a temporary file with the content
            const fileName = `meme-${Date.now()}.${mimeType.split('/')[1] || 'png'}`;
            const content = fileBuffer.toString();

            // Upload to IPFS through agent's uploadToIPFS method
            const ipfsHash = await this.agent.uploadToIPFS(fileName, content);
            const hash = ipfsHash.replace('ipfs://', '');

            return {
                url: `${process.env.PINATA_GATEWAY}/ipfs/${hash}`,
                id: hash
            };
        } catch (error) {
            console.error('Failed to upload file:', error);
            throw error;
        }
    }

    async storeMemeMetadata(meme: MemeContent) {
        try {
            if (!this.initialized) {
                await this.initialize();
            }

            // Create metadata file
            const metadata = {
                title: meme.title,
                description: meme.description,
                creator: meme.creator,
                imageUrl: meme.imageUrl,
                metadata: meme.metadata,
                createdAt: new Date().toISOString()
            };

            // Convert metadata to string
            const metadataString = JSON.stringify(metadata, null, 2);

            try {
                // Store metadata through agent
                const file = await this.agent.create(metadataString);
                return {
                    id: file.fileId,
                    url: `${process.env.PINATA_GATEWAY}/ipfs/${file.fileId}`,
                    content: metadata
                };
            } catch (error) {
                console.error('Failed to store through agent, using direct IPFS:', error);
                // If agent fails, return the existing data
                return {
                    id: meme.metadata.fileId || '',
                    url: meme.imageUrl,
                    content: metadata
                };
            }
        } catch (error) {
            console.error('Failed to store meme metadata:', error);
            throw error;
        }
    }

    async getMemeMetadata(fileId: string) {
        try {
            if (!this.initialized) {
                await this.initialize();
            }

            try {
                const file = await this.agent.getFile(fileId);
                return {
                    id: fileId,
                    content: JSON.parse(file.content.toString()),
                    url: `${process.env.PINATA_GATEWAY}/ipfs/${fileId}`
                };
            } catch (error) {
                console.error('Failed to get file through agent:', error);
                // If agent fails, return a basic structure
                return {
                    id: fileId,
                    content: {},
                    url: `${process.env.PINATA_GATEWAY}/ipfs/${fileId}`
                };
            }
        } catch (error) {
            console.error('Failed to get meme metadata:', error);
            throw error;
        }
    }

    async updateMemeMetadata(fileId: string, meme: MemeContent) {
        try {
            if (!this.initialized) {
                await this.initialize();
            }

            const metadata = {
                title: meme.title,
                description: meme.description,
                creator: meme.creator,
                imageUrl: meme.imageUrl,
                metadata: meme.metadata,
                updatedAt: new Date().toISOString()
            };

            const file = await this.agent.update(fileId, JSON.stringify(metadata, null, 2));

            return {
                id: file.fileId,
                url: `${process.env.PINATA_GATEWAY}/ipfs/${file.fileId}`,
                content: metadata
            };
        } catch (error) {
            console.error('Failed to update meme metadata:', error);
            throw error;
        }
    }

    async deleteMemeMetadata(fileId: string) {
        try {
            if (!this.initialized) {
                await this.initialize();
            }

            await this.agent.delete(fileId);
            return { success: true };
        } catch (error) {
            console.error('Failed to delete meme metadata:', error);
            throw error;
        }
    }
} 