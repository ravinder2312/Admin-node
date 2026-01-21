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

    console.log("Articles Data:", data);
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
	      km.KeyWord, km.Filter, km.Filter_String,
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
	   JOIN keyword_master km
        ON ck.KeywordID = km.keyid
      WHERE ck.clientid = ?;

    `;

    const results = await queryDatabase(query, [clientid]);
    res.status(200).json(results);

  } catch (error) {
    console.error("Error fetching client keywords:", error);
    res.status(500).json({ error: error.message });
  }
};


  async function updateArticleSQL(articleid, updates) {
    /* ---------------- ARTICLE TABLE ---------------- */

    const articleFields = {
      headline: "Title",
      ispremium: "IsPremium",
      iscolor: "IsColor",
      userid: "lastmodified_userid"
    };

    let articleSet = [];
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


    return true;
  }



  exports.updateArticle = async (req, res) => {
    try {
      const { articleid, updates } = req.body;

      console.log("Update Article Request Body:", req.body);
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
        "userid",
        // "sector"
      ];

      const setData = {};

      // 1️⃣ Collect allowed updates
      for (const key of allowed) {
        if (updates[key] !== undefined) {
          setData[key] = updates[key];
        }
      }

      // 2️⃣ Page number update (optional)
      let arrayFilters = [];
      if (updates.oldpagenumber && updates.newpagenumber) {
        setData["pagenumber.$[page].pagenumber"] =
          updates.newpagenumber;

        if (updates.newpagename !== undefined) {
          setData["pagenumber.$[page].pagename"] =
            updates.newpagename;
        }

        arrayFilters.push({
          "page.pagenumber": updates.oldpagenumber
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

      await updateArticleSQL(articleid, updates);

    
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


async function addToClientSQL(articleid, clientid, keyword) {
  if (!Array.isArray(keyword) || !keyword.length) return;

  for (const kw of keyword) {
     // ✅ EXPLICIT MAPPING FROM FRONTEND → SQL
    const keyid = kw.keyid;
    const keycategory = kw.keywordcategory;   // 👈 frontend
    const keytype = kw.keytpe;                // 👈 frontend typo
    const rejected = kw.rejected ? 1 : 0;
    const companys = kw.companys ?? "";
    const brands = kw.brandString ?? "";

    // 🔹 Check if keyword already exists for this article + client
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
      // 🔁 UPDATE
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
      // ➕ INSERT
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
  }

  return true;
}



exports.addToClient = async (req, res) => {
  try {
    const { articleid, keyword, userid, clientid, clientname } = req.body;
    console.log("Add to Client Request Body:", req.body);
    if (!articleid || !keyword || !userid || !clientid || !clientname)
      return res
        .status(400)
        .json({ message: "articleid & keyword are required" });
    let existingArticleList = await Article.find({ articleid });
    if (existingArticleList.length == 0) {
      return res.status(404).json({ message: "Article not found" });
    }
    let existingArticle = null;
    let newArticleData = {};
    let results = [];
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
    console.log("Add to Client Results:", results);

    /* ---------------- SQL KEYWORD LOG ---------------- */

    await addToClientSQL(articleid, clientid, keyword);

    return res.json({ message: "article added Successfully", results });
  } catch (err) {
    console.error("Update Error:", err);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};
