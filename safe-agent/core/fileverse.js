import { Agent } from '@fileverse/agents';
import { type MemeContent } from './story-protocol';
import axios from 'axios';

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
            await this.agent.initialize();
            console.log('Fileverse agent initialized');
            return true;
        } catch (error) {
            console.error('Failed to initialize Fileverse:', error);
            throw error;
        }
    }

    async uploadFile(buffer: Buffer | string, mimeType: string): Promise<{ url: string; id: string }> {
        try {
            // If buffer is a base64 string, convert it to Buffer
            const fileBuffer = typeof buffer === 'string' 
                ? Buffer.from(buffer, 'base64')
                : buffer;

            // Upload to Pinata directly for now
            const formData = new FormData();
            formData.append('file', new Blob([fileBuffer], { type: mimeType }));

            const response = await axios.post('https://api.pinata.cloud/pinning/pinFileToIPFS', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    'pinata_api_key': process.env.PINATA_API_KEY!,
                    'pinata_secret_api_key': process.env.PINATA_SECRET_KEY!
                }
            });

            const ipfsHash = response.data.IpfsHash;
            const url = `${process.env.PINATA_GATEWAY}/ipfs/${ipfsHash}`;

            return {
                url,
                id: ipfsHash
            };
        } catch (error) {
            console.error('Failed to upload file:', error);
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

            // Upload metadata to Pinata
            const response = await axios.post('https://api.pinata.cloud/pinning/pinJSONToIPFS', metadata, {
                headers: {
                    'Content-Type': 'application/json',
                    'pinata_api_key': process.env.PINATA_API_KEY!,
                    'pinata_secret_api_key': process.env.PINATA_SECRET_KEY!
                }
            });

            const ipfsHash = response.data.IpfsHash;
            const url = `${process.env.PINATA_GATEWAY}/ipfs/${ipfsHash}`;

            return {
                id: ipfsHash,
                url,
                content: metadata
            };
        } catch (error) {
            console.error('Failed to store meme metadata:', error);
            throw error;
        }
    }

    async getMemeMetadata(fileId: string) {
        try {
            const url = `${process.env.PINATA_GATEWAY}/ipfs/${fileId}`;
            const response = await axios.get(url);
            return {
                id: fileId,
                content: response.data,
                url
            };
        } catch (error) {
            console.error('Failed to get meme metadata:', error);
            throw error;
        }
    }

    async updateMemeMetadata(fileId: string, meme: MemeContent) {
        try {
            // For IPFS, we can't update existing content, so we create new
            return await this.storeMemeMetadata(meme);
        } catch (error) {
            console.error('Failed to update meme metadata:', error);
            throw error;
        }
    }

    async deleteMemeMetadata(fileId: string) {
        try {
            // Note: Content on IPFS cannot be deleted, we can only unpin it
            await axios.delete(`https://api.pinata.cloud/pinning/unpin/${fileId}`, {
                headers: {
                    'pinata_api_key': process.env.PINATA_API_KEY!,
                    'pinata_secret_api_key': process.env.PINATA_SECRET_KEY!
                }
            });
            return { success: true };
        } catch (error) {
            console.error('Failed to delete meme metadata:', error);
            throw error;
        }
    }
}