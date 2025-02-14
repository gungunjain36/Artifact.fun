import { StoryProtocolService, MemeContent } from './story-protocol';
import { VeniceAIService } from './venice-ai';
import { SafeIntegration } from './safe-integration';
import { uploadJSONToIPFS } from './upload-ipfs';
import { createHash } from 'crypto';

export interface MemeGenerationConfig {
    prompt: string;
    category: string;
    tags: string[];
}

export class MemeCreationFlow {
    private storyService: StoryProtocolService;
    private veniceAI: VeniceAIService;
    private safeIntegration: SafeIntegration;

    constructor(
        storyService: StoryProtocolService,
        veniceAI: VeniceAIService,
        safeIntegration: SafeIntegration
    ) {
        this.storyService = storyService;
        this.veniceAI = veniceAI;
        this.safeIntegration = safeIntegration;
    }

    async generateAndRegisterMeme(config: MemeGenerationConfig) {
        try {
            // 1. Generate meme using Venice AI
            console.log('Generating meme with Venice AI...');
            const { imageUrl, base64Data } = await this.veniceAI.generateMeme(config.prompt);

            // 2. Prepare meme content
            const memeContent: MemeContent = {
                title: `AI Generated: ${config.prompt.slice(0, 50)}...`,
                description: config.prompt,
                creator: await this.safeIntegration.getAgentAddress(),
                imageUrl,
                metadata: {
                    tags: config.tags,
                    category: config.category,
                    aiGenerated: true
                }
            };

            // 3. Register with Story Protocol
            console.log('Registering meme with Story Protocol...');
            const registration = await this.storyService.mintAndRegisterMeme(
                memeContent,
                process.env.SPG_NFT_CONTRACT_ADDRESS!
            );

            // 4. Set up royalties
            if (registration.ipId) {
                await this.storyService.payRoyalty(registration.ipId, 0.001); // Default small royalty
            }

            return {
                memeContent,
                registration,
                imageUrl
            };
        } catch (error) {
            console.error('Failed to generate and register meme:', error);
            throw error;
        }
    }

    async createDerivativeMeme(
        originalMemeId: string,
        config: MemeGenerationConfig,
        licenseTermsId: string
    ) {
        try {
            // 1. Generate new version with Venice AI
            console.log('Generating derivative meme...');
            const { imageUrl, base64Data } = await this.veniceAI.generateMeme(config.prompt);

            // 2. Prepare derivative content
            const derivativeMeme: MemeContent = {
                title: `Derivative: ${config.prompt.slice(0, 50)}...`,
                description: `Derivative work based on ${originalMemeId}. ${config.prompt}`,
                creator: await this.safeIntegration.getAgentAddress(),
                imageUrl,
                metadata: {
                    tags: config.tags,
                    category: config.category,
                    aiGenerated: true
                }
            };

            // 3. Register derivative with Story Protocol
            console.log('Registering derivative meme...');
            const registration = await this.storyService.registerMemeAsDerivative(
                derivativeMeme,
                process.env.SPG_NFT_CONTRACT_ADDRESS!,
                originalMemeId,
                licenseTermsId
            );

            return {
                memeContent: derivativeMeme,
                registration,
                imageUrl
            };
        } catch (error) {
            console.error('Failed to create derivative meme:', error);
            throw error;
        }
    }

    async claimRoyalties(memeId: string) {
        try {
            return await this.storyService.claimRevenue(memeId);
        } catch (error) {
            console.error('Failed to claim royalties:', error);
            throw error;
        }
    }
} 