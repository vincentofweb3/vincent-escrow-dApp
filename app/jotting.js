if (view === "landing") {
  return (
    <main className="min-h-screen bg-[#020203] text-white relative overflow-x-hidden selection:bg-blue-500/30">
      
      {/* --- PERSISTENT BACKGROUND ELEMENTS --- */}
      <div className="fixed inset-0 z-0">
        <div 
          className="absolute inset-0 opacity-[0.1]"
          style={{
            backgroundImage: `linear-gradient(#3b82f6 1px, transparent 1px), linear-gradient(90deg, #3b82f6 1px, transparent 1px)`,
            backgroundSize: '60px 60px',
            maskImage: 'radial-gradient(ellipse at center, black, transparent 90%)',
            transform: 'perspective(1000px) rotateX(60deg) translateY(-100px)',
          }}
        />
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600/10 blur-[180px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-emerald-600/10 blur-[180px] rounded-full animate-pulse" />
      </div>

      {/* --- SECTION 1: HERO (THE HOOK) --- */}
      <section className="relative z-10 min-h-screen flex flex-col items-center justify-center p-6 border-b border-white/5">
        <div className="px-6 py-2 mb-12 border border-blue-500/30 rounded-full bg-blue-500/5 backdrop-blur-xl animate-fade-in">
          <span className="text-[10px] font-black tracking-[0.6em] text-blue-400 uppercase flex items-center gap-3">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
            Arc Network Native v2.0
          </span>
        </div>

        <h1 className="text-7xl md:text-[12rem] font-black italic tracking-tighter leading-[0.8] text-center mb-10 mix-blend-difference">
          <span className="block hover:translate-x-4 transition-transform duration-700">CODE IS</span>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-white to-emerald-400 drop-shadow-[0_0_50px_rgba(59,130,246,0.4)]">
            ARBITER.
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
              <svg className="w-8 h-8 group-hover:translate-x-2 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
            </span>
          </button>
        </div>

        {/* Floating Mouse Prompt */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-4 opacity-30 animate-bounce">
          <span className="text-[10px] font-black tracking-widest uppercase">Scroll to Explore</span>
          <div className="w-[1px] h-12 bg-gradient-to-b from-white to-transparent" />
        </div>
      </section>

      {/* --- SECTION 2: THE MECHANICS (WHY IT'S DYNAMIC) --- */}
      <section className="relative z-10 py-32 px-6 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
          <div className="space-y-12">
            <h2 className="text-5xl md:text-7xl font-black italic tracking-tighter">
              BEYOND <br /> <span className="text-blue-500 underline decoration-blue-500/30">STATIC DEALS.</span>
            </h2>
            <div className="space-y-8">
              {[
                { 
                  title: "Natural Language Intents", 
                  desc: "Stop wrestling with complex UIs. Type your deal in plain English and our proprietary parser converts it into a rigid Smart Contract instantly.",
                  icon: "✍️"
                },
                { 
                  title: "Real-time Telegram Arbiter", 
                  desc: "The 'Sentinel' bot acts as your 24/7 watchman, pushing transaction updates and dispute resolutions directly to your secure chat group.",
                  icon: "🤖"
                },
                { 
                  title: "Instant Arc Settlement", 
                  desc: "Leveraging Arc Network's sub-second finality for near-instant fund releases once milestones are met.",
                  icon: "⚡"
                }
              ].map((item, i) => (
                <div key={i} className="group p-8 bg-white/[0.02] border border-white/5 rounded-[2rem] hover:bg-white/[0.05] hover:border-blue-500/40 transition-all">
                  <div className="text-4xl mb-4">{item.icon}</div>
                  <h3 className="text-2xl font-black mb-3 italic tracking-tight text-blue-400">{item.title}</h3>
                  <p className="text-gray-400 font-medium leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* DYNAMIC VISUAL ELEMENT (Floating Cards) */}
          <div className="relative h-[600px] hidden lg:block">
            <div className="absolute top-0 right-0 w-80 h-[450px] bg-gradient-to-br from-blue-600/20 to-transparent border border-blue-500/20 rounded-[3rem] backdrop-blur-3xl animate-float p-8 rotate-3">
              <div className="w-full h-4 bg-blue-500/20 rounded-full mb-6" />
              <div className="space-y-4">
                <div className="w-[80%] h-2 bg-white/10 rounded-full" />
                <div className="w-[60%] h-2 bg-white/10 rounded-full" />
                <div className="w-full h-[150px] bg-black/40 rounded-2xl border border-white/5 mt-8 flex items-center justify-center">
                   <span className="text-[10px] font-black text-blue-500">SENTINEL_MONITOR_ACTIVE</span>
                </div>
              </div>
            </div>
            <div className="absolute bottom-0 left-0 w-80 h-[400px] bg-gradient-to-bl from-emerald-600/10 to-transparent border border-emerald-500/20 rounded-[3rem] backdrop-blur-3xl animate-float-delayed p-8 -rotate-6">
              <div className="flex justify-between items-center mb-10">
                <div className="w-12 h-12 bg-emerald-500 rounded-xl" />
                <div className="text-[10px] font-black">SECURE_PAYMENT</div>
              </div>
              <div className="text-4xl font-black italic mb-2 tracking-tighter">0.5 USDC</div>
              <div className="text-[10px] font-mono opacity-40">LOCKING_SEQUENCE_INITIATED...</div>
            </div>
          </div>
        </div>
      </section>

      {/* --- SECTION 3: THE PROTOCOL STATS --- */}
      <section className="relative z-10 py-32 bg-white/[0.01] border-y border-white/5">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-end gap-10 mb-20">
            <div>
              <h2 className="text-[10px] font-black text-blue-500 tracking-[0.5em] mb-4 uppercase">Infrastructure</h2>
              <p className="text-5xl font-black italic tracking-tighter">BATTLE-TESTED <br/> NETWORK METRICS.</p>
            </div>
            <p className="text-gray-500 max-w-sm font-medium italic">Arbiter is optimized for high-volume freelancers and DAOs requiring iron-clad security on the Arc ecosystem.</p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { label: "Total Volume", value: "$4.8M" },
              { label: "Secured Deals", value: "12.4K" },
              { label: "Avg Fee", value: "0.01%" },
              { label: "Bot Uptime", value: "99.9%" }
            ].map((stat, i) => (
              <div key={i} className="group relative">
                <div className="text-5xl font-black italic tracking-tighter mb-2 group-hover:text-blue-500 transition-colors">{stat.value}</div>
                <div className="text-[10px] font-black text-gray-600 uppercase tracking-widest">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* --- SECTION 4: FINAL CTA --- */}
      <section className="relative z-10 py-60 px-6 flex flex-col items-center">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-600/5 to-transparent pointer-events-none" />
        <h2 className="text-5xl md:text-8xl font-black italic text-center mb-16 tracking-tighter">
          READY TO <br/> <span className="text-blue-500">AUTOMATE TRUST?</span>
        </h2>
        <button 
          onClick={() => setView("dashboard")}
          className="px-16 py-8 bg-white text-black font-black text-2xl rounded-full hover:scale-110 transition-all shadow-[0_0_50px_rgba(255,255,255,0.2)]"
        >
          GET STARTED NOW
        </button>
      </section>

      {/* --- FOOTER --- */}
      <footer className="relative z-10 py-20 border-t border-white/5 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-black italic">A</div>
            <span className="font-black italic tracking-tighter">SECURE ARBITER</span>
          </div>
          <div className="flex gap-10 text-[10px] font-black text-gray-600 tracking-widest uppercase">
            <a href="#" className="hover:text-blue-500 transition-colors">Documentation</a>
            <a href="#" className="hover:text-blue-500 transition-colors">Telegram Bot</a>
            <a href="#" className="hover:text-blue-500 transition-colors">Audit Report</a>
          </div>
          <div className="text-gray-700 text-[10px] font-black">© 2026 ARC_LABS_CORE</div>
        </div>
      </footer>

      {/* CSS Animations */}
      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0) rotate(3deg); }
          50% { transform: translateY(-30px) rotate(5deg); }
        }
        @keyframes float-delayed {
          0%, 100% { transform: translateY(0) rotate(-6deg); }
          50% { transform: translateY(-40px) rotate(-8deg); }
        }
        .animate-float { animation: float 6s ease-in-out infinite; }
        .animate-float-delayed { animation: float-delayed 8s ease-in-out infinite; }
        .animate-fade-in { animation: fade-in 1.5s ease-out; }
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
      `}</style>
    </main>
  );
}


















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

  const { address, isConnected } = useAccount();
  const { connect } = useConnect();
  const { disconnect } = useDisconnect();

  const { writeContractAsync, data: txHash } = useWriteContract();
  const { isLoading: isTxLoading, isSuccess: isTxSuccess } =
    useWaitForTransactionReceipt({ hash: txHash });

  // --- CONTRACT READS ---
  const { data: escrows, refetch: refetchEscrows } = useReadContract({
    address: factoryAddress,
    abi: factoryAbi,
    functionName: "getEscrows",
  });

  const { data: isFunded } = useReadContract({
    address: activeContract,
    abi,
    functionName: "isFunded",
    query: { enabled: !!activeContract },
  });
  const { data: isReleased } = useReadContract({
    address: activeContract,
    abi,
    functionName: "isReleased",
    query: { enabled: !!activeContract },
  });
  const { data: isCompleted } = useReadContract({
    address: activeContract,
    abi,
    functionName: "isCompleted",
    query: { enabled: !!activeContract },
  });
  const { data: contractBalance } = useReadContract({
    address: activeContract,
    abi,
    functionName: "amount",
    query: { enabled: !!activeContract },
  });

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

  const handleCreateAndFund = async () => {
    if (!freelancerAddr || !amount) return;
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

  // --- LANDING VIEW ---
  if (view === "landing") {
    return (
      <main className="min-h-screen bg-[#020203] text-white relative overflow-x-hidden selection:bg-blue-500/30 font-sans">
        {/* TOP SYSTEM BAR */}
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
              <span className="text-[9px] font-mono text-blue-500">SYSTEM_NOMINAL</span>
            </div>
            <button
              onClick={() => setView("dashboard")}
              className="text-[10px] font-black bg-white text-black px-4 py-1.5 rounded uppercase hover:bg-blue-600 hover:text-white transition-all"
            >
              Connect Now
            </button>
          </div>
        </div>

        {/* HERO SECTION */}
        <section className="relative z-10 min-h-screen flex flex-col items-center justify-center pt-20 px-6">
          <div className="max-w-7xl w-full grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-7 space-y-8">
              <h1 className="text-5xl md:text-8xl font-black italic tracking-tighter leading-[0.85]">
                VANTAGE<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 via-white to-white/20">
                  ESCROW.
                </span>
              </h1>
              <p className="text-gray-400 text-lg md:text-2xl max-w-xl font-medium leading-relaxed">
                The high-fidelity settlement layer for the Arc Network.
              </p>
              <button
                onClick={() => setView("dashboard")}
                className="group relative px-12 py-6 bg-blue-600 rounded-2xl overflow-hidden hover:scale-105 transition-all shadow-[0_0_30px_rgba(59,130,246,0.2)]"
              >
                <span className="relative z-10 font-black text-xl flex items-center gap-3 text-white">
                  LAUNCH TERMINAL
                </span>
              </button>
            </div>

            {/* FLOATING CARDS FROM SECOND PICTURE */}
            <div className="lg:col-span-5 relative h-[500px]">
               {/* Sentinel Node Status Card */}
               <div className="absolute top-0 right-0 w-80 bg-gradient-to-br from-blue-600/20 to-transparent border border-blue-500/20 rounded-[2rem] backdrop-blur-3xl p-6 animate-float shadow-2xl">
                <div className="text-[10px] font-black text-blue-500 mb-4 flex items-center gap-2 uppercase">
                  <span className="w-2 h-2 bg-blue-500 rounded-full animate-ping" />
                  Sentinel_Node_Status
                </div>
                <div className="space-y-4">
                  <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full w-3/4 bg-blue-500/40" />
                  </div>
                  <p className="text-xs text-gray-400">Watchtower integration active for Arc Network.</p>
                </div>
              </div>

              {/* Asset Vault Card */}
              <div className="absolute bottom-10 left-0 w-72 bg-gradient-to-bl from-emerald-600/10 to-transparent border border-emerald-500/20 rounded-[2rem] backdrop-blur-3xl p-6 animate-float-delayed shadow-2xl">
                <div className="text-[10px] font-black text-emerald-400 mb-4 uppercase">Secure_Asset_Vault</div>
                <div className="text-4xl font-black italic text-white">0.50 <span className="text-xs text-blue-500">USDC</span></div>
                <div className="mt-4 p-3 bg-blue-500/10 rounded-xl border border-blue-500/20 text-[8px] font-bold text-blue-400 uppercase tracking-widest">
                  Awaiting Release...
                </div>
              </div>
            </div>
          </div>
        </section>

        <style jsx>{`
          @keyframes float {
            0%, 100% { transform: translateY(0) rotate(3deg); }
            50% { transform: translateY(-20px) rotate(3deg); }
          }
          @keyframes float-delayed {
            0%, 100% { transform: translateY(0) rotate(-6deg); }
            50% { transform: translateY(-15px) rotate(-6deg); }
          }
          .animate-float { animation: float 6s ease-in-out infinite; }
          .animate-float-delayed { animation: float-delayed 5s ease-in-out infinite; }
        `}</style>
      </main>
    );
  }

  // --- DASHBOARD VIEW ---
  return (
    <main className="min-h-screen bg-[#0A0A0B] text-slate-200 font-sans selection:bg-blue-500/30">
      <nav className="border-b border-white/5 bg-black/40 backdrop-blur-2xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex justify-between items-center">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setView("landing")}>
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center font-black italic text-lg">A</div>
            <h1 className="font-black italic text-2xl tracking-tighter">
              ARBITER <span className="text-blue-500">DASH</span>
            </h1>
          </div>

          <div className="flex gap-4 items-center">
            {isConnected ? (
              <div className="flex items-center gap-4 bg-white/5 px-5 py-2.5 rounded-2xl border border-white/10">
                <span className="text-xs font-mono text-blue-400 font-bold">
                  {address?.slice(0, 6)}...{address?.slice(-4)}
                </span>
                <button onClick={() => disconnect()} className="text-[10px] font-black text-red-500 uppercase">Disconnect</button>
              </div>
            ) : (
              <button onClick={() => connect({ connector: injected() })} className="bg-white text-black px-8 py-3 rounded-2xl font-black text-sm">
                CONNECT WALLET
              </button>
            )}
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto p-8 grid grid-cols-12 gap-10">
        {/* Main Workspace */}
        <div className="col-span-12 lg:col-span-8 space-y-8">
          <div className="bg-[#111113] border border-white/5 p-10 rounded-[3rem] shadow-2xl">
            <h2 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.4em] mb-6 flex items-center gap-2">
              <span className="w-4 h-[1px] bg-blue-500" /> System Intent Parser
            </h2>
            <textarea
              value={intent}
              onChange={(e) => setIntent(e.target.value)}
              placeholder="Ex: Send 0.5 USDC to 0x123..."
              className="w-full bg-transparent text-3xl font-bold outline-none resize-none h-40 placeholder:text-white/5"
            />
            <div className="flex flex-wrap gap-4 mt-8 pt-8 border-t border-white/5">
              <button onClick={handleCreateAndFund} disabled={!freelancerAddr || !amount || isTxLoading} className="ml-auto bg-blue-600 px-10 py-4 rounded-2xl font-black text-sm uppercase">
                {isTxLoading ? "Deploying..." : "Execute Agreement"}
              </button>
            </div>
          </div>

          {activeContract ? (
            <div className="bg-[#111113] border border-white/10 p-10 rounded-[3rem] shadow-2xl">
              <div className="flex justify-between items-start mb-12">
                <h3 className="text-4xl font-black italic tracking-tighter">WORKSPACE</h3>
                <div className="flex gap-3">
                  <StatusBadge label="Funded" active={isFunded} />
                  <StatusBadge label="Released" active={isReleased} />
                  <StatusBadge label="Settled" active={isCompleted} />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-black/40 p-8 rounded-[2rem] border border-white/5">
                   <p className="text-5xl font-black">{contractBalance ? formatEther(contractBalance) : "0.00"} <span className="text-blue-500 text-sm">USDC</span></p>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-[400px] border-2 border-dashed border-white/5 rounded-[3rem] flex items-center justify-center text-gray-600">
               <p className="font-black italic uppercase tracking-widest">Select a deal to enter workspace</p>
            </div>
          )}
        </div>

        {/* Ledger Sidebar */}
        <div className="col-span-12 lg:col-span-4">
          <div className="bg-[#111113] border border-white/5 p-8 rounded-[3rem] h-[750px] overflow-y-auto custom-scrollbar shadow-2xl">
            <h2 className="text-xs font-black italic tracking-widest text-gray-400 mb-8 uppercase">Ledger</h2>
            {escrows?.map((addr, i) => (
              <button key={i} onClick={() => setActiveContract(addr)} className={`w-full text-left p-6 rounded-[2rem] mb-4 border transition-all ${activeContract === addr ? "bg-blue-600 border-blue-400" : "bg-white/[0.03] border-transparent"}`}>
                <p className="text-[9px] font-black opacity-50 mb-1">TX_SERIAL_00{i+1}</p>
                <p className="text-xs font-mono font-bold truncate">{addr}</p>
              </button>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}