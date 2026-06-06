const { Telegraf } = require("telegraf");
const { ethers } = require("ethers");
require("dotenv").config();

const bot = new Telegraf(process.env.BOT_TOKEN);
const provider = new ethers.JsonRpcProvider("https://rpc.testnet.arc.network");

// State memory maps tracked by Job ID instead of contract address
let userMap = {};
let activeJobs = {};

const VANTAGE_ESCROW_ABI = [
  {
    "inputs": [
      { "internalType": "address", "name": "_provider", "type": "address" },
      { "internalType": "address", "name": "_evaluator", "type": "address" },
      { "internalType": "address", "name": "_token", "type": "address" },
      { "internalType": "uint256", "name": "_amount", "type": "uint256" }
    ],
    "name": "createJob",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "uint256", "name": "_jobId", "type": "uint256" }],
    "name": "fundJob",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "uint256", "name": "jobId", "type": "uint256" },
      { "indexed": true, "internalType": "address", "name": "client", "type": "address" },
      { "indexed": true, "internalType": "address", "name": "provider", "type": "address" }
    ],
    "name": "JobCreated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "uint256", "name": "jobId", "type": "uint256" },
      { "indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256" }
    ],
    "name": "JobFunded",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "uint256", "name": "jobId", "type": "uint256" },
      { "indexed": false, "internalType": "bool", "name": "approved", "type": "bool" }
    ],
    "name": "JobResolved",
    "type": "event"
  },
  {
    "inputs": [
      { "internalType": "uint256", "name": "_jobId", "type": "uint256" },
      { "internalType": "bool", "name": "_approved", "type": "bool" }
    ],
    "name": "resolveJob",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "uint256", "name": "_jobId", "type": "uint256" },
      { "internalType": "string", "name": "_deliverableHash", "type": "string" }
    ],
    "name": "submitWork",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "uint256", "name": "jobId", "type": "uint256" },
      { "indexed": false, "internalType": "string", "name": "deliverableHash", "type": "string" }
    ],
    "name": "WorkSubmitted",
    "type": "event"
  },
  {
    "inputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "name": "jobs",
    "outputs": [
      { "internalType": "address", "name": "client", "type": "address" },
      { "internalType": "address", "name": "provider", "type": "address" },
      { "internalType": "address", "name": "evaluator", "type": "address" },
      { "internalType": "address", "name": "token", "type": "address" },
      { "internalType": "uint256", "name": "amount", "type": "uint256" },
      { "internalType": "enum IERC8183.JobState", "name": "state", "type": "uint8" },
      { "internalType": "string", "name": "deliverableHash", "type": "string" }
    ],
    "stateMutability": "view",
    "type": "function"
  }
];

const escrowAddress = process.env.VANTAGE_ESCROW_ADDRESS;
const escrowContract = new ethers.Contract(
  escrowAddress,
  VANTAGE_ESCROW_ABI,
  provider
);

// --- 1. DASHBOARD SYNC ---
const notifyDashboard = async (payload) => {
  try {
    const response = await fetch(
      `${process.env.DASHBOARD_URL}/api/bot-status`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    console.log(`📡 Dashboard updated: ${payload.status}`);
  } catch (err) {
    console.error("❌ Dashboard Sync Failed:", err.message);
  }
};

// --- 2. LINKING ---
bot.start((ctx) => {
  try {
    const args = ctx.payload.split(" ");
    const wallet = args[0]?.toLowerCase();
    if (wallet && ethers.isAddress(wallet)) {
      userMap[wallet] = ctx.chat.id;
      ctx.replyWithHTML(
        `✅ <b>Wallet Linked!</b>\nNotifications for <code>${wallet}</code> are now active.`
      );
    } else {
      ctx.reply(
        "Welcome to Vantage Escrow! Use /start <wallet_address> to link your account..."
      );
    }
  } catch (e) {
    console.error("Start command error:", e);
  }
});

// --- 3. SINGLETON JOB EVENT LISTENER ---
const startEscrowListener = () => {
  console.log("📡 Sentinel monitoring Singleton for network events...");

  escrowContract.on("JobCreated", async (jobId, client, providerAddress) => {
    try {
      const idStr = jobId.toString();
      const bAddr = client.toLowerCase();
      const fAddr = providerAddress.toLowerCase();

      // Fetch additional job structural details straight from the smart contract view function
      const jobDetails = await escrowContract.jobs(jobId);
      const formattedAmount = ethers.formatEther(jobDetails.amount);

      console.log(`📦 New Singleton Job ID: ${idStr} | Amount: ${formattedAmount} USDC/ARC`);

      activeJobs[idStr] = {
        buyerChatId: userMap[bAddr],
        freelancerChatId: userMap[fAddr],
        freelancerWallet: fAddr,
        amount: formattedAmount,
      };

      if (activeJobs[idStr].freelancerChatId) {
        bot.telegram
          .sendMessage(
            activeJobs[idStr].freelancerChatId,
            `🚀 <b>New Escrow Job Assigned!</b>\nJob ID: <code>#${idStr}</code>\nAmount: <b>${formattedAmount} tokens</b>\n\nPlease upload your deliverable directly to this bot context.`,
            { parse_mode: "HTML" }
          )
          .catch((e) => console.error("Telegram Send Error:", e.message));
      }
    } catch (err) {
      console.error("Error running JobCreated background execution tasks:", err);
    }
  });
};

// --- 4. FILE HANDLING ---
bot.on(["photo", "document", "video"], async (ctx) => {
  const senderId = ctx.chat.id;
  const jobEntry = Object.entries(activeJobs).find(
    ([_, data]) => data.freelancerChatId === senderId
  );

  if (!jobEntry) return ctx.reply("❌ No active escrow jobs found linked to this Telegram account.");
  const [jobId, data] = jobEntry;

  try {
    let fileId, fileName;
    if (ctx.message.photo) {
      fileId = ctx.message.photo[ctx.message.photo.length - 1].file_id;
      fileName = `Job_${jobId}_Submission.jpg`;
    } else if (ctx.message.document) {
      fileId = ctx.message.document.file_id;
      fileName = ctx.message.document.file_name;
    } else if (ctx.message.video) {
      fileId = ctx.message.video.file_id;
      fileName = ctx.message.video.file_name || `Job_${jobId}_Submission.mp4`;
    }

    const fileLink = await ctx.telegram.getFileLink(fileId);
    if (data.buyerChatId) {
      const caption = `<b>🔔 Work Submitted!</b>\nJob ID: <code>#${jobId}</code>\nFile: <code>${fileName}</code>`;

      if (ctx.message.photo) {
        await bot.telegram.sendPhoto(data.buyerChatId, fileId, { caption, parse_mode: "HTML" });
      } else if (ctx.message.video) {
        await bot.telegram.sendVideo(data.buyerChatId, fileId, { caption, parse_mode: "HTML" });
      } else {
        await bot.telegram.sendDocument(data.buyerChatId, fileId, { caption, parse_mode: "HTML" });
      }
    }

    ctx.replyWithHTML("📦 <b>Deliverable Delivered!</b>");

    await notifyDashboard({
      status: "WORK_SUBMITTED",
      message: `Freelancer submitted file for Job #${jobId}: ${fileName}`,
      fileName: fileName,
      fileUrl: fileLink.href,
      jobId: jobId,
    });
  } catch (err) {
    console.error("File Processing Error:", err);
  }
});

// --- 5. API FOR FRONTEND ---
const express = require("express");
const app = express();
app.use(express.json());

app.post("/notify-release", async (req, res) => {
  const { jobId, amount } = req.body;
  const idStr = jobId?.toString();
  const data = activeJobs[idStr];

  const finalAmount = amount || (data ? data.amount : "0.00");

  if (data && data.freelancerChatId) {
    const msg = `💰 <b>Payment Released!</b>\nJob ID: <code>#${idStr}</code>\nAmount: <b>${finalAmount} tokens</b>\n\nTransaction confirmed! 🚀`;

    bot.telegram
      .sendMessage(data.freelancerChatId, msg, { parse_mode: "HTML" })
      .catch((e) => console.error("Failed to notify freelancer:", e.message));

    console.log(`✅ Notified freelancer for Job ID: ${idStr}`);
  } else {
    console.log(`⚠️ Could not notify freelancer for Job #${idStr}. ChatId not in memory.`);
  }

  await notifyDashboard({
    status: "FINISH",
    message: `Release Confirmed! ${finalAmount} tokens unlocked.`,
    jobId: idStr,
  });

  res.sendStatus(200);
});

// --- 6. STARTUP ---
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`🤖 Bot API running on port ${PORT}`));

startEscrowListener();
bot.launch().then(() => console.log("✅ Vantage Sentinel Bot is LIVE"));



// const { Telegraf } = require("telegraf");
// const { ethers } = require("ethers");
// require("dotenv").config();

// const bot = new Telegraf(process.env.BOT_TOKEN);
// const provider = new ethers.JsonRpcProvider("https://rpc.testnet.arc.network");

// let userMap = {};
// let activeEscrows = {};

// const VANTAGE_FACTORY_ABI = [
//   {
//     anonymous: false,
//     inputs: [
//       { indexed: true, name: "escrowAddress", type: "address" },
//       { indexed: true, name: "buyer", type: "address" },
//       { indexed: true, name: "freelancer", type: "address" },
//       { indexed: false, name: "amount", type: "uint256" },
//     ],
//     name: "EscrowCreated",
//     type: "event",
//   },
//   {
//     inputs: [{ internalType: "address", name: "_freelancer", type: "address" }],
//     name: "createEscrow",
//     outputs: [],
//     stateMutability: "payable",
//     type: "function",
//   },
//   {
//     inputs: [
//       { internalType: "address", name: "_implementation", type: "address" },
//     ],
//     stateMutability: "nonpayable",
//     type: "constructor",
//   },
//   {
//     inputs: [],
//     name: "implementation",
//     outputs: [{ internalType: "address", name: "", type: "address" }],
//     stateMutability: "view",
//     type: "function",
//   },
// ];

// const factoryAddress = process.env.FACTORY_ADDRESS;
// const factoryContract = new ethers.Contract(
//   factoryAddress,
//   VANTAGE_FACTORY_ABI,
//   provider,
// );

// // --- 1. DASHBOARD SYNC ---
// const notifyDashboard = async (payload) => {
//   try {
//     const response = await fetch(
//       `${process.env.DASHBOARD_URL}/api/bot-status`,
//       {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify(payload),
//       },
//     );
//     if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
//     console.log(`📡 Dashboard updated: ${payload.status}`);
//   } catch (err) {
//     console.error("❌ Dashboard Sync Failed:", err.message);
//   }
// };

// // --- 2. LINKING ---
// bot.start((ctx) => {
//   try {
//     const args = ctx.payload.split(" ");
//     const wallet = args[0]?.toLowerCase();
//     if (wallet && ethers.isAddress(wallet)) {
//       userMap[wallet] = ctx.chat.id;
//       ctx.replyWithHTML(
//         `✅ <b>Wallet Linked!</b>\nNotifications for <code>${wallet}</code> are now active.`,
//       );
//     } else {
//       ctx.reply(
//         "Welcome to Vantage Escrow! Use /start <wallet_address> to link your account...",
//       );
//     }
//   } catch (e) {
//     console.error("Start command error:", e);
//   }
// });

// // --- 3. ESCROW LISTENER ---
// const startEscrowListener = () => {
//   console.log("📡 Sentinel monitoring for network events...");
//   factoryContract.on(
//     "EscrowCreated",
//     (escrowAddress, buyer, freelancer, amount) => {
//       const eAddr = escrowAddress.toLowerCase();
//       const bAddr = buyer.toLowerCase();
//       const fAddr = freelancer.toLowerCase();

//       // FIX: Define formattedAmount BEFORE using it
//       const formattedAmount = ethers.formatEther(amount);

//       console.log(`📦 New Escrow: ${eAddr} | Amount: ${formattedAmount} ARC`);

//       activeEscrows[eAddr] = {
//         buyerChatId: userMap[bAddr],
//         freelancerChatId: userMap[fAddr],
//         freelancerWallet: fAddr,
//         amount: formattedAmount, // Now correctly stored
//       };

//       if (activeEscrows[eAddr].freelancerChatId) {
//         bot.telegram
//           .sendMessage(
//             activeEscrows[eAddr].freelancerChatId,
//             `🚀 <b>New Escrow Assigned!</b>\nContract: <code>${eAddr}</code>\nAmount: <b>${formattedAmount} ARC</b>\n\nPlease upload your deliverable.`,
//             { parse_mode: "HTML" },
//           )
//           .catch((e) => console.error("Telegram Send Error:", e.message));
//       }
//     },
//   );
// };

// // --- 4. FILE HANDLING ---
// bot.on(["photo", "document", "video"], async (ctx) => {
//   const senderId = ctx.chat.id;
//   const escrowEntry = Object.entries(activeEscrows).find(
//     ([_, data]) => data.freelancerChatId === senderId,
//   );

//   if (!escrowEntry)
//     return ctx.reply("❌ No active escrow found linked to this account.");
//   const [addr, data] = escrowEntry;

//   try {
//     let fileId, fileName;
//     if (ctx.message.photo) {
//       fileId = ctx.message.photo[ctx.message.photo.length - 1].file_id;
//       fileName = "Image_Submission.jpg";
//     } else if (ctx.message.document) {
//       fileId = ctx.message.document.file_id;
//       fileName = ctx.message.document.file_name;
//     } else if (ctx.message.video) {
//       fileId = ctx.message.video.file_id;
//       fileName = ctx.message.video.file_name || "Video_Submission.mp4";
//     }

//     const fileLink = await ctx.telegram.getFileLink(fileId);
//     if (data.buyerChatId) {
//       const caption = `<b>🔔 Work Submitted!</b>\nContract: <code>${addr}</code>\nFile: <code>${fileName}</code>`;

//       // FIX: Use the appropriate method for each file type
//       if (ctx.message.photo) {
//         await bot.telegram.sendPhoto(data.buyerChatId, fileId, {
//           caption,
//           parse_mode: "HTML",
//         });
//       } else if (ctx.message.video) {
//         await bot.telegram.sendVideo(data.buyerChatId, fileId, {
//           caption,
//           parse_mode: "HTML",
//         });
//       } else {
//         await bot.telegram.sendDocument(data.buyerChatId, fileId, {
//           caption,
//           parse_mode: "HTML",
//         });
//       }
//     }

//     ctx.replyWithHTML("📦 <b>Deliverable Delivered!</b>");

//     await notifyDashboard({
//       status: "WORK_SUBMITTED",
//       message: `Freelancer submitted: ${fileName}`,
//       fileName: fileName,
//       fileUrl: fileLink.href,
//       escrowAddress: addr,
//     });
//   } catch (err) {
//     console.error("File Processing Error:", err);
//   }
// });

// // --- 5. API FOR FRONTEND ---
// const express = require("express");
// const app = express();
// app.use(express.json());

// app.post("/notify-release", async (req, res) => {
//   const { escrowAddress, amount } = req.body;
//   const eAddr = escrowAddress?.toLowerCase();
//   const data = activeEscrows[eAddr];

//   // If amount wasn't sent in body, try to get it from memory
//   const finalAmount = amount || (data ? data.amount : "1");

//   if (data && data.freelancerChatId) {
//     // SUCCESS: We found the freelancer's Chat ID!
//     const msg = `💰 <b>Payment Released!</b>\nContract: <code>${escrowAddress}</code>\nAmount: <b>${finalAmount} ARC</b>\n\nTransaction confirmed! 🚀`;

//     bot.telegram
//       .sendMessage(data.freelancerChatId, msg, {
//         parse_mode: "HTML",
//       })
//       .catch((e) => console.error("Failed to notify freelancer:", e.message));

//     console.log(`✅ Notified freelancer for escrow: ${eAddr}`);
//   } else {
//     // FAIL: Bot doesn't know who this freelancer is (likely due to a restart)
//     console.log(
//       `⚠️ Could not notify freelancer for ${eAddr}. ChatId not in memory.`,
//     );
//   }

//   // FIX: Sync the "FINISH" status to the Live History UI
//   // await notifyDashboard({
//   //   status: "FINISH",
//   //   message: `Release Confirmed! ${finalAmount} ARC sent.`,
//   //   escrowAddress: eAddr,
//   // });

//   res.sendStatus(200);
// });

// // --- 6. STARTUP ---
// const PORT = process.env.PORT || 3001;
// app.listen(PORT, () => console.log(`🤖 Bot API running on port ${PORT}`));

// startEscrowListener();
// bot.launch().then(() => console.log("✅ Vantage Sentinel Bot is LIVE"));