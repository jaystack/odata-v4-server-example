var Parser = require('odata-v4-parser').Parser;
var parser = new Parser();

var express = require('express');
var app = express();

var url = require('url');
var Visitor = require('./visitor');

var mongoose = require('mongoose');
mongoose.connect('mongodb://localhost/jaystack');

var kittySchema = mongoose.Schema({
    Name: String,
	Age: Number,
	Lives: Number,
	Owner: String
});
var models = {
	Kittens: mongoose.model('Kitten', kittySchema)
};

app.use('/odata', function(req, res, next){
	var qs = url.parse(req.url).query;
	if (qs) req.odata = parser.query(qs);
	next();
});

app.use('/odata/:entitySet', function(req, res, next){
	var visitor = new Visitor();

	if (req.odata){
		visitor.Visit(req.odata);
	}

	var callback = function(err, data){
		if (err) return next(err);

		if (req.query.debug){
			res.json({
				entitySet: req.params.entitySet,
				query: visitor.query,
				result: data,
				odata: req.odata
			});
		}else{
			res.json({
				'@odata.context': req.protocol + '://' + req.get('host') + '/odata/$metadata#' + req.params.entitySet,
				value: data
			});
		}
	};
	if (models[req.params.entitySet]) models[req.params.entitySet].find(visitor.query, { _id: 0, __v: 0 }, callback);
	else callback(null, []);
});

var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function() {
	// we're connected!
	console.log('connected to mongodb');

	var randomCat = new models.Kittens({
		Name: 'Meow #' + Math.floor(Math.random() * 100),
		Age: Math.floor(Math.random() * 20) + 1,
		Lives: Math.floor(Math.random() * 9) + 1,
		Owner: 'Happy Kitty Owner #' + Math.floor(Math.random() * 100)
	});
	randomCat.save();

	app.listen(52999);
});
