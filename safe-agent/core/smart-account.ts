import Safe from '@safe-global/protocol-kit'
import { getAllowanceModuleDeployment } from '@safe-global/safe-modules-deployments'
import { OperationType } from '@safe-global/types-kit'
import { encodeFunctionData } from 'viem'
import dotenv from 'dotenv'

dotenv.config()

const SIGNER_ADDRESS = process.env.SIGNER_ADDRESS
const SIGNER_PRIVATE_KEY = process.env.SIGNER_PRIVATE_KEY
const SAFE_ADDRESS = process.env.SAFE_ADDRESS
const RPC_URL = process.env.RPC_URL!
const AGENT_ADDRESS = '0x8880bfd0a9c311A92E1Be07330153721E4402700'
const ETH_ADDRESS = '0x0000000000000000000000000000000000000000' // ETH token address
const DAILY_LIMIT = 0.001 // 0.001 ETH daily limit as specified

if (!SIGNER_ADDRESS || !SIGNER_PRIVATE_KEY || !SAFE_ADDRESS) {
  throw new Error('SIGNER_ADDRESS, SIGNER_PRIVATE_KEY and SAFE_ADDRESS must be provided')
}

const setupAllowanceForAgent = async () => {
  try {
    console.log('Initializing Safe...')
    // Initialize existing Safe
    const safeClient = await Safe.init({
      provider: RPC_URL,
      signer: SIGNER_PRIVATE_KEY,
      safeAddress: SAFE_ADDRESS
    })

    // Get allowance module for Sepolia
    console.log('Getting allowance module...')
    const allowanceModule = getAllowanceModuleDeployment({ network: '11155111' })!
    const allowanceModuleAddress = allowanceModule.networkAddresses['11155111']

    // Add delegate (AI agent) and set allowance
    console.log('Setting up delegate and allowance...')
    const addDelegateData = encodeFunctionData({
      abi: allowanceModule.abi,
      functionName: 'addDelegate',
      args: [AGENT_ADDRESS]
    })

    const setAllowanceData = encodeFunctionData({
      abi: allowanceModule.abi,
      functionName: 'setAllowance',
      args: [
        AGENT_ADDRESS, // delegate
        ETH_ADDRESS, // ETH token
        BigInt(DAILY_LIMIT * 1e18), // Convert to Wei
        1440, // Reset time in minutes (24 hours)
        0 // reset base
      ]
    })

    // Create and execute the batch transaction
    console.log('Executing batch transaction...')
    const batchTransaction = await safeClient.createTransaction({
      transactions: [
        {
          to: allowanceModuleAddress,
          value: '0',
          data: addDelegateData,
          operation: OperationType.Call
        },
        {
          to: allowanceModuleAddress,
          value: '0',
          data: setAllowanceData,
          operation: OperationType.Call
        }
      ]
    })

    const txResponse = await safeClient.executeTransaction(batchTransaction)
    console.log('Batch transaction executed:', txResponse)
    
    return safeClient
  } catch (error) {
    console.error('Error setting up allowance:', error)
    throw error
  }
}

// Execute the setup
setupAllowanceForAgent()
  .then(() => console.log('Setup completed successfully'))
  .catch((error) => console.error('Setup failed:', error))