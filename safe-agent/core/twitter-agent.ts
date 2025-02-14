import { Scraper } from 'agent-twitter-client';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

// Add type definitions for Twitter response
interface TwitterResponse {
    data?: {
        id: string;
        errors?: any[];
    };
    errors?: any[];
}

interface MemeAnnouncement {
    title: string;
    description: string;
    creator: string;
    ipId: string;
    txHash: string;
    imageUrl?: string;
}

// Venice AI types
interface VeniceConfig {
    apiKey: string;
}

// Venice AI implementation
class VeniceAI {
    private apiKey: string;

    constructor(config: VeniceConfig) {
        this.apiKey = config.apiKey;
    }

    async generateContent(prompt: string): Promise<string> {
        try {
            const response = await axios.post(
                'https://api.venice.ai/api/v1/chat/completions',
                {
                    model: "llama-3.1-405b",
                    messages: [
                        {
                            role: "system",
                            content: "You are a creative social media manager who writes engaging announcements for web3 projects. Your style is natural, informative, and engaging without being overly promotional."
                        },
                        {
                            role: "user",
                            content: prompt
                        }
                    ],
                    temperature: 0.7,
                    max_tokens: 150
                },
                {
                    headers: {
                        Authorization: `Bearer ${this.apiKey}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            return response.data.choices[0].message.content.trim();
        } catch (error) {
            console.error('Venice AI error:', error);
            throw error;
        }
    }
}

// Initialize Venice AI
const veniceAI = new VeniceAI({
    apiKey: process.env.VENICE_API_KEY!
});

// Helper function to shorten address
function shortenAddress(address: string): string {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

// Generate marketing announcement using Venice AI
async function generateAnnouncement(memeData: MemeAnnouncement): Promise<string> {
    try {
        const prompt = `Write a creative announcement for a new meme registered on Story Protocol.
        Title: "${memeData.title}"
        Description: ${memeData.description}
        Creator: ${shortenAddress(memeData.creator)}

        Make it engaging and natural. Include this link at the end:
        https://aeneid.explorer.story.foundation/ipa/${memeData.ipId}

        Requirements:
        - Keep it under 240 characters
        - Add 1-2 relevant hashtags
        - Don't use forced web3 slang
        - Focus on the creative/artistic aspect`;

        const tweet = await veniceAI.generateContent(prompt);
        return tweet;
    } catch (error) {
        console.error('Error generating announcement:', error);
        // Simple fallback if AI fails
        return `New meme "${memeData.title}" registered on Story Protocol. View: https://aeneid.explorer.story.foundation/ipa/${memeData.ipId}`;
    }
}

// Main function to announce meme registration
export async function announceMemeOnTwitter(memeData: MemeAnnouncement): Promise<boolean> {
    try {
        // Initialize Twitter scraper
        const scraper = new Scraper();
        await scraper.login(
            process.env.TWITTER_USERNAME!,
            process.env.TWITTER_PASSWORD!,
            process.env.TWITTER_EMAIL,
            process.env.TWITTER_2FA_SECRET,
            process.env.TWITTER_API_KEY!,
            process.env.TWITTER_API_SECRET!,
            process.env.TWITTER_ACCESS_TOKEN!,
            process.env.TWITTER_ACCESS_TOKEN_SECRET!
        );

        // Generate and post the tweet
        const tweet = await generateAnnouncement(memeData);
        const response = await scraper.sendTweet(tweet) as TwitterResponse;
        
        if (response.errors || (response.data?.errors)) {
            console.error('Error posting tweet:', response.errors || response.data?.errors);
            return false;
        }

        console.log('Meme announcement posted successfully!');
        return true;
    } catch (error) {
        console.error('Error announcing meme on Twitter:', error);
        return false;
    }
}