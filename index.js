var express = require('express');
var bodyParser = require('body-parser');
var jsonParser = bodyParser.json();
var serveStatic = require('serve-static');
var app = express();

var Parser = require('odata-v4-parser').Parser;
var parser = new Parser();

var url = require('url');
var path = require('path');
var createQuery = require('odata-v4-mongodb').createQuery;

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

app.post('/odata/\\$batch', jsonParser, function(req, res, next){
	res.status(400);
	next('Not implemented');
});

var ServiceMetadata = require('odata-v4-service-metadata').ServiceMetadata;

app.get('/odata/\\$metadata', ServiceMetadata.defineEntities({
    namespace: 'Default',
    containerName: 'Container',
    entities: [
        {
            name: 'Kitten',
            collectionName: 'Kittens',
            keys: ['Id'],
            computedKey: true,
            properties: {
                Id: 'Edm.String',
                Name: 'Edm.String',
                Age: 'Edm.Int32',
                Lives: 'Edm.Int32',
                Owner: 'Edm.String'
            },
            annotations:[
                { name: 'UI.DisplayName', value: 'Meww' },
                { property: 'Id', name: 'UI.ReadOnly', value: 'true' },
                { property: 'Title', name: 'UI.DisplayName', value: 'Meww Meww' },
            ]
        }
    ]
}).requestHandler());

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
	var find = {
		query: {},
		fields: {},
		options: {}
	};
	var qs = url.parse(req.url).query;
	if (qs){
		var query = createQuery(qs);
		find.query = query.query;
		find.fields = query.projection;
		find.options.sort = query.sort;
		find.options.skip = query.skip;
		find.options.limit = query.limit;
	}

	models.Kittens.find(find.query, find.fields, find.options, function(err, data){
		if (err) return next(err);

		res.json({
			'@odata.context': req.protocol + '://' + req.get('host') + '/odata/$metadata#Kittens',
			value: data
		});
	});
});

app.use(serveStatic(path.join(__dirname, './public')));
app.listen(52999);
