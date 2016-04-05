var express = require('express');
var bodyParser = require('body-parser');
var jsonParser = bodyParser.json();
var serveStatic = require('serve-static');
var app = express();

var Parser = require('odata-v4-parser').Parser;
var parser = new Parser();

var url = require('url');
var path = require('path');
var ODataMongoDBVisitor = require('odata-mongodb-visitor');

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

app.post('/odata/$batch', jsonParser, function(req, res, next){
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

app.post('/odata/Kittens', jsonParser, function(req, res, next){
	var entity = new models.Kittens(req.body);
	entity.save().then(function(result){
		if (req.headers.prefer && req.headers.prefer.indexOf('return=minimal') < 0){
			res.status(201);
			res.json(result);
		}else{
			res.status(204);
			res.end();
		}
	}, next);
});

app.get('/odata/Kittens', function(req, res, next){
	var visitor = new ODataMongoDBVisitor();
	var qs = url.parse(req.url).query;
	if (qs){
		var ast = parser.query(qs);
		visitor.Visit(ast);
	}

	models.Kittens.find(visitor.query, visitor.fields, visitor.options, function(err, data){
		if (err) return next(err);

		res.json({
			'@odata.context': req.protocol + '://' + req.get('host') + '/odata/$metadata#Kittens',
			value: data
		});
	});
});

app.use(serveStatic(path.join(__dirname, './public')));
app.listen(52999);
