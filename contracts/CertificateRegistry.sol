// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title CertificateRegistry
 * @dev On-chain certificate verification contract that stores cryptographic hashes (SHA-256 / Keccak-256)
 *      of issued certificates. Sensitive personal data is strictly kept off-chain for privacy and GDPR compliance.
 */
contract CertificateRegistry is Ownable {

    // Struct representing certificate registration metadata
    struct CertificateRecord {
        bytes32 certificateHash; // Cryptographic hash of certificate
        address issuer;          // Address of the issuer who registered it
        uint256 issuedAt;        // Unix timestamp of registration
        bool exists;             // Existence indicator
    }

    // Mapping from certificate hash to certificate record
    mapping(bytes32 => CertificateRecord) private _certificates;

    // Counter for total registered certificates
    uint256 public totalCertificates;

    // Events
    event CertificateRegistered(
        bytes32 indexed certificateHash,
        address indexed issuer,
        uint256 timestamp
    );

    // Custom errors for gas efficiency and clear reverts
    error InvalidCertificateHash();
    error CertificateAlreadyRegistered(bytes32 certificateHash);
    error CertificateNotFound(bytes32 certificateHash);

    /**
     * @dev Initializes contract setting deployer as the initial owner and authorized issuer.
     */
    constructor() Ownable(msg.sender) {}

    /**
     * @notice Registers a new certificate's cryptographic hash on-chain.
     * @dev Only the contract owner (authorized institution / issuer) can call this function.
     * @param certificateHash The 32-byte cryptographic hash of the certificate document.
     */
    function registerCertificate(bytes32 certificateHash) external onlyOwner {
        if (certificateHash == bytes32(0)) {
            revert InvalidCertificateHash();
        }
        if (_certificates[certificateHash].exists) {
            revert CertificateAlreadyRegistered(certificateHash);
        }

        _certificates[certificateHash] = CertificateRecord({
            certificateHash: certificateHash,
            issuer: msg.sender,
            issuedAt: block.timestamp,
            exists: true
        });

        totalCertificates += 1;

        emit CertificateRegistered(certificateHash, msg.sender, block.timestamp);
    }

    /**
     * @notice Verifies whether a certificate hash exists and returns registration details.
     * @dev Anyone (public) can query this function without paying gas fees (read-only call).
     * @param certificateHash The 32-byte cryptographic hash to verify.
     * @return isValid Boolean indicating if certificate exists.
     * @return issuer Address of the issuer who registered the certificate.
     * @return issuedAt Timestamp when certificate was registered on-chain.
     */
    function verifyCertificate(bytes32 certificateHash)
        external
        view
        returns (
            bool isValid,
            address issuer,
            uint256 issuedAt
        )
    {
        if (certificateHash == bytes32(0)) {
            return (false, address(0), 0);
        }

        CertificateRecord memory cert = _certificates[certificateHash];
        return (cert.exists, cert.issuer, cert.issuedAt);
    }

    /**
     * @notice Quick check to see if a certificate hash is registered.
     * @param certificateHash The 32-byte hash to query.
     * @return Boolean true if registered, false otherwise.
     */
    function isCertificateRegistered(bytes32 certificateHash) external view returns (bool) {
        return _certificates[certificateHash].exists;
    }
}
