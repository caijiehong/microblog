var mongodb = require('./db');
exports.User = User = function (username, source, password) {
    this.username = username;
    this.password = password;
    this.source = source;
};

User.prototype.save = function save(callback) {
    // 存入 Mongodb 的文档
    var user = {
        name: this.name,
        password: this.password
    };
    mongodb.open(function (err, db) {
        if (err) {
            return callback(err);
        }
        // 读取 users 集合
        db.collection('users', function (err, collection) {
            if (err) {
                mongodb.close();
                return callback(err);
            }
            // 为 name 属性添加索引
            collection.ensureIndex('name', {unique: true});
            // 写入 user 文档
            collection.insert(user, {safe: true}, function (err, user) {
                mongodb.close();
                callback(err, user);
            });
        });
    });
};

exports.getUser = getUser = function (username, callback) {
    mongodb.open(function (err, db) {
        if (err) {
            return callback(err);
        }
        // 读取 users 集合
        db.collection('users', function (err, collection) {
            if (err) {
                mongodb.close();
                return callback(err);
            }
            // 查找 name 属性为 username 的文档
            collection.findOne({name: username}, function (err, doc) {
                mongodb.close();
                if (doc) {
                    callback(err, doc);
                } else {
                    callback(err, null);
                }
            });
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
        getUser(user.username, function (err, userDb) {
            if (!userDb) {
                onLogin(loginResult.userNotExist);
                return;
            } else if (userDb.password != user.password) {
                onLogin(loginResult.pwdNotMatch);
                return;
            } else {
                initSession(req, userDb);
                onLogin(loginResult.success);
                return
            }
        })
    } else {
        initSession(req, user);
        onLogin(loginResult.success);
        return
    }
}

exports.logout = function (req, res) {
    req.session.user = null;
}

exports.userInfo = function (req) {
    return req.session.user;
}

exports.initSession = initSession = function (req, user) {
    req.session.user = {
        username: user.username,
        source: user.source
    };
}