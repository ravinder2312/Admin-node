const { queryDatabase } = require('../db');

const getPublications = async (req, res) => {
  try {
    const query = `
      SELECT pub_master.Title AS PublicationTitle, pub_master.PubId AS pubid, picklist.Name AS Edition
FROM pub_master
JOIN picklist ON picklist.ID = pub_master.Place
WHERE pub_master.deleted = 0
    `;

    const results = await queryDatabase(query);
    res.status(200).json(results);
  } catch (error) {
    // console.error("Error fetching publications:", error);
    res.status(500).json({ error: error });
  }
};

module.exports = { getPublications };
