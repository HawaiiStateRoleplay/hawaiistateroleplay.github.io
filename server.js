const express = require("express");
// Dynamic import safety check handling for older/newer node variants
const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));
const app = express();
const PORT = process.env.PORT || 3000;

// Serve your static web files out of the main directory structure automatically
app.use(express.static(__dirname));

// The backend processing router endpoint
app.get("/api/auth", async (req, res) => {
  const code = req.query.code;
  console.log(">>>> Received OAuth Code Request from Frontend:", code);

  if (!code) {
    console.log(
      ">>>> Aborted: No valid code argument provided in query parameters."
    );
    return res.status(400).json({ error: "No code parameter found" });
  }

  const CLIENT_ID = "1504636615031525447";
  const CLIENT_SECRET = "buW1f4nuGHMMRCpD7q3sus_8Mj_KCcCe"; // Make sure your exact portal secret key is pasted here!
  const REDIRECT_URI = "https://qv3c87.csb.app/staff-application.html";

  try {
    console.log(
      ">>>> Executing token exchange request with Discord servers..."
    );

    // 1. Send authentication handshake request payload to Discord
    const tokenResponse = await fetch("https://discord.com/api/oauth2/token", {
      method: "POST",
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        grant_type: "authorization_code",
        code: code,
        redirect_uri: REDIRECT_URI,
      }),
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
      console.error(">>>> Discord Token Exchange Error Reply:", tokenData);
      return res
        .status(400)
        .json({ error: tokenData.error_description || tokenData.error });
    }

    console.log(
      ">>>> Token successfully verified! Fetching user identity info profile..."
    );

    // 2. Query identity endpoints using authorized application credentials
    const userResponse = await fetch("https://discord.com/api/users/@me", {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    });

    const userData = await userResponse.json();
    console.log(`>>>> Profile found: ${userData.username} (${userData.id})`);

    // 3. Return target properties back down to webpage layer safely
    res.json({
      id: userData.id,
      username: userData.username,
      avatar: userData.avatar,
    });
  } catch (error) {
    console.error(">>>> System Crash Intercepted inside Server Router:", error);
    res
      .status(500)
      .json({ error: "Internal system error processing backend request." });
  }
});

// Run execution parameters
app.listen(PORT, () => {
  console.log(`===================================================`);
  console.log(`  Hawaii State RP Container Running on Port ${PORT} `);
  console.log(`===================================================`);
});
