import { SafeIntegration } from '../safe-integration';
import { StoryProtocolService } from '../story-protocol';
import { FileverseService } from '../fileverse';
import { MemeAgent } from '../meme-agent';
import { MemeCreationFlow } from '../meme-creation-flow';
import { MemeNFTManager } from '../nft-manager';

export class CoreServices {
    private safeIntegration: SafeIntegration;
    private storyProtocol: StoryProtocolService;
    private fileverse: FileverseService;
    private memeAgent: MemeAgent;

    constructor() {
        this.initialize();
    }

    private async initialize() {
        try {
            console.log('Initializing core services...');

            // Initialize Safe Integration
            this.safeIntegration = new SafeIntegration();
            await this.safeIntegration.initialize();

            // Initialize Fileverse
            this.fileverse = new FileverseService();
            await this.fileverse.initialize();

            // Initialize Meme Agent
            this.memeAgent = new MemeAgent(this.safeIntegration);

            console.log('Core services initialized successfully');
        } catch (error) {
            console.error('Failed to initialize core services:', error);
            throw error;
        }
    }

    // Safe Integration Methods
    async executeSafeTransaction(transaction: any) {
        return await this.safeIntegration.executeTransaction(transaction);
    }

    // Story Protocol Methods
    async createMeme(meme: any) {
        const registration = await this.safeIntegration.createMeme(meme);
        
        // Store metadata in Fileverse
        const metadata = await this.fileverse.storeMemeMetadata(meme);
        
        return {
            registration,
            metadata
        };
    }

    async createDerivativeMeme(meme: any, parentIpId: string, licenseTermsId: string) {
        const registration = await this.safeIntegration.createDerivativeMeme(meme, parentIpId, licenseTermsId);
        
        // Store metadata in Fileverse
        const metadata = await this.fileverse.storeMemeMetadata({
            ...meme,
            metadata: {
                ...meme.metadata,
                parentIpId,
                licenseTermsId
            }
        });
        
        return {
            registration,
            metadata
        };
    }

    async payRoyalties(memeId: string, amount: number) {
        return await this.safeIntegration.payRoyalties(memeId, amount);
    }

    async claimRoyalties(memeId: string) {
        return await this.safeIntegration.claimRoyalties(memeId);
    }

    // Fileverse Methods
    async getMemeMetadata(fileId: string) {
        return await this.fileverse.getMemeMetadata(fileId);
    }

    async updateMemeMetadata(fileId: string, meme: any) {
        return await this.fileverse.updateMemeMetadata(fileId, meme);
    }

    async deleteMemeMetadata(fileId: string) {
        return await this.fileverse.deleteMemeMetadata(fileId);
    }

    // Meme Agent Methods
    async handleTrendingMeme(trend: any) {
        return await this.memeAgent.handleMemeCreation(trend);
    }

    async handleDerivativeTrend(trend: any, parentIpId: string, licenseTermsId: string) {
        return await this.memeAgent.handleDerivativeMeme(trend, parentIpId, licenseTermsId);
    }

    // Service Getters
    getSafeIntegration() {
        return this.safeIntegration;
    }

    getStoryProtocol() {
        return this.storyProtocol;
    }

    getFileverse() {
        return this.fileverse;
    }

    getMemeAgent() {
        return this.memeAgent;
    }
} 