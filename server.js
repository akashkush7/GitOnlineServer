require("dotenv").config();
const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();
const port = process.env.PORT || 5000;

app.use(
  cors({
    origin: ["http://localhost:3000", "https://code-online-nu.vercel.app"],
    methods: "GET, POST, PATCH, DELETE, HEAD",
    credentials: true,
  })
);
app.use(express.json());

async function pollForResult(url) {
  return new Promise((resolve, reject) => {
    const intervalId = setInterval(async () => {
      try {
        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "client-secret": process.env.CLIENT_SECRET,
          },
        });
        const data = await response.json();

        if (
          data.request_status.code === "REQUEST_COMPLETED" ||
          (data.request_status.code == "CODE_COMPILED" &&
            data.result.compile_status != "OK")
        ) {
          clearInterval(intervalId); // Stop polling
          resolve(data); // <-- Resolve the promise with result!
        }
      } catch (error) {
        clearInterval(intervalId);
        reject(error); // <-- Reject the promise on error
      }
    }, 2000);
  });
}
//To ping Backend
app.get("/", (req, res) => {
  res.send("Hello World");
});

// Set up a simple proxy route to forward the request to the S3 bucket
app.post("/execute", async (req, res) => {
  const { lang, source, input } = req.body;

  const response = await fetch(
    "https://api.hackerearth.com/v4/partner/code-evaluation/submissions/",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "client-secret": process.env.CLIENT_SECRET,
      },
      body: JSON.stringify({
        lang: lang,
        source: source,
        input: input,
      }),
    }
  );

  let data = await response.json();
  const result = await pollForResult(data.status_update_url);
  data = result;
  if (
    data.result.compile_status == "OK" &&
    data.result.run_status.status == "AC"
  ) {
    try {
      const response = await axios.get(data.result.run_status.output, {
        responseType: "arraybuffer", // This ensures we get binary data if needed
      });
      const text = Buffer.from(response.data).toString("utf8");

      res.status(200).json({ output: text }); // Send the file back to the frontend
    } catch (error) {
      console.error("Error fetching the file:", error);
      res.status(500).send("Error fetching the Output");
    }
  } else if (data.result.compile_status != "OK") {
    res.status(200).json({ output: data.result.compile_status });
  } else {
    res.status(200).json({
      output:
        data.result.run_status.stderr || data.result.run_status.status_detail,
    });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
