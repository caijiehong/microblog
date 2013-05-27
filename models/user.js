var mongodb = require('./db');

exports.User = User = function (username, source, password) {
    this.username = username;
    this.password = password;
    this.source = source;
};

User.prototype.save = function save(req, callback) {
    // 存入 Mongodb 的文档
    var user = {
        username: this.username,
        password: this.password,
        source: this.source

    };

    mongodb.connectDB(req, function (db) {
        var collection = db.collection('users');

        // 为 name 属性添加索引
        collection.ensureIndex('username', {unique: true});
        // 写入 user 文档
        collection.insert(user, {safe: true}, function (err, user) {
            mongodb.closeDB(req);
            callback(err, user);
        });
    });
};

exports.getUser = getUser = function (req, username, callback) {
    mongodb.connectDB(req, function (db) {

        var collection = db.collection('users');

        // 查找 name 属性为 username 的文档
        collection.findOne({username: username}, function (err, doc) {
            mongodb.closeDB(req);
            if (doc) {
                callback(err, doc);
            } else {
                callback(err, null);
            }
        });
    });
};

exports.userSource = userSource = {
    WEB: 'WEB',
    DOUBAN: 'DOUBAN'
};

exports.loginResult = loginResult = {
    success: 'success',
    userNotExist: 'userNotExist',
    pwdNotMatch: 'pwdNotMatch'
};

exports.login = function (req, res, user, onLogin) {
    if (user.source == userSource.WEB) {
        getUser(req, user.username, function (err, userDb) {
            if (!userDb) {
                onLogin(loginResult.userNotExist);
                return;
            } else if (userDb.password != user.password) {
                onLogin(loginResult.pwdNotMatch);
                return;
            } else {
                onLogin(loginResult.success);
                return
            }
        })
    } else {
        onLogin(loginResult.success);
        return
    }
}