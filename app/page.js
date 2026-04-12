"use client";

import { useState, useEffect } from "react";
import {
  useAccount,
  useConnect,
  useDisconnect,
  useWriteContract,
  useWaitForTransactionReceipt,
  useReadContract,
} from "wagmi";
import { injected } from "wagmi/connectors";
import { abi, factoryAbi, factoryAddress } from "../lib/contract";
import { parseEther, formatEther } from "viem";

export default function Home() {
  const [role, setRole] = useState(null);
  const [amount, setAmount] = useState("");
  const [freelancerAddr, setFreelancerAddr] = useState("");
  const [activeContract, setActiveContract] = useState(null);

  const { address, isConnected } = useAccount();
  const { connect } = useConnect();
  const { disconnect } = useDisconnect();

  const { writeContractAsync, data: txHash } = useWriteContract();
  const { isLoading: isTxLoading, isSuccess: isTxSuccess } =
    useWaitForTransactionReceipt({ hash: txHash });

  // --- READS ---
  const { data: escrows, refetch: refetchEscrows } = useReadContract({
    address: factoryAddress,
    abi: factoryAbi,
    functionName: "getEscrows",
  });

  const { data: contractClient } = useReadContract({
    address: activeContract,
    abi,
    functionName: "client",
    query: { enabled: !!activeContract },
  });

  const { data: isFunded, refetch: refetchFunded } = useReadContract({
    address: activeContract,
    abi,
    functionName: "isFunded",
    query: { enabled: !!activeContract },
  });

  const { data: isReleased, refetch: refetchReleased } = useReadContract({
    address: activeContract,
    abi,
    functionName: "isReleased",
    query: { enabled: !!activeContract },
  });

  const { data: isCompleted, refetch: refetchCompleted } = useReadContract({
    address: activeContract,
    abi,
    functionName: "isCompleted",
    query: { enabled: !!activeContract },
  });

  const { data: contractBalance, refetch: refetchBalance } = useReadContract({
    address: activeContract,
    abi,
    functionName: "amount",
    query: { enabled: !!activeContract },
  });

  // --- HANDLERS ---
  const handleCreate = async () => {
    if (!freelancerAddr) return;
    try {
      await writeContractAsync({
        address: factoryAddress,
        abi: factoryAbi,
        functionName: "createEscrow",
        args: [freelancerAddr],
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeposit = async () => {
    if (!amount || !activeContract) return;
    try {
      await writeContractAsync({
        address: activeContract,
        abi,
        functionName: "deposit",
        value: parseEther(amount),
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleRelease = async () => {
    if (!activeContract) {
      alert("Please select an escrow from the list first!");
      return;
    }

    try {
      await writeContractAsync({
        address: activeContract,
        abi: abi,
        functionName: "releasePayment",
      });
    } catch (error) {
      console.error("Release failed:", error);
    }
  };

  const handleWithdraw = async () => {
    try {
      await writeContractAsync({
        address: activeContract,
        abi,
        functionName: "withdrawFreelancer",
      });
    } catch (e) {
      console.error(e);
    }
  };

  // --- REFRESH LOGIC ---
  useEffect(() => {
    if (isTxSuccess) {
      const timer = setTimeout(() => {
        refetchEscrows();
        if (activeContract) {
          setAmount(""); 
          refetchFunded();
          refetchReleased();
          refetchCompleted();
          refetchBalance();
        }
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [isTxSuccess, activeContract, refetchEscrows, refetchFunded, refetchReleased, refetchCompleted, refetchBalance]);


  if (!role) {
  return (
    <main className="min-h-screen flex bg-black text-white overflow-hidden">
      <div
        onClick={() => setRole("client")}
        className="flex-1 flex flex-col justify-center items-center border-r border-white/5 hover:bg-blue-600/10 cursor-pointer transition-all duration-700 group relative"
      >
        <div className="z-10 text-center">
          <h1 className="text-7xl font-black italic group-hover:scale-110 transition-transform duration-500 text-blue-500 tracking-tighter">
            CLIENT
          </h1>
          <div className="mt-4 w-48 h-[2px] bg-blue-900/30 overflow-hidden relative mx-auto">
            <div className="absolute inset-0 bg-blue-500 shadow-[0_0_15px_#3b82f6] animate-scan" />
          </div>
          <p className="mt-4 text-[10px] font-bold tracking-[0.4em] text-blue-400/50 opacity-0 group-hover:opacity-100 transition-opacity uppercase">
            Deploy & Fund
          </p>
        </div>
        <div className="absolute inset-0 bg-blue-600/5 opacity-0 group-hover:opacity-100 transition-opacity blur-3xl" />
      </div>

      <div
        onClick={() => setRole("freelancer")}
        className="flex-1 flex flex-col justify-center items-center hover:bg-emerald-600/10 cursor-pointer transition-all duration-700 group relative"
      >
        <div className="z-10 text-center">
          <h1 className="text-7xl font-black italic group-hover:scale-110 transition-transform duration-500 text-emerald-500 tracking-tighter">
            FREELANCER
          </h1>
          <div className="mt-4 w-48 h-[2px] bg-emerald-900/30 overflow-hidden relative mx-auto">
            <div className="absolute inset-0 bg-emerald-500 shadow-[0_0_15px_#10b981] animate-scan" />
          </div>
          <p className="mt-4 text-[10px] font-bold tracking-[0.4em] text-emerald-400/50 opacity-0 group-hover:opacity-100 transition-opacity uppercase">
            Work & Withdraw
          </p>
        </div>
        <div className="absolute inset-0 bg-emerald-600/5 opacity-0 group-hover:opacity-100 transition-opacity blur-3xl" />
      </div>

      <style jsx global>{`
        @keyframes scan {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .animate-scan {
          animation: scan 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
      `}</style>
    </main>
  );
}

  return (
    <main className="min-h-screen bg-[#050505] text-white p-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex justify-between items-center bg-white/5 p-4 rounded-3xl border border-white/10">
          <button
            onClick={() => {
              setRole(null);
              setActiveContract(null);
            }}
            className="text-[10px] font-bold uppercase text-gray-500 hover:text-white transition-colors"
          >
            ← Switch Role
          </button>
          {!isConnected ? (
            <button
              onClick={() => connect({ connector: injected() })}
              className="bg-white text-black px-8 py-2 rounded-2xl font-black text-sm hover:bg-gray-200"
            >
              CONNECT WALLET
            </button>
          ) : (
            <div className="flex gap-4 items-center">
              <span className="text-[10px] font-mono text-blue-400">
                {address?.slice(0, 6)}...{address?.slice(-4)}
              </span>
              <button
                onClick={() => disconnect()}
                className="text-[10px] text-red-500 font-bold hover:underline"
              >
                Exit
              </button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-4 bg-white/5 p-6 rounded-[2rem] border border-white/10 h-[600px] flex flex-col overflow-hidden">
            <h2 className="text-xl font-black italic mb-6">ESCROW LIST</h2>
            <div className="flex-1 overflow-y-auto mb-4 pr-2">
              {escrows?.map((addr, i) => (
                <button
                  key={i}
                  onClick={() => setActiveContract(addr)}
                  className={`w-full text-left p-4 mb-2 rounded-2xl border transition-all ${
                    activeContract === addr
                      ? "bg-blue-600 border-blue-400"
                      : "bg-white/5 border-transparent hover:border-white/20"
                  }`}
                >
                  <p className="text-[11px] font-mono truncate">{addr}</p>
                </button>
              ))}
            </div>

            {/* TESTER TOOLKIT ADDED HERE */}
            <div className="p-4 bg-white/5 border border-dashed border-white/20 rounded-2xl">
              <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest mb-3">Tester Toolkit</p>
              <div className="flex flex-col gap-2">
                <a 
                  href="https://faucet.circle.com/" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-[10px] bg-white/10 hover:bg-white/20 p-2 rounded-lg text-center font-mono block transition-colors"
                >
                  Get Test Tokens ↗
                </a>
              </div>
            </div>
          </div>

          <div className="lg:col-span-8 space-y-6">
            {role === "client" && (
              <div className="bg-blue-600/10 p-6 rounded-[2rem] border border-blue-500/20">
                <div className="flex gap-3">
                  <input
                    placeholder="Freelancer Wallet Address"
                    value={freelancerAddr}
                    onChange={(e) => setFreelancerAddr(e.target.value)}
                    className="flex-1 bg-black/60 border border-white/10 p-4 rounded-2xl text-sm font-mono outline-none focus:border-blue-500"
                  />
                  <button
                    onClick={handleCreate}
                    disabled={isTxLoading}
                    className="bg-blue-600 px-10 rounded-2xl font-black hover:bg-blue-500"
                  >
                    {isTxLoading ? "..." : "DEPLOY"}
                  </button>
                </div>
              </div>
            )}

            {activeContract ? (
              <div className="bg-white/5 p-10 rounded-[2.5rem] border border-white/10">
                <div className="flex justify-between items-start mb-10">
                  <h2 className="text-4xl font-black italic uppercase">Workspace</h2>
                  <div className="flex flex-col items-end gap-2">
                    {isReleased && !isCompleted && (
                      <div className="bg-emerald-500/20 text-emerald-400 px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-emerald-500/30">
                        ✓ Payment Released
                      </div>
                    )}
                    <div
                      className={`px-6 py-2 rounded-full text-[10px] font-black ${
                        isCompleted
                          ? "bg-emerald-500 text-black"
                          : isReleased
                          ? "bg-blue-500 text-white"
                          : isFunded
                          ? "bg-amber-500 text-black"
                          : "bg-gray-600 text-white"
                      }`}
                    >
                      {isCompleted ? "FINISHED" : isReleased ? "RELEASED" : isFunded ? "FUNDED" : "EMPTY"}
                    </div>
                  </div>
                </div>

                <div className="bg-black/40 p-8 rounded-3xl border border-white/5 mb-10">
                  <p className="text-[10px] text-gray-500 uppercase font-bold mb-2 tracking-widest text-blue-400">
                    Escrow Balance
                  </p>
                  <p className="text-6xl font-black tracking-tighter">
                    {contractBalance ? formatEther(contractBalance) : "0.00"}{" "}
                    <span className="text-sm">USDC</span>
                  </p>
                  {contractClient && (
                    <p className="text-[10px] text-gray-600 mt-4 font-mono">
                      Verified Client: {contractClient}
                    </p>
                  )}
                </div>

                {role === "client" ? (
                  <>
                    {!isFunded && (
                      <div className="space-y-4">
                        <input
                          placeholder="0.00"
                          type="number"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          className="w-full bg-white/5 border border-white/10 p-8 rounded-3xl text-5xl font-black text-center outline-none focus:border-blue-500"
                        />
                        <button
                          onClick={handleDeposit}
                          disabled={isTxLoading}
                          className="w-full bg-blue-600 py-8 rounded-3xl font-black text-2xl uppercase hover:bg-blue-500"
                        >
                          {isTxLoading ? "Processing..." : "Fund Contract"}
                        </button>
                      </div>
                    )}
                    {isFunded && !isReleased && (
                      <button
                        onClick={handleRelease}
                        disabled={isTxLoading}
                        className="w-full bg-blue-600 py-8 rounded-3xl font-black text-2xl uppercase hover:bg-blue-500 shadow-xl shadow-blue-600/20"
                      >
                        {isTxLoading ? "Confirming Release..." : "Release to Freelancer"}
                      </button>
                    )}
                    {isReleased && !isCompleted && (
                      <div className="p-8 border border-dashed border-white/10 rounded-3xl text-center">
                        <p className="text-gray-500 text-xs font-bold uppercase">
                          Payment has been authorized. Waiting for freelancer to withdraw.
                        </p>
                      </div>
                    )}
                  </>
                ) : (
                  isFunded &&
                  !isCompleted &&
                  (!isReleased ? (
                    <div className="p-10 border-2 border-dashed border-white/10 rounded-[2rem] text-center">
                      <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">
                        Waiting for Client to release payment...
                      </p>
                    </div>
                  ) : (
                    <button
                      onClick={handleWithdraw}
                      disabled={isTxLoading}
                      className="w-full bg-emerald-500 py-10 rounded-3xl font-black text-3xl text-black uppercase hover:bg-emerald-400 transition-all shadow-xl shadow-emerald-500/20"
                    >
                      {isTxLoading ? "Transferring..." : "Withdraw Funds"}
                    </button>
                  ))
                )}

                {isCompleted && (
                  <div className="p-10 bg-emerald-500/10 border border-emerald-500/20 rounded-[2rem] text-center">
                    <p className="text-emerald-500 font-black text-xl italic uppercase">
                      Transaction Complete
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="h-[400px] flex flex-col justify-center items-center bg-white/2 rounded-[2.5rem] border border-dashed border-white/10 text-gray-700">
                <p className="uppercase tracking-[0.3em] text-[10px] font-bold">
                  Select a contract address
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}