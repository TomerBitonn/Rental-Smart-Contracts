# Rental Smart Contracts

A Solidity smart contract for managing **rental agreements** on the **Ethereum Blockchain.**  
This repository contains the contract code, unit tests, and Hardhat configuration for deployment and verification.  

👉 The frontend (DApp) is available in a separate repository: [Rental-Dapp](https://github.com/TomerBitonn/Rental-dApp.git).

---

## ✨ Features

- 📜 **Smart Contract in Solidity** - defines landlord, tenant, rent amount, duration, and contract lifecycle.  
- ✅ **Unit Tests with JavaScript + Chai** - covers deployment, signing, locking, payments, and termination.  
- ⚒️ **Hardhat** - development environment for compilation, testing, and deployment.  
- 🔗 **MetaMask** - used for account management and transaction signing.  
- 🔍 **Etherscan integration** - verify and interact with deployed contracts.  
- 🌐 **Sepolia Testnet Deployment** - the contract is connected and deployed on **Sepolia Testnet.** 

---

## 🛠️ Technologies

This project leverages the following stack:

- **[Solidity](https://soliditylang.org/)** - main programming language for the rental contract.  
- **[Hardhat](https://hardhat.org/)** - Ethereum development environment, used for compiling, deploying, verifying, and debugging.  
- **[Ethers.js](https://docs.ethers.org/)** - library for blockchain interaction (used in scripts, tests, and frontend).  
- **[Chai](https://www.chaijs.com/)** - assertion library used in unit tests.  
- **[JavaScript](https://developer.mozilla.org/en-US/docs/Web/JavaScript)** - for test scripts and deployment automation.  
- **[Node.js](https://nodejs.org/)** - runtime environment for running Hardhat and scripts.  
- **[MetaMask](https://metamask.io/)** - wallet used to connect accounts and sign transactions.  
- **[Etherscan](https://etherscan.io/)** - explorer used to verify and check deployed contracts.  
- **[dotenv](https://github.com/motdotla/dotenv)** - environment variable management for private keys and API keys.  

---

## 📂 Project Structure

```
Rental-Smart-Contracts/
├── artifacts/ 
├── cache/ 
│
├── contracts/ 
│ └── RentalContract.sol 
│
├── scripts/ 
│ └── RentalDeploy.js 
│
├── test/ 
│ └── RentalContract.test.js
│
├── .env # Environment variables (private key, RPC, API keys)
├── .gitignore
├── hardhat.config.js # Hardhat configuration
├── package.json
├── package-lock.json
└── README.md
```

---

## 🚀 Getting Started

### 1. Clone the repository
```bash
git clone https://github.com/TomerBitonn/Rental-Smart-Contracts.git
cd Rental-Smart-Contracts
```

### 2. Install dependencies
```bash
npx install
```

### 3. Compile the contract
```bash
npx hardhat compile
```

### 4. Run tests
```bash
npx hardhat test
```

### 5. Deploy to a network (e.g., Sepolia)
```bash
npx hardhat run scripts/RentalDeploy.js --network sepolia
```

---

## 🔑 Environment Variables

Create a `.env` file in the root with:

```bash
SEPOLIA_RPC_URL= # RPC endpoint for Sepolia (e.g., from Infura or Alchemy)
SEPOLIA_PRIVATE_KEY= # Private key of your MetaMask wallet (⚠️ do not share or commit this file)
ETHERSCAN_API_KEY= # API key for verifying contracts on Etherscan
```

These are used for deploying and verifying contracts.

---

## 📖 Related Repositories

**Frontend DApp:** [Rental-Dapp](https://github.com/TomerBitonn/Rental-dApp.git)
**React + Ethers.js interface for deploying and interacting with the contract.**
