import { getAllowanceModuleDeployment } from '@safe-global/safe-modules-deployments'
import {
  createPublicClient,
  http,
  encodeFunctionData,
  zeroAddress,
  createWalletClient,
} from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import dotenv from 'dotenv'

dotenv.config()

const SAFE_ADDRESS = process.env.SAFE_ADDRESS!
const AGENT_ADDRESS = '0x8880bfd0a9c311A92E1Be07330153721E4402700'
const AGENT_PRIVATE_KEY = process.env.AGENT_PRIVATE_KEY!
const ETH_ADDRESS = '0x0000000000000000000000000000000000000000'
const RPC_URL = process.env.RPC_URL!

if (!SAFE_ADDRESS || !AGENT_PRIVATE_KEY) {
  throw new Error('SAFE_ADDRESS and AGENT_PRIVATE_KEY must be provided')
}

// Ensure private key starts with 0x
if (!AGENT_PRIVATE_KEY.startsWith('0x')) {
  throw new Error('AGENT_PRIVATE_KEY must start with 0x')
}

const spendAllowance = async (amount: bigint) => {
  try {
    console.log('Setting up clients...')
    const publicClient = createPublicClient({ 
      transport: http(RPC_URL)
    })

    // Get allowance module for Sepolia
    const allowanceModule = getAllowanceModuleDeployment({ network: '11155111' })!
    const allowanceModuleAddress = allowanceModule.networkAddresses['11155111']

    // Read allowance module to get current nonce
    console.log('Getting current allowance...')
    const allowance = await publicClient.readContract({
      address: allowanceModuleAddress,
      abi: allowanceModule.abi,
      functionName: 'getTokenAllowance',
      args: [SAFE_ADDRESS, AGENT_ADDRESS, ETH_ADDRESS]
    })

    console.log('Current allowance:', allowance)
    console.log('Attempting to spend:', amount.toString(), 'wei')

    // Generate hash for the transfer
    console.log('Generating transfer hash...')
    const hash = await publicClient.readContract({
      address: allowanceModuleAddress,
      abi: allowanceModule.abi,
      functionName: 'generateTransferHash',
      args: [
        SAFE_ADDRESS,
        ETH_ADDRESS,
        AGENT_ADDRESS,
        amount,
        zeroAddress,
        0n,
        allowance[4] // nonce
      ]
    })

    // Sign the hash with agent's private key
    console.log('Signing transaction...')
    const agentAccount = privateKeyToAccount(AGENT_PRIVATE_KEY as `0x${string}`)
    const signature = await agentAccount.sign({
      hash: hash as unknown as `0x${string}`
    })

    // Simulate and execute the transaction
    console.log('Simulating transaction...')
    const { request } = await publicClient.simulateContract({
      address: allowanceModuleAddress,
      abi: allowanceModule.abi,
      functionName: 'executeAllowanceTransfer',
      args: [
        SAFE_ADDRESS,
        ETH_ADDRESS,
        AGENT_ADDRESS,
        amount,
        zeroAddress,
        0n,
        AGENT_ADDRESS,
        signature
      ],
      account: agentAccount
    })

    console.log('Executing transaction...')
    const walletClient = createWalletClient({ 
      transport: http(RPC_URL),
      account: agentAccount
    })

    const tx = await walletClient.writeContract(request)
    console.log('Transaction executed:', tx)
    return tx
  } catch (error) {
    console.error('Error spending allowance:', error)
    throw error
  }
}

// Example usage: Spend 0.0001 ETH (in Wei)
const amountToSpend = BigInt(100000000000000) // 0.0001 ETH in Wei
spendAllowance(amountToSpend)
  .then(() => console.log('Successfully spent from allowance'))
  .catch((error) => console.error('Failed to spend:', error)) 