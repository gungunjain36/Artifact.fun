import { type MemeContent, type TrendData } from '../core/types';

// Request Types
export interface CreateMemeRequest {
    meme: MemeContent;
}

export interface CreateDerivativeMemeRequest {
    meme: MemeContent;
    parentIpId: string;
    licenseTermsId: string;
}

export interface HandleTrendRequest {
    trend: TrendData;
}

export interface HandleDerivativeTrendRequest {
    trend: TrendData;
    parentIpId: string;
    licenseTermsId: string;
}

export interface PayRoyaltiesRequest {
    memeId: string;
    amount: number;
}

export interface ClaimRoyaltiesRequest {
    memeId: string;
}

export interface SpendAllowanceRequest {
    amount: string; // BigInt string
}

// Response Types
export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
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