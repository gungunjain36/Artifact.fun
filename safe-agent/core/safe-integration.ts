import Safe from '@safe-global/protocol-kit';
import { type SafeConfig } from '@safe-global/protocol-kit';
import { ethers } from 'ethers';
import { StoryProtocolService } from './story-protocol';
import { MemeNFTManager } from './nft-manager';
import { MemeCreationFlow } from './meme-creation-flow';
import { OperationType } from '@safe-global/types-kit';
import { type MemeContent } from './story-protocol';

const RPC_URL = 'https://rpc.ankr.com/eth_sepolia';

export class SafeIntegration {
    private safe: Safe | null = null;
    private storyService: StoryProtocolService | null = null;
    private nftManager: MemeNFTManager | null = null;
    private memeFlow: MemeCreationFlow | null = null;

    constructor() {
        this.initialize();
    }

    async initialize() {
        try {
            console.log('Initializing Safe...');
            
            if (!process.env.SIGNER_ADDRESS || !process.env.SIGNER_PRIVATE_KEY || !process.env.SAFE_ADDRESS) {
                throw new Error('SIGNER_ADDRESS, SIGNER_PRIVATE_KEY and SAFE_ADDRESS must be provided');
            }

            // Initialize Safe
            this.safe = await Safe.init({
                provider: process.env.RPC_URL || RPC_URL,
                signer: process.env.SIGNER_PRIVATE_KEY,
                safeAddress: process.env.SAFE_ADDRESS
            });

            // Initialize Story Protocol services
            this.storyService = new StoryProtocolService(this.safe);
            this.nftManager = new MemeNFTManager(this.safe);
            this.memeFlow = new MemeCreationFlow(this.storyService, this.nftManager);

            console.log('Safe initialization completed');
        } catch (error) {
            console.error('Error initializing Safe:', error);
            throw error;
        }
    }

    async executeTransaction(transaction: any) {
        try {
            if (!this.safe) {
                throw new Error('Safe not initialized');
            }

            // Create transaction
            const batchTransaction = await this.safe.createTransaction({
                transactions: [
                    {
                        to: transaction.to,
                        value: transaction.value || '0',
                        data: transaction.data,
                        operation: OperationType.Call
                    }
                ]
            });

            // Execute transaction
            const txResponse = await this.safe.executeTransaction(batchTransaction);
            console.log('Transaction executed:', txResponse);
            
            return txResponse;
        } catch (error) {
            console.error('Failed to execute Safe transaction:', error);
            throw error;
        }
    }

    // Story Protocol Service Methods
    async createMeme(meme: MemeContent) {
        if (!this.memeFlow) {
            throw new Error('MemeFlow not initialized');
        }
        return await this.memeFlow.createMeme(meme);
    }

    async createDerivativeMeme(meme: MemeContent, parentIpId: string, licenseTermsId: string) {
        if (!this.memeFlow) {
            throw new Error('MemeFlow not initialized');
        }
        return await this.memeFlow.createDerivativeMeme(meme, parentIpId, licenseTermsId);
    }

    async payRoyalties(memeId: string, amount: number) {
        if (!this.memeFlow) {
            throw new Error('MemeFlow not initialized');
        }
        return await this.memeFlow.payRoyalties(memeId, amount);
    }

    async claimRoyalties(memeId: string) {
        if (!this.memeFlow) {
            throw new Error('MemeFlow not initialized');
        }
        return await this.memeFlow.claimRoyalties(memeId);
    }

    // Getters for services
    getStoryService() {
        if (!this.storyService) {
            throw new Error('StoryService not initialized');
        }
        return this.storyService;
    }

    getNFTManager() {
        if (!this.nftManager) {
            throw new Error('NFTManager not initialized');
        }
        return this.nftManager;
    }

    getMemeFlow() {
        if (!this.memeFlow) {
            throw new Error('MemeFlow not initialized');
        }
        return this.memeFlow;
    }

    async getSafe() {
        if (!this.safe) {
            throw new Error('Safe not initialized');
        }
        return this.safe;
    }
} 