const db = require('../utils/db');

module.exports = class WalletService {

    static fetchWalletByUser(user) {
        console.info(`Fetching for username=${user.username}`);
        console.debug(`Connecting to Database: ${process.env.E_WALLET_DB_HOST}`);
        return db.execute('SELECT * FROM wallet WHERE username=?', [user.username]);
    }

    static create(user) {
        console.log(`Creating wallet for username ${user.username}`);
        console.debug(`Connecting to Database: ${process.env.E_WALLET_DB_HOST}`);
        return db.execute("INSERT INTO wallet (username, password, firstName, lastName, cash) VALUES (?, ?, ?, ?, ?)", [user.username, user.password, user.firstName, user.lastName, 0.00]);
    }

    static credit(user) {
        console.debug(`Connecting to Database: ${process.env.E_WALLET_DB_HOST}`);
        console.info(`Updating user wallet details with id ${user.username}`);
        console.log("Balance: " + user.cash);
        console.log("Password: " + user.password);
        return db.execute("UPDATE wallet SET password=?, cash=? WHERE username=?", [user.password, user.cash, user.username]);
    }

    static debit(user) {
        console.debug(`Connecting to Database: ${process.env.E_WALLET_DB_HOST}`);
        console.info(`Updating user wallet details with id ${user.username}`);
        console.log("Balance: " + user.cash);
        console.log("Password: " + user.password);
        return db.query(`XA START '${user.transactionId}'; 
        UPDATE wallet SET password='${user.password}', cash=${user.cash} WHERE username='${user.username}';
        XA END '${user.transactionId}'`);
    }

    static deduct(user) {
        console.debug(`Connecting to Database: ${process.env.E_WALLET_DB_HOST}`);
        console.info(`Updating user wallet details with id ${user.username}`);
        console.log("Balance: " + user.cash);
        console.log("Password: " + user.password);
        return db.query(`UPDATE wallet SET password='${user.password}', cash=${user.cash} WHERE username='${user.username}'`);
    }

    static fetchAthenticUser(username) {
        console.info(`Fetching for username=${username}`);
        console.debug(`Connecting to Database: ${process.env.E_WALLET_DB_HOST}`);
        return db.execute('SELECT * FROM wallet WHERE username=?', [username]);
    }

}