var User = require('../models/user');
var Post = require('../models/post');
var crypto = require('crypto');

exports.index = new (function () {
    this.get = function (req, res) {
        render(req, res);
    };

    this.post = function (req, res) {
        var user = User.userInfo(req);
        if (user) {
            var post = new Post(user.username, req.body.post);
            post.save(function (err) {
                render(req, res, err, '发表成功');
                return;
            });
        } else {
            return res.redirect('/home/login');
        }
    };

    function render(req, res, error, success) {
        var user = User.userInfo(req);
        var username = user ? user.username : '';

        Post.get(username, function (err, posts) {
            console.log(posts)
            res.render('index', {
                title: username,
                posts: posts,
                error: error,
                success: success
            });
        });
    }
})();

exports.reg = {
    get: function (req, res) {
        res.render('reg', { username: '' });
    },
    post: function (req, res) {
        //检验用户两次输入的口令是否一致
        if (req.body['password-repeat'] != req.body['password']) {
            res.render('reg', { error: '两次输入的口令不一致', username: req.body.username});
            return;
        }

        //生成口令的散列值
        var md5 = crypto.createHash('md5');
        var password = md5.update(req.body.password).digest('base64');

        var newUser = new User.User(req.body.username, User.userSource.WEB, password);

        //检查用户名是否已经存在
        User.getUser(newUser.username, function (err, user) {
            if (user)
                err = 'Username already exists.';
            if (err) {
                res.render('reg', { error: err, username: req.body.username});
                return;
            }
            //如果不存在则新增用户
            newUser.save(function (err) {
                if (err) {
                    res.render('reg', { error: err, username: req.body.username});
                    return;
                }
                User.initSession(req, newUser);
                res.locals.success = '注册成功';
                res.redirect('/');
            });
        });
    }
};

exports.login = {
    get: function (req, res) {
        res.render('login', { username: '' });
    },
    post: function (req, res) {
        //生成口令的散列值
        var md5 = crypto.createHash('md5');
        var password = md5.update(req.body.password).digest('base64');
        var username = req.body.username;

        var user = new User.User(username, User.userSource.WEB, password);
        User.login(req, res, user, function (rel) {
            switch (rel) {
                case User.loginResult.success:
                {
                    res.locals.success = '登入成功';
                    res.redirect('/');
                    break;
                }
                case User.loginResult.userNotExist:
                {
                    res.render('login', {error: '用户不存在', username: username });
                    break;
                }
                case User.loginResult.pwdNotMatch:
                {
                    res.render('login', {error: '用户口令错误', username: username });
                    break;
                }
            }
        });
    }
};

exports.logout = {
    get: function (req, res) {
        User.logout(req, res);
        res.redirect('/');
    }
}
