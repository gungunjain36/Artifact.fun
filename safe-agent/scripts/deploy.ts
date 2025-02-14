import { ethers } from "hardhat";

async function main() {
  // Story Protocol's IPAssetRegistry address on Sepolia
  const STORY_PROTOCOL_REGISTRY = "0xbe39E1C756e921BD25DF86e7AAa31106d1eb0424";

  console.log("Deploying StoryMemeNFT contract...");

  const StoryMemeNFT = await ethers.getContractFactory("StoryMemeNFT");
  const storyMemeNFT = await StoryMemeNFT.deploy(STORY_PROTOCOL_REGISTRY);

  await storyMemeNFT.waitForDeployment();

  console.log("StoryMemeNFT deployed to:", await storyMemeNFT.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}); 