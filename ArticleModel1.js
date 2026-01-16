const mongoose = require("mongoose");

const modelSchema = new mongoose.Schema(
  {
    // Basic Identifiers
    articleid: String,
    md5id: String,

    // Client Info
    clientid: String,
    clientname: String,

    // Titles
    headline: String,
    subtitle: String,

    // Types
    type: String,          // PRINT / WEB
    articletype: String,

    // Dates
    pubdate: String,
    captureddatetime: String,
    lastupdated: String,
    date_time_acquired: String,
    createdAt: Date,

    // Publication Info
    publication: String,
    primarypublication: String,
    pubid: String,
    city: String,
    region: String,

    // Category / Classification
    area: String,
    circulation: String,
    category: String,
    newscategory: String,
    language: String,
    filter_string: String,
    frequcncy: String,
    sector: String,

    // Pages / Images (flattened arrays)
    numberofpages: String,
    noofpages: String,
    pagenumber: Array,      // [{ pagenumber, pagename }]
    pageorder: Array,       // [{ pageorder }]
    imagename: Array,       // [{ imagename }]
    imagedirectory: String,
    htmldirectory: String,

    // Journalists
    journalist: Array,      // [{ journalist }]

    // Keyword System (flat)
    keyword: Array,         // [{ keyword, keyid, keytpe... }]
    keyType: [String],
    companyName: [String],
    keywordIssue: [String],

    // ML Data
    mlData: Array,          // [{ keyType, prominent, company }]

    // Flags / Misc
    rejected: Number,
    showcase: String,
    ispremium: String,
    isphoto: String,
    iscolor: String,
    sentiment: String,
    sentimentReason: String,

    // Other Custom Fields
    tags: Array,
    qualification: {type: mongoose.Schema.Types.Mixed,},
    userid: String,
    pagename: String,       
  },
  {
    collection: "artice_fe",
    strict: false // allows dynamic fields
  }
);


module.exports = mongoose.model("artice_fe", modelSchema);
