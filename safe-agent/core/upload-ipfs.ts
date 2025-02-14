import { PinataSDK } from 'pinata-web3';

const pinata = new PinataSDK({ pinataJwt: process.env.PINATA_JWT! });

export async function uploadJSONToIPFS(data: any): Promise<string> {
    const response = await pinata.upload.json(data);
    return response.IpfsHash;
}

export async function uploadFileToIPFS(data: Buffer | string): Promise<string> {
    // If it's a base64 string, convert to buffer
    const buffer = typeof data === 'string' ? 
        Buffer.from(data.replace(/^data:image\/\w+;base64,/, ''), 'base64') : 
        data;

    // Create a File-like object that Pinata can handle
    const file = new File([buffer], `image-${Date.now()}.png`, {
        type: 'image/png',
        lastModified: Date.now()
    });

    const response = await pinata.upload.file(file);
    return response.IpfsHash;
} 