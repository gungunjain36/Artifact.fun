import { type MemeContent, type TrendData } from '../core/types';

// Request Types
export interface CreateMemeRequest {
    prompt: string;
    safeAddress: string;
}

export interface CreateDerivativeMemeRequest {
    prompt: string;
    parentIpId: string;
    licenseTermsId: string;
    safeAddress: string;
}

export interface HandleTrendRequest {
    trend: TrendData;
    safeAddress: string;
}

export interface HandleDerivativeTrendRequest {
    trend: TrendData;
    parentIpId: string;
    licenseTermsId: string;
    safeAddress: string;
}

export interface PayRoyaltiesRequest {
    memeId: string;
    amount: string; // BigInt string
    safeAddress: string;
}

export interface ClaimRoyaltiesRequest {
    memeId: string;
    safeAddress: string;
}

export interface SpendAllowanceRequest {
    amount: string; // BigInt string
    safeAddress: string;
}

// Response Types
export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
}

export interface MemeResponse {
    meme: MemeContent;
    registration: {
        ipId: string;
        txHash: string;
    };
    file: {
        id: string;
        url: string;
    };
    message: string;
}

export interface AllowanceResponse {
    amount: string;
    spent: string;
    resetTime: string;
    lastResetTime: string;
    nonce: string;
}

export interface SpendResponse {
    txHash: string;
}

export interface SafeResponse {
    safeAddress: string;
    message: string;
}

export interface MetadataResponse {
    id: string;
    content: MemeContent;
    createdAt: string;
    updatedAt?: string;
}

// Service Types
export interface VeniceAIConfig {
    apiKey: string;
}

export interface StoryProtocolConfig {
    chainId: string;
    apiKey: string;
}

export interface FileverseConfig {
    pinataJWT: string;
    pinataGateway: string;
}

export interface SocialEngagementConfig {
    twitterApiKey?: string;
    twitterApiSecret?: string;
    twitterAccessToken?: string;
    twitterAccessSecret?: string;
} 