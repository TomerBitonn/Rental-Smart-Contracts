import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";
dotenv.config();

const normalizePk = (pk) => {
  if (!pk) return undefined;
  return pk.startsWith("0x") ? pk : `0x${pk}`;
};

export default {
  solidity: {
    version: "0.8.28",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL,
      accounts: process.env.SEPOLIA_PRIVATE_KEY
        ? [normalizePk(process.env.SEPOLIA_PRIVATE_KEY)]
        : [],
    },
  },
    etherscan: {
    apiKey: {
      sepolia: process.env.ETHERSCAN_API_KEY,  
    },
  },
};
