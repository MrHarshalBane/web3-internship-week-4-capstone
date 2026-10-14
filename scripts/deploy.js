const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("==========================================");
  console.log("Deploying CertificateRegistry Contract...");
  console.log("==========================================");

  const [deployer] = await hre.ethers.getSigners();
  const network = await hre.ethers.provider.getNetwork();

  console.log(`Network Name:    ${network.name}`);
  console.log(`Chain ID:        ${network.chainId}`);
  console.log(`Deployer / Owner: ${deployer.address}`);

  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log(`Deployer Balance: ${hre.ethers.formatEther(balance)} ETH\n`);

  const CertificateRegistry = await hre.ethers.getContractFactory("CertificateRegistry");
  const registry = await CertificateRegistry.deploy();
  await registry.waitForDeployment();

  const contractAddress = await registry.getAddress();
  console.log(`>>> CertificateRegistry successfully deployed to: ${contractAddress}`);

  // Save deployment information for frontend consumption
  const deploymentData = {
    network: network.name,
    chainId: Number(network.chainId),
    contractAddress: contractAddress,
    deployer: deployer.address,
    deployedAt: new Date().toISOString()
  };

  const frontendConfigDir = path.join(__dirname, "..", "frontend", "src", "contracts");
  if (!fs.existsSync(frontendConfigDir)) {
    fs.mkdirSync(frontendConfigDir, { recursive: true });
  }

  // Copy ABI and contract address
  const artifactPath = path.join(__dirname, "..", "artifacts", "contracts", "CertificateRegistry.sol", "CertificateRegistry.json");
  if (fs.existsSync(artifactPath)) {
    const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
    fs.writeFileSync(
      path.join(frontendConfigDir, "CertificateRegistryAbi.json"),
      JSON.stringify(artifact.abi, null, 2)
    );
  }

  fs.writeFileSync(
    path.join(frontendConfigDir, "contractAddress.json"),
    JSON.stringify(deploymentData, null, 2)
  );

  console.log(`>>> Frontend configuration saved to: frontend/src/contracts/\n`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
