const path = require("path");
const fs = require("fs");
const multer = require("multer");
const express = require("express");
const axios = require("axios");
const FormData = require('form-data');

const app = express();

const { queryDatabase } = require("../db");
const { queryDatabase46 } = require("../db_46");

// Get articles based on pubdate, pub, and edition
const getArticles = async (req, res) => {
  try {
    const { pubdate, pub, edition, mode } = req.body;
    if (!pubdate || !pub) {
      return res
        .status(400)
        .json({ error: "Publication date, title, and edition are required" });
    }


    let sqCondition = "";

    if (mode === "manual") {
      sqCondition = "a.sq_userid <> 'Issuebased' and";
    } 
    else if (mode === "issuebased") {
      sqCondition = "a.sq_userid = 'Issuebased' and";
    } 
    else {
      sqCondition = "1=1 and"; // ALL
    }

    const query = `
      SELECT 
    sub.PublicationTitle,
    sub.Edition,
    sub.pubdate,
    sub.TotalArticles,
    ai.Page_Number,
    page_count.ArticlesOnPage,  -- Number of articles per page
    	a.ArticleID,                -- Include the ArticleID
    a.Title AS ArticleTitle
FROM 
    article a
JOIN 
    pub_master pm ON a.PubID = pm.Pubid
JOIN 
    picklist pl ON pm.Place = pl.ID
JOIN 
    (
        SELECT 
            pm.Title AS PublicationTitle, 
            pl.Name AS Edition, 
            a.pubdate,
            COUNT(a.ArticleID) AS TotalArticles
        FROM 
            article a
        JOIN 
            pub_master pm ON a.PubID = pm.Pubid
        JOIN 
            picklist pl ON pm.Place = pl.ID
        WHERE 
            ${sqCondition}
            a.pubdate = ?  
            AND pm.Title = ?  
            AND pl.Name = ?  
        GROUP BY 
            pm.Title, pl.Name, a.pubdate
    ) sub ON pm.Title = sub.PublicationTitle 
          AND pl.Name = sub.Edition 
          AND a.pubdate = sub.pubdate
LEFT JOIN 
    article_image ai ON a.ArticleID = ai.ArticleID  -- Join with article_image to get the page_number
LEFT JOIN 
    (
        -- Subquery to calculate the number of articles on each page
        SELECT 
            ai.Page_Number,
            COUNT(a.ArticleID) AS ArticlesOnPage
        FROM 
            article a
        LEFT JOIN 
            article_image ai ON a.ArticleID = ai.ArticleID
        JOIN
            pub_master pm ON a.PubID = pm.Pubid  -- Ensure that pub_master is joined here
        JOIN
            picklist pl ON pm.Place = pl.ID      -- Ensure picklist is joined here
        WHERE 
            ${sqCondition}
            a.pubdate = ?  
            AND pm.Title = ?  
            AND pl.Name = ?
        GROUP BY 
            ai.Page_Number
    ) page_count ON ai.Page_Number = page_count.Page_Number  -- Join to get article count per page
WHERE 
${sqCondition}
    a.pubdate = ?  
    AND pm.Title = ?  
    AND pl.Name = ? 
ORDER BY 
cast(ai.Page_Number as unsigned);
`;
    // ai.Page_Number, a.Title;  -- Order by page number and article title;

    const results = await queryDatabase(query, [
      pubdate,
      pub,
      edition,
      pubdate,
      pub,
      edition,
      pubdate,
      pub,
      edition,
    ]);

    // Handle special characters in full text and other fields
    const handleSpecialCharacters = (text) => {
      let correctedText = text
        .replace(/â€¢/g, "•")
        .replace(/â€”/g, "—")
        .replace(/â€“/g, "–")
        .replace(/â€œ/g, "“")
        .replace(/â€˜/g, "‘")
        .replace(/â€™/g, "’")
        .replace(/â€/g, "”")
        .replace(/â€¦/g, "…")
        .replace(/Â°/g, "°")
        .replace(/â€“/g, "–")
        .replace(/â‚¬/g, "€")
        .replace(/\*/g, "'")
        .replace(/ï¿½/g, "'");

      return correctedText;
    };

    if (results.length > 0) {
      results.forEach((text) => {
        // text.full_text = handleSpecialCharacters(text.full_text);
        text.ArticleTitle = handleSpecialCharacters(text.ArticleTitle);
        // text.Sub_Title = handleSpecialCharacters(text.Sub_Title);
      });
    }
    res.status(200).json(results);
  } catch (error) {
    // console.error('Server error:', error);
    res.status(500).json({ error: error });
  }
};

// Get articles by page number
const getArticlesByPageNo = async (req, res) => {
  try {
    const { pubdate, pub, edition, pageNumber, mode } = req.body;
    if (!pubdate || !pub || !pageNumber) {
      return res
        .status(400)
        .json({ error: "Publication date, title, and edition are required" });
    }

    let sqCondition = "";

    if (mode === "manual") {
      sqCondition = "a.sq_userid <> 'Issuebased' and";
    } 
    else if (mode === "issuebased") {
      sqCondition = "a.sq_userid = 'Issuebased' and";
    } 
    else {
      sqCondition = "1=1 and"; // ALL
    }

    const query = `
      SELECT 
        a.ArticleID,
        a.Title AS ArticleTitle,
        ai.Page_Number
      FROM 
        article a
      JOIN 
        pub_master pm ON a.PubID = pm.Pubid
      JOIN 
        picklist pl ON pm.Place = pl.ID
      JOIN 
        article_image ai ON a.ArticleID = ai.ArticleID
      WHERE 
      ${sqCondition}
        a.pubdate = ?  
        AND pm.Title = ?  
        AND pl.Name = ?  
        AND ai.Page_Number = ?;
    `;

    const results = await queryDatabase(query, [
      pubdate,
      pub,
      edition,
      pageNumber,
    ]);

    // Handle special characters in full text and other fields
    const handleSpecialCharacters = (text) => {
      let correctedText = text
        .replace(/â€¢/g, "•")
        .replace(/â€”/g, "—")
        .replace(/â€“/g, "–")
        .replace(/â€œ/g, "“")
        .replace(/â€˜/g, "‘")
        .replace(/â€™/g, "’")
        .replace(/â€/g, "”")
        .replace(/â€¦/g, "…")
        .replace(/Â°/g, "°")
        .replace(/â€“/g, "–")
        .replace(/â‚¬/g, "€")
        .replace(/\*/g, "'")
        .replace(/ï¿½/g, "'");

      return correctedText;
    };

    if (results.length > 0) {
      results.forEach((text) => {
        // text.full_text = handleSpecialCharacters(text.full_text);
        text.ArticleTitle = handleSpecialCharacters(text.ArticleTitle);
        // text.Sub_Title = handleSpecialCharacters(text.Sub_Title);
      });
    }

    res.status(200).json(results);
  } catch (error) {
    // console.error('Server error:', error);
    res.status(500).json({ error: error });
  }
};

// Get full text by article ID
const getFullTextById = async (req, res) => {
  try {
    const { articleID } = req.body;
    if (!articleID) {
      return res.status(400).json({ error: "Article ID is required" });
    }

    const query = `
      SELECT 
        a.ArticleID,
        a.pubdate,
        a.PubID,
        a.Num_pages,
        a.Title AS ArticleTitle,
        a.Sub_Title,
        a.IsColor,
        a.IsPhoto,
        a.UserID,
        a.IsPremium,
        a.ave,
        a.lastupdated,
        a.sq_allocatedDateTime,
        a.Date_Time_Acqured,
        a.md5id,
        a.lastmodified_userid,
        ai.area,
        ai.Page_Number,
        ai.pagename,
        ai.full_text,
        ai.imagedirectory,
        ai.Image_name,
        ai.html,
        ai.htmldirectory,
        ai.start_acq_time,
        ai.end_acq_time,
        ak.keyid,
        km.PrimarykeyID,
        CONCAT(km.KeyWord, 
               CASE 
                   WHEN km.Filter_String IS NOT NULL AND km.Filter_String != '' 
                   THEN CONCAT(':', km.Filter_String) 
                   ELSE '' 
               END) AS MergedKeywordFilter,
        pm.Title AS PublicationTitle,
        s.Name AS SectorName,
        s.ID AS SectorID,
        j.Fname,
        j.Lname,
        aj.JournalistID
      FROM 
        article a
      JOIN 
        article_image ai ON a.ArticleID = ai.ArticleID
      LEFT JOIN 
        article_keyword ak ON a.ArticleID = ak.articleid
      LEFT JOIN 
        keyword_master km ON ak.keyid = km.keyID
      LEFT JOIN 
        pub_master pm ON a.PubId = pm.PubId
      LEFT JOIN 
        picklist s ON a.SectorPid = s.ID
      LEFT JOIN 
        article_journalist aj ON a.ArticleID = aj.ArticleID
      LEFT JOIN 
        journalist j ON aj.JournalistID = j.JourID
      WHERE 
        a.ArticleID = ?;
    `;

    const results = await queryDatabase(query, [articleID]);

    // Handle special characters in full text and other fields
    const handleSpecialCharacters = (text) => {
      let correctedText = text
        .replace(/â€¢/g, "•")
        .replace(/â€”/g, "—")
        .replace(/â€“/g, "–")
        .replace(/â€œ/g, "“")
        .replace(/â€˜/g, "‘")
        .replace(/â€™/g, "’")
        .replace(/â€/g, "”")
        .replace(/â€¦/g, "…")
        .replace(/Â°/g, "°")
        .replace(/â€“/g, "–")
        .replace(/â‚¬/g, "€")
        .replace(/\*/g, "'")
        .replace(/ï¿½/g, "'");

      return correctedText;
    };

    if (results.length > 0) {
      results.forEach((text) => {
        text.full_text = handleSpecialCharacters(text.full_text);
        text.ArticleTitle = handleSpecialCharacters(text.ArticleTitle);
        text.Sub_Title = handleSpecialCharacters(text.Sub_Title);
      });
    }

    res.status(200).json(results);
  } catch (error) {
    // console.error('Server error:', error);
    res.status(500).json({ error: error });
  }
};

const getFilterString = async (req, res) => {
  try {
    const { PrimarykeyID } = req.body;

    // if (!PrimarykeyID) {
    //   return res.status(400).json({ error: 'PrimaryKeyID is required' });
    // }

    const query = `SELECT Filter_String, keyid FROM keyword_master where PrimarykeyID = ? `;

    // Execute the query with parameterized values
    const results = await queryDatabase(query, [PrimarykeyID]);

    // Send the results as a JSON response
    res.status(200).json(results);
  } catch (error) {
    // console.error('Server error:', error);  // More detailed logging
    res.status(500).json({ error: error });
  }
};

const editArticle = async (req, res) => {
  try {
    // const { id } = req.params;
    const {
      id,
      title,
      sub_title,
      isPremium,
      isColor,
      isPhoto,
      UserID,
      sectorPid,
    } = req.body;

    // Build the query dynamically based on which fields are provided
    let query = "UPDATE article SET";
    const params = [];

    if (title !== undefined) {
      query += " Title = ?";
      params.push(title);
    }

    if (sub_title !== undefined) {
      if (params.length > 0) query += ",";
      query += " Sub_Title = ?";
      params.push(sub_title);
    }

    if (isPremium !== undefined) {
      if (params.length > 0) query += ",";
      query += " IsPremium = ?";
      params.push(isPremium);
    }

    if (isPhoto !== undefined) {
      if (params.length > 0) query += ",";
      query += " IsPhoto = ?";
      params.push(isPhoto);
    }

    if (isColor !== undefined) {
      if (params.length > 0) query += ",";
      query += " IsColor = ?";
      params.push(isColor);
    }

    if (UserID !== undefined && UserID !== null) {
      if (params.length > 0) query += ",";
      query += " lastmodified_userid = ?";
      params.push(UserID);
    }

    if (sectorPid !== undefined && sectorPid !== null) {
      if (params.length > 0) query += ",";
      query += " SectorPid = ?";
      params.push(sectorPid);
    }

    if (params.length > 0) query += ",";
    query += " lastupdated = NOW()";

    // Append WHERE clause
    query += " WHERE ArticleID = ?";
    params.push(id);

    // Execute the query with parameterized values
    const results = await queryDatabase(query, params);

    res
      .status(200)
      .json({ message: "Successfully article updated", results: results });
  } catch (error) {
    // console.error('Server error:', error); // More detailed logging
    res.status(500).json({ error: error });
  }
};

const editPage = async (req, res) => {
  try {
    // const { id } = req.params;
    const { id, old_page_number, new_page_number, page_name, full_text } = req.body;
    console.log(req.body);
    
    // Build the query dynamically based on which fields are provided
    let query = "UPDATE article_image SET";
    const params = [];

    if (new_page_number !== undefined && new_page_number !== null) {
      query += " Page_Number = ?";
      params.push(new_page_number);
    }

    if (page_name !== undefined && page_name !== null) {
      if (params.length > 0) query += ",";
      query += " pagename = ?";
      params.push(page_name);
    }

    if (full_text !== undefined && full_text !== null) {
      if (params.length > 0) query += ",";
      query += " full_text = ?";
      params.push(full_text);
    }

    // Append WHERE clause
    query += " WHERE ArticleID = ? and Page_Number = ?";
    params.push(id, old_page_number);

    // Execute the query with parameterized values
    const results = await queryDatabase(query, params);

    res
      .status(200)
      .json({ message: "Successfully page updated", results: results });
  } catch (error) {
    // console.error('Server error:', error); // More detailed logging
    res.status(500).json({ error: error });
  }
};

const getJournalists = async (req, res) => {
  try {
    let query = "select JourID, Fname, Lname from journalist;";

    const results = await queryDatabase(query);

    res.status(200).json({ results });
  } catch (error) {
    res.status(500).json({ error: error });
  }
};

const getAllSector = async (req, res) => {
  try {
    const query = "SELECT ID, Name FROM picklist WHERE Type = 'Sector';";
    const results = await queryDatabase(query);

    if (results.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "No sectors found." });
    }

    res.status(200).json({ success: true, data: results });
  } catch (error) {
    console.error("Error fetching sectors:", error); // Log the error
    res.status(500).json({
      success: false,
      message: "An error occurred while fetching sectors.",
    });
  }
};

const getSubsectorByID = async (req, res) => {
  try {
    const { ID } = req.body;

    if (!ID) {
      return res
        .status(400)
        .json({ success: false, message: "ID is required." });
    }

    const query = `SELECT ID, Type, Name FROM picklist WHERE Type = 'subsector' AND SubType = ${ID};`;

    const results = await queryDatabase(query);

    // if (results.length === 0) {
    //   return res.status(200).json({ success: false, message: "No subsectors found." });
    // }

    res.status(200).json({ success: true, data: results });
  } catch (error) {
    console.error("Error fetching subsectors:", error); // Log the error
    res.status(500).json({
      success: false,
      message: "An error occurred while fetching subsectors.",
    });
  }
};

const editJour = async (req, res) => {
  try {
    let { jourId, fname, lname } = req.body;

    console.log(jourId, fname, lname);

    // Only proceed if jourId is not 0 and fname is not empty
    if (jourId !== 0 && fname !== "") {
      // Update the journalist's Fname and Lname where JourId matches
      let updateQuery = `
        UPDATE journalist 
        SET Fname = ?, Lname = ? 
        WHERE JourID = ?;
      `;

      const updateResults = await queryDatabase(updateQuery, [
        fname,
        lname,
        jourId,
      ]);

      // Check if the update was successful
      if (updateResults.affectedRows > 0) {
        console.log("Journalist updated successfully");
        res.status(200).json({
          message: "Journalist updated successfully",
          updateResults,
        });
      } else {
        res
          .status(404)
          .json({ message: "No journalist found with the given JourID" });
      }
    } else {
      res.status(400).json({
        message: "Invalid data. Please provide valid journalist details.",
      });
    }
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: error.message });
  }
};

const addJourId = async (req, res) => {
  try {
    let { id, jourId, fname, lname } = req.body;

    if (jourId === 0) {
      let selectQuery = `select * from journalist where Fname = ? && Lname = ?;`;
      const results = await queryDatabase(selectQuery, [fname, lname]);

      if (results.length === 0) {
        let addQuery = `INSERT INTO journalist (Fname, Lname) 
      VALUES (?, ?);`;

        const results = await queryDatabase(addQuery, [fname, lname]);
        if (results.affectedRows > 0) {
          let getJourId = `select * from journalist where Fname = ? && Lname = ? ORDER BY JourID LIMIT 1;`;
          const results = await queryDatabase(getJourId, [fname, lname]);
          res.status(200).json({ results });
        }
      } else {
        let getJourId = `select * from journalist where Fname = ? && Lname = ? ORDER BY JourID LIMIT 1;`;
        const results = await queryDatabase(getJourId, [fname, lname]);
        res.status(200).json({ results });
      }
    }
  } catch (error) {
    res.status(500).json({ error: error });
  }
};

const removeArticleJournalist = async (req, res) => {
  const { articleId, journalistId } = req.body; // Access the body of the DELETE request

  try {
    let selectQuery = `SELECT * FROM article_journalist WHERE ArticleID = ? && JournalistID = ?;`;
    const selectResults = await queryDatabase(selectQuery, [
      articleId,
      journalistId,
    ]);
    console.log(selectResults.length);

    if (selectResults.length > 0) {
      let deleteQuery = `DELETE FROM article_journalist WHERE ArticleID = ? && JournalistID = ?;`;
      await queryDatabase(deleteQuery, [articleId, journalistId]);

      res.status(200).json({
        message: `Journalist with ID ${journalistId} successfully removed from article ${articleId}.`,
      });
    } else {
      res.status(202).json({
        message: `No association found for JournalistID ${journalistId} with ArticleID ${articleId}.`,
      });
    }
  } catch (error) {
    console.error("Error removing journalist from article:", error);
    res.status(500).json({
      message:
        "An error occurred while removing the journalist from the article.",
      error: error.message,
    });
  }
};

const checkArticleJournalist = async (req, res) => {
  try {
    const { articleId, journalistId } = req.body;
    const query = `SELECT * FROM article_journalist WHERE ArticleID = ? AND JournalistID = ?`;
    const results = await queryDatabase(query, [articleId, journalistId]);

    if (results.length > 0) {
      return res.status(200).json({ exists: true });
    } else {
      return res.status(200).json({ exists: false });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const addArticleJournalist = async (req, res) => {
  try {
    const { articleId, journalistId } = req.body;
    const insertQuery = `INSERT INTO article_journalist (ArticleID, JournalistID) VALUES (?, ?)`;

    const result = await queryDatabase(insertQuery, [articleId, journalistId]);
    if (result.affectedRows > 0) {
      res
        .status(200)
        .json({ message: "Journalist added to article successfully." });
    } else {
      res.status(400).json({ message: "Failed to add journalist." });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// // Upload and replace image logic
const getImageBase64 = async (req, res) => {
  const imageUrl = req.body.imageUrl;
  // console.log(imageUrl);
  
  try {
    console.log(`Fetching image from URL: ${imageUrl}`);  // Log the image URL to make sure it's correct

    // Fetch the image as a buffer (binary data)
    const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });

    // Log the response data
    console.log(`Received image data, size: ${response.data.length} bytes`);

    // Set the correct content type for the image (e.g., image/jpeg, image/png)
    res.set('Content-Type', 'image/jpeg');
    
    // Send the binary data as the image response
    res.send(response.data);
    console.log(response.data);
    
  } catch (error) {
    console.error('Error fetching image:', error.message);  // Log error message
    res.status(500).send('Failed to fetch image');
  }
};


module.exports = {
  getArticles,
  getArticlesByPageNo,
  getFullTextById,
  getFilterString,
  editArticle,
  editPage,
  editJour,
  getJournalists,
  getAllSector,
  getSubsectorByID,
  addJourId,
  checkArticleJournalist,
  addArticleJournalist,
  removeArticleJournalist,
  getImageBase64,
  // upload
};
