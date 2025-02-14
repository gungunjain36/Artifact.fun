import { SafeIntegration } from '../core/safe-integration';
import { VeniceAIService } from '../core/venice-ai';
import { StoryProtocolService } from '../core/story-protocol';
import { MemeCreationFlow } from '../core/meme-creation-flow';
import dotenv from 'dotenv';

dotenv.config();

const VENICE_API_KEY = process.env.VENICE_API_KEY!;
const SPG_NFT_CONTRACT = process.env.SPG_NFT_CONTRACT_ADDRESS!;

async function runMemePlayground() {
    try {
        console.log('🎮 Starting Meme Creation Playground...');

        // Initialize services
        const safeIntegration = new SafeIntegration();
        await safeIntegration.initialize();

        const veniceAI = new VeniceAIService({
            apiKey: VENICE_API_KEY
        });

        const storyService = new StoryProtocolService(await safeIntegration.getSafe());

        // Create meme flow
        const memeFlow = new MemeCreationFlow(
            storyService,
            veniceAI,
            safeIntegration
        );

        // 1. Generate and register a new meme
        console.log('\n🎨 Generating original meme...');
        const originalMeme = await memeFlow.generateAndRegisterMeme({
            prompt: "A funny web3 meme showing a cute blockchain mascot confused by gas fees",
            category: "Crypto Humor",
            tags: ["web3", "blockchain", "gas fees", "cute"]
        });

        console.log('✅ Original meme created:', {
            ipId: originalMeme.registration.ipId,
            imageUrl: originalMeme.imageUrl
        });

        // 2. Create a derivative meme
        console.log('\n🔄 Creating derivative meme...');
        const derivativeMeme = await memeFlow.createDerivativeMeme(
            originalMeme.registration.ipId,
            {
                prompt: "Same cute blockchain mascot but now celebrating low gas fees on Layer 2",
                category: "Crypto Humor",
                tags: ["web3", "layer2", "scaling", "celebration"]
            },
            "1" // Default license terms ID
        );

        console.log('✅ Derivative meme created:', {
            ipId: derivativeMeme.registration.ipId,
            imageUrl: derivativeMeme.imageUrl
        });

        // 3. Claim royalties for original meme
        console.log('\n💰 Claiming royalties...');
        const royalties = await memeFlow.claimRoyalties(originalMeme.registration.ipId);
        console.log('✅ Royalties claimed:', royalties);

        console.log('\n🎮 Playground session completed successfully!');
    } catch (error) {
        console.error('❌ Playground error:', error);
        process.exit(1);
    }
}

// Run the playground
runMemePlayground()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('Fatal error:', error);
        process.exit(1);
    }); 