# Submission Checklist & Verification Walkthrough

This checklist outlines the verification steps and deliverables for your **Week 4 Final Capstone Project** evaluation.

---

## 1. Verified Deliverables

- [x] **Smart Contract**: Solidity 0.8.24 [`contracts/CertificateRegistry.sol`](../contracts/CertificateRegistry.sol) with OpenZeppelin `Ownable`, duplicate hash checks, zero-hash rejection, and event emission.
- [x] **Automated Test Suite**: 10 comprehensive unit tests in [`test/CertificateRegistry.test.js`](../test/CertificateRegistry.test.js) with 100% pass rate (`10 passing (4s)`).
- [x] **Deployment Automation**: [`scripts/deploy.js`](../scripts/deploy.js) supporting deterministic local network deployment and automated frontend configuration exports.
- [x] **Frontend Web3 Client**: React 18 + Vite dApp [`frontend/src/App.jsx`](../frontend/src/App.jsx) integrated with Ethers.js v6, network indicators, gasless verification, and reactive transaction states (`pending`, `confirmed`, `rejected`, `failed`).
- [x] **Zero-PII Privacy Design**: Strict off-chain hashing; only cryptographic hashes are stored on the ledger.
- [x] **Documentation**: Full set of [`README.md`](../README.md), [`docs/architecture.md`](./architecture.md), [`docs/security.md`](./security.md), and [`docs/test-report.md`](./test-report.md).
- [x] **Clean Repository & Submission ZIP**: Code pushed to GitHub repository root and exported to `web3-internship-week-4-capstone.zip`.

---

## 2. Personal Evidence To Capture

Open the project on your machine to take the final screenshots and record your demo:

1. **Terminal Test Output**:
   Run `npx hardhat test` and take a screenshot showing all 10 tests passing.
2. **dApp Interface (Homepage)**:
   Run `npm run dev` in `frontend/`, open `http://localhost:3000/`, and capture the public verification screen.
3. **Wallet Connected**:
   Click **Connect Wallet** in MetaMask and capture the header showing your connected account and chain ID.
4. **Certificate Verification (Valid)**:
   Paste a registered hash (or use the built-in helper to hash a test certificate) and click **Verify Authenticity** to capture the green "AUTHENTIC & VERIFIED" card with issuer address and timestamp.
5. **Certificate Verification (Not Found)**:
   Enter any altered 32-byte hash and capture the red "NOT FOUND / UNREGISTERED" alert.
6. **Issuer Registration**:
   Switch to the **Register Hash (Issuer Only)** tab, register a certificate hash, and screenshot the confirmed transaction alert.
7. **Demo Video (Optional)**:
   Record a 60–90 second screen recording walking through the above steps.
