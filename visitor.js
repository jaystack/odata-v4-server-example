function Visitor(){
	this.query = {};
	this.options = {};
	this.fields = {};
}

Visitor.prototype.Visit = function(node, context){
	context = context || {};
	var visitor = 'Visit' + node.type;
	if (this[visitor]) this[visitor](node, context);
	return this;
};

Visitor.prototype.VisitQueryOptions = function(node, context){
	var self = this;

	context.options = {};
	node.value.options.forEach(function(option){ self.Visit(option, context); });

	this.query = context.query || {};
	delete context.query;

	this.options = context.options;
	delete context.options;
};

Visitor.prototype.VisitFilter = function(node, context){
	context.query = {};
	this.Visit(node.value, context);
};

Visitor.prototype.VisitOrderBy = function(node, context){
	var self = this;
	context.options.sort = {};
	node.value.items.forEach(function(item){ self.Visit(item, context); });
};

Visitor.prototype.VisitSkip = function(node, context){
	context.options.skip = +node.value.raw;
};

Visitor.prototype.VisitTop = function(node, context){
	context.options.limit = +node.value.raw;
};

Visitor.prototype.VisitOrderByItem = function(node, context){
	this.Visit(node.value.expr, context);
	context.options.sort[context.identifier] = node.value.direction;
	delete context.identifier;
};

Visitor.prototype.VisitSelect = function(node, context){
	var self = this;

	context.fields = {};
	node.value.items.forEach(function(item){ self.Visit(item, context); });

	this.fields = context.fields;
};

Visitor.prototype.VisitSelectItem = function(node, context){
	context.fields[node.raw.replace(/\//g, '.')] = 1;
};

Visitor.prototype.VisitAndExpression = function(node, context){
	var query = context.query;
	var leftQuery = {};
	context.query = leftQuery;
	this.Visit(node.value.left, context);

	var rightQuery = {};
	context.query = rightQuery;
	this.Visit(node.value.right, context);

	query.$and = [leftQuery, rightQuery];
	context.query = query;
};

Visitor.prototype.VisitOrExpression = function(node, context){
	var query = context.query;
	var leftQuery = {};
	context.query = leftQuery;
	this.Visit(node.value.left, context);

	var rightQuery = {};
	context.query = rightQuery;
	this.Visit(node.value.right, context);

	query.$or = [leftQuery, rightQuery];
	context.query = query;
};

Visitor.prototype.VisitBoolParenExpression = function(node, context){
	this.Visit(node.value, context);
};

Visitor.prototype.VisitCommonExpression = function(node, context){
	this.Visit(node.value, context);
};

Visitor.prototype.VisitFirstMemberExpression = function(node, context){
	this.Visit(node.value, context);
};

Visitor.prototype.VisitMemberExpression = function(node, context){
	this.Visit(node.value.value, context);
};

Visitor.prototype.VisitPropertyPathExpression = function(node, context){
	this.Visit(node.value, context);
};

Visitor.prototype.VisitODataIdentifier = function(node, context){
	context.identifier = node.value.name;
};

Visitor.prototype.VisitEqualsExpression = function(node, context){
	this.Visit(node.value.left, context);
	this.Visit(node.value.right, context);

	context.query[context.identifier] = context.literal;
	delete context.identifier;
	delete context.literal;
};

Visitor.prototype.VisitNotEqualsExpression = function(node, context){
	var left = this.Visit(node.value.left, context);
	var right = this.Visit(node.value.right, context);

	context.query[context.identifier] = { $ne: context.literal };
	delete context.identifier;
	delete context.literal;
};

Visitor.prototype.VisitLesserThanExpression = function(node, context){
	var left = this.Visit(node.value.left, context);
	var right = this.Visit(node.value.right, context);

	context.query[context.identifier] = { $lt: context.literal };
	delete context.identifier;
	delete context.literal;
};

Visitor.prototype.VisitLesserOrEqualsExpression = function(node, context){
	var left = this.Visit(node.value.left, context);
	var right = this.Visit(node.value.right, context);

	context.query[context.identifier] = { $lte: context.literal };
	delete context.identifier;
	delete context.literal;
};

Visitor.prototype.VisitGreaterThanExpression = function(node, context){
	var left = this.Visit(node.value.left, context);
	var right = this.Visit(node.value.right, context);

	context.query[context.identifier] = { $gt: context.literal };
	delete context.identifier;
	delete context.literal;
};

Visitor.prototype.VisitGreaterOrEqualsExpression = function(node, context){
	var left = this.Visit(node.value.left, context);
	var right = this.Visit(node.value.right, context);

	context.query[context.identifier] = { $gte: context.literal };
	delete context.identifier;
	delete context.literal;
};

Visitor.prototype.VisitLiteral = function(node, context){
	switch (node.value){
		case 'Edm.String':
			context.literal = decodeURIComponent(node.raw).slice(1, -1).replace(/''/g, "'");
			break;
		case 'Edm.SByte':
			context.literal = +node.raw;
			break;
		default:
			context.literal = node.raw;
	}
};

module.exports = Visitor;
