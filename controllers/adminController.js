const { queryDatabase } = require('../db');
const Article = require("../ArticleModel1");
const Article_fulltext = require("../article_fulltextModel");
const sendDeletionMail = require("../mailer");


exports.findArticles = async (req, res) => {
  try {
    const { pubdate, pubid } = req.body;
    // console.log(req.body)

    if (!pubdate || !pubid) {
     return res.status(400).json({ message: "pubdate and pubid[] required" });
    }

    const pubidArr = pubid.map(String); // 🔑 FIX

    // const data = await Article.find(
    //   {
    //     type: "PRINT",
    //     pubdate: pubdate,
    //     pubid: { $in: pubid },
    //   },
    //   {
    //     headline: 1,
    //     articleid: 1,
    //   }
    // );

    const data = await Article.aggregate([
      {
        $match: {
          type: "PRINT",
          pubdate: pubdate,
          pubid: { $in: pubidArr }
        }
      },
      {
        $group: {
          _id: "$articleid",
          articleid: { $first: "$articleid" },
          headline: { $first: "$headline" }
        }
      },
      {
        $project: {
          // _id: 0,
          articleid: 1,
          headline: 1
        }
      }
    ]);

    // console.log("Articles Data:", data);
    // return res.json(data);
    // return res.json(data.length ? data[0] : {});

    return res.status(200).json(data);
  } catch (err) {
    console.error("Find API Error:", err);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

exports.articleDetails = async (req, res) => {
  try {
    // console.log("Article Details Request Body:", req.body);
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
        $lookup: {
          from: "article_fulltext_fe",
          localField: "_id",
          foreignField: "articleid",
          as: "fulltext",
        },
      },

      {
        $project: {
          _id: 0,
          // destucetured article details
          headline: "$article.headline",
          subtitle: "$article.subtitle",
          fulltext: { $arrayElemAt: ["$fulltext.fulltext", 0] },
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
          lastUpdatedUserid: "$article.lastUpdatedUserid",
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
    // console.log("Article Details Data:", data);
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

exports.getKeywordList = async (req, res) => {
  try {
    const query = `
             SELECT 
    keyword_master.Keyword AS name,
    keyword_master.filter_string,
    keyword_master.keyid AS id
FROM
    keyword_master
        JOIN
    clientkeyword ON keyword_master.keyid = clientkeyword.keywordid
        JOIN
    clientprofile ON clientprofile.clientid = clientkeyword.clientid
        AND clientprofile.deleted <> 1
        WHERE
    (clientprofile.status = 366
        OR clientprofile.status = 373
        OR clientprofile.status IS NULL);
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
    const { keyword } = req.body;
    // console.log(req.body);

    if (!keyword) {
      return res.status(400).json({ message: "keyword required" });
    }

    const query = `
      SELECT 
    keyword_master.keyid AS KeywordID,
    keyword_master.Keyword,
    keyword_master.filter_string,
    IFNULL(clientprofile.name, '') 'Clients',
    clientkeyword.filter AS filter,
    clientkeyword.clientid AS clientid,
    clientkeyword.type AS keytype,
    clientkeyword.companys AS companys,
    clientkeyword.category AS keycategory,
    clientkeyword.brands AS brands
FROM
    keyword_master
        JOIN
    clientkeyword ON keyword_master.keyid = clientkeyword.keywordid
        JOIN
    clientprofile ON clientprofile.clientid = clientkeyword.clientid
        AND clientprofile.deleted <> 1
WHERE
    (clientprofile.status = 366
        OR clientprofile.status = 373
        OR clientprofile.status IS NULL)
        AND keyword_master.keyword LIKE ?
GROUP BY keyword_master.keyid , clientprofile.clientid
ORDER BY clientprofile.name , keyword_master.keyword

    `;

    const results = await queryDatabase(query, [keyword]);
    res.status(200).json(results);

  } catch (error) {
    console.error("Error fetching in keywords:", error);
    res.status(500).json({ error: error.message });
  }
};

function buildArticleEditRemark(articleid, updates) {
  const parts = ["__"];

  if (updates.headline !== undefined) {
    parts.push(`title __${updates.headline}__`);
  }

  if (updates.pubid !== undefined) {
    parts.push(`pubid __${updates.pubid}__`);
  }
  if (updates.pubdate !== undefined) {
    parts.push(`pubdate __${updates.pubdate}__`);
  }

  if (updates.ispremium !== undefined) {
    parts.push(`IsPremium __${updates.ispremium}__`);
  }

  if (updates.iscolor !== undefined) {
    parts.push(`IsColor __${updates.iscolor}__`);
  }

  if (
    updates.newpagenumber !== undefined
  ) {
    parts.push(
      `page __${updates.newpagenumber}__`
    );
  }

  if (updates.newpagename !== undefined) {
    parts.push(`pagename __${updates.newpagename}__`);
  }

  if (updates.fulltext !== undefined) {
    parts.push(`fulltext __updated__`);
  }

  parts.push(`article __${articleid}__`);

  return parts.join(" , ");
}

async function insertEditArticleLog(articleid, machineId, userid, remarks) {
  if (!articleid || !remarks) return;

  const logQuery = `
    INSERT INTO article_editlog
    (articleid, machineid, editdate, remarks, userid)
    VALUES (?, ?, NOW(), ?, ?)
  `;

  await queryDatabase(logQuery, [
    articleid,
    machineId,
    remarks,
    userid
  ]);
}



  async function updateArticleSQL(articleid, updates, machineId, userid) {
    console.log("updateArticleSQL called with:", { articleid, updates, machineId, userid });
    /* ---------------- ARTICLE TABLE ---------------- */

    const articleFields = {
      headline: "Title",
      ispremium: "IsPremium",
      iscolor: "IsColor",
      lastUpdatedUserid: "lastmodified_userid",
      pubdate: "pubdate",
      pubid: "PubID"
    };

    console.log("articleFields: ", articleFields);
    

    let articleSet = [];
    articleSet.push("lastupdated = NOW()");

    let articleParams = [];

    for (const key in articleFields) {
      if (updates[key] !== undefined) {
        articleSet.push(`${articleFields[key]} = ?`);
        articleParams.push(updates[key]);
      }
    }

    if (articleSet.length) {
      const articleQuery = `
        UPDATE article
        SET ${articleSet.join(", ")}
        WHERE ArticleID = ?
      `;
      articleParams.push(articleid);
      await queryDatabase(articleQuery, articleParams);
    }


    /* ---------------- ARTICLE_IMAGE TABLE ---------------- */
    if (
      updates.oldpagenumber !== undefined &&
      updates.newpagenumber !== undefined
    ) {
      let imageSet = [];
      let imageParams = [];

      imageSet.push("Page_Number = ?");
      imageParams.push(updates.newpagenumber);

      if (updates.newpagename !== undefined) {
        imageSet.push("pagename = ?");
        imageParams.push(updates.newpagename);
      }

      if (updates.fulltext !== undefined) {
        imageSet.push("full_text = ?");
        imageParams.push(updates.fulltext);
      }

      const imageQuery = `
        UPDATE article_image
        SET ${imageSet.join(", ")}
        WHERE ArticleID = ? AND Page_Number = ?
      `;

      imageParams.push(articleid, updates.oldpagenumber);

      await queryDatabase(imageQuery, imageParams);
    }

    /* ---------- EDIT LOG ---------- */
    const remarks = buildArticleEditRemark(articleid, updates);
    await insertEditArticleLog(articleid, machineId, userid, remarks);

    return true;
  }



  exports.updateArticle = async (req, res) => {
    try {
      const { articleid, updates } = req.body;
      const machineId = getMachineId(req);
      const userid = updates.lastUpdatedUserid;

      // console.log("Update Article Request Body:", req.body);
      // console.log("userid:", userid);
      if (!articleid || !updates) {
        return res.status(400).json({
          message: "articleid & updates are required"
        });
      }

      // 🔹 Allowed fields ONLY
      const allowed = [
        "headline",
        "iscolor",
        "ispremium",
        "lastUpdatedUserid",
        "publication",
        "pubdate",
        "city",
        "pubid"
      ];

      const now = new Date();

      const lastupdated =
        now.getFullYear() + '-' +
        String(now.getMonth() + 1).padStart(2, '0') + '-' +
        String(now.getDate()).padStart(2, '0') + ' ' +
        String(now.getHours()).padStart(2, '0') + ':' +
        String(now.getMinutes()).padStart(2, '0') + ':' +
        String(now.getSeconds()).padStart(2, '0');

      const setData = {
        lastupdated
      };
      // 1️⃣ Collect allowed updates
      for (const key of allowed) {
        if (updates[key] !== undefined) {
          setData[key] = updates[key];
        }
      }

      // 2️⃣ Page number update (optional)
      let arrayFilters = [];
      if (updates.oldpagenumber !== undefined &&
        updates.newpagenumber !== undefined) {
        const oldPage = String(updates.oldpagenumber);
        const newPage = String(updates.newpagenumber);  
        setData["pagenumber.$[page].pagenumber"] =
          newPage;

        if (updates.newpagename !== undefined) {
          setData["pagenumber.$[page].pagename"] =
            updates.newpagename;
        }

        arrayFilters.push({
          "page.pagenumber": oldPage
        });
      }

      // ✅ SINGLE UPDATE FOR ARTICLE
      const articleUpdate = await Article.updateMany(
        { articleid },
        { $set: setData },
        arrayFilters.length
          ? { arrayFilters, strict: false }
          : { strict: false }
      );

      // 3️⃣ Fulltext update (only required fields)
      const ftUpdate = {};

      if (setData.headline !== undefined) {
        ftUpdate.headline = setData.headline;
      }

      if (updates.fulltext !== undefined) {
        ftUpdate.fulltext = updates.fulltext;
      }

      if (Object.keys(ftUpdate).length) {
        await Article_fulltext.updateMany(
          { articleid },
          { $set: ftUpdate },
          { strict: false }
        );
      }

          /* ---------------- SQL UPDATE ---------------- */

      await updateArticleSQL(articleid, updates, machineId, userid);
    
      return res.json({
        message: "Updated Successfully",
        articleUpdate
      });

    } catch (err) {
      console.error("Update Error:", err);
      return res.status(500).json({
        message: "Internal Server Error"
      });
    }
  };

function buildKeywordEditRemark(articleid, clientid, kw) {
  return [
    "__",
    `keyid  __${kw.keyid}__`,
    `clientid __${clientid}__`,
    `article __${articleid}__`,
    `type __${kw.keytpe}__`,
    `cat__${kw.keywordcategory}__`,
    `__ ${kw.rejected ? 1 : 0}__`,
    `companys __${kw.companys ?? ""}__`,
    `brands __${kw.brandString ?? ""}__`
  ].join(" ,");
}


async function addToClientSQL(articleid, client, userid, machineId) {
  if (!Array.isArray(client) || !client.length) return;

  for (const c of client) {
    const { clientid, keyword } = c;

    if (!Array.isArray(keyword) || !keyword.length) continue;

    for (const kw of keyword) {
      const keyid = kw.keyid;
      const keycategory = kw.keywordcategory;
      const keytype = kw.keytpe;           // frontend typo handled
      const rejected = kw.rejected ? 1 : 0;
      const companys = kw.companys ?? "";
      const brands = kw.brandString ?? "";

      const checkQuery = `
        SELECT keyid
        FROM keywordlog
        WHERE articleid = ?
          AND clientid = ?
          AND keyid = ?
      `;

      const existing = await queryDatabase(checkQuery, [
        articleid,
        clientid,
        keyid
      ]);

      if (existing.length) {
        const updateQuery = `
          UPDATE keywordlog
          SET
            keycategory = ?,
            keytype = ?,
            rejected = ?,
            companys = ?,
            brands = ?
          WHERE articleid = ?
            AND clientid = ?
            AND keyid = ?
        `;

        await queryDatabase(updateQuery, [
          keycategory,
          keytype,
          rejected,
          companys,
          brands,
          articleid,
          clientid,
          keyid
        ]);
      } else {
        const insertQuery = `
          INSERT INTO keywordlog
          (
            keyid,
            clientid,
            articleid,
            keycategory,
            keytype,
            rejected,
            companys,
            brands
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;

        await queryDatabase(insertQuery, [
          keyid,
          clientid,
          articleid,
          keycategory,
          keytype,
          rejected,
          companys,
          brands
        ]);
      }
      const remarks = buildKeywordEditRemark(articleid, clientid, kw);
      await insertEditArticleLog(articleid, machineId, userid, remarks);

    }
  }

  return true;
}

function getMachineId(req) {
  let ip =
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.ip ||
    req.socket.remoteAddress;

  // normalize IPv6
  if (ip === '::1') ip = '127.0.0.1';
  if (ip?.startsWith('::ffff:')) ip = ip.replace('::ffff:', '');

  return ip;
}



exports.addToClient = async (req, res) => {
  try {
    const { articleid, client, userid } = req.body;
    // client = [{ clientid, clientname, keyword = {} }]

    const machineId = getMachineId(req); // ✅ HERE

    if (!articleid || !Array.isArray(client) || client.length === 0 || !userid) {
      return res.status(400).json({
        message: "articleid, userid & client array are required"
      });
    }
    let existingArticleList = await Article.find({ articleid });
    if (existingArticleList.length == 0) {
      return res.status(404).json({ message: "Article not found" });
    }
    let existingArticle = null;
    let newArticleData = {};
    let results = [];
    for (const c of client) {
      const { clientid, clientname, keyword } = c;
      if (
        existingArticleList.some((article) => article.clientid === clientid)
      ) {
        existingArticle = existingArticleList.find(
          (article) => article.clientid === clientid
        );
        newArticleData = existingArticle.toObject();
        for (const kw of keyword) {
        kStatus = existingArticle.keyword.find(
          (k) => k.keyword == kw.keyword
        );
        if (!existingArticle.keyword.some((k) => k.keyword === kw.keyword)) {
          newArticleData.keyword.push(kw);
        } else {
          newArticleData.keyword = existingArticle.keyword.map((k) =>
            k.keyword === kw.keyword ? kw : k
          );
        }
      }
        delete newArticleData._id;
        await Article.updateMany(
          { _id: existingArticle._id },
          { $set: newArticleData },
          { strict: false }
        );
        results.push({ clientid, status: "updated" });
      } else {
        existingArticle = existingArticleList[0];
        newArticleData = existingArticle.toObject();
        // update/reset client level data
        delete newArticleData._id;
        newArticleData.clientid = clientid;
        newArticleData.clientname = clientname;
        newArticleData.keyword = keyword ? keyword : [];
        newArticleData.companysort = 0;
        newArticleData.competitionsort = 0;
        newArticleData.industrysort = 0;
        newArticleData.rejected = 0;
        newArticleData.reasonofrejection = "";
        newArticleData.qualification = [];
        newArticleData.mlData = [];
        newArticleData.companyName = [];
        newArticleData.userid = userid;

        // add new article for the client
        const newArticle = new Article(newArticleData);
        await newArticle.save();
        results.push({ clientid, status: "added" });
      }

      let fullTextArticle = await Article_fulltext.findOne({ articleid });
      if (fullTextArticle) {
        if (!fullTextArticle.clientidArray.includes(clientid)) {
          fullTextArticle.clientidArray.push(clientid);
          await fullTextArticle.save();
        }
      }
    };

    /* ---------------- SQL KEYWORD LOG ---------------- */

    await addToClientSQL(articleid, client, userid, machineId);
    // console.log("Add to Client Results:", results);
    return res.json({ message: "article added Successfully", results });
  } catch (err) {
    console.error("Update Error:", err);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};


async function deleteArticleSQL(articleid) {

  try {

    // delete all pages/images of article
    const deleteImagesQuery = `
      DELETE FROM article_image
      WHERE ArticleID = ?
    `;

    await queryDatabase(deleteImagesQuery, [articleid]);

    // delete article record
    const deleteArticleQuery = `
      DELETE FROM article
      WHERE ArticleID = ?
    `;

    await queryDatabase(deleteArticleQuery, [articleid]);

    return true;

  } catch (error) {

    console.error("SQL Delete Error:", error);
    throw error;

  }

}

async function insertDeleteArticleLog(article, machineId, userid, reason) {

  if (!article || !article.articleid || !reason) return;

  const logQuery = `
    INSERT INTO article_deleted_log
    (articleid, userid, reason, title, publication, systemId, pubDate, deletedOn)
    VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
  `;

  await queryDatabase(logQuery, [
    article.articleid,
    userid,
    reason,
    article.headline || "",
    article.publication || "",
    machineId,
    article.pubdate || null
  ]);
}

exports.deleteArticle = async (req, res) => {

  try {

    const articleId = req.body.articleid;
    const reason = req.body.reason;
    const userid = req.body.userid;
    const machineId = getMachineId(req);

    console.log("ArticleId:", articleId);
    console.log("Reason:", reason);

    const article = await Article.findOne({ articleid: articleId });

    if (!article) {
      return res.status(404).json({ message: "Article not found" });
    }

    console.log("Article:", article);

    // 1️⃣ log deletion first
    await insertDeleteArticleLog(article, machineId, userid, reason);

    // 2️⃣ send email
    await sendDeletionMail(article, reason, machineId, userid);

    // 3️⃣ delete Mongo records
    await Article.deleteOne({ articleid: articleId });
    await Article_fulltext.deleteOne({ articleid: articleId });

    // 4️⃣ delete SQL records
    await deleteArticleSQL(article.articleid);

    res.json({
      success: true,
      message: "Article deleted successfully"
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      error: "Server error"
    });

  }

};

// exports.addToClient = async (req, res) => {
//   try {
//     const { articleid, keyword, userid, clientid, clientname } = req.body;
//     console.log("Add to Client Request Body:", req.body);
//     if (!articleid || !keyword || !userid || !clientid || !clientname)
//       return res
//         .status(400)
//         .json({ message: "articleid & keyword are required" });
//     let existingArticleList = await Article.find({ articleid });
//     if (existingArticleList.length == 0) {
//       return res.status(404).json({ message: "Article not found" });
//     }
//     let existingArticle = null;
//     let newArticleData = {};
//     let results = [];
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
//     console.log("Add to Client Results:", results);

//     /* ---------------- SQL KEYWORD LOG ---------------- */

//     await addToClientSQL(articleid, clientid, keyword);

//     return res.json({ message: "article added Successfully", results });
//   } catch (err) {
//     console.error("Update Error:", err);
//     return res.status(500).json({ message: "Internal Server Error" });
//   }
// };
