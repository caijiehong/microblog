var User = require('../models/user');
var Post = require('../models/post');
var crypto = require('crypto');
var https = require('https');
var setting = require('../settings');
var Canvas = require('canvas');
var session = require('../models/session');

exports.index = new (function () {
    this.get = function (req, res) {
        render(req, res);
    };

    this.post = function (req, res) {
        var user = session.get(req).userInfo();
        if (user) {
            var post = new Post(user.username, req.body.post);
            post.save(function (err) {
                render(req, res, err, '发表成功');
            });
        } else {
            res.redirect('/home/login');
        }
    };

    function render(req, res, error, success) {
        var user = session.get(req).userInfo();
        var username = user ? user.username : '';

        Post.get(username, function (err, posts) {
            res.render('index', {
                title: username,
                posts: posts,
                error: error,
                success: success
            });
        });
    }
})();

exports.reg = new (function(){
    this.get = function (req, res) {
        render(res, '');
    }

    this.post = function(req, res){
        var verifycode = req.body.verifycode;
        var username = req.body.username;

        if(!session.get(req).checkVerifyCode(verifycode)){
            res.locals.error = '验证码有误';
            render(res, username);
            return;
        }

        //检验用户两次输入的口令是否一致
        if (req.body['password-repeat'] != req.body['password']) {
            res.locals.error = '两次输入的口令不一致';
            render(res, username);
            return;
        }

        //生成口令的散列值
        var md5 = crypto.createHash('md5');
        var password = md5.update(req.body.password).digest('base64');
        var username = req.body.username;
        var newUser = new User.User(username, User.userSource.WEB, password);

        //检查用户名是否已经存在
        User.getUser(newUser.username, function (err, user) {
            if (user){
                res.locals.error = 'Username already exists';
                render(res, username);
                return;
            }
            //如果不存在则新增用户
            newUser.save(function (err) {

                session.get(req).initUser(username, User.userSource.WEB);
                res.locals.success = '注册成功';
                res.redirect('/');
            });
        });
    }

    function render(res, username){
        res.render('reg', { username: username });
    }
})();

exports.login = new (function () {
    this.get = function (req, res) {
        render(req, res, '');
    };

    this.post = function (req, res) {
        var username = req.body.username;

        var verifycode = req.body.verifycode;
        if(!session.get(req).checkVerifyCode(verifycode)){
            res.locals.error = '验证码有误';
            render(req, res, username);
            return;
        }
        //生成口令的散列值
        var md5 = crypto.createHash('md5');
        var password = md5.update(req.body.password).digest('base64');

        var user = new User.User(username, User.userSource.WEB, password);
        User.login(req, res, user, function (rel) {
            switch (rel) {
                case User.loginResult.success:
                {
                    session.get(req).initUser(username, User.userSource.WEB);
                    res.locals.success = '登入成功';
                    res.redirect('/');
                    break;
                }
                case User.loginResult.userNotExist:
                {
                    res.locals.error = '用户不存在';
                    render(req, res, username);
                    break;
                }
                case User.loginResult.pwdNotMatch:
                {
                    res.locals.error = '用户口令错误';
                    render(req, res, username);
                    break;
                }
            }
        });
    };

    function render(req, res, username) {
        res.render('login', {doubanKey: setting.doubanAPIKey, domain: setting.domain, username: username})
    }
})();

exports.logout = {
    get: function (req, res) {
        session.get(req).clearUser();
        res.redirect('/');
    }
}

exports.douban = {
    get: function (req, res) {
        var code = req.param('code');
        var path = '/service/auth2/token?'
            + '&client_id=' + setting.doubanAPIKey
            + '&client_secret=' + setting.doubanSecret
            + '&redirect_uri=http://' + setting.domain + '/home/douban'
            + '&grant_type=authorization_code'
            + '&code=' + code;
        httpsPost('www.douban.com', path, null, function (err, data) {
            if (!err) {
                var json = JSON.parse(data);

                session.get(req).initUser(json.douban_user_name, User.userSource.DOUBAN);
            } else {
                console.log(err);
            }
            res.redirect('/');
        });
    }
}

exports.verify = new (function () {
    this.get = function (req, res) {

        var canvas = new Canvas(100, 30),
            ctx = canvas.getContext('2d'),
            items = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPRSTUVWXYZ23456789'.split(''),
            vcode = '',
            textColors = ['#FD0', '#6c0', '#09F', '#f30', '#aaa', '#3cc', '#cc0',
                '#A020F0', '#FFA500', '#A52A2A', '#8B6914', '#FFC0CB', '#90EE90'];

        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, 100, 30);
        ctx.font = 'bold 30px sans-serif';

        ctx.globalAlpha = .8;
        for (var i = 0; i < 4; i++) {
            var rnd = Math.random();
            var item = Math.round(rnd * (items.length - 1));
            var color = Math.round(rnd * (textColors.length - 1));
            ctx.fillStyle = textColors[color];
            ctx.fillText(items[item], 5 + i * 23, 25);
            vcode += items[item];
        }

        session.get(req).setVerifyCode(vcode);

        canvas.toBuffer(function (err, buf) {
            res.writeHead(200, { 'Content-Type': 'image/png', 'Content-Length': buf.length });
            res.end(buf);
        });
    }
})();

function httpsPost(hostname, path, postdata, onReceive) {

    var options = {
        hostname: hostname,
        path: path,
        method: 'POST',
        headers: {
            'Content-Type': "application/x-www-form-urlencoded",
            'content-length': postdata ? Buffer.byteLength(postdata) : 0
        }
    };

    var req = https.request(options, function (res) {
        res.on('data', function (d) {
            onReceive(null, d.toString('utf8'));
        });
    });
    req.end();

    req.on('error', function (e) {
        onReceive(e, null);
    });
}


