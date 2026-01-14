const { queryDatabase } = require('../db_5');

const addKeywords = async (req, res) => {
  const { userid, text, pubid } = req.body;

  const deleteTmpQuery = `DELETE FROM tmp WHERE userid = ?`;
  const insertTmpQuery = `INSERT INTO tmp (userid, text) VALUES (?, ?)`;
  const deleteTmp2Query = `DELETE FROM tmp2 WHERE userid = ?`;
  const insertTmp2Query = `
    INSERT INTO tmp2 
    SELECT DISTINCT 
      Keyword, 
      MID(text, INSTR(text, Keyword) - 1, 1) AS First, 
      MID(text, INSTR(text, Keyword) + LENGTH(Keyword), 1) AS Last, 
      INSTR(text, Keyword) AS Start, 
      1 , 
      ? 
    FROM keyword_master, tmp 
    WHERE tmp.userid = ? AND INSTR(text, Keyword) > 0 AND IFNULL(filter_string, '') = ''`;

  const selectQuery = `
    SELECT DISTINCT 
      tmp2.Keyword, 
      '' AS String, 
      '' AS Ok, 
      '' AS keyid 
    FROM keyword_master 
    RIGHT JOIN clientkeyword ON clientkeyword.keywordid = keyword_master.keyid 
    RIGHT JOIN tmp2 ON keyword_master.keyword = tmp2.keyword 
    JOIN tmp ON tmp.userid = tmp2.userid AND tmp2.userid = ? 
    JOIN clientprofile ON clientkeyword.clientid = clientprofile.clientid 
      AND (clientprofile.status = 366 OR clientprofile.status = 373) 
    JOIN media_universe_master ON clientprofile.clientid = media_universe_master.clientid 
      AND media_universe_master.pubid = ? 
    WHERE text REGEXP CONCAT('[[:<:]]', tmp2.keyword, '[[:>:]]') > 0`;

  try {
    await queryDatabase(deleteTmpQuery, [userid]);
    await queryDatabase(insertTmpQuery, [userid, text]);
    await queryDatabase(deleteTmp2Query, [userid]);
    await queryDatabase(insertTmp2Query, [userid, userid]);
    
    const selectResults = await queryDatabase(selectQuery, [userid, pubid]);
    res.status(200).json(selectResults);
  } catch (error) {
    // console.error('Error adding keywords:', error);
    res.status(500).json({ error: error });
  }
};

module.exports = { addKeywords };
