// route.js
import { NextResponse } from "next/server";

let latestBotMessage = {
  status: "IDLE",
  message: "Sentinel Bot active.",
  timestamp: new Date().toISOString(),
};

export async function GET() {
  return NextResponse.json(latestBotMessage);
}

export async function POST(req) {
  try {
    const body = await req.json();

    // NEW LOGIC: If work was already submitted, don't let "Online" or "IDLE" hide it
    const isOverwritingSubmission =
      (body.status === "IDLE" || body.status === "Online") &&
      latestBotMessage.status === "WORK_SUBMITTED";

    if (isOverwritingSubmission) {
      // Just update the timestamp but KEEP the "WORK_SUBMITTED" status and file data
      latestBotMessage.timestamp = new Date().toISOString();
    } else {
      // Normal update
      latestBotMessage = {
        ...latestBotMessage,
        ...body,
        timestamp: new Date().toISOString(),
      };
    }

    // Forward to Bot for the actual blockchain release
    if (body.status === "ESCROW_RELEASED") {
      try {
        await fetch("http://localhost:3001/notify-release", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            escrowAddress: body.escrowAddress,
            amount: body.amount, // Ensure the bot gets the real amount
          }),
        });
      } catch (e) {
        console.error("Bot API unreachable");
      }
    }

    return NextResponse.json(latestBotMessage);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// import { NextResponse } from "next/server";

// // This global variable persists while the server is running
// let latestBotMessage = {
//   status: "IDLE",
//   message: "Node online. Awaiting intent...",
//   timestamp: new Date().toISOString()
// };

// // 1. GET: This is what your frontend 'useEffect' calls every 3 seconds
// export async function GET() {
//   return NextResponse.json(latestBotMessage);
// }

// // 2. POST: This is what the Bot or Frontend calls to update the status
// export async function POST(req) {
//   try {
//     const body = await req.json();

//     if (body.status === "IDLE" && latestBotMessage.status === "WORK_SUBMITTED") {
//        return NextResponse.json(latestBotMessage);
//     }

//     latestBotMessage = {
//       ...latestBotMessage,
//       ...body,
//       timestamp: new Date().toISOString(),
//     };

//     console.log("📝 Status Updated to:", latestBotMessage.status);

//     // Forward to Bot if it's a release
//     if (body.status === "ESCROW_RELEASED") {
//       try {
//         await fetch("http://localhost:3001/notify-release", {
//           method: "POST",
//           headers: { "Content-Type": "application/json" },
//           body: JSON.stringify({
//             escrowAddress: body.escrowAddress,
//             amount: body.amount
//           }),
//         });
//       } catch (e) {
//         console.error("Could not reach Bot API on port 3001");
//       }
//     }

//     return NextResponse.json(latestBotMessage);
//   } catch (error) {
//     return NextResponse.json({ error: error.message }, { status: 500 });
//   }
// }
