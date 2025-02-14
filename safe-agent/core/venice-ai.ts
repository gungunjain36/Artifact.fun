import axios from 'axios';

export interface VeniceAIConfig {
    apiKey: string;
    width?: number;
    height?: number;
    steps?: number;
    stylePreset?: string;
}

export interface MemeStyle {
    name: string;
    preset: string;
    prompt_prefix: string;
    negative_prompt: string;
    chat_prompt: string;
}

const MEME_STYLES: MemeStyle[] = [
    {
        name: "Classic Meme",
        preset: "Photographic", 
        prompt_prefix: "internet meme style, viral meme format, funny and engaging, high quality meme with",
        negative_prompt: "blurry, low quality, distorted, watermark, text overlay, ugly, amateur",
        chat_prompt: "Create a viral-worthy classic meme prompt. The meme should be funny, relatable, and have potential to go viral. Base it on this concept: "
    },
    {
        name: "Dank Meme",
        preset: "Comic Book", 
        prompt_prefix: "dank meme style, surreal and absurd humor, deep fried meme aesthetic with",
        negative_prompt: "boring, conventional, serious, low contrast, blurry",
        chat_prompt: "Create a surreal and absurdist dank meme prompt. Make it weird, unexpected, and following modern meme culture. Base it on this concept: "
    },
    {
        name: "Wholesome",
        preset: "3D Model",
        prompt_prefix: "wholesome meme style, heartwarming and cute, high quality render of",
        negative_prompt: "scary, disturbing, dark, gloomy, sad",
        chat_prompt: "Create a heartwarming and wholesome meme prompt that will make people smile. Keep it positive and uplifting. Base it on this concept: "
    }
];

export class VeniceAIService {
    private apiKey: string;
    private config: Partial<VeniceAIConfig>;

    constructor(config: VeniceAIConfig) {
        this.apiKey = config.apiKey;
        this.config = {
            width: config.width || 1024,
            height: config.height || 1024,
            steps: config.steps || 30,
            stylePreset: config.stylePreset || "Photographic" // Updated to match allowed preset
        };
    }

    private async getEnhancedPrompt(basePrompt: string, style: MemeStyle): Promise<string> {
        try {
            const response = await axios.post(
                'https://api.venice.ai/api/v1/chat/completions',
                {
                    model: "llama-3.1-405b",
                    messages: [
                        {
                            role: "system",
                            content: "You are an expert meme creator who understands internet culture, viral trends, and what makes images engaging and shareable. Your goal is to enhance meme prompts to create visually appealing and viral-worthy content."
                        },
                        {
                            role: "user",
                            content: style.chat_prompt + basePrompt + "\n\nProvide just the enhanced prompt without any explanation or additional text."
                        }
                    ]
                },
                {
                    headers: {
                        Authorization: `Bearer ${this.apiKey}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            const enhancedPrompt = response.data.choices[0].message.content.trim();
            console.log('Enhanced prompt:', enhancedPrompt);
            return enhancedPrompt;
        } catch (error) {
            console.error('Failed to get enhanced prompt:', error);
            // Fallback to original prompt if chat completion fails
            return basePrompt;
        }
    }

    async generateMeme(prompt: string, style: string = "Classic Meme", skipEnhancement: boolean = false): Promise<{ imageUrl: string; base64Data: string }> {
        try {
            const selectedStyle = MEME_STYLES.find(s => s.name === style) || MEME_STYLES[0];
            
            // Only enhance the prompt once and only if not already enhanced
            let finalPrompt;
            if (!skipEnhancement && !prompt.includes(selectedStyle.prompt_prefix)) {
                const enhancedPrompt = await this.getEnhancedPrompt(prompt, selectedStyle);
                finalPrompt = `${selectedStyle.prompt_prefix} ${enhancedPrompt}`;
            } else {
                finalPrompt = prompt;
            }
            
            console.log('Generating meme with prompt:', finalPrompt);

            // Actual image generation
            const response = await axios.post(
                'https://api.venice.ai/api/v1/image/generate',
                {
                    model: "fluently-xl",
                    prompt: finalPrompt,
                    width: this.config.width,
                    height: this.config.height,
                    steps: this.config.steps,
                    hide_watermark: true,
                    return_binary: false,
                    seed: Math.floor(Math.random() * 1000000),
                    cfg_scale: 7.5,
                    style_preset: selectedStyle.preset,
                    negative_prompt: selectedStyle.negative_prompt,
                    safe_mode: false,
                },
                {
                    headers: {
                        Authorization: `Bearer ${this.apiKey}`,
                        'Content-Type': 'application/json',
                        Accept: 'application/json'
                    }
                }
            );

            if (!response.data || response.data.error) {
                console.error('API Error Response:', response.data);
                throw new Error(response.data?.error || 'Failed to generate image');
            }

            const base64Image = response.data.images?.[0];
            if (!base64Image) {
                throw new Error('No image data received from API');
            }

            const imageUrl = `data:image/png;base64,${base64Image}`;

            console.log('Generated image URL:', imageUrl);

            return {
                imageUrl,
                base64Data: base64Image
            };
        } catch (error: any) {
            console.error('Failed to generate meme:', error.response?.data || error);
            if (error.response?.data?.details) {
                console.error('API Error Details:', error.response.data.details);
            }
            throw new Error(`Venice AI Error: ${error.response?.data?.error || error.message}`);
        }
    }

    async generateVariations(prompt: string, count: number = 3): Promise<{ imageUrl: string; base64Data: string }[]> {
        // First, enhance the prompt once for all variations
        const selectedStyle = MEME_STYLES[0];
        const enhancedPrompt = await this.getEnhancedPrompt(prompt, selectedStyle);
        const variations: { imageUrl: string; base64Data: string }[] = [];

        // Generate one variation for each style
        for (let i = 0; i < Math.min(count, MEME_STYLES.length); i++) {
            try {
                const style = MEME_STYLES[i];
                // Use the enhanced prompt with each style's prefix
                const stylePrompt = `${style.prompt_prefix} ${enhancedPrompt}`;
                const result = await this.generateMeme(stylePrompt, style.name, true);
                variations.push(result);
            } catch (error) {
                console.error(`Failed to generate variation for style ${MEME_STYLES[i].name}:`, error);
            }
        }

        return variations;
    }
} 