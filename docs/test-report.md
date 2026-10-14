# Smart Contract & Integration Test Report

## 1. Test Environment Summary
- **Framework**: Hardhat v2.28.0 with `@nomicfoundation/hardhat-toolbox` v5.0.0
- **Solidity Version**: 0.8.24 (Optimizer enabled: 200 runs, EVM target: Paris)
- **Assertion Library**: Chai & `@nomicfoundation/hardhat-chai-matchers`
- **Execution Date**: October 14, 2026
- **Total Test Cases**: 10
- **Passing**: 10
- **Failing**: 0

---

## 2. Test Execution Log

```text
  CertificateRegistry Smart Contract Tests
    Deployment & Initial State
      ✔ TC-01: Should correctly set the deployer as the contract owner (authorized issuer) (182ms)
      ✔ TC-02: Should initialize totalCertificates counter to zero
    Certificate Registration
      ✔ TC-03: Should allow authorized issuer to register a certificate hash and emit CertificateRegistered event (67ms)
      ✔ TC-04: Should reject registration if called by an unauthorized account (68ms)
      ✔ TC-05: Should reject registration of empty/invalid bytes32(0) hash
      ✔ TC-06: Should reject duplicate registration of the same certificate hash
    Certificate Verification
      ✔ TC-07: Should return valid record when verifying an existing registered hash
      ✔ TC-08: Should return not found / invalid when verifying an unregistered or altered hash
      ✔ TC-09: Should return invalid when verifying empty bytes32(0)
      ✔ TC-10: Should correctly reflect multiple registered certificates independently

  10 passing (4s)
```

---

## 3. Detailed Test Matrix

| Test ID | Category | Scenario / Requirement Tested | Expected Result | Observed Result | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-01** | Deployment | Deploy contract and query `owner()` | Address matches deployer address | Matches deployer address | **PASS** |
| **TC-02** | Initial State | Query `totalCertificates()` upon deployment | Counter equals 0 | Returns `0` | **PASS** |
| **TC-03** | Registration | Authorized issuer registers valid 32-byte hash | Hash is stored, counter increments to 1, emits `CertificateRegistered` | Event emitted with accurate args, counter = 1 | **PASS** |
| **TC-04** | Access Control | Unauthorized non-owner attempts registration | Reverts with `OwnableUnauthorizedAccount` error | Reverts cleanly with custom error | **PASS** |
| **TC-05** | Validation | Attempt registration of `bytes32(0)` (empty hash) | Reverts with `InvalidCertificateHash` error | Reverts cleanly with custom error | **PASS** |
| **TC-06** | Integrity | Attempt duplicate registration of already registered hash | Reverts with `CertificateAlreadyRegistered(hash)` error | Reverts cleanly with custom error | **PASS** |
| **TC-07** | Verification | Verify registered hash via `verifyCertificate(hash)` | Returns `isValid: true`, issuer address, timestamp > 0 | Valid record returned | **PASS** |
| **TC-08** | Verification | Verify unregistered / altered hash | Returns `isValid: false`, address(0), timestamp 0 | Invalid / not found record returned | **PASS** |
| **TC-09** | Verification | Verify `bytes32(0)` hash | Returns `isValid: false` | Invalid / not found record returned | **PASS** |
| **TC-10** | Multi-Cert | Register 2 distinct hashes sequentially | Both verify independently as `true`, counter = 2 | Both records present and valid | **PASS** |

---

## 4. Frontend & Build Verification

| Test Item | Command | Expected Result | Result | Status |
| :--- | :--- | :--- | :--- | :--- |
| **Smart Contract Compilation** | `npx hardhat compile` | Compiles 3 Solidity files successfully | Compiled 3 Solidity files (solc 0.8.24) | **PASS** |
| **Automated Tests** | `npx hardhat test` | 10 passing tests | 10 passing tests in 4s | **PASS** |
| **Local Deployment Script** | `npx hardhat run scripts/deploy.js` | Deploys contract and exports ABI + config | Deployed to `0x5FbDB...aa3` & config exported | **PASS** |
| **Frontend Production Build** | `npm run build` in `frontend/` | Vite build completes without JSX or syntax errors | Vite bundle generated: `dist/index.html`, `dist/assets` | **PASS** |

---

## 5. Summary Conclusion
The smart contract suite and frontend client satisfy all specifications for the Week 4 Final Capstone, including access control, gasless verification, event logging, input sanitization, and state integrity.
