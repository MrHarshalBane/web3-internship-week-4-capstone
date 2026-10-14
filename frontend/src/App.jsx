import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import contractAddressData from "./contracts/contractAddress.json";
import contractAbiData from "./contracts/CertificateRegistryAbi.json";
import { 
  ShieldCheck, 
  Award, 
  Search, 
  Wallet, 
  AlertCircle, 
  CheckCircle2, 
  Loader2, 
  ExternalLink,
  Copy,
  Hash,
  Lock,
  Layers
} from "lucide-react";

export default function App() {
  // Wallet & Web3 state
  const [account, setAccount] = useState("");
  const [network, setNetwork] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [contractOwner, setContractOwner] = useState("");
  const [isOwner, setIsOwner] = useState(false);
  const [contractAddress, setContractAddress] = useState(contractAddressData.contractAddress || "");
  const [totalCerts, setTotalCerts] = useState(0);

  // Tab state: 'verify' or 'register'
  const [activeTab, setActiveTab] = useState("verify");

  // Registration Form State
  const [certInputHash, setCertInputHash] = useState("");
  const [rawCertData, setRawCertData] = useState("");
  const [registerStatus, setRegisterStatus] = useState({ state: "idle", msg: "", txHash: "" });

  // Verification Form State
  const [verifyInputHash, setVerifyInputHash] = useState("");
  const [verifyResult, setVerifyResult] = useState(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState("");

  // Helper: Get Read-Only Provider or Injected Signer
  const getEthereumProvider = () => {
    if (window.ethereum) {
      return new ethers.BrowserProvider(window.ethereum);
    }
    // Fallback to local hardhat json-rpc node
    return new ethers.JsonRpcProvider("http://127.0.0.1:8545");
  };

  // Helper: Get Contract Instance
  const getContract = async (withSigner = false) => {
    const provider = getEthereumProvider();
    if (withSigner && window.ethereum) {
      const signer = await provider.getSigner();
      return new ethers.Contract(contractAddress, contractAbiData, signer);
    }
    return new ethers.Contract(contractAddress, contractAbiData, provider);
  };

  // Connect Wallet
  const connectWallet = async () => {
    if (!window.ethereum) {
      alert("MetaMask or a Web3-compatible wallet was not detected. Please install MetaMask to interact with the blockchain.");
      return;
    }
    try {
      setIsConnecting(true);
      const provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await provider.send("eth_requestAccounts", []);
      const net = await provider.getNetwork();

      setAccount(accounts[0]);
      setNetwork({
        name: net.name === "unknown" ? `Chain ${net.chainId}` : net.name,
        chainId: Number(net.chainId),
      });

      // Load contract metadata
      await loadContractData(accounts[0]);
    } catch (err) {
      console.error("Wallet connection error:", err);
    } finally {
      setIsConnecting(false);
    }
  };

  // Check if wallet is already connected
  useEffect(() => {
    if (window.ethereum) {
      const provider = new ethers.BrowserProvider(window.ethereum);
      provider.listAccounts().then(async (accounts) => {
        if (accounts.length > 0) {
          setAccount(accounts[0].address);
          const net = await provider.getNetwork();
          setNetwork({
            name: net.name === "unknown" ? `Chain ${net.chainId}` : net.name,
            chainId: Number(net.chainId),
          });
          await loadContractData(accounts[0].address);
        }
      });

      // Event listeners for account or chain change
      window.ethereum.on("accountsChanged", (accs) => {
        if (accs.length > 0) {
          setAccount(accs[0]);
          loadContractData(accs[0]);
        } else {
          setAccount("");
          setIsOwner(false);
        }
      });

      window.ethereum.on("chainChanged", () => {
        window.location.reload();
      });
    }
  }, [contractAddress]);

  // Load contract owner and stats
  const loadContractData = async (userAddress = account) => {
    if (!contractAddress || !ethers.isAddress(contractAddress)) return;
    try {
      const contract = await getContract(false);
      const owner = await contract.owner();
      setContractOwner(owner);

      if (userAddress && owner.toLowerCase() === userAddress.toLowerCase()) {
        setIsOwner(true);
      } else {
        setIsOwner(false);
      }

      const total = await contract.totalCertificates();
      setTotalCerts(Number(total));
    } catch (e) {
      console.log("Contract not reached or uninitialized:", e.message);
    }
  };

  // Helper: Calculate SHA-256 / Keccak-256 for test string
  const handleGenerateHash = () => {
    if (!rawCertData.trim()) return;
    // Uses keccak256 as standard Ethereum hash
    const computedHash = ethers.keccak256(ethers.toUtf8Bytes(rawCertData.trim()));
    setCertInputHash(computedHash);
    setVerifyInputHash(computedHash);
  };

  // Register Certificate
  const handleRegisterCertificate = async (e) => {
    e.preventDefault();
    setRegisterStatus({ state: "idle", msg: "", txHash: "" });

    if (!account) {
      setRegisterStatus({ state: "error", msg: "Please connect your authorized issuer wallet first." });
      return;
    }

    if (!ethers.isHexString(certInputHash, 32)) {
      setRegisterStatus({ 
        state: "error", 
        msg: "Invalid hash format! The hash must be a 32-byte hexadecimal string starting with 0x (66 characters total)." 
      });
      return;
    }

    try {
      setRegisterStatus({ state: "pending", msg: "Awaiting wallet signature and network confirmation...", txHash: "" });
      const contract = await getContract(true);

      const tx = await contract.registerCertificate(certInputHash);
      setRegisterStatus({ 
        state: "pending", 
        msg: "Transaction submitted! Waiting for block inclusion...", 
        txHash: tx.hash 
      });

      const receipt = await tx.wait();
      if (receipt.status === 1) {
        setRegisterStatus({ 
          state: "confirmed", 
          msg: "Certificate successfully registered on-chain!", 
          txHash: tx.hash 
        });
        loadContractData(account);
        setCertInputHash("");
      } else {
        setRegisterStatus({ state: "failed", msg: "Transaction failed during execution.", txHash: tx.hash });
      }
    } catch (err) {
      console.error("Registration error:", err);
      let errMsg = "Transaction failed or rejected by wallet.";
      if (err.reason) {
        errMsg = `Contract revert: ${err.reason}`;
      } else if (err.data && err.data.message) {
        errMsg = err.data.message;
      } else if (err.message && err.message.includes("user rejected")) {
        errMsg = "Transaction was rejected in MetaMask.";
      } else if (err.message && err.message.includes("CertificateAlreadyRegistered")) {
        errMsg = "Error: This certificate hash is already registered on the blockchain!";
      } else if (err.message && err.message.includes("OwnableUnauthorizedAccount")) {
        errMsg = "Access Denied: Only the authorized contract owner can register certificates.";
      }
      setRegisterStatus({ state: "rejected", msg: errMsg, txHash: "" });
    }
  };

  // Verify Certificate
  const handleVerifyCertificate = async (e) => {
    e.preventDefault();
    setVerifyResult(null);
    setVerifyError("");

    if (!ethers.isHexString(verifyInputHash, 32)) {
      setVerifyError("Please enter a valid 32-byte cryptographic hash (0x + 64 hex characters).");
      return;
    }

    try {
      setIsVerifying(true);
      const contract = await getContract(false);
      const result = await contract.verifyCertificate(verifyInputHash);

      setVerifyResult({
        isValid: result.isValid,
        issuer: result.issuer,
        issuedAt: Number(result.issuedAt),
        timestampFormatted: Number(result.issuedAt) > 0 
          ? new Date(Number(result.issuedAt) * 1000).toLocaleString() 
          : "N/A"
      });
    } catch (err) {
      console.error("Verification error:", err);
      setVerifyError("Failed to query smart contract. Please check your network connection or contract address.");
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="app-container">
      {/* Header / Navbar */}
      <nav className="navbar">
        <a href="#" className="brand">
          <div className="brand-icon">
            <ShieldCheck size={24} />
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span className="brand-title">CertiChain</span>
              <span className="brand-badge">Ethereum dApp</span>
            </div>
            <p style={{ fontSize: "0.74rem", color: "var(--text-dim)" }}>
              Week 4 Web3 Final Capstone
            </p>
          </div>
        </a>

        <div className="nav-actions">
          {/* Network Indicator */}
          <div className="network-badge" id="network-indicator">
            <span className={`status-dot ${network ? "" : "disconnected"}`} />
            <span>{network ? network.name : "Not Connected"}</span>
            {network && (
              <span style={{ color: "var(--text-dim)", fontSize: "0.75rem" }}>
                (ID: {network.chainId})
              </span>
            )}
          </div>

          {/* Wallet Button */}
          {account ? (
            <button className="btn btn-secondary" style={{ fontFamily: "var(--font-mono)" }} id="wallet-connected-badge">
              <Wallet size={16} />
              {account.substring(0, 6)}...{account.substring(account.length - 4)}
              {isOwner && <span style={{ marginLeft: 6, fontSize: "0.72rem", color: "#818cf8" }}>(Issuer)</span>}
            </button>
          ) : (
            <button className="btn btn-primary" onClick={connectWallet} disabled={isConnecting} id="connect-wallet-btn">
              {isConnecting ? <Loader2 size={16} className="spinner" /> : <Wallet size={16} />}
              Connect Wallet
            </button>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="hero">
        <div className="hero-pill">
          <Layers size={14} /> Immutable Decentralized Verification
        </div>
        <h1>
          Verify Certificates with <br />
          <span className="hero-gradient-text">Zero-Knowledge Integrity</span>
        </h1>
        <p>
          Store cryptographic proof on-chain without exposing private student records. 
          Instant, tamper-proof verification for universities, employers, and certifiers.
        </p>
      </section>

      {/* Tabs */}
      <div className="tabs-container">
        <div className="tabs">
          <button 
            className={`tab-btn ${activeTab === "verify" ? "active" : ""}`}
            onClick={() => setActiveTab("verify")}
            id="tab-verify"
          >
            <Search size={16} /> Verify Certificate
          </button>
          <button 
            className={`tab-btn ${activeTab === "register" ? "active" : ""}`}
            onClick={() => setActiveTab("register")}
            id="tab-register"
          >
            <Award size={16} /> Register Hash (Issuer Only)
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="main-grid">
        {/* TAB 1: VERIFY CERTIFICATE */}
        {activeTab === "verify" && (
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">
                <Search size={20} color="#818cf8" /> Public Verification Portal
              </h2>
              <p className="card-subtitle">
                Enter the certificate's cryptographic hash to check if it has been officially certified on-chain.
              </p>
            </div>

            <form onSubmit={handleVerifyCertificate}>
              <div className="form-group">
                <label className="form-label" htmlFor="verify-hash-input">
                  Certificate Hash (Keccak-256 / SHA-256 bytes32)
                </label>
                <div className="input-wrapper">
                  <input
                    id="verify-hash-input"
                    type="text"
                    className="form-input"
                    placeholder="e.g. 0x8a1b2c3d4e5f... (64 hex characters)"
                    value={verifyInputHash}
                    onChange={(e) => setVerifyInputHash(e.target.value.trim())}
                  />
                </div>
                <div className="form-help">
                  <Hash size={12} /> Must begin with '0x' followed by 64 hexadecimal characters.
                </div>
              </div>

              <button 
                type="submit" 
                className="btn btn-primary" 
                style={{ width: "100%" }}
                disabled={isVerifying || !verifyInputHash}
                id="btn-run-verify"
              >
                {isVerifying ? (
                  <>
                    <Loader2 size={16} className="spinner" /> Verifying On-Chain...
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={16} /> Verify Authenticity
                  </>
                )}
              </button>
            </form>

            {/* Error message */}
            {verifyError && (
              <div className="alert alert-error">
                <AlertCircle size={18} />
                <span>{verifyError}</span>
              </div>
            )}

            {/* Verification Result Display */}
            {verifyResult && (
              <div className={`result-card ${verifyResult.isValid ? "valid" : "invalid"}`} id="verification-result-box">
                <div className={`result-header ${verifyResult.isValid ? "valid" : "invalid"}`}>
                  {verifyResult.isValid ? (
                    <>
                      <CheckCircle2 size={24} />
                      <span>Valid Certificate Verified On-Chain</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle size={24} />
                      <span>Certificate Hash Not Found (Invalid / Unregistered)</span>
                    </>
                  )}
                </div>

                <div className="result-meta-row">
                  <span className="result-meta-label">Verification Status:</span>
                  <span className="result-meta-val" style={{ color: verifyResult.isValid ? "#34d399" : "#f87171", fontWeight: 700 }}>
                    {verifyResult.isValid ? "AUTHENTIC & VERIFIED" : "NOT FOUND / UNREGISTERED"}
                  </span>
                </div>

                <div className="result-meta-row">
                  <span className="result-meta-label">Queried Hash:</span>
                  <span className="result-meta-val">{verifyInputHash}</span>
                </div>

                {verifyResult.isValid && (
                  <>
                    <div className="result-meta-row">
                      <span className="result-meta-label">Authorized Issuer Address:</span>
                      <span className="result-meta-val">{verifyResult.issuer}</span>
                    </div>

                    <div className="result-meta-row">
                      <span className="result-meta-label">Issued On-Chain At:</span>
                      <span className="result-meta-val">{verifyResult.timestampFormatted}</span>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Helper Test Hash Helper */}
            <div style={{ marginTop: 24 }}>
              <details className="generator-box">
                <summary>💡 Need a test hash? Compute hash from text</summary>
                <div style={{ marginTop: 12 }}>
                  <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: 8 }}>
                    Generate a deterministic Keccak-256 hash from a certificate identifier:
                  </p>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="e.g. CERTIFICATE-STUDENT-001-COMPUTING"
                      value={rawCertData}
                      onChange={(e) => setRawCertData(e.target.value)}
                    />
                    <button type="button" className="btn btn-secondary" onClick={handleGenerateHash}>
                      Generate
                    </button>
                  </div>
                </div>
              </details>
            </div>
          </div>
        )}

        {/* TAB 2: REGISTER CERTIFICATE */}
        {activeTab === "register" && (
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">
                <Lock size={20} color="#818cf8" /> Issuer Certificate Registration
              </h2>
              <p className="card-subtitle">
                Authorized institutions can commit certificate cryptographic fingerprints into the immutable ledger.
              </p>
            </div>

            {!account ? (
              <div className="alert alert-info">
                <Wallet size={18} />
                <span>Please connect your wallet with the issuer account to register certificates.</span>
              </div>
            ) : !isOwner ? (
              <div className="alert alert-warning">
                <AlertCircle size={18} />
                <div>
                  <strong>Issuer Access Restriction:</strong> Connected account ({account.substring(0, 6)}...{account.substring(account.length - 4)}) is not the contract owner.
                  <div style={{ fontSize: "0.78rem", marginTop: 4 }}>
                    Authorized Issuer: {contractOwner ? `${contractOwner.substring(0, 8)}...${contractOwner.substring(contractOwner.length - 6)}` : "Loading..."}
                  </div>
                </div>
              </div>
            ) : null}

            <form onSubmit={handleRegisterCertificate} style={{ marginTop: 16 }}>
              <div className="form-group">
                <label className="form-label" htmlFor="register-hash-input">
                  Certificate Cryptographic Hash (bytes32)
                </label>
                <input
                  id="register-hash-input"
                  type="text"
                  className="form-input"
                  placeholder="0x..."
                  value={certInputHash}
                  onChange={(e) => setCertInputHash(e.target.value.trim())}
                  disabled={!account || registerStatus.state === "pending"}
                />
                <div className="form-help">
                  <Lock size={12} /> Only SHA-256 or Keccak-256 digests are stored. Never input raw personal identifiers.
                </div>
              </div>

              <button 
                type="submit" 
                className="btn btn-primary" 
                style={{ width: "100%" }}
                disabled={!account || registerStatus.state === "pending" || !certInputHash}
                id="btn-register-submit"
              >
                {registerStatus.state === "pending" ? (
                  <>
                    <Loader2 size={16} className="spinner" /> Processing Transaction...
                  </>
                ) : (
                  <>
                    <Award size={16} /> Register on Blockchain
                  </>
                )}
              </button>
            </form>

            {/* Registration Transaction Status */}
            {registerStatus.state === "pending" && (
              <div className="alert alert-pending">
                <Loader2 size={18} className="spinner" />
                <div>
                  <strong>Transaction Pending:</strong> {registerStatus.msg}
                  {registerStatus.txHash && (
                    <div style={{ fontSize: "0.78rem", marginTop: 4, fontFamily: "var(--font-mono)" }}>
                      Tx Hash: {registerStatus.txHash}
                    </div>
                  )}
                </div>
              </div>
            )}

            {registerStatus.state === "confirmed" && (
              <div className="alert alert-success">
                <CheckCircle2 size={18} />
                <div>
                  <strong>Transaction Confirmed:</strong> {registerStatus.msg}
                  {registerStatus.txHash && (
                    <div style={{ fontSize: "0.78rem", marginTop: 4, fontFamily: "var(--font-mono)" }}>
                      Tx Hash: {registerStatus.txHash}
                    </div>
                  )}
                </div>
              </div>
            )}

            {(registerStatus.state === "rejected" || registerStatus.state === "error") && (
              <div className="alert alert-error">
                <AlertCircle size={18} />
                <div>
                  <strong>Registration Rejected:</strong> {registerStatus.msg}
                </div>
              </div>
            )}

            {/* Helper Hash Generator for Convenience */}
            <div style={{ marginTop: 24 }}>
              <details className="generator-box">
                <summary>💡 Generate hash for demo certificate registration</summary>
                <div style={{ marginTop: 12 }}>
                  <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: 8 }}>
                    Create sample hash string:
                  </p>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="e.g. CERTIFICATE-STUDENT-001-COMPUTING"
                      value={rawCertData}
                      onChange={(e) => setRawCertData(e.target.value)}
                    />
                    <button type="button" className="btn btn-secondary" onClick={handleGenerateHash}>
                      Generate
                    </button>
                  </div>
                </div>
              </details>
            </div>
          </div>
        )}

        {/* Global Contract Information Widget */}
        <div style={{ 
          background: "rgba(255, 255, 255, 0.02)", 
          border: "1px solid var(--border-color)", 
          borderRadius: "var(--radius-md)", 
          padding: "16px 20px",
          display: "flex",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "12px",
          fontSize: "0.82rem"
        }}>
          <div>
            <span style={{ color: "var(--text-dim)" }}>Contract Address: </span>
            <span style={{ fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>
              {contractAddress || "Not configured"}
            </span>
          </div>
          <div>
            <span style={{ color: "var(--text-dim)" }}>Total Registered: </span>
            <span style={{ fontWeight: 700, color: "#818cf8" }}>{totalCerts}</span>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="footer">
        <p>Skill Set Go EduTech Blockchain & Web3 Internship • Week 4 Final Capstone Project</p>
        <p style={{ marginTop: 4 }}>Created by Harshal Bane • Certificate Verification dApp</p>
      </footer>
    </div>
  );
}
