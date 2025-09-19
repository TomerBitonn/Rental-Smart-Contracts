import hre from "hardhat";
import dotenv from "dotenv";

dotenv.config();

async function main() {
  const RentalContract = await hre.ethers.getContractFactory("RentalContract");

  const tenantAddress = process.env.TENANT;
  const rentAmount = process.env.RENT;
  const durationDays = process.env.DURATION;

  const contract = await RentalContract.deploy(tenantAddress, rentAmount, durationDays);

  await contract.waitForDeployment();

  console.log("Contract deployed to:", await contract.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
