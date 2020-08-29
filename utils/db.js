const mysql = require('mysql2')
require('dotenv').config();
const pool = mysql.createPool({
    host: process.env.E_WALLET_DB_HOST,
    user: process.env.E_WALLET_DB_USER,
    password: process.env.E_WALLET_DB_PASSWORD,
    database: process.env.E_WALLET_DB_SCHEMA,
    multipleStatements: true
})

// const pool = mysql.createPool({
//     host: "database-e-wallet.cjlichfool7g.us-east-1.rds.amazonaws.com",
//     user: "admin",
//     password: "Test1234",
//     database: "ewallet",
//     multipleStatements: true
// })

module.exports = pool.promise();
