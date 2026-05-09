"use client";

import { useState, useEffect } from "react";
import { ethers } from "ethers";
import {
  useAccount,
  useConnect,
  useDisconnect,
  useWriteContract,
  useWaitForTransactionReceipt,
  useReadContract,
} from "wagmi";
import { injected } from "wagmi/connectors";
import {
  VANTAGE_FACTORY_ADDRESS,
  VANTAGE_FACTORY_ABI,
  VANTAGE_INSTANCE_ABI,
} from "../lib/contract";
import { parseEther, formatEther } from "viem";

import ConnectWallet from "../components/ConnectWallet";

import { useConfig } from "wagmi";
import { waitForTransactionReceipt } from "@wagmi/core";

// --- SHARED UI COMPONENTS ---
const StatusBadge = ({ label, active }) => (
  <div
    className={`flex items-center gap-2 px-3 py-1 rounded-full border text-[10px] font-bold uppercase tracking-tighter transition-all ${
      active
        ? "bg-blue-500/20 border-blue-500 text-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.3)]"
        : "bg-white/5 border-white/10 text-gray-600"
    }`}
  >
    <div
      className={`w-1.5 h-1.5 rounded-full ${active ? "bg-blue-400 animate-pulse" : "bg-gray-700"}`}
    />
    {label}
  </div>
);

export default function Home() {
  const [view, setView] = useState("landing");
  const [intent, setIntent] = useState("");
  const [freelancerAddr, setFreelancerAddr] = useState("");
  const [amount, setAmount] = useState("");
  const [activeContract, setActiveContract] = useState(null);
  const [tgLinked, setTgLinked] = useState(false);
  const [lastProcessedFile, setLastProcessedFile] = useState(null);

  const [lastLoggedFile, setLastLoggedFile] = useState(null);

  const [showSuccess, setShowSuccess] = useState(false);
  const [deployedAddress, setDeployedAddress] = useState("");

  const { address, isConnected, chain } = useAccount(); // Ensure 'chain' is here!
  const { connect } = useConnect();
  const { disconnect } = useDisconnect();

  const config = useConfig();

  // 1. Define the full message you want to type out
  const fullTerminalText = `// Initializing Vantage Protocol v1.0...

  Connection established: ARC_MAINNET
  >>> Welcome, Operator.

  - System: Ready to secure your intent.
  - Status: Awaiting escrow parameters...
  - Security: Sentinel Bot is standing by.`;

  // 2. Create the 'text' state variable that the error is complaining about
  const [text, setText] = useState("");

  // 3. The logic that actually types the letters one by one
  useEffect(() => {
    let i = 0;
    const interval = setInterval(() => {
      setText(fullTerminalText.slice(0, i));
      i++;
      if (i > fullTerminalText.length) {
        // This pause at the end makes it look more natural before it restarts
        setTimeout(() => {
          i = 0;
        }, 3000);
      }
    }, 50);
    return () => clearInterval(interval);
  }, []);

  const {
    writeContractAsync,
    data: txHash,
    isLoading,
    isSuccess,
  } = useWriteContract();
  const { isLoading: isTxLoading, isSuccess: isTxSuccess } =
    useWaitForTransactionReceipt({ hash: txHash });

  const VANTAGE_ESCROW_ABI = [
    "function releaseFunds() public",
    "function getDetails() public view returns (address, address, uint256, bool)",
  ];

  // Update your state with the specific Escrow address from the transaction
  const [escrowAddress, setEscrowAddress] = useState(
    "0x2964e525f053537C9076D4917C733C2932E761E6",
  );

  const [incomingFileName, setIncomingFileName] = useState("");

  // Manually set this so the button appears since the page refreshed
  const [botStatus, setBotStatus] = useState("");
  // ... then your component starts below

  // --- CONTRACT READS ---
  const { data: allEscrows } = useReadContract({
    address: VANTAGE_FACTORY_ADDRESS,
    abi: VANTAGE_FACTORY_ABI,
    functionName: "getEscrows",
  });

  // In app/page.js, these will now return TRUE or FALSE correctly
  const { data: isFunded } = useReadContract({
    address: activeContract,
    abi: VANTAGE_INSTANCE_ABI,
    functionName: "isFunded",
    query: { enabled: !!activeContract },
  });

  const { data: isCompleted } = useReadContract({
    address: activeContract,
    abi: VANTAGE_INSTANCE_ABI,
    functionName: "isCompleted",
    query: { enabled: !!activeContract },
  });

  const { data: isReleased } = useReadContract({
    address: activeContract,
    abi: VANTAGE_INSTANCE_ABI, // Changed from just 'abi'
    functionName: "isReleased",
    query: { enabled: !!activeContract },
  });

  const [activeEscrowId, setActiveEscrowId] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("vantage_active_escrow");
    }
    return null;
  });

  // const { data: isCompleted } = useReadContract({
  //   address: activeContract,
  //   abi: VANTAGE_INSTANCE_ABI, // Changed from abi
  //   functionName: "currentStatus", // NOTE: Check if your contract uses 'currentStatus' or 'isCompleted'
  //   query: { enabled: !!activeContract },
  // });

  const { data: contractBalance } = useReadContract({
    address: activeContract,
    abi: VANTAGE_INSTANCE_ABI, // Changed from abi
    functionName: "amount", // This matches the 'amount' variable in your Instance contract
    query: { enabled: !!activeContract },
  });

  {
    /* --- ADD THESE STATE WRAPPERS TO YOUR COMPONENT --- */
  }
  const [logs, setLogs] = useState([
    {
      id: 1,
      type: "SYSTEM",
      msg: "Node online. Awaiting intent...",
      time: "12:00:01",
    },
  ]);

  // Helper to push new activities to the sidebar
  const addLog = (msg, type = "INFO") => {
    setLogs((prev) => [
      { id: Date.now(), msg, type, time: new Date().toLocaleTimeString() },
      ...prev,
    ]);
  };

  // --- LOGIC: Intent Parser ---
  useEffect(() => {
    const addrMatch = intent.match(/0x[a-fA-F0-9]{40}/);
    const amountMatch = intent.match(/\d+(\.\d+)?/);
    if (addrMatch) setFreelancerAddr(addrMatch[0]);
    if (amountMatch) setAmount(amountMatch[0]);
  }, [intent]);

  // Auto-switch to dashboard if wallet connects
  useEffect(() => {
    if (isConnected && view === "landing") setView("dashboard");
  }, [isConnected, view]);

  // This "polls" the API every 3 seconds to see if the bot sent a message
  // --- UPDATED STATUS LISTENER ---

  // useEffect(() => {
  //   let i = 0;
  //   const interval = setInterval(() => {
  //     setText(fullText.slice(0, i));
  //     i++;
  //     if (i > fullText.length) {
  //       setTimeout(() => { i = 0; }, 3000); // Pause at end, then restart
  //     }
  //   }, 50); // Speed of typing
  //   return () => clearInterval(interval);
  // }, []);

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch("/api/bot-status");

        // Safety Check: If the API is down or returns 404/500, don't try to parse it
        if (!res.ok) {
          console.warn("Polling: API returned an error status", res.status);
          return;
        }

        const data = await res.json();

        // 1. Always update the main status state
        if (data && data.status) {
          setBotStatus(data.status);
        }

        // 2. Handle Creation
        if (data.status === "ESCROW_CREATED") {
          setEscrowAddress(data.escrowAddress);
          addLog(`Verified Contract: ${data.escrowAddress}`, "SYSTEM");
        }

        // 3. Handle File Submission
        if (
          data.status === "WORK_SUBMITTED" ||
          data.status === "LOGO_RECEIVED"
        ) {
          addLog(`File captured: ${data.message || data.fileName}`, "DEPLOY");
        }

        // 4. Handle the Release
        const isReleased =
          (typeof data.status === "string" &&
            data.status === "ESCROW_RELEASED") ||
          (typeof data.status === "number" && data.status === 2);

        if (isReleased) {
          // Use a fallback if data.amount is missing to prevent crashes
          const displayAmt = data.amount || "1";
          addLog(`Release Confirmed! ${displayAmt} ARC sent.`, "FINISH");
          setEscrowAddress("");
          setBotStatus("IDLE");
        }
      } catch (err) {
        console.error("Polling error:", err);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  // useEffect(() => {
  //   if (botStatus && botStatus.status === "WORK_SUBMITTED") {
  //     // Only add to log if the last log isn't already this file submission
  //     setLogs((prev) => {
  //       const isDuplicate =
  //         prev.length > 0 && prev[0].msg.includes(botStatus.fileName);
  //       if (isDuplicate) return prev;

  //       return [
  //         {
  //           id: Date.now(),
  //           type: "DEPLOY",
  //           time: new Date().toLocaleTimeString(),
  //           msg: `File captured: Freelancer submitted ${botStatus.fileName}`,
  //         },
  //         ...prev,
  //       ];
  //     });
  //   }
  // }, [botStatus]);

  useEffect(() => {
    const syncBot = async () => {
      try {
        const res = await fetch("/api/bot-status");
        const data = await res.json();

        // Update the status so the Release Button knows when to show up
        setBotStatus(data);

        // THE LOCK: Only log if status is WORK_SUBMITTED AND it's a new filename
        // We use 'lastLoggedFile' as the single source of truth for the lock
        if (
          data.status === "WORK_SUBMITTED" &&
          data.fileName &&
          data.fileName !== lastLoggedFile
        ) {
          setLogs((prev) => [
            {
              id: Date.now(),
              type: "DEPLOY",
              time: new Date().toLocaleTimeString(),
              msg: `File captured: Freelancer submitted ${data.fileName}`,
            },
            ...prev,
          ]);

          setLastLoggedFile(data.fileName); // This stops the replication permanently
        }
      } catch (err) {
        console.error("Bot sync failed:", err);
      }
    };

    const interval = setInterval(syncBot, 3000);
    return () => clearInterval(interval);
  }, [lastLoggedFile]); // Keep this dependency so the 'if' statement always has the latest lock value

  useEffect(() => {
    const checkBotStatus = async () => {
      try {
        const res = await fetch("/api/bot-status");
        const data = await res.json();

        setBotStatus(data);

        // ONLY add to log if this is a NEW file submission
        if (
          data.status === "WORK_SUBMITTED" &&
          data.fileName !== lastProcessedFile
        ) {
          setLogs((prev) => [
            {
              id: Date.now(),
              type: "DEPLOY",
              time: new Date().toLocaleTimeString(),
              msg: `File captured: Freelancer submitted ${data.fileName}`,
            },
            ...prev,
          ]);

          // LOCK this file name so it doesn't log again
          setLastProcessedFile(data.fileName);
        }
      } catch (err) {
        console.error("Status Sync Error:", err);
      }
    };

    const timer = setInterval(checkBotStatus, 3000);
    return () => clearInterval(timer);
  }, [lastProcessedFile]); // Re-run when the lock changes

  // <--- KEEP THIS EMPTY. This fixes the "Changed Size" error permanently.

  // When the escrow is detected
  // This prevents the "localStorage is not defined" error
  if (typeof window !== "undefined" && escrowAddress) {
    localStorage.setItem("lastEscrow", escrowAddress);
  }
  // When the page loads
  useEffect(() => {
    const saved = localStorage.getItem("lastEscrow");
    if (saved) setEscrowAddress(saved);
  }, []);

  const handleCreateAndFund = async () => {
    if (Number(chain?.id) !== 5042002) {
      alert(
        "Please switch to Arc Network using the button in the top right before executing!",
      );
      return;
    }

    try {
      const amountInWei = parseEther(amount);

      const txHash = await writeContractAsync({
        address: VANTAGE_FACTORY_ADDRESS,
        abi: VANTAGE_FACTORY_ABI,
        functionName: "createEscrow",
        args: [freelancerAddr],
        value: amountInWei,
      });

      if (txHash) {
        addLog(`Initiating Escrow for ${amount} ARC...`, "SYSTEM");

        const receipt = await waitForTransactionReceipt(config, {
          hash: txHash,
        });

        // 1. Create an interface to parse the logs
        const iface = new ethers.Interface(VANTAGE_FACTORY_ABI);
        let newEscrowAddress = null;

        // 2. Loop through logs and find the one that matches your Factory's "Created" event
        for (const log of receipt.logs) {
          try {
            const parsedLog = iface.parseLog(log);
            // Look for an event name that sounds like 'Created' (e.g., EscrowCreated)
            if (parsedLog.name.toLowerCase().includes("created")) {
              // Usually the first argument is the new address
              newEscrowAddress = parsedLog.args[0];
              break;
            }
          } catch (e) {
            // Skip logs that don't match the ABI
            continue;
          }
        }

        // 3. Fallback: If no event was found, grab the very last log that ISN'T the factory
        if (!newEscrowAddress) {
          const internalLogs = receipt.logs.filter(
            (l) =>
              l.address.toLowerCase() !== VANTAGE_FACTORY_ADDRESS.toLowerCase(),
          );
          if (internalLogs.length > 0) {
            newEscrowAddress = internalLogs[internalLogs.length - 1].address;
          }
        }

        if (!newEscrowAddress || newEscrowAddress.startsWith("0x1800")) {
          throw new Error("Could not find valid Escrow address in logs.");
        }

        const finalAddr = ethers.getAddress(newEscrowAddress);

        // 4. Update state and storage
        setActiveEscrowId(finalAddr);
        localStorage.setItem("vantage_active_escrow", finalAddr);
        setActiveContract(true);

        addLog(`Escrow Deployed: ${finalAddr.slice(0, 10)}...`, "SYSTEM");

        setDeployedAddress(finalAddr); // Stores the address for the modal to display
        setShowSuccess(true);
      }
    } catch (e) {
      console.error("Deployment Error:", e);
      addLog(`Error: ${e.message}`, "SYSTEM");
    }
  };

  //////////////////////////////////////////

  const handleReleaseFunds = async () => {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      // 1. Get the address saved during deployment
      const target = localStorage.getItem("vantage_active_escrow");

      // 2. SECURITY CHECK
      const FACTORY = "0x7c91984E6ed2D181A6A83eB867f0998E49216eE5";
      const DUMMY = "0x1800000000000000000000000000000000000000";

      if (
        !target ||
        target.toLowerCase() === FACTORY.toLowerCase() ||
        target.toLowerCase() === DUMMY
      ) {
        addLog(
          "Error: No valid Escrow contract found. Please redeploy.",
          "SYSTEM",
        );
        alert("Address Error: The app is pointing to a non-escrow address.");
        return;
      }

      const checksumAddress = ethers.getAddress(target);

      // 3. Setup Contract
      const escrowContract = new ethers.Contract(
        checksumAddress,
        ["function release() external"],
        signer,
      );

      addLog(
        `Releasing funds from: ${checksumAddress.slice(0, 10)}...`,
        "SYSTEM",
      );

      // 4. Execute
      const tx = await escrowContract.release();
      addLog("Transaction pending...", "SYSTEM");

      await tx.wait();

      addLog(`Release Confirmed! ${amount || "Escrow"} ARC sent.`, "FINISH");

      // CORRECTED CODE
      await fetch("/api/bot-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "ESCROW_RELEASED",
          amount: amount, // Send the real amount here
          escrowAddress: checksumAddress, // Send the address too
        }),
      });

      alert("🚀 Success! Funds released.");
      localStorage.removeItem("vantage_active_escrow");
      setActiveEscrowId(null);
      setBotStatus({ status: "IDLE" });
    } catch (err) {
      console.error("Release Error:", err);
      const msg =
        err.reason || "Invalid Selector: Contract address is incorrect.";
      addLog(`Error: ${msg}`, "SYSTEM");
      alert(msg);
    }
  };

  // This is the generalized version we need
  const createEscrow = async (freelancerAddress, amountInArc) => {
    const amountInWei = ethers.parseEther(amountInArc.toString());

    // Use the checksummed factory address
    const factoryContract = new ethers.Contract(
      VANTAGE_FACTORY_ADDRESS, // Use the address from your contract.js
      VANTAGE_FACTORY_ABI,
      signer,
    );

    // FIX: Only ONE argument inside the parentheses: freelancerAddress
    // The money (value) goes in the overrides object { value: ... }
    const tx = await factoryContract.createEscrow(
      ethers.getAddress(freelancerAddress),
      { value: amountInWei },
    );

    await tx.wait();
  };

  // --- RENDER LOGIC ---

  if (view === "landing") {
    return (
      <main className="min-h-screen bg-[#020203] text-white relative overflow-x-hidden selection:bg-blue-500/30 font-sans">
        {/* --- TOP SYSTEM BAR --- */}
        <div className="fixed top-0 w-full z-50 bg-black/60 backdrop-blur-xl border-b border-white/5 px-6 py-3 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center font-black italic text-sm shadow-[0_0_15px_rgba(59,130,246,0.5)]">
              V
            </div>
            <span className="text-[10px] font-black tracking-[0.3em] uppercase opacity-50">
              Vantage Protocol_v1
            </span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
              <span className="text-[9px] font-mono text-blue-500">
                SYSTEM_NOMINAL
              </span>
            </div>
            <span className="text-[9px] font-mono opacity-30">
              GAS: 0.0001 ARC
            </span>
            <button
              onClick={() => setView("dashboard")}
              className="text-[10px] font-black bg-white text-black px-4 py-1.5 rounded uppercase hover:bg-blue-600 hover:text-white transition-all"
            >
              Connect Now
            </button>
          </div>
        </div>

        {/* --- BACKGROUND ARCHITECTURE --- */}
        <div className="fixed inset-0 z-0 pointer-events-none">
          <div
            className="absolute inset-0 opacity-[0.05]"
            style={{
              backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`,
              backgroundSize: "40px 40px",
            }}
          />
          <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-blue-600/10 blur-[150px] animate-pulse" />
        </div>

        {/* --- SECTION 1: HERO (CLEAN & UNOBSTRUCTED) --- */}
        <section className="relative z-10 min-h-[90vh] flex flex-col items-center justify-center pt-20 px-6">
          <div className="max-w-7xl w-full grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-7 space-y-8">
              <div className="inline-flex items-center gap-3 px-4 py-1.5 rounded-full border border-blue-500/30 bg-blue-500/5 backdrop-blur-md">
                <span className="text-[10px] font-black tracking-widest text-blue-400 uppercase">
                  Vantage Protocol v1.0 Active
                </span>
              </div>
              <h1 className="text-5xl md:text-8xl font-black italic tracking-tighter leading-[0.85]">
                VANTAGE
                <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 via-white to-white/20">
                  ESCROW.
                </span>
              </h1>
              <p className="text-gray-400 text-lg md:text-2xl max-w-xl font-medium leading-relaxed">
                The high-fidelity settlement layer for the Arc Network.
                Transform human intent into immutable on-chain agreements.
              </p>
              <div className="flex flex-wrap gap-6 pt-4">
                <button
                  onClick={() => setView("dashboard")}
                  className="group relative px-12 py-6 bg-blue-600 rounded-2xl overflow-hidden hover:scale-105 transition-all shadow-[0_0_30px_rgba(59,130,246,0.2)]"
                >
                  <span className="relative z-10 font-black text-xl flex items-center gap-3 text-white">
                    LAUNCH TERMINAL{" "}
                    <svg
                      className="w-5 h-5 group-hover:translate-x-1 transition-transform"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="3"
                        d="M13 7l5 5m0 0l-5 5m5-5H6"
                      />
                    </svg>
                  </span>
                </button>
              </div>
            </div>

            {/* DYNAMIC CODE VISUALIZER */}
            {/* RIGHT SIDE: ANIMATED TERMINAL */}
            <div className="hidden lg:block w-full min-w-[450px] lg:min-w-[550px] flex-shrink-0 animate-in fade-in slide-in-from-right-8 duration-1000">
              <div className="relative bg-[#050506]/90 rounded-[2.5rem] p-10 border border-white/5 shadow-2xl font-mono overflow-hidden h-[320px]">
                {/* Glow Background */}
                <div className="absolute -top-20 -left-20 w-64 h-64 bg-blue-600/10 blur-[100px] rounded-full" />

                {/* Header */}
                <div className="flex gap-2.5 mb-8 relative z-10">
                  <div className="w-3 h-3 rounded-full bg-red-500/10 border border-red-500/20" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/10 border border-yellow-500/20" />
                  <div className="w-3 h-3 rounded-full bg-blue-500/10 border border-blue-500/20" />
                </div>

                <div className="flex flex-row gap-12 relative z-10">
                  {/* Welcome Message Area */}
                  <div className="flex-1">
                    <pre className="text-blue-100/90 text-[14px] leading-[1.8] whitespace-pre-wrap font-mono">
                      {text}
                      <span className="inline-block w-2 h-5 bg-blue-500 animate-pulse ml-1 align-middle" />
                    </pre>
                  </div>

                  {/* Side Status Bar */}
                  <div className="border-l border-white/10 pl-10 space-y-8 min-w-[140px]">
                    <div>
                      <p className="text-[10px] text-gray-500 uppercase tracking-[0.3em] mb-2 font-bold">
                        Node Status
                      </p>
                      <p className="text-emerald-500 text-[11px] font-black flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_#10b981]" />
                        ONLINE
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-500 uppercase tracking-[0.3em] mb-2 font-bold">
                        Identity
                      </p>
                      <p className="text-blue-400/90 text-[11px] font-mono uppercase">
                        Guest_User
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-500 uppercase tracking-[0.3em] mb-2 font-bold">
                        Encryption
                      </p>
                      <p className="text-gray-400 text-[11px] font-mono">
                        AES-256
                      </p>
                    </div>
                  </div>
                </div>

                {/* Scanline Overlay */}
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-500/[0.02] to-transparent h-[200%] animate-scanline pointer-events-none" />
              </div>
            </div>
          </div>
        </section>

        {/* --- SECTION 1: HERO (THE HOOK) --- */}
        <section className="relative z-10 min-h-screen flex flex-col items-center justify-center p-6 border-b border-white/5">
          <div className="px-6 py-2 mb-12 border border-blue-500/30 rounded-full bg-blue-500/5 backdrop-blur-xl animate-fade-in">
            <span className="text-[10px] font-black tracking-[0.6em] text-blue-400 uppercase flex items-center gap-3">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
              Arc Network Native v1.0
            </span>
          </div>

          <h1 className="text-7xl md:text-[12rem] font-black italic tracking-tighter leading-[0.8] text-center mb-10 mix-blend-difference">
            <span className="block hover:translate-x-4 transition-transform duration-700">
              ESCROW BUILDS
            </span>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-white to-emerald-400 drop-shadow-[0_0_50px_rgba(59,130,246,0.4)]">
              TRUST.
            </span>
          </h1>

          <p className="text-gray-400 text-xl md:text-3xl max-w-3xl text-center font-medium mb-16 leading-relaxed opacity-70 italic">
            High-performance escrows. Intent-based settlement.
            <span className="text-white"> Zero trust required.</span>
          </p>

          <div className="flex flex-col md:flex-row gap-10 items-center">
            <button
              onClick={() => setView("dashboard")}
              className="group relative px-20 py-10 overflow-hidden rounded-[2.5rem] transition-all hover:scale-105"
            >
              <div className="absolute inset-0 bg-blue-600 group-hover:bg-blue-400 transition-colors" />
              <span className="relative text-black font-black text-3xl tracking-tighter flex items-center gap-4">
                ENTER PROTOCOL
                <svg
                  className="w-8 h-8 group-hover:translate-x-2 transition-transform"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="4"
                    d="M13 7l5 5m0 0l-5 5m5-5H6"
                  />
                </svg>
              </span>
            </button>
          </div>

          {/* Floating Mouse Prompt */}
          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-4 opacity-30 animate-bounce">
            <span className="text-[10px] font-black tracking-widest uppercase">
              Scroll to Explore
            </span>
            <div className="w-[1px] h-12 bg-gradient-to-b from-white to-transparent" />
          </div>
        </section>

        {/* --- SECTION 2: NEW COMPONENT SECTION (The "Floating" Cards moved here) --- */}
        <section className="relative z-10 py-12 md:py-24 px-4 max-w-7xl mx-auto overflow-hidden">
          {/* The container grid: 1 column on mobile, 2 on desktop */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-24 items-center">
            {/* Asset Vault Card - Floats left-ish */}
            <div className="order-2 md:order-1 flex justify-center md:justify-start">
              <div className="relative w-full max-w-[340px] h-[380px] bg-gradient-to-bl from-emerald-600/10 to-transparent border border-emerald-500/20 rounded-[3rem] backdrop-blur-3xl animate-float p-8 -rotate-3 hover:rotate-0 transition-transform duration-500 shadow-2xl shadow-emerald-500/10">
                <div className="text-[10px] font-black text-emerald-400 mb-8 text-right uppercase tracking-widest">
                  Secure_Asset_Vault
                </div>
                <div className="space-y-8">
                  <div>
                    <div className="text-[9px] uppercase opacity-30 mb-1">
                      Locked Capital
                    </div>
                    <div className="text-4xl md:text-5xl font-black italic tracking-tighter text-white">
                      169.69{" "}
                      <span className="text-sm text-emerald-500">USDC</span>
                    </div>
                  </div>
                  <div className="p-4 bg-emerald-500/10 rounded-2xl border border-emerald-500/20">
                    <div className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">
                      Awaiting Milestone Release...
                    </div>
                    <div className="w-full h-1 bg-emerald-500/20 rounded-full mt-3 overflow-hidden">
                      <div className="h-full bg-emerald-500 w-1/3 animate-pulse" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Sentinel Node Card - Floats right-ish */}
            <div className="order-1 md:order-2 flex justify-center md:justify-end">
              <div className="relative w-full max-w-[340px] h-[420px] bg-gradient-to-br from-blue-600/20 to-transparent border border-blue-500/20 rounded-[3rem] backdrop-blur-3xl animate-float-delayed p-8 rotate-3 hover:rotate-0 transition-transform duration-500 shadow-2xl shadow-blue-500/10">
                <div className="text-[10px] font-black text-blue-500 mb-8 flex items-center gap-2 uppercase tracking-widest">
                  <span className="w-2 h-2 bg-blue-500 rounded-full animate-ping" />
                  Sentinel_Node_Status
                </div>
                <div className="space-y-6">
                  <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full w-3/4 bg-blue-500/40 animate-pulse" />
                  </div>
                  <p className="text-gray-400 text-sm font-medium leading-relaxed">
                    Real-time Telegram integration providing automated
                    watchtower services for every transaction.
                  </p>
                  <div className="grid grid-cols-2 gap-4 pt-4">
                    <div className="p-4 bg-black/40 rounded-2xl border border-white/5 text-center">
                      <div className="text-[8px] opacity-40 uppercase mb-1">
                        Latency
                      </div>
                      <div className="text-sm font-mono font-bold text-blue-400">
                        12ms
                      </div>
                    </div>
                    <div className="p-4 bg-black/40 rounded-2xl border border-white/5 text-center">
                      <div className="text-[8px] opacity-40 uppercase mb-1">
                        Reliability
                      </div>
                      <div className="text-sm font-mono font-bold text-blue-400">
                        99.9%
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* --- SECTION 3: BENTO (THE "LENGTHY" PART) --- */}
        <section className="relative z-10 py-32 px-6 max-w-7xl mx-auto">
          <div className="text-center mb-24">
            <h2 className="text-[10px] font-black text-blue-500 tracking-[0.5em] uppercase mb-4">
              Core Infrastructure
            </h2>
            <p className="text-4xl md:text-6xl font-black italic tracking-tighter">
              ENGINEERED FOR TRUST.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            <div className="md:col-span-8 bg-white/[0.02] border border-white/5 rounded-[3rem] p-12 hover:border-blue-500/40 transition-all group overflow-hidden relative">
              <div className="relative z-10">
                <h3 className="text-3xl font-black italic mb-4 text-blue-400 uppercase tracking-tighter">
                  01. Intent-Based Parsing
                </h3>
                <p className="text-gray-400 text-lg max-w-md leading-relaxed font-medium">
                  VANTAGE reads your intent and prepares the contract logic
                  automatically. Type in plain English.
                </p>
              </div>
              <div className="absolute right-[-5%] bottom-[-10%] opacity-10 group-hover:opacity-20 transition-opacity uppercase text-[15rem] font-black italic tracking-tighter">
                PARSER
              </div>
            </div>

            <div className="md:col-span-4 bg-gradient-to-br from-blue-600 to-blue-800 rounded-[3rem] p-12 hover:scale-[1.02] transition-all flex flex-col justify-between">
              <h3 className="text-3xl font-black text-white leading-none italic uppercase tracking-tighter">
                02. <br /> Sentinel <br /> Bot.
              </h3>
              <p className="text-white/70 font-bold mt-8">
                Real-time Telegram arbitration. Every milestone monitored 24/7.
              </p>
            </div>
          </div>
        </section>

        {/* --- SECTION 4: THE WORKFLOW --- */}
        <section className="relative z-10 py-32 bg-white/[0.01] border-y border-white/5">
          <div className="max-w-4xl mx-auto px-6 text-center">
            <h2 className="text-5xl font-black italic mb-20 tracking-tighter">
              HOW VANTAGE <span className="text-blue-500">SETTLES.</span>
            </h2>
            <div className="space-y-16 relative">
              <div className="absolute left-[50%] top-0 bottom-0 w-px bg-white/5 hidden md:block" />
              {[
                {
                  step: "01",
                  t: "INITIATE INTENT",
                  d: "Draft your deal in the Vantage terminal.",
                },
                {
                  step: "02",
                  t: "LOCK CAPITAL",
                  d: "Funds secured on the Arc Network.",
                },
                {
                  step: "03",
                  t: "LINK SENTINEL",
                  d: "Telegram bot monitors progress.",
                },
                {
                  step: "04",
                  t: "EXECUTE RELEASE",
                  d: "Instant settlement upon approval.",
                },
              ].map((item, i) => (
                <div
                  key={i}
                  className={`relative flex flex-col items-center ${i % 2 === 0 ? "md:flex-row-reverse" : "md:flex-row"} gap-10`}
                >
                  <div className="flex-1 text-center md:text-left">
                    <h4 className="text-2xl font-black italic text-blue-500 mb-2">
                      {item.t}
                    </h4>
                    <p className="text-gray-500 font-medium">{item.d}</p>
                  </div>
                  <div className="relative z-10 w-12 h-12 bg-black border border-blue-500/50 rounded-full flex items-center justify-center font-black text-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.3)]">
                    {item.step}
                  </div>
                  <div className="flex-1" />
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* --- FINAL CALL --- */}
        <section className="relative z-10 py-60 flex flex-col items-center justify-center text-center px-6">
          <h2 className="text-7xl md:text-9xl font-black italic tracking-tighter mb-12">
            DEAL <br />{" "}
            <span className="text-blue-500 underline decoration-blue-500/20">
              CLOSED.
            </span>
          </h2>
          <button
            onClick={() => setView("dashboard")}
            className="px-20 py-8 bg-white text-black font-black text-2xl rounded-3xl hover:bg-blue-600 hover:text-white transition-all shadow-2xl uppercase"
          >
            Access Vantage DApp
          </button>
        </section>

        <footer className="relative z-10 py-12 px-6 border-t border-white/5 text-center">
          <p className="text-[10px] font-black text-gray-700 tracking-[0.2em]">
            © 2026 VANTAGE_PROTOCOL_CORE
          </p>
        </footer>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0A0A0B] text-slate-200 font-sans selection:bg-blue-500/30">
      {/* NAVBAR */}
      <nav className="border-b border-white/5 bg-black/40 backdrop-blur-2xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 lg:px-6 h-20 flex justify-between items-center">
          <div
            className="flex items-center gap-3 cursor-pointer"
            onClick={() => setView("landing")}
          >
            <div className="w-9 h-9 lg:w-10 lg:h-10 bg-blue-600 rounded-xl flex items-center justify-center font-black italic shadow-lg shadow-blue-600/20 text-base lg:text-lg">
              V
            </div>
            <h1 className="font-black italic text-xl lg:text-2xl tracking-tighter">
              VANTAGE <span className="text-blue-500">ESCROW</span>
            </h1>
          </div>

          <div className="flex gap-4 items-center">
            <ConnectWallet />
          </div>
        </div>
      </nav>

      <div className="w-full bg-yellow-950/20 border-y border-yellow-600/30 py-2 overflow-hidden">
        <div className="flex whitespace-nowrap animate-marquee">
          {/* First copy of text */}
          <span className="text-yellow-500 text-sm font-medium px-4">
            ⚠️ <strong>Note:</strong> This is a testnet phase and it only uses
            test tokens at the moment, but nevertheless it accepts real assets
            as well.
          </span>
          {/* Second copy of text (the one that follows the first) */}
          <span className="text-yellow-500 text-sm font-medium px-4">
            ⚠️ <strong>Note:</strong> This is a testnet phase and it only uses
            test tokens at the moment, but nevertheless it accepts real assets
            as well.
          </span>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header / Nav would be above here */}

        {/* ONBOARDING BLOCKS - Added max-width and centered */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          {/* CLIENT BLOCK */}
          <div className="group bg-blue-900/5 border border-blue-500/20 rounded-3xl p-8 hover:border-blue-500/40 transition-all duration-300 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-blue-400 font-black text-xs tracking-widest uppercase">
                Client Protocol
              </h3>
              <span className="bg-blue-500/20 text-blue-400 text-[10px] px-2 py-1 rounded-full font-bold">
                STEP 01
              </span>
            </div>
            <h2 className="text-white text-xl font-bold mb-4">
              Setup & Deposit
            </h2>
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-none w-6 h-6 rounded-full bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-[10px] text-blue-400 font-bold">
                  1
                </div>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Connect your wallet to the dashboard by switching to{" "}
                  <code className="text-pink-400">Arc network testnet</code>{" "}
                  first.
                </p>
              </div>
              <div className="flex gap-4">
                <div className="flex-none w-6 h-6 rounded-full bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-[10px] text-blue-400 font-bold">
                  2
                </div>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Connect / link your wallet to the{" "}
                  <a
                    href="https://t.me/vantagedAppBot"
                    className="text-blue-400 hover:underline"
                  >
                    Sentinel Bot
                  </a>{" "}
                  via Telegram using{" "}
                  <code className="text-pink-400">/start</code>.
                </p>
              </div>
              <div className="flex gap-4">
                <div className="flex-none w-6 h-6 rounded-full bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-[10px] text-blue-400 font-bold">
                  3
                </div>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Define your agreement in the Intent Engine below to lock funds
                  in escrow.
                </p>
              </div>
            </div>
          </div>

          {/* FREELANCER BLOCK */}
          <div className="group bg-emerald-900/5 border border-emerald-500/20 rounded-3xl p-8 hover:border-emerald-500/40 transition-all duration-300 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-emerald-400 font-black text-xs tracking-widest uppercase">
                Freelancer Protocol
              </h3>
              <span className="bg-emerald-500/20 text-emerald-400 text-[10px] px-2 py-1 rounded-full font-bold">
                STEP 02
              </span>
            </div>
            <h2 className="text-white text-xl font-bold mb-4">
              Submission & Pay
            </h2>
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-none w-6 h-6 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-[10px] text-emerald-400 font-bold">
                  1
                </div>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Ensure your wallet is linked to the bot to receive real-time
                  notifications.
                </p>
              </div>
              <div className="flex gap-4">
                <div className="flex-none w-6 h-6 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-[10px] text-emerald-400 font-bold">
                  2
                </div>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Upload deliverables directly to Telegram. Payment is released
                  upon client approval.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* INTENT ENGINE SECTION - Visual separator */}
        <div className="relative pt-8 border-t border-white/5">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#0a0a0a] px-4 text-[10px] text-white/20 font-black uppercase tracking-[0.3em]">
            Autonomous Intent Engine
          </div>
          {/* Your Intent Engine and Live Log component goes here */}
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      <div className="max-w-7xl mx-auto p-4 lg:p-8 flex flex-col lg:flex-row gap-6 lg:gap-10">
        {/* LEFT COLUMN: ACTIONS */}
        <div className="flex-1 w-full lg:w-2/3 space-y-6 lg:space-y-8">
          {/* 1. INTENT ENGINE */}
          <div className="bg-[#111113] border border-white/5 p-6 lg:p-10 rounded-[2rem] lg:rounded-[3rem] shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/5 blur-[80px] -z-10" />
            <h2 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.4em] mb-6 flex items-center gap-2">
              <span className="w-4 h-[1px] bg-blue-500" /> Intent Engine
            </h2>
            <textarea
              value={intent}
              onChange={(e) => setIntent(e.target.value)}
              placeholder="Describe the agreement..."
              className="w-full bg-transparent text-lg lg:text-xl font-bold outline-none resize-none h-28 lg:h-20 placeholder:text-white/5 break-words"
            />
            <div className="flex flex-col lg:flex-row gap-4 mt-8 pt-8 border-t border-white/5 items-center">
              <div className="w-full lg:w-auto bg-blue-500/10 text-blue-400 px-5 py-3 rounded-2xl text-[10px] lg:text-xs font-mono border border-blue-500/10 text-center truncate">
                RECIPIENT:{" "}
                {freelancerAddr ? `${freelancerAddr.slice(0, 12)}...` : "NONE"}
              </div>
              <button
                onClick={() => {
                  handleCreateAndFund();
                  addLog("Initiating Smart Contract Deployment...", "DEPLOY");
                }}
                disabled={!freelancerAddr || isTxLoading}
                className="w-full lg:w-auto lg:ml-auto bg-blue-600 hover:bg-blue-500 disabled:bg-gray-800 px-10 py-4 rounded-2xl font-black text-sm transition-all shadow-lg shadow-blue-600/10"
              >
                {isTxLoading ? "PROCESSING..." : "EXECUTE INTENT"}
              </button>
            </div>
          </div>

          {/* 2. SENTINEL BOT WORKSPACE */}
          <div className="bg-[#0D0D0F] border border-white/5 rounded-[2rem] lg:rounded-[3rem] overflow-hidden flex flex-col h-[450px] lg:h-[500px]">
            <div className="p-6 border-b border-white/5 bg-black/20 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-[#24A1DE] rounded-full flex items-center justify-center text-white">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.07-.2-.08-.06-.19-.04-.27-.02-.12.02-1.96 1.25-5.54 3.69-.52.36-1 .53-1.42.52-.47-.01-1.37-.26-2.03-.48-.82-.27-1.47-.42-1.42-.88.03-.24.35-.49.96-.75 3.76-1.63 6.27-2.71 7.53-3.23 3.58-1.48 4.32-1.74 4.81-1.74.11 0 .35.03.5.16.13.1.17.24.18.33.01.06.02.19 0 .33z" />
                  </svg>
                </div>
                <span className="text-xs font-black uppercase tracking-widest italic">
                  V_Sentinel_Bot
                </span>
              </div>
              <div className="flex gap-2 items-center">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-[10px] text-gray-500 font-mono">
                  LIVE_SYNC
                </span>
              </div>
            </div>

            <div className="flex-1 p-6 overflow-y-auto flex flex-col gap-4">
              {botStatus?.status === "WORK_SUBMITTED" ? (
                <div className="p-6 lg:p-8 bg-blue-500/10 border border-blue-500/20 rounded-[2rem] animate-in zoom-in duration-300">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                    <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">
                      Work Received
                    </p>
                  </div>
                  <div className="bg-black/60 p-4 rounded-2xl border border-white/5 mb-6">
                    <p className="text-xs text-white font-medium truncate">
                      {botStatus.fileName || "Final_Submission.pdf"}
                    </p>
                    <p className="text-[9px] text-gray-500 font-mono mt-1">
                      Ready for approval
                    </p>
                  </div>
                  <button
                    onClick={handleReleaseFunds}
                    className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] transition-all shadow-xl shadow-blue-600/20"
                  >
                    Approve & Release Payment
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full opacity-30 text-center">
                  <p className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">
                    Sentinel Monitoring Activity...
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: ACTIVITY LOG */}
        <div className="w-full lg:w-1/3">
          <div className="bg-[#111113] border border-white/5 rounded-[2rem] lg:rounded-[3rem] p-6 lg:p-8 h-[400px] lg:h-[855px] flex flex-col shadow-2xl">
            <h2 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-6 flex items-center justify-between">
              Live Activity Log
              {botStatus?.status === "WORK_SUBMITTED" && (
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              )}
            </h2>

            <div className="flex-1 overflow-y-auto space-y-4 custom-scrollbar pr-2">
              {logs.length > 0 ? (
                logs.map((log) => (
                  <div
                    key={log.id}
                    className="group border-b border-white/[0.03] pb-4 last:border-0 animate-in fade-in slide-in-from-top-2 duration-500"
                  >
                    <div className="flex justify-between text-[9px] font-mono mb-1">
                      <span
                        className={
                          log.type === "DEPLOY"
                            ? "text-blue-400"
                            : "text-emerald-400"
                        }
                      >
                        [{log.type}]
                      </span>
                      <span className="text-gray-600">{log.time}</span>
                    </div>
                    <p className="text-[11px] font-mono text-gray-300 group-hover:text-white transition-colors leading-relaxed">
                      {log.msg}
                    </p>
                  </div>
                ))
              ) : (
                <div className="h-full flex items-center justify-center opacity-20">
                  <p className="text-[10px] font-mono uppercase tracking-widest">
                    No activity detected
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* SUPPORT BUTTON */}
      <div className="fixed bottom-6 right-6 lg:bottom-10 lg:right-10 z-50 flex flex-col items-end gap-3 group">
        <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
          <div className="bg-black/80 backdrop-blur-md border border-white/10 px-4 py-2 rounded-xl">
            <p className="text-[10px] font-mono text-blue-400 uppercase tracking-[0.2em] font-bold">
              Support
            </p>
          </div>
        </div>
        <a
          href="https://t.me/Vinkcent"
          target="_blank"
          rel="noreferrer"
          className="relative w-14 h-14 lg:w-16 lg:h-16 bg-blue-600 rounded-full flex items-center justify-center shadow-2xl border border-white/10 hover:scale-110 transition-transform"
        >
          <span className="absolute inset-0 rounded-full bg-blue-400 animate-ping opacity-20" />
          <svg
            viewBox="0 0 24 24"
            className="w-7 h-7 lg:w-8 lg:h-8 text-white fill-current"
          >
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.13-.31-1.08-.66.02-.18.27-.36.74-.55 2.91-1.26 4.86-2.1 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z" />
          </svg>
          <div className="absolute top-0 right-0 w-3.5 h-3.5 bg-emerald-500 rounded-full border-4 border-[#0a0a0b]" />
        </a>
      </div>

      {showSuccess && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 lg:p-0">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/80 backdrop-blur-md animate-in fade-in duration-300"
            onClick={() => setShowSuccess(false)}
          />

          {/* Modal Card */}
          <div className="relative bg-[#111113] border border-white/10 w-full max-w-[450px] rounded-[2.5rem] p-8 lg:p-12 shadow-[0_0_100px_rgba(37,99,235,0.2)] animate-in zoom-in-95 duration-300">
            {/* Success Icon Animation */}
            <div className="flex justify-center mb-8">
              <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center border border-emerald-500/20">
                <div className="w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(16,185,129,0.4)]">
                  <svg
                    className="w-6 h-6 text-black"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="4"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
              </div>
            </div>

            <div className="text-center space-y-4">
              <h3 className="text-2xl font-black italic tracking-tighter text-white">
                INTENT <span className="text-blue-500">SECURED</span>
              </h3>
              <p className="text-gray-400 text-sm font-medium leading-relaxed">
                The Vantage Sentinel has successfully deployed your escrow
                contract to the Arc Mainnet.
              </p>
            </div>

            <div className="mt-10 space-y-4">
              <div className="bg-black/40 border border-white/5 p-4 rounded-2xl">
                <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1 font-bold">
                  Contract Address
                </p>
                <p className="text-[11px] font-mono text-blue-400 truncate">
                  {deployedAddress ||
                    "0x742d35Cc6634C0532925a3b844Bc454e4438f44e"}
                </p>
              </div>

              <button
                onClick={() => setShowSuccess(false)}
                className="w-full py-4 bg-white text-black rounded-2xl font-black text-sm hover:bg-gray-200 transition-colors shadow-xl"
              >
                VIEW DASHBOARD
              </button>

              <button
                onClick={() =>
                  window.open(
                    `https://explorer.arc.network/address/${deployedAddress}`,
                  )
                }
                className="w-full text-[10px] font-black text-gray-500 uppercase tracking-widest hover:text-white transition-colors"
              >
                View on Explorer
              </button>
            </div>

            {/* Decorative Glow */}
            <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-blue-600/5 blur-[100px] rounded-full -z-10" />
          </div>
        </div>
      )}

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #222;
          border-radius: 10px;
        }
        @keyframes scanline {
          from {
            transform: translateY(-100%);
          }
          to {
            transform: translateY(100%);
          }
        }

        .animate-scanline {
          animation: scanline 8s linear infinite;
        }

        
      `}</style>
    </main>
  );
}
