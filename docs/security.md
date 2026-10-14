# Security and Privacy Specification

## 1. Threat Model & Security Decisions

The **CertificateRegistry** smart contract manages the cryptographic proof of certificates. The primary threats include:
1. Unauthorized entities registering certificates falsely representing institutions.
2. Tampering with or altering issued records.
3. Front-running or duplicate registration spam.
4. Privacy leaks of personal student data (GDPR / FERPA violations).

---

## 2. Access Control Model

- **Contract Owner / Issuer**:
  - Leverages OpenZeppelin's audited `Ownable` pattern (`Ownable(msg.sender)`).
  - Only the authorized contract owner possesses the authority to invoke `registerCertificate(bytes32)`.
  - Non-owner transactions revert with `OwnableUnauthorizedAccount(address)`.
- **Public Verifier**:
  - The verification function `verifyCertificate(bytes32)` is marked as `external view`.
  - Read access is unconstrained, public, and gasless.

---

## 3. Input Validation & Data Integrity

- **Zero-Hash Guard (`bytes32(0)`)**:
  - The contract strictly forbids registering `bytes32(0)` through custom error `InvalidCertificateHash()`.
- **Duplicate Registration Prevention**:
  - Before writing to state, the contract checks `_certificates[certificateHash].exists`.
  - If a certificate hash is already in storage, execution reverts immediately with `CertificateAlreadyRegistered(bytes32)`, preventing state overwriting or issuer spoofing.
- **Strict Byte-Length**:
  - Storing a fixed `bytes32` rather than arbitrary `string` types drastically minimizes gas costs (approx 20,000 gas per slot) and prevents storage collision or dynamic memory vulnerabilities.

---

## 4. Privacy & Data Protection (Off-Chain Architecture)

```
[Student Name, Degree, Grades, DOB] (OFF-CHAIN / PRIVATE)
                       │
                       ▼
           [SHA-256 / Keccak-256 Hasher]
                       │
                       ▼
        0x4a7d...39bf (32-byte hash) ──────► (ON-CHAIN / IMMUTABLE)
```

- **Zero PII on Ledger**: No student names, grades, dates of birth, or identification numbers are ever transmitted or saved on the blockchain.
- **One-Way Cryptographic Guarantee**: Cryptographic hash functions are pre-image resistant. It is computationally infeasible to derive student information from the 32-byte hash.
- **GDPR Compliance**: Storing only hashes avoids permanent on-chain retention of personal data.

---

## 5. Frontend & Wallet Safety Measures

- **Zero Private Key Handling**: The frontend relies entirely on user-approved wallet injections (e.g. MetaMask via `window.ethereum`). The frontend never asks for, stores, or transmits private keys or seed phrases.
- **Ethers.js v6 Format Validation**: Form inputs are validated with `ethers.isHexString(hash, 32)` on the client side before any network or wallet request is initiated.
- **Safe Fallback Providers**: If the user's wallet is disconnected, verification queries fall back to a local or public read-only JSON-RPC provider without breaking the UI.

---

## 6. Known Limitations & Future Enhancements

1. **Single Owner Multi-Tenant Upgrade**:
   - Current version employs a single authorized issuer via `Ownable`.
   - *Future work*: Implement OpenZeppelin `AccessControl` (`DEFAULT_ADMIN_ROLE`, `ISSUER_ROLE`) allowing multiple accredited universities to act as issuers under a centralized or DAO governance registry.
2. **Certificate Revocation Mechanism**:
   - Currently, registered certificates remain permanently valid.
   - *Future work*: Add a `revokeCertificate(bytes32 hash, string reason)` function callable only by the issuing address.
3. **Decentralized Storage (IPFS / Arweave)**:
   - For complete workflows, metadata can be pinned on IPFS and the IPFS CID hashed.
