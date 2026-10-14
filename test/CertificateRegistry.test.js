const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("CertificateRegistry Smart Contract Tests", function () {
  let CertificateRegistry;
  let registry;
  let owner;
  let unauthorizedAccount;
  let verifierAccount;

  // Sample valid 32-byte hashes
  const sampleHash1 = ethers.keccak256(ethers.toUtf8Bytes("CERTIFICATE-STUDENT-001-COMPUTING"));
  const sampleHash2 = ethers.keccak256(ethers.toUtf8Bytes("CERTIFICATE-STUDENT-002-DATA-SCIENCE"));
  const emptyHash = ethers.ZeroHash; // 0x0000000000000000000000000000000000000000000000000000000000000000

  beforeEach(async function () {
    [owner, unauthorizedAccount, verifierAccount] = await ethers.getSigners();
    CertificateRegistry = await ethers.getContractFactory("CertificateRegistry");
    registry = await CertificateRegistry.deploy();
    await registry.waitForDeployment();
  });

  describe("Deployment & Initial State", function () {
    it("TC-01: Should correctly set the deployer as the contract owner (authorized issuer)", async function () {
      expect(await registry.owner()).to.equal(owner.address);
    });

    it("TC-02: Should initialize totalCertificates counter to zero", async function () {
      expect(await registry.totalCertificates()).to.equal(0);
    });
  });

  describe("Certificate Registration", function () {
    it("TC-03: Should allow authorized issuer to register a certificate hash and emit CertificateRegistered event", async function () {
      const tx = await registry.connect(owner).registerCertificate(sampleHash1);
      const receipt = await tx.wait();

      // Check event emission
      await expect(tx)
        .to.emit(registry, "CertificateRegistered")
        .withArgs(sampleHash1, owner.address, (await ethers.provider.getBlock(receipt.blockNumber)).timestamp);

      // Verify state update
      expect(await registry.totalCertificates()).to.equal(1);
      expect(await registry.isCertificateRegistered(sampleHash1)).to.equal(true);

      const record = await registry.verifyCertificate(sampleHash1);
      expect(record.isValid).to.equal(true);
      expect(record.issuer).to.equal(owner.address);
      expect(record.issuedAt).to.be.greaterThan(0);
    });

    it("TC-04: Should reject registration if called by an unauthorized account", async function () {
      await expect(
        registry.connect(unauthorizedAccount).registerCertificate(sampleHash1)
      ).to.be.revertedWithCustomError(registry, "OwnableUnauthorizedAccount")
        .withArgs(unauthorizedAccount.address);

      expect(await registry.totalCertificates()).to.equal(0);
      expect(await registry.isCertificateRegistered(sampleHash1)).to.equal(false);
    });

    it("TC-05: Should reject registration of empty/invalid bytes32(0) hash", async function () {
      await expect(
        registry.connect(owner).registerCertificate(emptyHash)
      ).to.be.revertedWithCustomError(registry, "InvalidCertificateHash");

      expect(await registry.totalCertificates()).to.equal(0);
    });

    it("TC-06: Should reject duplicate registration of the same certificate hash", async function () {
      // First registration succeeds
      await registry.connect(owner).registerCertificate(sampleHash1);
      expect(await registry.totalCertificates()).to.equal(1);

      // Duplicate registration reverts with custom error
      await expect(
        registry.connect(owner).registerCertificate(sampleHash1)
      ).to.be.revertedWithCustomError(registry, "CertificateAlreadyRegistered")
        .withArgs(sampleHash1);

      // Counter remains 1
      expect(await registry.totalCertificates()).to.equal(1);
    });
  });

  describe("Certificate Verification", function () {
    it("TC-07: Should return valid record when verifying an existing registered hash", async function () {
      await registry.connect(owner).registerCertificate(sampleHash1);

      const record = await registry.connect(verifierAccount).verifyCertificate(sampleHash1);
      expect(record.isValid).to.equal(true);
      expect(record.issuer).to.equal(owner.address);
      expect(record.issuedAt).to.be.gt(0);
    });

    it("TC-08: Should return not found / invalid when verifying an unregistered or altered hash", async function () {
      const record = await registry.connect(verifierAccount).verifyCertificate(sampleHash2);
      expect(record.isValid).to.equal(false);
      expect(record.issuer).to.equal(ethers.ZeroAddress);
      expect(record.issuedAt).to.equal(0);
    });

    it("TC-09: Should return invalid when verifying empty bytes32(0)", async function () {
      const record = await registry.connect(verifierAccount).verifyCertificate(emptyHash);
      expect(record.isValid).to.equal(false);
      expect(record.issuer).to.equal(ethers.ZeroAddress);
      expect(record.issuedAt).to.equal(0);
    });

    it("TC-10: Should correctly reflect multiple registered certificates independently", async function () {
      await registry.connect(owner).registerCertificate(sampleHash1);
      await registry.connect(owner).registerCertificate(sampleHash2);

      expect(await registry.totalCertificates()).to.equal(2);

      const cert1 = await registry.verifyCertificate(sampleHash1);
      const cert2 = await registry.verifyCertificate(sampleHash2);

      expect(cert1.isValid).to.equal(true);
      expect(cert2.isValid).to.equal(true);
    });
  });
});
