import { ethers } from 'ethers';
import { StoryProtocolService } from './story-protocol';

export class SafeIntegration {
    private provider: ethers.JsonRpcProvider;
    private signer: ethers.Wallet;
    private storyProtocol!: StoryProtocolService;

    constructor() {
        if (!process.env.RPC_URL || !process.env.ADMIN_PRIVATE_KEY) {
            throw new Error('Required environment variables RPC_URL and ADMIN_PRIVATE_KEY must be set');
        }

        // Initialize provider
        this.provider = new ethers.JsonRpcProvider(process.env.RPC_URL);

        // Ensure private key has 0x prefix
        const privateKey = process.env.ADMIN_PRIVATE_KEY.startsWith('0x') 
            ? process.env.ADMIN_PRIVATE_KEY 
            : `0x${process.env.ADMIN_PRIVATE_KEY}`;

        // Initialize signer
        this.signer = new ethers.Wallet(privateKey, this.provider);
    }

    async initialize() {
        try {
            console.log('Initializing Safe...');

            // Initialize Story Protocol with the same private key
            this.storyProtocol = new StoryProtocolService(this.signer.privateKey);

            return true;
        } catch (error) {
            console.error('Error initializing Safe:', error);
            throw error;
        }
    }

    async executeTransaction(transaction: any) {
        // Implementation for executing transactions
        console.log('Executing transaction:', transaction);
    }

    async getAddress(): Promise<string> {
        return await this.signer.getAddress();
    }

    getSigner() {
        return this.signer;
    }

    getStoryProtocol() {
        if (!this.storyProtocol) {
            throw new Error('StoryProtocol not initialized');
        }
        return this.storyProtocol;
    }
} 