const { queryDatabase } = require('../db');
const Article = require("../ArticleModel1");
const Article_fulltext = require("../article_fulltextModel");

exports.findArticles = async (req, res) => {
  try {
    const { pubdate, pubid } = req.body;
    console.log(req.body)

    if (!pubdate || !pubid) {
     return res.status(400).json({ message: "pubdate and pubid[] required" });
    }

    const data = await Article.find(
      {
        type: "PRINT",
        pubdate: pubdate,
        pubid: { $in: pubid },
      },
      {
        headline: 1,
        articleid: 1,
      }
    );

    return res.status(200).json(data);
  } catch (err) {
    console.error("Find API Error:", err);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

exports.articleDetails = async (req, res) => {
  try {
    console.log("Article Details Request Body:", req.body);
    const { articleid } = req.body;
    if (!articleid)
      return res.status(400).json({ message: "articleid is required" });

    const data = await Article.aggregate([
      { $match: { articleid, type: "PRINT" } },
      {
        $group: {
          _id: "$articleid",
          article: { $first: "$$ROOT" },
          clientArray: { $addToSet: "$clientname" },
          allKeywords: { $push: "$keyword" },
        },
      },

      {
        $project: {
          _id: 0,
          // destucetured article details
          headline: "$article.headline",
          subtitle: "$article.subtitle",
          publication: "$article.publication",
          pubdate: "$article.pubdate",
          ave: "$article.ave",
          articleid: "$article.articleid",
          md5id: "$article.md5id",
          headline: "$article.headline",
          subtitle: "$article.subtitle",
          type: "$article.type",
          captureddatetime: "$article.captureddatetime",
          pubdate: "$article.pubdate",
          lastupdated: "$article.lastupdated",
          date_time_acquired: "$article.date_time_acquired",
          userid: "$article.userid",
          numberofpages: "$article.numberofpages",
          pageorder: "$article.pageorder",
          pagenumber: "$article.pagenumber",
          area: "$article.area",
          imagename: "$article.imagename",
          imagedirectory: "$article.imagedirectory",
          htmldirectory: "$article.htmldirectory",
          url: "$article.url",
          publication: "$article.publication",
          pubid: "$article.pubid",
          city: "$article.city",
          journalist: "$article.journalist",
          circulation: "$article.circulation",
          category: "$article.category",
          newscategory: "$article.newscategory",
          language: "$article.language",
          rejected: "$article.rejected",
          reasonofrejection: "$article.reasonofrejection",
          qualification: "$article.qualification",
          frequcncy: "$article.frequcncy",
          primarypublication: "$article.primarypublication",
          ave: "$article.ave",
          articletype: "$article.articletype",
          filter_string: "$article.filter_string",
          sector: "$article.sector",
          pagename: "$article.pagename",
          noofpages: "$article.noofpages",
          isphoto: "$article.isphoto",
          iscolor: "$article.iscolor",
          ispremium: "$article.ispremium",
          showcase: "$article.showcase",
          region: "$article.region",
          clientArray: 1,
          keywordArray: {
            $setUnion: [
              {
                $map: {
                  input: {
                    $reduce: {
                      input: "$allKeywords",
                      initialValue: [],
                      in: { $concatArrays: ["$$value", "$$this"] },
                    },
                  },
                  as: "k",
                  in: "$$k.keyword",
                },
              },
              [],
            ],
          },
        },
      },
    ]);
    console.log("Article Details Data:", data);
    return res.json(data.length ? data[0] : {});
  } catch (err) {
    console.error("Article Details Error:", err);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};


exports.getClients = async (req, res) => {
  try {
    const query = `
             select clientprofile.clientid, clientprofile.name from clientprofile where status="366";
    `;

    const results = await queryDatabase(query);
    res.status(200).json(results);
  } catch (error) {
    // console.error("Error fetching publications:", error);
    res.status(500).json({ error: error });
  }
};

exports.getClientKeywords = async (req, res) => {
  try {
    const { clientid } = req.body;
    console.log(req.body);

    if (!clientid) {
      return res.status(400).json({ message: "clientid required" });
    }

    const query = `
      SELECT
        ck.ClientID,
        ck.KeywordID,
        ck.Category,
        ck.Type,
        ck.CompanyS,
        ck.BrandS,
        cp.Name
      FROM clientkeyword ck
      JOIN clientprofile cp
        ON ck.clientid = cp.clientid
      WHERE ck.clientid = ?;

    `;

    const results = await queryDatabase(query, [clientid]);
    res.status(200).json(results);

  } catch (error) {
    console.error("Error fetching client keywords:", error);
    res.status(500).json({ error: error.message });
  }
};


exports.
updateArticle = async (req, res) => {
  try {
    const { articleid, updates } = req.body;

    if (!articleid || !updates)
      return res
        .status(400)
        .json({ message: "articleid & updates are required" });

        console.log("articleid : ", articleid);
        console.log("updates: ", updates);
        
        
    // Allowed fields
    const allowed = [
      "headline",
      "subtitle",
      "iscolor",
      "isphoto",
      "ispremium",
      "userid",
      "sector"
    ];

    const safeUpdate = {};
    for (let key of allowed) {
      if (updates[key] !== undefined) safeUpdate[key] = updates[key];
    }
    console.log("Safe Update Data:", req.body);
    const updated = await Article.updateMany(
      { articleid: articleid },
      { $set: safeUpdate },
      { strict: false }
    );

    // 2️⃣ Page number update (array logic)
    if (updates.oldpagenumber && updates.newpagenumber) {
      const pageSet = {
        "pagenumber.$[page].pagenumber": updates.newpagenumber
      };

      if (updates.newpagename !== undefined ) {
        pageSet["pagenumber.$[page].pagename"] = updates.newpagename;
      }

      await Article.updateMany(
        { articleid },
        { $set: pageSet },
        {
          arrayFilters: [
            { "page.pagenumber": updates.oldpagenumber }
          ]
        }
      );
    }

    // ✅ ensure correct journalist format
    if (Array.isArray(updates.journalist)) {
      await Article.updateMany(
        { articleid },
        { $set: { journalist: updates.journalist } },
        { strict: false }
      );
    }


    let updateFT = {};
    if (safeUpdate.headline !== undefined)
      updateFT.headline = safeUpdate.headline;
    if (safeUpdate.subtitle !== undefined)
      updateFT.subtitle = safeUpdate.subtitle;
    if (updates.fulltext !== undefined)
      updateFT.fulltext = updates.fulltext;
      console.log("Updating Fulltext Article:", updateFT);
      await Article_fulltext.updateMany(
        { articleid: articleid },
        { $set: updateFT },
        { strict: false }
      );
    // }


    return res.json({ message: "Updated Successfully", updated });
  } catch (err) {
    console.error("Update Error:", err);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

exports.removeJournalistFromArticle = async (req, res) => {
  try {
    const { articleid, journalistName } = req.body;

    if (!articleid || !journalistName) {
      return res.status(400).json({
        message: "articleid and journalistName are required"
      });
    }

    console.log("Removing journalist:", journalistName);
    console.log("From article:", articleid);

    const result = await Article.updateMany(
      { articleid },
      {
        $pull: {
          journalist: { journalist: journalistName }
        }
      }
    );

    return res.json({
      message: "Journalist removed successfully",
      modifiedCount: result.modifiedCount
    });

  } catch (err) {
    console.error("Remove Journalist Error:", err);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

// exports.
// updatePage = async (req, res) => {
//   try {
//     const { articleid, updates } = req.body;

//     if (!articleid || !updates)
//       return res
//         .status(400)
//         .json({ message: "articleid & updates are required" });

    
//     // 2️⃣ Page number update (array logic)
//     if (updates.oldpagenumber && updates.newpagenumber) {
//       const pageSet = {
//         "pagenumber.$[page].pagenumber": updates.newpagenumber
//       };

//       if (updates.newpagename) {
//         pageSet["pagenumber.$[page].pagename"] = updates.newpagename;
//       }

//       await Article.updateMany(
//         { articleid },
//         { $set: pageSet },
//         {
//           arrayFilters: [
//             { "page.pagenumber": updates.oldpagenumber }
//           ]
//         }
//       );
//     }

//     // // 2️⃣ journalist update (array logic)
//     // 🟢 Journalist update (find old journalist → replace with new)
//     // if (updates.oldjournalist && updates.newjournalist) {
//     //   await Article.updateMany(
//     //     { articleid },
//     //     {
//     //       $set: {
//     //         "journalist.$[j].journalist": updates.newjournalist
//     //       }
//     //     },
//     //     {
//     //       arrayFilters: [
//     //         { "j.journalist": updates.oldjournalist }
//     //       ]
//     //     }
//     //   );

//     //   // 🔁 Keep fulltext in sync
//     //   await Article.updateMany(
//     //     { articleid },
//     //     { $set: { journalist: updates.newjournalist } },
//     //     { strict: false }
//     //   );
//     // }


//     // if (updates.oldjournalist ) {
//     //   const journalistSet = {
//     //     "journalist.$[page].journalist": updates.newjournalist
//     //   };

//     //   await Article.updateMany(
//     //     { articleid },
//     //     { $set: journalistSet },
//     //     {
//     //       arrayFilters: [
//     //         { "page.pagenumber": updates.oldpagenumber }
//     //       ]
//     //     }
//     //   );
//     // }

//     // if (safeUpdate.headline || safeUpdate.subtitle) {
//       let updateFT = {};
//       if (safeUpdate.headline) updateFT.headline = safeUpdate.headline;
//       if (safeUpdate.subtitle) updateFT.subtitle = safeUpdate.subtitle;
//       updateFT.fulltext = updates.fulltext;
//       console.log("Updating Fulltext Article:", updateFT);
//       await Article_fulltext.updateMany(
//         { articleid: articleid },
//         { $set: updateFT },
//         { strict: false }
//       );
//     // }

//     return res.json({ message: "Updated Page Successfully", updated });
//   } catch (err) {
//     console.error("Update Error:", err);
//     return res.status(500).json({ message: "Internal Server Error" });
//   }
// };

// exports.addToClient = async (req, res) => {
//   try {
//     const { articleid, client, userid } = req.body;
//     // client = [{ clientid, clientname, keyword = {} }]

//     if (!articleid || client.length == 0 || !userid)
//       return res
//         .status(400)
//         .json({ message: "articleid & clientid are required" });
//     let existingArticleList = await Article.find({ articleid });
//     if (existingArticleList.length == 0) {
//       return res.status(404).json({ message: "Article not found" });
//     }
//     let existingArticle = null;
//     let newArticleData = {};
//     let results = [];
//     for (const c of client) {
//       const { clientid, clientname, keyword } = c;
//       if (
//         existingArticleList.some((article) => article.clientid === clientid)
//       ) {
//         existingArticle = existingArticleList.find(
//           (article) => article.clientid === clientid
//         );
//         newArticleData = existingArticle.toObject();
//         for (const kw of keyword) {
//         kStatus = existingArticle.keyword.find(
//           (k) => k.keyword == kw.keyword
//         );
//         if (!existingArticle.keyword.some((k) => k.keyword === kw.keyword)) {
//           newArticleData.keyword.push(kw);
//         } else {
//           newArticleData.keyword = existingArticle.keyword.map((k) =>
//             k.keyword === kw.keyword ? kw : k
//           );
//         }
//       }
//         delete newArticleData._id;
//         await Article.updateMany(
//           { _id: existingArticle._id },
//           { $set: newArticleData },
//           { strict: false }
//         );
//         results.push({ clientid, status: "updated" });
//       } else {
//         existingArticle = existingArticleList[0];
//         newArticleData = existingArticle.toObject();
//         // update/reset client level data
//         delete newArticleData._id;
//         newArticleData.clientid = clientid;
//         newArticleData.clientname = clientname;
//         newArticleData.keyword = keyword ? keyword : [];
//         newArticleData.companysort = 0;
//         newArticleData.competitionsort = 0;
//         newArticleData.industrysort = 0;
//         newArticleData.rejected = 0;
//         newArticleData.reasonofrejection = "";
//         newArticleData.qualification = [];
//         newArticleData.mlData = [];
//         newArticleData.companyName = [];
//         newArticleData.userid = userid;

//         // add new article for the client
//         const newArticle = new Article(newArticleData);
//         await newArticle.save();
//         results.push({ clientid, status: "added" });
//       }

//       let fullTextArticle = await Article_fulltext.findOne({ articleid });
//       if (fullTextArticle) {
//         if (!fullTextArticle.clientidArray.includes(clientid)) {
//           fullTextArticle.clientidArray.push(clientid);
//           await fullTextArticle.save();
//         }
//       }
//     };
//     console.log("Add to Client Results:", results);
//     return res.json({ message: "article added Successfully", results });
//   } catch (err) {
//     console.error("Update Error:", err);
//     return res.status(500).json({ message: "Internal Server Error" });
//   }
// };
