var express = require('express')
    , http = require('http')
    , path = require('path')
    , domain = require('domain')
    , session = require('./models/session');

var settings = require('./settings.js');
var controllers = {};

var app = express();

app.configure(function () {
    app.set('port', process.env.PORT || 3000);
    app.set('views', __dirname + '/views');
    app.set('view engine', 'jade');
    app.use(express.favicon());
    app.use(express.bodyParser());
    app.use(express.methodOverride());
    app.use(express.cookieParser('your secret here'));
    app.use(express.session());
    app.use(express.static(path.join(__dirname, 'public')));
    app.use(express.logger('dev'));
    app.use(app.router);
});

app.configure('development', function () {
    app.use(express.errorHandler());
    app.locals.pretty = true;
});


//引入一个domain的中间件，将每一个请求都包裹在一个独立的domain中
//domain来处理异常
app.use(function (req,res, next) {
    console.log('domain of me');
//    var d = domain.create();
//    //监听domain的错误事件
//    d.on('error', function (err) {
//        logger.error(err);
//        res.statusCode = 500;
//        res.json({sucess:false, messag: '服务器异常'});
//        d.dispose();
//    });
//
//    d.add(req);
//    d.add(res);
//    d.run(next);
});

function urlRouter(req, res, controller, action, id, ispost) {
    res.locals.session = session.get(req);

    var controller = controller || 'home';
    var action = action || 'index';

    var ctr = controllers[controller]

    try {
        if (!ctr) {
            ctr = controllers[controller] = require('./routes/' + controller);
        }

        if (ctr[action].needLogin && !req.session.user) {
            res.redirect('/home/login');
        } else if (ispost) {
            ctr[action].post(req, res, id);
        } else {
            ctr[action].get(req, res, id);
        }
    } catch (err) {
        console.error(err.stack)
        res.status(404);
        res.render('layout', {error: err.stack});
    }
}

app.get('/', function (req, res) {
    urlRouter(req, res, 'home', 'index');
});

app.get('/:controller/:action?/:id?', function (req, res) {
    urlRouter(req, res, req.params.controller, req.params.action, req.params.id, false);
});

app.post('/:controller/:action?/:id?', function (req, res) {
    urlRouter(req, res, req.params.controller, req.params.action, req.params.id, true);
});


exports.listen = listen = function(port){
    app.listen(port);
    console.log('http://127.0.0.1:' + app.get('port'))
}
if (!module.parent) {
    listen(3000);
}