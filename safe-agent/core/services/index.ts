import { SafeIntegration } from '../safe-integration';
import { StoryProtocolService } from '../story-protocol';
import { FileverseService } from '../fileverse';
import { MemeAgent } from '../meme-agent';
import { VeniceAIService } from '../venice-ai';
import { SocialEngagementService } from '../social-engagement';
import { AgentService } from './agent-service';
import { type MemeContent, type TrendData } from '../types';
import { ethers } from 'ethers';

export class CoreServices {
    private safeIntegration!: SafeIntegration;
    private storyProtocol!: StoryProtocolService;
    private fileverse!: FileverseService;
    private memeAgent!: MemeAgent;
    private veniceAI!: VeniceAIService;
    private socialEngagement!: SocialEngagementService;
    private agentService!: AgentService;
    private provider!: ethers.JsonRpcProvider;

    constructor() {
        this.initialize().catch(error => {
            console.error('Failed to initialize core services:', error);
            throw error;
        });
    }

    private async initialize() {
        try {
            console.log('Initializing core services...');

            // Initialize provider
            this.provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
            const signer = new ethers.Wallet(process.env.ADMIN_PRIVATE_KEY!, this.provider);

            // Initialize Safe Integration
            this.safeIntegration = new SafeIntegration();
            await this.safeIntegration.initialize();

            // Initialize Fileverse
            this.fileverse = new FileverseService();
            await this.fileverse.initialize();

            // Initialize Venice AI
            this.veniceAI = new VeniceAIService({
                apiKey: process.env.VENICE_API_KEY!
            });

            // Initialize Story Protocol
            this.storyProtocol = new StoryProtocolService(process.env.ADMIN_PRIVATE_KEY!);

            // Initialize Social Engagement (simplified version)
            this.socialEngagement = new SocialEngagementService(
                process.env.ADMIN_PRIVATE_KEY!,
                process.env.PIMLICO_API_KEY!
            );

            // Initialize Agent Service
            this.agentService = new AgentService();

            // Initialize Meme Agent
            this.memeAgent = new MemeAgent(
                this.provider,
                signer
            );

            console.log('Core services initialized successfully');
        } catch (error) {
            console.error('Failed to initialize core services:', error);
            throw error;
        }
    }

    // Meme Creation Methods
    async createMeme(prompt: string, safeAddress: string) {
        try {
            // Generate meme using Venice AI
            const { imageUrl } = await this.veniceAI.generateMeme(prompt);

            // Prepare meme content
            const meme: MemeContent = {
                title: prompt,
                description: `AI-generated meme: ${prompt}`,
                creator: safeAddress,
                imageUrl,
                metadata: {
                    tags: ['ai-generated', 'web3'],
                    category: 'AI Generated',
                    aiGenerated: true
                }
            };

            // Register with Story Protocol
            const registration = await this.storyProtocol.mintAndRegisterMeme(meme);
            
            // Store metadata in Fileverse
            const file = await this.fileverse.storeMemeMetadata(meme);

            // Promote on social media if registration successful
            if (registration.ipId && imageUrl) {
                await this.socialEngagement.promoteMemeOnTwitter(
                    registration.ipId,
                    imageUrl,
                    prompt
                );
            }

            return {
                registration,
                file,
                meme
            };
        } catch (error) {
            console.error('Failed to create meme:', error);
            throw error;
        }
    }

    async createDerivativeMeme(meme: MemeContent, parentIpId: string, licenseTermsId: string) {
        const registration = await this.storyProtocol.registerMemeAsDerivative(
            meme,
            process.env.SPG_NFT_CONTRACT_ADDRESS!,
            parentIpId,
            licenseTermsId
        );
        
        // Store metadata in Fileverse with derivative info in a separate field
        const metadataWithDerivative = {
            ...meme,
            metadata: {
                ...meme.metadata,
                derivativeInfo: {
                    parentIpId,
                    licenseTermsId
                }
            }
        };
        
        const metadata = await this.fileverse.storeMemeMetadata(metadataWithDerivative);
        
        return {
            registration,
            metadata
        };
    }

    // Trend Handling Methods
    async handleTrendingMeme(trend: TrendData) {
        return await this.memeAgent.handleMemeCreation(trend);
    }

    async handleDerivativeTrend(trend: TrendData, parentIpId: string, licenseTermsId: string) {
        return await this.memeAgent.handleDerivativeMeme(trend, parentIpId, licenseTermsId);
    }

    // Royalty Methods
    async payRoyalties(memeId: string, amount: number) {
        return await this.storyProtocol.payRoyalty(memeId, amount);
    }

    async claimRoyalties(memeId: string) {
        return await this.storyProtocol.claimRevenue(memeId);
    }

    // Metadata Methods
    async getMemeMetadata(fileId: string) {
        return await this.fileverse.getMemeMetadata(fileId);
    }

    async updateMemeMetadata(fileId: string, meme: MemeContent) {
        return await this.fileverse.updateMemeMetadata(fileId, meme);
    }

    async deleteMemeMetadata(fileId: string) {
        return await this.fileverse.deleteMemeMetadata(fileId);
    }

    // Agent Methods
    async getCurrentAllowance() {
        return await this.agentService.getCurrentAllowance();
    }

    async spendAllowance(amount: bigint) {
        return await this.agentService.spendAllowance(amount);
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

    getVeniceAI() {
        return this.veniceAI;
    }

    getSocialEngagement() {
        return this.socialEngagement;
    }

    getAgentService() {
        return this.agentService;
    }
} 