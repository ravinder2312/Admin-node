const express = require("express");
const bodyParser = require("body-parser");
// const mysql = require("mysql");
const cors = require("cors");
const path = require("path");
// const upload = require("./controllers/articleController");
const publicationController = require("./controllers/publicationController");
const articleController = require("./controllers/articleController");
const additionalKeywordsController = require("./controllers/additionalKeywordsController");

const fs = require("fs");
const https = require("https");

const options = {
  key: fs.readFileSync("/etc/ssl/node/mykey.pem"),
  cert: fs.readFileSync("/etc/ssl/node/mycert.pem"),
};
// Initialize Express app
const app = express();

// Middleware
app.use(bodyParser.json());

// Serve uploaded files for testing (optional)
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// app.use(express.json());
// app.use(express.urlencoded({ extended: true }))
app.use(cors());
app.use(function (req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  next();
});
// Routes
app.get("/getPublications", publicationController.getPublications);
app.post("/getArticles", articleController.getArticles);
app.post("/getArticlesByPageNo", articleController.getArticlesByPageNo);
app.post("/getFullTextById", articleController.getFullTextById);
app.post("/getFilterString", articleController.getFilterString);
app.put("/editArticle", articleController.editArticle);
app.put("/editPage", articleController.editPage);
app.put("/editJour", articleController.editJour);
app.post("/addJourId", articleController.addJourId);
app.post("/checkArticleJournalist", articleController.checkArticleJournalist);
app.post("/addArticleJournalist", articleController.addArticleJournalist);
app.delete(
  "/removeArticleJournalist",
  articleController.removeArticleJournalist
);
app.get("/getJournalists", articleController.getJournalists);
app.get("/getAllSector", articleController.getAllSector);
app.post("/getSubsectorById", articleController.getSubsectorByID);
app.post("/additionalKeywords", additionalKeywordsController.addKeywords);
// app.post("/upload-article-image", articleController.upload.single("file"), articleController.uploadArticleImage);
app.post("/getImageBase64", articleController.getImageBase64);

// Start the server
const PORT = process.env.PORT || 3800;
// const PORT = 3800;
process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0';

var server = https.createServer(options, app);
server.timeout = 600000;
server.listen(3800);
console.log(`Server is running on port 3800`);
// app.listen(PORT, () => {
//   console.log(`Server is running on port ${PORT}`);
// });
