const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Set up a simple proxy route to forward the request to the S3 bucket
app.post("/file", async (req, res) => {
  const fileUrl = req.body.url;

  try {
    const response = await axios.get(fileUrl, {
      responseType: "arraybuffer", // This ensures we get binary data if needed
    });
    const text = Buffer.from(response.data).toString("utf8");

    res.status(200).json({ output: text }); // Send the file back to the frontend
  } catch (error) {
    console.error("Error fetching the file:", error);
    res.status(500).send("Error fetching the file");
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
