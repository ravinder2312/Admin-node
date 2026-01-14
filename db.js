const mysql = require("mysql");

// Create a connection pool
// const connection = mysql.createPool({
//   host: "localhost",
//   user: "root",
//   password: "impact@12345",
//   database: "impact",
// });


// Create a connection pool
const connection = mysql.createPool({
  host: "192.168.248.4",
  user: "root",
  password: "delta",
  database: "impact",
});
/**************** MySQL Connection *********************/
// const connection = mysql.createPool({
//   host: "192.168.248.4",
//   user: "adminlaravel",
//   password: "Rix2Jag8",
//   database: "adminproject",
// });
/****************************************************/

const queryDatabase = (query, params = []) => {
  return new Promise((resolve, reject) => {
    connection.query(query, params, (error, results) => {
      if (error) {
        // console.error('Database query error:', error);
        return reject(error);
      }
      resolve(results);
    });
  });
};

module.exports = { queryDatabase };
