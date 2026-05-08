const { Telegraf } = require("telegraf");
const { ethers } = require("ethers");
require("dotenv").config();

const bot = new Telegraf(process.env.BOT_TOKEN);
const provider = new ethers.JsonRpcProvider("https://rpc.testnet.arc.network");

let userMap = {};
let activeEscrows = {};

const VANTAGE_FACTORY_ABI = [
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "escrowAddress", type: "address" },
      { indexed: true, name: "buyer", type: "address" },
      { indexed: true, name: "freelancer", type: "address" },
      { indexed: false, name: "amount", type: "uint256" },
    ],
    name: "EscrowCreated",
    type: "event",
  },
  {
    inputs: [{ internalType: "address", name: "_freelancer", type: "address" }],
    name: "createEscrow",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "_implementation", type: "address" },
    ],
    stateMutability: "nonpayable",
    type: "constructor",
  },
  {
    inputs: [],
    name: "implementation",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
];

const factoryAddress = process.env.FACTORY_ADDRESS;
const factoryContract = new ethers.Contract(
  factoryAddress,
  VANTAGE_FACTORY_ABI,
  provider,
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
      },
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
        `✅ <b>Wallet Linked!</b>\nNotifications for <code>${wallet}</code> are now active.`,
      );
    } else {
      ctx.reply(
        "Welcome to Vantage Escrow! Use /start <wallet_address> to link your account...",
      );
    }
  } catch (e) {
    console.error("Start command error:", e);
  }
});

// --- 3. ESCROW LISTENER ---
const startEscrowListener = () => {
  console.log("📡 Sentinel monitoring for network events...");
  factoryContract.on(
    "EscrowCreated",
    (escrowAddress, buyer, freelancer, amount) => {
      const eAddr = escrowAddress.toLowerCase();
      const bAddr = buyer.toLowerCase();
      const fAddr = freelancer.toLowerCase();

      // FIX: Define formattedAmount BEFORE using it
      const formattedAmount = ethers.formatEther(amount);

      console.log(`📦 New Escrow: ${eAddr} | Amount: ${formattedAmount} ARC`);

      activeEscrows[eAddr] = {
        buyerChatId: userMap[bAddr],
        freelancerChatId: userMap[fAddr],
        freelancerWallet: fAddr,
        amount: formattedAmount, // Now correctly stored
      };

      if (activeEscrows[eAddr].freelancerChatId) {
        bot.telegram
          .sendMessage(
            activeEscrows[eAddr].freelancerChatId,
            `🚀 <b>New Escrow Assigned!</b>\nContract: <code>${eAddr}</code>\nAmount: <b>${formattedAmount} ARC</b>\n\nPlease upload your deliverable.`,
            { parse_mode: "HTML" },
          )
          .catch((e) => console.error("Telegram Send Error:", e.message));
      }
    },
  );
};

// --- 4. FILE HANDLING ---
bot.on(["photo", "document", "video"], async (ctx) => {
  const senderId = ctx.chat.id;
  const escrowEntry = Object.entries(activeEscrows).find(
    ([_, data]) => data.freelancerChatId === senderId,
  );

  if (!escrowEntry)
    return ctx.reply("❌ No active escrow found linked to this account.");
  const [addr, data] = escrowEntry;

  try {
    let fileId, fileName;
    if (ctx.message.photo) {
      fileId = ctx.message.photo[ctx.message.photo.length - 1].file_id;
      fileName = "Image_Submission.jpg";
    } else if (ctx.message.document) {
      fileId = ctx.message.document.file_id;
      fileName = ctx.message.document.file_name;
    } else if (ctx.message.video) {
      fileId = ctx.message.video.file_id;
      fileName = ctx.message.video.file_name || "Video_Submission.mp4";
    }

    const fileLink = await ctx.telegram.getFileLink(fileId);
    if (data.buyerChatId) {
      const caption = `<b>🔔 Work Submitted!</b>\nContract: <code>${addr}</code>\nFile: <code>${fileName}</code>`;

      // FIX: Use the appropriate method for each file type
      if (ctx.message.photo) {
        await bot.telegram.sendPhoto(data.buyerChatId, fileId, {
          caption,
          parse_mode: "HTML",
        });
      } else if (ctx.message.video) {
        await bot.telegram.sendVideo(data.buyerChatId, fileId, {
          caption,
          parse_mode: "HTML",
        });
      } else {
        await bot.telegram.sendDocument(data.buyerChatId, fileId, {
          caption,
          parse_mode: "HTML",
        });
      }
    }

    ctx.replyWithHTML("📦 <b>Deliverable Delivered!</b>");

    await notifyDashboard({
      status: "WORK_SUBMITTED",
      message: `Freelancer submitted: ${fileName}`,
      fileName: fileName,
      fileUrl: fileLink.href,
      escrowAddress: addr,
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
  const { escrowAddress, amount } = req.body;
  const eAddr = escrowAddress?.toLowerCase();
  const data = activeEscrows[eAddr];

  // If amount wasn't sent in body, try to get it from memory
  const finalAmount = amount || (data ? data.amount : "1");

  if (data && data.freelancerChatId) {
    const msg = `💰 <b>Payment Released!</b>\nContract: <code>${escrowAddress}</code>\nAmount: <b>${finalAmount} ARC</b>\n\nTransaction confirmed! 🚀`;
    bot.telegram.sendMessage(data.freelancerChatId, msg, {
      parse_mode: "HTML",
    });
  }

  // FIX: Sync the "FINISH" status to the Live History UI
  // await notifyDashboard({
  //   status: "FINISH",
  //   message: `Release Confirmed! ${finalAmount} ARC sent.`,
  //   escrowAddress: eAddr,
  // });

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
// // Use a reliable WebSocket or HTTP provider
// const provider = new ethers.JsonRpcProvider("https://rpc.testnet.arc.network");

// // --- GLOBAL STATE ---
// // We use a simple object for demo, but in production, these should be in a JSON file or DB
// let userMap = {};
// let activeEscrows = {};

// // You can use your full JSON ABI here if you prefer
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
//   // ... rest of your original ABI
//   {
//     inputs: [
//       {
//         internalType: "address",
//         name: "_freelancer",
//         type: "address",
//       },
//     ],
//     name: "createEscrow",
//     outputs: [],
//     stateMutability: "payable",
//     type: "function",
//   },
//   {
//     inputs: [
//       {
//         internalType: "address",
//         name: "_implementation",
//         type: "address",
//       },
//     ],
//     stateMutability: "nonpayable",
//     type: "constructor",
//   },
//   {
//     inputs: [],
//     name: "FailedDeployment",
//     type: "error",
//   },
//   {
//     inputs: [
//       {
//         internalType: "uint256",
//         name: "balance",
//         type: "uint256",
//       },
//       {
//         internalType: "uint256",
//         name: "needed",
//         type: "uint256",
//       },
//     ],
//     name: "InsufficientBalance",
//     type: "error",
//   },
//   {
//     anonymous: false,
//     inputs: [
//       {
//         indexed: true,
//         internalType: "address",
//         name: "escrowAddress",
//         type: "address",
//       },
//       {
//         indexed: true,
//         internalType: "address",
//         name: "buyer",
//         type: "address",
//       },
//       {
//         indexed: true,
//         internalType: "address",
//         name: "freelancer",
//         type: "address",
//       },
//       {
//         indexed: false,
//         internalType: "uint256",
//         name: "amount",
//         type: "uint256",
//       },
//     ],
//     name: "EscrowCreated",
//     type: "event",
//   },
//   {
//     inputs: [],
//     name: "implementation",
//     outputs: [
//       {
//         internalType: "address",
//         name: "",
//         type: "address",
//       },
//     ],
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
//     console.error(
//       "❌ Dashboard Sync Failed (Is your Next.js app running?):",
//       err.message,
//     );
//   }
// };

// // --- 2. LINKING (The /start command) ---
// bot.start((ctx) => {
//   try {
//     const args = ctx.payload.split(" ");
//     const wallet = args[0]?.toLowerCase();

//     if (wallet && ethers.isAddress(wallet)) {
//       userMap[wallet] = ctx.chat.id;
//       console.log(`🔗 Linked Wallet: ${wallet} to ChatID: ${ctx.chat.id}`);
//       ctx.replyWithHTML(
//         `✅ <b>Wallet Linked!</b>\nNotifications for <code>${wallet}</code> are now active.`,
//       );
//     } else {
//       ctx.reply(
//         "Welcome to VantageEscrowdApp! Please connect your wallet correctly",
//         "- As a Client, use /start 'YOUR_WALLET_ADDRESS' to connect your wallet to the bot",
//         "while as a freelancer, use /start 'YOUR_WALLET_ADDRESS' to recieve your funds",
//       );
//     }
//   } catch (e) {
//     console.error("Start command error:", e);
//   }
// });

// // --- 3. ESCROW LISTENER ---
// const startEscrowListener = () => {
//   console.log("📡 Sentinel monitoring for network events...");

//   // Using .on listener is more efficient than polling with setInterval
//   factoryContract.on(
//     "EscrowCreated",
//     (escrowAddress, buyer, freelancer, amount) => {
//       const eAddr = escrowAddress.toLowerCase();
//       const bAddr = buyer.toLowerCase();
//       const fAddr = freelancer.toLowerCase();

//       console.log(`📦 New Escrow: ${eAddr}`);

//       activeEscrows[eAddr] = {
//         buyerChatId: userMap[bAddr],
//         freelancerChatId: userMap[fAddr],
//         freelancerWallet: fAddr,
//         amount: formattedAmount,
//       };

//       if (activeEscrows[eAddr].freelancerChatId) {
//         bot.telegram
//           .sendMessage(
//             activeEscrows[eAddr].freelancerChatId,
//             `🚀 <b>New Escrow Assigned!</b>\nContract: <code>${eAddr}</code>\n\nPlease upload your deliverable (Photo, Video, or Doc).`,
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
//   // Find which escrow this sender belongs to
//   const escrowEntry = Object.entries(activeEscrows).find(
//     ([_, data]) => data.freelancerChatId === senderId,
//   );

//   if (!escrowEntry) {
//     return ctx.reply(
//       "❌ No active escrow found linked to this Telegram account.",
//     );
//   }

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

//     // Forward to Buyer
//     if (data.buyerChatId) {
//       const caption = `<b>🔔 Work Submitted!</b>\nContract: <code>${addr}</code>\nFile: <code>${fileName}</code>`;
//       const params = { caption, parse_mode: "HTML" };

//       if (ctx.message.photo)
//         await bot.telegram.sendPhoto(data.buyerChatId, fileId, params);
//       else if (ctx.message.document)
//         await bot.telegram.sendDocument(data.buyerChatId, fileId, params);
//       else if (ctx.message.video)
//         await bot.telegram.sendVideo(data.buyerChatId, fileId, params);
//     }

//     ctx.replyWithHTML(
//       "📦 <b>Deliverable Delivered!</b>\nThe Buyer has been notified.",
//     );

//     // Sync to Frontend
//     await notifyDashboard({
//       status: "WORK_SUBMITTED",
//       message: `Freelancer submitted: ${fileName}`,
//       fileName: fileName,
//       fileUrl: fileLink.href,
//       escrowAddress: addr,
//     });
//   } catch (err) {
//     console.error("File Processing Error:", err);
//     ctx.reply("⚠️ Failed to process file. Ensure the file isn't too large.");
//   }
// });

// // --- 5. API FOR FRONTEND ---
// const express = require("express");
// const app = express();
// app.use(express.json());

// app.post("/notify-release", (req, res) => {
//   const { escrowAddress, amount } = req.body;
//   const eAddr = escrowAddress?.toLowerCase();
//   const data = activeEscrows[eAddr];

//   if (data && data.freelancerChatId) {
//     const msg = `💰 <b>Payment Released!</b>\nContract: <code>${escrowAddress}</code>\nAmount: <b>${amount || "1"} ARC</b>\n\nTransaction confirmed on Arc Network! 🚀`;
//     bot.telegram.sendMessage(data.freelancerChatId, msg, {
//       parse_mode: "HTML",
//     });
//   }
//   res.sendStatus(200);
// });

// // --- 6. STARTUP ---
// const PORT = 3001;
// app.listen(PORT, () => console.log(`🤖 Bot API running on port ${PORT}`));

// startEscrowListener();

// bot.launch().then(() => {
//   console.log("✅ Vantage Sentinel Bot is LIVE");
//   notifyDashboard({
//     status: "IDLE",
//     message: "Sentinel Bot is active and monitoring the network.",
//     escrowAddress: "N/A",
//   });
// });

// // Enable graceful stop
// process.once("SIGINT", () => bot.stop("SIGINT"));
// process.once("SIGTERM", () => bot.stop("SIGTERM"));
