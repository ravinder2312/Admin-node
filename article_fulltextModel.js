const mongoose = require("mongoose");

const modelSchema = new mongoose.Schema(
  {
    // Primary Identifiers
    articleid: String,
    guid: String,
    article_type: String,  

    // Clients
    clientidArray: [String],

    // Content
    headline: String,
    subtitle: String,
    fulltext: String,

    // Pubdate
    pubdateRange: Date,         // { "$date": "2025-05-31T18:30:28.000Z" }

    // Embedding
    embedding_text: String,
    embedding: Array,           // vector embedding (float array)

    // Flexible fields
    publication: String,
  },
  {
    collection: "article_fulltext_fe",
    strict: false          
  }
);

module.exports = mongoose.model("article_fulltext_fe", modelSchema);
