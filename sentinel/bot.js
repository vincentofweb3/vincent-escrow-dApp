const { Telegraf } = require("telegraf");
const { ethers } = require("ethers");
require("dotenv").config();

const bot = new Telegraf(process.env.BOT_TOKEN);
// Use a reliable WebSocket or HTTP provider
const provider = new ethers.JsonRpcProvider("https://rpc.testnet.arc.network");

// --- GLOBAL STATE ---
// We use a simple object for demo, but in production, these should be in a JSON file or DB
let userMap = {};
let activeEscrows = {};

// You can use your full JSON ABI here if you prefer
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
  // ... rest of your original ABI
  {
    inputs: [
      {
        internalType: "address",
        name: "_freelancer",
        type: "address",
      },
    ],
    name: "createEscrow",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "_implementation",
        type: "address",
      },
    ],
    stateMutability: "nonpayable",
    type: "constructor",
  },
  {
    inputs: [],
    name: "FailedDeployment",
    type: "error",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "balance",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "needed",
        type: "uint256",
      },
    ],
    name: "InsufficientBalance",
    type: "error",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "escrowAddress",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "buyer",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "freelancer",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "EscrowCreated",
    type: "event",
  },
  {
    inputs: [],
    name: "implementation",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
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
    const response = await fetch("http://localhost:3000/api/bot-status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    console.log(`📡 Dashboard updated: ${payload.status}`);
  } catch (err) {
    console.error(
      "❌ Dashboard Sync Failed (Is your Next.js app running?):",
      err.message,
    );
  }
};

// --- 2. LINKING (The /start command) ---
bot.start((ctx) => {
  try {
    const args = ctx.payload.split(" ");
    const wallet = args[0]?.toLowerCase();

    if (wallet && ethers.isAddress(wallet)) {
      userMap[wallet] = ctx.chat.id;
      console.log(`🔗 Linked Wallet: ${wallet} to ChatID: ${ctx.chat.id}`);
      ctx.replyWithHTML(
        `✅ <b>Wallet Linked!</b>\nNotifications for <code>${wallet}</code> are now active.`,
      );
    } else {
      ctx.reply(
        "Welcome! Please use the link from the dashboard to connect your wallet correctly.",
      );
    }
  } catch (e) {
    console.error("Start command error:", e);
  }
});

// --- 3. ESCROW LISTENER ---
const startEscrowListener = () => {
  console.log("📡 Sentinel monitoring for network events...");

  // Using .on listener is more efficient than polling with setInterval
  factoryContract.on(
    "EscrowCreated",
    (escrowAddress, buyer, freelancer, amount) => {
      const eAddr = escrowAddress.toLowerCase();
      const bAddr = buyer.toLowerCase();
      const fAddr = freelancer.toLowerCase();

      console.log(`📦 New Escrow: ${eAddr}`);

      activeEscrows[eAddr] = {
        buyerChatId: userMap[bAddr],
        freelancerChatId: userMap[fAddr],
        freelancerWallet: fAddr,
      };

      if (activeEscrows[eAddr].freelancerChatId) {
        bot.telegram
          .sendMessage(
            activeEscrows[eAddr].freelancerChatId,
            `🚀 <b>New Escrow Assigned!</b>\nContract: <code>${eAddr}</code>\n\nPlease upload your deliverable (Photo, Video, or Doc).`,
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
  // Find which escrow this sender belongs to
  const escrowEntry = Object.entries(activeEscrows).find(
    ([_, data]) => data.freelancerChatId === senderId,
  );

  if (!escrowEntry) {
    return ctx.reply(
      "❌ No active escrow found linked to this Telegram account.",
    );
  }

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

    // Forward to Buyer
    if (data.buyerChatId) {
      const caption = `<b>🔔 Work Submitted!</b>\nContract: <code>${addr}</code>\nFile: <code>${fileName}</code>`;
      const params = { caption, parse_mode: "HTML" };

      if (ctx.message.photo)
        await bot.telegram.sendPhoto(data.buyerChatId, fileId, params);
      else if (ctx.message.document)
        await bot.telegram.sendDocument(data.buyerChatId, fileId, params);
      else if (ctx.message.video)
        await bot.telegram.sendVideo(data.buyerChatId, fileId, params);
    }

    ctx.replyWithHTML(
      "📦 <b>Deliverable Delivered!</b>\nThe Buyer has been notified.",
    );

    // Sync to Frontend
    await notifyDashboard({
      status: "WORK_SUBMITTED",
      message: `Freelancer submitted: ${fileName}`,
      fileName: fileName,
      fileUrl: fileLink.href,
      escrowAddress: addr,
    });
  } catch (err) {
    console.error("File Processing Error:", err);
    ctx.reply("⚠️ Failed to process file. Ensure the file isn't too large.");
  }
});

// --- 5. API FOR FRONTEND ---
const express = require("express");
const app = express();
app.use(express.json());

app.post("/notify-release", (req, res) => {
  const { escrowAddress, amount } = req.body;
  const eAddr = escrowAddress?.toLowerCase();
  const data = activeEscrows[eAddr];

  if (data && data.freelancerChatId) {
    const msg = `💰 <b>Payment Released!</b>\nContract: <code>${escrowAddress}</code>\nAmount: <b>${amount || "1"} ARC</b>\n\nTransaction confirmed on Arc Network! 🚀`;
    bot.telegram.sendMessage(data.freelancerChatId, msg, {
      parse_mode: "HTML",
    });
  }
  res.sendStatus(200);
});

// --- 6. STARTUP ---
const PORT = 3001;
app.listen(PORT, () => console.log(`🤖 Bot API running on port ${PORT}`));

startEscrowListener();

bot.launch().then(() => {
  console.log("✅ Vantage Sentinel Bot is LIVE");
  notifyDashboard({
    status: "IDLE",
    message: "Sentinel Bot is active and monitoring the network.",
    escrowAddress: "N/A",
  });
});

// Enable graceful stop
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));

// const { Telegraf } = require("telegraf");
// const { ethers } = require("ethers");
// require("dotenv").config();

// const bot = new Telegraf(process.env.BOT_TOKEN);
// const provider = new ethers.JsonRpcProvider(process.env.PROVIDER_URL);

// // --- GLOBAL STATE FOR DYNAMIC FILENAME ---
// // This stores the filename expected from the dashboard/intent engine
// let expectedFileName = "Deliverable";

// // --- ORIGINAL REMIX ABI WITH EVENT HANDLING ---
// const VANTAGE_FACTORY_ABI = [
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
//     inputs: [
//       { internalType: "address", name: "_freelancer", type: "address" },
//       { internalType: "uint256", name: "_amount", type: "uint256" },
//     ],
//     name: "createEscrow",
//     outputs: [],
//     stateMutability: "payable",
//     type: "function",
//   },
//   {
//     inputs: [],
//     name: "getEscrows",
//     outputs: [{ internalType: "address[]", name: "", type: "address[]" }],
//     stateMutability: "view",
//     type: "function",
//   },

//   {
//   "anonymous": false,
//   "inputs": [
//     { "indexed": true, "internalType": "address", "name": "freelancer", "type": "address" },
//     { "indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256" }
//   ],
//   "name": "FundsReleased",
//   "type": "event"
// }
// ];

// const factoryAddress = process.env.FACTORY_ADDRESS;
// const factoryContract = new ethers.Contract(
//   factoryAddress,
//   VANTAGE_FACTORY_ABI,
//   provider,
// );

// // --- CONNECTION HEARTBEAT ---
// provider
//   .getBlockNumber()
//   .then((block) => {
//     console.log(`🌐 Connected to Arc Network! Current Block: ${block}`);
//     console.log(`📡 Watching Factory at: ${factoryAddress}`);
//   })
//   .catch((err) => {
//     console.error("❌ Connection Error: Check your PROVIDER_URL in .env");
//   });

// console.log("🚀 Sentinel is active and watching for new deals...");

// // --- FORCE RE-SCAN OF RECENT BLOCKS ---
// async function scanRecentEvents() {
//   const currentBlock = await provider.getBlockNumber();
//   console.log(
//     `🔎 Scanning blocks ${currentBlock - 100} to ${currentBlock} for missed escrows...`,
//   );

//   const filter = factoryContract.filters.EscrowCreated();
//   const events = await factoryContract.queryFilter(
//     filter,
//     currentBlock - 100,
//     currentBlock,
//   );

//   events.forEach((event) => {
//     const { escrowAddress, buyer, freelancer, amount } = event.args;
//     console.log(`✨ Found existing Escrow in logs: ${escrowAddress}`);

//     const message = `🚀 *Vantage Escrow Found in History!*\n📍 *Contract:* \`${escrowAddress}\` \n💰 *Amount:* ${ethers.formatUnits(amount, 18)} ARC`;
//     bot.telegram.sendMessage(process.env.MY_CHAT_ID, message, {
//       parse_mode: "Markdown",
//     });
//   });
// }

// scanRecentEvents();

// // --- 1. LISTENING FOR NEW DEALS ---
// factoryContract.on(
//   "EscrowCreated",
//   async (escrowAddress, buyer, freelancer, amount) => {
//     console.log(`✅ New Escrow detected at ${escrowAddress}`);

//     const amountFormatted = ethers.formatUnits(amount, 18);

//     // CORRECTION: Using the globally tracked expectedFileName
//     const message = `🚀 *New Vantage Escrow Created!*
//     📍 *Contract:* \`${escrowAddress}\`
//     💰 *Amount:* ${amountFormatted} ARC

//     *Freelancer:* Please upload the **${expectedFileName}** here to trigger the review.`;

//     // 1. Notify Telegram
//     bot.telegram.sendMessage(process.env.MY_CHAT_ID, message, {
//       parse_mode: "Markdown",
//     });

//     // 2. Notify the Dashboard (The Bridge)
//     try {
//       await fetch("http://localhost:3000/api/bot-status", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({
//           status: "ESCROW_CREATED",
//           message: `Escrow contract verified on-chain. Awaiting ${expectedFileName} upload...`,
//           escrowAddress: escrowAddress,
//           timestamp: new Date().toISOString(),
//         }),
//       });
//       console.log("🖥️ Dashboard notified of new escrow.");
//     } catch (err) {
//       console.log("Note: Dashboard update failed (Next.js might be offline).");
//     }
//   },
// );

// // --- 2. LISTENING FOR THE DELIVERABLE (FILE UPLOAD) ---
// bot.on(["photo", "document"], async (ctx) => {
//   console.log("📂 Received a deliverable from user...");

//   let fileName = "File";
//   let fileType = "document";

//   if (ctx.message.document) {
//     fileName = ctx.message.document.file_name;
//     fileType = "document";
//   } else if (ctx.message.photo) {
//     fileName = "Image/Screenshot";
//     fileType = "image";
//   }

//   const feedback = `📦 *Deliverable Received!*\n\nI have captured **${fileName}**. I'm scanning it now and the dashboard has been updated. The Buyer has been notified to review and release funds.`;

//   ctx.replyWithMarkdown(feedback);

//   try {
//     await fetch("http://localhost:3000/api/bot-status", {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify({
//         status: "WORK_SUBMITTED",
//         message: `Freelancer submitted: ${fileName}`,
//         fileType: fileType,
//         fileName: fileName,
//         timestamp: new Date().toISOString(),
//       }),
//     });
//     console.log(`✅ Dashboard notified: ${fileName} submitted.`);
//   } catch (err) {
//     console.log(
//       "⚠️ Note: Dashboard API unreachable. Ensure your Next.js server is running.",
//     );
//   }
// });

// // ADDED: Endpoint for your Dashboard to tell the bot what file to expect
// // This is how you change "Deliverable" to "MTH 301.pdf" dynamically
// const express = require("express");
// const app = express();
// app.use(express.json());

// app.post("/set-expected-file", (req, res) => {
//   const { fileName } = req.body;
//   expectedFileName = fileName;
//   console.log(`🎯 Bot is now expecting: ${expectedFileName}`);
//   res.sendStatus(200);
// });

// app.listen(3001, () => console.log("🤖 Bot Metadata API running on port 3001"));

// bot.launch();
