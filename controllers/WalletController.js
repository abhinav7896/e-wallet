const express = require('express');
const router = express.Router();
const WalletService = require('../models/Wallet');
const WalletStatus = require('../utils/constants/wallet-status');
const { response } = require('express');
const db = require('../utils/db');
const passwordHash = require('password-hash');

router.get("/signup", (req, res) => {
    return res.status(200).render('signup', { message: null });
});

router.post("/signup", (req, res) => {
    const password = req.body.password
    const username = req.body.username
    const hashedPass = passwordHash.generate(password)
    console.log(hashedPass)
    let user = {
        username: username,
        password: hashedPass,
        firstName: req.body.firstName,
        lastName: req.body.lastName
    };
    WalletService.fetchWalletByUser(user).then(rows => {
        console.log(rows)
        if (rows === undefined || rows[0].length == 0) {
            WalletService.create(user).then(rows => {
                return res.status(200).render('login', { message: "Signed up successfully!" });
            }).catch(error => {
                console.error(error);
                return res.status(500).render('errors/500', error);
            });
        } else {
            return res.status(200).render('signup', { message: "Username already exists!" });
        }
    }).catch(error => {
        console.error(error);
        return res.status(500).render('errors/500', error);
    });

});

router.get("/login", (req, res) => {
    return res.status(200).render('login', { message: null });
});

router.post("/authenticate", (req, res) => {
    const username = req.body.username;
    const password = req.body.password;
    const user = {
        username: username
    }
    WalletService.fetchAthenticUser(username).then(rows => {
        console.log(rows[0][0])
        if (rows === undefined || rows[0].length == 0) {
            message = "Invalid credentials";
            return res.status(401).render('login', { message: message });
        } else {
            const hashedPass = rows[0][0].password;
            let is_verified = passwordHash.verify(password, hashedPass)
            if(is_verified == false){
                message = "Invalid credentials";
                return res.status(401).render('login', { message: message });
            }
            return res.status(200).redirect(`/wallet/userWallet?username=${user.username}`);
        }
    }).catch(error => {
        console.error(error);
        return res.status(500).render('errors/500', { error: null });
    });
});

router.get("/userWallet", (req, res) => {
    let user = {
        username: req.query.username,
    };
    WalletService.fetchWalletByUser(user).then(rows => {
        let userWallet = rows[0][0];
        return res.status(200).render('wallet', { userWallet: userWallet });
    }).catch(error => {
        console.error(error);
        return res.status(500).render('errors/500');
    });
});

router.get("/credit", (req, res) => {
    let user = {
        username: req.query.username,
    };
    WalletService.fetchWalletByUser(user).then(rows => {
        let userWallet = rows[0][0];
        userWallet.user = user;
        console.log(userWallet.user.username);
        return res.status(200).render('add', { userWallet: userWallet });
    }).catch(error => {
        console.error(error);
        return res.status(500).render('errors/500');
    });
});

router.post("/credit", (req, res) => {
    let user = {
        username: req.body.currentuser,
    }
    console.log("Add to balance for: " + req.body.currentuser);
    console.log("Add to balance amount: " + req.body.amount);
    WalletService.fetchWalletByUser(user).then(rows => {
        let currentBalance = rows[0][0].cash;
        user.password = rows[0][0].password;
        user.cash = parseFloat(currentBalance) + parseFloat(req.body.amount);
        WalletService.credit(user).then(rows => {
            console.info(rows[0]);
            return res.status(200).redirect(`/wallet/userWallet?username=${user.username}`);
        }).catch(error => {
            console.error(error);
            return res.status(500).render('errors/500', { error: error });
        });
    }).catch(error => {
        console.error(error);
        return res.status(500).render('errors/500');
    });
});

router.post("/debit", (req, res) => {
    let user = {
        username: req.body.username,
        transactionId: req.body.transactionId
    }
    WalletService.fetchWalletByUser(user).then(rows => {
        let currentBalance = rows[0][0].cash;
        user.password = rows[0][0].password;
        user.cash = currentBalance - req.body.amount;
        if (user.cash < 0) {
            console.log(`Insufficient balance...`);
            return res.status(200).send({ balanceUpdate: WalletStatus.INSUFFICENT_FUNDS });
        }
        WalletService.debit(user).then(() => {
            console.log(`Debit transaction started...${user.transactionId}`);
            return res.status(200).send({ balanceUpdate: WalletStatus.BALANCE_UPDATED });
        }).catch(error => {
            console.error(error);
            return res.status(500);
        });
    }).catch(error => {
        console.error(error);
        return res.status(500).render('errors/500');
    });
});

router.get("/logout", (req, res) => {
    return res.status(200).render('login', { message: "Logged out successfully!" });
});

router.post("/2pc/prepare", (req, res) => {
    const transactionId = req.body.transactionId;
    console.log(transactionId);
    console.log(`Preparing...${transactionId}`);
    db.query(`XA PREPARE '${transactionId}'`).then(() => {
        return res.status(200).send({ prepared: true });
    }).catch(error => {
        console.error(error);
        return res.status(200).send({ prepared: false });
    });
});

router.post("/2pc/commit", (req, res) => {
    let transactionId = req.body.transactionId;
    console.log(`Committing...${transactionId}`);
    db.query(`XA COMMIT '${transactionId}'`).then(() => {
        return res.status(200).send({ committed: true });
    }).catch(error => {
        console.error(error);
        return res.status(200).send({ committed: false });
    });
});

router.post("/2pc/rollback", (req, res) => {
    console.log('Rolling back...')
    let transactionId = req.body.transactionId;
    db.query(`XA ROLLBACK '${transactionId}'`).then((response) => {
        console.log('----------------------', response);
        console.log('Rolled back');
        return res.status(200).send({ rolledBack: true });
    }).catch(error => {
        console.error(error);
        return res.status(200).send({ rolledBack: false });
    });
});

router.post("/deduct", (req, res) => {
    let user = {
        username: req.body.username,
        transactionId: req.body.transactionId
    }
    WalletService.fetchWalletByUser(user).then(rows => {
        let currentBalance = rows[0][0].cash;
        user.password = rows[0][0].password;
        user.cash = currentBalance - req.body.amount;
        if (user.cash < 0) {
            console.log(`Insufficient balance...`);
            return res.status(200).send({ balanceUpdate: WalletStatus.INSUFFICENT_FUNDS });
        }
        WalletService.deduct(user).then(() => {
            console.log(`Debit transaction started...${user.transactionId}`);
            return res.status(200).send({ balanceUpdate: WalletStatus.BALANCE_UPDATED });
        }).catch(error => {
            console.error(error);
            return res.status(500);
        });
    }).catch(error => {
        console.error(error);
        return res.status(500).render('errors/500');
    });
});

module.exports = router;