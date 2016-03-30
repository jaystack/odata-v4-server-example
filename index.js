var Parser = require('odata-v4-parser').Parser;
var parser = new Parser();

var express = require('express');
var bodyParser = require('body-parser');
var jsonParser = bodyParser.json();
var serveStatic = require('serve-static');
var app = express();

var url = require('url');
var path = require('path');
var Visitor = require('./visitor');

var mongoose = require('mongoose');
mongoose.connect('mongodb://localhost/jaystack');

var kittySchema = mongoose.Schema({
    Name: String,
	Age: Number,
	Lives: Number,
	Owner: String
}, {
	id: false
});
kittySchema.virtual('Id').get(function(){
    return this._id.toHexString();
});
kittySchema.set('toJSON', {
    virtuals: true,
	transform: function(doc, ret, options){
		delete ret._id;
		delete ret.__v;
	}
});
var models = {
	Kittens: mongoose.model('Kitten', kittySchema)
};

app.use('/odata', function(req, res, next){
	var qs = url.parse(req.url).query;
	if (qs) req.odata = parser.query(qs);
	res.send(req.url.replace(/^\//, ''));
	//next();
});

app.post('/odata/$batch', jsonParser, function(req, res, next){
	res.status(400);
	next('Not implemented');
});

app.get('/odata/$entity', function(req, res, next){
	res.status(400);
	next('Not implemented');
});

app.get('/odata/$entity/:qualifiedEntityTypeName', function(req, res, next){
	res.status(400);
	next('Not implemented');
});

app.get('/odata/$metadata', function(req, res, next){
	res.status(400);
	next('Not implemented');
});

// service document
app.get('/odata', function(req, res, next){
	res.json({
		'@odata.context': req.protocol + '://' + req.get('host') + '/odata/$metadata',
		value: [
			{
				name: 'Kittens',
				kind: 'EntitySet',
				url: 'Kittens'
			}
		]
	})
});

app.post('/odata/:entitySet', jsonParser, function(req, res, next){
	if (models[req.params.entitySet]){
		var entity = new models[req.params.entitySet](req.body);
		entity.save().then(function(result){
			if (req.headers.prefer.indexOf('return=minimal') < 0){
				res.status(201);
				res.json(result);
			}else{
				res.status(204);
				res.end();
			}
		}, next);
	}else next('Resource not found');
});

app.get('/odata/:entitySet', function(req, res, next){
	if (!models[req.params.entitySet]) return next('Resource not found');

	var visitor = new Visitor();

	if (req.odata){
		visitor.Visit(req.odata);
	}

	var callback = function(err, data){
		if (err) return next(err);

		if (req.headers.debug){
			res.json({
				entitySet: req.params.entitySet,
				query: visitor.query,
				fields: visitor.fields,
				options: visitor.options,
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

	if (models[req.params.entitySet]) models[req.params.entitySet].find(visitor.query, visitor.fields, visitor.options, callback);
	else callback(null, []);
});

app.use(serveStatic(path.join(__dirname, './public')));

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
