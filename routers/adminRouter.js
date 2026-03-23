const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");

// Admin routes
router.post("/find", adminController.findArticles);
router.post("/articleDetails", adminController.articleDetails);
router.get("/getClients", adminController.getClients);
router.post("/getClientKeywords", adminController.getClientKeywords);
router.post("/addToClient", adminController.addToClient);
router.post("/saveArticle", adminController.updateArticle);
router.get("/getKeywordList", adminController.getKeywordList);
router.delete("/deleteArticle", adminController.deleteArticle);

module.exports = router;
