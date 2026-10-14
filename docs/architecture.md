# System Architecture: Blockchain-Based Certificate Verification dApp

## 1. Overview
The **CertiChain** dApp provides a decentralized, tamper-proof, and privacy-preserving infrastructure for issuing and verifying academic and professional certificates.

Rather than committing personally identifiable information (PII) directly to a public blockchain, the system employs **cryptographic hashing (Keccak-256 / SHA-256)** off-chain. Only the immutable 32-byte hash digest is anchored to the Ethereum ledger.

---

## 2. Component Architecture Diagram

```mermaid
graph TD
    subgraph Users ["Users & Roles"]
        Issuer["Authorized Issuer / University<br/>(MetaMask Private Key)"]
        Verifier["Public Verifier / Employer<br/>(Read-only or Wallet)"]
    end

    subgraph Client ["Frontend Layer (React + Vite)"]
        UI["Web3 UI (App.jsx)"]
        EthersProvider["Ethers.js v6 BrowserProvider / JsonRpcProvider"]
        HashUtil["Client-Side Keccak-256 Hasher"]
    end

    subgraph Wallet ["Wallet Provider"]
        MetaMask["MetaMask Extension (EIP-1193)"]
    end

    subgraph Blockchain ["Ethereum Blockchain (Hardhat / Sepolia)"]
        Contract["CertificateRegistry.sol<br/>(Ownable, Mapping, Events)"]
        Storage[("On-Chain State Storage<br/>• bytes32 Hash Record<br/>• Issuer Address<br/>• Block Timestamp")]
    end

    %% Issuer Flow
    Issuer -->|Input Raw Document / Hash| UI
    UI -->|Compute Hash| HashUtil
    UI -->|Sign Tx| MetaMask
    MetaMask -->|registerCertificate(hash)| Contract

    %% Verifier Flow
    Verifier -->|Input Certificate Hash| UI
    UI -->|verifyCertificate(hash)| EthersProvider
    EthersProvider -->|eth_call (Free Read)| Contract

    %% Contract to Storage
    Contract --> Storage
    Contract -.->|Emit CertificateRegistered Event| UI
```

---

## 3. Data Flow and User Journeys

### A. Certificate Issuance Journey (Authorized Issuer)
1. **Document Issuance & Hash Generation**:
   - The institution generates a digital certificate document (e.g., PDF or JSON transcript).
   - A cryptographic digest is generated: `hash = keccak256(documentBytes)`.
2. **Wallet Connection & Authorization**:
   - The issuer connects their Web3 wallet (MetaMask) to the dApp.
   - The dApp verifies whether the connected address matches the contract `owner()` role.
3. **Transaction Execution**:
   - The issuer submits `registerCertificate(bytes32 certificateHash)`.
   - The wallet prompts the user to review and sign the transaction with estimated gas.
4. **State Transition & Event Emission**:
   - The smart contract verifies that `certificateHash != bytes32(0)` and `!exists`.
   - The record is committed into the contract mapping `_certificates[hash]`.
   - The event `CertificateRegistered(hash, issuer, block.timestamp)` is emitted.
   - The dApp UI transitions from `pending` to `confirmed` with the transaction hash.

### B. Certificate Verification Journey (Public Verifier / Employer)
1. **Hash Query**:
   - An employer or verifier enters the certificate hash (or computes it from the received certificate file).
2. **Gasless Read Call**:
   - The frontend executes `verifyCertificate(bytes32 certificateHash)` via an `eth_call`.
   - No gas fee, signature, or wallet connection is required for reading public state.
3. **Result Presentation**:
   - **Valid**: If registered, the dApp displays "AUTHENTIC & VERIFIED", the issuer's Ethereum address, and the exact on-chain timestamp.
   - **Invalid / Tampered**: If altered or unregistered, the dApp displays "NOT FOUND / UNREGISTERED".

---

## 4. Layer Breakdown

| Layer | Technology | Primary Functionality |
| :--- | :--- | :--- |
| **Smart Contracts** | Solidity 0.8.24, OpenZeppelin Ownable | Access-controlled hash registry, duplicate protection, zero-gas read queries |
| **Development Toolchain** | Hardhat, Ethers v6, Chai | Automated testing, compilation, deployment scripts, EVM local node |
| **Frontend Framework** | React 18, Vite | Component-driven reactive UI, dynamic state handling |
| **Web3 Client** | Ethers.js v6 | RPC communication, wallet account detection, transaction submission |
| **UI Design System** | Modern Vanilla CSS, Lucide Icons | Responsive glassmorphism interface, interactive badge states, WCAG accessibility |

---

## 5. Network Compatibility
- **Hardhat Localhost (`chainId: 31337`)**: Default local deterministic network for rapid development and testing without spending real/faucet funds.
- **Sepolia Testnet (`chainId: 11155111`)**: Ethereum PoS testnet supported via `.env` configuration.
