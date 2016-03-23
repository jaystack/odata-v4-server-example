function Visitor(){
	this.query = {};
}

Visitor.prototype.Visit = function(node, context){
	context = context || {};
	var visitor = 'Visit' + node.type;
	if (this[visitor]) this[visitor](node, context);
	return this;
};

Visitor.prototype.VisitQueryOptions = function(node, context){
	var self = this;
	node.value.options.forEach(function(option){ self.Visit(option, context); });
};

Visitor.prototype.VisitFilter = function(node, context){
	this.Visit(node.value, context);
};

Visitor.prototype.VisitAndExpression = function(node, context){
	var query = this.query;
	var leftQuery = {};
	this.query = leftQuery;
	this.Visit(node.value.left, context);

	var rightQuery = {};
	this.query = rightQuery;
	this.Visit(node.value.right, context);

	query.$and = [leftQuery, rightQuery];
	this.query = query;
};

Visitor.prototype.VisitOrExpression = function(node, context){
	var query = this.query;
	var leftQuery = {};
	this.query = leftQuery;
	this.Visit(node.value.left, context);

	var rightQuery = {};
	this.query = rightQuery;
	this.Visit(node.value.right, context);

	query.$or = [leftQuery, rightQuery];
	this.query = query;
};

Visitor.prototype.VisitBoolParenExpression = function(node, context){
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

	this.query[context.identifier] = context.literal;
	delete context.identifier;
	delete context.literal;
};

Visitor.prototype.VisitNotEqualsExpression = function(node, context){
	var left = this.Visit(node.value.left, context);
	var right = this.Visit(node.value.right, context);

	this.query[context.identifier] = { $ne: context.literal };
	delete context.identifier;
	delete context.literal;
};

Visitor.prototype.VisitLesserThanExpression = function(node, context){
	var left = this.Visit(node.value.left, context);
	var right = this.Visit(node.value.right, context);

	this.query[context.identifier] = { $lt: context.literal };
	delete context.identifier;
	delete context.literal;
};

Visitor.prototype.VisitLesserOrEqualsExpression = function(node, context){
	var left = this.Visit(node.value.left, context);
	var right = this.Visit(node.value.right, context);

	this.query[context.identifier] = { $le: context.literal };
	delete context.identifier;
	delete context.literal;
};

Visitor.prototype.VisitGreaterThanExpression = function(node, context){
	var left = this.Visit(node.value.left, context);
	var right = this.Visit(node.value.right, context);

	this.query[context.identifier] = { $gt: context.literal };
	delete context.identifier;
	delete context.literal;
};

Visitor.prototype.VisitGreaterOrEqualsExpression = function(node, context){
	var left = this.Visit(node.value.left, context);
	var right = this.Visit(node.value.right, context);

	this.query[context.identifier] = { $ge: context.literal };
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
