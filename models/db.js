var MongoClient = require('mongodb').MongoClient
    ,settings = require('../settings');

exports.connectDB = function(req, onConnect){
    if(req.mongodb){
        onOpen(req.mongodb);
    }else{
        var url = settings.dbUrl;
        MongoClient.connect(url, function (err, db) {
            req.mongodb = db;
            onConnect(db);
        });
    }
}

exports.closeDB = function(req){
    if(req.mongodb){
        req.mongodb.close();
        req.mongodb = null;
    }
}

