var mongodb = require('./db');
function Post(username, post, time) {
    this.user = username;
    this.post = post;
    if (time) {
        this.time = time;
    } else {
        this.time = new Date();
    }
};
module.exports = Post;
Post.prototype.save = function save(req, callback) {
    // 存入 Mongodb 的文档
    var post = {
        user: this.user,
        post: this.post,
        time: this.time
    };
    mongodb.connectDB(req, function (db) {

        var posts = db.collection('posts');

        posts.insert(post, {safe: true}, function (err, post) {
            mongodb.closeDB(req);
            callback(err, post);
        });
    });
};
Post.get = function get(req, username, callback) {
    mongodb.connectDB(req, function (db) {
        var collection = db.collection('posts');

        // 查找 user 属性为 username 的文档，如果 username 是 null 则匹配全部
        var query = {};
        if (username) {
            query.user = username;
        }
        collection.find(query).sort({time: -1}).toArray(function (err, docs) {
            mongodb.closeDB(req);
            if (err) {
                callback(err, null);
            }
            // 封装 posts 为 Post 对象
            var posts = [];
            docs.forEach(function (doc, index) {
                var post = new Post(doc.user, doc.post, doc.time);
                posts.push(post);
            });
            callback(null, posts);
        });
    });
};