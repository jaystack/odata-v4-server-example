// JayData 1.5.1 CTP
// Dual licensed under MIT and GPL v2
// Copyright JayStack Technologies (http://jaydata.org/licensing)
//
// JayData is a standards-based, cross-platform Javascript library and a set of
// practices to access and manipulate data from various online and offline sources.
//
// Credits:
//     Hajnalka Battancs, Dániel József, János Roden, László Horváth, Péter Nochta
//     Péter Zentai, Róbert Bónay, Szabolcs Czinege, Viktor Borza, Viktor Lázár,
//     Zoltán Gyebrovszki, Gábor Dolla
//
// More info: http://jaydata.org
(function(){

var 
require=(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(_dereq_,module,exports){
(function (global){
(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.acorn = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof _dereq_=="function"&&_dereq_;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof _dereq_=="function"&&_dereq_;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(_dereq_,module,exports){
// A recursive descent parser operates by defining functions for all
// syntactic elements, and recursively calling those, each function
// advancing the input stream and returning an AST node. Precedence
// of constructs (for example, the fact that `!x[1]` means `!(x[1])`
// instead of `(!x)[1]` is handled by the fact that the parser
// function that parses unary prefix operators is called first, and
// in turn calls the function that parses `[]` subscripts — that
// way, it'll receive the node for `x[1]` already parsed, and wraps
// *that* in the unary operator node.
//
// Acorn uses an [operator precedence parser][opp] to handle binary
// operator precedence, because it is much more compact than using
// the technique outlined above, which uses different, nesting
// functions to specify precedence, for all of the ten binary
// precedence levels that JavaScript defines.
//
// [opp]: http://en.wikipedia.org/wiki/Operator-precedence_parser

"use strict";

var _tokentype = _dereq_("./tokentype");

var _state = _dereq_("./state");

var pp = _state.Parser.prototype;

// Check if property name clashes with already added.
// Object/class getters and setters are not allowed to clash —
// either with each other or with an init property — and in
// strict mode, init properties are also not allowed to be repeated.

pp.checkPropClash = function (prop, propHash) {
  if (this.options.ecmaVersion >= 6 && (prop.computed || prop.method || prop.shorthand)) return;
  var key = prop.key;var name = undefined;
  switch (key.type) {
    case "Identifier":
      name = key.name;break;
    case "Literal":
      name = String(key.value);break;
    default:
      return;
  }
  var kind = prop.kind;

  if (this.options.ecmaVersion >= 6) {
    if (name === "__proto__" && kind === "init") {
      if (propHash.proto) this.raise(key.start, "Redefinition of __proto__ property");
      propHash.proto = true;
    }
    return;
  }
  name = "$" + name;
  var other = propHash[name];
  if (other) {
    var isGetSet = kind !== "init";
    if ((this.strict || isGetSet) && other[kind] || !(isGetSet ^ other.init)) this.raise(key.start, "Redefinition of property");
  } else {
    other = propHash[name] = {
      init: false,
      get: false,
      set: false
    };
  }
  other[kind] = true;
};

// ### Expression parsing

// These nest, from the most general expression type at the top to
// 'atomic', nondivisible expression types at the bottom. Most of
// the functions will simply let the function(s) below them parse,
// and, *if* the syntactic construct they handle is present, wrap
// the AST node that the inner parser gave them in another node.

// Parse a full expression. The optional arguments are used to
// forbid the `in` operator (in for loops initalization expressions)
// and provide reference for storing '=' operator inside shorthand
// property assignment in contexts where both object expression
// and object pattern might appear (so it's possible to raise
// delayed syntax error at correct position).

pp.parseExpression = function (noIn, refDestructuringErrors) {
  var startPos = this.start,
      startLoc = this.startLoc;
  var expr = this.parseMaybeAssign(noIn, refDestructuringErrors);
  if (this.type === _tokentype.types.comma) {
    var node = this.startNodeAt(startPos, startLoc);
    node.expressions = [expr];
    while (this.eat(_tokentype.types.comma)) node.expressions.push(this.parseMaybeAssign(noIn, refDestructuringErrors));
    return this.finishNode(node, "SequenceExpression");
  }
  return expr;
};

// Parse an assignment expression. This includes applications of
// operators like `+=`.

pp.parseMaybeAssign = function (noIn, refDestructuringErrors, afterLeftParse) {
  if (this.type == _tokentype.types._yield && this.inGenerator) return this.parseYield();

  var validateDestructuring = false;
  if (!refDestructuringErrors) {
    refDestructuringErrors = { shorthandAssign: 0, trailingComma: 0 };
    validateDestructuring = true;
  }
  var startPos = this.start,
      startLoc = this.startLoc;
  if (this.type == _tokentype.types.parenL || this.type == _tokentype.types.name) this.potentialArrowAt = this.start;
  var left = this.parseMaybeConditional(noIn, refDestructuringErrors);
  if (afterLeftParse) left = afterLeftParse.call(this, left, startPos, startLoc);
  if (this.type.isAssign) {
    if (validateDestructuring) this.checkPatternErrors(refDestructuringErrors, true);
    var node = this.startNodeAt(startPos, startLoc);
    node.operator = this.value;
    node.left = this.type === _tokentype.types.eq ? this.toAssignable(left) : left;
    refDestructuringErrors.shorthandAssign = 0; // reset because shorthand default was used correctly
    this.checkLVal(left);
    this.next();
    node.right = this.parseMaybeAssign(noIn);
    return this.finishNode(node, "AssignmentExpression");
  } else {
    if (validateDestructuring) this.checkExpressionErrors(refDestructuringErrors, true);
  }
  return left;
};

// Parse a ternary conditional (`?:`) operator.

pp.parseMaybeConditional = function (noIn, refDestructuringErrors) {
  var startPos = this.start,
      startLoc = this.startLoc;
  var expr = this.parseExprOps(noIn, refDestructuringErrors);
  if (this.checkExpressionErrors(refDestructuringErrors)) return expr;
  if (this.eat(_tokentype.types.question)) {
    var node = this.startNodeAt(startPos, startLoc);
    node.test = expr;
    node.consequent = this.parseMaybeAssign();
    this.expect(_tokentype.types.colon);
    node.alternate = this.parseMaybeAssign(noIn);
    return this.finishNode(node, "ConditionalExpression");
  }
  return expr;
};

// Start the precedence parser.

pp.parseExprOps = function (noIn, refDestructuringErrors) {
  var startPos = this.start,
      startLoc = this.startLoc;
  var expr = this.parseMaybeUnary(refDestructuringErrors);
  if (this.checkExpressionErrors(refDestructuringErrors)) return expr;
  return this.parseExprOp(expr, startPos, startLoc, -1, noIn);
};

// Parse binary operators with the operator precedence parsing
// algorithm. `left` is the left-hand side of the operator.
// `minPrec` provides context that allows the function to stop and
// defer further parser to one of its callers when it encounters an
// operator that has a lower precedence than the set it is parsing.

pp.parseExprOp = function (left, leftStartPos, leftStartLoc, minPrec, noIn) {
  var prec = this.type.binop;
  if (prec != null && (!noIn || this.type !== _tokentype.types._in)) {
    if (prec > minPrec) {
      var node = this.startNodeAt(leftStartPos, leftStartLoc);
      node.left = left;
      node.operator = this.value;
      var op = this.type;
      this.next();
      var startPos = this.start,
          startLoc = this.startLoc;
      node.right = this.parseExprOp(this.parseMaybeUnary(), startPos, startLoc, prec, noIn);
      this.finishNode(node, op === _tokentype.types.logicalOR || op === _tokentype.types.logicalAND ? "LogicalExpression" : "BinaryExpression");
      return this.parseExprOp(node, leftStartPos, leftStartLoc, minPrec, noIn);
    }
  }
  return left;
};

// Parse unary operators, both prefix and postfix.

pp.parseMaybeUnary = function (refDestructuringErrors) {
  if (this.type.prefix) {
    var node = this.startNode(),
        update = this.type === _tokentype.types.incDec;
    node.operator = this.value;
    node.prefix = true;
    this.next();
    node.argument = this.parseMaybeUnary();
    this.checkExpressionErrors(refDestructuringErrors, true);
    if (update) this.checkLVal(node.argument);else if (this.strict && node.operator === "delete" && node.argument.type === "Identifier") this.raise(node.start, "Deleting local variable in strict mode");
    return this.finishNode(node, update ? "UpdateExpression" : "UnaryExpression");
  }
  var startPos = this.start,
      startLoc = this.startLoc;
  var expr = this.parseExprSubscripts(refDestructuringErrors);
  if (this.checkExpressionErrors(refDestructuringErrors)) return expr;
  while (this.type.postfix && !this.canInsertSemicolon()) {
    var node = this.startNodeAt(startPos, startLoc);
    node.operator = this.value;
    node.prefix = false;
    node.argument = expr;
    this.checkLVal(expr);
    this.next();
    expr = this.finishNode(node, "UpdateExpression");
  }
  return expr;
};

// Parse call, dot, and `[]`-subscript expressions.

pp.parseExprSubscripts = function (refDestructuringErrors) {
  var startPos = this.start,
      startLoc = this.startLoc;
  var expr = this.parseExprAtom(refDestructuringErrors);
  var skipArrowSubscripts = expr.type === "ArrowFunctionExpression" && this.input.slice(this.lastTokStart, this.lastTokEnd) !== ")";
  if (this.checkExpressionErrors(refDestructuringErrors) || skipArrowSubscripts) return expr;
  return this.parseSubscripts(expr, startPos, startLoc);
};

pp.parseSubscripts = function (base, startPos, startLoc, noCalls) {
  for (;;) {
    if (this.eat(_tokentype.types.dot)) {
      var node = this.startNodeAt(startPos, startLoc);
      node.object = base;
      node.property = this.parseIdent(true);
      node.computed = false;
      base = this.finishNode(node, "MemberExpression");
    } else if (this.eat(_tokentype.types.bracketL)) {
      var node = this.startNodeAt(startPos, startLoc);
      node.object = base;
      node.property = this.parseExpression();
      node.computed = true;
      this.expect(_tokentype.types.bracketR);
      base = this.finishNode(node, "MemberExpression");
    } else if (!noCalls && this.eat(_tokentype.types.parenL)) {
      var node = this.startNodeAt(startPos, startLoc);
      node.callee = base;
      node.arguments = this.parseExprList(_tokentype.types.parenR, false);
      base = this.finishNode(node, "CallExpression");
    } else if (this.type === _tokentype.types.backQuote) {
      var node = this.startNodeAt(startPos, startLoc);
      node.tag = base;
      node.quasi = this.parseTemplate();
      base = this.finishNode(node, "TaggedTemplateExpression");
    } else {
      return base;
    }
  }
};

// Parse an atomic expression — either a single token that is an
// expression, an expression started by a keyword like `function` or
// `new`, or an expression wrapped in punctuation like `()`, `[]`,
// or `{}`.

pp.parseExprAtom = function (refDestructuringErrors) {
  var node = undefined,
      canBeArrow = this.potentialArrowAt == this.start;
  switch (this.type) {
    case _tokentype.types._super:
      if (!this.inFunction) this.raise(this.start, "'super' outside of function or class");
    case _tokentype.types._this:
      var type = this.type === _tokentype.types._this ? "ThisExpression" : "Super";
      node = this.startNode();
      this.next();
      return this.finishNode(node, type);

    case _tokentype.types._yield:
      if (this.inGenerator) this.unexpected();

    case _tokentype.types.name:
      var startPos = this.start,
          startLoc = this.startLoc;
      var id = this.parseIdent(this.type !== _tokentype.types.name);
      if (canBeArrow && !this.canInsertSemicolon() && this.eat(_tokentype.types.arrow)) return this.parseArrowExpression(this.startNodeAt(startPos, startLoc), [id]);
      return id;

    case _tokentype.types.regexp:
      var value = this.value;
      node = this.parseLiteral(value.value);
      node.regex = { pattern: value.pattern, flags: value.flags };
      return node;

    case _tokentype.types.num:case _tokentype.types.string:
      return this.parseLiteral(this.value);

    case _tokentype.types._null:case _tokentype.types._true:case _tokentype.types._false:
      node = this.startNode();
      node.value = this.type === _tokentype.types._null ? null : this.type === _tokentype.types._true;
      node.raw = this.type.keyword;
      this.next();
      return this.finishNode(node, "Literal");

    case _tokentype.types.parenL:
      return this.parseParenAndDistinguishExpression(canBeArrow);

    case _tokentype.types.bracketL:
      node = this.startNode();
      this.next();
      // check whether this is array comprehension or regular array
      if (this.options.ecmaVersion >= 7 && this.type === _tokentype.types._for) {
        return this.parseComprehension(node, false);
      }
      node.elements = this.parseExprList(_tokentype.types.bracketR, true, true, refDestructuringErrors);
      return this.finishNode(node, "ArrayExpression");

    case _tokentype.types.braceL:
      return this.parseObj(false, refDestructuringErrors);

    case _tokentype.types._function:
      node = this.startNode();
      this.next();
      return this.parseFunction(node, false);

    case _tokentype.types._class:
      return this.parseClass(this.startNode(), false);

    case _tokentype.types._new:
      return this.parseNew();

    case _tokentype.types.backQuote:
      return this.parseTemplate();

    default:
      this.unexpected();
  }
};

pp.parseLiteral = function (value) {
  var node = this.startNode();
  node.value = value;
  node.raw = this.input.slice(this.start, this.end);
  this.next();
  return this.finishNode(node, "Literal");
};

pp.parseParenExpression = function () {
  this.expect(_tokentype.types.parenL);
  var val = this.parseExpression();
  this.expect(_tokentype.types.parenR);
  return val;
};

pp.parseParenAndDistinguishExpression = function (canBeArrow) {
  var startPos = this.start,
      startLoc = this.startLoc,
      val = undefined;
  if (this.options.ecmaVersion >= 6) {
    this.next();

    if (this.options.ecmaVersion >= 7 && this.type === _tokentype.types._for) {
      return this.parseComprehension(this.startNodeAt(startPos, startLoc), true);
    }

    var innerStartPos = this.start,
        innerStartLoc = this.startLoc;
    var exprList = [],
        first = true;
    var refDestructuringErrors = { shorthandAssign: 0, trailingComma: 0 },
        spreadStart = undefined,
        innerParenStart = undefined;
    while (this.type !== _tokentype.types.parenR) {
      first ? first = false : this.expect(_tokentype.types.comma);
      if (this.type === _tokentype.types.ellipsis) {
        spreadStart = this.start;
        exprList.push(this.parseParenItem(this.parseRest()));
        break;
      } else {
        if (this.type === _tokentype.types.parenL && !innerParenStart) {
          innerParenStart = this.start;
        }
        exprList.push(this.parseMaybeAssign(false, refDestructuringErrors, this.parseParenItem));
      }
    }
    var innerEndPos = this.start,
        innerEndLoc = this.startLoc;
    this.expect(_tokentype.types.parenR);

    if (canBeArrow && !this.canInsertSemicolon() && this.eat(_tokentype.types.arrow)) {
      this.checkPatternErrors(refDestructuringErrors, true);
      if (innerParenStart) this.unexpected(innerParenStart);
      return this.parseParenArrowList(startPos, startLoc, exprList);
    }

    if (!exprList.length) this.unexpected(this.lastTokStart);
    if (spreadStart) this.unexpected(spreadStart);
    this.checkExpressionErrors(refDestructuringErrors, true);

    if (exprList.length > 1) {
      val = this.startNodeAt(innerStartPos, innerStartLoc);
      val.expressions = exprList;
      this.finishNodeAt(val, "SequenceExpression", innerEndPos, innerEndLoc);
    } else {
      val = exprList[0];
    }
  } else {
    val = this.parseParenExpression();
  }

  if (this.options.preserveParens) {
    var par = this.startNodeAt(startPos, startLoc);
    par.expression = val;
    return this.finishNode(par, "ParenthesizedExpression");
  } else {
    return val;
  }
};

pp.parseParenItem = function (item) {
  return item;
};

pp.parseParenArrowList = function (startPos, startLoc, exprList) {
  return this.parseArrowExpression(this.startNodeAt(startPos, startLoc), exprList);
};

// New's precedence is slightly tricky. It must allow its argument to
// be a `[]` or dot subscript expression, but not a call — at least,
// not without wrapping it in parentheses. Thus, it uses the noCalls
// argument to parseSubscripts to prevent it from consuming the
// argument list.

var empty = [];

pp.parseNew = function () {
  var node = this.startNode();
  var meta = this.parseIdent(true);
  if (this.options.ecmaVersion >= 6 && this.eat(_tokentype.types.dot)) {
    node.meta = meta;
    node.property = this.parseIdent(true);
    if (node.property.name !== "target") this.raise(node.property.start, "The only valid meta property for new is new.target");
    if (!this.inFunction) this.raise(node.start, "new.target can only be used in functions");
    return this.finishNode(node, "MetaProperty");
  }
  var startPos = this.start,
      startLoc = this.startLoc;
  node.callee = this.parseSubscripts(this.parseExprAtom(), startPos, startLoc, true);
  if (this.eat(_tokentype.types.parenL)) node.arguments = this.parseExprList(_tokentype.types.parenR, false);else node.arguments = empty;
  return this.finishNode(node, "NewExpression");
};

// Parse template expression.

pp.parseTemplateElement = function () {
  var elem = this.startNode();
  elem.value = {
    raw: this.input.slice(this.start, this.end).replace(/\r\n?/g, '\n'),
    cooked: this.value
  };
  this.next();
  elem.tail = this.type === _tokentype.types.backQuote;
  return this.finishNode(elem, "TemplateElement");
};

pp.parseTemplate = function () {
  var node = this.startNode();
  this.next();
  node.expressions = [];
  var curElt = this.parseTemplateElement();
  node.quasis = [curElt];
  while (!curElt.tail) {
    this.expect(_tokentype.types.dollarBraceL);
    node.expressions.push(this.parseExpression());
    this.expect(_tokentype.types.braceR);
    node.quasis.push(curElt = this.parseTemplateElement());
  }
  this.next();
  return this.finishNode(node, "TemplateLiteral");
};

// Parse an object literal or binding pattern.

pp.parseObj = function (isPattern, refDestructuringErrors) {
  var node = this.startNode(),
      first = true,
      propHash = {};
  node.properties = [];
  this.next();
  while (!this.eat(_tokentype.types.braceR)) {
    if (!first) {
      this.expect(_tokentype.types.comma);
      if (this.afterTrailingComma(_tokentype.types.braceR)) break;
    } else first = false;

    var prop = this.startNode(),
        isGenerator = undefined,
        startPos = undefined,
        startLoc = undefined;
    if (this.options.ecmaVersion >= 6) {
      prop.method = false;
      prop.shorthand = false;
      if (isPattern || refDestructuringErrors) {
        startPos = this.start;
        startLoc = this.startLoc;
      }
      if (!isPattern) isGenerator = this.eat(_tokentype.types.star);
    }
    this.parsePropertyName(prop);
    this.parsePropertyValue(prop, isPattern, isGenerator, startPos, startLoc, refDestructuringErrors);
    this.checkPropClash(prop, propHash);
    node.properties.push(this.finishNode(prop, "Property"));
  }
  return this.finishNode(node, isPattern ? "ObjectPattern" : "ObjectExpression");
};

pp.parsePropertyValue = function (prop, isPattern, isGenerator, startPos, startLoc, refDestructuringErrors) {
  if (this.eat(_tokentype.types.colon)) {
    prop.value = isPattern ? this.parseMaybeDefault(this.start, this.startLoc) : this.parseMaybeAssign(false, refDestructuringErrors);
    prop.kind = "init";
  } else if (this.options.ecmaVersion >= 6 && this.type === _tokentype.types.parenL) {
    if (isPattern) this.unexpected();
    prop.kind = "init";
    prop.method = true;
    prop.value = this.parseMethod(isGenerator);
  } else if (this.options.ecmaVersion >= 5 && !prop.computed && prop.key.type === "Identifier" && (prop.key.name === "get" || prop.key.name === "set") && (this.type != _tokentype.types.comma && this.type != _tokentype.types.braceR)) {
    if (isGenerator || isPattern) this.unexpected();
    prop.kind = prop.key.name;
    this.parsePropertyName(prop);
    prop.value = this.parseMethod(false);
    var paramCount = prop.kind === "get" ? 0 : 1;
    if (prop.value.params.length !== paramCount) {
      var start = prop.value.start;
      if (prop.kind === "get") this.raise(start, "getter should have no params");else this.raise(start, "setter should have exactly one param");
    }
    if (prop.kind === "set" && prop.value.params[0].type === "RestElement") this.raise(prop.value.params[0].start, "Setter cannot use rest params");
  } else if (this.options.ecmaVersion >= 6 && !prop.computed && prop.key.type === "Identifier") {
    prop.kind = "init";
    if (isPattern) {
      if (this.keywords.test(prop.key.name) || (this.strict ? this.reservedWordsStrictBind : this.reservedWords).test(prop.key.name)) this.raise(prop.key.start, "Binding " + prop.key.name);
      prop.value = this.parseMaybeDefault(startPos, startLoc, prop.key);
    } else if (this.type === _tokentype.types.eq && refDestructuringErrors) {
      if (!refDestructuringErrors.shorthandAssign) refDestructuringErrors.shorthandAssign = this.start;
      prop.value = this.parseMaybeDefault(startPos, startLoc, prop.key);
    } else {
      prop.value = prop.key;
    }
    prop.shorthand = true;
  } else this.unexpected();
};

pp.parsePropertyName = function (prop) {
  if (this.options.ecmaVersion >= 6) {
    if (this.eat(_tokentype.types.bracketL)) {
      prop.computed = true;
      prop.key = this.parseMaybeAssign();
      this.expect(_tokentype.types.bracketR);
      return prop.key;
    } else {
      prop.computed = false;
    }
  }
  return prop.key = this.type === _tokentype.types.num || this.type === _tokentype.types.string ? this.parseExprAtom() : this.parseIdent(true);
};

// Initialize empty function node.

pp.initFunction = function (node) {
  node.id = null;
  if (this.options.ecmaVersion >= 6) {
    node.generator = false;
    node.expression = false;
  }
};

// Parse object or class method.

pp.parseMethod = function (isGenerator) {
  var node = this.startNode();
  this.initFunction(node);
  this.expect(_tokentype.types.parenL);
  node.params = this.parseBindingList(_tokentype.types.parenR, false, false);
  if (this.options.ecmaVersion >= 6) node.generator = isGenerator;
  this.parseFunctionBody(node, false);
  return this.finishNode(node, "FunctionExpression");
};

// Parse arrow function expression with given parameters.

pp.parseArrowExpression = function (node, params) {
  this.initFunction(node);
  node.params = this.toAssignableList(params, true);
  this.parseFunctionBody(node, true);
  return this.finishNode(node, "ArrowFunctionExpression");
};

// Parse function body and check parameters.

pp.parseFunctionBody = function (node, isArrowFunction) {
  var isExpression = isArrowFunction && this.type !== _tokentype.types.braceL;

  if (isExpression) {
    node.body = this.parseMaybeAssign();
    node.expression = true;
  } else {
    // Start a new scope with regard to labels and the `inFunction`
    // flag (restore them to their old value afterwards).
    var oldInFunc = this.inFunction,
        oldInGen = this.inGenerator,
        oldLabels = this.labels;
    this.inFunction = true;this.inGenerator = node.generator;this.labels = [];
    node.body = this.parseBlock(true);
    node.expression = false;
    this.inFunction = oldInFunc;this.inGenerator = oldInGen;this.labels = oldLabels;
  }

  // If this is a strict mode function, verify that argument names
  // are not repeated, and it does not try to bind the words `eval`
  // or `arguments`.
  if (this.strict || !isExpression && node.body.body.length && this.isUseStrict(node.body.body[0])) {
    var oldStrict = this.strict;
    this.strict = true;
    if (node.id) this.checkLVal(node.id, true);
    this.checkParams(node);
    this.strict = oldStrict;
  } else if (isArrowFunction) {
    this.checkParams(node);
  }
};

// Checks function params for various disallowed patterns such as using "eval"
// or "arguments" and duplicate parameters.

pp.checkParams = function (node) {
  var nameHash = {};
  for (var i = 0; i < node.params.length; i++) {
    this.checkLVal(node.params[i], true, nameHash);
  }
};

// Parses a comma-separated list of expressions, and returns them as
// an array. `close` is the token type that ends the list, and
// `allowEmpty` can be turned on to allow subsequent commas with
// nothing in between them to be parsed as `null` (which is needed
// for array literals).

pp.parseExprList = function (close, allowTrailingComma, allowEmpty, refDestructuringErrors) {
  var elts = [],
      first = true;
  while (!this.eat(close)) {
    if (!first) {
      this.expect(_tokentype.types.comma);
      if (this.type === close && refDestructuringErrors && !refDestructuringErrors.trailingComma) {
        refDestructuringErrors.trailingComma = this.lastTokStart;
      }
      if (allowTrailingComma && this.afterTrailingComma(close)) break;
    } else first = false;

    var elt = undefined;
    if (allowEmpty && this.type === _tokentype.types.comma) elt = null;else if (this.type === _tokentype.types.ellipsis) elt = this.parseSpread(refDestructuringErrors);else elt = this.parseMaybeAssign(false, refDestructuringErrors);
    elts.push(elt);
  }
  return elts;
};

// Parse the next token as an identifier. If `liberal` is true (used
// when parsing properties), it will also convert keywords into
// identifiers.

pp.parseIdent = function (liberal) {
  var node = this.startNode();
  if (liberal && this.options.allowReserved == "never") liberal = false;
  if (this.type === _tokentype.types.name) {
    if (!liberal && (this.strict ? this.reservedWordsStrict : this.reservedWords).test(this.value) && (this.options.ecmaVersion >= 6 || this.input.slice(this.start, this.end).indexOf("\\") == -1)) this.raise(this.start, "The keyword '" + this.value + "' is reserved");
    node.name = this.value;
  } else if (liberal && this.type.keyword) {
    node.name = this.type.keyword;
  } else {
    this.unexpected();
  }
  this.next();
  return this.finishNode(node, "Identifier");
};

// Parses yield expression inside generator.

pp.parseYield = function () {
  var node = this.startNode();
  this.next();
  if (this.type == _tokentype.types.semi || this.canInsertSemicolon() || this.type != _tokentype.types.star && !this.type.startsExpr) {
    node.delegate = false;
    node.argument = null;
  } else {
    node.delegate = this.eat(_tokentype.types.star);
    node.argument = this.parseMaybeAssign();
  }
  return this.finishNode(node, "YieldExpression");
};

// Parses array and generator comprehensions.

pp.parseComprehension = function (node, isGenerator) {
  node.blocks = [];
  while (this.type === _tokentype.types._for) {
    var block = this.startNode();
    this.next();
    this.expect(_tokentype.types.parenL);
    block.left = this.parseBindingAtom();
    this.checkLVal(block.left, true);
    this.expectContextual("of");
    block.right = this.parseExpression();
    this.expect(_tokentype.types.parenR);
    node.blocks.push(this.finishNode(block, "ComprehensionBlock"));
  }
  node.filter = this.eat(_tokentype.types._if) ? this.parseParenExpression() : null;
  node.body = this.parseExpression();
  this.expect(isGenerator ? _tokentype.types.parenR : _tokentype.types.bracketR);
  node.generator = isGenerator;
  return this.finishNode(node, "ComprehensionExpression");
};

},{"./state":10,"./tokentype":14}],2:[function(_dereq_,module,exports){
// This is a trick taken from Esprima. It turns out that, on
// non-Chrome browsers, to check whether a string is in a set, a
// predicate containing a big ugly `switch` statement is faster than
// a regular expression, and on Chrome the two are about on par.
// This function uses `eval` (non-lexical) to produce such a
// predicate from a space-separated string of words.
//
// It starts by sorting the words by length.

// Reserved word lists for various dialects of the language

"use strict";

exports.__esModule = true;
exports.isIdentifierStart = isIdentifierStart;
exports.isIdentifierChar = isIdentifierChar;
var reservedWords = {
  3: "abstract boolean byte char class double enum export extends final float goto implements import int interface long native package private protected public short static super synchronized throws transient volatile",
  5: "class enum extends super const export import",
  6: "enum",
  strict: "implements interface let package private protected public static yield",
  strictBind: "eval arguments"
};

exports.reservedWords = reservedWords;
// And the keywords

var ecma5AndLessKeywords = "break case catch continue debugger default do else finally for function if return switch throw try var while with null true false instanceof typeof void delete new in this";

var keywords = {
  5: ecma5AndLessKeywords,
  6: ecma5AndLessKeywords + " let const class extends export import yield super"
};

exports.keywords = keywords;
// ## Character categories

// Big ugly regular expressions that match characters in the
// whitespace, identifier, and identifier-start categories. These
// are only applied when a character is found to actually have a
// code point above 128.
// Generated by `bin/generate-identifier-regex.js`.

var nonASCIIidentifierStartChars = "ªµºÀ-ÖØ-öø-ˁˆ-ˑˠ-ˤˬˮͰ-ʹͶͷͺ-ͽͿΆΈ-ΊΌΎ-ΡΣ-ϵϷ-ҁҊ-ԯԱ-Ֆՙա-ևא-תװ-ײؠ-يٮٯٱ-ۓەۥۦۮۯۺ-ۼۿܐܒ-ܯݍ-ޥޱߊ-ߪߴߵߺࠀ-ࠕࠚࠤࠨࡀ-ࡘࢠ-ࢲऄ-हऽॐक़-ॡॱ-ঀঅ-ঌএঐও-নপ-রলশ-হঽৎড়ঢ়য়-ৡৰৱਅ-ਊਏਐਓ-ਨਪ-ਰਲਲ਼ਵਸ਼ਸਹਖ਼-ੜਫ਼ੲ-ੴઅ-ઍએ-ઑઓ-નપ-રલળવ-હઽૐૠૡଅ-ଌଏଐଓ-ନପ-ରଲଳଵ-ହଽଡ଼ଢ଼ୟ-ୡୱஃஅ-ஊஎ-ஐஒ-கஙசஜஞடணதந-பம-ஹௐఅ-ఌఎ-ఐఒ-నప-హఽౘౙౠౡಅ-ಌಎ-ಐಒ-ನಪ-ಳವ-ಹಽೞೠೡೱೲഅ-ഌഎ-ഐഒ-ഺഽൎൠൡൺ-ൿඅ-ඖක-නඳ-රලව-ෆก-ะาำเ-ๆກຂຄງຈຊຍດ-ທນ-ຟມ-ຣລວສຫອ-ະາຳຽເ-ໄໆໜ-ໟༀཀ-ཇཉ-ཬྈ-ྌက-ဪဿၐ-ၕၚ-ၝၡၥၦၮ-ၰၵ-ႁႎႠ-ჅჇჍა-ჺჼ-ቈቊ-ቍቐ-ቖቘቚ-ቝበ-ኈኊ-ኍነ-ኰኲ-ኵኸ-ኾዀዂ-ዅወ-ዖዘ-ጐጒ-ጕጘ-ፚᎀ-ᎏᎠ-Ᏼᐁ-ᙬᙯ-ᙿᚁ-ᚚᚠ-ᛪᛮ-ᛸᜀ-ᜌᜎ-ᜑᜠ-ᜱᝀ-ᝑᝠ-ᝬᝮ-ᝰក-ឳៗៜᠠ-ᡷᢀ-ᢨᢪᢰ-ᣵᤀ-ᤞᥐ-ᥭᥰ-ᥴᦀ-ᦫᧁ-ᧇᨀ-ᨖᨠ-ᩔᪧᬅ-ᬳᭅ-ᭋᮃ-ᮠᮮᮯᮺ-ᯥᰀ-ᰣᱍ-ᱏᱚ-ᱽᳩ-ᳬᳮ-ᳱᳵᳶᴀ-ᶿḀ-ἕἘ-Ἕἠ-ὅὈ-Ὅὐ-ὗὙὛὝὟ-ώᾀ-ᾴᾶ-ᾼιῂ-ῄῆ-ῌῐ-ΐῖ-Ίῠ-Ῥῲ-ῴῶ-ῼⁱⁿₐ-ₜℂℇℊ-ℓℕ℘-ℝℤΩℨK-ℹℼ-ℿⅅ-ⅉⅎⅠ-ↈⰀ-Ⱞⰰ-ⱞⱠ-ⳤⳫ-ⳮⳲⳳⴀ-ⴥⴧⴭⴰ-ⵧⵯⶀ-ⶖⶠ-ⶦⶨ-ⶮⶰ-ⶶⶸ-ⶾⷀ-ⷆⷈ-ⷎⷐ-ⷖⷘ-ⷞ々-〇〡-〩〱-〵〸-〼ぁ-ゖ゛-ゟァ-ヺー-ヿㄅ-ㄭㄱ-ㆎㆠ-ㆺㇰ-ㇿ㐀-䶵一-鿌ꀀ-ꒌꓐ-ꓽꔀ-ꘌꘐ-ꘟꘪꘫꙀ-ꙮꙿ-ꚝꚠ-ꛯꜗ-ꜟꜢ-ꞈꞋ-ꞎꞐ-ꞭꞰꞱꟷ-ꠁꠃ-ꠅꠇ-ꠊꠌ-ꠢꡀ-ꡳꢂ-ꢳꣲ-ꣷꣻꤊ-ꤥꤰ-ꥆꥠ-ꥼꦄ-ꦲꧏꧠ-ꧤꧦ-ꧯꧺ-ꧾꨀ-ꨨꩀ-ꩂꩄ-ꩋꩠ-ꩶꩺꩾ-ꪯꪱꪵꪶꪹ-ꪽꫀꫂꫛ-ꫝꫠ-ꫪꫲ-ꫴꬁ-ꬆꬉ-ꬎꬑ-ꬖꬠ-ꬦꬨ-ꬮꬰ-ꭚꭜ-ꭟꭤꭥꯀ-ꯢ가-힣ힰ-ퟆퟋ-ퟻ豈-舘並-龎ﬀ-ﬆﬓ-ﬗיִײַ-ﬨשׁ-זּטּ-לּמּנּסּףּפּצּ-ﮱﯓ-ﴽﵐ-ﶏﶒ-ﷇﷰ-ﷻﹰ-ﹴﹶ-ﻼＡ-Ｚａ-ｚｦ-ﾾￂ-ￇￊ-ￏￒ-ￗￚ-ￜ";
var nonASCIIidentifierChars = "‌‍·̀-ͯ·҃-֑҇-ׇֽֿׁׂׅׄؐ-ًؚ-٩ٰۖ-ۜ۟-۪ۤۧۨ-ۭ۰-۹ܑܰ-݊ަ-ް߀-߉߫-߳ࠖ-࠙ࠛ-ࠣࠥ-ࠧࠩ-࡙࠭-࡛ࣤ-ःऺ-़ा-ॏ॑-ॗॢॣ०-९ঁ-ঃ়া-ৄেৈো-্ৗৢৣ০-৯ਁ-ਃ਼ਾ-ੂੇੈੋ-੍ੑ੦-ੱੵઁ-ઃ઼ા-ૅે-ૉો-્ૢૣ૦-૯ଁ-ଃ଼ା-ୄେୈୋ-୍ୖୗୢୣ୦-୯ஂா-ூெ-ைொ-்ௗ௦-௯ఀ-ఃా-ౄె-ైొ-్ౕౖౢౣ౦-౯ಁ-ಃ಼ಾ-ೄೆ-ೈೊ-್ೕೖೢೣ೦-೯ഁ-ഃാ-ൄെ-ൈൊ-്ൗൢൣ൦-൯ංඃ්ා-ුූෘ-ෟ෦-෯ෲෳัิ-ฺ็-๎๐-๙ັິ-ູົຼ່-ໍ໐-໙༘༙༠-༩༹༵༷༾༿ཱ-྄྆྇ྍ-ྗྙ-ྼ࿆ါ-ှ၀-၉ၖ-ၙၞ-ၠၢ-ၤၧ-ၭၱ-ၴႂ-ႍႏ-ႝ፝-፟፩-፱ᜒ-᜔ᜲ-᜴ᝒᝓᝲᝳ឴-៓៝០-៩᠋-᠍᠐-᠙ᢩᤠ-ᤫᤰ-᤻᥆-᥏ᦰ-ᧀᧈᧉ᧐-᧚ᨗ-ᨛᩕ-ᩞ᩠-᩿᩼-᪉᪐-᪙᪰-᪽ᬀ-ᬄ᬴-᭄᭐-᭙᭫-᭳ᮀ-ᮂᮡ-ᮭ᮰-᮹᯦-᯳ᰤ-᰷᱀-᱉᱐-᱙᳐-᳔᳒-᳨᳭ᳲ-᳴᳸᳹᷀-᷵᷼-᷿‿⁀⁔⃐-⃥⃜⃡-⃰⳯-⵿⳱ⷠ-〪ⷿ-゙゚〯꘠-꘩꙯ꙴ-꙽ꚟ꛰꛱ꠂ꠆ꠋꠣ-ꠧꢀꢁꢴ-꣄꣐-꣙꣠-꣱꤀-꤉ꤦ-꤭ꥇ-꥓ꦀ-ꦃ꦳-꧀꧐-꧙ꧥ꧰-꧹ꨩ-ꨶꩃꩌꩍ꩐-꩙ꩻ-ꩽꪰꪲ-ꪴꪷꪸꪾ꪿꫁ꫫ-ꫯꫵ꫶ꯣ-ꯪ꯬꯭꯰-꯹ﬞ︀-️︠-︭︳︴﹍-﹏０-９＿";

var nonASCIIidentifierStart = new RegExp("[" + nonASCIIidentifierStartChars + "]");
var nonASCIIidentifier = new RegExp("[" + nonASCIIidentifierStartChars + nonASCIIidentifierChars + "]");

nonASCIIidentifierStartChars = nonASCIIidentifierChars = null;

// These are a run-length and offset encoded representation of the
// >0xffff code points that are a valid part of identifiers. The
// offset starts at 0x10000, and each pair of numbers represents an
// offset to the next range, and then a size of the range. They were
// generated by tools/generate-identifier-regex.js
var astralIdentifierStartCodes = [0, 11, 2, 25, 2, 18, 2, 1, 2, 14, 3, 13, 35, 122, 70, 52, 268, 28, 4, 48, 48, 31, 17, 26, 6, 37, 11, 29, 3, 35, 5, 7, 2, 4, 43, 157, 99, 39, 9, 51, 157, 310, 10, 21, 11, 7, 153, 5, 3, 0, 2, 43, 2, 1, 4, 0, 3, 22, 11, 22, 10, 30, 98, 21, 11, 25, 71, 55, 7, 1, 65, 0, 16, 3, 2, 2, 2, 26, 45, 28, 4, 28, 36, 7, 2, 27, 28, 53, 11, 21, 11, 18, 14, 17, 111, 72, 955, 52, 76, 44, 33, 24, 27, 35, 42, 34, 4, 0, 13, 47, 15, 3, 22, 0, 38, 17, 2, 24, 133, 46, 39, 7, 3, 1, 3, 21, 2, 6, 2, 1, 2, 4, 4, 0, 32, 4, 287, 47, 21, 1, 2, 0, 185, 46, 82, 47, 21, 0, 60, 42, 502, 63, 32, 0, 449, 56, 1288, 920, 104, 110, 2962, 1070, 13266, 568, 8, 30, 114, 29, 19, 47, 17, 3, 32, 20, 6, 18, 881, 68, 12, 0, 67, 12, 16481, 1, 3071, 106, 6, 12, 4, 8, 8, 9, 5991, 84, 2, 70, 2, 1, 3, 0, 3, 1, 3, 3, 2, 11, 2, 0, 2, 6, 2, 64, 2, 3, 3, 7, 2, 6, 2, 27, 2, 3, 2, 4, 2, 0, 4, 6, 2, 339, 3, 24, 2, 24, 2, 30, 2, 24, 2, 30, 2, 24, 2, 30, 2, 24, 2, 30, 2, 24, 2, 7, 4149, 196, 1340, 3, 2, 26, 2, 1, 2, 0, 3, 0, 2, 9, 2, 3, 2, 0, 2, 0, 7, 0, 5, 0, 2, 0, 2, 0, 2, 2, 2, 1, 2, 0, 3, 0, 2, 0, 2, 0, 2, 0, 2, 0, 2, 1, 2, 0, 3, 3, 2, 6, 2, 3, 2, 3, 2, 0, 2, 9, 2, 16, 6, 2, 2, 4, 2, 16, 4421, 42710, 42, 4148, 12, 221, 16355, 541];
var astralIdentifierCodes = [509, 0, 227, 0, 150, 4, 294, 9, 1368, 2, 2, 1, 6, 3, 41, 2, 5, 0, 166, 1, 1306, 2, 54, 14, 32, 9, 16, 3, 46, 10, 54, 9, 7, 2, 37, 13, 2, 9, 52, 0, 13, 2, 49, 13, 16, 9, 83, 11, 168, 11, 6, 9, 8, 2, 57, 0, 2, 6, 3, 1, 3, 2, 10, 0, 11, 1, 3, 6, 4, 4, 316, 19, 13, 9, 214, 6, 3, 8, 112, 16, 16, 9, 82, 12, 9, 9, 535, 9, 20855, 9, 135, 4, 60, 6, 26, 9, 1016, 45, 17, 3, 19723, 1, 5319, 4, 4, 5, 9, 7, 3, 6, 31, 3, 149, 2, 1418, 49, 4305, 6, 792618, 239];

// This has a complexity linear to the value of the code. The
// assumption is that looking up astral identifier characters is
// rare.
function isInAstralSet(code, set) {
  var pos = 0x10000;
  for (var i = 0; i < set.length; i += 2) {
    pos += set[i];
    if (pos > code) return false;
    pos += set[i + 1];
    if (pos >= code) return true;
  }
}

// Test whether a given character code starts an identifier.

function isIdentifierStart(code, astral) {
  if (code < 65) return code === 36;
  if (code < 91) return true;
  if (code < 97) return code === 95;
  if (code < 123) return true;
  if (code <= 0xffff) return code >= 0xaa && nonASCIIidentifierStart.test(String.fromCharCode(code));
  if (astral === false) return false;
  return isInAstralSet(code, astralIdentifierStartCodes);
}

// Test whether a given character is part of an identifier.

function isIdentifierChar(code, astral) {
  if (code < 48) return code === 36;
  if (code < 58) return true;
  if (code < 65) return false;
  if (code < 91) return true;
  if (code < 97) return code === 95;
  if (code < 123) return true;
  if (code <= 0xffff) return code >= 0xaa && nonASCIIidentifier.test(String.fromCharCode(code));
  if (astral === false) return false;
  return isInAstralSet(code, astralIdentifierStartCodes) || isInAstralSet(code, astralIdentifierCodes);
}

},{}],3:[function(_dereq_,module,exports){
// Acorn is a tiny, fast JavaScript parser written in JavaScript.
//
// Acorn was written by Marijn Haverbeke, Ingvar Stepanyan, and
// various contributors and released under an MIT license.
//
// Git repositories for Acorn are available at
//
//     http://marijnhaverbeke.nl/git/acorn
//     https://github.com/ternjs/acorn.git
//
// Please use the [github bug tracker][ghbt] to report issues.
//
// [ghbt]: https://github.com/ternjs/acorn/issues
//
// This file defines the main parser interface. The library also comes
// with a [error-tolerant parser][dammit] and an
// [abstract syntax tree walker][walk], defined in other files.
//
// [dammit]: acorn_loose.js
// [walk]: util/walk.js

"use strict";

exports.__esModule = true;
exports.parse = parse;
exports.parseExpressionAt = parseExpressionAt;
exports.tokenizer = tokenizer;

var _state = _dereq_("./state");

_dereq_("./parseutil");

_dereq_("./statement");

_dereq_("./lval");

_dereq_("./expression");

_dereq_("./location");

exports.Parser = _state.Parser;
exports.plugins = _state.plugins;

var _options = _dereq_("./options");

exports.defaultOptions = _options.defaultOptions;

var _locutil = _dereq_("./locutil");

exports.Position = _locutil.Position;
exports.SourceLocation = _locutil.SourceLocation;
exports.getLineInfo = _locutil.getLineInfo;

var _node = _dereq_("./node");

exports.Node = _node.Node;

var _tokentype = _dereq_("./tokentype");

exports.TokenType = _tokentype.TokenType;
exports.tokTypes = _tokentype.types;

var _tokencontext = _dereq_("./tokencontext");

exports.TokContext = _tokencontext.TokContext;
exports.tokContexts = _tokencontext.types;

var _identifier = _dereq_("./identifier");

exports.isIdentifierChar = _identifier.isIdentifierChar;
exports.isIdentifierStart = _identifier.isIdentifierStart;

var _tokenize = _dereq_("./tokenize");

exports.Token = _tokenize.Token;

var _whitespace = _dereq_("./whitespace");

exports.isNewLine = _whitespace.isNewLine;
exports.lineBreak = _whitespace.lineBreak;
exports.lineBreakG = _whitespace.lineBreakG;
var version = "2.7.0";

exports.version = version;
// The main exported interface (under `self.acorn` when in the
// browser) is a `parse` function that takes a code string and
// returns an abstract syntax tree as specified by [Mozilla parser
// API][api].
//
// [api]: https://developer.mozilla.org/en-US/docs/SpiderMonkey/Parser_API

function parse(input, options) {
  return new _state.Parser(options, input).parse();
}

// This function tries to parse a single expression at a given
// offset in a string. Useful for parsing mixed-language formats
// that embed JavaScript expressions.

function parseExpressionAt(input, pos, options) {
  var p = new _state.Parser(options, input, pos);
  p.nextToken();
  return p.parseExpression();
}

// Acorn is organized as a tokenizer and a recursive-descent parser.
// The `tokenizer` export provides an interface to the tokenizer.

function tokenizer(input, options) {
  return new _state.Parser(options, input);
}

},{"./expression":1,"./identifier":2,"./location":4,"./locutil":5,"./lval":6,"./node":7,"./options":8,"./parseutil":9,"./state":10,"./statement":11,"./tokencontext":12,"./tokenize":13,"./tokentype":14,"./whitespace":16}],4:[function(_dereq_,module,exports){
"use strict";

var _state = _dereq_("./state");

var _locutil = _dereq_("./locutil");

var pp = _state.Parser.prototype;

// This function is used to raise exceptions on parse errors. It
// takes an offset integer (into the current `input`) to indicate
// the location of the error, attaches the position to the end
// of the error message, and then raises a `SyntaxError` with that
// message.

pp.raise = function (pos, message) {
  var loc = _locutil.getLineInfo(this.input, pos);
  message += " (" + loc.line + ":" + loc.column + ")";
  var err = new SyntaxError(message);
  err.pos = pos;err.loc = loc;err.raisedAt = this.pos;
  throw err;
};

pp.curPosition = function () {
  if (this.options.locations) {
    return new _locutil.Position(this.curLine, this.pos - this.lineStart);
  }
};

},{"./locutil":5,"./state":10}],5:[function(_dereq_,module,exports){
"use strict";

exports.__esModule = true;
exports.getLineInfo = getLineInfo;

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var _whitespace = _dereq_("./whitespace");

// These are used when `options.locations` is on, for the
// `startLoc` and `endLoc` properties.

var Position = (function () {
  function Position(line, col) {
    _classCallCheck(this, Position);

    this.line = line;
    this.column = col;
  }

  Position.prototype.offset = function offset(n) {
    return new Position(this.line, this.column + n);
  };

  return Position;
})();

exports.Position = Position;

var SourceLocation = function SourceLocation(p, start, end) {
  _classCallCheck(this, SourceLocation);

  this.start = start;
  this.end = end;
  if (p.sourceFile !== null) this.source = p.sourceFile;
}

// The `getLineInfo` function is mostly useful when the
// `locations` option is off (for performance reasons) and you
// want to find the line/column position for a given character
// offset. `input` should be the code string that the offset refers
// into.

;

exports.SourceLocation = SourceLocation;

function getLineInfo(input, offset) {
  for (var line = 1, cur = 0;;) {
    _whitespace.lineBreakG.lastIndex = cur;
    var match = _whitespace.lineBreakG.exec(input);
    if (match && match.index < offset) {
      ++line;
      cur = match.index + match[0].length;
    } else {
      return new Position(line, offset - cur);
    }
  }
}

},{"./whitespace":16}],6:[function(_dereq_,module,exports){
"use strict";

var _tokentype = _dereq_("./tokentype");

var _state = _dereq_("./state");

var _util = _dereq_("./util");

var pp = _state.Parser.prototype;

// Convert existing expression atom to assignable pattern
// if possible.

pp.toAssignable = function (node, isBinding) {
  if (this.options.ecmaVersion >= 6 && node) {
    switch (node.type) {
      case "Identifier":
      case "ObjectPattern":
      case "ArrayPattern":
        break;

      case "ObjectExpression":
        node.type = "ObjectPattern";
        for (var i = 0; i < node.properties.length; i++) {
          var prop = node.properties[i];
          if (prop.kind !== "init") this.raise(prop.key.start, "Object pattern can't contain getter or setter");
          this.toAssignable(prop.value, isBinding);
        }
        break;

      case "ArrayExpression":
        node.type = "ArrayPattern";
        this.toAssignableList(node.elements, isBinding);
        break;

      case "AssignmentExpression":
        if (node.operator === "=") {
          node.type = "AssignmentPattern";
          delete node.operator;
          // falls through to AssignmentPattern
        } else {
            this.raise(node.left.end, "Only '=' operator can be used for specifying default value.");
            break;
          }

      case "AssignmentPattern":
        if (node.right.type === "YieldExpression") this.raise(node.right.start, "Yield expression cannot be a default value");
        break;

      case "ParenthesizedExpression":
        node.expression = this.toAssignable(node.expression, isBinding);
        break;

      case "MemberExpression":
        if (!isBinding) break;

      default:
        this.raise(node.start, "Assigning to rvalue");
    }
  }
  return node;
};

// Convert list of expression atoms to binding list.

pp.toAssignableList = function (exprList, isBinding) {
  var end = exprList.length;
  if (end) {
    var last = exprList[end - 1];
    if (last && last.type == "RestElement") {
      --end;
    } else if (last && last.type == "SpreadElement") {
      last.type = "RestElement";
      var arg = last.argument;
      this.toAssignable(arg, isBinding);
      if (arg.type !== "Identifier" && arg.type !== "MemberExpression" && arg.type !== "ArrayPattern") this.unexpected(arg.start);
      --end;
    }

    if (isBinding && last.type === "RestElement" && last.argument.type !== "Identifier") this.unexpected(last.argument.start);
  }
  for (var i = 0; i < end; i++) {
    var elt = exprList[i];
    if (elt) this.toAssignable(elt, isBinding);
  }
  return exprList;
};

// Parses spread element.

pp.parseSpread = function (refDestructuringErrors) {
  var node = this.startNode();
  this.next();
  node.argument = this.parseMaybeAssign(refDestructuringErrors);
  return this.finishNode(node, "SpreadElement");
};

pp.parseRest = function (allowNonIdent) {
  var node = this.startNode();
  this.next();

  // RestElement inside of a function parameter must be an identifier
  if (allowNonIdent) node.argument = this.type === _tokentype.types.name ? this.parseIdent() : this.unexpected();else node.argument = this.type === _tokentype.types.name || this.type === _tokentype.types.bracketL ? this.parseBindingAtom() : this.unexpected();

  return this.finishNode(node, "RestElement");
};

// Parses lvalue (assignable) atom.

pp.parseBindingAtom = function () {
  if (this.options.ecmaVersion < 6) return this.parseIdent();
  switch (this.type) {
    case _tokentype.types.name:
      return this.parseIdent();

    case _tokentype.types.bracketL:
      var node = this.startNode();
      this.next();
      node.elements = this.parseBindingList(_tokentype.types.bracketR, true, true);
      return this.finishNode(node, "ArrayPattern");

    case _tokentype.types.braceL:
      return this.parseObj(true);

    default:
      this.unexpected();
  }
};

pp.parseBindingList = function (close, allowEmpty, allowTrailingComma, allowNonIdent) {
  var elts = [],
      first = true;
  while (!this.eat(close)) {
    if (first) first = false;else this.expect(_tokentype.types.comma);
    if (allowEmpty && this.type === _tokentype.types.comma) {
      elts.push(null);
    } else if (allowTrailingComma && this.afterTrailingComma(close)) {
      break;
    } else if (this.type === _tokentype.types.ellipsis) {
      var rest = this.parseRest(allowNonIdent);
      this.parseBindingListItem(rest);
      elts.push(rest);
      this.expect(close);
      break;
    } else {
      var elem = this.parseMaybeDefault(this.start, this.startLoc);
      this.parseBindingListItem(elem);
      elts.push(elem);
    }
  }
  return elts;
};

pp.parseBindingListItem = function (param) {
  return param;
};

// Parses assignment pattern around given atom if possible.

pp.parseMaybeDefault = function (startPos, startLoc, left) {
  left = left || this.parseBindingAtom();
  if (this.options.ecmaVersion < 6 || !this.eat(_tokentype.types.eq)) return left;
  var node = this.startNodeAt(startPos, startLoc);
  node.left = left;
  node.right = this.parseMaybeAssign();
  return this.finishNode(node, "AssignmentPattern");
};

// Verify that a node is an lval — something that can be assigned
// to.

pp.checkLVal = function (expr, isBinding, checkClashes) {
  switch (expr.type) {
    case "Identifier":
      if (this.strict && this.reservedWordsStrictBind.test(expr.name)) this.raise(expr.start, (isBinding ? "Binding " : "Assigning to ") + expr.name + " in strict mode");
      if (checkClashes) {
        if (_util.has(checkClashes, expr.name)) this.raise(expr.start, "Argument name clash");
        checkClashes[expr.name] = true;
      }
      break;

    case "MemberExpression":
      if (isBinding) this.raise(expr.start, (isBinding ? "Binding" : "Assigning to") + " member expression");
      break;

    case "ObjectPattern":
      for (var i = 0; i < expr.properties.length; i++) {
        this.checkLVal(expr.properties[i].value, isBinding, checkClashes);
      }break;

    case "ArrayPattern":
      for (var i = 0; i < expr.elements.length; i++) {
        var elem = expr.elements[i];
        if (elem) this.checkLVal(elem, isBinding, checkClashes);
      }
      break;

    case "AssignmentPattern":
      this.checkLVal(expr.left, isBinding, checkClashes);
      break;

    case "RestElement":
      this.checkLVal(expr.argument, isBinding, checkClashes);
      break;

    case "ParenthesizedExpression":
      this.checkLVal(expr.expression, isBinding, checkClashes);
      break;

    default:
      this.raise(expr.start, (isBinding ? "Binding" : "Assigning to") + " rvalue");
  }
};

},{"./state":10,"./tokentype":14,"./util":15}],7:[function(_dereq_,module,exports){
"use strict";

exports.__esModule = true;

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var _state = _dereq_("./state");

var _locutil = _dereq_("./locutil");

var Node = function Node(parser, pos, loc) {
  _classCallCheck(this, Node);

  this.type = "";
  this.start = pos;
  this.end = 0;
  if (parser.options.locations) this.loc = new _locutil.SourceLocation(parser, loc);
  if (parser.options.directSourceFile) this.sourceFile = parser.options.directSourceFile;
  if (parser.options.ranges) this.range = [pos, 0];
}

// Start an AST node, attaching a start offset.

;

exports.Node = Node;
var pp = _state.Parser.prototype;

pp.startNode = function () {
  return new Node(this, this.start, this.startLoc);
};

pp.startNodeAt = function (pos, loc) {
  return new Node(this, pos, loc);
};

// Finish an AST node, adding `type` and `end` properties.

function finishNodeAt(node, type, pos, loc) {
  node.type = type;
  node.end = pos;
  if (this.options.locations) node.loc.end = loc;
  if (this.options.ranges) node.range[1] = pos;
  return node;
}

pp.finishNode = function (node, type) {
  return finishNodeAt.call(this, node, type, this.lastTokEnd, this.lastTokEndLoc);
};

// Finish node at given position

pp.finishNodeAt = function (node, type, pos, loc) {
  return finishNodeAt.call(this, node, type, pos, loc);
};

},{"./locutil":5,"./state":10}],8:[function(_dereq_,module,exports){
"use strict";

exports.__esModule = true;
exports.getOptions = getOptions;

var _util = _dereq_("./util");

var _locutil = _dereq_("./locutil");

// A second optional argument can be given to further configure
// the parser process. These options are recognized:

var defaultOptions = {
  // `ecmaVersion` indicates the ECMAScript version to parse. Must
  // be either 3, or 5, or 6. This influences support for strict
  // mode, the set of reserved words, support for getters and
  // setters and other features.
  ecmaVersion: 5,
  // Source type ("script" or "module") for different semantics
  sourceType: "script",
  // `onInsertedSemicolon` can be a callback that will be called
  // when a semicolon is automatically inserted. It will be passed
  // th position of the comma as an offset, and if `locations` is
  // enabled, it is given the location as a `{line, column}` object
  // as second argument.
  onInsertedSemicolon: null,
  // `onTrailingComma` is similar to `onInsertedSemicolon`, but for
  // trailing commas.
  onTrailingComma: null,
  // By default, reserved words are only enforced if ecmaVersion >= 5.
  // Set `allowReserved` to a boolean value to explicitly turn this on
  // an off. When this option has the value "never", reserved words
  // and keywords can also not be used as property names.
  allowReserved: null,
  // When enabled, a return at the top level is not considered an
  // error.
  allowReturnOutsideFunction: false,
  // When enabled, import/export statements are not constrained to
  // appearing at the top of the program.
  allowImportExportEverywhere: false,
  // When enabled, hashbang directive in the beginning of file
  // is allowed and treated as a line comment.
  allowHashBang: false,
  // When `locations` is on, `loc` properties holding objects with
  // `start` and `end` properties in `{line, column}` form (with
  // line being 1-based and column 0-based) will be attached to the
  // nodes.
  locations: false,
  // A function can be passed as `onToken` option, which will
  // cause Acorn to call that function with object in the same
  // format as tokens returned from `tokenizer().getToken()`. Note
  // that you are not allowed to call the parser from the
  // callback—that will corrupt its internal state.
  onToken: null,
  // A function can be passed as `onComment` option, which will
  // cause Acorn to call that function with `(block, text, start,
  // end)` parameters whenever a comment is skipped. `block` is a
  // boolean indicating whether this is a block (`/* */`) comment,
  // `text` is the content of the comment, and `start` and `end` are
  // character offsets that denote the start and end of the comment.
  // When the `locations` option is on, two more parameters are
  // passed, the full `{line, column}` locations of the start and
  // end of the comments. Note that you are not allowed to call the
  // parser from the callback—that will corrupt its internal state.
  onComment: null,
  // Nodes have their start and end characters offsets recorded in
  // `start` and `end` properties (directly on the node, rather than
  // the `loc` object, which holds line/column data. To also add a
  // [semi-standardized][range] `range` property holding a `[start,
  // end]` array with the same numbers, set the `ranges` option to
  // `true`.
  //
  // [range]: https://bugzilla.mozilla.org/show_bug.cgi?id=745678
  ranges: false,
  // It is possible to parse multiple files into a single AST by
  // passing the tree produced by parsing the first file as
  // `program` option in subsequent parses. This will add the
  // toplevel forms of the parsed file to the `Program` (top) node
  // of an existing parse tree.
  program: null,
  // When `locations` is on, you can pass this to record the source
  // file in every node's `loc` object.
  sourceFile: null,
  // This value, if given, is stored in every node, whether
  // `locations` is on or off.
  directSourceFile: null,
  // When enabled, parenthesized expressions are represented by
  // (non-standard) ParenthesizedExpression nodes
  preserveParens: false,
  plugins: {}
};

exports.defaultOptions = defaultOptions;
// Interpret and default an options object

function getOptions(opts) {
  var options = {};
  for (var opt in defaultOptions) {
    options[opt] = opts && _util.has(opts, opt) ? opts[opt] : defaultOptions[opt];
  }if (options.allowReserved == null) options.allowReserved = options.ecmaVersion < 5;

  if (_util.isArray(options.onToken)) {
    (function () {
      var tokens = options.onToken;
      options.onToken = function (token) {
        return tokens.push(token);
      };
    })();
  }
  if (_util.isArray(options.onComment)) options.onComment = pushComment(options, options.onComment);

  return options;
}

function pushComment(options, array) {
  return function (block, text, start, end, startLoc, endLoc) {
    var comment = {
      type: block ? 'Block' : 'Line',
      value: text,
      start: start,
      end: end
    };
    if (options.locations) comment.loc = new _locutil.SourceLocation(this, startLoc, endLoc);
    if (options.ranges) comment.range = [start, end];
    array.push(comment);
  };
}

},{"./locutil":5,"./util":15}],9:[function(_dereq_,module,exports){
"use strict";

var _tokentype = _dereq_("./tokentype");

var _state = _dereq_("./state");

var _whitespace = _dereq_("./whitespace");

var pp = _state.Parser.prototype;

// ## Parser utilities

// Test whether a statement node is the string literal `"use strict"`.

pp.isUseStrict = function (stmt) {
  return this.options.ecmaVersion >= 5 && stmt.type === "ExpressionStatement" && stmt.expression.type === "Literal" && stmt.expression.raw.slice(1, -1) === "use strict";
};

// Predicate that tests whether the next token is of the given
// type, and if yes, consumes it as a side effect.

pp.eat = function (type) {
  if (this.type === type) {
    this.next();
    return true;
  } else {
    return false;
  }
};

// Tests whether parsed token is a contextual keyword.

pp.isContextual = function (name) {
  return this.type === _tokentype.types.name && this.value === name;
};

// Consumes contextual keyword if possible.

pp.eatContextual = function (name) {
  return this.value === name && this.eat(_tokentype.types.name);
};

// Asserts that following token is given contextual keyword.

pp.expectContextual = function (name) {
  if (!this.eatContextual(name)) this.unexpected();
};

// Test whether a semicolon can be inserted at the current position.

pp.canInsertSemicolon = function () {
  return this.type === _tokentype.types.eof || this.type === _tokentype.types.braceR || _whitespace.lineBreak.test(this.input.slice(this.lastTokEnd, this.start));
};

pp.insertSemicolon = function () {
  if (this.canInsertSemicolon()) {
    if (this.options.onInsertedSemicolon) this.options.onInsertedSemicolon(this.lastTokEnd, this.lastTokEndLoc);
    return true;
  }
};

// Consume a semicolon, or, failing that, see if we are allowed to
// pretend that there is a semicolon at this position.

pp.semicolon = function () {
  if (!this.eat(_tokentype.types.semi) && !this.insertSemicolon()) this.unexpected();
};

pp.afterTrailingComma = function (tokType) {
  if (this.type == tokType) {
    if (this.options.onTrailingComma) this.options.onTrailingComma(this.lastTokStart, this.lastTokStartLoc);
    this.next();
    return true;
  }
};

// Expect a token of a given type. If found, consume it, otherwise,
// raise an unexpected token error.

pp.expect = function (type) {
  this.eat(type) || this.unexpected();
};

// Raise an unexpected token error.

pp.unexpected = function (pos) {
  this.raise(pos != null ? pos : this.start, "Unexpected token");
};

pp.checkPatternErrors = function (refDestructuringErrors, andThrow) {
  var pos = refDestructuringErrors && refDestructuringErrors.trailingComma;
  if (!andThrow) return !!pos;
  if (pos) this.raise(pos, "Trailing comma is not permitted in destructuring patterns");
};

pp.checkExpressionErrors = function (refDestructuringErrors, andThrow) {
  var pos = refDestructuringErrors && refDestructuringErrors.shorthandAssign;
  if (!andThrow) return !!pos;
  if (pos) this.raise(pos, "Shorthand property assignments are valid only in destructuring patterns");
};

},{"./state":10,"./tokentype":14,"./whitespace":16}],10:[function(_dereq_,module,exports){
"use strict";

exports.__esModule = true;

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var _identifier = _dereq_("./identifier");

var _tokentype = _dereq_("./tokentype");

var _whitespace = _dereq_("./whitespace");

var _options = _dereq_("./options");

// Registered plugins
var plugins = {};

exports.plugins = plugins;
function keywordRegexp(words) {
  return new RegExp("^(" + words.replace(/ /g, "|") + ")$");
}

var Parser = (function () {
  function Parser(options, input, startPos) {
    _classCallCheck(this, Parser);

    this.options = options = _options.getOptions(options);
    this.sourceFile = options.sourceFile;
    this.keywords = keywordRegexp(_identifier.keywords[options.ecmaVersion >= 6 ? 6 : 5]);
    var reserved = options.allowReserved ? "" : _identifier.reservedWords[options.ecmaVersion] + (options.sourceType == "module" ? " await" : "");
    this.reservedWords = keywordRegexp(reserved);
    var reservedStrict = (reserved ? reserved + " " : "") + _identifier.reservedWords.strict;
    this.reservedWordsStrict = keywordRegexp(reservedStrict);
    this.reservedWordsStrictBind = keywordRegexp(reservedStrict + " " + _identifier.reservedWords.strictBind);
    this.input = String(input);

    // Used to signal to callers of `readWord1` whether the word
    // contained any escape sequences. This is needed because words with
    // escape sequences must not be interpreted as keywords.
    this.containsEsc = false;

    // Load plugins
    this.loadPlugins(options.plugins);

    // Set up token state

    // The current position of the tokenizer in the input.
    if (startPos) {
      this.pos = startPos;
      this.lineStart = Math.max(0, this.input.lastIndexOf("\n", startPos));
      this.curLine = this.input.slice(0, this.lineStart).split(_whitespace.lineBreak).length;
    } else {
      this.pos = this.lineStart = 0;
      this.curLine = 1;
    }

    // Properties of the current token:
    // Its type
    this.type = _tokentype.types.eof;
    // For tokens that include more information than their type, the value
    this.value = null;
    // Its start and end offset
    this.start = this.end = this.pos;
    // And, if locations are used, the {line, column} object
    // corresponding to those offsets
    this.startLoc = this.endLoc = this.curPosition();

    // Position information for the previous token
    this.lastTokEndLoc = this.lastTokStartLoc = null;
    this.lastTokStart = this.lastTokEnd = this.pos;

    // The context stack is used to superficially track syntactic
    // context to predict whether a regular expression is allowed in a
    // given position.
    this.context = this.initialContext();
    this.exprAllowed = true;

    // Figure out if it's a module code.
    this.strict = this.inModule = options.sourceType === "module";

    // Used to signify the start of a potential arrow function
    this.potentialArrowAt = -1;

    // Flags to track whether we are in a function, a generator.
    this.inFunction = this.inGenerator = false;
    // Labels in scope.
    this.labels = [];

    // If enabled, skip leading hashbang line.
    if (this.pos === 0 && options.allowHashBang && this.input.slice(0, 2) === '#!') this.skipLineComment(2);
  }

  // DEPRECATED Kept for backwards compatibility until 3.0 in case a plugin uses them

  Parser.prototype.isKeyword = function isKeyword(word) {
    return this.keywords.test(word);
  };

  Parser.prototype.isReservedWord = function isReservedWord(word) {
    return this.reservedWords.test(word);
  };

  Parser.prototype.extend = function extend(name, f) {
    this[name] = f(this[name]);
  };

  Parser.prototype.loadPlugins = function loadPlugins(pluginConfigs) {
    for (var _name in pluginConfigs) {
      var plugin = plugins[_name];
      if (!plugin) throw new Error("Plugin '" + _name + "' not found");
      plugin(this, pluginConfigs[_name]);
    }
  };

  Parser.prototype.parse = function parse() {
    var node = this.options.program || this.startNode();
    this.nextToken();
    return this.parseTopLevel(node);
  };

  return Parser;
})();

exports.Parser = Parser;

},{"./identifier":2,"./options":8,"./tokentype":14,"./whitespace":16}],11:[function(_dereq_,module,exports){
"use strict";

var _tokentype = _dereq_("./tokentype");

var _state = _dereq_("./state");

var _whitespace = _dereq_("./whitespace");

var pp = _state.Parser.prototype;

// ### Statement parsing

// Parse a program. Initializes the parser, reads any number of
// statements, and wraps them in a Program node.  Optionally takes a
// `program` argument.  If present, the statements will be appended
// to its body instead of creating a new node.

pp.parseTopLevel = function (node) {
  var first = true;
  if (!node.body) node.body = [];
  while (this.type !== _tokentype.types.eof) {
    var stmt = this.parseStatement(true, true);
    node.body.push(stmt);
    if (first) {
      if (this.isUseStrict(stmt)) this.setStrict(true);
      first = false;
    }
  }
  this.next();
  if (this.options.ecmaVersion >= 6) {
    node.sourceType = this.options.sourceType;
  }
  return this.finishNode(node, "Program");
};

var loopLabel = { kind: "loop" },
    switchLabel = { kind: "switch" };

// Parse a single statement.
//
// If expecting a statement and finding a slash operator, parse a
// regular expression literal. This is to handle cases like
// `if (foo) /blah/.exec(foo)`, where looking at the previous token
// does not help.

pp.parseStatement = function (declaration, topLevel) {
  var starttype = this.type,
      node = this.startNode();

  // Most types of statements are recognized by the keyword they
  // start with. Many are trivial to parse, some require a bit of
  // complexity.

  switch (starttype) {
    case _tokentype.types._break:case _tokentype.types._continue:
      return this.parseBreakContinueStatement(node, starttype.keyword);
    case _tokentype.types._debugger:
      return this.parseDebuggerStatement(node);
    case _tokentype.types._do:
      return this.parseDoStatement(node);
    case _tokentype.types._for:
      return this.parseForStatement(node);
    case _tokentype.types._function:
      if (!declaration && this.options.ecmaVersion >= 6) this.unexpected();
      return this.parseFunctionStatement(node);
    case _tokentype.types._class:
      if (!declaration) this.unexpected();
      return this.parseClass(node, true);
    case _tokentype.types._if:
      return this.parseIfStatement(node);
    case _tokentype.types._return:
      return this.parseReturnStatement(node);
    case _tokentype.types._switch:
      return this.parseSwitchStatement(node);
    case _tokentype.types._throw:
      return this.parseThrowStatement(node);
    case _tokentype.types._try:
      return this.parseTryStatement(node);
    case _tokentype.types._let:case _tokentype.types._const:
      if (!declaration) this.unexpected(); // NOTE: falls through to _var
    case _tokentype.types._var:
      return this.parseVarStatement(node, starttype);
    case _tokentype.types._while:
      return this.parseWhileStatement(node);
    case _tokentype.types._with:
      return this.parseWithStatement(node);
    case _tokentype.types.braceL:
      return this.parseBlock();
    case _tokentype.types.semi:
      return this.parseEmptyStatement(node);
    case _tokentype.types._export:
    case _tokentype.types._import:
      if (!this.options.allowImportExportEverywhere) {
        if (!topLevel) this.raise(this.start, "'import' and 'export' may only appear at the top level");
        if (!this.inModule) this.raise(this.start, "'import' and 'export' may appear only with 'sourceType: module'");
      }
      return starttype === _tokentype.types._import ? this.parseImport(node) : this.parseExport(node);

    // If the statement does not start with a statement keyword or a
    // brace, it's an ExpressionStatement or LabeledStatement. We
    // simply start parsing an expression, and afterwards, if the
    // next token is a colon and the expression was a simple
    // Identifier node, we switch to interpreting it as a label.
    default:
      var maybeName = this.value,
          expr = this.parseExpression();
      if (starttype === _tokentype.types.name && expr.type === "Identifier" && this.eat(_tokentype.types.colon)) return this.parseLabeledStatement(node, maybeName, expr);else return this.parseExpressionStatement(node, expr);
  }
};

pp.parseBreakContinueStatement = function (node, keyword) {
  var isBreak = keyword == "break";
  this.next();
  if (this.eat(_tokentype.types.semi) || this.insertSemicolon()) node.label = null;else if (this.type !== _tokentype.types.name) this.unexpected();else {
    node.label = this.parseIdent();
    this.semicolon();
  }

  // Verify that there is an actual destination to break or
  // continue to.
  for (var i = 0; i < this.labels.length; ++i) {
    var lab = this.labels[i];
    if (node.label == null || lab.name === node.label.name) {
      if (lab.kind != null && (isBreak || lab.kind === "loop")) break;
      if (node.label && isBreak) break;
    }
  }
  if (i === this.labels.length) this.raise(node.start, "Unsyntactic " + keyword);
  return this.finishNode(node, isBreak ? "BreakStatement" : "ContinueStatement");
};

pp.parseDebuggerStatement = function (node) {
  this.next();
  this.semicolon();
  return this.finishNode(node, "DebuggerStatement");
};

pp.parseDoStatement = function (node) {
  this.next();
  this.labels.push(loopLabel);
  node.body = this.parseStatement(false);
  this.labels.pop();
  this.expect(_tokentype.types._while);
  node.test = this.parseParenExpression();
  if (this.options.ecmaVersion >= 6) this.eat(_tokentype.types.semi);else this.semicolon();
  return this.finishNode(node, "DoWhileStatement");
};

// Disambiguating between a `for` and a `for`/`in` or `for`/`of`
// loop is non-trivial. Basically, we have to parse the init `var`
// statement or expression, disallowing the `in` operator (see
// the second parameter to `parseExpression`), and then check
// whether the next token is `in` or `of`. When there is no init
// part (semicolon immediately after the opening parenthesis), it
// is a regular `for` loop.

pp.parseForStatement = function (node) {
  this.next();
  this.labels.push(loopLabel);
  this.expect(_tokentype.types.parenL);
  if (this.type === _tokentype.types.semi) return this.parseFor(node, null);
  if (this.type === _tokentype.types._var || this.type === _tokentype.types._let || this.type === _tokentype.types._const) {
    var _init = this.startNode(),
        varKind = this.type;
    this.next();
    this.parseVar(_init, true, varKind);
    this.finishNode(_init, "VariableDeclaration");
    if ((this.type === _tokentype.types._in || this.options.ecmaVersion >= 6 && this.isContextual("of")) && _init.declarations.length === 1 && !(varKind !== _tokentype.types._var && _init.declarations[0].init)) return this.parseForIn(node, _init);
    return this.parseFor(node, _init);
  }
  var refDestructuringErrors = { shorthandAssign: 0, trailingComma: 0 };
  var init = this.parseExpression(true, refDestructuringErrors);
  if (this.type === _tokentype.types._in || this.options.ecmaVersion >= 6 && this.isContextual("of")) {
    this.checkPatternErrors(refDestructuringErrors, true);
    this.toAssignable(init);
    this.checkLVal(init);
    return this.parseForIn(node, init);
  } else {
    this.checkExpressionErrors(refDestructuringErrors, true);
  }
  return this.parseFor(node, init);
};

pp.parseFunctionStatement = function (node) {
  this.next();
  return this.parseFunction(node, true);
};

pp.parseIfStatement = function (node) {
  this.next();
  node.test = this.parseParenExpression();
  node.consequent = this.parseStatement(false);
  node.alternate = this.eat(_tokentype.types._else) ? this.parseStatement(false) : null;
  return this.finishNode(node, "IfStatement");
};

pp.parseReturnStatement = function (node) {
  if (!this.inFunction && !this.options.allowReturnOutsideFunction) this.raise(this.start, "'return' outside of function");
  this.next();

  // In `return` (and `break`/`continue`), the keywords with
  // optional arguments, we eagerly look for a semicolon or the
  // possibility to insert one.

  if (this.eat(_tokentype.types.semi) || this.insertSemicolon()) node.argument = null;else {
    node.argument = this.parseExpression();this.semicolon();
  }
  return this.finishNode(node, "ReturnStatement");
};

pp.parseSwitchStatement = function (node) {
  this.next();
  node.discriminant = this.parseParenExpression();
  node.cases = [];
  this.expect(_tokentype.types.braceL);
  this.labels.push(switchLabel);

  // Statements under must be grouped (by label) in SwitchCase
  // nodes. `cur` is used to keep the node that we are currently
  // adding statements to.

  for (var cur, sawDefault = false; this.type != _tokentype.types.braceR;) {
    if (this.type === _tokentype.types._case || this.type === _tokentype.types._default) {
      var isCase = this.type === _tokentype.types._case;
      if (cur) this.finishNode(cur, "SwitchCase");
      node.cases.push(cur = this.startNode());
      cur.consequent = [];
      this.next();
      if (isCase) {
        cur.test = this.parseExpression();
      } else {
        if (sawDefault) this.raise(this.lastTokStart, "Multiple default clauses");
        sawDefault = true;
        cur.test = null;
      }
      this.expect(_tokentype.types.colon);
    } else {
      if (!cur) this.unexpected();
      cur.consequent.push(this.parseStatement(true));
    }
  }
  if (cur) this.finishNode(cur, "SwitchCase");
  this.next(); // Closing brace
  this.labels.pop();
  return this.finishNode(node, "SwitchStatement");
};

pp.parseThrowStatement = function (node) {
  this.next();
  if (_whitespace.lineBreak.test(this.input.slice(this.lastTokEnd, this.start))) this.raise(this.lastTokEnd, "Illegal newline after throw");
  node.argument = this.parseExpression();
  this.semicolon();
  return this.finishNode(node, "ThrowStatement");
};

// Reused empty array added for node fields that are always empty.

var empty = [];

pp.parseTryStatement = function (node) {
  this.next();
  node.block = this.parseBlock();
  node.handler = null;
  if (this.type === _tokentype.types._catch) {
    var clause = this.startNode();
    this.next();
    this.expect(_tokentype.types.parenL);
    clause.param = this.parseBindingAtom();
    this.checkLVal(clause.param, true);
    this.expect(_tokentype.types.parenR);
    clause.body = this.parseBlock();
    node.handler = this.finishNode(clause, "CatchClause");
  }
  node.finalizer = this.eat(_tokentype.types._finally) ? this.parseBlock() : null;
  if (!node.handler && !node.finalizer) this.raise(node.start, "Missing catch or finally clause");
  return this.finishNode(node, "TryStatement");
};

pp.parseVarStatement = function (node, kind) {
  this.next();
  this.parseVar(node, false, kind);
  this.semicolon();
  return this.finishNode(node, "VariableDeclaration");
};

pp.parseWhileStatement = function (node) {
  this.next();
  node.test = this.parseParenExpression();
  this.labels.push(loopLabel);
  node.body = this.parseStatement(false);
  this.labels.pop();
  return this.finishNode(node, "WhileStatement");
};

pp.parseWithStatement = function (node) {
  if (this.strict) this.raise(this.start, "'with' in strict mode");
  this.next();
  node.object = this.parseParenExpression();
  node.body = this.parseStatement(false);
  return this.finishNode(node, "WithStatement");
};

pp.parseEmptyStatement = function (node) {
  this.next();
  return this.finishNode(node, "EmptyStatement");
};

pp.parseLabeledStatement = function (node, maybeName, expr) {
  for (var i = 0; i < this.labels.length; ++i) {
    if (this.labels[i].name === maybeName) this.raise(expr.start, "Label '" + maybeName + "' is already declared");
  }var kind = this.type.isLoop ? "loop" : this.type === _tokentype.types._switch ? "switch" : null;
  for (var i = this.labels.length - 1; i >= 0; i--) {
    var label = this.labels[i];
    if (label.statementStart == node.start) {
      label.statementStart = this.start;
      label.kind = kind;
    } else break;
  }
  this.labels.push({ name: maybeName, kind: kind, statementStart: this.start });
  node.body = this.parseStatement(true);
  this.labels.pop();
  node.label = expr;
  return this.finishNode(node, "LabeledStatement");
};

pp.parseExpressionStatement = function (node, expr) {
  node.expression = expr;
  this.semicolon();
  return this.finishNode(node, "ExpressionStatement");
};

// Parse a semicolon-enclosed block of statements, handling `"use
// strict"` declarations when `allowStrict` is true (used for
// function bodies).

pp.parseBlock = function (allowStrict) {
  var node = this.startNode(),
      first = true,
      oldStrict = undefined;
  node.body = [];
  this.expect(_tokentype.types.braceL);
  while (!this.eat(_tokentype.types.braceR)) {
    var stmt = this.parseStatement(true);
    node.body.push(stmt);
    if (first && allowStrict && this.isUseStrict(stmt)) {
      oldStrict = this.strict;
      this.setStrict(this.strict = true);
    }
    first = false;
  }
  if (oldStrict === false) this.setStrict(false);
  return this.finishNode(node, "BlockStatement");
};

// Parse a regular `for` loop. The disambiguation code in
// `parseStatement` will already have parsed the init statement or
// expression.

pp.parseFor = function (node, init) {
  node.init = init;
  this.expect(_tokentype.types.semi);
  node.test = this.type === _tokentype.types.semi ? null : this.parseExpression();
  this.expect(_tokentype.types.semi);
  node.update = this.type === _tokentype.types.parenR ? null : this.parseExpression();
  this.expect(_tokentype.types.parenR);
  node.body = this.parseStatement(false);
  this.labels.pop();
  return this.finishNode(node, "ForStatement");
};

// Parse a `for`/`in` and `for`/`of` loop, which are almost
// same from parser's perspective.

pp.parseForIn = function (node, init) {
  var type = this.type === _tokentype.types._in ? "ForInStatement" : "ForOfStatement";
  this.next();
  node.left = init;
  node.right = this.parseExpression();
  this.expect(_tokentype.types.parenR);
  node.body = this.parseStatement(false);
  this.labels.pop();
  return this.finishNode(node, type);
};

// Parse a list of variable declarations.

pp.parseVar = function (node, isFor, kind) {
  node.declarations = [];
  node.kind = kind.keyword;
  for (;;) {
    var decl = this.startNode();
    this.parseVarId(decl);
    if (this.eat(_tokentype.types.eq)) {
      decl.init = this.parseMaybeAssign(isFor);
    } else if (kind === _tokentype.types._const && !(this.type === _tokentype.types._in || this.options.ecmaVersion >= 6 && this.isContextual("of"))) {
      this.unexpected();
    } else if (decl.id.type != "Identifier" && !(isFor && (this.type === _tokentype.types._in || this.isContextual("of")))) {
      this.raise(this.lastTokEnd, "Complex binding patterns require an initialization value");
    } else {
      decl.init = null;
    }
    node.declarations.push(this.finishNode(decl, "VariableDeclarator"));
    if (!this.eat(_tokentype.types.comma)) break;
  }
  return node;
};

pp.parseVarId = function (decl) {
  decl.id = this.parseBindingAtom();
  this.checkLVal(decl.id, true);
};

// Parse a function declaration or literal (depending on the
// `isStatement` parameter).

pp.parseFunction = function (node, isStatement, allowExpressionBody) {
  this.initFunction(node);
  if (this.options.ecmaVersion >= 6) node.generator = this.eat(_tokentype.types.star);
  if (isStatement || this.type === _tokentype.types.name) node.id = this.parseIdent();
  this.parseFunctionParams(node);
  this.parseFunctionBody(node, allowExpressionBody);
  return this.finishNode(node, isStatement ? "FunctionDeclaration" : "FunctionExpression");
};

pp.parseFunctionParams = function (node) {
  this.expect(_tokentype.types.parenL);
  node.params = this.parseBindingList(_tokentype.types.parenR, false, false, true);
};

// Parse a class declaration or literal (depending on the
// `isStatement` parameter).

pp.parseClass = function (node, isStatement) {
  this.next();
  this.parseClassId(node, isStatement);
  this.parseClassSuper(node);
  var classBody = this.startNode();
  var hadConstructor = false;
  classBody.body = [];
  this.expect(_tokentype.types.braceL);
  while (!this.eat(_tokentype.types.braceR)) {
    if (this.eat(_tokentype.types.semi)) continue;
    var method = this.startNode();
    var isGenerator = this.eat(_tokentype.types.star);
    var isMaybeStatic = this.type === _tokentype.types.name && this.value === "static";
    this.parsePropertyName(method);
    method["static"] = isMaybeStatic && this.type !== _tokentype.types.parenL;
    if (method["static"]) {
      if (isGenerator) this.unexpected();
      isGenerator = this.eat(_tokentype.types.star);
      this.parsePropertyName(method);
    }
    method.kind = "method";
    var isGetSet = false;
    if (!method.computed) {
      var key = method.key;

      if (!isGenerator && key.type === "Identifier" && this.type !== _tokentype.types.parenL && (key.name === "get" || key.name === "set")) {
        isGetSet = true;
        method.kind = key.name;
        key = this.parsePropertyName(method);
      }
      if (!method["static"] && (key.type === "Identifier" && key.name === "constructor" || key.type === "Literal" && key.value === "constructor")) {
        if (hadConstructor) this.raise(key.start, "Duplicate constructor in the same class");
        if (isGetSet) this.raise(key.start, "Constructor can't have get/set modifier");
        if (isGenerator) this.raise(key.start, "Constructor can't be a generator");
        method.kind = "constructor";
        hadConstructor = true;
      }
    }
    this.parseClassMethod(classBody, method, isGenerator);
    if (isGetSet) {
      var paramCount = method.kind === "get" ? 0 : 1;
      if (method.value.params.length !== paramCount) {
        var start = method.value.start;
        if (method.kind === "get") this.raise(start, "getter should have no params");else this.raise(start, "setter should have exactly one param");
      }
      if (method.kind === "set" && method.value.params[0].type === "RestElement") this.raise(method.value.params[0].start, "Setter cannot use rest params");
    }
  }
  node.body = this.finishNode(classBody, "ClassBody");
  return this.finishNode(node, isStatement ? "ClassDeclaration" : "ClassExpression");
};

pp.parseClassMethod = function (classBody, method, isGenerator) {
  method.value = this.parseMethod(isGenerator);
  classBody.body.push(this.finishNode(method, "MethodDefinition"));
};

pp.parseClassId = function (node, isStatement) {
  node.id = this.type === _tokentype.types.name ? this.parseIdent() : isStatement ? this.unexpected() : null;
};

pp.parseClassSuper = function (node) {
  node.superClass = this.eat(_tokentype.types._extends) ? this.parseExprSubscripts() : null;
};

// Parses module export declaration.

pp.parseExport = function (node) {
  this.next();
  // export * from '...'
  if (this.eat(_tokentype.types.star)) {
    this.expectContextual("from");
    node.source = this.type === _tokentype.types.string ? this.parseExprAtom() : this.unexpected();
    this.semicolon();
    return this.finishNode(node, "ExportAllDeclaration");
  }
  if (this.eat(_tokentype.types._default)) {
    // export default ...
    var expr = this.parseMaybeAssign();
    var needsSemi = true;
    if (expr.type == "FunctionExpression" || expr.type == "ClassExpression") {
      needsSemi = false;
      if (expr.id) {
        expr.type = expr.type == "FunctionExpression" ? "FunctionDeclaration" : "ClassDeclaration";
      }
    }
    node.declaration = expr;
    if (needsSemi) this.semicolon();
    return this.finishNode(node, "ExportDefaultDeclaration");
  }
  // export var|const|let|function|class ...
  if (this.shouldParseExportStatement()) {
    node.declaration = this.parseStatement(true);
    node.specifiers = [];
    node.source = null;
  } else {
    // export { x, y as z } [from '...']
    node.declaration = null;
    node.specifiers = this.parseExportSpecifiers();
    if (this.eatContextual("from")) {
      node.source = this.type === _tokentype.types.string ? this.parseExprAtom() : this.unexpected();
    } else {
      // check for keywords used as local names
      for (var i = 0; i < node.specifiers.length; i++) {
        if (this.keywords.test(node.specifiers[i].local.name) || this.reservedWords.test(node.specifiers[i].local.name)) {
          this.unexpected(node.specifiers[i].local.start);
        }
      }

      node.source = null;
    }
    this.semicolon();
  }
  return this.finishNode(node, "ExportNamedDeclaration");
};

pp.shouldParseExportStatement = function () {
  return this.type.keyword;
};

// Parses a comma-separated list of module exports.

pp.parseExportSpecifiers = function () {
  var nodes = [],
      first = true;
  // export { x, y as z } [from '...']
  this.expect(_tokentype.types.braceL);
  while (!this.eat(_tokentype.types.braceR)) {
    if (!first) {
      this.expect(_tokentype.types.comma);
      if (this.afterTrailingComma(_tokentype.types.braceR)) break;
    } else first = false;

    var node = this.startNode();
    node.local = this.parseIdent(this.type === _tokentype.types._default);
    node.exported = this.eatContextual("as") ? this.parseIdent(true) : node.local;
    nodes.push(this.finishNode(node, "ExportSpecifier"));
  }
  return nodes;
};

// Parses import declaration.

pp.parseImport = function (node) {
  this.next();
  // import '...'
  if (this.type === _tokentype.types.string) {
    node.specifiers = empty;
    node.source = this.parseExprAtom();
  } else {
    node.specifiers = this.parseImportSpecifiers();
    this.expectContextual("from");
    node.source = this.type === _tokentype.types.string ? this.parseExprAtom() : this.unexpected();
  }
  this.semicolon();
  return this.finishNode(node, "ImportDeclaration");
};

// Parses a comma-separated list of module imports.

pp.parseImportSpecifiers = function () {
  var nodes = [],
      first = true;
  if (this.type === _tokentype.types.name) {
    // import defaultObj, { x, y as z } from '...'
    var node = this.startNode();
    node.local = this.parseIdent();
    this.checkLVal(node.local, true);
    nodes.push(this.finishNode(node, "ImportDefaultSpecifier"));
    if (!this.eat(_tokentype.types.comma)) return nodes;
  }
  if (this.type === _tokentype.types.star) {
    var node = this.startNode();
    this.next();
    this.expectContextual("as");
    node.local = this.parseIdent();
    this.checkLVal(node.local, true);
    nodes.push(this.finishNode(node, "ImportNamespaceSpecifier"));
    return nodes;
  }
  this.expect(_tokentype.types.braceL);
  while (!this.eat(_tokentype.types.braceR)) {
    if (!first) {
      this.expect(_tokentype.types.comma);
      if (this.afterTrailingComma(_tokentype.types.braceR)) break;
    } else first = false;

    var node = this.startNode();
    node.imported = this.parseIdent(true);
    if (this.eatContextual("as")) {
      node.local = this.parseIdent();
    } else {
      node.local = node.imported;
      if (this.isKeyword(node.local.name)) this.unexpected(node.local.start);
      if (this.reservedWordsStrict.test(node.local.name)) this.raise(node.local.start, "The keyword '" + node.local.name + "' is reserved");
    }
    this.checkLVal(node.local, true);
    nodes.push(this.finishNode(node, "ImportSpecifier"));
  }
  return nodes;
};

},{"./state":10,"./tokentype":14,"./whitespace":16}],12:[function(_dereq_,module,exports){
// The algorithm used to determine whether a regexp can appear at a
// given point in the program is loosely based on sweet.js' approach.
// See https://github.com/mozilla/sweet.js/wiki/design

"use strict";

exports.__esModule = true;

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var _state = _dereq_("./state");

var _tokentype = _dereq_("./tokentype");

var _whitespace = _dereq_("./whitespace");

var TokContext = function TokContext(token, isExpr, preserveSpace, override) {
  _classCallCheck(this, TokContext);

  this.token = token;
  this.isExpr = !!isExpr;
  this.preserveSpace = !!preserveSpace;
  this.override = override;
};

exports.TokContext = TokContext;
var types = {
  b_stat: new TokContext("{", false),
  b_expr: new TokContext("{", true),
  b_tmpl: new TokContext("${", true),
  p_stat: new TokContext("(", false),
  p_expr: new TokContext("(", true),
  q_tmpl: new TokContext("`", true, true, function (p) {
    return p.readTmplToken();
  }),
  f_expr: new TokContext("function", true)
};

exports.types = types;
var pp = _state.Parser.prototype;

pp.initialContext = function () {
  return [types.b_stat];
};

pp.braceIsBlock = function (prevType) {
  if (prevType === _tokentype.types.colon) {
    var _parent = this.curContext();
    if (_parent === types.b_stat || _parent === types.b_expr) return !_parent.isExpr;
  }
  if (prevType === _tokentype.types._return) return _whitespace.lineBreak.test(this.input.slice(this.lastTokEnd, this.start));
  if (prevType === _tokentype.types._else || prevType === _tokentype.types.semi || prevType === _tokentype.types.eof || prevType === _tokentype.types.parenR) return true;
  if (prevType == _tokentype.types.braceL) return this.curContext() === types.b_stat;
  return !this.exprAllowed;
};

pp.updateContext = function (prevType) {
  var update = undefined,
      type = this.type;
  if (type.keyword && prevType == _tokentype.types.dot) this.exprAllowed = false;else if (update = type.updateContext) update.call(this, prevType);else this.exprAllowed = type.beforeExpr;
};

// Token-specific context update code

_tokentype.types.parenR.updateContext = _tokentype.types.braceR.updateContext = function () {
  if (this.context.length == 1) {
    this.exprAllowed = true;
    return;
  }
  var out = this.context.pop();
  if (out === types.b_stat && this.curContext() === types.f_expr) {
    this.context.pop();
    this.exprAllowed = false;
  } else if (out === types.b_tmpl) {
    this.exprAllowed = true;
  } else {
    this.exprAllowed = !out.isExpr;
  }
};

_tokentype.types.braceL.updateContext = function (prevType) {
  this.context.push(this.braceIsBlock(prevType) ? types.b_stat : types.b_expr);
  this.exprAllowed = true;
};

_tokentype.types.dollarBraceL.updateContext = function () {
  this.context.push(types.b_tmpl);
  this.exprAllowed = true;
};

_tokentype.types.parenL.updateContext = function (prevType) {
  var statementParens = prevType === _tokentype.types._if || prevType === _tokentype.types._for || prevType === _tokentype.types._with || prevType === _tokentype.types._while;
  this.context.push(statementParens ? types.p_stat : types.p_expr);
  this.exprAllowed = true;
};

_tokentype.types.incDec.updateContext = function () {
  // tokExprAllowed stays unchanged
};

_tokentype.types._function.updateContext = function () {
  if (this.curContext() !== types.b_stat) this.context.push(types.f_expr);
  this.exprAllowed = false;
};

_tokentype.types.backQuote.updateContext = function () {
  if (this.curContext() === types.q_tmpl) this.context.pop();else this.context.push(types.q_tmpl);
  this.exprAllowed = false;
};

},{"./state":10,"./tokentype":14,"./whitespace":16}],13:[function(_dereq_,module,exports){
"use strict";

exports.__esModule = true;

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var _identifier = _dereq_("./identifier");

var _tokentype = _dereq_("./tokentype");

var _state = _dereq_("./state");

var _locutil = _dereq_("./locutil");

var _whitespace = _dereq_("./whitespace");

// Object type used to represent tokens. Note that normally, tokens
// simply exist as properties on the parser object. This is only
// used for the onToken callback and the external tokenizer.

var Token = function Token(p) {
  _classCallCheck(this, Token);

  this.type = p.type;
  this.value = p.value;
  this.start = p.start;
  this.end = p.end;
  if (p.options.locations) this.loc = new _locutil.SourceLocation(p, p.startLoc, p.endLoc);
  if (p.options.ranges) this.range = [p.start, p.end];
}

// ## Tokenizer

;

exports.Token = Token;
var pp = _state.Parser.prototype;

// Are we running under Rhino?
var isRhino = typeof Packages == "object" && Object.prototype.toString.call(Packages) == "[object JavaPackage]";

// Move to the next token

pp.next = function () {
  if (this.options.onToken) this.options.onToken(new Token(this));

  this.lastTokEnd = this.end;
  this.lastTokStart = this.start;
  this.lastTokEndLoc = this.endLoc;
  this.lastTokStartLoc = this.startLoc;
  this.nextToken();
};

pp.getToken = function () {
  this.next();
  return new Token(this);
};

// If we're in an ES6 environment, make parsers iterable
if (typeof Symbol !== "undefined") pp[Symbol.iterator] = function () {
  var self = this;
  return { next: function next() {
      var token = self.getToken();
      return {
        done: token.type === _tokentype.types.eof,
        value: token
      };
    } };
};

// Toggle strict mode. Re-reads the next number or string to please
// pedantic tests (`"use strict"; 010;` should fail).

pp.setStrict = function (strict) {
  this.strict = strict;
  if (this.type !== _tokentype.types.num && this.type !== _tokentype.types.string) return;
  this.pos = this.start;
  if (this.options.locations) {
    while (this.pos < this.lineStart) {
      this.lineStart = this.input.lastIndexOf("\n", this.lineStart - 2) + 1;
      --this.curLine;
    }
  }
  this.nextToken();
};

pp.curContext = function () {
  return this.context[this.context.length - 1];
};

// Read a single token, updating the parser object's token-related
// properties.

pp.nextToken = function () {
  var curContext = this.curContext();
  if (!curContext || !curContext.preserveSpace) this.skipSpace();

  this.start = this.pos;
  if (this.options.locations) this.startLoc = this.curPosition();
  if (this.pos >= this.input.length) return this.finishToken(_tokentype.types.eof);

  if (curContext.override) return curContext.override(this);else this.readToken(this.fullCharCodeAtPos());
};

pp.readToken = function (code) {
  // Identifier or keyword. '\uXXXX' sequences are allowed in
  // identifiers, so '\' also dispatches to that.
  if (_identifier.isIdentifierStart(code, this.options.ecmaVersion >= 6) || code === 92 /* '\' */) return this.readWord();

  return this.getTokenFromCode(code);
};

pp.fullCharCodeAtPos = function () {
  var code = this.input.charCodeAt(this.pos);
  if (code <= 0xd7ff || code >= 0xe000) return code;
  var next = this.input.charCodeAt(this.pos + 1);
  return (code << 10) + next - 0x35fdc00;
};

pp.skipBlockComment = function () {
  var startLoc = this.options.onComment && this.curPosition();
  var start = this.pos,
      end = this.input.indexOf("*/", this.pos += 2);
  if (end === -1) this.raise(this.pos - 2, "Unterminated comment");
  this.pos = end + 2;
  if (this.options.locations) {
    _whitespace.lineBreakG.lastIndex = start;
    var match = undefined;
    while ((match = _whitespace.lineBreakG.exec(this.input)) && match.index < this.pos) {
      ++this.curLine;
      this.lineStart = match.index + match[0].length;
    }
  }
  if (this.options.onComment) this.options.onComment(true, this.input.slice(start + 2, end), start, this.pos, startLoc, this.curPosition());
};

pp.skipLineComment = function (startSkip) {
  var start = this.pos;
  var startLoc = this.options.onComment && this.curPosition();
  var ch = this.input.charCodeAt(this.pos += startSkip);
  while (this.pos < this.input.length && ch !== 10 && ch !== 13 && ch !== 8232 && ch !== 8233) {
    ++this.pos;
    ch = this.input.charCodeAt(this.pos);
  }
  if (this.options.onComment) this.options.onComment(false, this.input.slice(start + startSkip, this.pos), start, this.pos, startLoc, this.curPosition());
};

// Called at the start of the parse and after every token. Skips
// whitespace and comments, and.

pp.skipSpace = function () {
  loop: while (this.pos < this.input.length) {
    var ch = this.input.charCodeAt(this.pos);
    switch (ch) {
      case 32:case 160:
        // ' '
        ++this.pos;
        break;
      case 13:
        if (this.input.charCodeAt(this.pos + 1) === 10) {
          ++this.pos;
        }
      case 10:case 8232:case 8233:
        ++this.pos;
        if (this.options.locations) {
          ++this.curLine;
          this.lineStart = this.pos;
        }
        break;
      case 47:
        // '/'
        switch (this.input.charCodeAt(this.pos + 1)) {
          case 42:
            // '*'
            this.skipBlockComment();
            break;
          case 47:
            this.skipLineComment(2);
            break;
          default:
            break loop;
        }
        break;
      default:
        if (ch > 8 && ch < 14 || ch >= 5760 && _whitespace.nonASCIIwhitespace.test(String.fromCharCode(ch))) {
          ++this.pos;
        } else {
          break loop;
        }
    }
  }
};

// Called at the end of every token. Sets `end`, `val`, and
// maintains `context` and `exprAllowed`, and skips the space after
// the token, so that the next one's `start` will point at the
// right position.

pp.finishToken = function (type, val) {
  this.end = this.pos;
  if (this.options.locations) this.endLoc = this.curPosition();
  var prevType = this.type;
  this.type = type;
  this.value = val;

  this.updateContext(prevType);
};

// ### Token reading

// This is the function that is called to fetch the next token. It
// is somewhat obscure, because it works in character codes rather
// than characters, and because operator parsing has been inlined
// into it.
//
// All in the name of speed.
//
pp.readToken_dot = function () {
  var next = this.input.charCodeAt(this.pos + 1);
  if (next >= 48 && next <= 57) return this.readNumber(true);
  var next2 = this.input.charCodeAt(this.pos + 2);
  if (this.options.ecmaVersion >= 6 && next === 46 && next2 === 46) {
    // 46 = dot '.'
    this.pos += 3;
    return this.finishToken(_tokentype.types.ellipsis);
  } else {
    ++this.pos;
    return this.finishToken(_tokentype.types.dot);
  }
};

pp.readToken_slash = function () {
  // '/'
  var next = this.input.charCodeAt(this.pos + 1);
  if (this.exprAllowed) {
    ++this.pos;return this.readRegexp();
  }
  if (next === 61) return this.finishOp(_tokentype.types.assign, 2);
  return this.finishOp(_tokentype.types.slash, 1);
};

pp.readToken_mult_modulo = function (code) {
  // '%*'
  var next = this.input.charCodeAt(this.pos + 1);
  if (next === 61) return this.finishOp(_tokentype.types.assign, 2);
  return this.finishOp(code === 42 ? _tokentype.types.star : _tokentype.types.modulo, 1);
};

pp.readToken_pipe_amp = function (code) {
  // '|&'
  var next = this.input.charCodeAt(this.pos + 1);
  if (next === code) return this.finishOp(code === 124 ? _tokentype.types.logicalOR : _tokentype.types.logicalAND, 2);
  if (next === 61) return this.finishOp(_tokentype.types.assign, 2);
  return this.finishOp(code === 124 ? _tokentype.types.bitwiseOR : _tokentype.types.bitwiseAND, 1);
};

pp.readToken_caret = function () {
  // '^'
  var next = this.input.charCodeAt(this.pos + 1);
  if (next === 61) return this.finishOp(_tokentype.types.assign, 2);
  return this.finishOp(_tokentype.types.bitwiseXOR, 1);
};

pp.readToken_plus_min = function (code) {
  // '+-'
  var next = this.input.charCodeAt(this.pos + 1);
  if (next === code) {
    if (next == 45 && this.input.charCodeAt(this.pos + 2) == 62 && _whitespace.lineBreak.test(this.input.slice(this.lastTokEnd, this.pos))) {
      // A `-->` line comment
      this.skipLineComment(3);
      this.skipSpace();
      return this.nextToken();
    }
    return this.finishOp(_tokentype.types.incDec, 2);
  }
  if (next === 61) return this.finishOp(_tokentype.types.assign, 2);
  return this.finishOp(_tokentype.types.plusMin, 1);
};

pp.readToken_lt_gt = function (code) {
  // '<>'
  var next = this.input.charCodeAt(this.pos + 1);
  var size = 1;
  if (next === code) {
    size = code === 62 && this.input.charCodeAt(this.pos + 2) === 62 ? 3 : 2;
    if (this.input.charCodeAt(this.pos + size) === 61) return this.finishOp(_tokentype.types.assign, size + 1);
    return this.finishOp(_tokentype.types.bitShift, size);
  }
  if (next == 33 && code == 60 && this.input.charCodeAt(this.pos + 2) == 45 && this.input.charCodeAt(this.pos + 3) == 45) {
    if (this.inModule) this.unexpected();
    // `<!--`, an XML-style comment that should be interpreted as a line comment
    this.skipLineComment(4);
    this.skipSpace();
    return this.nextToken();
  }
  if (next === 61) size = this.input.charCodeAt(this.pos + 2) === 61 ? 3 : 2;
  return this.finishOp(_tokentype.types.relational, size);
};

pp.readToken_eq_excl = function (code) {
  // '=!'
  var next = this.input.charCodeAt(this.pos + 1);
  if (next === 61) return this.finishOp(_tokentype.types.equality, this.input.charCodeAt(this.pos + 2) === 61 ? 3 : 2);
  if (code === 61 && next === 62 && this.options.ecmaVersion >= 6) {
    // '=>'
    this.pos += 2;
    return this.finishToken(_tokentype.types.arrow);
  }
  return this.finishOp(code === 61 ? _tokentype.types.eq : _tokentype.types.prefix, 1);
};

pp.getTokenFromCode = function (code) {
  switch (code) {
    // The interpretation of a dot depends on whether it is followed
    // by a digit or another two dots.
    case 46:
      // '.'
      return this.readToken_dot();

    // Punctuation tokens.
    case 40:
      ++this.pos;return this.finishToken(_tokentype.types.parenL);
    case 41:
      ++this.pos;return this.finishToken(_tokentype.types.parenR);
    case 59:
      ++this.pos;return this.finishToken(_tokentype.types.semi);
    case 44:
      ++this.pos;return this.finishToken(_tokentype.types.comma);
    case 91:
      ++this.pos;return this.finishToken(_tokentype.types.bracketL);
    case 93:
      ++this.pos;return this.finishToken(_tokentype.types.bracketR);
    case 123:
      ++this.pos;return this.finishToken(_tokentype.types.braceL);
    case 125:
      ++this.pos;return this.finishToken(_tokentype.types.braceR);
    case 58:
      ++this.pos;return this.finishToken(_tokentype.types.colon);
    case 63:
      ++this.pos;return this.finishToken(_tokentype.types.question);

    case 96:
      // '`'
      if (this.options.ecmaVersion < 6) break;
      ++this.pos;
      return this.finishToken(_tokentype.types.backQuote);

    case 48:
      // '0'
      var next = this.input.charCodeAt(this.pos + 1);
      if (next === 120 || next === 88) return this.readRadixNumber(16); // '0x', '0X' - hex number
      if (this.options.ecmaVersion >= 6) {
        if (next === 111 || next === 79) return this.readRadixNumber(8); // '0o', '0O' - octal number
        if (next === 98 || next === 66) return this.readRadixNumber(2); // '0b', '0B' - binary number
      }
    // Anything else beginning with a digit is an integer, octal
    // number, or float.
    case 49:case 50:case 51:case 52:case 53:case 54:case 55:case 56:case 57:
      // 1-9
      return this.readNumber(false);

    // Quotes produce strings.
    case 34:case 39:
      // '"', "'"
      return this.readString(code);

    // Operators are parsed inline in tiny state machines. '=' (61) is
    // often referred to. `finishOp` simply skips the amount of
    // characters it is given as second argument, and returns a token
    // of the type given by its first argument.

    case 47:
      // '/'
      return this.readToken_slash();

    case 37:case 42:
      // '%*'
      return this.readToken_mult_modulo(code);

    case 124:case 38:
      // '|&'
      return this.readToken_pipe_amp(code);

    case 94:
      // '^'
      return this.readToken_caret();

    case 43:case 45:
      // '+-'
      return this.readToken_plus_min(code);

    case 60:case 62:
      // '<>'
      return this.readToken_lt_gt(code);

    case 61:case 33:
      // '=!'
      return this.readToken_eq_excl(code);

    case 126:
      // '~'
      return this.finishOp(_tokentype.types.prefix, 1);
  }

  this.raise(this.pos, "Unexpected character '" + codePointToString(code) + "'");
};

pp.finishOp = function (type, size) {
  var str = this.input.slice(this.pos, this.pos + size);
  this.pos += size;
  return this.finishToken(type, str);
};

// Parse a regular expression. Some context-awareness is necessary,
// since a '/' inside a '[]' set does not end the expression.

function tryCreateRegexp(src, flags, throwErrorAt, parser) {
  try {
    return new RegExp(src, flags);
  } catch (e) {
    if (throwErrorAt !== undefined) {
      if (e instanceof SyntaxError) parser.raise(throwErrorAt, "Error parsing regular expression: " + e.message);
      throw e;
    }
  }
}

var regexpUnicodeSupport = !!tryCreateRegexp("￿", "u");

pp.readRegexp = function () {
  var _this = this;

  var escaped = undefined,
      inClass = undefined,
      start = this.pos;
  for (;;) {
    if (this.pos >= this.input.length) this.raise(start, "Unterminated regular expression");
    var ch = this.input.charAt(this.pos);
    if (_whitespace.lineBreak.test(ch)) this.raise(start, "Unterminated regular expression");
    if (!escaped) {
      if (ch === "[") inClass = true;else if (ch === "]" && inClass) inClass = false;else if (ch === "/" && !inClass) break;
      escaped = ch === "\\";
    } else escaped = false;
    ++this.pos;
  }
  var content = this.input.slice(start, this.pos);
  ++this.pos;
  // Need to use `readWord1` because '\uXXXX' sequences are allowed
  // here (don't ask).
  var mods = this.readWord1();
  var tmp = content;
  if (mods) {
    var validFlags = /^[gim]*$/;
    if (this.options.ecmaVersion >= 6) validFlags = /^[gimuy]*$/;
    if (!validFlags.test(mods)) this.raise(start, "Invalid regular expression flag");
    if (mods.indexOf('u') >= 0 && !regexpUnicodeSupport) {
      // Replace each astral symbol and every Unicode escape sequence that
      // possibly represents an astral symbol or a paired surrogate with a
      // single ASCII symbol to avoid throwing on regular expressions that
      // are only valid in combination with the `/u` flag.
      // Note: replacing with the ASCII symbol `x` might cause false
      // negatives in unlikely scenarios. For example, `[\u{61}-b]` is a
      // perfectly valid pattern that is equivalent to `[a-b]`, but it would
      // be replaced by `[x-b]` which throws an error.
      tmp = tmp.replace(/\\u\{([0-9a-fA-F]+)\}/g, function (_match, code, offset) {
        code = Number("0x" + code);
        if (code > 0x10FFFF) _this.raise(start + offset + 3, "Code point out of bounds");
        return "x";
      });
      tmp = tmp.replace(/\\u([a-fA-F0-9]{4})|[\uD800-\uDBFF][\uDC00-\uDFFF]/g, "x");
    }
  }
  // Detect invalid regular expressions.
  var value = null;
  // Rhino's regular expression parser is flaky and throws uncatchable exceptions,
  // so don't do detection if we are running under Rhino
  if (!isRhino) {
    tryCreateRegexp(tmp, undefined, start, this);
    // Get a regular expression object for this pattern-flag pair, or `null` in
    // case the current environment doesn't support the flags it uses.
    value = tryCreateRegexp(content, mods);
  }
  return this.finishToken(_tokentype.types.regexp, { pattern: content, flags: mods, value: value });
};

// Read an integer in the given radix. Return null if zero digits
// were read, the integer value otherwise. When `len` is given, this
// will return `null` unless the integer has exactly `len` digits.

pp.readInt = function (radix, len) {
  var start = this.pos,
      total = 0;
  for (var i = 0, e = len == null ? Infinity : len; i < e; ++i) {
    var code = this.input.charCodeAt(this.pos),
        val = undefined;
    if (code >= 97) val = code - 97 + 10; // a
    else if (code >= 65) val = code - 65 + 10; // A
      else if (code >= 48 && code <= 57) val = code - 48; // 0-9
        else val = Infinity;
    if (val >= radix) break;
    ++this.pos;
    total = total * radix + val;
  }
  if (this.pos === start || len != null && this.pos - start !== len) return null;

  return total;
};

pp.readRadixNumber = function (radix) {
  this.pos += 2; // 0x
  var val = this.readInt(radix);
  if (val == null) this.raise(this.start + 2, "Expected number in radix " + radix);
  if (_identifier.isIdentifierStart(this.fullCharCodeAtPos())) this.raise(this.pos, "Identifier directly after number");
  return this.finishToken(_tokentype.types.num, val);
};

// Read an integer, octal integer, or floating-point number.

pp.readNumber = function (startsWithDot) {
  var start = this.pos,
      isFloat = false,
      octal = this.input.charCodeAt(this.pos) === 48;
  if (!startsWithDot && this.readInt(10) === null) this.raise(start, "Invalid number");
  var next = this.input.charCodeAt(this.pos);
  if (next === 46) {
    // '.'
    ++this.pos;
    this.readInt(10);
    isFloat = true;
    next = this.input.charCodeAt(this.pos);
  }
  if (next === 69 || next === 101) {
    // 'eE'
    next = this.input.charCodeAt(++this.pos);
    if (next === 43 || next === 45) ++this.pos; // '+-'
    if (this.readInt(10) === null) this.raise(start, "Invalid number");
    isFloat = true;
  }
  if (_identifier.isIdentifierStart(this.fullCharCodeAtPos())) this.raise(this.pos, "Identifier directly after number");

  var str = this.input.slice(start, this.pos),
      val = undefined;
  if (isFloat) val = parseFloat(str);else if (!octal || str.length === 1) val = parseInt(str, 10);else if (/[89]/.test(str) || this.strict) this.raise(start, "Invalid number");else val = parseInt(str, 8);
  return this.finishToken(_tokentype.types.num, val);
};

// Read a string value, interpreting backslash-escapes.

pp.readCodePoint = function () {
  var ch = this.input.charCodeAt(this.pos),
      code = undefined;

  if (ch === 123) {
    if (this.options.ecmaVersion < 6) this.unexpected();
    var codePos = ++this.pos;
    code = this.readHexChar(this.input.indexOf('}', this.pos) - this.pos);
    ++this.pos;
    if (code > 0x10FFFF) this.raise(codePos, "Code point out of bounds");
  } else {
    code = this.readHexChar(4);
  }
  return code;
};

function codePointToString(code) {
  // UTF-16 Decoding
  if (code <= 0xFFFF) return String.fromCharCode(code);
  code -= 0x10000;
  return String.fromCharCode((code >> 10) + 0xD800, (code & 1023) + 0xDC00);
}

pp.readString = function (quote) {
  var out = "",
      chunkStart = ++this.pos;
  for (;;) {
    if (this.pos >= this.input.length) this.raise(this.start, "Unterminated string constant");
    var ch = this.input.charCodeAt(this.pos);
    if (ch === quote) break;
    if (ch === 92) {
      // '\'
      out += this.input.slice(chunkStart, this.pos);
      out += this.readEscapedChar(false);
      chunkStart = this.pos;
    } else {
      if (_whitespace.isNewLine(ch)) this.raise(this.start, "Unterminated string constant");
      ++this.pos;
    }
  }
  out += this.input.slice(chunkStart, this.pos++);
  return this.finishToken(_tokentype.types.string, out);
};

// Reads template string tokens.

pp.readTmplToken = function () {
  var out = "",
      chunkStart = this.pos;
  for (;;) {
    if (this.pos >= this.input.length) this.raise(this.start, "Unterminated template");
    var ch = this.input.charCodeAt(this.pos);
    if (ch === 96 || ch === 36 && this.input.charCodeAt(this.pos + 1) === 123) {
      // '`', '${'
      if (this.pos === this.start && this.type === _tokentype.types.template) {
        if (ch === 36) {
          this.pos += 2;
          return this.finishToken(_tokentype.types.dollarBraceL);
        } else {
          ++this.pos;
          return this.finishToken(_tokentype.types.backQuote);
        }
      }
      out += this.input.slice(chunkStart, this.pos);
      return this.finishToken(_tokentype.types.template, out);
    }
    if (ch === 92) {
      // '\'
      out += this.input.slice(chunkStart, this.pos);
      out += this.readEscapedChar(true);
      chunkStart = this.pos;
    } else if (_whitespace.isNewLine(ch)) {
      out += this.input.slice(chunkStart, this.pos);
      ++this.pos;
      switch (ch) {
        case 13:
          if (this.input.charCodeAt(this.pos) === 10) ++this.pos;
        case 10:
          out += "\n";
          break;
        default:
          out += String.fromCharCode(ch);
          break;
      }
      if (this.options.locations) {
        ++this.curLine;
        this.lineStart = this.pos;
      }
      chunkStart = this.pos;
    } else {
      ++this.pos;
    }
  }
};

// Used to read escaped characters

pp.readEscapedChar = function (inTemplate) {
  var ch = this.input.charCodeAt(++this.pos);
  ++this.pos;
  switch (ch) {
    case 110:
      return "\n"; // 'n' -> '\n'
    case 114:
      return "\r"; // 'r' -> '\r'
    case 120:
      return String.fromCharCode(this.readHexChar(2)); // 'x'
    case 117:
      return codePointToString(this.readCodePoint()); // 'u'
    case 116:
      return "\t"; // 't' -> '\t'
    case 98:
      return "\b"; // 'b' -> '\b'
    case 118:
      return "\u000b"; // 'v' -> '\u000b'
    case 102:
      return "\f"; // 'f' -> '\f'
    case 13:
      if (this.input.charCodeAt(this.pos) === 10) ++this.pos; // '\r\n'
    case 10:
      // ' \n'
      if (this.options.locations) {
        this.lineStart = this.pos;++this.curLine;
      }
      return "";
    default:
      if (ch >= 48 && ch <= 55) {
        var octalStr = this.input.substr(this.pos - 1, 3).match(/^[0-7]+/)[0];
        var octal = parseInt(octalStr, 8);
        if (octal > 255) {
          octalStr = octalStr.slice(0, -1);
          octal = parseInt(octalStr, 8);
        }
        if (octalStr !== "0" && (this.strict || inTemplate)) {
          this.raise(this.pos - 2, "Octal literal in strict mode");
        }
        this.pos += octalStr.length - 1;
        return String.fromCharCode(octal);
      }
      return String.fromCharCode(ch);
  }
};

// Used to read character escape sequences ('\x', '\u', '\U').

pp.readHexChar = function (len) {
  var codePos = this.pos;
  var n = this.readInt(16, len);
  if (n === null) this.raise(codePos, "Bad character escape sequence");
  return n;
};

// Read an identifier, and return it as a string. Sets `this.containsEsc`
// to whether the word contained a '\u' escape.
//
// Incrementally adds only escaped chars, adding other chunks as-is
// as a micro-optimization.

pp.readWord1 = function () {
  this.containsEsc = false;
  var word = "",
      first = true,
      chunkStart = this.pos;
  var astral = this.options.ecmaVersion >= 6;
  while (this.pos < this.input.length) {
    var ch = this.fullCharCodeAtPos();
    if (_identifier.isIdentifierChar(ch, astral)) {
      this.pos += ch <= 0xffff ? 1 : 2;
    } else if (ch === 92) {
      // "\"
      this.containsEsc = true;
      word += this.input.slice(chunkStart, this.pos);
      var escStart = this.pos;
      if (this.input.charCodeAt(++this.pos) != 117) // "u"
        this.raise(this.pos, "Expecting Unicode escape sequence \\uXXXX");
      ++this.pos;
      var esc = this.readCodePoint();
      if (!(first ? _identifier.isIdentifierStart : _identifier.isIdentifierChar)(esc, astral)) this.raise(escStart, "Invalid Unicode escape");
      word += codePointToString(esc);
      chunkStart = this.pos;
    } else {
      break;
    }
    first = false;
  }
  return word + this.input.slice(chunkStart, this.pos);
};

// Read an identifier or keyword token. Will check for reserved
// words when necessary.

pp.readWord = function () {
  var word = this.readWord1();
  var type = _tokentype.types.name;
  if ((this.options.ecmaVersion >= 6 || !this.containsEsc) && this.keywords.test(word)) type = _tokentype.keywords[word];
  return this.finishToken(type, word);
};

},{"./identifier":2,"./locutil":5,"./state":10,"./tokentype":14,"./whitespace":16}],14:[function(_dereq_,module,exports){
// ## Token types

// The assignment of fine-grained, information-carrying type objects
// allows the tokenizer to store the information it has about a
// token in a way that is very cheap for the parser to look up.

// All token type variables start with an underscore, to make them
// easy to recognize.

// The `beforeExpr` property is used to disambiguate between regular
// expressions and divisions. It is set on all token types that can
// be followed by an expression (thus, a slash after them would be a
// regular expression).
//
// The `startsExpr` property is used to check if the token ends a
// `yield` expression. It is set on all token types that either can
// directly start an expression (like a quotation mark) or can
// continue an expression (like the body of a string).
//
// `isLoop` marks a keyword as starting a loop, which is important
// to know when parsing a label, in order to allow or disallow
// continue jumps to that label.

"use strict";

exports.__esModule = true;

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var TokenType = function TokenType(label) {
  var conf = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

  _classCallCheck(this, TokenType);

  this.label = label;
  this.keyword = conf.keyword;
  this.beforeExpr = !!conf.beforeExpr;
  this.startsExpr = !!conf.startsExpr;
  this.isLoop = !!conf.isLoop;
  this.isAssign = !!conf.isAssign;
  this.prefix = !!conf.prefix;
  this.postfix = !!conf.postfix;
  this.binop = conf.binop || null;
  this.updateContext = null;
};

exports.TokenType = TokenType;

function binop(name, prec) {
  return new TokenType(name, { beforeExpr: true, binop: prec });
}
var beforeExpr = { beforeExpr: true },
    startsExpr = { startsExpr: true };

var types = {
  num: new TokenType("num", startsExpr),
  regexp: new TokenType("regexp", startsExpr),
  string: new TokenType("string", startsExpr),
  name: new TokenType("name", startsExpr),
  eof: new TokenType("eof"),

  // Punctuation token types.
  bracketL: new TokenType("[", { beforeExpr: true, startsExpr: true }),
  bracketR: new TokenType("]"),
  braceL: new TokenType("{", { beforeExpr: true, startsExpr: true }),
  braceR: new TokenType("}"),
  parenL: new TokenType("(", { beforeExpr: true, startsExpr: true }),
  parenR: new TokenType(")"),
  comma: new TokenType(",", beforeExpr),
  semi: new TokenType(";", beforeExpr),
  colon: new TokenType(":", beforeExpr),
  dot: new TokenType("."),
  question: new TokenType("?", beforeExpr),
  arrow: new TokenType("=>", beforeExpr),
  template: new TokenType("template"),
  ellipsis: new TokenType("...", beforeExpr),
  backQuote: new TokenType("`", startsExpr),
  dollarBraceL: new TokenType("${", { beforeExpr: true, startsExpr: true }),

  // Operators. These carry several kinds of properties to help the
  // parser use them properly (the presence of these properties is
  // what categorizes them as operators).
  //
  // `binop`, when present, specifies that this operator is a binary
  // operator, and will refer to its precedence.
  //
  // `prefix` and `postfix` mark the operator as a prefix or postfix
  // unary operator.
  //
  // `isAssign` marks all of `=`, `+=`, `-=` etcetera, which act as
  // binary operators with a very low precedence, that should result
  // in AssignmentExpression nodes.

  eq: new TokenType("=", { beforeExpr: true, isAssign: true }),
  assign: new TokenType("_=", { beforeExpr: true, isAssign: true }),
  incDec: new TokenType("++/--", { prefix: true, postfix: true, startsExpr: true }),
  prefix: new TokenType("prefix", { beforeExpr: true, prefix: true, startsExpr: true }),
  logicalOR: binop("||", 1),
  logicalAND: binop("&&", 2),
  bitwiseOR: binop("|", 3),
  bitwiseXOR: binop("^", 4),
  bitwiseAND: binop("&", 5),
  equality: binop("==/!=", 6),
  relational: binop("</>", 7),
  bitShift: binop("<</>>", 8),
  plusMin: new TokenType("+/-", { beforeExpr: true, binop: 9, prefix: true, startsExpr: true }),
  modulo: binop("%", 10),
  star: binop("*", 10),
  slash: binop("/", 10)
};

exports.types = types;
// Map keyword names to token types.

var keywords = {};

exports.keywords = keywords;
// Succinct definitions of keyword token types
function kw(name) {
  var options = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

  options.keyword = name;
  keywords[name] = types["_" + name] = new TokenType(name, options);
}

kw("break");
kw("case", beforeExpr);
kw("catch");
kw("continue");
kw("debugger");
kw("default", beforeExpr);
kw("do", { isLoop: true, beforeExpr: true });
kw("else", beforeExpr);
kw("finally");
kw("for", { isLoop: true });
kw("function", startsExpr);
kw("if");
kw("return", beforeExpr);
kw("switch");
kw("throw", beforeExpr);
kw("try");
kw("var");
kw("let");
kw("const");
kw("while", { isLoop: true });
kw("with");
kw("new", { beforeExpr: true, startsExpr: true });
kw("this", startsExpr);
kw("super", startsExpr);
kw("class");
kw("extends", beforeExpr);
kw("export");
kw("import");
kw("yield", { beforeExpr: true, startsExpr: true });
kw("null", startsExpr);
kw("true", startsExpr);
kw("false", startsExpr);
kw("in", { beforeExpr: true, binop: 7 });
kw("instanceof", { beforeExpr: true, binop: 7 });
kw("typeof", { beforeExpr: true, prefix: true, startsExpr: true });
kw("void", { beforeExpr: true, prefix: true, startsExpr: true });
kw("delete", { beforeExpr: true, prefix: true, startsExpr: true });

},{}],15:[function(_dereq_,module,exports){
"use strict";

exports.__esModule = true;
exports.isArray = isArray;
exports.has = has;

function isArray(obj) {
  return Object.prototype.toString.call(obj) === "[object Array]";
}

// Checks if an object has a property.

function has(obj, propName) {
  return Object.prototype.hasOwnProperty.call(obj, propName);
}

},{}],16:[function(_dereq_,module,exports){
// Matches a whole line break (where CRLF is considered a single
// line break). Used to count lines.

"use strict";

exports.__esModule = true;
exports.isNewLine = isNewLine;
var lineBreak = /\r\n?|\n|\u2028|\u2029/;
exports.lineBreak = lineBreak;
var lineBreakG = new RegExp(lineBreak.source, "g");

exports.lineBreakG = lineBreakG;

function isNewLine(code) {
  return code === 10 || code === 13 || code === 0x2028 || code == 0x2029;
}

var nonASCIIwhitespace = /[\u1680\u180e\u2000-\u200a\u202f\u205f\u3000\ufeff]/;
exports.nonASCIIwhitespace = nonASCIIwhitespace;

},{}]},{},[3])(3)
});
}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{}],2:[function(_dereq_,module,exports){

},{}],3:[function(_dereq_,module,exports){
"use strict";
var containsField = function (obj, field, cb) {
    // if (field in (obj || {})) {
    //     cb(obj[field])
    // }
    if (obj && field in obj && typeof obj[field] !== "undefined") {
        cb(obj[field]);
    }
};
var parsebool = function (b, d) {
    if ("boolean" === typeof b) {
        return b;
    }
    switch (b) {
        case "true": return true;
        case "false": return false;
        default: return d;
    }
};
var _collectionRegex = /^Collection\((.*)\)$/;
var Metadata = (function () {
    function Metadata($data, options, metadata) {
        this.$data = $data;
        this.options = options || {};
        this.metadata = metadata;
        this.options.container = this.$data.Container; //this.options.container || $data.createContainer()
    }
    Metadata.prototype._getMaxValue = function (maxValue) {
        if ("number" === typeof maxValue)
            return maxValue;
        if ("max" === maxValue)
            return Number.MAX_VALUE;
        return parseInt(maxValue);
    };
    Metadata.prototype.createTypeDefinition = function (propertySchema, definition) {
        var _this = this;
        containsField(propertySchema, "type", function (v) {
            var match = _collectionRegex.exec(v);
            if (match) {
                definition.type = _this.options.collectionBaseType || 'Array';
                definition.elementType = match[1];
            }
            else {
                definition.type = v;
            }
        });
    };
    Metadata.prototype.createReturnTypeDefinition = function (propertySchema, definition) {
        containsField(propertySchema, "type", function (v) {
            var match = _collectionRegex.exec(v);
            if (match) {
                definition.returnType = '$data.Queryable';
                definition.elementType = match[1];
            }
            else {
                definition.returnType = v;
            }
        });
    };
    Metadata.prototype.createProperty = function (entitySchema, propertySchema) {
        var _this = this;
        var self = this;
        if (!propertySchema) {
            propertySchema = entitySchema;
            entitySchema = undefined;
        }
        var definition = {};
        this.createTypeDefinition(propertySchema, definition);
        containsField(propertySchema, "nullable", function (v) {
            definition.nullable = parsebool(v, true),
                definition.required = parsebool(v, true) === false;
        });
        containsField(propertySchema, "maxLength", function (v) {
            definition.maxLength = _this._getMaxValue(v);
        });
        containsField(entitySchema, "key", function (keys) {
            if (keys.propertyRefs.some(function (pr) { return pr.name === propertySchema.name; })) {
                definition.key = true;
            }
        });
        containsField(propertySchema, "concurrencyMode", function (v) {
            definition.concurrencyMode = self.$data.ConcurrencyMode[v];
        });
        return {
            name: propertySchema.name,
            definition: definition
        };
    };
    Metadata.prototype.createNavigationProperty = function (entitySchema, propertySchema) {
        if (!propertySchema) {
            propertySchema = entitySchema;
            entitySchema = undefined;
        }
        var definition = {};
        this.createTypeDefinition(propertySchema, definition);
        containsField(propertySchema, "nullable", function (v) {
            definition.nullable = parsebool(v, true),
                definition.required = parsebool(v, true) === false;
        });
        containsField(propertySchema, "partner", function (p) {
            definition.inverseProperty = p;
        });
        if (!definition.inverseProperty) {
            definition.inverseProperty = '$$unbound';
        }
        return {
            name: propertySchema.name,
            definition: definition
        };
    };
    Metadata.prototype.createEntityDefinition = function (entitySchema) {
        var props = (entitySchema.properties || []).map(this.createProperty.bind(this, entitySchema));
        var navigationProps = (entitySchema.navigationProperties || []).map(this.createNavigationProperty.bind(this, entitySchema));
        props = props.concat(navigationProps);
        var result = props.reduce(function (p, c) {
            p[c.name] = c.definition;
            return p;
        }, {});
        return result;
    };
    Metadata.prototype.createEntityType = function (entitySchema, namespace) {
        var baseType = (entitySchema.baseType ? entitySchema.baseType : this.options.baseType) || this.$data.Entity;
        var definition = this.createEntityDefinition(entitySchema);
        var entityFullName = namespace + "." + entitySchema.name;
        var staticDefinition = {};
        containsField(entitySchema, "openType", function (v) {
            if (parsebool(v, false)) {
                staticDefinition.openType = { value: true };
            }
        });
        return {
            namespace: namespace,
            typeName: entityFullName,
            baseType: baseType,
            params: [entityFullName, this.options.container, definition, staticDefinition],
            definition: definition,
            type: 'entity'
        };
    };
    Metadata.prototype.createEnumOption = function (entitySchema, propertySchema, i) {
        if (!propertySchema) {
            propertySchema = entitySchema;
            entitySchema = undefined;
        }
        var definition = {
            name: propertySchema.name,
            index: i
        };
        containsField(propertySchema, "value", function (value) {
            var v = +value;
            if (!isNaN(v)) {
                definition.value = v;
            }
        });
        return definition;
    };
    Metadata.prototype.createEnumDefinition = function (enumSchema) {
        var props = (enumSchema.members || []).map(this.createEnumOption.bind(this, enumSchema));
        return props;
    };
    Metadata.prototype.createEnumType = function (enumSchema, namespace) {
        var self = this;
        var definition = this.createEnumDefinition(enumSchema);
        var enumFullName = namespace + "." + enumSchema.name;
        return {
            namespace: namespace,
            typeName: enumFullName,
            baseType: self.$data.Enum,
            params: [enumFullName, this.options.container, enumSchema.underlyingType, definition],
            definition: definition,
            type: 'enum'
        };
    };
    Metadata.prototype.createEntitySetProperty = function (entitySetSchema, contextSchema) {
        //var c = this.options.container
        var t = entitySetSchema.entityType; //c.classTypes[c.classNames[entitySetSchema.entityType]] // || entitySetSchema.entityType
        var prop = {
            name: entitySetSchema.name,
            definition: {
                type: this.options.entitySetType || '$data.EntitySet',
                elementType: t
            }
        };
        return prop;
    };
    Metadata.prototype.indexBy = function (fieldName, pick) {
        return [function (p, c) { p[c[fieldName]] = c[pick]; return p; }, {}];
    };
    Metadata.prototype.createContextDefinition = function (contextSchema, namespace) {
        var _this = this;
        var props = (contextSchema.entitySets || []).map(function (es) { return _this.createEntitySetProperty(es, contextSchema); });
        var result = props.reduce.apply(props, this.indexBy("name", "definition"));
        return result;
    };
    Metadata.prototype.createContextType = function (contextSchema, namespace) {
        if (Array.isArray(contextSchema)) {
            throw new Error("Array type is not supported here");
        }
        var definition = this.createContextDefinition(contextSchema, namespace);
        var baseType = this.options.contextType || this.$data.EntityContext;
        var typeName = namespace + "." + contextSchema.name;
        var contextImportMethods = [];
        contextSchema.actionImports && contextImportMethods.push.apply(contextImportMethods, contextSchema.actionImports);
        contextSchema.functionImports && contextImportMethods.push.apply(contextImportMethods, contextSchema.functionImports);
        return {
            namespace: namespace,
            typeName: typeName,
            baseType: baseType,
            params: [typeName, this.options.container, definition],
            definition: definition,
            type: 'context',
            contextImportMethods: contextImportMethods
        };
    };
    Metadata.prototype.createMethodParameter = function (parameter, definition) {
        var paramDef = {
            name: parameter.name
        };
        this.createTypeDefinition(parameter, paramDef);
        definition.params.push(paramDef);
    };
    Metadata.prototype.applyBoundMethod = function (actionInfo, ns, typeDefinitions, type) {
        var _this = this;
        var definition = {
            type: type,
            namespace: ns,
            returnType: null,
            params: []
        };
        containsField(actionInfo, "returnType", function (value) {
            _this.createReturnTypeDefinition(value, definition);
        });
        var parameters = [].concat(actionInfo.parameters);
        parameters.forEach(function (p) { return _this.createMethodParameter(p, definition); });
        if (parsebool(actionInfo.isBound, false)) {
            var bindingParameter = definition.params.shift();
            if (bindingParameter.type === (this.options.collectionBaseType || 'Array')) {
                var filteredContextDefinitions = typeDefinitions.filter(function (d) { return d.namespace === ns && d.type === 'context'; });
                filteredContextDefinitions.forEach(function (ctx) {
                    for (var setName in ctx.definition) {
                        var set = ctx.definition[setName];
                        if (set.elementType === bindingParameter.elementType) {
                            set.actions = set.actions = {};
                            set.actions[actionInfo.name] = definition;
                        }
                    }
                });
            }
            else {
                var filteredTypeDefinitions = typeDefinitions.filter(function (d) { return d.typeName === bindingParameter.type && d.type === 'entity'; });
                filteredTypeDefinitions.forEach(function (t) {
                    t.definition[actionInfo.name] = definition;
                });
            }
        }
        else {
            delete definition.namespace;
            var methodFullName = ns + '.' + actionInfo.name;
            var filteredContextDefinitions = typeDefinitions.filter(function (d) { return d.type === 'context'; });
            filteredContextDefinitions.forEach(function (ctx) {
                ctx.contextImportMethods.forEach(function (methodImportInfo) {
                    if (methodImportInfo.action === methodFullName || methodImportInfo.function === methodFullName) {
                        ctx.definition[actionInfo.name] = definition;
                    }
                });
            });
        }
    };
    Metadata.prototype.processMetadata = function (createdTypes) {
        var _this = this;
        var types = createdTypes || [];
        var typeDefinitions = [];
        var serviceMethods = [];
        var self = this;
        this.metadata.dataServices.schemas.forEach(function (schema) {
            var ns = schema.namespace;
            if (schema.enumTypes) {
                var enumTypes = schema.enumTypes.map(function (ct) { return _this.createEnumType(ct, ns); });
                typeDefinitions.push.apply(typeDefinitions, enumTypes);
            }
            if (schema.complexTypes) {
                var complexTypes = schema.complexTypes.map(function (ct) { return _this.createEntityType(ct, ns); });
                typeDefinitions.push.apply(typeDefinitions, complexTypes);
            }
            if (schema.entityTypes) {
                var entityTypes = schema.entityTypes.map(function (et) { return _this.createEntityType(et, ns); });
                typeDefinitions.push.apply(typeDefinitions, entityTypes);
            }
            if (schema.actions) {
                serviceMethods.push.apply(serviceMethods, schema.actions.map(function (m) { return function (defs) { return _this.applyBoundMethod(m, ns, defs, '$data.ServiceAction'); }; }));
            }
            if (schema.functions) {
                serviceMethods.push.apply(serviceMethods, schema.functions.map(function (m) { return function (defs) { return _this.applyBoundMethod(m, ns, defs, '$data.ServiceFunction'); }; }));
            }
            if (schema.entityContainer) {
                var contexts = schema.entityContainer.map(function (ctx) { return _this.createContextType(ctx, self.options.namespace || ns); });
                typeDefinitions.push.apply(typeDefinitions, contexts);
            }
        });
        serviceMethods.forEach(function (m) { return m(typeDefinitions); });
        types.src = '(function(mod) {\n' +
            '  if (typeof exports == "object" && typeof module == "object") return mod(exports, require("jaydata/core")); // CommonJS\n' +
            '  if (typeof define == "function" && define.amd) return define(["exports"], mod); // AMD\n' +
            '  mod($data.generatedContext || ($data.generatedContext = {}), $data); // Plain browser env\n' +
            '})(function(exports, $data) {\n\n' +
            'var types = {};\n\n';
        types.push.apply(types, typeDefinitions.map(function (d) {
            var srcPart = '';
            if (d.baseType == self.$data.Enum) {
                srcPart += 'types["' + d.params[0] + '"] = $data.createEnum("' + d.params[0] + '", [\n' +
                    Object.keys(d.params[3]).map(function (dp) { return '  ' + JSON.stringify(d.params[3][dp]); }).join(',\n') +
                    '\n]);\n\n';
            }
            else {
                var typeName = _this.options.container.resolveName(d.baseType);
                if (d.baseType == self.$data.EntityContext)
                    srcPart += 'exports.type = ';
                srcPart += 'types["' + d.params[0] + '"] = ' +
                    (typeName == '$data.Entity' || typeName == '$data.EntityContext' ? typeName : 'types["' + typeName + '"]') +
                    '.extend("' + d.params[0] + '", ';
                if (d.params[2] && Object.keys(d.params[2]).length > 0)
                    srcPart += '{\n' + Object.keys(d.params[2]).map(function (dp) { return '  ' + dp + ': ' + JSON.stringify(d.params[2][dp]); }).join(',\n') + '\n}';
                else
                    srcPart += 'null';
                if (d.params[3] && Object.keys(d.params[3]).length > 0)
                    srcPart += ', {\n' + Object.keys(d.params[3]).map(function (dp) { return '  ' + dp + ': ' + JSON.stringify(d.params[3][dp]); }).join(',\n') + '\n}';
                srcPart += ');\n\n';
            }
            types.src += srcPart;
            if (_this.options.debug)
                console.log('Type generated:', d.params[0]);
            var baseType = _this.options.container.resolveType(d.baseType);
            return baseType.extend.apply(baseType, d.params);
        }));
        types.src += 'var ctxType = exports.type;\n' +
            'exports.factory = function(config){\n' +
            '  if (ctxType){\n' +
            '    var cfg = $data.typeSystem.extend({\n' +
            '      name: "oData",\n' +
            '      oDataServiceHost: "' + this.options.url.replace('/$metadata', '') + '",\n' +
            '      withCredentials: ' + (this.options.withCredentials || false) + ',\n' +
            '      maxDataServiceVersion: "' + (this.options.maxDataServiceVersion || '4.0') + '"\n' +
            '    }, config);\n' +
            '    return new ctxType(cfg);\n' +
            '  }else{\n' +
            '    return null;\n' +
            '  }\n' +
            '};\n\n';
        if (this.options.autoCreateContext) {
            var contextName = typeof this.options.autoCreateContext == 'string' ? this.options.autoCreateContext : 'context';
            types.src += 'exports["' + contextName + '"] = exports.factory();\n\n';
        }
        types.src += '});';
        return types;
    };
    return Metadata;
}());
exports.Metadata = Metadata;

},{}],4:[function(_dereq_,module,exports){
(function (global){
"use strict";
/// <reference path="../typings/tsd.d.ts"/>
var odata_metadata_1 = _dereq_('odata-metadata');
var metadata_1 = _dereq_('./metadata');
var odatajs = (typeof window !== "undefined" ? window['odatajs'] : typeof global !== "undefined" ? global['odatajs'] : null);
var extend = _dereq_('extend');
var MetadataHandler = (function () {
    function MetadataHandler($data, options) {
        this.$data = $data;
        this.options = options || {};
        this.prepareRequest = options.prepareRequest || function () { };
        if (typeof odatajs === 'undefined' || typeof odatajs.oData === 'undefined') {
            console.error('Not Found!:', 'odatajs is required');
        }
        else {
            this.oData = odatajs.oData;
        }
    }
    MetadataHandler.prototype.parse = function (text) {
        var _this = this;
        var edmMetadata = new odata_metadata_1.Edm.Edmx(this.oData.metadata.metadataParser(null, text));
        var metadata = new metadata_1.Metadata(this.$data, this.options, edmMetadata);
        var types = metadata.processMetadata();
        var contextType = types.filter(function (t) { return t.isAssignableTo(_this.$data.EntityContext); })[0];
        var factory = this._createFactoryFunc(contextType);
        factory.type = contextType;
        factory.src = types.src;
        return factory;
    };
    MetadataHandler.prototype.load = function () {
        var self = this;
        return new Promise(function (resolve, reject) {
            var serviceUrl = self.options.url.replace('/$metadata', '');
            var metadataUrl = serviceUrl.replace(/\/+$/, '') + '/$metadata';
            self.options.serivceUri = serviceUrl;
            var requestData = [
                {
                    requestUri: metadataUrl,
                    method: self.options.method || "GET",
                    headers: self.options.headers || {}
                },
                function (data) {
                    var edmMetadata = new odata_metadata_1.Edm.Edmx(data);
                    var metadata = new metadata_1.Metadata(self.$data, self.options, edmMetadata);
                    var types = metadata.processMetadata();
                    var contextType = types.filter(function (t) { return t.isAssignableTo(self.$data.EntityContext); })[0];
                    var factory = self._createFactoryFunc(contextType);
                    factory.type = contextType;
                    factory.src = types.src;
                    resolve(factory);
                },
                reject,
                self.oData.metadataHandler
            ];
            self._appendBasicAuth(requestData[0], self.options.user, self.options.password, self.options.withCredentials);
            self.prepareRequest.call(self, requestData);
            self.oData.request.apply(self.oData, requestData);
        });
    };
    MetadataHandler.prototype._createFactoryFunc = function (ctxType) {
        var _this = this;
        return function (config) {
            if (ctxType) {
                var cfg = extend({
                    name: 'oData',
                    oDataServiceHost: _this.options.url.replace('/$metadata', ''),
                    user: _this.options.user,
                    password: _this.options.password,
                    withCredentials: _this.options.withCredentials,
                    maxDataServiceVersion: _this.options.maxDataServiceVersion || '4.0'
                }, config);
                return new ctxType(cfg);
            }
            else {
                return null;
            }
        };
    };
    MetadataHandler.prototype._appendBasicAuth = function (request, user, password, withCredentials) {
        request.headers = request.headers || {};
        if (!request.headers.Authorization && user && password) {
            request.headers.Authorization = "Basic " + this.__encodeBase64(user + ":" + password);
        }
        if (withCredentials) {
            request.withCredentials = withCredentials;
        }
    };
    MetadataHandler.prototype.__encodeBase64 = function (val) {
        var b64array = "ABCDEFGHIJKLMNOP" +
            "QRSTUVWXYZabcdef" +
            "ghijklmnopqrstuv" +
            "wxyz0123456789+/" +
            "=";
        var input = val;
        var base64 = "";
        var hex = "";
        var chr1, chr2, chr3;
        var enc1, enc2, enc3, enc4;
        var i = 0;
        do {
            chr1 = input.charCodeAt(i++);
            chr2 = input.charCodeAt(i++);
            chr3 = input.charCodeAt(i++);
            enc1 = chr1 >> 2;
            enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
            enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
            enc4 = chr3 & 63;
            if (isNaN(chr2)) {
                enc3 = enc4 = 64;
            }
            else if (isNaN(chr3)) {
                enc4 = 64;
            }
            base64 = base64 +
                b64array.charAt(enc1) +
                b64array.charAt(enc2) +
                b64array.charAt(enc3) +
                b64array.charAt(enc4);
        } while (i < input.length);
        return base64;
    };
    return MetadataHandler;
}());
exports.MetadataHandler = MetadataHandler;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"./metadata":3,"extend":6,"odata-metadata":12}],5:[function(_dereq_,module,exports){
"use strict";
/// <reference path="../typings/tsd.d.ts"/>
var extend = _dereq_('extend');
var metadataHandler_1 = _dereq_('./metadataHandler');
var jaydata_error_handler_1 = _dereq_('jaydata-error-handler');
var jaydata_promise_handler_1 = _dereq_('jaydata-promise-handler');
var metadataHandler_2 = _dereq_('./metadataHandler');
exports.MetadataHandler = metadataHandler_2.MetadataHandler;
var ServiceParams = (function () {
    function ServiceParams() {
        this.config = {};
    }
    return ServiceParams;
}());
exports.ServiceParams = ServiceParams;
var DynamicMetadata = (function () {
    function DynamicMetadata($data) {
        this.$data = $data;
    }
    DynamicMetadata.prototype.service = function (serviceUri, config, callback) {
        var params = new ServiceParams();
        DynamicMetadata.getParam(config, params);
        DynamicMetadata.getParam(callback, params);
        if (typeof serviceUri == 'object') {
            extend(params.config, serviceUri);
        }
        else if (typeof serviceUri == 'string') {
            params.config = params.config || {};
            params.config.url = serviceUri;
        }
        var pHandler = new jaydata_promise_handler_1.PromiseHandler();
        var _callback = pHandler.createCallback(params.callback);
        var self = this;
        new metadataHandler_1.MetadataHandler(this.$data, params.config).load().then(function (factory) {
            var type = factory.type;
            //register to local store
            var storeAlias = params.config.serviceName || params.config.storeAlias;
            if (storeAlias && 'addStore' in self.$data) {
                self.$data.addStore(storeAlias, factory, params.config.isDefault === undefined || params.config.isDefault);
            }
            _callback.success(factory, type);
        }, function (err) {
            _callback.error(err);
        });
        return pHandler.getPromise();
    };
    DynamicMetadata.prototype.initService = function (serviceUri, config, callback) {
        var params = new ServiceParams();
        DynamicMetadata.getParam(config, params);
        DynamicMetadata.getParam(callback, params);
        if (typeof serviceUri == 'object') {
            extend(params.config, serviceUri);
        }
        else if (typeof serviceUri == 'string') {
            params.config = params.config || {};
            params.config.url = serviceUri;
        }
        var pHandler = new jaydata_promise_handler_1.PromiseHandler();
        var _callback = pHandler.createCallback(params.callback);
        this.service(params.config.url, params.config, {
            success: function (factory) {
                var ctx = factory();
                if (ctx) {
                    return ctx.onReady(_callback);
                }
                return _callback.error(new jaydata_error_handler_1.Exception("Missing Context Type"));
            },
            error: _callback.error
        });
        return pHandler.getPromise();
    };
    DynamicMetadata.use = function ($data) {
        var dynamicMetadata = new DynamicMetadata($data);
        $data.service = dynamicMetadata.service;
        $data.initService = dynamicMetadata.initService;
    };
    DynamicMetadata.getParam = function (paramValue, params) {
        switch (typeof paramValue) {
            case 'object':
                if (typeof paramValue.success === 'function' || typeof paramValue.error === 'function') {
                    params.callback = paramValue;
                }
                else {
                    params.config = paramValue;
                }
                break;
            case 'function':
                params.callback = paramValue;
                break;
            default:
                break;
        }
    };
    return DynamicMetadata;
}());
exports.DynamicMetadata = DynamicMetadata;

},{"./metadataHandler":4,"extend":6,"jaydata-error-handler":7,"jaydata-promise-handler":8}],6:[function(_dereq_,module,exports){
'use strict';

var hasOwn = Object.prototype.hasOwnProperty;
var toStr = Object.prototype.toString;

var isArray = function isArray(arr) {
	if (typeof Array.isArray === 'function') {
		return Array.isArray(arr);
	}

	return toStr.call(arr) === '[object Array]';
};

var isPlainObject = function isPlainObject(obj) {
	if (!obj || toStr.call(obj) !== '[object Object]') {
		return false;
	}

	var hasOwnConstructor = hasOwn.call(obj, 'constructor');
	var hasIsPrototypeOf = obj.constructor && obj.constructor.prototype && hasOwn.call(obj.constructor.prototype, 'isPrototypeOf');
	// Not own constructor property must be Object
	if (obj.constructor && !hasOwnConstructor && !hasIsPrototypeOf) {
		return false;
	}

	// Own properties are enumerated firstly, so to speed up,
	// if last one is own, then all properties are own.
	var key;
	for (key in obj) {/**/}

	return typeof key === 'undefined' || hasOwn.call(obj, key);
};

module.exports = function extend() {
	var options, name, src, copy, copyIsArray, clone,
		target = arguments[0],
		i = 1,
		length = arguments.length,
		deep = false;

	// Handle a deep copy situation
	if (typeof target === 'boolean') {
		deep = target;
		target = arguments[1] || {};
		// skip the boolean and the target
		i = 2;
	} else if ((typeof target !== 'object' && typeof target !== 'function') || target == null) {
		target = {};
	}

	for (; i < length; ++i) {
		options = arguments[i];
		// Only deal with non-null/undefined values
		if (options != null) {
			// Extend the base object
			for (name in options) {
				src = target[name];
				copy = options[name];

				// Prevent never-ending loop
				if (target !== copy) {
					// Recurse if we're merging plain objects or arrays
					if (deep && copy && (isPlainObject(copy) || (copyIsArray = isArray(copy)))) {
						if (copyIsArray) {
							copyIsArray = false;
							clone = src && isArray(src) ? src : [];
						} else {
							clone = src && isPlainObject(src) ? src : {};
						}

						// Never move original objects, clone them
						target[name] = extend(deep, clone, copy);

					// Don't bring in undefined values
					} else if (typeof copy !== 'undefined') {
						target[name] = copy;
					}
				}
			}
		}
	}

	// Return the modified object
	return target;
};


},{}],7:[function(_dereq_,module,exports){
"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var Exception = (function (_super) {
    __extends(Exception, _super);
    function Exception(message, name, data) {
        _super.call(this);
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, this.constructor);
        }
        this.name = name || "Exception";
        this.message = message;
        this.data = data;
    }
    Exception.prototype._getStackTrace = function () { };
    return Exception;
}(Error));
exports.Exception = Exception;
var Guard = (function () {
    function Guard() {
    }
    Guard.requireValue = function (name, value) {
        if (typeof value === 'undefined' || value === null) {
            Guard.raise(name + " requires a value other than undefined or null");
        }
    };
    Guard.requireType = function (name, value, typeOrTypes) {
        var types = typeOrTypes instanceof Array ? typeOrTypes : [typeOrTypes];
        return types.some(function (item) {
            switch (typeof item) {
                case "string":
                    return typeof value === item;
                case "function":
                    return value instanceof item;
                default:
                    Guard.raise("Unknown type format : " + typeof item + " for: " + name);
            }
        });
    };
    Guard.raise = function (exception) {
        if (typeof exports.intellisense === 'undefined') {
            if (exception instanceof Exception) {
                console.error(exception.name + ':', exception.message + '\n', exception);
            }
            else {
                console.error(exception);
            }
            throw exception;
        }
    };
    Guard.isNullOrUndefined = function (value) {
        return value === undefined || value === null;
    };
    return Guard;
}());
exports.Guard = Guard;

},{}],8:[function(_dereq_,module,exports){
"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
/// <reference path="../typings/tsd.d.ts"/>
var extend = _dereq_('extend');
var promiseHandlerBase_1 = _dereq_('./promiseHandlerBase');
var PromiseHandler = (function (_super) {
    __extends(PromiseHandler, _super);
    function PromiseHandler() {
        _super.call(this);
        var self = this;
        var promise = new Promise(function (resolve, reject) {
            self.resolve = resolve;
            self.reject = reject;
        });
        this.deferred = {
            resolve: function () { self.resolve.apply(promise, arguments); },
            reject: function () { self.reject.apply(promise, arguments); },
            promise: promise
        };
    }
    PromiseHandler.prototype.createCallback = function (callback) {
        var settings = promiseHandlerBase_1.PromiseHandlerBase.createCallbackSettings(callback);
        var self = this;
        var result = new promiseHandlerBase_1.CallbackSettings();
        result = extend(result, {
            success: function () {
                settings.success.apply(self.deferred, arguments);
                self.resolve.apply(self.deferred, arguments);
            },
            error: function () {
                Array.prototype.push.call(arguments, self.deferred);
                settings.error.apply(self.deferred, arguments);
            },
            notify: function () {
                settings.notify.apply(self.deferred, arguments);
            }
        });
        return result;
    };
    PromiseHandler.prototype.getPromise = function () {
        return this.deferred.promise;
    };
    PromiseHandler.compatibilityMode = function () {
        Promise.prototype['fail'] = function (onReject) {
            return this.then(null, function (reason) {
                onReject(reason);
                throw reason;
            });
        };
        Promise.prototype['always'] = function (onResolveOrReject) {
            return this.then(onResolveOrReject, function (reason) {
                onResolveOrReject(reason);
                throw reason;
            });
        };
    };
    PromiseHandler.use = function ($data) {
        $data.PromiseHandler = typeof Promise == 'function' ? PromiseHandler : promiseHandlerBase_1.PromiseHandlerBase;
        $data.PromiseHandlerBase = promiseHandlerBase_1.PromiseHandlerBase;
        $data.Promise = promiseHandlerBase_1.PromiseNotImplemented;
    };
    return PromiseHandler;
}(promiseHandlerBase_1.PromiseHandlerBase));
exports.PromiseHandler = PromiseHandler;

},{"./promiseHandlerBase":9,"extend":10}],9:[function(_dereq_,module,exports){
"use strict";
/// <reference path="../typings/tsd.d.ts"/>
var extend = _dereq_('extend');
var jaydata_error_handler_1 = _dereq_('jaydata-error-handler');
var CallbackSettings = (function () {
    function CallbackSettings() {
    }
    return CallbackSettings;
}());
exports.CallbackSettings = CallbackSettings;
var PromiseNotImplemented = (function () {
    function PromiseNotImplemented() {
    }
    PromiseNotImplemented.prototype.always = function () { jaydata_error_handler_1.Guard.raise(new jaydata_error_handler_1.Exception('$data.Promise.always', 'Not implemented!')); };
    PromiseNotImplemented.prototype.done = function () { jaydata_error_handler_1.Guard.raise(new jaydata_error_handler_1.Exception('$data.Promise.done', 'Not implemented!')); };
    PromiseNotImplemented.prototype.fail = function () { jaydata_error_handler_1.Guard.raise(new jaydata_error_handler_1.Exception('$data.Promise.fail', 'Not implemented!')); };
    PromiseNotImplemented.prototype.isRejected = function () { jaydata_error_handler_1.Guard.raise(new jaydata_error_handler_1.Exception('$data.Promise.isRejected', 'Not implemented!')); };
    PromiseNotImplemented.prototype.isResolved = function () { jaydata_error_handler_1.Guard.raise(new jaydata_error_handler_1.Exception('$data.Promise.isResolved', 'Not implemented!')); };
    //notify() { Guard.raise(new Exception('$data.Promise.notify', 'Not implemented!')); }
    //notifyWith() { Guard.raise(new Exception('$data.Promise.notifyWith', 'Not implemented!')); }
    PromiseNotImplemented.prototype.pipe = function () { jaydata_error_handler_1.Guard.raise(new jaydata_error_handler_1.Exception('$data.Promise.pipe', 'Not implemented!')); };
    PromiseNotImplemented.prototype.progress = function () { jaydata_error_handler_1.Guard.raise(new jaydata_error_handler_1.Exception('$data.Promise.progress', 'Not implemented!')); };
    PromiseNotImplemented.prototype.promise = function () { jaydata_error_handler_1.Guard.raise(new jaydata_error_handler_1.Exception('$data.Promise.promise', 'Not implemented!')); };
    //reject() { Guard.raise(new Exception('$data.Promise.reject', 'Not implemented!')); }
    //rejectWith() { Guard.raise(new Exception('$data.Promise.rejectWith', 'Not implemented!')); }
    //resolve() { Guard.raise(new Exception('$data.Promise.resolve', 'Not implemented!')); }
    //resolveWith() { Guard.raise(new Exception('$data.Promise.resolveWith', 'Not implemented!')); }
    PromiseNotImplemented.prototype.state = function () { jaydata_error_handler_1.Guard.raise(new jaydata_error_handler_1.Exception('$data.Promise.state', 'Not implemented!')); };
    PromiseNotImplemented.prototype.then = function () { jaydata_error_handler_1.Guard.raise(new jaydata_error_handler_1.Exception('$data.Promise.then', 'Not implemented!')); };
    return PromiseNotImplemented;
}());
exports.PromiseNotImplemented = PromiseNotImplemented;
var PromiseHandlerBase = (function () {
    function PromiseHandlerBase() {
    }
    PromiseHandlerBase.defaultSuccessCallback = function () { };
    PromiseHandlerBase.defaultNotifyCallback = function () { };
    PromiseHandlerBase.defaultErrorCallback = function () {
        if (arguments.length > 0 && arguments[arguments.length - 1] && typeof arguments[arguments.length - 1].reject === 'function') {
            (console.error || console.log).call(console, arguments[0]);
            arguments[arguments.length - 1].reject.apply(arguments[arguments.length - 1], arguments);
        }
        else {
            if (arguments[0] instanceof Error) {
                console.error(arguments[0]);
            }
            else {
                console.error("DefaultError:", "DEFAULT ERROR CALLBACK!", arguments);
            }
        }
    };
    PromiseHandlerBase.createCallbackSettings = function (callback, defaultSettings) {
        var settings = defaultSettings || {
            success: PromiseHandlerBase.defaultSuccessCallback,
            error: PromiseHandlerBase.defaultErrorCallback,
            notify: PromiseHandlerBase.defaultNotifyCallback
        };
        var result = new CallbackSettings();
        if (callback == null || callback == undefined) {
            result = settings;
        }
        else if (typeof callback == 'function') {
            result = extend(settings, {
                success: callback
            });
        }
        else {
            result = extend(settings, callback);
        }
        var wrapCode = function (fn) {
            var t = this;
            function r() {
                fn.apply(t, arguments);
                fn = function () { };
            }
            return r;
        };
        if (typeof result.error === 'function')
            result.error = wrapCode(result.error);
        return result;
    };
    PromiseHandlerBase.prototype.createCallback = function (callback) {
        return PromiseHandlerBase.createCallbackSettings(callback);
    };
    PromiseHandlerBase.prototype.getPromise = function () {
        return new PromiseNotImplemented();
    };
    return PromiseHandlerBase;
}());
exports.PromiseHandlerBase = PromiseHandlerBase;

},{"extend":10,"jaydata-error-handler":11}],10:[function(_dereq_,module,exports){
arguments[4][6][0].apply(exports,arguments)
},{"dup":6}],11:[function(_dereq_,module,exports){
arguments[4][7][0].apply(exports,arguments)
},{"dup":7}],12:[function(_dereq_,module,exports){
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var metacode = _dereq_('./metacode');
var Edm;
(function (Edm) {
    var PrimitiveType = (function () {
        function PrimitiveType(className) {
            this.className = className;
        }
        PrimitiveType.prototype.toString = function () { return this.className; };
        return PrimitiveType;
    })();
    Edm.PrimitiveType = PrimitiveType;
    Edm.Binary = new PrimitiveType('Edm.Binary');
    Edm.Boolean = new PrimitiveType('Edm.Boolean');
    Edm.Byte = new PrimitiveType('Edm.Byte');
    Edm.Date = new PrimitiveType('Edm.Date');
    Edm.DateTimeOffset = new PrimitiveType('Edm.DateTimeOffset');
    Edm.Decimal = new PrimitiveType('Edm.Decimal');
    Edm.Double = new PrimitiveType('Edm.Double');
    Edm.Duration = new PrimitiveType('Edm.Duration');
    Edm.Guid = new PrimitiveType('Edm.Guid');
    Edm.Int16 = new PrimitiveType('Edm.Int16');
    Edm.Int32 = new PrimitiveType('Edm.Int32');
    Edm.Int64 = new PrimitiveType('Edm.Int64');
    Edm.SByte = new PrimitiveType('Edm.SByte');
    Edm.Single = new PrimitiveType('Edm.Single');
    Edm.Stream = new PrimitiveType('Edm.Stream');
    Edm.String = new PrimitiveType('Edm.String');
    Edm.TimeOfDay = new PrimitiveType('Edm.TimeOfDay');
    Edm.Geography = new PrimitiveType('Edm.Geography');
    Edm.GeographyPoint = new PrimitiveType('Edm.GeographyPoint');
    Edm.GeographyLineString = new PrimitiveType('Edm.GeographyLineString');
    Edm.GeographyPolygon = new PrimitiveType('Edm.GeographyPolygon');
    Edm.GeographyMultiPoint = new PrimitiveType('Edm.GeographyMultiPoint');
    Edm.GeographyMultiLineString = new PrimitiveType('Edm.GeographyMultiLineString');
    Edm.GeographyMultiPolygon = new PrimitiveType('Edm.GeographyMultiPolygon');
    Edm.GeographyCollection = new PrimitiveType('Edm.GeographyCollection');
    Edm.Geometry = new PrimitiveType('Edm.Geometry');
    Edm.GeometryPoint = new PrimitiveType('Edm.GeometryPoint');
    Edm.GeometryLineString = new PrimitiveType('Edm.GeometryLineString');
    Edm.GeometryPolygon = new PrimitiveType('Edm.GeometryPolygon');
    Edm.GeometryMultiPoint = new PrimitiveType('Edm.GeometryMultiPoint');
    Edm.GeometryMultiLineString = new PrimitiveType('Edm.GeometryMultiLineString');
    Edm.GeometryMultiPolygon = new PrimitiveType('Edm.GeometryMultiPolygon');
    Edm.GeometryCollection = new PrimitiveType('Edm.GeometryCollection');
    var MemberAttribute = metacode.MemberAttribute;
    var parse = metacode.parse;
    var required = metacode.required;
    var defaultValue = metacode.defaultValue;
    var parseAs = metacode.parseAs;
    var AttributeFunctionChain = metacode.AttributeFunctionChain;
    var mapArray = function (sourceField, factory) { return new metacode.AttributeFunctionChain(function (d, i) { return d[sourceField]; }, function (props, i) { return Array.isArray(props) ? props : (props ? [props] : []); }, function (props, i) { return props.map(function (prop) { return factory(prop, i); }); }); };
    var EdmItemBase = (function () {
        function EdmItemBase(definition, parent) {
            this.parent = parent;
            definition && this.loadFrom(definition);
        }
        EdmItemBase.prototype.loadFrom = function (definition) {
            var _this = this;
            var proto = Object.getPrototypeOf(this);
            MemberAttribute.getMembers(proto).forEach(function (membername) {
                var parser = MemberAttribute.getAttributeValue(proto, membername, "serialize");
                var v = parser.invoke(definition, _this);
                _this[membername] = v;
            });
        };
        return EdmItemBase;
    })();
    Edm.EdmItemBase = EdmItemBase;
    var Property = (function (_super) {
        __extends(Property, _super);
        function Property() {
            _super.apply(this, arguments);
        }
        __decorate([
            parse,
            required, 
            __metadata('design:type', String)
        ], Property.prototype, "name", void 0);
        __decorate([
            parse,
            required, 
            __metadata('design:type', String)
        ], Property.prototype, "type", void 0);
        __decorate([
            parse,
            defaultValue(true), 
            __metadata('design:type', Boolean)
        ], Property.prototype, "nullable", void 0);
        __decorate([
            parse, 
            __metadata('design:type', Number)
        ], Property.prototype, "maxLength", void 0);
        __decorate([
            parse, 
            __metadata('design:type', Number)
        ], Property.prototype, "precision", void 0);
        __decorate([
            parse, 
            __metadata('design:type', Number)
        ], Property.prototype, "scale", void 0);
        __decorate([
            parse, 
            __metadata('design:type', Boolean)
        ], Property.prototype, "unicode", void 0);
        __decorate([
            parse,
            defaultValue(0), 
            __metadata('design:type', Number)
        ], Property.prototype, "SRID", void 0);
        __decorate([
            parse, 
            __metadata('design:type', Object)
        ], Property.prototype, "defaultValue", void 0);
        __decorate([
            parse, 
            __metadata('design:type', Object)
        ], Property.prototype, "concurrencyMode", void 0);
        return Property;
    })(EdmItemBase);
    Edm.Property = Property;
    var NavigationProperty = (function (_super) {
        __extends(NavigationProperty, _super);
        function NavigationProperty() {
            _super.apply(this, arguments);
        }
        __decorate([
            parse,
            required, 
            __metadata('design:type', String)
        ], NavigationProperty.prototype, "name", void 0);
        __decorate([
            parse,
            required, 
            __metadata('design:type', String)
        ], NavigationProperty.prototype, "type", void 0);
        __decorate([
            parse,
            defaultValue(true), 
            __metadata('design:type', Boolean)
        ], NavigationProperty.prototype, "nullable", void 0);
        __decorate([
            parse, 
            __metadata('design:type', String)
        ], NavigationProperty.prototype, "partner", void 0);
        __decorate([
            parse, 
            __metadata('design:type', Boolean)
        ], NavigationProperty.prototype, "containsTarget", void 0);
        __decorate([
            parseAs(mapArray("referentialConstraint", function (prop, i) { return new ReferentialConstraint(prop, i); })), 
            __metadata('design:type', Array)
        ], NavigationProperty.prototype, "referentialConstraints", void 0);
        return NavigationProperty;
    })(EdmItemBase);
    Edm.NavigationProperty = NavigationProperty;
    var ReferentialConstraint = (function (_super) {
        __extends(ReferentialConstraint, _super);
        function ReferentialConstraint() {
            _super.apply(this, arguments);
        }
        __decorate([
            parse,
            required, 
            __metadata('design:type', String)
        ], ReferentialConstraint.prototype, "property", void 0);
        __decorate([
            parse,
            required, 
            __metadata('design:type', String)
        ], ReferentialConstraint.prototype, "referencedProperty", void 0);
        return ReferentialConstraint;
    })(EdmItemBase);
    Edm.ReferentialConstraint = ReferentialConstraint;
    var PropertyRef = (function (_super) {
        __extends(PropertyRef, _super);
        function PropertyRef() {
            _super.apply(this, arguments);
        }
        __decorate([
            parse,
            required, 
            __metadata('design:type', String)
        ], PropertyRef.prototype, "name", void 0);
        __decorate([
            parse, 
            __metadata('design:type', String)
        ], PropertyRef.prototype, "alias", void 0);
        return PropertyRef;
    })(EdmItemBase);
    Edm.PropertyRef = PropertyRef;
    var Key = (function (_super) {
        __extends(Key, _super);
        function Key() {
            _super.apply(this, arguments);
        }
        __decorate([
            parseAs(mapArray("propertyRef", function (prop, i) { return new PropertyRef(prop, i); })), 
            __metadata('design:type', Array)
        ], Key.prototype, "propertyRefs", void 0);
        return Key;
    })(EdmItemBase);
    Edm.Key = Key;
    var EntityType = (function (_super) {
        __extends(EntityType, _super);
        function EntityType() {
            _super.apply(this, arguments);
        }
        __decorate([
            parse,
            required, 
            __metadata('design:type', String)
        ], EntityType.prototype, "name", void 0);
        __decorate([
            parseAs(new AttributeFunctionChain(function (d, i) { return d.key; }, function (props, i) { return props || []; }, function (props, i) { return props.map(function (prop) { return new Key(prop, i); }); }, function (props) { return props[0]; })), 
            __metadata('design:type', Key)
        ], EntityType.prototype, "key", void 0);
        __decorate([
            parse, 
            __metadata('design:type', String)
        ], EntityType.prototype, "baseType", void 0);
        __decorate([
            parse, 
            __metadata('design:type', Boolean)
        ], EntityType.prototype, "abstract", void 0);
        __decorate([
            parse, 
            __metadata('design:type', Boolean)
        ], EntityType.prototype, "openType", void 0);
        __decorate([
            parse, 
            __metadata('design:type', Boolean)
        ], EntityType.prototype, "hasStream", void 0);
        __decorate([
            parseAs(mapArray("property", function (prop, i) { return new Property(prop, i); })), 
            __metadata('design:type', Array)
        ], EntityType.prototype, "properties", void 0);
        __decorate([
            parseAs(mapArray("navigationProperty", function (prop, i) { return new NavigationProperty(prop, i); })), 
            __metadata('design:type', Array)
        ], EntityType.prototype, "navigationProperties", void 0);
        return EntityType;
    })(EdmItemBase);
    Edm.EntityType = EntityType;
    var ComplexType = (function (_super) {
        __extends(ComplexType, _super);
        function ComplexType() {
            _super.apply(this, arguments);
        }
        __decorate([
            parse,
            required, 
            __metadata('design:type', String)
        ], ComplexType.prototype, "name", void 0);
        __decorate([
            parse, 
            __metadata('design:type', String)
        ], ComplexType.prototype, "baseType", void 0);
        __decorate([
            parse, 
            __metadata('design:type', Boolean)
        ], ComplexType.prototype, "abstract", void 0);
        __decorate([
            parse, 
            __metadata('design:type', Boolean)
        ], ComplexType.prototype, "openType", void 0);
        __decorate([
            parse, 
            __metadata('design:type', Boolean)
        ], ComplexType.prototype, "hasStream", void 0);
        __decorate([
            parseAs(mapArray("property", function (prop, i) { return new Property(prop, i); })), 
            __metadata('design:type', Array)
        ], ComplexType.prototype, "properties", void 0);
        __decorate([
            parseAs(mapArray("navigationProperty", function (prop, i) { return new NavigationProperty(prop, i); })), 
            __metadata('design:type', Array)
        ], ComplexType.prototype, "navigationProperties", void 0);
        return ComplexType;
    })(EdmItemBase);
    Edm.ComplexType = ComplexType;
    var Parameter = (function (_super) {
        __extends(Parameter, _super);
        function Parameter() {
            _super.apply(this, arguments);
        }
        __decorate([
            parse,
            required, 
            __metadata('design:type', String)
        ], Parameter.prototype, "name", void 0);
        __decorate([
            parse,
            required, 
            __metadata('design:type', String)
        ], Parameter.prototype, "type", void 0);
        __decorate([
            parse,
            defaultValue(true), 
            __metadata('design:type', Boolean)
        ], Parameter.prototype, "nullable", void 0);
        __decorate([
            parse, 
            __metadata('design:type', Number)
        ], Parameter.prototype, "maxLength", void 0);
        __decorate([
            parse, 
            __metadata('design:type', Number)
        ], Parameter.prototype, "precision", void 0);
        __decorate([
            parse, 
            __metadata('design:type', Number)
        ], Parameter.prototype, "scale", void 0);
        __decorate([
            parse, 
            __metadata('design:type', Boolean)
        ], Parameter.prototype, "unicode", void 0);
        __decorate([
            parse,
            defaultValue(0), 
            __metadata('design:type', Number)
        ], Parameter.prototype, "SRID", void 0);
        return Parameter;
    })(EdmItemBase);
    Edm.Parameter = Parameter;
    var ReturnType = (function (_super) {
        __extends(ReturnType, _super);
        function ReturnType() {
            _super.apply(this, arguments);
        }
        __decorate([
            parse, 
            __metadata('design:type', String)
        ], ReturnType.prototype, "type", void 0);
        __decorate([
            parse,
            defaultValue(true), 
            __metadata('design:type', Boolean)
        ], ReturnType.prototype, "nullable", void 0);
        return ReturnType;
    })(EdmItemBase);
    Edm.ReturnType = ReturnType;
    var Invokable = (function (_super) {
        __extends(Invokable, _super);
        function Invokable() {
            _super.apply(this, arguments);
        }
        return Invokable;
    })(EdmItemBase);
    Edm.Invokable = Invokable;
    var Action = (function (_super) {
        __extends(Action, _super);
        function Action() {
            _super.apply(this, arguments);
        }
        __decorate([
            parse,
            required, 
            __metadata('design:type', String)
        ], Action.prototype, "name", void 0);
        __decorate([
            parse, 
            __metadata('design:type', Boolean)
        ], Action.prototype, "isBound", void 0);
        __decorate([
            parse, 
            __metadata('design:type', String)
        ], Action.prototype, "entitySetPath", void 0);
        __decorate([
            parseAs(mapArray("parameter", function (prop, i) { return new Parameter(prop, i); })), 
            __metadata('design:type', Array)
        ], Action.prototype, "parameters", void 0);
        __decorate([
            parseAs(new AttributeFunctionChain(function (d, i) { return d.returnType; }, function (rt, i) { return new ReturnType(rt, i); })), 
            __metadata('design:type', ReturnType)
        ], Action.prototype, "returnType", void 0);
        return Action;
    })(Invokable);
    Edm.Action = Action;
    var Function = (function (_super) {
        __extends(Function, _super);
        function Function() {
            _super.apply(this, arguments);
        }
        __decorate([
            parse,
            required, 
            __metadata('design:type', String)
        ], Function.prototype, "name", void 0);
        __decorate([
            parse, 
            __metadata('design:type', Boolean)
        ], Function.prototype, "isBound", void 0);
        __decorate([
            parse, 
            __metadata('design:type', String)
        ], Function.prototype, "entitySetPath", void 0);
        __decorate([
            parseAs(mapArray("parameter", function (prop, i) { return new Parameter(prop, i); })), 
            __metadata('design:type', Array)
        ], Function.prototype, "parameters", void 0);
        __decorate([
            parseAs(new AttributeFunctionChain(function (d, i) { return d.returnType; }, function (rt, i) { return new ReturnType(rt, i); })), 
            __metadata('design:type', ReturnType)
        ], Function.prototype, "returnType", void 0);
        __decorate([
            parse, 
            __metadata('design:type', Boolean)
        ], Function.prototype, "isComposable", void 0);
        return Function;
    })(Invokable);
    Edm.Function = Function;
    var Member = (function (_super) {
        __extends(Member, _super);
        function Member() {
            _super.apply(this, arguments);
        }
        __decorate([
            parse,
            required, 
            __metadata('design:type', String)
        ], Member.prototype, "name", void 0);
        __decorate([
            parse, 
            __metadata('design:type', Number)
        ], Member.prototype, "value", void 0);
        return Member;
    })(EdmItemBase);
    Edm.Member = Member;
    var EnumType = (function (_super) {
        __extends(EnumType, _super);
        function EnumType() {
            _super.apply(this, arguments);
        }
        __decorate([
            parse,
            required, 
            __metadata('design:type', String)
        ], EnumType.prototype, "name", void 0);
        __decorate([
            parse,
            required, 
            __metadata('design:type', String)
        ], EnumType.prototype, "namespace", void 0);
        __decorate([
            parse,
            defaultValue(Edm.Int32), 
            __metadata('design:type', PrimitiveType)
        ], EnumType.prototype, "underlyingType", void 0);
        __decorate([
            parse, 
            __metadata('design:type', Boolean)
        ], EnumType.prototype, "isFlags", void 0);
        __decorate([
            parseAs(mapArray("member", function (prop, i) { return new Member(prop, i); })), 
            __metadata('design:type', Array)
        ], EnumType.prototype, "members", void 0);
        return EnumType;
    })(EdmItemBase);
    Edm.EnumType = EnumType;
    var EntitySet = (function (_super) {
        __extends(EntitySet, _super);
        function EntitySet() {
            _super.apply(this, arguments);
        }
        __decorate([
            parse,
            required, 
            __metadata('design:type', String)
        ], EntitySet.prototype, "name", void 0);
        __decorate([
            parse,
            required, 
            __metadata('design:type', String)
        ], EntitySet.prototype, "entityType", void 0);
        return EntitySet;
    })(EdmItemBase);
    Edm.EntitySet = EntitySet;
    var ActionImport = (function (_super) {
        __extends(ActionImport, _super);
        function ActionImport() {
            _super.apply(this, arguments);
        }
        __decorate([
            parse,
            required, 
            __metadata('design:type', String)
        ], ActionImport.prototype, "name", void 0);
        __decorate([
            parse,
            required, 
            __metadata('design:type', String)
        ], ActionImport.prototype, "action", void 0);
        return ActionImport;
    })(EdmItemBase);
    Edm.ActionImport = ActionImport;
    var FunctionImport = (function (_super) {
        __extends(FunctionImport, _super);
        function FunctionImport() {
            _super.apply(this, arguments);
        }
        __decorate([
            parse,
            required, 
            __metadata('design:type', String)
        ], FunctionImport.prototype, "name", void 0);
        __decorate([
            parse,
            required, 
            __metadata('design:type', String)
        ], FunctionImport.prototype, "function", void 0);
        __decorate([
            parse,
            defaultValue(false), 
            __metadata('design:type', Boolean)
        ], FunctionImport.prototype, "includeInServiceDocument", void 0);
        return FunctionImport;
    })(EdmItemBase);
    Edm.FunctionImport = FunctionImport;
    var EntityContainer = (function (_super) {
        __extends(EntityContainer, _super);
        function EntityContainer() {
            _super.apply(this, arguments);
        }
        __decorate([
            parse, 
            __metadata('design:type', String)
        ], EntityContainer.prototype, "name", void 0);
        __decorate([
            parseAs(mapArray("entitySet", function (prop, i) { return new EntitySet(prop, i); })), 
            __metadata('design:type', Array)
        ], EntityContainer.prototype, "entitySets", void 0);
        __decorate([
            parseAs(mapArray("actionImport", function (prop, i) { return new ActionImport(prop, i); })), 
            __metadata('design:type', Array)
        ], EntityContainer.prototype, "actionImports", void 0);
        __decorate([
            parseAs(mapArray("functionImport", function (prop, i) { return new FunctionImport(prop, i); })), 
            __metadata('design:type', Array)
        ], EntityContainer.prototype, "functionImports", void 0);
        return EntityContainer;
    })(EdmItemBase);
    Edm.EntityContainer = EntityContainer;
    var Schema = (function (_super) {
        __extends(Schema, _super);
        function Schema() {
            _super.apply(this, arguments);
        }
        __decorate([
            parse,
            required, 
            __metadata('design:type', String)
        ], Schema.prototype, "namespace", void 0);
        __decorate([
            parse, 
            __metadata('design:type', String)
        ], Schema.prototype, "alias", void 0);
        __decorate([
            parseAs(mapArray("enumType", function (prop, i) { return new EnumType(prop, i); })), 
            __metadata('design:type', Array)
        ], Schema.prototype, "enumTypes", void 0);
        __decorate([
            parseAs(mapArray("complexType", function (prop, i) { return new ComplexType(prop, i); })), 
            __metadata('design:type', Array)
        ], Schema.prototype, "complexTypes", void 0);
        __decorate([
            parseAs(mapArray("entityType", function (prop, i) { return new EntityType(prop, i); })), 
            __metadata('design:type', Array)
        ], Schema.prototype, "entityTypes", void 0);
        __decorate([
            parseAs(mapArray("action", function (prop, i) { return new Action(prop, i); })), 
            __metadata('design:type', Array)
        ], Schema.prototype, "actions", void 0);
        __decorate([
            parseAs(mapArray("function", function (prop, i) { return new Edm.Function(prop, i); })), 
            __metadata('design:type', Array)
        ], Schema.prototype, "functions", void 0);
        __decorate([
            parseAs(mapArray("entityContainer", function (prop, i) { return new Edm.EntityContainer(prop, i); })), 
            __metadata('design:type', Array)
        ], Schema.prototype, "entityContainer", void 0);
        return Schema;
    })(EdmItemBase);
    Edm.Schema = Schema;
    var DataServices = (function (_super) {
        __extends(DataServices, _super);
        function DataServices() {
            _super.apply(this, arguments);
        }
        __decorate([
            parseAs(mapArray("schema", function (prop, i) { return new Schema(prop, i); })), 
            __metadata('design:type', Array)
        ], DataServices.prototype, "schemas", void 0);
        return DataServices;
    })(EdmItemBase);
    Edm.DataServices = DataServices;
    var Edmx = (function (_super) {
        __extends(Edmx, _super);
        function Edmx() {
            _super.apply(this, arguments);
        }
        __decorate([
            parseAs(new AttributeFunctionChain(function (edm) { return new Edm.DataServices(edm.dataServices); })), 
            __metadata('design:type', Array)
        ], Edmx.prototype, "dataServices", void 0);
        return Edmx;
    })(EdmItemBase);
    Edm.Edmx = Edmx;
})(Edm = exports.Edm || (exports.Edm = {}));

},{"./metacode":13}],13:[function(_dereq_,module,exports){
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
/// <reference path="../node_modules/reflect-metadata/reflect-metadata.d.ts" />
_dereq_('reflect-metadata');
function isFunction(o) {
    return "function" === typeof o;
}
function isUndefined(o) {
    return o === undefined;
}
var MemberAttribute = (function () {
    function MemberAttribute(attributeName) {
        this.attributeName = attributeName;
    }
    MemberAttribute.prototype.registerMember = function (target, key) {
        var md = (Reflect.getMetadata("members", target) || []);
        if (md.indexOf(key) < 0) {
            md.push(key);
        }
        Reflect.defineMetadata("members", md, target);
    };
    MemberAttribute.prototype.getDecoratorValue = function (target, key, presentedValue) {
        return presentedValue;
    };
    MemberAttribute.prototype.decorate = function (value) {
        var _this = this;
        return function (target, key, descriptor) {
            _this.registerMember(target, key);
            var decoratorValue = _this.getDecoratorValue(target, key, value);
            //console.log("decorator runs",key, this.attributeName, decoratorValue, value)
            Reflect.defineMetadata(_this.attributeName, decoratorValue, target, key);
        };
    };
    Object.defineProperty(MemberAttribute.prototype, "decorator", {
        get: function () {
            return this.decorate();
        },
        enumerable: true,
        configurable: true
    });
    MemberAttribute.prototype.isApplied = function (instance, memberName) {
        return Reflect.getMetadataKeys(Object.getPrototypeOf(instance), memberName).indexOf(this.attributeName) > -1;
    };
    MemberAttribute.getMembers = function (target) {
        return Reflect.getMetadata("members", isFunction(target) ? target.prototype : target);
    };
    MemberAttribute.getAttributeNames = function (target, memberName) {
        return Reflect.getMetadataKeys(target, memberName);
    };
    MemberAttribute.getAttributeValue = function (target, memberName, attributeName) {
        return Reflect.getMetadata(attributeName, target, memberName);
    };
    return MemberAttribute;
})();
exports.MemberAttribute = MemberAttribute;
var AttributeFunctionChain = (function () {
    function AttributeFunctionChain() {
        var steps = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            steps[_i - 0] = arguments[_i];
        }
        this.steps = [];
        this.steps = steps;
    }
    AttributeFunctionChain.prototype.invoke = function (definition, instance) {
        var result = definition;
        this.steps.forEach(function (fn) {
            result = fn(result, instance);
        });
        return result;
    };
    return AttributeFunctionChain;
})();
exports.AttributeFunctionChain = AttributeFunctionChain;
var ParseAttribute = (function (_super) {
    __extends(ParseAttribute, _super);
    function ParseAttribute() {
        _super.call(this, "serialize");
    }
    ParseAttribute.prototype.getDecoratorValue = function (target, key, presentedValue) {
        if (!isUndefined(presentedValue)) {
            return presentedValue;
        }
        return new AttributeFunctionChain(function (d) { return d[key]; });
    };
    return ParseAttribute;
})(MemberAttribute);
exports.ParseAttribute = ParseAttribute;
exports.required = new MemberAttribute("required").decorate(true);
exports.defaultValueAttribute = new MemberAttribute("defaultValue");
exports.defaultValue = exports.defaultValueAttribute.decorate.bind(exports.defaultValueAttribute);
exports.parseAttribute = new ParseAttribute();
exports.parse = exports.parseAttribute.decorator;
exports.parseAs = exports.parseAttribute.decorate.bind(exports.parseAttribute);
exports.typeArgument = new MemberAttribute("typeArgument");

},{"reflect-metadata":15}],14:[function(_dereq_,module,exports){
// shim for using process in browser

var process = module.exports = {};
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = setTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    clearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        setTimeout(drainQueue, 0);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],15:[function(_dereq_,module,exports){
(function (global){
/*! *****************************************************************************
Copyright (C) Microsoft. All rights reserved.
Licensed under the Apache License, Version 2.0 (the "License"); you may not use
this file except in compliance with the License. You may obtain a copy of the
License at http://www.apache.org/licenses/LICENSE-2.0

THIS CODE IS PROVIDED ON AN *AS IS* BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
KIND, EITHER EXPRESS OR IMPLIED, INCLUDING WITHOUT LIMITATION ANY IMPLIED
WARRANTIES OR CONDITIONS OF TITLE, FITNESS FOR A PARTICULAR PURPOSE,
MERCHANTABLITY OR NON-INFRINGEMENT.

See the Apache Version 2.0 License for specific language governing permissions
and limitations under the License.
***************************************************************************** */
var Reflect;
(function (Reflect) {
    "use strict";
    // Load global or shim versions of Map, Set, and WeakMap
    var functionPrototype = Object.getPrototypeOf(Function);
    var _Map = typeof Map === "function" ? Map : CreateMapPolyfill();
    var _Set = typeof Set === "function" ? Set : CreateSetPolyfill();
    var _WeakMap = typeof WeakMap === "function" ? WeakMap : CreateWeakMapPolyfill();
    // [[Metadata]] internal slot
    var __Metadata__ = new _WeakMap();
    /**
      * Applies a set of decorators to a property of a target object.
      * @param decorators An array of decorators.
      * @param target The target object.
      * @param targetKey (Optional) The property key to decorate.
      * @param targetDescriptor (Optional) The property descriptor for the target key
      * @remarks Decorators are applied in reverse order.
      * @example
      *
      *     class C {
      *         // property declarations are not part of ES6, though they are valid in TypeScript:
      *         // static staticProperty;
      *         // property;
      *
      *         constructor(p) { }
      *         static staticMethod(p) { }
      *         method(p) { }
      *     }
      *
      *     // constructor
      *     C = Reflect.decorate(decoratorsArray, C);
      *
      *     // property (on constructor)
      *     Reflect.decorate(decoratorsArray, C, "staticProperty");
      *
      *     // property (on prototype)
      *     Reflect.decorate(decoratorsArray, C.prototype, "property");
      *
      *     // method (on constructor)
      *     Object.defineProperty(C, "staticMethod",
      *         Reflect.decorate(decoratorsArray, C, "staticMethod",
      *             Object.getOwnPropertyDescriptor(C, "staticMethod")));
      *
      *     // method (on prototype)
      *     Object.defineProperty(C.prototype, "method",
      *         Reflect.decorate(decoratorsArray, C.prototype, "method",
      *             Object.getOwnPropertyDescriptor(C.prototype, "method")));
      *
      */
    function decorate(decorators, target, targetKey, targetDescriptor) {
        if (!IsUndefined(targetDescriptor)) {
            if (!IsArray(decorators)) {
                throw new TypeError();
            }
            else if (!IsObject(target)) {
                throw new TypeError();
            }
            else if (IsUndefined(targetKey)) {
                throw new TypeError();
            }
            else if (!IsObject(targetDescriptor)) {
                throw new TypeError();
            }
            targetKey = ToPropertyKey(targetKey);
            return DecoratePropertyWithDescriptor(decorators, target, targetKey, targetDescriptor);
        }
        else if (!IsUndefined(targetKey)) {
            if (!IsArray(decorators)) {
                throw new TypeError();
            }
            else if (!IsObject(target)) {
                throw new TypeError();
            }
            targetKey = ToPropertyKey(targetKey);
            return DecoratePropertyWithoutDescriptor(decorators, target, targetKey);
        }
        else {
            if (!IsArray(decorators)) {
                throw new TypeError();
            }
            else if (!IsConstructor(target)) {
                throw new TypeError();
            }
            return DecorateConstructor(decorators, target);
        }
    }
    Reflect.decorate = decorate;
    /**
      * A default metadata decorator factory that can be used on a class, class member, or parameter.
      * @param metadataKey The key for the metadata entry.
      * @param metadataValue The value for the metadata entry.
      * @returns A decorator function.
      * @remarks
      * If `metadataKey` is already defined for the target and target key, the
      * metadataValue for that key will be overwritten.
      * @example
      *
      *     // constructor
      *     @Reflect.metadata(key, value)
      *     class C {
      *     }
      *
      *     // property (on constructor, TypeScript only)
      *     class C {
      *         @Reflect.metadata(key, value)
      *         static staticProperty;
      *     }
      *
      *     // property (on prototype, TypeScript only)
      *     class C {
      *         @Reflect.metadata(key, value)
      *         property;
      *     }
      *
      *     // method (on constructor)
      *     class C {
      *         @Reflect.metadata(key, value)
      *         static staticMethod() { }
      *     }
      *
      *     // method (on prototype)
      *     class C {
      *         @Reflect.metadata(key, value)
      *         method() { }
      *     }
      *
      */
    function metadata(metadataKey, metadataValue) {
        function decorator(target, targetKey) {
            if (!IsUndefined(targetKey)) {
                if (!IsObject(target)) {
                    throw new TypeError();
                }
                targetKey = ToPropertyKey(targetKey);
                OrdinaryDefineOwnMetadata(metadataKey, metadataValue, target, targetKey);
            }
            else {
                if (!IsConstructor(target)) {
                    throw new TypeError();
                }
                OrdinaryDefineOwnMetadata(metadataKey, metadataValue, target, /*targetKey*/ undefined);
            }
        }
        return decorator;
    }
    Reflect.metadata = metadata;
    /**
      * Define a unique metadata entry on the target.
      * @param metadataKey A key used to store and retrieve metadata.
      * @param metadataValue A value that contains attached metadata.
      * @param target The target object on which to define metadata.
      * @param targetKey (Optional) The property key for the target.
      * @example
      *
      *     class C {
      *         // property declarations are not part of ES6, though they are valid in TypeScript:
      *         // static staticProperty;
      *         // property;
      *
      *         constructor(p) { }
      *         static staticMethod(p) { }
      *         method(p) { }
      *     }
      *
      *     // constructor
      *     Reflect.defineMetadata("custom:annotation", options, C);
      *
      *     // property (on constructor)
      *     Reflect.defineMetadata("custom:annotation", options, C, "staticProperty");
      *
      *     // property (on prototype)
      *     Reflect.defineMetadata("custom:annotation", options, C.prototype, "property");
      *
      *     // method (on constructor)
      *     Reflect.defineMetadata("custom:annotation", options, C, "staticMethod");
      *
      *     // method (on prototype)
      *     Reflect.defineMetadata("custom:annotation", options, C.prototype, "method");
      *
      *     // decorator factory as metadata-producing annotation.
      *     function MyAnnotation(options): Decorator {
      *         return (target, key?) => Reflect.defineMetadata("custom:annotation", options, target, key);
      *     }
      *
      */
    function defineMetadata(metadataKey, metadataValue, target, targetKey) {
        if (!IsObject(target)) {
            throw new TypeError();
        }
        else if (!IsUndefined(targetKey)) {
            targetKey = ToPropertyKey(targetKey);
        }
        return OrdinaryDefineOwnMetadata(metadataKey, metadataValue, target, targetKey);
    }
    Reflect.defineMetadata = defineMetadata;
    /**
      * Gets a value indicating whether the target object or its prototype chain has the provided metadata key defined.
      * @param metadataKey A key used to store and retrieve metadata.
      * @param target The target object on which the metadata is defined.
      * @param targetKey (Optional) The property key for the target.
      * @returns `true` if the metadata key was defined on the target object or its prototype chain; otherwise, `false`.
      * @example
      *
      *     class C {
      *         // property declarations are not part of ES6, though they are valid in TypeScript:
      *         // static staticProperty;
      *         // property;
      *
      *         constructor(p) { }
      *         static staticMethod(p) { }
      *         method(p) { }
      *     }
      *
      *     // constructor
      *     result = Reflect.hasMetadata("custom:annotation", C);
      *
      *     // property (on constructor)
      *     result = Reflect.hasMetadata("custom:annotation", C, "staticProperty");
      *
      *     // property (on prototype)
      *     result = Reflect.hasMetadata("custom:annotation", C.prototype, "property");
      *
      *     // method (on constructor)
      *     result = Reflect.hasMetadata("custom:annotation", C, "staticMethod");
      *
      *     // method (on prototype)
      *     result = Reflect.hasMetadata("custom:annotation", C.prototype, "method");
      *
      */
    function hasMetadata(metadataKey, target, targetKey) {
        if (!IsObject(target)) {
            throw new TypeError();
        }
        else if (!IsUndefined(targetKey)) {
            targetKey = ToPropertyKey(targetKey);
        }
        return OrdinaryHasMetadata(metadataKey, target, targetKey);
    }
    Reflect.hasMetadata = hasMetadata;
    /**
      * Gets a value indicating whether the target object has the provided metadata key defined.
      * @param metadataKey A key used to store and retrieve metadata.
      * @param target The target object on which the metadata is defined.
      * @param targetKey (Optional) The property key for the target.
      * @returns `true` if the metadata key was defined on the target object; otherwise, `false`.
      * @example
      *
      *     class C {
      *         // property declarations are not part of ES6, though they are valid in TypeScript:
      *         // static staticProperty;
      *         // property;
      *
      *         constructor(p) { }
      *         static staticMethod(p) { }
      *         method(p) { }
      *     }
      *
      *     // constructor
      *     result = Reflect.hasOwnMetadata("custom:annotation", C);
      *
      *     // property (on constructor)
      *     result = Reflect.hasOwnMetadata("custom:annotation", C, "staticProperty");
      *
      *     // property (on prototype)
      *     result = Reflect.hasOwnMetadata("custom:annotation", C.prototype, "property");
      *
      *     // method (on constructor)
      *     result = Reflect.hasOwnMetadata("custom:annotation", C, "staticMethod");
      *
      *     // method (on prototype)
      *     result = Reflect.hasOwnMetadata("custom:annotation", C.prototype, "method");
      *
      */
    function hasOwnMetadata(metadataKey, target, targetKey) {
        if (!IsObject(target)) {
            throw new TypeError();
        }
        else if (!IsUndefined(targetKey)) {
            targetKey = ToPropertyKey(targetKey);
        }
        return OrdinaryHasOwnMetadata(metadataKey, target, targetKey);
    }
    Reflect.hasOwnMetadata = hasOwnMetadata;
    /**
      * Gets the metadata value for the provided metadata key on the target object or its prototype chain.
      * @param metadataKey A key used to store and retrieve metadata.
      * @param target The target object on which the metadata is defined.
      * @param targetKey (Optional) The property key for the target.
      * @returns The metadata value for the metadata key if found; otherwise, `undefined`.
      * @example
      *
      *     class C {
      *         // property declarations are not part of ES6, though they are valid in TypeScript:
      *         // static staticProperty;
      *         // property;
      *
      *         constructor(p) { }
      *         static staticMethod(p) { }
      *         method(p) { }
      *     }
      *
      *     // constructor
      *     result = Reflect.getMetadata("custom:annotation", C);
      *
      *     // property (on constructor)
      *     result = Reflect.getMetadata("custom:annotation", C, "staticProperty");
      *
      *     // property (on prototype)
      *     result = Reflect.getMetadata("custom:annotation", C.prototype, "property");
      *
      *     // method (on constructor)
      *     result = Reflect.getMetadata("custom:annotation", C, "staticMethod");
      *
      *     // method (on prototype)
      *     result = Reflect.getMetadata("custom:annotation", C.prototype, "method");
      *
      */
    function getMetadata(metadataKey, target, targetKey) {
        if (!IsObject(target)) {
            throw new TypeError();
        }
        else if (!IsUndefined(targetKey)) {
            targetKey = ToPropertyKey(targetKey);
        }
        return OrdinaryGetMetadata(metadataKey, target, targetKey);
    }
    Reflect.getMetadata = getMetadata;
    /**
      * Gets the metadata value for the provided metadata key on the target object.
      * @param metadataKey A key used to store and retrieve metadata.
      * @param target The target object on which the metadata is defined.
      * @param targetKey (Optional) The property key for the target.
      * @returns The metadata value for the metadata key if found; otherwise, `undefined`.
      * @example
      *
      *     class C {
      *         // property declarations are not part of ES6, though they are valid in TypeScript:
      *         // static staticProperty;
      *         // property;
      *
      *         constructor(p) { }
      *         static staticMethod(p) { }
      *         method(p) { }
      *     }
      *
      *     // constructor
      *     result = Reflect.getOwnMetadata("custom:annotation", C);
      *
      *     // property (on constructor)
      *     result = Reflect.getOwnMetadata("custom:annotation", C, "staticProperty");
      *
      *     // property (on prototype)
      *     result = Reflect.getOwnMetadata("custom:annotation", C.prototype, "property");
      *
      *     // method (on constructor)
      *     result = Reflect.getOwnMetadata("custom:annotation", C, "staticMethod");
      *
      *     // method (on prototype)
      *     result = Reflect.getOwnMetadata("custom:annotation", C.prototype, "method");
      *
      */
    function getOwnMetadata(metadataKey, target, targetKey) {
        if (!IsObject(target)) {
            throw new TypeError();
        }
        else if (!IsUndefined(targetKey)) {
            targetKey = ToPropertyKey(targetKey);
        }
        return OrdinaryGetOwnMetadata(metadataKey, target, targetKey);
    }
    Reflect.getOwnMetadata = getOwnMetadata;
    /**
      * Gets the metadata keys defined on the target object or its prototype chain.
      * @param target The target object on which the metadata is defined.
      * @param targetKey (Optional) The property key for the target.
      * @returns An array of unique metadata keys.
      * @example
      *
      *     class C {
      *         // property declarations are not part of ES6, though they are valid in TypeScript:
      *         // static staticProperty;
      *         // property;
      *
      *         constructor(p) { }
      *         static staticMethod(p) { }
      *         method(p) { }
      *     }
      *
      *     // constructor
      *     result = Reflect.getMetadataKeys(C);
      *
      *     // property (on constructor)
      *     result = Reflect.getMetadataKeys(C, "staticProperty");
      *
      *     // property (on prototype)
      *     result = Reflect.getMetadataKeys(C.prototype, "property");
      *
      *     // method (on constructor)
      *     result = Reflect.getMetadataKeys(C, "staticMethod");
      *
      *     // method (on prototype)
      *     result = Reflect.getMetadataKeys(C.prototype, "method");
      *
      */
    function getMetadataKeys(target, targetKey) {
        if (!IsObject(target)) {
            throw new TypeError();
        }
        else if (!IsUndefined(targetKey)) {
            targetKey = ToPropertyKey(targetKey);
        }
        return OrdinaryMetadataKeys(target, targetKey);
    }
    Reflect.getMetadataKeys = getMetadataKeys;
    /**
      * Gets the unique metadata keys defined on the target object.
      * @param target The target object on which the metadata is defined.
      * @param targetKey (Optional) The property key for the target.
      * @returns An array of unique metadata keys.
      * @example
      *
      *     class C {
      *         // property declarations are not part of ES6, though they are valid in TypeScript:
      *         // static staticProperty;
      *         // property;
      *
      *         constructor(p) { }
      *         static staticMethod(p) { }
      *         method(p) { }
      *     }
      *
      *     // constructor
      *     result = Reflect.getOwnMetadataKeys(C);
      *
      *     // property (on constructor)
      *     result = Reflect.getOwnMetadataKeys(C, "staticProperty");
      *
      *     // property (on prototype)
      *     result = Reflect.getOwnMetadataKeys(C.prototype, "property");
      *
      *     // method (on constructor)
      *     result = Reflect.getOwnMetadataKeys(C, "staticMethod");
      *
      *     // method (on prototype)
      *     result = Reflect.getOwnMetadataKeys(C.prototype, "method");
      *
      */
    function getOwnMetadataKeys(target, targetKey) {
        if (!IsObject(target)) {
            throw new TypeError();
        }
        else if (!IsUndefined(targetKey)) {
            targetKey = ToPropertyKey(targetKey);
        }
        return OrdinaryOwnMetadataKeys(target, targetKey);
    }
    Reflect.getOwnMetadataKeys = getOwnMetadataKeys;
    /**
      * Deletes the metadata entry from the target object with the provided key.
      * @param metadataKey A key used to store and retrieve metadata.
      * @param target The target object on which the metadata is defined.
      * @param targetKey (Optional) The property key for the target.
      * @returns `true` if the metadata entry was found and deleted; otherwise, false.
      * @example
      *
      *     class C {
      *         // property declarations are not part of ES6, though they are valid in TypeScript:
      *         // static staticProperty;
      *         // property;
      *
      *         constructor(p) { }
      *         static staticMethod(p) { }
      *         method(p) { }
      *     }
      *
      *     // constructor
      *     result = Reflect.deleteMetadata("custom:annotation", C);
      *
      *     // property (on constructor)
      *     result = Reflect.deleteMetadata("custom:annotation", C, "staticProperty");
      *
      *     // property (on prototype)
      *     result = Reflect.deleteMetadata("custom:annotation", C.prototype, "property");
      *
      *     // method (on constructor)
      *     result = Reflect.deleteMetadata("custom:annotation", C, "staticMethod");
      *
      *     // method (on prototype)
      *     result = Reflect.deleteMetadata("custom:annotation", C.prototype, "method");
      *
      */
    function deleteMetadata(metadataKey, target, targetKey) {
        if (!IsObject(target)) {
            throw new TypeError();
        }
        else if (!IsUndefined(targetKey)) {
            targetKey = ToPropertyKey(targetKey);
        }
        // https://github.com/jonathandturner/decorators/blob/master/specs/metadata.md#deletemetadata-metadatakey-p-
        var metadataMap = GetOrCreateMetadataMap(target, targetKey, /*create*/ false);
        if (IsUndefined(metadataMap)) {
            return false;
        }
        if (!metadataMap.delete(metadataKey)) {
            return false;
        }
        if (metadataMap.size > 0) {
            return true;
        }
        var targetMetadata = __Metadata__.get(target);
        targetMetadata.delete(targetKey);
        if (targetMetadata.size > 0) {
            return true;
        }
        __Metadata__.delete(target);
        return true;
    }
    Reflect.deleteMetadata = deleteMetadata;
    function DecorateConstructor(decorators, target) {
        for (var i = decorators.length - 1; i >= 0; --i) {
            var decorator = decorators[i];
            var decorated = decorator(target);
            if (!IsUndefined(decorated)) {
                if (!IsConstructor(decorated)) {
                    throw new TypeError();
                }
                target = decorated;
            }
        }
        return target;
    }
    function DecoratePropertyWithDescriptor(decorators, target, propertyKey, descriptor) {
        for (var i = decorators.length - 1; i >= 0; --i) {
            var decorator = decorators[i];
            var decorated = decorator(target, propertyKey, descriptor);
            if (!IsUndefined(decorated)) {
                if (!IsObject(decorated)) {
                    throw new TypeError();
                }
                descriptor = decorated;
            }
        }
        return descriptor;
    }
    function DecoratePropertyWithoutDescriptor(decorators, target, propertyKey) {
        for (var i = decorators.length - 1; i >= 0; --i) {
            var decorator = decorators[i];
            decorator(target, propertyKey);
        }
    }
    // https://github.com/jonathandturner/decorators/blob/master/specs/metadata.md#getorcreatemetadatamap--o-p-create-
    function GetOrCreateMetadataMap(target, targetKey, create) {
        var targetMetadata = __Metadata__.get(target);
        if (!targetMetadata) {
            if (!create) {
                return undefined;
            }
            targetMetadata = new _Map();
            __Metadata__.set(target, targetMetadata);
        }
        var keyMetadata = targetMetadata.get(targetKey);
        if (!keyMetadata) {
            if (!create) {
                return undefined;
            }
            keyMetadata = new _Map();
            targetMetadata.set(targetKey, keyMetadata);
        }
        return keyMetadata;
    }
    // https://github.com/jonathandturner/decorators/blob/master/specs/metadata.md#ordinaryhasmetadata--metadatakey-o-p-
    function OrdinaryHasMetadata(MetadataKey, O, P) {
        var hasOwn = OrdinaryHasOwnMetadata(MetadataKey, O, P);
        if (hasOwn) {
            return true;
        }
        var parent = GetPrototypeOf(O);
        if (parent !== null) {
            return OrdinaryHasMetadata(MetadataKey, parent, P);
        }
        return false;
    }
    // https://github.com/jonathandturner/decorators/blob/master/specs/metadata.md#ordinaryhasownmetadata--metadatakey-o-p-
    function OrdinaryHasOwnMetadata(MetadataKey, O, P) {
        var metadataMap = GetOrCreateMetadataMap(O, P, /*create*/ false);
        if (metadataMap === undefined) {
            return false;
        }
        return Boolean(metadataMap.has(MetadataKey));
    }
    // https://github.com/jonathandturner/decorators/blob/master/specs/metadata.md#ordinarygetmetadata--metadatakey-o-p-
    function OrdinaryGetMetadata(MetadataKey, O, P) {
        var hasOwn = OrdinaryHasOwnMetadata(MetadataKey, O, P);
        if (hasOwn) {
            return OrdinaryGetOwnMetadata(MetadataKey, O, P);
        }
        var parent = GetPrototypeOf(O);
        if (parent !== null) {
            return OrdinaryGetMetadata(MetadataKey, parent, P);
        }
        return undefined;
    }
    // https://github.com/jonathandturner/decorators/blob/master/specs/metadata.md#ordinarygetownmetadata--metadatakey-o-p-
    function OrdinaryGetOwnMetadata(MetadataKey, O, P) {
        var metadataMap = GetOrCreateMetadataMap(O, P, /*create*/ false);
        if (metadataMap === undefined) {
            return undefined;
        }
        return metadataMap.get(MetadataKey);
    }
    // https://github.com/jonathandturner/decorators/blob/master/specs/metadata.md#ordinarydefineownmetadata--metadatakey-metadatavalue-o-p-
    function OrdinaryDefineOwnMetadata(MetadataKey, MetadataValue, O, P) {
        var metadataMap = GetOrCreateMetadataMap(O, P, /*create*/ true);
        metadataMap.set(MetadataKey, MetadataValue);
    }
    // https://github.com/jonathandturner/decorators/blob/master/specs/metadata.md#ordinarymetadatakeys--o-p-
    function OrdinaryMetadataKeys(O, P) {
        var ownKeys = OrdinaryOwnMetadataKeys(O, P);
        var parent = GetPrototypeOf(O);
        if (parent === null) {
            return ownKeys;
        }
        var parentKeys = OrdinaryMetadataKeys(parent, P);
        if (parentKeys.length <= 0) {
            return ownKeys;
        }
        if (ownKeys.length <= 0) {
            return parentKeys;
        }
        var set = new _Set();
        var keys = [];
        for (var _i = 0; _i < ownKeys.length; _i++) {
            var key = ownKeys[_i];
            var hasKey = set.has(key);
            if (!hasKey) {
                set.add(key);
                keys.push(key);
            }
        }
        for (var _a = 0; _a < parentKeys.length; _a++) {
            var key = parentKeys[_a];
            var hasKey = set.has(key);
            if (!hasKey) {
                set.add(key);
                keys.push(key);
            }
        }
        return keys;
    }
    // https://github.com/jonathandturner/decorators/blob/master/specs/metadata.md#ordinaryownmetadatakeys--o-p-
    function OrdinaryOwnMetadataKeys(target, targetKey) {
        var metadataMap = GetOrCreateMetadataMap(target, targetKey, /*create*/ false);
        var keys = [];
        if (metadataMap) {
            metadataMap.forEach(function (_, key) { return keys.push(key); });
        }
        return keys;
    }
    // https://people.mozilla.org/~jorendorff/es6-draft.html#sec-ecmascript-language-types-undefined-type
    function IsUndefined(x) {
        return x === undefined;
    }
    // https://people.mozilla.org/~jorendorff/es6-draft.html#sec-isarray
    function IsArray(x) {
        return Array.isArray(x);
    }
    // https://people.mozilla.org/~jorendorff/es6-draft.html#sec-object-type
    function IsObject(x) {
        return typeof x === "object" ? x !== null : typeof x === "function";
    }
    // https://people.mozilla.org/~jorendorff/es6-draft.html#sec-isconstructor
    function IsConstructor(x) {
        return typeof x === "function";
    }
    // https://people.mozilla.org/~jorendorff/es6-draft.html#sec-ecmascript-language-types-symbol-type
    function IsSymbol(x) {
        return typeof x === "symbol";
    }
    // https://people.mozilla.org/~jorendorff/es6-draft.html#sec-topropertykey
    function ToPropertyKey(value) {
        if (IsSymbol(value)) {
            return value;
        }
        return String(value);
    }
    function GetPrototypeOf(O) {
        var proto = Object.getPrototypeOf(O);
        if (typeof O !== "function" || O === functionPrototype) {
            return proto;
        }
        // TypeScript doesn't set __proto__ in ES5, as it's non-standard. 
        // Try to determine the superclass constructor. Compatible implementations
        // must either set __proto__ on a subclass constructor to the superclass constructor,
        // or ensure each class has a valid `constructor` property on its prototype that
        // points back to the constructor.
        // If this is not the same as Function.[[Prototype]], then this is definately inherited.
        // This is the case when in ES6 or when using __proto__ in a compatible browser.
        if (proto !== functionPrototype) {
            return proto;
        }
        // If the super prototype is Object.prototype, null, or undefined, then we cannot determine the heritage.
        var prototype = O.prototype;
        var prototypeProto = Object.getPrototypeOf(prototype);
        if (prototypeProto == null || prototypeProto === Object.prototype) {
            return proto;
        }
        // if the constructor was not a function, then we cannot determine the heritage.
        var constructor = prototypeProto.constructor;
        if (typeof constructor !== "function") {
            return proto;
        }
        // if we have some kind of self-reference, then we cannot determine the heritage.
        if (constructor === O) {
            return proto;
        }
        // we have a pretty good guess at the heritage.
        return constructor;
    }
    // naive Map shim
    function CreateMapPolyfill() {
        var cacheSentinel = {};
        function Map() {
            this._keys = [];
            this._values = [];
            this._cache = cacheSentinel;
        }
        Map.prototype = {
            get size() {
                return this._keys.length;
            },
            has: function (key) {
                if (key === this._cache) {
                    return true;
                }
                if (this._find(key) >= 0) {
                    this._cache = key;
                    return true;
                }
                return false;
            },
            get: function (key) {
                var index = this._find(key);
                if (index >= 0) {
                    this._cache = key;
                    return this._values[index];
                }
                return undefined;
            },
            set: function (key, value) {
                this.delete(key);
                this._keys.push(key);
                this._values.push(value);
                this._cache = key;
                return this;
            },
            delete: function (key) {
                var index = this._find(key);
                if (index >= 0) {
                    this._keys.splice(index, 1);
                    this._values.splice(index, 1);
                    this._cache = cacheSentinel;
                    return true;
                }
                return false;
            },
            clear: function () {
                this._keys.length = 0;
                this._values.length = 0;
                this._cache = cacheSentinel;
            },
            forEach: function (callback, thisArg) {
                var size = this.size;
                for (var i = 0; i < size; ++i) {
                    var key = this._keys[i];
                    var value = this._values[i];
                    this._cache = key;
                    callback.call(this, value, key, this);
                }
            },
            _find: function (key) {
                var keys = this._keys;
                var size = keys.length;
                for (var i = 0; i < size; ++i) {
                    if (keys[i] === key) {
                        return i;
                    }
                }
                return -1;
            }
        };
        return Map;
    }
    // naive Set shim
    function CreateSetPolyfill() {
        var cacheSentinel = {};
        function Set() {
            this._map = new _Map();
        }
        Set.prototype = {
            get size() {
                return this._map.length;
            },
            has: function (value) {
                return this._map.has(value);
            },
            add: function (value) {
                this._map.set(value, value);
                return this;
            },
            delete: function (value) {
                return this._map.delete(value);
            },
            clear: function () {
                this._map.clear();
            },
            forEach: function (callback, thisArg) {
                this._map.forEach(callback, thisArg);
            }
        };
        return Set;
    }
    // naive WeakMap shim
    function CreateWeakMapPolyfill() {
        var UUID_SIZE = 16;
        var isNode = typeof global !== "undefined" && Object.prototype.toString.call(global.process) === '[object process]';
        var nodeCrypto = isNode && _dereq_("crypto");
        var hasOwn = Object.prototype.hasOwnProperty;
        var keys = {};
        var rootKey = CreateUniqueKey();
        function WeakMap() {
            this._key = CreateUniqueKey();
        }
        WeakMap.prototype = {
            has: function (target) {
                var table = GetOrCreateWeakMapTable(target, /*create*/ false);
                if (table) {
                    return this._key in table;
                }
                return false;
            },
            get: function (target) {
                var table = GetOrCreateWeakMapTable(target, /*create*/ false);
                if (table) {
                    return table[this._key];
                }
                return undefined;
            },
            set: function (target, value) {
                var table = GetOrCreateWeakMapTable(target, /*create*/ true);
                table[this._key] = value;
                return this;
            },
            delete: function (target) {
                var table = GetOrCreateWeakMapTable(target, /*create*/ false);
                if (table && this._key in table) {
                    return delete table[this._key];
                }
                return false;
            },
            clear: function () {
                // NOTE: not a real clear, just makes the previous data unreachable
                this._key = CreateUniqueKey();
            }
        };
        function FillRandomBytes(buffer, size) {
            for (var i = 0; i < size; ++i) {
                buffer[i] = Math.random() * 255 | 0;
            }
        }
        function GenRandomBytes(size) {
            if (nodeCrypto) {
                var data = nodeCrypto.randomBytes(size);
                return data;
            }
            else if (typeof Uint8Array === "function") {
                var data = new Uint8Array(size);
                if (typeof crypto !== "undefined") {
                    crypto.getRandomValues(data);
                }
                else if (typeof msCrypto !== "undefined") {
                    msCrypto.getRandomValues(data);
                }
                else {
                    FillRandomBytes(data, size);
                }
                return data;
            }
            else {
                var data = new Array(size);
                FillRandomBytes(data, size);
                return data;
            }
        }
        function CreateUUID() {
            var data = GenRandomBytes(UUID_SIZE);
            // mark as random - RFC 4122 § 4.4
            data[6] = data[6] & 0x4f | 0x40;
            data[8] = data[8] & 0xbf | 0x80;
            var result = "";
            for (var offset = 0; offset < UUID_SIZE; ++offset) {
                var byte = data[offset];
                if (offset === 4 || offset === 6 || offset === 8) {
                    result += "-";
                }
                if (byte < 16) {
                    result += "0";
                }
                result += byte.toString(16).toLowerCase();
            }
            return result;
        }
        function CreateUniqueKey() {
            var key;
            do {
                key = "@@WeakMap@@" + CreateUUID();
            } while (hasOwn.call(keys, key));
            keys[key] = true;
            return key;
        }
        function GetOrCreateWeakMapTable(target, create) {
            if (!hasOwn.call(target, rootKey)) {
                if (!create) {
                    return undefined;
                }
                Object.defineProperty(target, rootKey, { value: Object.create(null) });
            }
            return target[rootKey];
        }
        return WeakMap;
    }
    // hook global Reflect
    (function (__global) {
        if (typeof __global.Reflect !== "undefined") {
            if (__global.Reflect !== Reflect) {
                for (var p in Reflect) {
                    __global.Reflect[p] = Reflect[p];
                }
            }
        }
        else {
            __global.Reflect = Reflect;
        }
    })(typeof window !== "undefined" ? window :
        typeof WorkerGlobalScope !== "undefined" ? self :
            typeof global !== "undefined" ? global :
                Function("return this;")());
})(Reflect || (Reflect = {}));

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"crypto":2}],16:[function(_dereq_,module,exports){
module.exports={
  "name": "jaydata",
  "description": "Cross-platform HTML5 data-management, JavaScript Language Query (JSLQ) support for OData, SQLite, WebSQL, IndexedDB, YQL and Facebook (packaged for Node.JS)",
  "keywords": [
    "HTML5 data management",
    "JavaScript",
    "JavaScript Language Query",
    "JSLQ",
    "OData",
    "SQLite",
    "WebSQL",
    "IndexedDB",
    "YQL",
    "Facebook",
    "cross-platform",
    "iPhone",
    "Android"
  ],
  "version": "1.5.1",
  "homepage": "http://jaydata.org",
  "author": {
    "name": "JayData",
    "url": "http://jaydata.org"
  },
  "dependencies": {
    "acorn": "^3.0.2",
    "atob": "^2.0.0",
    "btoa": "^1.1.2",
    "dot": "^1.0.3",
    "jaydata-dynamic-metadata": "^0.0.5",
    "jaydata-error-handler": "^0.0.1",
    "jaydata-odatajs": "^4.0.0",
    "jaydata-promise-handler": "^0.0.1",
    "odata-metadata": "^0.1.0",
    "xmldom": "^0.1.19"
  },
  "contributors": [
    {
      "name": "Dániel József"
    },
    {
      "name": "Hajnalka Battancs"
    },
    {
      "name": "János Roden"
    },
    {
      "name": "László Horváth"
    },
    {
      "name": "Péter Zentai"
    },
    {
      "name": "Péter Nochta"
    },
    {
      "name": "Róbert Bónay"
    },
    {
      "name": "Szabolcs Czinege"
    },
    {
      "name": "Viktor Borza"
    },
    {
      "name": "Viktor Lázár"
    },
    {
      "name": "Zoltán Gyebrovszki"
    }
  ],
  "repository": {
    "type": "git",
    "url": "git://github.com/jaydata/jaydata.git"
  },
  "engines": {
    "node": ">=0.6.0"
  },
  "license": "(MIT OR GPL-2.0)",
  "devDependencies": {
    "babel": "^6.1.18",
    "babel-eslint": "^5.0.0-beta4",
    "babel-plugin-add-module-exports": "^0.1.1",
    "babel-preset-es2015": "^6.1.18",
    "babel-register": "^6.2.0",
    "babelify": "^7.2.0",
    "browserify": "^12.0.1",
    "browserify-derequire": "^0.9.4",
    "browserify-shim": "^3.8.11",
    "chai": "^3.4.1",
    "del": "^2.2.0",
    "google-closure-compiler": "^20151015.0.0",
    "gulp": "^3.9.0",
    "gulp-babel": "^6.1.1",
    "gulp-browserify": "^0.5.1",
    "gulp-closure-compiler": "^0.3.1",
    "gulp-concat": "^2.6.0",
    "gulp-derequire": "^2.1.0",
    "gulp-eslint": "^1.1.1",
    "gulp-footer": "^1.0.5",
    "gulp-header": "^1.7.1",
    "gulp-nightwatch": "^0.2.6",
    "gulp-nuget-pack": "0.0.6",
    "gulp-rename": "^1.2.2",
    "gulp-replace": "^0.5.4",
    "gulp-sourcemaps": "^1.6.0",
    "gulp-uglify": "^1.5.1",
    "gulp-vinyl-zip": "^1.1.2",
    "gulp-webserver": "^0.9.1",
    "istanbul": "^0.4.1",
    "jaguarjs-jsdoc": "0.0.1",
    "jsdoc": "^3.4.0",
    "minimist": "^1.2.0",
    "nightwatch": "^0.8.8",
    "npm": "^3.5.2",
    "selenium-standalone": "^4.7.2",
    "vinyl-buffer": "^1.0.0",
    "vinyl-source-stream": "^1.1.0",
    "yargs": "^3.31.0"
  },
  "browserify-shim": {
    "atob": "global:atob",
    "btoa": "global:btoa",
    "jquery": "global:jQuery",
    "jaydata-odatajs": "global:odatajs",
    "angular": "global:angular",
    "Handlebars": "global:Handlebars",
    "kendo": "global:kendo",
    "ko": "global:ko",
    "q": "global:Q",
    "Ext": "global:Ext"
  },
  "scripts": {
    "test": "mocha --compilers js:babel-register"
  }
}

},{}],17:[function(_dereq_,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _index = _dereq_('../TypeSystem/index.js');

var _index2 = _interopRequireDefault(_index);

var _jaydataDynamicMetadata = _dereq_('jaydata-dynamic-metadata');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

_index2.default.DynamicMetadata = _jaydataDynamicMetadata.DynamicMetadata;
var dynamicMetadata = new _jaydataDynamicMetadata.DynamicMetadata(_index2.default);
_index2.default.service = dynamicMetadata.service.bind(dynamicMetadata);
_index2.default.initService = dynamicMetadata.initService.bind(dynamicMetadata);

exports.default = _index2.default;
module.exports = exports['default'];

},{"../TypeSystem/index.js":32,"jaydata-dynamic-metadata":5}],18:[function(_dereq_,module,exports){
'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; };

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.ContainerInstance = undefined;
exports.ContainerCtor = ContainerCtor;

var _initializeJayData = _dereq_('./initializeJayData.js');

var _initializeJayData2 = _interopRequireDefault(_initializeJayData);

var _jaydataErrorHandler = _dereq_('jaydata-error-handler');

var _Extensions = _dereq_('./Extensions.js');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var Container = new ContainerCtor();

var ContainerInstance = exports.ContainerInstance = Container;

function ContainerCtor(parentContainer) {
  var parent = parentContainer;
  if (parent) {
    parent.addChildContainer(this);
  }

  var classNames = {};
  var consolidatedClassNames = [];
  var classTypes = [];

  this.classNames = classNames;
  this.consolidatedClassNames = consolidatedClassNames;
  this.classTypes = classTypes;

  var mappedTo = [];
  this.mappedTo = mappedTo;

  var self = this;

  this["holder"] = null;

  var IoC = function IoC(type, parameters) {
    var t = self.resolveType(type);
    var inst = Object.create(t.prototype);
    t.apply(inst, parameters);
    return inst;
  };

  var pendingResolutions = {};
  this.pendingResolutions = pendingResolutions;

  function addPendingResolution(name, onResolved) {
    pendingResolutions[name] = pendingResolutions[name] || [];
    pendingResolutions[name].push(onResolved);
  }

  this.addChildContainer = function (container) {
    //children.push(container);
  };

  this.createInstance = function (type, parameters) {
    return IoC(type, parameters);
  };

  this.mapType = function (aliasTypeOrName, realTypeOrName) {
    _jaydataErrorHandler.Guard.requireValue("aliasType", aliasTypeOrName);
    _jaydataErrorHandler.Guard.requireValue("realType", realTypeOrName);
    var aliasT = this.getType(aliasTypeOrName);
    var realT = this.getType(realTypeOrName);
    var aliasPos = classTypes.indexOf(aliasT);
    var realPos = classTypes.indexOf(realT);
    mappedTo[aliasPos] = realPos;
  },

  //this.resolve = function (type, parameters) {
  //    var classFunction = this.resolveType(type, parameters);
  //    return new classFunction(parameters);
  //};

  this.isPrimitiveType = function (type) {
    var t = this.resolveType(type);

    switch (true) {
      case t === Number:
      case t === String:
      case t === Date:
      case t === Boolean:
      case t === Array:
      case t === Object:

      case t === _initializeJayData2.default.Number:
      case t === _initializeJayData2.default.Integer:
      case t === _initializeJayData2.default.Date:
      case t === _initializeJayData2.default.String:
      case t === _initializeJayData2.default.Boolean:
      case t === _initializeJayData2.default.Array:
      case t === _initializeJayData2.default.Object:
      case t === _initializeJayData2.default.Guid:

      case t === _initializeJayData2.default.Byte:
      case t === _initializeJayData2.default.SByte:
      case t === _initializeJayData2.default.Decimal:
      case t === _initializeJayData2.default.Float:
      case t === _initializeJayData2.default.Int16:
      case t === _initializeJayData2.default.Int32:
      case t === _initializeJayData2.default.Int64:
      case t === _initializeJayData2.default.DateTimeOffset:
      case t === _initializeJayData2.default.Time:
      case t === _initializeJayData2.default.Day:
      case t === _initializeJayData2.default.Duration:

      case t === _initializeJayData2.default.SimpleBase:
      case t === _initializeJayData2.default.Geospatial:
      case t === _initializeJayData2.default.GeographyBase:
      case t === _initializeJayData2.default.GeographyPoint:
      case t === _initializeJayData2.default.GeographyLineString:
      case t === _initializeJayData2.default.GeographyPolygon:
      case t === _initializeJayData2.default.GeographyMultiPoint:
      case t === _initializeJayData2.default.GeographyMultiLineString:
      case t === _initializeJayData2.default.GeographyMultiPolygon:
      case t === _initializeJayData2.default.GeographyCollection:
      case t === _initializeJayData2.default.GeometryBase:
      case t === _initializeJayData2.default.GeometryPoint:
      case t === _initializeJayData2.default.GeometryLineString:
      case t === _initializeJayData2.default.GeometryPolygon:
      case t === _initializeJayData2.default.GeometryMultiPoint:
      case t === _initializeJayData2.default.GeometryMultiLineString:
      case t === _initializeJayData2.default.GeometryMultiPolygon:
      case t === _initializeJayData2.default.GeometryCollection:

        return true;
      default:
        return false;
    }
  };

  this.resolveName = function (type) {
    var t = this.resolveType(type);
    var tPos = classTypes.indexOf(t);
    return consolidatedClassNames[tPos];
  };

  this.resolveType = function (typeOrName, onResolved) {
    var t = typeOrName;
    t = this.getType(t, onResolved ? true : false, onResolved);
    var posT = classTypes.indexOf(t);
    return typeof mappedTo[posT] === 'undefined' ? t : classTypes[mappedTo[posT]];
  };

  this.getType = function (typeOrName, doNotThrow, onResolved) {
    _jaydataErrorHandler.Guard.requireValue("typeOrName", typeOrName);
    if (typeof typeOrName === 'function') {
      return typeOrName;
    };

    if (!(typeOrName in classNames)) {
      if (parent) {
        var tp = parent.getType(typeOrName, true);
        if (tp) return tp;
      }
      if (onResolved) {
        addPendingResolution(typeOrName, onResolved);
        return;
      } else if (doNotThrow) {
        return undefined;
      } else {
        _jaydataErrorHandler.Guard.raise(new _jaydataErrorHandler.Exception("Unable to resolve type:" + typeOrName));
      }
    };
    var result = classTypes[classNames[typeOrName]];
    if (onResolved) {
      onResolved(result);
    }
    return result;
  };

  this.getName = function (typeOrName) {
    var t = this.getType(typeOrName);
    var tPos = classTypes.indexOf(t);
    if (tPos == -1) _jaydataErrorHandler.Guard.raise("unknown type to request name for: " + typeOrName);
    return consolidatedClassNames[tPos];
  };

  this.getTypes = function () {
    var keys = Object.keys(classNames);
    var ret = [];
    for (var i = 0; i < keys.length; i++) {
      var className = keys[i];
      ret.push({
        name: className,
        type: classTypes[classNames[className]],
        toString: function toString() {
          return this.name;
        }
      });
    }
    return ret;
  };

  //this.getTypeName( in type);
  //this.resolveType()
  //this.inferTypeFromValue = function (value) {

  this.getTypeName = function (value) {
    //TODO refactor
    switch (typeof value === 'undefined' ? 'undefined' : _typeof(value)) {
      case 'object':
        if (value == null) return '$data.Object';
        if (value instanceof Array) return '$data.Array';
        if (value.getType) return value.getType().fullName;
        if (value instanceof Date) return '$data.Date';
        if (value instanceof _initializeJayData2.default.Guid) return '$data.Guid';
        if (value instanceof _initializeJayData2.default.DateTimeOffset) return '$data.DateTimeOffset';
        if (value instanceof _initializeJayData2.default.GeographyPoint) return '$data.GeographyPoint';
        if (value instanceof _initializeJayData2.default.GeographyLineString) return '$data.GeographyLineString';
        if (value instanceof _initializeJayData2.default.GeographyPolygon) return '$data.GeographyPolygon';
        if (value instanceof _initializeJayData2.default.GeographyMultiPoint) return '$data.GeographyMultiPoint';
        if (value instanceof _initializeJayData2.default.GeographyMultiLineString) return '$data.GeographyMultiLineString';
        if (value instanceof _initializeJayData2.default.GeographyMultiPolygon) return '$data.GeographyMultiPolygon';
        if (value instanceof _initializeJayData2.default.GeographyCollection) return '$data.GeographyCollection';
        if (value instanceof _initializeJayData2.default.GeographyBase) return '$data.GeographyBase';
        if (value instanceof _initializeJayData2.default.GeometryPoint) return '$data.GeometryPoint';
        if (value instanceof _initializeJayData2.default.GeometryLineString) return '$data.GeometryLineString';
        if (value instanceof _initializeJayData2.default.GeometryPolygon) return '$data.GeometryPolygon';
        if (value instanceof _initializeJayData2.default.GeometryMultiPoint) return '$data.GeometryMultiPoint';
        if (value instanceof _initializeJayData2.default.GeometryMultiLineString) return '$data.GeometryMultiLineString';
        if (value instanceof _initializeJayData2.default.GeometryMultiPolygon) return '$data.GeometryMultiPolygon';
        if (value instanceof _initializeJayData2.default.GeometryCollection) return '$data.GeometryCollection';
        if (value instanceof _initializeJayData2.default.GeometryBase) return '$data.GeometryBase';
        if (value instanceof _initializeJayData2.default.Geospatial) return '$data.Geospatial';
        if (value instanceof _initializeJayData2.default.SimpleBase) return '$data.SimpleBase';
        if (typeof value.toHexString === 'function') return '$data.ObjectID';
      //if(value instanceof "number") return
      default:
        return typeof value === 'undefined' ? 'undefined' : _typeof(value);
    }
  };

  this.isTypeRegistered = function (typeOrName) {
    if (typeof typeOrName === 'function') {
      return classTypes.indexOf(typeOrName) > -1;
    } else {
      return typeOrName in classNames;
    }
  };

  this.unregisterType = function (type) {
    _jaydataErrorHandler.Guard.raise("Unimplemented");
  };

  this.getDefault = function (typeOrName) {
    var t = this.resolveType(typeOrName);
    switch (t) {
      case _initializeJayData2.default.Number:
        return 0.0;
      case _initializeJayData2.default.Float:
        return 0.0;
      case _initializeJayData2.default.Decimal:
        return '0.0';
      case _initializeJayData2.default.Integer:
        return 0;
      case _initializeJayData2.default.Int16:
        return 0;
      case _initializeJayData2.default.Int32:
        return 0;
      case _initializeJayData2.default.Int64:
        return '0';
      case _initializeJayData2.default.Byte:
        return 0;
      case _initializeJayData2.default.SByte:
        return 0;
      case _initializeJayData2.default.String:
        return null;
      case _initializeJayData2.default.Boolean:
        return false;
      default:
        return null;
    }
  };

  //name array ['', '', '']
  this.getIndex = function (typeOrName) {
    var t = this.resolveType(typeOrName);
    return classTypes.indexOf(t);
  };

  this.resolveByIndex = function (index) {
    return classTypes[index];
  };

  this.registerType = function (nameOrNamesArray, type, factoryFunc) {
    ///<signature>
    ///<summary>Registers a type and optionally a lifetimeManager with a name
    ///that can be used to later resolve the type or create new instances</summary>
    ///<param name="nameOrNamesArray" type="Array">The names of the type</param>
    ///<param name="type" type="Function">The type to register</param>
    ///<param name="instanceManager" type="Function"></param>
    ///</signature>
    ///<signature>
    ///<summary>Registers a new type that </summary>
    ///<param name="aliasType" type="Function">The name of the type</param>
    ///<param name="actualType" type="Function">The type to register</param>
    ///</signature>

    ///TODO remove
    /*if (typeof typeNameOrAlias === 'string') {
        if (classNames.indexOf(typeNameOrAlias) > -1) {
            Guard.raise("Type already registered. Remove first");
        }
    }*/

    if (!nameOrNamesArray) {
      return;
    }

    //todo add ('number', 'number')
    if (typeof type === "string") {
      type = self.resolveType(type);
    }

    var namesArray = [];
    if (typeof nameOrNamesArray === 'string') {
      var tmp = [];
      tmp.push(nameOrNamesArray);
      namesArray = tmp;
    } else {
      namesArray = nameOrNamesArray;
    }

    for (var i = 0; i < namesArray.length; i++) {
      var parts = namesArray[i].split('.');
      var item = {};
      item.shortName = parts[parts.length - 1];
      item.fullName = namesArray[i];
      namesArray[i] = item;
    }

    //if (type.

    var creatorFnc = function creatorFnc() {
      return IoC(type, arguments);
    };

    if (typeof intellisense !== 'undefined') {
      intellisense.annotate(creatorFnc, type);
    }

    for (var i = 0, l = namesArray.length; i < l; i++) {
      var item = namesArray[i];
      if (!("create" + item.shortName in self)) {
        if (typeof factoryFunc === 'function') {
          self["create" + item.shortName] = factoryFunc;
        } else {
          self["create" + item.shortName] = creatorFnc;
        }
      }

      var typePos = classTypes.indexOf(type);
      if (typePos == -1) {
        //new type
        typePos = classTypes.push(type) - 1;
        var fn = item.fullName;
        consolidatedClassNames[typePos] = item.fullName;
      };

      classNames[item.fullName] = typePos;

      var pending = pendingResolutions[item.fullName] || [];
      if (pending.length > 0) {
        pending.forEach(function (t) {
          t(type);
        });
        pendingResolutions[item.fullName] = [];
      }
    }
    if (parent) {
      parent.registerType.apply(parent, arguments);
    }
    if (!type.name) {
      try {
        type.name = namesArray[0].shortName;
      } catch (err) {}
    }
  };

  var _converters = {
    from: {},
    to: {}
  };
  this.converters = _converters;

  this.convertTo = function (value, tType, eType /*if Array*/, options) {
    _jaydataErrorHandler.Guard.requireValue("typeOrName", tType);

    if (_jaydataErrorHandler.Guard.isNullOrUndefined(value)) return value;

    var sourceTypeName = Container.getTypeName(value);
    var sourceType = Container.resolveType(sourceTypeName);
    var sourceTypeName = Container.resolveName(sourceType);
    var targetType = Container.resolveType(tType);
    var targetTypeName = Container.resolveName(targetType);

    var result;
    try {
      if (typeof targetType['from' + sourceTypeName] === 'function') {
        // target from
        result = targetType['from' + sourceTypeName].apply(targetType, arguments);
      } else if (typeof sourceType['to' + targetTypeName] === 'function') {
        // source to
        result = sourceType['to' + targetTypeName].apply(sourceType, arguments);
      } else if (_converters.to[targetTypeName] && _converters.to[targetTypeName][sourceTypeName]) {
        // target from source
        result = _converters.to[targetTypeName][sourceTypeName].apply(_converters, arguments);
      } else if (_converters.from[sourceTypeName] && _converters.from[sourceTypeName][targetTypeName]) {
        // source to target
        result = _converters.from[sourceTypeName][targetTypeName].apply(_converters, arguments);
      } else if (targetTypeName === sourceTypeName || value instanceof targetType) {
        result = value;
      } else if (_converters.to[targetTypeName] && _converters.to[targetTypeName]['default']) {
        // target from anything
        result = _converters.to[targetTypeName]['default'].apply(_converters, arguments);
      } else {
        throw "converter not found";
      }
    } catch (e) {
      _jaydataErrorHandler.Guard.raise(new _jaydataErrorHandler.Exception("Value '" + sourceTypeName + "' not convertable to '" + targetTypeName + "'", 'TypeError', value));
    }

    if (targetType === _initializeJayData2.default.Array && eType && Array.isArray(result)) {
      for (var i = 0; i < result.length; i++) {
        result[i] = this.convertTo.call(this, result[i], eType, undefined, options);
      }
    }

    return result;
  };
  this.registerConverter = function (target, sourceOrToConverters, toConverterOrFromConverters, fromConverter) {
    //registerConverter($data.Guid, { $data.String: fn, int: fn }, { string: fn, int:fn })
    //registerConverter($data.Guid, $data.String, fn, fn);

    var targetName = Container.resolveName(target);
    if (Container.isTypeRegistered(sourceOrToConverters)) {
      //isSource
      _converters.to[targetName] = _converters.to[targetName] || {};
      _converters.from[targetName] = _converters.from[targetName] || {};

      var sourceName = Container.resolveName(sourceOrToConverters);

      if (toConverterOrFromConverters) _converters.to[targetName][sourceName] = toConverterOrFromConverters;
      if (fromConverter) _converters.from[targetName][sourceName] = fromConverter;
    } else {
      // converterGroup

      //fromConverters
      if (_converters.to[targetName]) {
        _converters.to[targetName] = _initializeJayData2.default.typeSystem.extend(_converters.to[targetName], sourceOrToConverters);
      } else {
        _converters.to[targetName] = sourceOrToConverters;
      }

      //toConverters
      if (_converters.from[targetName]) {
        _converters.from[targetName] = _initializeJayData2.default.typeSystem.extend(_converters.from[targetName], toConverterOrFromConverters);
      } else {
        _converters.from[targetName] = toConverterOrFromConverters;
      }
    }
  };

  this.createOrGetNamespace = function (parts, root) {
    for (var i = 0; i < parts.length; i++) {
      var part = parts[i];
      if (!root[part]) {
        var ns = {};
        ns.__namespace = true;
        root[part] = ns;
      }
      root = root[part];
    }
    return root;
  };
}

},{"./Extensions.js":19,"./initializeJayData.js":33,"jaydata-error-handler":7}],19:[function(_dereq_,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
var StringFunctions = exports.StringFunctions = {
    startsWith: function startsWith() {
        var self, str;
        if (arguments.length == 2) {
            self = arguments[0];
            str = arguments[1];
        } else if (arguments.length == 1 && typeof this === 'string') {
            self = this;
            str = arguments[0];
        } else if (this instanceof String) {
            self = this.valueOf();
            str = arguments[0];
        } else return false;

        if (typeof self !== 'string') return false;
        return self.indexOf(str) === 0;
    },
    endsWith: function endsWith() {
        var self, str;
        if (arguments.length == 2) {
            self = arguments[0];
            str = arguments[1];
        } else if (arguments.length == 1 && typeof this === 'string') {
            self = this;
            str = arguments[0];
        } else if (this instanceof String) {
            self = this.valueOf();
            str = arguments[0];
        } else return false;

        if (typeof self !== 'string') return false;
        return self.slice(-str.length) === str;
    },
    contains: function contains() {
        var self, str;
        if (arguments.length == 2) {
            self = arguments[0];
            str = arguments[1];
        } else if (arguments.length == 1 && typeof this === 'string') {
            self = this;
            str = arguments[0];
        } else if (this instanceof String) {
            self = this.valueOf();
            str = arguments[0];
        } else return false;

        if (typeof self !== 'string') return false;
        return self.indexOf(str) >= 0;
    }
};

},{}],20:[function(_dereq_,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _TypeSystem = _dereq_('../TypeSystem.js');

var _TypeSystem2 = _interopRequireDefault(_TypeSystem);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

_TypeSystem2.default.Class.define('$data.Logger', _TypeSystem2.default.TraceBase, null, {
    log: function log() {
        Array.prototype.unshift.call(arguments, this.getDateFormat());
        console.log.apply(console, arguments);
    },
    warn: function warn() {
        Array.prototype.unshift.call(arguments, this.getDateFormat());
        console.warn.apply(console, arguments);
    },
    error: function error() {
        Array.prototype.unshift.call(arguments, this.getDateFormat());
        console.error.apply(console, arguments);
    },

    getDateFormat: function getDateFormat() {
        var date = new Date();
        return date.getHours() + ':' + date.getMinutes() + ':' + date.getSeconds() + '.' + date.getMilliseconds();
    }
});

exports.default = _TypeSystem2.default;
module.exports = exports['default'];

},{"../TypeSystem.js":22}],21:[function(_dereq_,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _TypeSystem = _dereq_('../TypeSystem.js');

var _TypeSystem2 = _interopRequireDefault(_TypeSystem);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

_TypeSystem2.default.Class.define('$data.TraceBase', null, null, {
    log: function log() {},
    warn: function warn() {},
    error: function error() {}
});

_TypeSystem2.default.Trace = new _TypeSystem2.default.TraceBase();

exports.default = _TypeSystem2.default;
module.exports = exports['default'];

},{"../TypeSystem.js":22}],22:[function(_dereq_,module,exports){
(function (process,global){
'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; };

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.MemberDefinition = exports.Container = exports.$C = undefined;

var _initializeJayData = _dereq_('./initializeJayData.js');

var _initializeJayData2 = _interopRequireDefault(_initializeJayData);

var _jaydataErrorHandler = _dereq_('jaydata-error-handler');

var _Extensions = _dereq_('./Extensions.js');

var _Container = _dereq_('./Container.js');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/*$data.Class.MixinParameter = MixinParameter = $data.Class.define('MixinParameter', null, null, {
    constructor: function (typeName) {
        ///<param name="paramIndex" type="integer">
        this.typeName = typeName;
    },
    typeName: {}
});*/

//var e = new Entity();

/*$data.Interface = Class.define("Interface", null, null, {
    constructor: function() { Guard.raise("Can not create an interface"); }
},
{
    define: function (name, definition) {
        var result = Class.define(name, $data.Interface, null, null, definition);
        delete result.__class;
        result.__interface = true;
        return result;
    }
});

  $data.Observable = Observable = Class.define("Observable", null, null, {
    propertyChanged: { dataType: $data.Event }
}, {
    createFromInstance: function(instance) {
        var propNames = instance.getClass().memberDefinitions.f
    }
});*/

_initializeJayData2.default.StringFunctions = _Extensions.StringFunctions;

var _modelHolder = null;
_initializeJayData2.default.setModelContainer = function (modelHolder) {
  _modelHolder = modelHolder;
};

_initializeJayData2.default.defaults = _initializeJayData2.default.defaults || {};
_initializeJayData2.default.defaults.openTypeDefaultPropertyName = "dynamicProperties";
_initializeJayData2.default.defaults.openTypeDefaultType = '$data.Object';
_initializeJayData2.default.defaults.openTypeDefaultValue = function () {
  return {};
};

_initializeJayData2.default.__global = process.browser ? window : global;
_initializeJayData2.default.setGlobal = function (obj) {
  _initializeJayData2.default.__global = obj;
};

(function init($data) {

  function il(msg) {
    if (typeof intellisense !== 'undefined') {
      if (!intellisense.i) {
        intellisense.i = 0;
      }
      intellisense.i = intellisense.i + 1;
      intellisense.logMessage(msg + ":" + intellisense.i);
    }
  }

  function MemberDefinition(memberDefinitionData, definedClass) {

    ///<field name="name" type="String">*</field>
    ///<field name="dataType" type="Object">*</field>
    ///<field name="elementType" type="Object"></field>
    ///<field name="kind" type="String" />
    ///<field name="classMember" type="Boolean" />
    ///<field name="set" type="Function" />
    ///<field name="get" type="Function" />
    ///<field name="value" type="Object" />
    ///<field name="initialValue" type="Object" />
    ///<field name="method" type="Function" />
    ///<field name="enumerable" type="Boolean" />
    ///<field name="configurable" type="Boolean" />
    ///<field name="key" type="Boolean" />
    ///<field name="computed" type="Boolean" />
    ///<field name="storeOnObject" type="Boolean">[false] if false value is stored in initData, otherwise on the object</field>
    ///<field name="monitorChanges" type="Boolean">[true] if set to false propertyChange events are not raise and property tracking is disabled</field>

    this.kind = MemberTypes.property;
    //this.definedBy = definedClass;
    Object.defineProperty(this, 'definedBy', {
      value: definedClass,
      enumerable: false,
      configurable: false,
      writable: false
    });
    if (memberDefinitionData) {
      if (typeof memberDefinitionData === 'function' || typeof memberDefinitionData.asFunction === 'function') {
        this.method = memberDefinitionData;
        this.kind = MemberTypes.method;
      } else {
        this.enumerable = true;
        this.configurable = true;
        if (typeof memberDefinitionData === "number") {
          this.value = memberDefinitionData;
          this.type = $data.Number;
          this.dataType = $data.Number;
        } else if (typeof memberDefinitionData === "string") {
          this.value = memberDefinitionData;
          this.dataType = $data.String;
          this.type = $data.String;
        } else {
          for (var item in memberDefinitionData) {
            if (memberDefinitionData.hasOwnProperty(item)) {
              this[item] = memberDefinitionData[item];
            }
          }
        }
      }
      if (this.type !== undefined) {
        this.dataType = this.dataType || this.type;
      } else {
        this.type = this.dataType;
      }

      this.originalType = this.type;
      if (this.elementType !== undefined) {
        this.originalElementType = this.elementType;
      }
    }
  }
  MemberDefinition.prototype.createPropertyDescriptor = function (classFunction, value) {
    ///<returns type="Object" />
    var pd = this;
    var result = {
      enumerable: this.enumerable == undefined ? true : this.enumerable,
      configurable: this.configurable == undefined ? true : this.configurable
    };
    if (this.set && this.get) {
      result.set = this.set;
      result.get = this.get;
    } else if ("value" in this || value) {
      result.value = value || this.value;
      //TODO
      //result.writable = this.writable;
      result.writable = true;
    } else {
      result.set = function (value) {
        this.storeProperty(pd, value);
      };
      result.get = function () {
        return this.retrieveProperty(pd);
      };
    }
    return result;
  };
  MemberDefinition.prototype.createStorePropertyDescriptor = function (value) {
    var pd = this;
    return {
      enumerable: false,
      writable: true,
      configurable: pd.configurable,
      value: value
    };
  };
  MemberDefinition.prototype.createGetMethod = function () {
    var pd = this;
    return {
      enumerable: false,
      writable: false,
      configurable: false,
      value: function value(callback, tran) {
        return this.getProperty(pd, callback, tran);
      }
    };
  };
  MemberDefinition.prototype.createSetMethod = function () {
    var pd = this;
    return {
      enumerable: false,
      writable: false,
      configurable: false,
      value: function value(_value, callback, tran) {
        return this.setProperty(pd, _value, callback, tran);
      }
    };
  };
  MemberDefinition.translateDefinition = function (memDef, name, classFunction) {
    var holder = classFunction;
    var memberDefinition;

    if (memDef.type && Container.isTypeRegistered(memDef.type)) {
      holder = Container.resolveType(memDef.type);
      if (typeof holder.translateDefinition === 'function') {
        memberDefinition = holder.translateDefinition.apply(holder, arguments);
        memberDefinition.name = memberDefinition.name || name;
      } else {
        holder = classFunction;
      }
    }

    if (!(memberDefinition instanceof MemberDefinition)) {
      memberDefinition = new MemberDefinition(memberDefinition || memDef, holder);
      memberDefinition.name = name;
    }
    classFunction.resolverThunks = classFunction.resolverThunks || [];
    classFunction.childResolverThunks = classFunction.childResolverThunks || [];

    var t = memberDefinition.type;
    var et = memberDefinition.elementType;

    function addChildThunk(referencedType) {
      if (referencedType && referencedType.isAssignableTo && $data.Entity && referencedType.isAssignableTo($data.Entity)) {
        classFunction.childResolverThunks.push(function () {
          if (referencedType.resolveForwardDeclarations) {
            referencedType.resolveForwardDeclarations();
          }
        });
      }
    }

    addChildThunk(t);
    addChildThunk(et);

    if ("string" === typeof t) {
      if ("@" === t[0]) {
        memberDefinition.type = t.substr(1);
        memberDefinition.dataType = t.substr(1);
      } else {
        //forward declared types get this callback when type is registered
        classFunction.resolverThunks.push(function () {
          var rt = classFunction.container.resolveType(t);
          addChildThunk(rt);
          memberDefinition.type = rt;
          memberDefinition.dataType = rt;
        });
      }
    }

    if (et) {
      if ("string" === typeof et) {
        if ("@" === et[0]) {
          memberDefinition.elementType = et.substr(1);
        } else {
          //forward declared types get this callback when type is registered
          classFunction.resolverThunks.push(function () {
            var rt = classFunction.container.resolveType(et);
            addChildThunk(rt);
            memberDefinition.elementType = rt;
          });
        }
      }
    }

    //if (!classFunction)

    classFunction.resolveForwardDeclarations = function () {
      classFunction.resolveForwardDeclarations = function () {};
      $data.Trace.log("resolving: " + classFunction.fullName);
      this.resolverThunks.forEach(function (thunk) {
        thunk();
      });
      //this.resolverThunks = [];
      this.childResolverThunks.forEach(function (thunk) {
        thunk();
      });
      //this.childResolverThunks = [];
    };

    return memberDefinition;
  };

  MemberDefinition.prototype.toJSON = function () {
    var property = {};
    for (var name in this) {
      if (name !== 'defineBy' && name !== 'storageModel') {
        if ((name === 'type' || name === 'dataType') && this[name] && typeof this[name] === 'function') {
          try {
            property[name] = Container.resolveName(this[name]);
          } catch (e) {
            property[name] = this[name];
          }
        } else {
          property[name] = this[name];
        }
      }
    }
    return property;
  };

  $data.MemberDefinition = MemberDefinition;

  var memberDefinitionPrefix = '$';

  function MemberDefinitionCollection() {};
  MemberDefinitionCollection.prototype = {
    clearCache: function clearCache() {
      this.arrayCache = undefined;
      this.pubMapPropsCache = undefined;
      this.keyPropsCache = undefined;
      this.propByTypeCache = undefined;
      this.pubMapMethodsCache = undefined;
      this.pubMapPropNamesCache = undefined;
    },
    asArray: function asArray() {
      if (!this.arrayCache) {
        this.arrayCache = [];
        for (var i in this) {
          if (i.indexOf(memberDefinitionPrefix) === 0) this.arrayCache.push(this[i]);
        }
      }
      return this.arrayCache;
    },
    getPublicMappedProperties: function getPublicMappedProperties() {
      if (!this.pubMapPropsCache) {
        this.pubMapPropsCache = [];
        for (var i in this) {
          if (i.indexOf(memberDefinitionPrefix) === 0 && this[i].kind == 'property' && !this[i].notMapped && this[i].enumerable) this.pubMapPropsCache.push(this[i]);
        }
      }
      return this.pubMapPropsCache; // || (this.pubMapPropsCache = this.asArray().filter(function (m) { return m.kind == 'property' && !m.notMapped && m.enumerable; }));
    },
    getPublicMappedPropertyNames: function getPublicMappedPropertyNames() {
      if (!this.pubMapPropNamesCache) {
        this.pubMapPropNamesCache = [];
        for (var i in this) {
          if (i.indexOf(memberDefinitionPrefix) === 0 && this[i].kind == 'property' && !this[i].notMapped && this[i].enumerable) this.pubMapPropNamesCache.push(this[i].name);
        }
      }
      return this.pubMapPropNamesCache;
    },
    getKeyProperties: function getKeyProperties() {
      if (!this.keyPropsCache) {
        this.keyPropsCache = [];
        for (var i in this) {
          if (i.indexOf(memberDefinitionPrefix) === 0 && this[i].kind == 'property' && this[i].key) this.keyPropsCache.push(this[i]);
        }
      }
      return this.keyPropsCache;
      //return this.keyPropsCache || (this.keyPropsCache = this.asArray().filter(function (m) { return m.kind == 'property' && m.key; }));
    },
    getPublicMappedMethods: function getPublicMappedMethods() {
      if (!this.pubMapMethodsCache) {
        this.pubMapMethodsCache = [];
        for (var i in this) {
          if (i.indexOf(memberDefinitionPrefix) === 0 && this[i].kind == 'method' && this[i].method /* && this.hasOwnProperty(i)*/) this.pubMapMethodsCache.push(this[i]);
        }
      }
      return this.pubMapMethodsCache;
    },
    getPropertyByType: function getPropertyByType(type) {
      if (!this.propByTypeCache) {
        this.propByTypeCache = [];
        for (var i in this) {
          if (i.indexOf(memberDefinitionPrefix) === 0 && this[i].dataType == type) this.propByTypeCache.push(this[i]);
        }
      }
      return this.propByTypeCache;
      //return this.propByTypeCache || (this.propByTypeCache = this.asArray().filter(function (m) { return m.dataType == type; }));
    },
    getMember: function getMember(name) {
      return this[memberDefinitionPrefix + name];
    },
    setMember: function setMember(value) {
      this[memberDefinitionPrefix + value.name] = value;
    }
  };
  MemberDefinitionCollection.prototype.constructor = MemberDefinitionCollection;
  $data.MemberDefinitionCollection = MemberDefinitionCollection;

  function ClassEngineBase() {
    this.classNames = {};
  }

  function MemberTypes() {
    ///<field name="method" type="string" />
    ///<field name="property" type="string" />
    ///<field name="field" type="string" />
    ///<field name="complexProperty" type="string" />
  }
  MemberTypes.__enum = true;

  MemberTypes.method = "method";
  MemberTypes.property = "property";
  MemberTypes.navProperty = "navProperty";
  MemberTypes.complexProperty = "complexProperty";
  MemberTypes.field = "field";

  $data.MemberTypes = MemberTypes;

  //function classToJSON() {
  //    var ret = {};
  //    for (var i in this) {
  //        if (this.hasOwnProperty(i)) {
  //            ret[i] = this[i];
  //        }
  //    }
  //    return ret;
  //}
  //$data.Base.toJSON = classToJSON;

  ClassEngineBase.prototype = {

    //getClass: function (classReference) {
    //},

    //getProperties: function (classFunction) {
    //    return classFunction.propertyDefinitions;
    //},

    define: function define(className, baseClass, container, instanceDefinition, classDefinition) {
      /// <signature>
      ///     <summary>Creates a Jaydata type</summary>
      ///     <param name="className" type="String">Name of the class</param>
      ///     <param name="baseClass" type="Function">Basetype of the class</param>
      ///     <param name="interfaces" type="Object" elementType="Function" />
      ///     <param name="instanceDefinition" type="Object">Class definition (properties, methods, etc)</param>
      ///     <param name="classDefinition" type="Object">Class static definition</param>
      ///     <example>
      ///
      ///         var t = new $data.Class.define('Types.A', $data.Base, null, {
      ///             constructor: function(){ },
      ///             func1: function(){ },
      ///             member1: { type: 'string' }
      ///         }, {
      ///             staticFunc1: function() {}
      ///         })
      ///
      ///     </example>
      /// </signature>

      return this.defineEx(className, [{
        type: baseClass
      }], container, instanceDefinition, classDefinition);
    },
    defineEx: function defineEx(className, baseClasses, container, instanceDefinition, classDefinition) {
      /// <signature>
      ///     <summary>Creates a Jaydata type</summary>
      ///     <param name="className" type="String">Name of the class</param>
      ///     <param name="baseClasses" type="Array" elementType="Functions">Basetypes of the class. First is a real base, others are mixins</param>
      ///     <param name="interfaces" type="Object" elementType="Function" />
      ///     <param name="instanceDefinition" type="Object">Class definition (properties, methods, etc)</param>
      ///     <param name="classDefinition" type="Object">Class static definition</param>
      ///     <example>
      ///
      ///         var t = new $data.Class.define('Types.A', [$data.Base, $data.Mixin1, $data.Mixin2], null, {
      ///             constructor: function(){ },
      ///             func1: function(){ },
      ///             member1: { type: 'string' }
      ///         }, {
      ///             staticFunc1: function() {}
      ///         })
      ///
      ///     </example>
      /// </signature>
      /// <signature>
      ///     <summary>Creates a Jaydata type</summary>
      ///     <param name="className" type="String">Name of the class</param>
      ///     <param name="baseClasses" type="Array" elementType="Object">Basetypes of the class. First is a real base, others are mixins or propagations</param>
      ///     <param name="interfaces" type="Object" elementType="Function" />
      ///     <param name="instanceDefinition" type="Object">Class definition (properties, methods, etc)</param>
      ///     <param name="classDefinition" type="Object">Class static definition</param>
      ///     <example>
      ///
      ///         var t = new $data.Class.define('Types.A', [
      ///                         { type: $data.Base, params: [1, 'secondParameterValue', new $data.Class.ConstructorParameter(0)] },
      ///                         { type: $data.Mixin1, },
      ///                         { type: $data.Mixin2, },
      ///                         { type: $data.Propagation1, params: [new $data.Class.ConstructorParameter(1)], propagateTo:'Propagation1' },
      ///                         { type: $data.Propagation2, params: ['firstParameterValue'], propagateTo:'Propagation2' }
      ///                     ], null, {
      ///             constructor: function(){ },
      ///             func1: function(){ },
      ///             member1: { type: 'string' }
      ///         }, {
      ///             staticFunc1: function() {}
      ///         })
      ///
      ///     </example>
      /// </signature>

      container = container || $data.Container;

      if (baseClasses.length == 0) {
        baseClasses.push({
          type: $data.Base
        });
      } else if (baseClasses.length > 0 && !baseClasses[0].type) {
        baseClasses[0].type = $data.Base;
      }
      for (var i = 0, l = baseClasses.length; i < l; i++) {
        if (typeof baseClasses[i] === 'function') baseClasses[i] = {
          type: baseClasses[i]
        };
      }

      var providedCtor = instanceDefinition ? instanceDefinition.constructor : undefined;

      var classNameParts = className.split('.');
      var shortClassName = classNameParts.splice(classNameParts.length - 1, 1)[0];

      $data.models = $data.models || {};
      var root = container === $data.Container ? $data.models : container;
      root = $data.Container.createOrGetNamespace(classNameParts, root);

      var classFunction = null;
      classFunction = this.classFunctionBuilder(shortClassName, baseClasses, classDefinition, instanceDefinition);
      classFunction.fullName = className;
      classFunction.namespace = classNameParts.join('.'); //classname splitted
      //classFunction.name = shortClassName;
      classFunction.container = container;
      classFunction.container.registerType(className, classFunction);

      this.buildType(classFunction, baseClasses, instanceDefinition, classDefinition);

      if (typeof intellisense !== 'undefined') {
        if (instanceDefinition && instanceDefinition.constructor) {
          intellisense.annotate(classFunction, instanceDefinition.constructor);
        }
      }

      root[shortClassName] = this.classNames[className] = classFunction;

      if (classNameParts[0] == '$data') {
        var _classNameParts = [].concat(classNameParts);
        _classNameParts.shift();
        var _root = $data.Container.createOrGetNamespace(_classNameParts, $data);
        _root[shortClassName] = classFunction;
      }
      if (_modelHolder && container == $data.Container) {
        var innerNS = $data.Container.createOrGetNamespace(classNameParts, _modelHolder);
        innerNS[shortClassName] = classFunction;
      }

      //classFunction.toJSON = classToJSON;
      var baseCount = classFunction.baseTypes.length;
      for (var i = 0; i < baseCount; i++) {
        var b = classFunction.baseTypes[i];
        if ("inheritedTypeProcessor" in b) {
          b.inheritedTypeProcessor(classFunction);
        }
      }
      //classFunction.prototype.constructor = instanceDefinition.constructor;
      //classFunction.constructor = instanceDefinition.constructor;
      //classFunction.toJSON = function () { return classFunction.memberDefinitions.filter( function(md) { return md; };
      return classFunction;
    },
    classFunctionBuilder: function classFunctionBuilder(name, base, classDefinition, instanceDefinition) {
      var body = this.bodyBuilder(base, classDefinition, instanceDefinition);
      return new Function('base', 'classDefinition', 'instanceDefinition', 'name', '$data', 'return function ' + name + ' (){ ' + body + ' \n}; ')(base, classDefinition, instanceDefinition, name, $data);
    },
    bodyBuilder: function bodyBuilder(bases, classDefinition, instanceDefinition) {
      var mixin = '';
      var body = '';
      var propagation = '';

      for (var i = 0, l = bases.length; i < l; i++) {
        var base = bases[i];
        var index = i;
        if (index == 0) {
          //ctor func
          if (base && base.type && base.type !== $data.Base && base.type.fullName) {
            body += '    var baseArguments = $data.typeSystem.createCtorParams(arguments, base[' + index + '].params, this); \n';
            body += '    $data.models.' + base.type.fullName + '.apply(this, baseArguments); \n';
          }
        } else {
          if (base && base.type && base.propagateTo) {
            //propagation
            propagation += '    ' + (!propagation ? 'var ' : '' + '') + 'propagationArguments = $data.typeSystem.createCtorParams(arguments, base[' + index + '].params, this); \n';
            propagation += '    this["' + base.propagateTo + '"] =  Object.create($data.models.' + base.type.fullName + '.prototype); \n' + '    $data.models.' + base.type.fullName + '.apply(this["' + base.propagateTo + '"], propagationArguments); \n';
          } else if (base && base.type && base.type.memberDefinitions && base.type.memberDefinitions.$constructor && !base.propagateTo) {
            //mixin
            mixin += '    $data.models.' + base.type.fullName + '.memberDefinitions.$constructor.method.apply(this); \n';
          }
        }
      }
      if (instanceDefinition && instanceDefinition.constructor != Object) body += "    instanceDefinition.constructor.apply(this, arguments); \n";

      return '\n    //mixins \n' + mixin + '\n    //construction \n' + body + '\n    //propagations \n' + propagation;
    },

    buildType: function buildType(classFunction, baseClasses, instanceDefinition, classDefinition) {
      var baseClass = baseClasses[0].type;
      classFunction.inheritsFrom = baseClass;

      if (baseClass) {
        classFunction.prototype = Object.create(baseClass.prototype);
        classFunction.memberDefinitions = Object.create(baseClass.memberDefinitions || new MemberDefinitionCollection());
        classFunction.memberDefinitions.clearCache();

        var staticDefs = baseClass.staticDefinitions;
        if (staticDefs) {
          staticDefs = staticDefs.asArray();
          if (staticDefs) {
            for (var i = 0; i < staticDefs.length; i++) {
              this.buildMember(classFunction, staticDefs[i], undefined, 'staticDefinitions');
            }
          }
        }
        classFunction.baseTypes = baseClass.baseTypes ? [].concat(baseClass.baseTypes) : [];
        for (var i = 0; i < baseClasses.length; i++) {
          classFunction.baseTypes.push(baseClasses[i].type);
        }
        //classFunction.baseTypes = (baseClass.baseTypes || []).concat(baseClasses.map(function (base) { return base.type; }));
        if (!classFunction.isAssignableTo) {
          Object.defineProperty(classFunction, "isAssignableTo", {
            value: function value(type) {
              return this === type || this.baseTypes.indexOf(type) >= 0;
            },
            writable: false,
            enumerable: false,
            configurable: false
          });
        }
      }

      var openTypeDefinition = classFunction.staticDefinitions && classFunction.staticDefinitions.getMember('openType');
      if (classDefinition) {
        if (openTypeDefinition) delete classDefinition.openType;
        this.buildStaticMembers(classFunction, classDefinition);

        if (classDefinition.constructor) classFunction.classConstructor = classDefinition.constructor;
      }

      if (instanceDefinition) {

        //build open type member
        if (!openTypeDefinition && classDefinition && (typeof classFunction.openType === "string" || classFunction.openType === true) && classFunction.isAssignableTo($data.Entity)) {
          var openTypePropertyName = $data.defaults.openTypeDefaultPropertyName;
          var openTypeDefaultType = Container.resolveType($data.defaults.openTypeDefaultType);
          var openTypeDefaultValue = $data.defaults.openTypeDefaultValue;
          if (typeof classFunction.openType == "string") {
            openTypePropertyName = classFunction.openType;
          }

          var definedOpenTypeMember = classFunction.getMemberDefinition(openTypePropertyName);
          if (definedOpenTypeMember && Container.resolveType(definedOpenTypeMember.type || definedOpenTypeMember.dataType) !== openTypeDefaultType) {
            _jaydataErrorHandler.Guard.raise(new _jaydataErrorHandler.Exception("Type Error", "OpenType default type missmatch"));
          }
          if (!definedOpenTypeMember && instanceDefinition[openTypePropertyName]) {
            var memberType = Container.resolveType(instanceDefinition[openTypePropertyName].type || instanceDefinition[openTypePropertyName].dataType);
            if (memberType !== openTypeDefaultType) {
              _jaydataErrorHandler.Guard.raise(new _jaydataErrorHandler.Exception("Type Error", "OpenType default type missmatch"));
            }
          }
          if (!definedOpenTypeMember && !instanceDefinition[openTypePropertyName]) {
            var defaultValue = typeof openTypeDefaultValue !== "undefined" ? openTypeDefaultValue : function () {
              return {};
            };
            instanceDefinition[openTypePropertyName] = { type: openTypeDefaultType, defaultValue: defaultValue };
          }
        }

        this.buildInstanceMembers(classFunction, instanceDefinition);
      }

      var mixins = [].concat(baseClasses);
      mixins.shift();
      if (Object.keys(mixins).length > 0) this.buildInstanceMixins(classFunction, mixins);

      classFunction.__class = true;

      classFunction.prototype.constructor = classFunction;

      Object.defineProperty(classFunction.prototype, "getType", {
        value: function value() {
          return classFunction;
        },
        writable: false,
        enumerable: false,
        configurable: false
      });
    },

    addMethod: function addMethod(holder, name, method, propagation) {
      if (!propagation || typeof intellisense !== 'undefined') {
        holder[name] = method;
      } else {
        holder[name] = function () {
          return method.apply(this[propagation], arguments);
        };
      }
    },

    addProperty: function addProperty(holder, name, propertyDescriptor, propagation) {

      //holder[name] = {};

      if (propagation) {
        propertyDescriptor.configurable = true;
        if (propertyDescriptor.get) {
          var origGet = propertyDescriptor.get;
          propertyDescriptor.get = function () {
            if (!this[propagation]) _jaydataErrorHandler.Guard.raise(new _jaydataErrorHandler.Exception("not inicialized"));
            return origGet.apply(this[propagation], arguments);
          };
        }
        if (propertyDescriptor.set) {
          var origSet = propertyDescriptor.set;
          propertyDescriptor.set = function () {
            if (!this[propagation]) _jaydataErrorHandler.Guard.raise(new _jaydataErrorHandler.Exception("not inicialized"));
            origSet.apply(this[propagation], arguments);
          };
        }
      }

      Object.defineProperty(holder, name, propertyDescriptor);
    },

    addField: function addField(holder, name, field) {
      _jaydataErrorHandler.Guard.raise("not implemented");
    },

    buildMethod: function buildMethod(classFunction, memberDefinition, propagation) {
      ///<param name="classFunction" type="Function">The object that will receive member</param>
      ///<param name="memberDefinition" type="MemberDefinition">the newly added member</param>
      var holder = memberDefinition.classMember ? classFunction : classFunction.prototype;
      this.addMethod(holder, memberDefinition.name, memberDefinition.method, propagation);
    },

    buildProperty: function buildProperty(classFunction, memberDefinition, propagation) {
      ///<param name="classFunction" type="Function">The object that will receive member</param>
      ///<param name="memberDefinition" type="MemberDefinition">the newly added member</param>
      var holder = memberDefinition.classMember ? classFunction : classFunction.prototype;
      var pd = memberDefinition.createPropertyDescriptor(classFunction);
      this.addProperty(holder, memberDefinition.name, pd, propagation);

      //if lazyload TODO
      if (!memberDefinition.classMember && classFunction.__setPropertyfunctions == true && memberDefinition.withoutGetSetMethod !== true && !('get_' + memberDefinition.name in holder || 'set_' + memberDefinition.name in holder)) {
        var pdGetMethod = memberDefinition.createGetMethod();
        this.addProperty(holder, 'get_' + memberDefinition.name, pdGetMethod, propagation);

        var pdSetMethod = memberDefinition.createSetMethod();
        this.addProperty(holder, 'set_' + memberDefinition.name, pdSetMethod, propagation);
      }
    },

    buildMember: function buildMember(classFunction, memberDefinition, propagation, memberCollectionName) {
      ///<param name="memberDefinition" type="MemberDefinition" />
      memberCollectionName = memberCollectionName || 'memberDefinitions';
      classFunction[memberCollectionName] = classFunction[memberCollectionName] || new MemberDefinitionCollection();
      classFunction[memberCollectionName].setMember(memberDefinition);

      switch (memberDefinition.kind) {
        case MemberTypes.method:
          this.buildMethod(classFunction, memberDefinition, propagation);
          break;
        case MemberTypes.navProperty:
        case MemberTypes.complexProperty:
        case MemberTypes.property:
          this.buildProperty(classFunction, memberDefinition, propagation);
          break;
        default:
          _jaydataErrorHandler.Guard.raise("Unknown member type: " + memberDefinition.kind + "," + memberDefinition.name);
      }
    },

    buildStaticMembers: function buildStaticMembers(classFunction, memberListDefinition) {
      ///<param name="classFunction" type="Object">The class constructor that will be extended</param>
      ///<param name="memberListDefinition" type="Object"></param>
      var t = this;
      for (var item in memberListDefinition) {
        if (memberListDefinition.hasOwnProperty(item)) {
          var memberDefinition = MemberDefinition.translateDefinition(memberListDefinition[item], item, classFunction);
          memberDefinition.classMember = true;
          t.buildMember(classFunction, memberDefinition, undefined, 'staticDefinitions');
        }
      }
    },

    buildInstanceMembers: function buildInstanceMembers(classFunction, memberListDefinition) {
      ///<param name="classFunction" type="Function">The class constructor whose prototype will be extended</param>
      ///<param name="memberListDefinition" type="Object"></param>
      ///pinning t outside of the closure seems actually faster then passing in the this  and referencing
      var t = this;
      for (var item in memberListDefinition) {
        if (memberListDefinition.hasOwnProperty(item)) {
          var memberDefinition = MemberDefinition.translateDefinition(memberListDefinition[item], item, classFunction);
          t.buildMember(classFunction, memberDefinition, undefined, 'memberDefinitions');
        }
      }
    },

    copyMembers: function copyMembers(sourceType, targetType) {
      ///<param name="sourceType" type="Function" />
      ///<param name="targetType" type="Function" />
      function il(msg) {
        if (typeof intellisense === 'undefined') {
          return;
        }
        intellisense.logMessage(msg);
      }

      Object.keys(sourceType.prototype).forEach(function (item, i, src) {
        if (item !== 'constructor' && item !== 'toString') {
          il("copying item:" + item);
          targetType.prototype[item] = sourceType[item];
        }
      });
    },

    buildInstanceMixins: function buildInstanceMixins(classFunction, mixinList) {
      ///<param name="classFunction" type="Function">The class constructor whose prototype will be extended</param>
      ///<param name="mixinList" type="Array"></param>

      classFunction.mixins = classFunction.mixins || [];
      classFunction.propagations = classFunction.propagations || [];

      for (var i = 0; i < mixinList.length; i++) {
        var item = mixinList[i];
        //if (classFunction.memberDefinitions.getMember(item.type.name)) {
        if (item.propagateTo) {
          this.buildInstancePropagation(classFunction, item);
          classFunction.propagations.push(item);
          classFunction.propagations[item.type.name] = true;
        } else {
          this.buildInstanceMixin(classFunction, item);
          classFunction.mixins.push(item);
          classFunction.mixins[item.type.name] = true;
        }
      };
    },
    buildInstanceMixin: function buildInstanceMixin(classFunction, typeObj) {
      ///<param name="classFunction" type="Function">The class constructor whose prototype will be extended</param>
      ///<param name="typeObj" type="Object"></param>

      var memberDefs = typeObj.type.memberDefinitions.asArray();
      for (var i = 0, l = memberDefs.length; i < l; i++) {
        var itemName = memberDefs[i].name;
        if (itemName !== 'constructor' && !classFunction.memberDefinitions.getMember(itemName)) {
          this.buildMember(classFunction, memberDefs[i]);
        }
      }

      if (typeObj.type.staticDefinitions) {
        var staticDefs = typeObj.type.staticDefinitions.asArray();
        for (var i = 0, l = staticDefs.length; i < l; i++) {
          var itemName = staticDefs[i].name;
          if (itemName !== 'constructor' && !classFunction.memberDefinitions.getMember(itemName)) {
            this.buildMember(classFunction, staticDefs[i], undefined, 'staticDefinitions');
          }
        }
      }
    },
    buildInstancePropagation: function buildInstancePropagation(classFunction, typeObj) {
      ///<param name="classFunction" type="Function">The class constructor whose prototype will be extended</param>
      ///<param name="typeObj" type="Object"></param>

      var memberDefs = typeObj.type.memberDefinitions.asArray();
      for (var i = 0, l = memberDefs.length; i < l; i++) {
        var itemName = memberDefs[i].name;
        if (itemName !== 'constructor' && !classFunction.memberDefinitions.getMember(itemName)) {
          this.buildMember(classFunction, memberDefs[i], typeObj.propagateTo);
        }
      }
    }

  };
  var Class;
  $data.Class = Class = new ClassEngineBase();

  $data.ContainerClass = _Container.ContainerCtor;

  var c;
  $data.Container = c = _Container.ContainerInstance;

  $data.createContainer = function () {
    return new _Container.ContainerCtor($data.Container);
  };

  var storeProperty = function storeProperty(memberDefinition, value) {
    var backingFieldName = "_" + memberDefinition.name;
    if (!this[backingFieldName]) {
      Object.defineProperty(this, backingFieldName, memberDefinition.createStorePropertyDescriptor(value));
    } else {
      this[backingFieldName] = value;
    }
  };
  var retrieveProperty = function retrieveProperty(memberDefinition) {
    var backingFieldName = "_" + memberDefinition.name;
    return this[backingFieldName];
  };

  $data.Class.define('$data.Base', function Base() {}, null, {
    storeProperty: storeProperty,
    retrieveProperty: retrieveProperty,
    setProperty: function setProperty(memberDefinition, value, callback) {
      this[memberDefinition.name] = value;
      callback();
    },
    getProperty: function getProperty(memberDefinition, callback) {
      callback.apply(this, [this[memberDefinition.name]]);
    }
  }, {
    create: function create() {
      return Container.createInstance(this, arguments);
    },
    extend: function extend(name, container, instanceDefinition, classDefinition) {
      if (container && !(container instanceof _Container.ContainerCtor)) {
        classDefinition = instanceDefinition;
        instanceDefinition = container;
        container = undefined;
      }
      return $data.Class.define(name, this, container, instanceDefinition, classDefinition);
    },
    getMemberDefinition: function getMemberDefinition(name) {
      return this.memberDefinitions.getMember(name);
    },
    addProperty: function addProperty(name, getterOrType, setterOrGetter, setter) {
      var _getter = getterOrType;
      var _setter = setterOrGetter;
      var _type;
      if (typeof _getter === 'string') {
        _type = getterOrType;
        _getter = setterOrGetter;
        _setter = setter;
      }

      var propDef = {
        notMapped: true,
        storeOnObject: true,
        get: typeof _getter === 'function' ? _getter : function () {},
        set: typeof _setter === 'function' ? _setter : function () {},
        type: _type
      };

      var memberDefinition = MemberDefinition.translateDefinition(propDef, name, this);
      $data.Class.buildMember(this, memberDefinition);

      this.memberDefinitions.clearCache();

      return this;
    },
    addMember: function addMember(name, definition, isClassMember) {
      var memberDefinition = MemberDefinition.translateDefinition(definition, name, this);

      if (isClassMember) {
        memberDefinition.classMember = true;
        $data.Class.buildMember(this, memberDefinition, undefined, 'staticDefinitions');
        this.staticDefinitions.clearCache();
      } else {
        $data.Class.buildMember(this, memberDefinition);
        this.memberDefinitions.clearCache();
      }
      return this;
    },
    describeField: function describeField(name, definition) {
      var memDef = this.memberDefinitions.getMember(name);
      if (!memDef) {
        this.addMember(name, definition);
      } else {
        _jaydataErrorHandler.Guard.raise(new _jaydataErrorHandler.Exception("Field '" + name + "' already defined!", "Invalid operation"));
      }
      return this;
    },
    storeProperty: storeProperty,
    retrieveProperty: retrieveProperty,
    'from$data.Object': function from$dataObject(value) {
      return value;
    }
  });

  //override after typeSystem initialized

  $data.Class.ConstructorParameter = $data.Class.define('ConstructorParameter', null, null, {
    constructor: function constructor(paramIndex) {
      ///<param name="paramIndex" type="integer" />
      this.paramIndex = paramIndex;
    },
    paramIndex: {}
  });
})(_initializeJayData2.default);

_initializeJayData2.default.defaultErrorCallback = function () {
  //console.log('DEFAULT ERROR CALLBACK:');
  /*if (console.dir)
      console.dir(arguments);
  else
      console.log(arguments);*/
  if (arguments.length > 0 && arguments[arguments.length - 1] && typeof arguments[arguments.length - 1].reject === 'function') {
    (console.error || console.log).call(console, arguments[0]);
    arguments[arguments.length - 1].reject.apply(arguments[arguments.length - 1], arguments);
  } else {
    if (arguments[0] instanceof Error) {
      _jaydataErrorHandler.Guard.raise(arguments[0]);
    } else {
      _jaydataErrorHandler.Guard.raise(new _jaydataErrorHandler.Exception("DEFAULT ERROR CALLBACK!", "DefaultError", arguments));
    }
  }
};
_initializeJayData2.default.defaultSuccessCallback = function () {/*console.log('DEFAULT SUCCES CALLBACK');*/};
_initializeJayData2.default.defaultNotifyCallback = function () {/*console.log('DEFAULT NOTIFY CALLBACK');*/};

_initializeJayData2.default.typeSystem = {
  __namespace: true,
  /*inherit: function (ctor, baseType) {
      var proto = new baseType();
      ctor.prototype = $.extend(proto, ctor.prototype);
      //console.dir(proto);
      ctor.prototype.base = new baseType();
      //console.dir(ctor.prototype.base);
      ctor.prototype.constructor = ctor;
      return ctor;
  },*/
  //mix: function (type, mixin) {
  //    type.prototype = $.extend(type.prototype || {}, mixin.prototype || {});
  //    type.mixins = type.mixins || [];
  //    type.mixins.push(mixin);
  //    return type;
  //},
  extend: function extend(target) {
    /// <summary>
    /// Extends an object with properties of additional parameters.
    /// </summary>
    /// <signature>
    /// <param name="target" type="Object">Object that will be extended.</param>
    /// <param name="object" type="Object">Object to extend target with.</param>
    /// <param name="objectN" optional="true" parameterArray="true" type="Object">Object to extend target with.</param>
    /// </signature>
    /// <returns></returns>
    if ((typeof target === 'undefined' ? 'undefined' : _typeof(target)) !== 'object' && typeof target !== 'function') _jaydataErrorHandler.Guard.raise('Target must be object or function');

    for (var i = 1; i < arguments.length; i++) {
      var obj = arguments[i];
      if (obj === null || typeof obj === 'undefined') continue;
      for (var key in obj) {
        target[key] = obj[key];
      }
    }
    return target;
  },
  createCallbackSetting: function createCallbackSetting(callBack, defaultSetting) {
    var setting = {
      success: _initializeJayData2.default.defaultSuccessCallback,
      error: _initializeJayData2.default.defaultErrorCallback,
      notify: _initializeJayData2.default.defaultNotifyCallback
    };

    if (defaultSetting != undefined && defaultSetting != null) {
      setting = defaultSetting;
    }

    var result;
    if (callBack == null || callBack == undefined) {
      result = setting;
    } else if (typeof callBack == 'function') {
      result = this.extend(setting, {
        success: callBack
      });
    } else {
      result = this.extend(setting, callBack);
    }

    function wrapCode(fn) {
      var t = this;

      function r() {
        fn.apply(t, arguments);
        fn = function fn() {};
      }
      return r;
    }

    if (typeof result.error === 'function') result.error = wrapCode(result.error);

    return result;
  },
  createCtorParams: function createCtorParams(source, indexes, thisObj) {
    ///<param name="source" type="Array" />Paramerter array
    ///<param name="indexes" type="Array" />
    ///<param name="thisObj" type="Object" />
    if (indexes) {
      var paramArray = [];
      for (var i = 0, l = indexes.length; i < l; i++) {
        var item = i;
        if (indexes[item] instanceof _initializeJayData2.default.Class.ConstructorParameter) paramArray.push(source[indexes[item].paramIndex]);else if (typeof indexes[item] === "function") paramArray.push(indexes[item].apply(thisObj));else paramArray.push(indexes[item]);
      }
      return paramArray;
    }
    return source;
  },
  writePropertyValues: function writePropertyValues(obj) {
    if (obj && obj.getType && obj.getType().memberDefinitions) {
      this.writeProperties(obj, obj.getType().memberDefinitions.asArray().filter(function (md) {
        return (md.kind == "property" || md.kind == "navProperty" || md.kind == "complexProperty") && !md.prototypeProperty;
      }));
    }
  },
  writeProperties: function writeProperties(obj, members) {
    var defines = {};
    for (var i = 0, l = members.length; i < l; i++) {
      var memDef = members[i];
      defines[memDef.name] = memDef.createPropertyDescriptor(null, memDef.value);
    }

    Object.defineProperties(obj, defines);
  },
  writeProperty: function writeProperty(obj, member, value) {
    var memDef = typeof member === 'string' ? obj.getType().memberDefinitions.getMember(member) : member;
    if (memDef) {
      var propDef = memDef.createPropertyDescriptor(null, value);
      //////OPTIMIZATION
      Object.defineProperty(obj, memDef.name, propDef);
    }
  }
};

_initializeJayData2.default.debug = function () {
  (console.debug || console.log).apply(console, arguments);
};

_initializeJayData2.default.debugWith = function () {
  var cArgs = arguments;
  return function (r) {
    (console.debug || console.log).apply(console, cArgs);
    if (typeof Error !== 'undefined' && r instanceof Error || typeof _jaydataErrorHandler.Exception !== 'undefined' && r instanceof _jaydataErrorHandler.Exception) {
      (console.error || console.log).apply(console, arguments);
    } else {
      (console.debug || console.log).apply(console, arguments);
    }
  };
};

_initializeJayData2.default.fdebug = {
  success: _initializeJayData2.default.debugWith('success'),
  error: _initializeJayData2.default.debugWith('error')
};

var $C = exports.$C = function $C() {
  _initializeJayData2.default.Class.define.apply(_initializeJayData2.default.Class, arguments);
};
var Container = exports.Container = _initializeJayData2.default.Container;
var MemberDefinition = exports.MemberDefinition = _initializeJayData2.default.MemberDefinition;
exports.default = _initializeJayData2.default;

}).call(this,_dereq_('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"./Container.js":18,"./Extensions.js":19,"./initializeJayData.js":33,"_process":14,"jaydata-error-handler":7}],23:[function(_dereq_,module,exports){
(function (global){
'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; };

var _TypeSystem = _dereq_('../TypeSystem.js');

var _TypeSystem2 = _interopRequireDefault(_TypeSystem);

var _jaydataErrorHandler = _dereq_('jaydata-error-handler');

var _btoa = (typeof window !== "undefined" ? window['btoa'] : typeof global !== "undefined" ? global['btoa'] : null);

var _btoa2 = _interopRequireDefault(_btoa);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var bufferOrArray = eval('typeof Buf' + 'fer !== "undefined" ? Buf' + 'fer : Uint8Array');
_TypeSystem2.default.Blob = function Blob() {};

_TypeSystem2.default.Blob.createFromHexString = function (value) {
    if (value != value.match(new RegExp('[0-9a-fA-F]+'))[0]) {
        _jaydataErrorHandler.Guard.raise(new _jaydataErrorHandler.Exception('TypeError: ', 'value not convertable to $data.Blob', value));
    } else {
        //if (value.length & 1) value = '0' + value;
        var arr = new bufferOrArray(value.length >> 1);
        for (var i = 0, j = 1, k = 0; i < value.length; i += 2, j += 2, k++) {
            arr[k] = parseInt('0x' + value[i] + value[j], 16);
        }

        return arr;
    }
};

_TypeSystem2.default.Blob.toString = function (value) {
    if (!value || !value.length) return null;
    var s = '';
    for (var i = 0; i < value.length; i++) {
        s += String.fromCharCode(value[i]);
    }

    return s;
};

_TypeSystem2.default.Blob.toBase64 = function (value) {
    if (!value || !value.length) return null;
    return (0, _btoa2.default)(_TypeSystem2.default.Blob.toString(value));
};

_TypeSystem2.default.Blob.toArray = function (src) {
    if (!src || !src.length) return null;
    var arr = new Array(src.length);
    for (var i = 0; i < src.length; i++) {
        arr[i] = src[i];
    }

    return arr;
};

/*$data.Blob.toJSON = function(value){
    return JSON.stringify($data.Blob.toArray(value));
};*/

_TypeSystem2.default.Blob.toHexString = function (value) {
    if (!value || !value.length) return null;
    var s = '';
    for (var i = 0; i < value.length; i++) {
        s += ('00' + value[i].toString(16)).slice(-2);
    }

    return s.toUpperCase();
};

_TypeSystem2.default.Blob.toDataURL = function (value) {
    if (!value || !value.length) return null;
    return 'data:application/octet-stream;base64,' + (0, _btoa2.default)(_TypeSystem2.default.Blob.toString(value));
};

_TypeSystem2.default.Container.registerType(["$data.Blob", "blob", "JayBlob"], _TypeSystem2.default.Blob);
_TypeSystem2.default.Container.registerConverter('$data.Blob', {
    '$data.String': function $dataString(value) {
        if (value && value.length) {
            var blob = new bufferOrArray(value.length);
            for (var i = 0; i < value.length; i++) {
                blob[i] = value.charCodeAt(i);
            }

            return blob;
        } else return null;
    },
    '$data.Array': function $dataArray(value) {
        return new bufferOrArray(value);
    },
    '$data.Number': function $dataNumber(value) {
        return new bufferOrArray(_TypeSystem2.default.packIEEE754(value, 11, 52).reverse());
    },
    '$data.Boolean': function $dataBoolean(value) {
        return new bufferOrArray([value | 0]);
    },
    'default': function _default(value) {
        if (typeof Blob !== 'undefined' && value instanceof Blob) {
            var req = new XMLHttpRequest();
            req.open('GET', URL.createObjectURL(value), false);
            req.send(null);
            return _TypeSystem2.default.Container.convertTo(req.response, _TypeSystem2.default.Blob);
        } else if (typeof ArrayBuffer !== 'undefined' && value instanceof ArrayBuffer) {
            return new bufferOrArray(new Uint8Array(value));
        } else if (value instanceof Uint8Array) {
            //if (typeof Buffer !== 'undefined') return new Buffer(value);
            //else
            return value;
        } else /*if (typeof Buffer !== 'undefined' ? value instanceof Buffer : false){
               return value;
               }else*/if (value.buffer) {
                return new bufferOrArray(value);
            } else if ((typeof value === 'undefined' ? 'undefined' : _typeof(value)) == 'object' && value instanceof Object) {
                var arr = [];
                for (var i in value) {
                    arr[i] = value[i];
                }
                if (!arr.length) throw 0;
                return new bufferOrArray(arr);
            }
        throw 0;
    }
}, {
    '$data.String': function $dataString(value) {
        return _TypeSystem2.default.Blob.toString(value);
    },
    '$data.Array': function $dataArray(value) {
        return _TypeSystem2.default.Blob.toArray(value);
    }
});

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"../TypeSystem.js":22,"jaydata-error-handler":7}],24:[function(_dereq_,module,exports){
'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; };

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _TypeSystem = _dereq_('../TypeSystem.js');

var _TypeSystem2 = _interopRequireDefault(_TypeSystem);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

_TypeSystem2.default.Container.registerConverter('$data.Boolean', {
    '$data.String': function $dataString(value) {
        if (value.toLowerCase() == 'true') return true;
        if (value.toLowerCase() == 'false') return false;

        return !!value;
    },
    'default': function _default(value) {
        return !!value;
    }
});

_TypeSystem2.default.Container.registerConverter('$data.Integer', {
    'default': function _default(value) {
        if (value === Number.POSITIVE_INFINITY || value === Number.NEGATIVE_INFINITY || value === Number.MAX_VALUE || value === Number.MIN_VALUE) {
            return value;
        }

        var r = parseInt(+value, 10);
        if (isNaN(r)) throw 0;
        return r;
    }
});

_TypeSystem2.default.Container.registerConverter('$data.Int32', {
    'default': function _default(value) {
        return value | 0;
    }
});

_TypeSystem2.default.Container.registerConverter('$data.Number', {
    'default': function _default(value) {
        var r = +value;
        if (isNaN(r)) throw 0;
        return r;
    }
});

_TypeSystem2.default.Container.registerConverter('$data.Byte', {
    'default': function _default(value) {
        return (value | 0) & 0xff;
    }
});

_TypeSystem2.default.Container.registerConverter('$data.Date', {
    'default': function _default(value) {
        var d = new Date(value);
        if (isNaN(d)) throw 0;
        return d;
    }
});

_TypeSystem2.default.Container.registerConverter('$data.DateTimeOffset', {
    '$data.Date': function $dataDate(value) {
        return value;
    },
    'default': function _default(value) {
        var d = new Date(value);
        if (isNaN(d)) throw 0;
        return d;
    }
});
(function () {
    function parseFromString(value) {
        var regex = /^([0-9]|0[0-9]|1[0-9]|2[0-3]):([0-5][0-9]|[0-9])(:([0-5][0-9]|[0-9])(\.(\d+))?)?$/;

        var matches = regex.exec(value);
        if (!matches) throw 0;
        var time = '';
        time += ('00' + matches[1]).slice(-2);
        time += ':' + ('00' + matches[2]).slice(-2);
        if (matches[4]) {
            time += ':' + ('00' + matches[4]).slice(-2);
        } else {
            time += ':00';
        }
        if (matches[6]) time += '.' + (matches[6] + '000').slice(0, 3);

        return time;
    }

    _TypeSystem2.default.Container.registerConverter('$data.Time', {
        '$data.String': parseFromString,
        '$data.Number': function tt(value) {
            var metrics = [1000, 60, 60];
            var result = [0, 0, 0, value | 0];

            for (var i = 0; i < metrics.length; i++) {
                result[metrics.length - (i + 1)] = result[metrics.length - i] / metrics[i] | 0;
                result[metrics.length - i] -= result[metrics.length - (i + 1)] * metrics[i];
            }

            var time = '';
            for (var i = 0; i < result.length; i++) {
                if (i < result.length - 1) {
                    time += ('00' + result[i]).slice(-2);
                    if (i < result.length - 2) time += ':';
                } else {
                    time += '.' + ('000' + result[i]).slice(-3);
                }
            }

            return parseFromString(time);
        },
        '$data.Date': function $dataDate(value) {
            var val = value.getHours() + ':' + value.getMinutes() + ':' + value.getSeconds();
            var ms = value.getMilliseconds();
            if (ms) {
                val += '.' + ms;
            }

            return parseFromString(val);
        }
    });
})();
(function () {
    function parseFromString(value) {
        var regex = /^(-?)([0-9]{1,4})-(1[0-2]|0[0-9]|[0-9])-([0-2][0-9]|3[0-1]|[0-9])$/;

        var matches = regex.exec(value);
        if (!matches) throw 0;
        var date = matches[1];
        date += ('0000' + matches[2]).slice(-4);
        date += '-' + ('00' + matches[3]).slice(-2);
        date += '-' + ('00' + matches[4]).slice(-2);
        return date;
    }
    function parseFromDate(value) {
        var val = value.getFullYear() + '-' + (value.getMonth() + 1) + '-' + value.getDate();
        return parseFromString(val);
    }

    _TypeSystem2.default.Container.registerConverter('$data.Day', {
        '$data.String': parseFromString,
        '$data.Number': function tt(value) {
            var t = 1000 * 60 * 60 * 24;
            var day = value * t;
            if (isNaN(day)) throw 0;

            return parseFromDate(new Date(day));
        },
        '$data.Date': parseFromDate
    });
})();
(function () {
    function parseFromString(value) {
        return value;
    }

    _TypeSystem2.default.Container.registerConverter('$data.Duration', {
        '$data.String': parseFromString
    });
})();
_TypeSystem2.default.Container.registerConverter('$data.Decimal', {
    '$data.Boolean': function $dataBoolean(value) {
        return value ? '1' : '0';
    },
    '$data.Number': function $dataNumber(value) {
        return value.toString();
    },
    '$data.String': function $dataString(value) {
        if (!/^\-?([0-9]+(\.[0-9]+)?|Infinity)$/.test(value)) throw 0;
        return value;
    },
    '$data.Date': function $dataDate(value) {
        var r = value.valueOf();
        if (isNaN(r)) throw 0;
        return r.toString();
    }
});

_TypeSystem2.default.packIEEE754 = function (v, ebits, fbits) {
    var bias = (1 << ebits - 1) - 1,
        s,
        e,
        f,
        ln,
        i,
        bits,
        str,
        bytes;

    // Compute sign, exponent, fraction
    if (v !== v) {
        // NaN
        // http://dev.w3.org/2006/webapi/WebIDL/#es-type-mapping
        e = (1 << bias) - 1;f = Math.pow(2, fbits - 1);s = 0;
    } else if (v === Infinity || v === -Infinity) {
        e = (1 << bias) - 1;f = 0;s = v < 0 ? 1 : 0;
    } else if (v === 0) {
        e = 0;f = 0;s = 1 / v === -Infinity ? 1 : 0;
    } else {
        s = v < 0;
        v = Math.abs(v);

        if (v >= Math.pow(2, 1 - bias)) {
            // Normalized
            ln = Math.min(Math.floor(Math.log(v) / Math.LN2), bias);
            e = ln + bias;
            f = Math.round(v * Math.pow(2, fbits - ln) - Math.pow(2, fbits));
        } else {
            // Denormalized
            e = 0;
            f = Math.round(v / Math.pow(2, 1 - bias - fbits));
        }
    }

    // Pack sign, exponent, fraction
    bits = [];
    for (i = fbits; i; i -= 1) {
        bits.push(f % 2 ? 1 : 0);f = Math.floor(f / 2);
    }
    for (i = ebits; i; i -= 1) {
        bits.push(e % 2 ? 1 : 0);e = Math.floor(e / 2);
    }
    bits.push(s ? 1 : 0);
    bits.reverse();
    str = bits.join('');

    // Bits to bytes
    bytes = [];
    while (str.length) {
        bytes.push(parseInt(str.substring(0, 8), 2));
        str = str.substring(8);
    }

    return bytes;
};

_TypeSystem2.default.unpackIEEE754 = function (bytes, ebits, fbits) {
    // Bytes to bits
    var bits = [],
        i,
        j,
        b,
        str,
        bias,
        s,
        e,
        f;

    for (i = bytes.length; i; i -= 1) {
        b = bytes[i - 1];
        for (j = 8; j; j -= 1) {
            bits.push(b % 2 ? 1 : 0);b = b >> 1;
        }
    }
    bits.reverse();
    str = bits.join('');

    // Unpack sign, exponent, fraction
    bias = (1 << ebits - 1) - 1;
    s = parseInt(str.substring(0, 1), 2) ? -1 : 1;
    e = parseInt(str.substring(1, 1 + ebits), 2);
    f = parseInt(str.substring(1 + ebits), 2);

    // Produce number
    if (e === (1 << ebits) - 1) {
        return f !== 0 ? NaN : s * Infinity;
    } else if (e > 0) {
        // Normalized
        return s * Math.pow(2, e - bias) * (1 + f / Math.pow(2, fbits));
    } else if (f !== 0) {
        // Denormalized
        return s * Math.pow(2, -(bias - 1)) * (f / Math.pow(2, fbits));
    } else {
        return s < 0 ? -0 : 0;
    }
};

_TypeSystem2.default.IEEE754 = function (v, e, f) {
    return _TypeSystem2.default.unpackIEEE754(_TypeSystem2.default.packIEEE754(v, e, f), e, f);
};

_TypeSystem2.default.Container.registerConverter('$data.Float', {
    'default': function _default(value) {
        var r = +value;
        if (isNaN(r)) throw 0;
        return _TypeSystem2.default.IEEE754(r, 8, 23);
    }
});

_TypeSystem2.default.Container.registerConverter('$data.Int16', {
    'default': function _default(value) {
        var r = (value | 0) & 0xffff;
        if (r >= 0x8000) return r - 0x10000;
        return r;
    }
});

_TypeSystem2.default.Container.registerConverter('$data.Int64', {
    '$data.Boolean': function $dataBoolean(value) {
        return value ? '1' : '0';
    },
    '$data.Number': function $dataNumber(value) {
        var r = value.toString();
        if (r.indexOf('.') > 0) return r.split('.')[0];
        if (r.indexOf('.') == 0) throw 0;
        return r;
    },
    '$data.String': function $dataString(value) {
        if (!/^\-?([0-9]+(\.[0-9]+)?|Infinity)$/.test(value)) throw 0;
        if (value.indexOf('.') > 0) return value.split('.')[0];
        if (value.indexOf('.') == 0) throw 0;
        return value;
    },
    '$data.Date': function $dataDate(value) {
        var r = value.valueOf();
        if (isNaN(r)) throw 0;
        return r.toString();
    }
});

_TypeSystem2.default.Container.registerConverter('$data.SByte', {
    'default': function _default(value) {
        var r = (value | 0) & 0xff;
        if (r >= 0x80) return r - 0x100;
        return r;
    }
});

_TypeSystem2.default.Container.registerConverter('$data.String', {
    '$data.Date': function $dataDate(value) {
        return value.toISOString();
    },
    '$data.ObjectID': function $dataObjectID(value) {
        return btoa(value.toString());
    },
    'default': function _default(value) {
        if ((typeof value === 'undefined' ? 'undefined' : _typeof(value)) === 'object') return JSON.stringify(value);
        return value.toString();
    }
});

_TypeSystem2.default.Container.registerConverter('$data.Object', {
    '$data.String': function $dataString(value) {
        return JSON.parse(value);
    },
    '$data.Function': function $dataFunction() {
        throw 0;
    }
});

_TypeSystem2.default.Container.registerConverter('$data.Array', {
    '$data.String': function $dataString(value) {
        var r = JSON.parse(value);
        if (!Array.isArray(r)) throw 0;
        return r;
    }
});

_TypeSystem2.default.Container.registerConverter('$data.ObjectID', {
    '$data.ObjectID': function $dataObjectID(value) {
        try {
            return btoa(value.toString());
        } catch (e) {
            return value;
        }
    },
    '$data.String': function $dataString(id) {
        return id;
    }
});

_TypeSystem2.default.Container.proxyConverter = function (v) {
    return v;
};
_TypeSystem2.default.Container.defaultConverter = function (type) {
    return function (v) {
        return _TypeSystem2.default.Container.convertTo(v, type);
    };
};

exports.default = _TypeSystem2.default;
module.exports = exports['default'];

},{"../TypeSystem.js":22}],25:[function(_dereq_,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _TypeSystem = _dereq_('../TypeSystem.js');

var _TypeSystem2 = _interopRequireDefault(_TypeSystem);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

(function ($data) {

    function Edm_Boolean() {};
    $data.Container.registerType('Edm.Boolean', Edm_Boolean);
    $data.Container.mapType(Edm_Boolean, $data.Boolean);

    function Edm_Binary() {};
    $data.Container.registerType('Edm.Binary', Edm_Binary);
    $data.Container.mapType(Edm_Binary, $data.Blob);

    function Edm_DateTime() {};
    $data.Container.registerType('Edm.DateTime', Edm_DateTime);
    $data.Container.mapType(Edm_DateTime, $data.Date);

    function Edm_DateTimeOffset() {};
    $data.Container.registerType('Edm.DateTimeOffset', Edm_DateTimeOffset);
    $data.Container.mapType(Edm_DateTimeOffset, $data.DateTimeOffset);

    function Edm_Time() {};
    $data.Container.registerType('Edm.Time', Edm_Time);
    $data.Container.mapType(Edm_Time, $data.Time);

    function Edm_TimeOfDay() {};
    $data.Container.registerType('Edm.TimeOfDay', Edm_TimeOfDay);
    $data.Container.mapType(Edm_TimeOfDay, $data.Time);

    function Edm_Date() {};
    $data.Container.registerType('Edm.Date', Edm_Date);
    $data.Container.mapType(Edm_Date, $data.Day);

    function Edm_Duration() {};
    $data.Container.registerType('Edm.Duration', Edm_Duration);
    $data.Container.mapType(Edm_Duration, $data.Duration);

    function Edm_Decimal() {};
    $data.Container.registerType('Edm.Decimal', Edm_Decimal);
    $data.Container.mapType(Edm_Decimal, $data.Decimal);

    function Edm_Float() {};
    $data.Container.registerType('Edm.Float', Edm_Float);
    $data.Container.mapType(Edm_Float, $data.Float);

    function Edm_Single() {};
    $data.Container.registerType('Edm.Single', Edm_Single);
    $data.Container.mapType(Edm_Single, $data.Float);

    function Edm_Double() {};
    $data.Container.registerType('Edm.Double', Edm_Double);
    $data.Container.mapType(Edm_Double, $data.Number);

    function Edm_Guid() {};
    $data.Container.registerType('Edm.Guid', Edm_Guid);
    $data.Container.mapType(Edm_Guid, $data.Guid);

    function Edm_Int16() {};
    $data.Container.registerType('Edm.Int16', Edm_Int16);
    $data.Container.mapType(Edm_Int16, $data.Int16);

    function Edm_Int32() {};
    $data.Container.registerType('Edm.Int32', Edm_Int32);
    $data.Container.mapType(Edm_Int32, $data.Integer);

    function Edm_Int64() {};
    $data.Container.registerType('Edm.Int64', Edm_Int64);
    $data.Container.mapType(Edm_Int64, $data.Int64);

    function Edm_Byte() {};
    $data.Container.registerType('Edm.Byte', Edm_Byte);
    $data.Container.mapType(Edm_Byte, $data.Byte);

    function Edm_SByte() {};
    $data.Container.registerType('Edm.SByte', Edm_SByte);
    $data.Container.mapType(Edm_SByte, $data.SByte);

    function Edm_String() {};
    $data.Container.registerType('Edm.String', Edm_String);
    $data.Container.mapType(Edm_String, $data.String);

    function Edm_GeographyPoint() {};
    $data.Container.registerType('Edm.GeographyPoint', Edm_GeographyPoint);
    $data.Container.mapType(Edm_GeographyPoint, $data.GeographyPoint);

    function Edm_GeographyLineString() {};
    $data.Container.registerType('Edm.GeographyLineString', Edm_GeographyLineString);
    $data.Container.mapType(Edm_GeographyLineString, $data.GeographyLineString);

    function Edm_GeographyPolygon() {};
    $data.Container.registerType('Edm.GeographyPolygon', Edm_GeographyPolygon);
    $data.Container.mapType(Edm_GeographyPolygon, $data.GeographyPolygon);

    function Edm_GeographyMultiPoint() {};
    $data.Container.registerType('Edm.GeographyMultiPoint', Edm_GeographyMultiPoint);
    $data.Container.mapType(Edm_GeographyMultiPoint, $data.GeographyMultiPoint);

    function Edm_GeographyMultiLineString() {};
    $data.Container.registerType('Edm.GeographyMultiLineString', Edm_GeographyMultiLineString);
    $data.Container.mapType(Edm_GeographyMultiLineString, $data.GeographyMultiLineString);

    function Edm_GeographyMultiPolygon() {};
    $data.Container.registerType('Edm.GeographyMultiPolygon', Edm_GeographyMultiPolygon);
    $data.Container.mapType(Edm_GeographyMultiPolygon, $data.GeographyMultiPolygon);

    function Edm_GeographyCollection() {};
    $data.Container.registerType('Edm.GeographyCollection', Edm_GeographyCollection);
    $data.Container.mapType(Edm_GeographyCollection, $data.GeographyCollection);

    function Edm_GeometryPoint() {};
    $data.Container.registerType('Edm.GeometryPoint', Edm_GeometryPoint);
    $data.Container.mapType(Edm_GeometryPoint, $data.GeometryPoint);

    function Edm_GeometryLineString() {};
    $data.Container.registerType('Edm.GeometryLineString', Edm_GeometryLineString);
    $data.Container.mapType(Edm_GeometryLineString, $data.GeometryLineString);

    function Edm_GeometryPolygon() {};
    $data.Container.registerType('Edm.GeometryPolygon', Edm_GeometryPolygon);
    $data.Container.mapType(Edm_GeometryPolygon, $data.GeometryPolygon);

    function Edm_GeometryMultiPoint() {};
    $data.Container.registerType('Edm.GeometryMultiPoint', Edm_GeometryMultiPoint);
    $data.Container.mapType(Edm_GeometryMultiPoint, $data.GeometryMultiPoint);

    function Edm_GeometryMultiLineString() {};
    $data.Container.registerType('Edm.GeometryMultiLineString', Edm_GeometryMultiLineString);
    $data.Container.mapType(Edm_GeometryMultiLineString, $data.GeometryMultiLineString);

    function Edm_GeometryMultiPolygon() {};
    $data.Container.registerType('Edm.GeometryMultiPolygon', Edm_GeometryMultiPolygon);
    $data.Container.mapType(Edm_GeometryMultiPolygon, $data.GeometryMultiPolygon);

    function Edm_GeometryCollection() {};
    $data.Container.registerType('Edm.GeometryCollection', Edm_GeometryCollection);
    $data.Container.mapType(Edm_GeometryCollection, $data.GeometryCollection);

    $data.oDataEdmMapping = {
        '$data.Byte': 'Edm.Byte',
        '$data.SByte': 'Edm.SByte',
        '$data.Decimal': 'Edm.Decimal',
        '$data.Float': 'Edm.Float',
        '$data.Int16': 'Edm.Int16',
        '$data.Int64': 'Edm.Int64',
        '$data.DateTimeOffset': 'Edm.DateTimeOffset',
        '$data.Time': 'Edm.TimeOfDay',
        '$data.Day': 'Edm.Date',
        '$data.Duration': 'Edm.Duration',
        '$data.Boolean': 'Edm.Boolean',
        '$data.Blob': 'Edm.Binary',
        '$data.Date': 'Edm.DateTime',
        '$data.Number': 'Edm.Double',
        '$data.Integer': 'Edm.Int32',
        '$data.Int32': 'Edm.Int32',
        '$data.String': 'Edm.String',
        '$data.ObjectID': 'Edm.String',
        '$data.GeographyPoint': 'Edm.GeographyPoint',
        '$data.GeographyLineString': 'Edm.GeographyLineString',
        '$data.GeographyPolygon': 'Edm.GeographyPolygon',
        '$data.GeographyMultiPoint': 'Edm.GeographyMultiPoint',
        '$data.GeographyMultiLineString': 'Edm.GeographyMultiLineString',
        '$data.GeographyMultiPolygon': 'Edm.GeographyMultiPolygon',
        '$data.GeographyCollection': 'Edm.GeographyCollection',
        '$data.GeometryPoint': 'Edm.GeometryPoint',
        '$data.GeometryLineString': 'Edm.GeometryLineString',
        '$data.GeometryPolygon': 'Edm.GeometryPolygon',
        '$data.GeometryMultiPoint': 'Edm.GeometryMultiPoint',
        '$data.GeometryMultiLineString': 'Edm.GeometryMultiLineString',
        '$data.GeometryMultiPolygon': 'Edm.GeometryMultiPolygon',
        '$data.GeometryCollection': 'Edm.GeometryCollection',
        '$data.Guid': 'Edm.Guid'
    };
})(_TypeSystem2.default);

exports.default = _TypeSystem2.default;
module.exports = exports['default'];

},{"../TypeSystem.js":22}],26:[function(_dereq_,module,exports){
'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; };

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _TypeSystem = _dereq_('../TypeSystem.js');

var _TypeSystem2 = _interopRequireDefault(_TypeSystem);

var _jaydataErrorHandler = _dereq_('jaydata-error-handler');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/* $data.GeographyBase */
_TypeSystem2.default.GeographyBase = function GeographyBase() {
    _TypeSystem2.default.Geospatial.apply(this, arguments);

    this.crs = this.crs || _TypeSystem2.default.GeographyBase.defaultCrs;
    _TypeSystem2.default.GeographyBase.validateGeoJSON(this);
};

_TypeSystem2.default.GeographyBase.disableSRID = false;
_TypeSystem2.default.GeographyBase.defaultCrs = {
    properties: {
        name: 'EPSG:4326'
    },
    type: 'name'
};

_TypeSystem2.default.GeographyBase.parseFromString = function (strData) {
    var lparenIdx = strData.indexOf('(');
    if (lparenIdx >= 0) {
        var name = strData.substring(0, lparenIdx).toLowerCase();
        var type = _TypeSystem2.default.GeographyBase.registered[name];

        if (type && type.parseFromString && type != _TypeSystem2.default.GeographyBase) {
            return type.parseFromString(strData);
        } else {
            _jaydataErrorHandler.Guard.raise(new _jaydataErrorHandler.Exception('parseFromString', 'Not Implemented', strData));
        }
    }
};
_TypeSystem2.default.GeographyBase.stringifyToUrl = function (geoData) {
    if (geoData instanceof _TypeSystem2.default.GeographyBase && geoData.constructor && geoData.constructor.stringifyToUrl) {
        return geoData.constructor.stringifyToUrl(geoData);
    } else if (geoData instanceof _TypeSystem2.default.GeographyBase && geoData.constructor && Array.isArray(geoData.constructor.validMembers) && geoData.constructor.validMembers[0] === 'coordinates') {
        var data;

        var _ret = function () {
            var getSRID = function getSRID(g) {
                if (!_TypeSystem2.default.GeographyBase.disableSRID && g.crs && g.crs.properties && g.crs.properties.name) {
                    var r = /EPSG:(\d+)/i;
                    var matches = r.exec(g.crs.properties.name);
                    if (matches) {
                        data += "SRID=" + matches[1] + ";";
                    }
                }
                return data;
            };

            var buildArray = function buildArray(d) {
                if (Array.isArray(d[0])) {

                    for (var i = 0; i < d.length; i++) {
                        if (i > 0) data += ',';
                        if (Array.isArray(d[i][0])) data += '(';

                        buildArray(d[i]);

                        if (Array.isArray(d[i][0])) data += ')';
                    }
                } else {
                    data += d.join(' ');
                }
                return data;
            };

            data = "geography'";

            data = getSRID(geoData);
            data += geoData.type + '(';

            data = buildArray(geoData.coordinates);

            data += ")'";
            return {
                v: data
            };
        }();

        if ((typeof _ret === 'undefined' ? 'undefined' : _typeof(_ret)) === "object") return _ret.v;
    } else {
        _jaydataErrorHandler.Guard.raise(new _jaydataErrorHandler.Exception('stringifyToUrl on instance type', 'Not Implemented', geoData));
    }
};
_TypeSystem2.default.GeographyBase.registerType = function (name, type, base) {
    _TypeSystem2.default.SimpleBase.registerType(name, type, base || _TypeSystem2.default.GeographyBase);

    _TypeSystem2.default.GeographyBase.registered = _TypeSystem2.default.GeographyBase.registered || {};
    _TypeSystem2.default.GeographyBase.registered[name.toLowerCase()] = type;
};
_TypeSystem2.default.GeographyBase.validateGeoJSON = function (geoData) {
    var type = geoData.type;
    if (type) {
        var geoType = _TypeSystem2.default.GeographyBase.registered[type.toLowerCase()];
        if (typeof geoType.validateGeoJSON === 'function') {
            var isValid = geoType.validateGeoJSON(geoData);
            if (isValid) {
                return isValid;
            } else {
                _jaydataErrorHandler.Guard.raise(new _jaydataErrorHandler.Exception("Invalid '" + type + "' format!", 'Format Exception', geoData));
            }
        }
    }
    console.log('GeoJSON validation missing', geoData);
    return;
};
_TypeSystem2.default.SimpleBase.registerType('GeographyBase', _TypeSystem2.default.GeographyBase, _TypeSystem2.default.Geospatial);
_TypeSystem2.default.Container.registerType(['$data.GeographyBase'], _TypeSystem2.default.GeographyBase);

/* $data.GeographyPoint */
_TypeSystem2.default.GeographyPoint = function GeographyPoint(lon, lat) {
    if (lon && (typeof lon === 'undefined' ? 'undefined' : _typeof(lon)) === 'object' && Array.isArray(lon)) {
        _TypeSystem2.default.GeographyBase.call(this, { coordinates: lon });
    } else if (lon && (typeof lon === 'undefined' ? 'undefined' : _typeof(lon)) === 'object' && ('longitude' in lon || 'latitude' in lon)) {
        _TypeSystem2.default.GeographyBase.call(this, { coordinates: [lon.longitude, lon.latitude] });
    } else if (lon && (typeof lon === 'undefined' ? 'undefined' : _typeof(lon)) === 'object' && ('lng' in lon || 'lat' in lon)) {
        _TypeSystem2.default.GeographyBase.call(this, { coordinates: [lon.lng, lon.lat] });
    } else if (lon && (typeof lon === 'undefined' ? 'undefined' : _typeof(lon)) === 'object') {
        _TypeSystem2.default.GeographyBase.call(this, lon);
    } else {
        _TypeSystem2.default.GeographyBase.call(this, { coordinates: [lon || 0, lat || 0] });
    }
};
_TypeSystem2.default.GeographyPoint.validateGeoJSON = function (geoData) {
    return geoData && Array.isArray(geoData.coordinates) && geoData.coordinates.length == 2 && typeof geoData.coordinates[0] === 'number' && typeof geoData.coordinates[1] === 'number';
};
_TypeSystem2.default.GeographyPoint.parseFromString = function (strData) {
    var data = strData.substring(strData.indexOf('(') + 1, strData.lastIndexOf(')'));
    var values = data.split(' ');

    return new _TypeSystem2.default.GeographyPoint(parseFloat(values[0]), parseFloat(values[1]));
};
_TypeSystem2.default.GeographyPoint.validMembers = ['coordinates'];
_TypeSystem2.default.GeographyBase.registerType('Point', _TypeSystem2.default.GeographyPoint);
Object.defineProperty(_TypeSystem2.default.GeographyPoint.prototype, 'longitude', { get: function get() {
        return this.coordinates[0];
    }, set: function set(v) {
        this.coordinates[0] = v;
    } });
Object.defineProperty(_TypeSystem2.default.GeographyPoint.prototype, 'latitude', { get: function get() {
        return this.coordinates[1];
    }, set: function set(v) {
        this.coordinates[1] = v;
    } });
_TypeSystem2.default.Container.registerType(['$data.GeographyPoint', 'GeographyPoint', '$data.Geography', 'Geography', 'geography', 'geo'], _TypeSystem2.default.GeographyPoint);
_TypeSystem2.default.Geography = _TypeSystem2.default.GeographyPoint;

/* $data.GeographyLineString */
_TypeSystem2.default.GeographyLineString = function GeographyLineString(data) {
    if (Array.isArray(data)) {
        _TypeSystem2.default.GeographyBase.call(this, { coordinates: data });
    } else {
        _TypeSystem2.default.GeographyBase.call(this, data);
    }
};
_TypeSystem2.default.GeographyLineString.validateGeoJSON = function (geoData) {
    var isValid = geoData && Array.isArray(geoData.coordinates);

    for (var i = 0; isValid && i < geoData.coordinates.length; i++) {
        var point = geoData.coordinates[i];
        isValid = isValid && Array.isArray(point) && point.length == 2 && typeof point[0] === 'number' && typeof point[1] === 'number';
    }

    return isValid;
};
_TypeSystem2.default.GeographyLineString.validMembers = ['coordinates'];
_TypeSystem2.default.GeographyBase.registerType('LineString', _TypeSystem2.default.GeographyLineString);
_TypeSystem2.default.Container.registerType(['$data.GeographyLineString', 'GeographyLineString'], _TypeSystem2.default.GeographyLineString);

/* $data.GeographyPolygon */
_TypeSystem2.default.GeographyPolygon = function GeographyPolygon(data) {
    if ((typeof data === 'undefined' ? 'undefined' : _typeof(data)) === 'object' && ('topLeft' in data && 'bottomRight' in data || 'topRight' in data && 'bottomLeft' in data)) {
        var tl, tr, bl, br;

        if ('topLeft' in data && 'bottomRight' in data) {
            tl = data.topLeft instanceof _TypeSystem2.default.GeographyPoint ? data.topLeft : new _TypeSystem2.default.GeographyPoint(data.topLeft);
            br = data.bottomRight instanceof _TypeSystem2.default.GeographyPoint ? data.bottomRight : new _TypeSystem2.default.GeographyPoint(data.bottomRight);
            tr = new _TypeSystem2.default.GeographyPoint([br.coordinates[0], tl.coordinates[1]]);
            bl = new _TypeSystem2.default.GeographyPoint([tl.coordinates[0], br.coordinates[1]]);
        } else {
            tr = data.topRight instanceof _TypeSystem2.default.GeographyPoint ? data.topRight : new _TypeSystem2.default.GeographyPoint(data.topRight);
            bl = data.bottomLeft instanceof _TypeSystem2.default.GeographyPoint ? data.bottomLeft : new _TypeSystem2.default.GeographyPoint(data.bottomLeft);
            tl = new _TypeSystem2.default.GeographyPoint([bl.coordinates[0], tr.coordinates[1]]);
            br = new _TypeSystem2.default.GeographyPoint([tr.coordinates[0], bl.coordinates[1]]);
        }

        var coordinates = [];
        coordinates.push([].concat(tl.coordinates));
        coordinates.push([].concat(tr.coordinates));
        coordinates.push([].concat(br.coordinates));
        coordinates.push([].concat(bl.coordinates));
        coordinates.push([].concat(tl.coordinates));

        _TypeSystem2.default.GeographyBase.call(this, { coordinates: [coordinates] });
    } else if (Array.isArray(data)) {
        _TypeSystem2.default.GeographyBase.call(this, { coordinates: data });
    } else {
        _TypeSystem2.default.GeographyBase.call(this, data);
    }
};
_TypeSystem2.default.GeographyPolygon.validateGeoJSON = function (geoData) {
    var isValid = geoData && Array.isArray(geoData.coordinates);

    for (var i = 0; isValid && i < geoData.coordinates.length; i++) {
        var polygon = geoData.coordinates[i];
        var isValid = isValid && Array.isArray(polygon);

        for (var j = 0; isValid && j < polygon.length; j++) {
            var point = polygon[j];

            isValid = isValid && Array.isArray(point) && point.length == 2 && typeof point[0] === 'number' && typeof point[1] === 'number';
        }
    }

    return isValid;
};
_TypeSystem2.default.GeographyPolygon.parseFromString = function (strData) {
    var data = strData.substring(strData.indexOf('(') + 1, strData.lastIndexOf(')'));
    var rings = data.substring(data.indexOf('(') + 1, data.lastIndexOf(')')).split('),(');

    var data = [];
    for (var i = 0; i < rings.length; i++) {
        var polyPoints = [];
        var pairs = rings[i].split(',');
        for (var j = 0; j < pairs.length; j++) {
            var values = pairs[j].split(' ');

            polyPoints.push([parseFloat(values[0]), parseFloat(values[1])]);
        }
        data.push(polyPoints);
    }

    return new _TypeSystem2.default.GeographyPolygon(data);
};
_TypeSystem2.default.GeographyPolygon.validMembers = ['coordinates'];
_TypeSystem2.default.GeographyBase.registerType('Polygon', _TypeSystem2.default.GeographyPolygon);
_TypeSystem2.default.Container.registerType(['$data.GeographyPolygon', 'GeographyPolygon'], _TypeSystem2.default.GeographyPolygon);

/* $data.GeographyMultiPoint */
_TypeSystem2.default.GeographyMultiPoint = function GeographyMultiPoint(data) {
    if (Array.isArray(data)) {
        _TypeSystem2.default.GeographyBase.call(this, { coordinates: data });
    } else {
        _TypeSystem2.default.GeographyBase.call(this, data);
    }
};
_TypeSystem2.default.GeographyMultiPoint.validateGeoJSON = function (geoData) {
    var isValid = geoData && Array.isArray(geoData.coordinates);

    for (var i = 0; isValid && i < geoData.coordinates.length; i++) {
        var point = geoData.coordinates[i];
        isValid = isValid && Array.isArray(point) && point.length == 2 && typeof point[0] === 'number' && typeof point[1] === 'number';
    }

    return isValid;
};
_TypeSystem2.default.GeographyMultiPoint.validMembers = ['coordinates'];
_TypeSystem2.default.GeographyBase.registerType('MultiPoint', _TypeSystem2.default.GeographyMultiPoint);
_TypeSystem2.default.Container.registerType(['$data.GeographyMultiPoint', 'GeographyMultiPoint'], _TypeSystem2.default.GeographyMultiPoint);

/* $data.GeographyMultiLineString */
_TypeSystem2.default.GeographyMultiLineString = function GeographyMultiLineString(data) {
    if (Array.isArray(data)) {
        _TypeSystem2.default.GeographyBase.call(this, { coordinates: data });
    } else {
        _TypeSystem2.default.GeographyBase.call(this, data);
    }
};
_TypeSystem2.default.GeographyMultiLineString.validateGeoJSON = function (geoData) {
    var isValid = geoData && Array.isArray(geoData.coordinates);

    for (var i = 0; isValid && i < geoData.coordinates.length; i++) {
        var polygon = geoData.coordinates[i];
        var isValid = isValid && Array.isArray(polygon);

        for (var j = 0; isValid && j < polygon.length; j++) {
            var point = polygon[j];

            isValid = isValid && Array.isArray(point) && point.length == 2 && typeof point[0] === 'number' && typeof point[1] === 'number';
        }
    }

    return isValid;
};
_TypeSystem2.default.GeographyMultiLineString.validMembers = ['coordinates'];
_TypeSystem2.default.GeographyBase.registerType('MultiLineString', _TypeSystem2.default.GeographyMultiLineString);
_TypeSystem2.default.Container.registerType(['$data.GeographyMultiLineString', 'GeographyMultiLineString'], _TypeSystem2.default.GeographyMultiLineString);

/* $data.GeographyMultiPolygon */
_TypeSystem2.default.GeographyMultiPolygon = function GeographyMultiPolygon(data) {
    if (Array.isArray(data)) {
        _TypeSystem2.default.GeographyBase.call(this, { coordinates: data });
    } else {
        _TypeSystem2.default.GeographyBase.call(this, data);
    }
};
_TypeSystem2.default.GeographyMultiPolygon.validateGeoJSON = function (geoData) {
    var isValid = geoData && Array.isArray(geoData.coordinates);

    for (var k = 0; isValid && k < geoData.coordinates.length; k++) {
        var polygons = geoData.coordinates[k];
        var isValid = isValid && Array.isArray(polygons);

        for (var i = 0; isValid && i < polygons.length; i++) {
            var polygon = polygons[i];
            var isValid = isValid && Array.isArray(polygon);

            for (var j = 0; isValid && j < polygon.length; j++) {
                var point = polygon[j];

                isValid = isValid && Array.isArray(point) && point.length == 2 && typeof point[0] === 'number' && typeof point[1] === 'number';
            }
        }
    }

    return isValid;
};
_TypeSystem2.default.GeographyMultiPolygon.validMembers = ['coordinates'];
_TypeSystem2.default.GeographyBase.registerType('MultiPolygon', _TypeSystem2.default.GeographyMultiPolygon);
_TypeSystem2.default.Container.registerType(['$data.GeographyMultiPolygon', 'GeographyMultiPolygon'], _TypeSystem2.default.GeographyMultiPolygon);

/* $data.GeographyCollection */
_TypeSystem2.default.GeographyCollection = function GeographyCollection(data) {
    if (Array.isArray(data)) {
        _TypeSystem2.default.GeographyBase.call(this, { geometries: data });
    } else {
        _TypeSystem2.default.GeographyBase.call(this, data);
    }
};
_TypeSystem2.default.GeographyCollection.validateGeoJSON = function (geoData) {
    var isValid = geoData && Array.isArray(geoData.geometries);

    for (var i = 0; isValid && i < geoData.geometries.length; i++) {
        var geometry = geoData.geometries[i];
        try {
            isValid = isValid && _TypeSystem2.default.GeographyBase.validateGeoJSON(geometry);
        } catch (e) {
            isValid = false;
        }
    }

    return isValid;
};
_TypeSystem2.default.GeographyCollection.validMembers = ['geometries'];
_TypeSystem2.default.GeographyBase.registerType('GeometryCollection', _TypeSystem2.default.GeographyCollection);
_TypeSystem2.default.Container.registerType(['$data.GeographyCollection', 'GeographyCollection'], _TypeSystem2.default.GeographyCollection);

/* converters */
_TypeSystem2.default.Container.registerConverter(_TypeSystem2.default.GeographyPoint, _TypeSystem2.default.Object, function (value) {
    return value ? new _TypeSystem2.default.GeographyPoint(value) : value;
});
_TypeSystem2.default.Container.registerConverter(_TypeSystem2.default.GeographyLineString, _TypeSystem2.default.Object, function (value) {
    return value ? new _TypeSystem2.default.GeographyLineString(value) : value;
});
_TypeSystem2.default.Container.registerConverter(_TypeSystem2.default.GeographyPolygon, _TypeSystem2.default.Object, function (value) {
    return value ? new _TypeSystem2.default.GeographyPolygon(value) : value;
});
_TypeSystem2.default.Container.registerConverter(_TypeSystem2.default.GeographyMultiPoint, _TypeSystem2.default.Object, function (value) {
    return value ? new _TypeSystem2.default.GeographyMultiPoint(value) : value;
});
_TypeSystem2.default.Container.registerConverter(_TypeSystem2.default.GeographyMultiLineString, _TypeSystem2.default.Object, function (value) {
    return value ? new _TypeSystem2.default.GeographyMultiLineString(value) : value;
});
_TypeSystem2.default.Container.registerConverter(_TypeSystem2.default.GeographyMultiPolygon, _TypeSystem2.default.Object, function (value) {
    return value ? new _TypeSystem2.default.GeographyMultiPolygon(value) : value;
});
_TypeSystem2.default.Container.registerConverter(_TypeSystem2.default.GeographyCollection, _TypeSystem2.default.Object, function (value) {
    return value ? new _TypeSystem2.default.GeographyCollection(value) : value;
});

exports.default = _TypeSystem2.default;
module.exports = exports['default'];

},{"../TypeSystem.js":22,"jaydata-error-handler":7}],27:[function(_dereq_,module,exports){
'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; };

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _TypeSystem = _dereq_('../TypeSystem.js');

var _TypeSystem2 = _interopRequireDefault(_TypeSystem);

var _jaydataErrorHandler = _dereq_('jaydata-error-handler');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/* $data.Geometry */
_TypeSystem2.default.GeometryBase = function GeometryBase() {
    _TypeSystem2.default.Geospatial.apply(this, arguments);

    this.crs = this.crs || _TypeSystem2.default.GeometryBase.defaultCrs;
    _TypeSystem2.default.GeometryBase.validateGeoJSON(this);
};

_TypeSystem2.default.GeometryBase.disableSRID = false;
_TypeSystem2.default.GeometryBase.defaultCrs = {
    properties: {
        name: 'EPSG:0'
    },
    type: 'name'
};

_TypeSystem2.default.GeometryBase.parseFromString = function (strData) {
    var lparenIdx = strData.indexOf('(');
    if (lparenIdx >= 0) {
        var name = strData.substring(0, lparenIdx).toLowerCase();
        var type = _TypeSystem2.default.GeometryBase.registered[name];

        if (type && type.parseFromString && type != _TypeSystem2.default.GeometryBase) {
            return type.parseFromString(strData);
        } else {
            _jaydataErrorHandler.Guard.raise(new _jaydataErrorHandler.Exception('parseFromString', 'Not Implemented', strData));
        }
    }
};
_TypeSystem2.default.GeometryBase.stringifyToUrl = function (geoData) {
    if (geoData instanceof _TypeSystem2.default.GeometryBase && geoData.constructor && geoData.constructor.stringifyToUrl) {
        return geoData.constructor.stringifyToUrl(geoData);
    } else if (geoData instanceof _TypeSystem2.default.GeometryBase && geoData.constructor && Array.isArray(geoData.constructor.validMembers) && geoData.constructor.validMembers[0] === 'coordinates') {
        var data;

        var _ret = function () {
            var getSRID = function getSRID(g) {
                if (!_TypeSystem2.default.GeometryBase.disableSRID && g.crs && g.crs.properties && g.crs.properties.name) {
                    var r = /EPSG:(\d+)/i;
                    var matches = r.exec(g.crs.properties.name);
                    if (matches) {
                        data += "SRID=" + matches[1] + ";";
                    }
                }
                return data;
            };

            var buildArray = function buildArray(d) {
                if (Array.isArray(d[0])) {

                    for (var i = 0; i < d.length; i++) {
                        if (i > 0) data += ',';
                        if (Array.isArray(d[i][0])) data += '(';

                        buildArray(d[i]);

                        if (Array.isArray(d[i][0])) data += ')';
                    }
                } else {
                    data += d.join(' ');
                }
                return data;
            };

            data = "geometry'";

            data = getSRID(geoData);
            data += geoData.type + '(';

            data = buildArray(geoData.coordinates);

            data += ")'";
            return {
                v: data
            };
        }();

        if ((typeof _ret === 'undefined' ? 'undefined' : _typeof(_ret)) === "object") return _ret.v;
    } else {
        _jaydataErrorHandler.Guard.raise(new _jaydataErrorHandler.Exception('stringifyToUrl on instance type', 'Not Implemented', geoData));
    }
};
_TypeSystem2.default.GeometryBase.registerType = function (name, type, base) {
    _TypeSystem2.default.SimpleBase.registerType(name, type, base || _TypeSystem2.default.GeometryBase);

    _TypeSystem2.default.GeometryBase.registered = _TypeSystem2.default.GeometryBase.registered || {};
    _TypeSystem2.default.GeometryBase.registered[name.toLowerCase()] = type;
};
_TypeSystem2.default.GeometryBase.validateGeoJSON = function (geoData) {
    var type = geoData.type;
    if (type) {
        var geoType = _TypeSystem2.default.GeometryBase.registered[type.toLowerCase()];
        if (typeof geoType.validateGeoJSON === 'function') {
            var isValid = geoType.validateGeoJSON(geoData);
            if (isValid) {
                return isValid;
            } else {
                _jaydataErrorHandler.Guard.raise(new _jaydataErrorHandler.Exception("Invalid '" + type + "' format!", 'Format Exception', geoData));
            }
        }
    }
    console.log('GeoJSON validation missing', geoData);
    return;
};
_TypeSystem2.default.SimpleBase.registerType('GeometryBase', _TypeSystem2.default.GeometryBase, _TypeSystem2.default.Geospatial);
_TypeSystem2.default.Container.registerType(['$data.GeometryBase'], _TypeSystem2.default.GeometryBase);

/* $data.GeometryPoint */
_TypeSystem2.default.GeometryPoint = function GeometryPoint(x, y) {
    var param = x;
    if (param && (typeof param === 'undefined' ? 'undefined' : _typeof(param)) === 'object' && Array.isArray(param)) {
        _TypeSystem2.default.GeometryBase.call(this, { coordinates: param });
    } else if (param && (typeof param === 'undefined' ? 'undefined' : _typeof(param)) === 'object' && ('x' in param || 'y' in param)) {
        _TypeSystem2.default.GeometryBase.call(this, { coordinates: [param.x, param.y] });
    } else if (param && (typeof param === 'undefined' ? 'undefined' : _typeof(param)) === 'object') {
        _TypeSystem2.default.GeometryBase.call(this, param);
    } else {
        _TypeSystem2.default.GeometryBase.call(this, { coordinates: [x || 0, y || 0] });
    }
};
_TypeSystem2.default.GeometryPoint.validateGeoJSON = function (geoData) {
    return geoData && Array.isArray(geoData.coordinates) && geoData.coordinates.length == 2 && typeof geoData.coordinates[0] === 'number' && typeof geoData.coordinates[1] === 'number';
};
_TypeSystem2.default.GeometryPoint.parseFromString = function (strData) {
    var data = strData.substring(strData.indexOf('(') + 1, strData.lastIndexOf(')'));
    var values = data.split(' ');

    return new _TypeSystem2.default.GeometryPoint(parseFloat(values[0]), parseFloat(values[1]));
};
_TypeSystem2.default.GeometryPoint.validMembers = ['coordinates'];
_TypeSystem2.default.GeometryBase.registerType('Point', _TypeSystem2.default.GeometryPoint);
Object.defineProperty(_TypeSystem2.default.GeometryPoint.prototype, 'x', { get: function get() {
        return this.coordinates[0];
    }, set: function set(v) {
        this.coordinates[0] = v;
    } });
Object.defineProperty(_TypeSystem2.default.GeometryPoint.prototype, 'y', { get: function get() {
        return this.coordinates[1];
    }, set: function set(v) {
        this.coordinates[1] = v;
    } });
_TypeSystem2.default.Container.registerType(['$data.GeometryPoint', 'GeometryPoint'], _TypeSystem2.default.GeometryPoint);

/* $data.GeometryLineString */
_TypeSystem2.default.GeometryLineString = function GeometryLineString(data) {
    if (Array.isArray(data)) {
        _TypeSystem2.default.GeometryBase.call(this, { coordinates: data });
    } else {
        _TypeSystem2.default.GeometryBase.call(this, data);
    }
};
_TypeSystem2.default.GeometryLineString.validateGeoJSON = function (geoData) {
    var isValid = geoData && Array.isArray(geoData.coordinates);

    for (var i = 0; isValid && i < geoData.coordinates.length; i++) {
        var point = geoData.coordinates[i];
        isValid = isValid && Array.isArray(point) && point.length == 2 && typeof point[0] === 'number' && typeof point[1] === 'number';
    }

    return isValid;
};
_TypeSystem2.default.GeometryLineString.validMembers = ['coordinates'];
_TypeSystem2.default.GeometryBase.registerType('LineString', _TypeSystem2.default.GeometryLineString);
_TypeSystem2.default.Container.registerType(['$data.GeometryLineString', 'GeometryLineString'], _TypeSystem2.default.GeometryLineString);

/* $data.GeometryPolygon */
_TypeSystem2.default.GeometryPolygon = function GeometryPolygon(data) {
    if ((typeof data === 'undefined' ? 'undefined' : _typeof(data)) === 'object' && ('topLeft' in data && 'bottomRight' in data || 'topRight' in data && 'bottomLeft' in data)) {
        var tl, tr, bl, br;

        if ('topLeft' in data && 'bottomRight' in data) {
            tl = data.topLeft instanceof _TypeSystem2.default.GeometryPoint ? data.topLeft : new _TypeSystem2.default.GeometryPoint(data.topLeft);
            br = data.bottomRight instanceof _TypeSystem2.default.GeometryPoint ? data.bottomRight : new _TypeSystem2.default.GeometryPoint(data.bottomRight);
            tr = new _TypeSystem2.default.GeometryPoint([br.coordinates[0], tl.coordinates[1]]);
            bl = new _TypeSystem2.default.GeometryPoint([tl.coordinates[0], br.coordinates[1]]);
        } else {
            tr = data.topRight instanceof _TypeSystem2.default.GeometryPoint ? data.topRight : new _TypeSystem2.default.GeometryPoint(data.topRight);
            bl = data.bottomLeft instanceof _TypeSystem2.default.GeometryPoint ? data.bottomLeft : new _TypeSystem2.default.GeometryPoint(data.bottomLeft);
            tl = new _TypeSystem2.default.GeometryPoint([bl.coordinates[0], tr.coordinates[1]]);
            br = new _TypeSystem2.default.GeometryPoint([tr.coordinates[0], bl.coordinates[1]]);
        }

        var coordinates = [];
        coordinates.push([].concat(tl.coordinates));
        coordinates.push([].concat(tr.coordinates));
        coordinates.push([].concat(br.coordinates));
        coordinates.push([].concat(bl.coordinates));
        coordinates.push([].concat(tl.coordinates));

        _TypeSystem2.default.GeometryBase.call(this, { coordinates: [coordinates] });
    } else if (Array.isArray(data)) {
        _TypeSystem2.default.GeometryBase.call(this, { coordinates: data });
    } else {
        _TypeSystem2.default.GeometryBase.call(this, data);
    }
};
_TypeSystem2.default.GeometryPolygon.validateGeoJSON = function (geoData) {
    var isValid = geoData && Array.isArray(geoData.coordinates);

    for (var i = 0; isValid && i < geoData.coordinates.length; i++) {
        var polygon = geoData.coordinates[i];
        var isValid = isValid && Array.isArray(polygon);

        for (var j = 0; isValid && j < polygon.length; j++) {
            var point = polygon[j];

            isValid = isValid && Array.isArray(point) && point.length == 2 && typeof point[0] === 'number' && typeof point[1] === 'number';
        }
    }

    return isValid;
};
_TypeSystem2.default.GeometryPolygon.parseFromString = function (strData) {
    var data = strData.substring(strData.indexOf('(') + 1, strData.lastIndexOf(')'));
    var rings = data.substring(data.indexOf('(') + 1, data.lastIndexOf(')')).split('),(');

    var data = [];
    for (var i = 0; i < rings.length; i++) {
        var polyPoints = [];
        var pairs = rings[i].split(',');
        for (var j = 0; j < pairs.length; j++) {
            var values = pairs[j].split(' ');

            polyPoints.push([parseFloat(values[0]), parseFloat(values[1])]);
        }
        data.push(polyPoints);
    }

    return new _TypeSystem2.default.GeometryPolygon(data);
};
_TypeSystem2.default.GeometryPolygon.validMembers = ['coordinates'];
_TypeSystem2.default.GeometryBase.registerType('Polygon', _TypeSystem2.default.GeometryPolygon);
_TypeSystem2.default.Container.registerType(['$data.GeometryPolygon', 'GeometryPolygon'], _TypeSystem2.default.GeometryPolygon);

/* $data.GeometryMultiPoint */
_TypeSystem2.default.GeometryMultiPoint = function GeometryMultiPoint(data) {
    if (Array.isArray(data)) {
        _TypeSystem2.default.GeometryBase.call(this, { coordinates: data });
    } else {
        _TypeSystem2.default.GeometryBase.call(this, data);
    }
};
_TypeSystem2.default.GeometryMultiPoint.validateGeoJSON = function (geoData) {
    var isValid = geoData && Array.isArray(geoData.coordinates);

    for (var i = 0; isValid && i < geoData.coordinates.length; i++) {
        var point = geoData.coordinates[i];
        isValid = isValid && Array.isArray(point) && point.length == 2 && typeof point[0] === 'number' && typeof point[1] === 'number';
    }

    return isValid;
};
_TypeSystem2.default.GeometryMultiPoint.validMembers = ['coordinates'];
_TypeSystem2.default.GeometryBase.registerType('MultiPoint', _TypeSystem2.default.GeometryMultiPoint);
_TypeSystem2.default.Container.registerType(['$data.GeometryMultiPoint', 'GeometryMultiPoint'], _TypeSystem2.default.GeometryMultiPoint);

/* $data.GeometryMultiLineString */
_TypeSystem2.default.GeometryMultiLineString = function GeometryMultiLineString(data) {
    if (Array.isArray(data)) {
        _TypeSystem2.default.GeometryBase.call(this, { coordinates: data });
    } else {
        _TypeSystem2.default.GeometryBase.call(this, data);
    }
};
_TypeSystem2.default.GeometryMultiLineString.validateGeoJSON = function (geoData) {
    var isValid = geoData && Array.isArray(geoData.coordinates);

    for (var i = 0; isValid && i < geoData.coordinates.length; i++) {
        var polygon = geoData.coordinates[i];
        var isValid = isValid && Array.isArray(polygon);

        for (var j = 0; isValid && j < polygon.length; j++) {
            var point = polygon[j];

            isValid = isValid && Array.isArray(point) && point.length == 2 && typeof point[0] === 'number' && typeof point[1] === 'number';
        }
    }

    return isValid;
};
_TypeSystem2.default.GeometryMultiLineString.validMembers = ['coordinates'];
_TypeSystem2.default.GeometryBase.registerType('MultiLineString', _TypeSystem2.default.GeometryMultiLineString);
_TypeSystem2.default.Container.registerType(['$data.GeometryMultiLineString', 'GeometryMultiLineString'], _TypeSystem2.default.GeometryMultiLineString);

/* $data.GeometryMultiPolygon */
_TypeSystem2.default.GeometryMultiPolygon = function GeometryMultiPolygon(data) {
    if (Array.isArray(data)) {
        _TypeSystem2.default.GeometryBase.call(this, { coordinates: data });
    } else {
        _TypeSystem2.default.GeometryBase.call(this, data);
    }
};
_TypeSystem2.default.GeometryMultiPolygon.validateGeoJSON = function (geoData) {
    var isValid = geoData && Array.isArray(geoData.coordinates);

    for (var k = 0; isValid && k < geoData.coordinates.length; k++) {
        var polygons = geoData.coordinates[k];
        var isValid = isValid && Array.isArray(polygons);

        for (var i = 0; isValid && i < polygons.length; i++) {
            var polygon = polygons[i];
            var isValid = isValid && Array.isArray(polygon);

            for (var j = 0; isValid && j < polygon.length; j++) {
                var point = polygon[j];

                isValid = isValid && Array.isArray(point) && point.length == 2 && typeof point[0] === 'number' && typeof point[1] === 'number';
            }
        }
    }

    return isValid;
};
_TypeSystem2.default.GeometryMultiPolygon.validMembers = ['coordinates'];
_TypeSystem2.default.GeometryBase.registerType('MultiPolygon', _TypeSystem2.default.GeometryMultiPolygon);
_TypeSystem2.default.Container.registerType(['$data.GeometryMultiPolygon', 'GeometryMultiPolygon'], _TypeSystem2.default.GeometryMultiPolygon);

/* $data.GeometryCollection */
_TypeSystem2.default.GeometryCollection = function GeometryCollection(data) {
    if (Array.isArray(data)) {
        _TypeSystem2.default.GeometryBase.call(this, { geometries: data });
    } else {
        _TypeSystem2.default.GeometryBase.call(this, data);
    }
};
_TypeSystem2.default.GeometryCollection.validateGeoJSON = function (geoData) {
    var isValid = geoData && Array.isArray(geoData.geometries);

    for (var i = 0; isValid && i < geoData.geometries.length; i++) {
        var geometry = geoData.geometries[i];
        try {
            isValid = isValid && _TypeSystem2.default.GeometryBase.validateGeoJSON(geometry);
        } catch (e) {
            isValid = false;
        }
    }

    return isValid;
};
_TypeSystem2.default.GeometryCollection.validMembers = ['geometries'];
_TypeSystem2.default.GeometryBase.registerType('GeometryCollection', _TypeSystem2.default.GeometryCollection);
_TypeSystem2.default.Container.registerType(['$data.GeometryCollection', 'GeometryCollection'], _TypeSystem2.default.GeometryCollection);

/* converters */
_TypeSystem2.default.Container.registerConverter(_TypeSystem2.default.GeometryPoint, _TypeSystem2.default.Object, function (value) {
    return value ? new _TypeSystem2.default.GeometryPoint(value) : value;
});
_TypeSystem2.default.Container.registerConverter(_TypeSystem2.default.GeometryLineString, _TypeSystem2.default.Object, function (value) {
    return value ? new _TypeSystem2.default.GeometryLineString(value) : value;
});
_TypeSystem2.default.Container.registerConverter(_TypeSystem2.default.GeometryPolygon, _TypeSystem2.default.Object, function (value) {
    return value ? new _TypeSystem2.default.GeometryPolygon(value) : value;
});
_TypeSystem2.default.Container.registerConverter(_TypeSystem2.default.GeometryMultiPoint, _TypeSystem2.default.Object, function (value) {
    return value ? new _TypeSystem2.default.GeometryMultiPoint(value) : value;
});
_TypeSystem2.default.Container.registerConverter(_TypeSystem2.default.GeometryMultiLineString, _TypeSystem2.default.Object, function (value) {
    return value ? new _TypeSystem2.default.GeometryMultiLineString(value) : value;
});
_TypeSystem2.default.Container.registerConverter(_TypeSystem2.default.GeometryMultiPolygon, _TypeSystem2.default.Object, function (value) {
    return value ? new _TypeSystem2.default.GeometryMultiPolygon(value) : value;
});
_TypeSystem2.default.Container.registerConverter(_TypeSystem2.default.GeometryCollection, _TypeSystem2.default.Object, function (value) {
    return value ? new _TypeSystem2.default.GeometryCollection(value) : value;
});

exports.default = _TypeSystem2.default;
module.exports = exports['default'];

},{"../TypeSystem.js":22,"jaydata-error-handler":7}],28:[function(_dereq_,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _TypeSystem = _dereq_('../TypeSystem.js');

var _TypeSystem2 = _interopRequireDefault(_TypeSystem);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

_TypeSystem2.default.Geospatial = function Geospatial() {
    this.type = this.constructor.type;
    if (Array.isArray(this.constructor.validMembers)) {
        for (var i = 0; i < this.constructor.validMembers.length; i++) {
            var name = this.constructor.validMembers[i];
            this[name] = undefined;
        }
    }

    _TypeSystem2.default.SimpleBase.apply(this, arguments);
    this.type = this.constructor.type || 'Unknown';
};
_TypeSystem2.default.SimpleBase.registerType('Geospatial', _TypeSystem2.default.Geospatial);
_TypeSystem2.default.Container.registerType(['$data.Geospatial', 'Geospatial'], _TypeSystem2.default.Geospatial);

_TypeSystem2.default.point = function (arg) {
    if (arg && arg.crs) {
        if (arg.crs.properties && arg.crs.properties.name === _TypeSystem2.default.GeometryBase.defaultCrs.properties.name) {
            return new _TypeSystem2.default.GeometryPoint(arg);
        } else {
            return new _TypeSystem2.default.GeographyPoint(arg);
        }
    } else if (arg) {
        if ('x' in arg && 'y' in arg) {
            return new _TypeSystem2.default.GeometryPoint(arg.x, arg.y);
        } else if ('longitude' in arg && 'latitude' in arg) {
            return new _TypeSystem2.default.GeographyPoint(arg.longitude, arg.latitude);
        } else if ('lng' in arg && 'lat' in arg) {
            return new _TypeSystem2.default.GeographyPoint(arg.lng, arg.lat);
        }
    }
};

exports.default = _TypeSystem2.default;
module.exports = exports['default'];

},{"../TypeSystem.js":22}],29:[function(_dereq_,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _TypeSystem = _dereq_('../TypeSystem.js');

var _TypeSystem2 = _interopRequireDefault(_TypeSystem);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

_TypeSystem2.default.Guid = function Guid(value) {
    ///<param name="value" type="string" />

    if (value === undefined || typeof value === 'string' && /^[a-zA-z0-9]{8}-[a-zA-z0-9]{4}-[a-zA-z0-9]{4}-[a-zA-z0-9]{4}-[a-zA-z0-9]{12}$/.test(value)) {
        this.value = value || '00000000-0000-0000-0000-000000000000';
    } else {
        throw Guard.raise(new Exception('TypeError: ', 'value not convertable to $data.Guid', value));
    }
};
_TypeSystem2.default.Container.registerType(['$data.Guid', 'Guid', 'guid'], _TypeSystem2.default.Guid);
_TypeSystem2.default.Container.registerConverter('$data.Guid', {
    '$data.String': function $dataString(value) {
        return value ? _TypeSystem2.default.parseGuid(value).toString() : value;
    },
    '$data.Guid': function $dataGuid(value) {
        return value ? value.toString() : value;
    }
}, {
    '$data.String': function $dataString(value) {
        return value ? value.toString() : value;
    }
});

_TypeSystem2.default.Guid.prototype.toJSON = function () {
    return this.value;
};

_TypeSystem2.default.Guid.prototype.valueOf = function () {
    return this.value;
};

_TypeSystem2.default.Guid.prototype.toString = function () {
    return this.value;
};

_TypeSystem2.default.Guid.NewGuid = function () {
    return _TypeSystem2.default.createGuid();
};

_TypeSystem2.default.parseGuid = function (guid) {
    return new _TypeSystem2.default.Guid(guid);
};

(function () {
    /*!
    Math.uuid.js (v1.4)
    http://www.broofa.com
    mailto:robert@broofa.com
      Copyright (c) 2010 Robert Kieffer
    Dual licensed under the MIT and GPL licenses.
    */

    var CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'.split('');

    _TypeSystem2.default.createGuid = function (guidString) {
        if (guidString) {
            return new _TypeSystem2.default.Guid(guidString);
        };

        var len;
        var chars = CHARS,
            uuid = [],
            i;
        var radix = chars.length;

        if (len) {
            // Compact form
            for (i = 0; i < len; i++) {
                uuid[i] = chars[0 | Math.random() * radix];
            }
        } else {
            // rfc4122, version 4 form
            var r;

            // rfc4122 requires these characters
            uuid[8] = uuid[13] = uuid[18] = uuid[23] = '-';
            uuid[14] = '4';

            // Fill in random data.  At i==19 set the high bits of clock sequence as
            // per rfc4122, sec. 4.1.5
            for (i = 0; i < 36; i++) {
                if (!uuid[i]) {
                    r = 0 | Math.random() * 16;
                    uuid[i] = chars[i == 19 ? r & 0x3 | 0x8 : r];
                }
            }
        }

        return _TypeSystem2.default.parseGuid(uuid.join(''));
    };
})();

exports.default = _TypeSystem2.default;
module.exports = exports['default'];

},{"../TypeSystem.js":22}],30:[function(_dereq_,module,exports){
'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; };

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _TypeSystem = _dereq_('../TypeSystem.js');

var _TypeSystem2 = _interopRequireDefault(_TypeSystem);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/* $data.SimpleBase */
_TypeSystem2.default.SimpleBase = function SimpleBase(data) {
    if ((typeof data === 'undefined' ? 'undefined' : _typeof(data)) === 'object' && data) {
        if (Array.isArray(this.constructor.validMembers)) {
            for (var i = 0; i < this.constructor.validMembers.length; i++) {
                var name = this.constructor.validMembers[i];

                if (data[name] !== undefined) {
                    this[name] = data[name];
                }
            }
        } else {
            delete data.type;
            _TypeSystem2.default.typeSystem.extend(this, data);
        }
    }
};
_TypeSystem2.default.SimpleBase.registerType = function (name, type, base) {
    base = base || _TypeSystem2.default.SimpleBase;

    type.type = name;
    type.prototype = Object.create(base.prototype);
    type.prototype.constructor = type;
};
_TypeSystem2.default.Container.registerType(['$data.SimpleBase', 'SimpleBase'], _TypeSystem2.default.SimpleBase);

exports.default = _TypeSystem2.default;
module.exports = exports['default'];

},{"../TypeSystem.js":22}],31:[function(_dereq_,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _TypeSystem = _dereq_('../TypeSystem.js');

var _TypeSystem2 = _interopRequireDefault(_TypeSystem);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

_TypeSystem2.default.Number = typeof Number !== 'undefined' ? Number : function JayNumber() {};
_TypeSystem2.default.Date = typeof Date !== 'undefined' ? Date : function JayDate() {};
_TypeSystem2.default.String = typeof String !== 'undefined' ? String : function JayString() {};
_TypeSystem2.default.Boolean = typeof Boolean !== 'undefined' ? Boolean : function JayBoolean() {};
_TypeSystem2.default.Array = typeof Array !== 'undefined' ? Array : function JayArray() {};
_TypeSystem2.default.Object = typeof Object !== 'undefined' ? Object : function JayObject() {};
_TypeSystem2.default.Function = Function;

_TypeSystem2.default.Byte = function JayByte() {};
_TypeSystem2.default.SByte = function JaySByte() {};
_TypeSystem2.default.Decimal = function JayDecimal() {};
_TypeSystem2.default.Float = _TypeSystem2.default.Single = function JayFloat() {};
_TypeSystem2.default.Integer = function JayInteger() {};
_TypeSystem2.default.Int16 = function JayInt16(v) {};
_TypeSystem2.default.Int32 = function JayInt32() {};
_TypeSystem2.default.Int64 = function JayInt64(v) {};
_TypeSystem2.default.ObjectID = typeof _TypeSystem2.default.mongoDBDriver !== 'undefined' && typeof _TypeSystem2.default.mongoDBDriver.ObjectID !== 'undefined' ? _TypeSystem2.default.mongoDBDriver.ObjectID : function JayObjectID() {};
_TypeSystem2.default.Time = function JayTime() {};
_TypeSystem2.default.Day = function JayDay() {};
_TypeSystem2.default.Duration = function JayDuration() {};
_TypeSystem2.default.DateTimeOffset = function JayDateTimeOffset(val) {
    this.value = val;
};
_TypeSystem2.default.DateTimeOffset.prototype.toJSON = function () {
    return this.value instanceof Date ? this.value.toISOString() : this.value;
};

_TypeSystem2.default.Container.registerType(["$data.Number", "number", "JayNumber", "double"], _TypeSystem2.default.Number);
_TypeSystem2.default.Container.registerType(["$data.Integer", "int", "integer", "JayInteger"], _TypeSystem2.default.Integer);
_TypeSystem2.default.Container.registerType(["$data.Int32", "int32", "JayInt32"], _TypeSystem2.default.Int32);
_TypeSystem2.default.Container.registerType(["$data.Byte", "byte", "JayByte"], _TypeSystem2.default.Byte);
_TypeSystem2.default.Container.registerType(["$data.SByte", "sbyte", "JaySByte"], _TypeSystem2.default.SByte);
_TypeSystem2.default.Container.registerType(["$data.Decimal", "decimal", "JayDecimal"], _TypeSystem2.default.Decimal);
_TypeSystem2.default.Container.registerType(["$data.Float", "$data.Single", "float", "single", "JayFloat"], _TypeSystem2.default.Float);
_TypeSystem2.default.Container.registerType(["$data.Int16", "int16", "word", "JayInt16"], _TypeSystem2.default.Int16);
_TypeSystem2.default.Container.registerType(["$data.Int64", "int64", "long", "JayInt64"], _TypeSystem2.default.Int64);
_TypeSystem2.default.Container.registerType(["$data.String", "string", "text", "character", "JayString"], _TypeSystem2.default.String);
_TypeSystem2.default.Container.registerType(["$data.Array", "array", "Array", "[]", "JayArray"], _TypeSystem2.default.Array, function () {
    return _TypeSystem2.default.Array.apply(undefined, arguments);
});
_TypeSystem2.default.Container.registerType(["$data.Date", "datetime", "date", "JayDate"], _TypeSystem2.default.Date);
_TypeSystem2.default.Container.registerType(["$data.Time", "time", "JayTime"], _TypeSystem2.default.Time);
_TypeSystem2.default.Container.registerType(["$data.Day", "day", "JayDay"], _TypeSystem2.default.Day);
_TypeSystem2.default.Container.registerType(["$data.Duration", "duration", "JayDuration"], _TypeSystem2.default.Duration);
_TypeSystem2.default.Container.registerType(["$data.DateTimeOffset", "offset", "datetimeoffset", "JayDateTimeOffset"], _TypeSystem2.default.DateTimeOffset);
_TypeSystem2.default.Container.registerType(["$data.Boolean", "bool", "boolean", "JayBoolean"], _TypeSystem2.default.Boolean);
_TypeSystem2.default.Container.registerType(["$data.Object", "Object", "object", "{}", "JayObject"], _TypeSystem2.default.Object);
_TypeSystem2.default.Container.registerType(["$data.Function", "Function", "function"], _TypeSystem2.default.Function);
_TypeSystem2.default.Container.registerType(['$data.ObjectID', 'ObjectID', 'objectId', 'objectid', 'ID', 'Id', 'id', 'JayObjectID'], _TypeSystem2.default.ObjectID);

exports.default = _TypeSystem2.default;
module.exports = exports['default'];

},{"../TypeSystem.js":22}],32:[function(_dereq_,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Container = exports.$C = exports.Exception = exports.Guard = undefined;

var _TypeSystem = _dereq_('./TypeSystem.js');

var _TypeSystem2 = _interopRequireDefault(_TypeSystem);

var _Types = _dereq_('./Types/Types.js');

var _Types2 = _interopRequireDefault(_Types);

var _Trace = _dereq_('./Trace/Trace.js');

var _Trace2 = _interopRequireDefault(_Trace);

var _Logger = _dereq_('./Trace/Logger.js');

var _Logger2 = _interopRequireDefault(_Logger);

var _SimpleBase = _dereq_('./Types/SimpleBase.js');

var _SimpleBase2 = _interopRequireDefault(_SimpleBase);

var _Geospatial = _dereq_('./Types/Geospatial.js');

var _Geospatial2 = _interopRequireDefault(_Geospatial);

var _Geography = _dereq_('./Types/Geography.js');

var _Geography2 = _interopRequireDefault(_Geography);

var _Geometry = _dereq_('./Types/Geometry.js');

var _Geometry2 = _interopRequireDefault(_Geometry);

var _Guid = _dereq_('./Types/Guid.js');

var _Guid2 = _interopRequireDefault(_Guid);

var _Blob = _dereq_('./Types/Blob.js');

var _Blob2 = _interopRequireDefault(_Blob);

var _EdmTypes = _dereq_('./Types/EdmTypes.js');

var _EdmTypes2 = _interopRequireDefault(_EdmTypes);

var _Converter = _dereq_('./Types/Converter.js');

var _Converter2 = _interopRequireDefault(_Converter);

var _jaydataErrorHandler = _dereq_('jaydata-error-handler');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var Guard = exports.Guard = _jaydataErrorHandler.Guard;
_TypeSystem2.default.Guard = _jaydataErrorHandler.Guard;

var Exception = exports.Exception = _jaydataErrorHandler.Exception;
_TypeSystem2.default.Exception = _jaydataErrorHandler.Exception;

var $C = exports.$C = _TypeSystem.$C;
_TypeSystem2.default.$C = _TypeSystem.$C;

var Container = exports.Container = _TypeSystem.Container;
exports.default = _TypeSystem2.default;

},{"./Trace/Logger.js":20,"./Trace/Trace.js":21,"./TypeSystem.js":22,"./Types/Blob.js":23,"./Types/Converter.js":24,"./Types/EdmTypes.js":25,"./Types/Geography.js":26,"./Types/Geometry.js":27,"./Types/Geospatial.js":28,"./Types/Guid.js":29,"./Types/SimpleBase.js":30,"./Types/Types.js":31,"jaydata-error-handler":7}],33:[function(_dereq_,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _initializeJayDataClient = _dereq_('./initializeJayDataClient.js');

var _initializeJayDataClient2 = _interopRequireDefault(_initializeJayDataClient);

var _acorn = _dereq_('acorn');

var acorn = _interopRequireWildcard(_acorn);

var _package = _dereq_('../../package.json');

var pkg = _interopRequireWildcard(_package);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

if (typeof console === 'undefined') {
  console = {
    warn: function warn() {},
    error: function error() {},
    log: function log() {},
    dir: function dir() {},
    time: function time() {},
    timeEnd: function timeEnd() {}
  };
}

if (!console.warn) console.warn = function () {};
if (!console.error) console.error = function () {};

(function ($data) {
  ///<summary>
  /// Collection of JayData services
  ///</summary>
  $data.__namespace = true;
  $data.version = "JayData " + pkg.version;
  $data.versionNumber = pkg.version;
  $data.root = {};
  $data.Acorn = acorn;
})(_initializeJayDataClient2.default);
exports.default = _initializeJayDataClient2.default;
// Do not remove this block, it is used by jsdoc
/**
    @name $data.Base
    @class base class
*/

module.exports = exports['default'];

},{"../../package.json":16,"./initializeJayDataClient.js":34,"acorn":1}],34:[function(_dereq_,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = _data_handler;
function _data_handler() {
  console.log("@@@@", this);
  if (this instanceof _data_handler) {
    var type = _data_handler["implementation"].apply(this, arguments);
    return new type(arguments[1]);
  } else {
    return _data_handler["implementation"].apply(this, arguments);
  }
};
module.exports = exports['default'];

},{}],35:[function(_dereq_,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _index = _dereq_('../TypeSystem/index.js');

var _index2 = _interopRequireDefault(_index);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

_index2.default.Class.define('$data.Access', null, null, {}, {
    isAuthorized: function isAuthorized(access, user, sets, callback) {
        var pHandler = new _index2.default.PromiseHandler();
        var clbWrapper = pHandler.createCallback(callback);
        var pHandlerResult = pHandler.getPromise();

        //clbWrapper.error('Authorization failed', 'Access authorization');
        clbWrapper.success(true);

        return pHandlerResult;

        /*var error;
          if (!access) error = 'Access undefined';
        if (typeof access !== 'number') error = 'Invalid access type';
        if (!user) user = {}; //error = 'User undefined';
        if (!user.roles) user.roles = {}; //error = 'User has no roles';
        if (!roles) roles = {}; //error = 'Roles undefined';
        if (!(roles instanceof Array || typeof roles === 'object')) error = 'Invald roles type';
          var pHandler = new $data.PromiseHandler();
        var clbWrapper = pHandler.createCallback(callback);
        var pHandlerResult = pHandler.getPromise();
          if (error){
            clbWrapper.error(error, 'Access authorization');
            return pHandlerResult;
        }
          if (user.roles instanceof Array){
            var r = {};
            for (var i = 0; i < user.roles.length; i++){
                if (typeof user.roles[i] === 'string') r[user.roles[i]] = true;
            }
            user.roles = r;
        }
          if (roles instanceof Array){
            var r = {};
            for (var i = 0; i < roles.length; i++){
                if (typeof roles[i] === 'string') r[roles[i]] = true;
            }
            roles = r;
        }
          var args = arguments;
        var readyFn = function(result){
            if (result) clbWrapper.success(result);
            else clbWrapper.error('Authorization failed', args);
        };
          var rolesKeys = Object.getOwnPropertyNames(roles);
        var i = 0;
          var callbackFn = function(result){
            if (result) readyFn(result);
              if (typeof roles[rolesKeys[i]] === 'boolean' && roles[rolesKeys[i]]){
                if (user.roles[rolesKeys[i]]) readyFn(true);
                else{
                    i++;
                    if (i < rolesKeys.length) callbackFn();
                    else readyFn(false);
                }
            }else if (typeof roles[rolesKeys[i]] === 'function'){
                var r = roles[rolesKeys[i]].call(user);
                  if (typeof r === 'function') r.call(user, (i < rolesKeys.length ? callbackFn : readyFn));
                else{
                    if (r) readyFn(true);
                    else{
                        i++;
                        if (i < rolesKeys.length) callbackFn();
                        else readyFn(false);
                    }
                }
            }else if (typeof roles[rolesKeys[i]] === 'number'){
                if (((typeof user.roles[rolesKeys[i]] === 'number' && (user.roles[rolesKeys[i]] & access)) ||
                    (typeof user.roles[rolesKeys[i]] !== 'number' && user.roles[rolesKeys[i]])) &&
                    (roles[rolesKeys[i]] & access)) user.roles[rolesKeys[i]] &&  readyFn(true);
                else{
                    i++;
                    if (i < rolesKeys.length) callbackFn();
                    else readyFn(false);
                }
            }
        };
          callbackFn();
          return pHandlerResult;*/
    },
    getAccessBitmaskFromPermission: function getAccessBitmaskFromPermission(p) {
        var access = _index2.default.Access.None;

        if (p.Create) access |= _index2.default.Access.Create;
        if (p.Read) access |= _index2.default.Access.Read;
        if (p.Update) access |= _index2.default.Access.Update;
        if (p.Delete) access |= _index2.default.Access.Delete;
        if (p.DeleteBatch) access |= _index2.default.Access.DeleteBatch;
        if (p.Execute) access |= _index2.default.Access.Execute;

        return access;
    },
    None: { value: 0 },
    Create: { value: 1 },
    Read: { value: 2 },
    Update: { value: 4 },
    Delete: { value: 8 },
    DeleteBatch: { value: 16 },
    Execute: { value: 32 }
});

exports.default = _index2.default;
module.exports = exports['default'];

},{"../TypeSystem/index.js":32}],36:[function(_dereq_,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _index = _dereq_("../../TypeSystem/index.js");

var _index2 = _interopRequireDefault(_index);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

_index2.default.ajax = _index2.default.ajax || function () {
    var cfg = arguments[arguments.length - 1];
    var clb = _index2.default.PromiseHandlerBase.createCallbackSettings(cfg);
    clb.error("Not implemented");
};

exports.default = _index2.default;
module.exports = exports['default'];

},{"../../TypeSystem/index.js":32}],37:[function(_dereq_,module,exports){
'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; };

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _index = _dereq_('../../TypeSystem/index.js');

var _index2 = _interopRequireDefault(_index);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

if (typeof Ext !== 'undefined' && _typeof(Ext.Ajax)) {
    _index2.default.ajax = _index2.default.ajax || function (options) {
        Ext.Ajax.request(options);
    };
}

exports.default = _index2.default;
module.exports = exports['default'];

},{"../../TypeSystem/index.js":32}],38:[function(_dereq_,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _index = _dereq_('../../TypeSystem/index.js');

var _index2 = _interopRequireDefault(_index);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

if (typeof WinJS !== 'undefined' && WinJS.xhr) {
    _index2.default.ajax = _index2.default.ajax || function (options) {
        _index2.default.typeSystem.extend(options, {
            dataType: 'json',
            headers: {}
        });
        var dataTypes = {
            'json': {
                accept: 'application/json, text/javascript',
                convert: JSON.parse
            },
            'text': {
                accept: 'text/plain',
                convert: function convert(e) {
                    return e;
                }
            },
            'html': {
                accept: 'text/html',
                convert: function convert(e) {
                    return e;
                }
            },
            'xml': {
                accept: 'application/xml, text/xml',
                convert: function convert(e) {
                    // TODO?
                    return e;
                }
            }
        };
        var dataTypeContext = dataTypes[options.dataType.toLowerCase()];

        options.headers.Accept = dataTypeContext.accept;

        var successClb = options.success || _index2.default.defaultSuccessCallback;
        var errorClb = options.error || _index2.default.defaultErrorCallback;
        var progressClb = options.progress;

        var success = function success(r) {
            var result = dataTypeContext.convert(r.responseText);
            successClb(result);
        };
        var error = function error(r) {
            var error = dataTypeContext.convert(r.responseText);
            errorClb(error);
        };
        var progress = progressClb;

        WinJS.xhr(options).done(success, error, progress);
    };
}

exports.default = _index2.default;
module.exports = exports['default'];

},{"../../TypeSystem/index.js":32}],39:[function(_dereq_,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _index = _dereq_('../../TypeSystem/index.js');

var _index2 = _interopRequireDefault(_index);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

if (typeof jQuery !== 'undefined' && jQuery.ajax) {
    _index2.default.ajax = _index2.default.ajax || jQuery.ajax;
}

exports.default = _index2.default;
module.exports = exports['default'];

},{"../../TypeSystem/index.js":32}],40:[function(_dereq_,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _index = _dereq_("../../TypeSystem/index.js");

var _index2 = _interopRequireDefault(_index);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

_index2.default.Class.define("$data.Authentication.Anonymous", _index2.default.Authentication.AuthenticationBase, null, {
    constructor: function constructor(cfg) {
        this.configuration = cfg || {};
        this.Authenticated = false;
    },
    /// { error:, abort:, pending:, success: }
    Login: function Login(callbacks) {},
    Logout: function Logout() {},
    CreateRequest: function CreateRequest(cfg) {
        _index2.default.ajax(cfg);
    }

}, null);

exports.default = _index2.default;
module.exports = exports['default'];

},{"../../TypeSystem/index.js":32}],41:[function(_dereq_,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _index = _dereq_("../../TypeSystem/index.js");

var _index2 = _interopRequireDefault(_index);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

_index2.default.Class.define("$data.Authentication.AuthenticationBase", null, null, {
    constructor: function constructor(cfg) {
        this.configuration = cfg || {};
        this.Authenticated = false;
    },
    /// { error:, abort:, pending:, success: }
    Login: function Login(callbacks) {
        _index.Guard.raise("Pure class");
    },
    Logout: function Logout() {
        _index.Guard.raise("Pure class");
    },
    CreateRequest: function CreateRequest(cfg) {
        _index.Guard.raise("Pure class");
    }

}, null);

exports.default = _index2.default;
module.exports = exports['default'];

},{"../../TypeSystem/index.js":32}],42:[function(_dereq_,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _index = _dereq_('../../TypeSystem/index.js');

var _index2 = _interopRequireDefault(_index);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

_index2.default.Class.define("$data.Authentication.BasicAuth.BasicAuth", _index2.default.Authentication.AuthenticationBase, null, {
    constructor: function constructor(cfg) {
        this.configuration = _index2.default.typeSystem.extend({
            Username: '',
            Password: ''
        }, cfg);
    },
    Login: function Login(callbacks) {
        if (callbacks && typeof callbacks.pending == "function") callbacks.pending();
    },
    Logout: function Logout() {},
    CreateRequest: function CreateRequest(cfg) {
        if (!cfg) return;
        var _this = this;

        var origBeforeSend = cfg.beforeSend;
        cfg.beforeSend = function (xhr) {
            xhr.setRequestHeader("Authorization", "Basic  " + _this.__encodeBase64(_this.configuration.Username + ":" + _this.configuration.Password));

            if (typeof origBeforeSend == "function") origBeforeSend(xhr);
        };

        _index2.default.ajax(cfg);
    },
    __encodeBase64: function __encodeBase64(val) {
        var b64array = "ABCDEFGHIJKLMNOP" + "QRSTUVWXYZabcdef" + "ghijklmnopqrstuv" + "wxyz0123456789+/" + "=";

        input = val;
        var base64 = "";
        var hex = "";
        var chr1,
            chr2,
            chr3 = "";
        var enc1,
            enc2,
            enc3,
            enc4 = "";
        var i = 0;

        do {
            chr1 = input.charCodeAt(i++);
            chr2 = input.charCodeAt(i++);
            chr3 = input.charCodeAt(i++);

            enc1 = chr1 >> 2;
            enc2 = (chr1 & 3) << 4 | chr2 >> 4;
            enc3 = (chr2 & 15) << 2 | chr3 >> 6;
            enc4 = chr3 & 63;

            if (isNaN(chr2)) {
                enc3 = enc4 = 64;
            } else if (isNaN(chr3)) {
                enc4 = 64;
            }

            base64 = base64 + b64array.charAt(enc1) + b64array.charAt(enc2) + b64array.charAt(enc3) + b64array.charAt(enc4);
            chr1 = chr2 = chr3 = "";
            enc1 = enc2 = enc3 = enc4 = "";
        } while (i < input.length);

        return base64;
    }
}, null);

exports.default = _index2.default;
module.exports = exports['default'];

},{"../../TypeSystem/index.js":32}],43:[function(_dereq_,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _index = _dereq_('../../TypeSystem/index.js');

var _index2 = _interopRequireDefault(_index);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

_index2.default.Class.define("$data.Authentication.FacebookAuth", _index2.default.Authentication.AuthenticationBase, null, {
    constructor: function constructor(cfg) {
        this.configuration = _index2.default.typeSystem.extend({
            Url_code: '',
            type_code: '',
            scope: '',
            Url_token: '',
            type_token: '',
            access_token: '',
            app_id: ''
        }, cfg);
    },
    Login: function Login(callbacks) {
        if (this.Authenticated) {
            return;
        }

        var provider = this;
        provider.configuration.stateCallbacks = callbacks || {};

        _index2.default.ajax({
            url: this.configuration.Url_code,
            data: 'type=' + provider.configuration.type_code + '&client_id=' + provider.configuration.app_id + '&scope=' + provider.configuration.scope,
            type: 'POST',
            dataType: 'json',
            success: function success(data) {
                if (typeof provider.configuration.stateCallbacks.pending == "function") provider.configuration.stateCallbacks.pending(data);
                provider._processRequestToken(data);
                provider.Authenticated = true;
            },
            error: function error() {
                if (typeof provider.configuration.stateCallbacks.error == "function") provider.configuration.stateCallbacks.error(arguments);
            }
        });
    },
    Logout: function Logout() {
        this.Authenticated = false;
    },
    CreateRequest: function CreateRequest(cfg) {
        if (!cfg) return;
        var _this = this;

        if (cfg.url.indexOf('access_token=') === -1) {
            if (cfg.url && this.Authenticated) {
                var andChar = '?';
                if (cfg.url.indexOf(andChar) > 0) andChar = '&';

                if (this.configuration.access_token) cfg.url = cfg.url + andChar + 'access_token=' + this.configuration.access_token;
            }
        }

        _index2.default.ajax(cfg);
    },
    _processRequestToken: function _processRequestToken(verification_data) {
        var provider = this;

        _index2.default.ajax({
            url: provider.configuration.Url_token,
            data: 'type=' + provider.configuration.type_token + '&client_id=' + provider.configuration.app_id + '&code=' + verification_data.code,
            type: 'POST',
            dataType: 'json',
            success: function success(result) {
                provider.configuration.access_token = result.access_token;
                if (typeof provider.configuration.stateCallbacks.success == "function") provider.configuration.stateCallbacks.success(result);
            },
            error: function error(obj) {
                var data = eval('(' + obj.responseText + ')');
                if (data.error) {
                    if (data.error.message == "authorization_pending") {
                        setTimeout(function () {
                            provider._processRequestToken(verification_data);
                        }, 2000);
                    } else if ("authorization_declined") {
                        if (typeof provider.configuration.stateCallbacks.abort == "function") provider.configuration.stateCallbacks.abort(arguments);
                    }
                }
            }
        });
    }
}, null);

exports.default = _index2.default;
module.exports = exports['default'];

},{"../../TypeSystem/index.js":32}],44:[function(_dereq_,module,exports){
"use strict";

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; };

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.Entity = exports.Event = undefined;

var _index = _dereq_("../TypeSystem/index.js");

var _index2 = _interopRequireDefault(_index);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var EventSubscriber = _index2.default.Class.define("EventSubscriber", null, null, {
    constructor: function constructor(handler, state, thisArg) {
        /// <param name="handler" type="Function">
        ///     <summary>event handler</summary>
        ///     <signature>
        ///         <param name="sender" type="$data.Entity" />
        ///         <param name="eventData" type="EventData" />
        ///         <param name="state" type="Object" />
        ///     </signature>
        /// </param>
        /// <param name="state" type="Object" optional="true">custom state object</param>
        /// <param name="thisArg" type="Object" optional="true">[i]this[/i] context for handler</param>
        ///
        /// <field name="handler" type="function($data.Entity sender, EventData eventData, Object state)">event handler</field>
        /// <field name="state" type="Object">custom state object</field>
        /// <field name="thisArg">[i]this[/i] context for handler</field>
        this.handler = handler;
        this.state = state;
        this.thisArg = thisArg;
    },
    handler: {},
    state: {},
    thisArg: {}
});

_index2.default.Event = _index2.default.Class.define("$data.Event", null, null, {
    constructor: function constructor(name, sender) {
        ///<param name="name" type="string">The name of the event</param>
        ///<param name="sender" type="Object">The originator/sender of the event. [this] in handlers will be set to this</param>
        var subscriberList = null;
        var parentObject = sender;

        function detachHandler(list, handler) {
            ///<param name="list" type="Array" elementType="EventSubscriber" />
            ///<param name="handler" type="Function" />
            list.forEach(function (item, index) {
                if (item.handler == handler) {
                    list.splice(index, 1);
                }
            });
        }

        this.attach = function (handler, state, thisArg) {
            ///<param name="handler" type="Function">
            ///<signature>
            ///<param name="sender" type="Object" />
            ///<param name="eventData" type="Object" />
            ///<param name="state" type="Object" />
            ///</signature>
            ///</param>
            ///<param name="state" type="Object" optional="true" />
            ///<param name="thisArg" type="Object" optional="true" />
            if (!subscriberList) {
                subscriberList = [];
            }
            subscriberList.push(new EventSubscriber(handler, state, thisArg || sender));
        };
        this.detach = function (handler) {
            detachHandler(subscriberList, handler);
        };
        this.fire = function (eventData, snder) {
            var snd = snder || sender || this;
            //eventData.eventName = name;
            ///<value name="subscriberList type="Array" />
            if (subscriberList) {
                subscriberList.forEach(function (subscriber) {
                    ///<param name="subscriber" type="EventSubscriber" />
                    try {
                        subscriber.handler.call(subscriber.thisArg, snd, eventData, subscriber.state);
                    } catch (ex) {
                        console.log("unhandled exception in event handler. exception suppressed");
                        console.dir(ex);
                    }
                });
            }
        };
        this.fireCancelAble = function (eventData, snder) {
            var snd = snder || sender || this;
            //eventData.eventName = name;
            ///<value name="subscriberList type="Array" />
            var isValid = true;
            if (subscriberList) {
                subscriberList.forEach(function (subscriber) {
                    ///<param name="subscriber" type="EventSubscriber" />
                    try {
                        isValid = isValid && (subscriber.handler.call(subscriber.thisArg, snd, eventData, subscriber.state) === false ? false : true);
                    } catch (ex) {
                        console.log("unhandled exception in event handler. exception suppressed");
                        console.dir(ex);
                    }
                });
            }
            return isValid;
        };
    }
});

var EventData = _index2.default.Class.define("EventData", null, null, {
    eventName: {}
});

var PropertyChangeEventData = _index2.default.Class.define("PropertyChangeEventData", EventData, null, {
    constructor: function constructor(propertyName, oldValue, newValue) {
        this.propertyName = propertyName;
        this.oldValue = oldValue;
        this.newValue = newValue;
    },
    propertyName: {},
    oldValue: {},
    newValue: {}
});

var PropertyValidationEventData = _index2.default.Class.define("PropertyValidationEventData", EventData, null, {
    constructor: function constructor(propertyName, oldValue, newValue, errors) {
        this.propertyName = propertyName;
        this.oldValue = oldValue;
        this.newValue = newValue;
        this.errors = errors;
        this.cancel = false;
    },
    propertyName: {},
    oldValue: {},
    newValue: {},
    errors: {},
    cancel: {}
});

_index2.default.Entity = _index2.default.Class.define("$data.Entity", null, null, {
    constructor: function constructor(initData, newInstanceOptions) {
        /// <description>
        ///     This class provide a light weight, object-relational interface between
        ///     your javascript code and database.
        /// </description>
        ///
        /// <signature>
        ///     <param name="initData" type="Object">initialization data</param>
        ///     <example>
        ///         var category = new $news.Types.Category({ Title: 'Tech' });
        ///         $news.context.Categories.add(category);
        ///     </example>
        /// </signature>
        ///
        /// <field name="initData" type="Object">initialization data</field>
        /// <field name="context" type="$data.EntityContext"></field>
        /// <field name="propertyChanging" type="$data.Event"></field>
        /// <field name="propertyChanged" type="$data.Event"></field>
        /// <field name="propertyValidationError" type="$data.Event"></field>
        /// <field name="isValidated" type="Boolean">Determines the current $data.Entity is validated.</field>
        /// <field name="ValidationErrors" type="Array">array of $data.Validation.ValidationError</field>
        /// <field name="ValidationErrors" type="Array">array of MemberDefinition</field>
        /// <field name="entityState" type="Integer"></field>
        /// <field name="changedProperties" type="Array">array of MemberDefinition</field>

        this.initData = {};
        var thisType = this.getType();
        if (thisType.__copyPropertiesToInstance) {
            _index2.default.typeSystem.writePropertyValues(this);
        }

        var ctx = null;
        this.context = ctx;
        if ("setDefaultValues" in thisType) {
            if (!newInstanceOptions || newInstanceOptions.setDefaultValues !== false) {
                if (!initData || Object.keys(initData).length < 1) {
                    initData = thisType.setDefaultValues(initData);
                }
            }
        }

        if ((typeof initData === "undefined" ? "undefined" : _typeof(initData)) === "object") {
            var typeMemDefs = thisType.memberDefinitions;
            var memDefNames = typeMemDefs.getPublicMappedPropertyNames();

            for (var i in initData) {
                if (memDefNames.indexOf(i) > -1) {
                    var memberDef = typeMemDefs.getMember(i);
                    var type = _index.Container.resolveType(memberDef.type);
                    var value = initData[i];

                    if (memberDef.concurrencyMode === _index2.default.ConcurrencyMode.Fixed) {
                        this.initData[i] = value;
                    } else {
                        if (newInstanceOptions && newInstanceOptions.converters) {
                            var converter = newInstanceOptions.converters[_index.Container.resolveName(type)];
                            if (converter) value = converter(value);
                        }

                        this.initData[i] = _index.Container.convertTo(value, type, memberDef.elementType, newInstanceOptions);
                    }
                }
            }
        }

        if (newInstanceOptions && newInstanceOptions.entityBuilder) {
            newInstanceOptions.entityBuilder(this, thisType.memberDefinitions.asArray(), thisType);
        }

        this.changedProperties = undefined;
        this.entityState = undefined;
    },
    toString: function toString() {
        /// <summary>Returns a string that represents the current $data.Entity</summary>
        /// <returns type="String"/>

        return this.getType().fullName + "(" + (this.Id || this.Name || '') + ")";
    },
    toJSON: function toJSON() {
        /// <summary>Creates pure JSON object from $data.Entity.</summary>
        /// <returns type="Object">JSON representation</returns>

        var result = {};
        var self = this;
        this.getType().memberDefinitions.getPublicMappedProperties().forEach(function (memDef) {
            if (self[memDef.name] instanceof Date && memDef.type && _index.Container.resolveType(memDef.type) === _index2.default.DateTimeOffset) {
                result[memDef.name] = new _index2.default.DateTimeOffset(self[memDef.name]);
            } else {
                result[memDef.name] = self[memDef.name];
            }
        });
        return result;
    },
    equals: function equals(entity) {
        /// <summary>Determines whether the specified $data.Entity is equal to the current $data.Entity.</summary>
        /// <returns type="Boolean">[b]true[/b] if the specified $data.Entity is equal to the current $data.Entity; otherwise, [b]false[/b].</returns>

        if (entity.getType() !== this.getType()) {
            return false;
        }
        var entityPk = this.getType().memberDefinitions.getKeyProperties();
        for (var i = 0; i < entityPk.length; i++) {
            if (this[entityPk[i].name] != entity[entityPk[i].name]) {
                return false;
            }
        }
        return true;
    },

    propertyChanging: {
        dataType: _index2.default.Event, storeOnObject: true, monitorChanges: false, notMapped: true, enumerable: false, prototypeProperty: true,
        get: function get() {
            if (!this._propertyChanging) this._propertyChanging = new _index2.default.Event('propertyChanging', this);

            return this._propertyChanging;
        },
        set: function set(value) {
            this._propertyChanging = value;
        }
    },

    propertyChanged: {
        dataType: _index2.default.Event, storeOnObject: true, monitorChanges: false, notMapped: true, enumerable: false, prototypeProperty: true,
        get: function get() {
            if (!this._propertyChanged) this._propertyChanged = new _index2.default.Event('propertyChanged', this);

            return this._propertyChanged;
        },
        set: function set(value) {
            this._propertyChanged = value;
        }
    },

    propertyValidationError: {
        dataType: _index2.default.Event, storeOnObject: true, monitorChanges: false, notMapped: true, enumerable: false, prototypeProperty: true,
        get: function get() {
            if (!this._propertyValidationError) this._propertyValidationError = new _index2.default.Event('propertyValidationError', this);

            return this._propertyValidationError;
        },
        set: function set(value) {
            this._propertyValidationError = value;
        }
    },

    // protected
    storeProperty: function storeProperty(memberDefinition, value) {
        /// <param name="memberDefinition" type="MemberDefinition" />
        /// <param name="value" />

        if (memberDefinition.concurrencyMode !== _index2.default.ConcurrencyMode.Fixed) {
            value = _index.Container.convertTo(value, memberDefinition.type, memberDefinition.elementType);
        }

        var eventData = null;
        if (memberDefinition.monitorChanges != false && (this._propertyChanging || this._propertyChanged || "instancePropertyChanged" in this.constructor)) {
            var origValue = this[memberDefinition.name];
            eventData = new PropertyChangeEventData(memberDefinition.name, origValue, value);
            if (this._propertyChanging) this.propertyChanging.fire(eventData);
        }

        if (memberDefinition.monitorChanges != false && (this._propertyValidationError || "instancePropertyValidationError" in this.constructor)) {
            var errors = _index2.default.Validation.Entity.ValidateEntityField(this, memberDefinition, value);
            if (errors.length > 0) {
                var origValue = this[memberDefinition.name];
                var errorEventData = new PropertyValidationEventData(memberDefinition.name, origValue, value, errors);

                if (this._propertyValidationError) this.propertyValidationError.fire(errorEventData);
                if ("instancePropertyValidationError" in this.constructor) this.constructor["instancePropertyValidationError"].fire(errorEventData, this);

                if (errorEventData.cancel == true) return;
            }
        }

        if (memberDefinition.storeOnObject == true) {
            //TODO refactor to Base.getBackingFieldName
            var backingFieldName = "_" + memberDefinition.name;
            this[backingFieldName] = value;
        } else {
            this.initData[memberDefinition.name] = value;
        }
        this.isValidated = false;

        if (memberDefinition.monitorChanges != false && this.entityState == _index2.default.EntityState.Unchanged) this.entityState = _index2.default.EntityState.Modified;

        this._setPropertyChanged(memberDefinition);

        if (memberDefinition.monitorChanges != false) {
            //if (!this.changedProperties) {
            //    this.changedProperties = [];
            //}

            //if (!this.changedProperties.some(function (memDef) { return memDef.name == memberDefinition.name }))
            //    this.changedProperties.push(memberDefinition);

            if (this._propertyChanged) this.propertyChanged.fire(eventData);

            //TODO mixin framework
            if ("instancePropertyChanged" in this.constructor) {
                this.constructor["instancePropertyChanged"].fire(eventData, this);
            }
        }
    },
    _setPropertyChanged: function _setPropertyChanged(memberDefinition) {
        if (memberDefinition.monitorChanges != false && memberDefinition.name != "ValidationErrors") {
            if (!this.changedProperties) {
                this.changedProperties = [];
            }

            if (!this.changedProperties.some(function (memDef) {
                return memDef.name == memberDefinition.name;
            })) this.changedProperties.push(memberDefinition);
        }
    },

    // protected
    retrieveProperty: function retrieveProperty(memberDefinition) {
        /// <param name="memberDefinition" type="MemberDefinition" />

        if (memberDefinition.storeOnObject == true) {
            //TODO refactor to Base.getBackingFieldName
            var backingFieldName = "_" + memberDefinition.name;
            return this[backingFieldName];
        } else {
            return this.initData[memberDefinition.name];
        }
    },

    // protected
    getProperty: function getProperty(memberDefinition, callback, tran) {
        /// <summary>Retrieve value of member</summary>
        /// <param name="memberDefinition" type="MemberDefinition" />
        /// <param name="callback" type="Function">
        ///     <signature>
        ///         <param name="value" />
        ///     </signature>
        /// </param>
        /// <returns>value associated for [i]memberDefinition[/i]</returns>

        callback = _index2.default.PromiseHandlerBase.createCallbackSettings(callback);
        if (this[memberDefinition.name] != undefined) {
            if (tran instanceof _index2.default.Transaction) callback.success(this[memberDefinition.name], tran);else callback.success(this[memberDefinition.name]);
            return;
        }

        var context = this.context;
        if (!this.context) {
            try {
                var that = this;
                var storeToken = this.storeToken || this.getType().storeToken;
                if (storeToken && typeof storeToken.factory === 'function') {
                    var ctx = storeToken.factory();
                    return ctx.onReady().then(function (context) {
                        return context.loadItemProperty(that, memberDefinition, callback);
                    });
                }
            } catch (e) {}

            _index.Guard.raise(new _index.Exception('Entity not in context', 'Invalid operation'));
        } else {
            return context.loadItemProperty(this, memberDefinition, callback, tran);
        }
    },
    // protected
    setProperty: function setProperty(memberDefinition, value, callback, tran) {
        /// <param name="memberDefinition" type="MemberDefinition" />
        /// <param name="value" />
        /// <param name="callback" type="Function">done</param>
        this[memberDefinition.name] = value;

        //callback = $data.PromiseHandlerBase.createCallbackSettings(callback);
        var pHandler = new _index2.default.PromiseHandler();
        callback = pHandler.createCallback(callback);
        callback.success(this[memberDefinition.name]);
        return pHandler.getPromise();
    },

    isValid: function isValid() {
        /// <summary>Determines the current $data.Entity is validated and valid.</summary>
        /// <returns type="Boolean" />

        if (!this.isValidated) {
            this.ValidationErrors = _index2.default.Validation.Entity.ValidateEntity(this);
            this.isValidated = true;
        }
        return this.ValidationErrors.length == 0;
    },
    isValidated: { dataType: "bool", storeOnObject: true, monitorChanges: false, notMapped: true, enumerable: false, value: false },
    ValidationErrors: {
        dataType: Array,
        elementType: _index2.default.Validation.ValidationError,
        storeOnObject: true,
        monitorChanges: true,
        notMapped: true,
        enumerable: false
    },

    resetChanges: function resetChanges() {
        /// <summary>reset changes</summary>

        delete this._changedProperties;
    },

    changedProperties: {
        dataType: Array,
        elementType: _index.MemberDefinition,
        storeOnObject: true,
        monitorChanges: false,
        notMapped: true,
        enumerable: false
    },

    entityState: { dataType: "integer", storeOnObject: true, monitorChanges: false, notMapped: true, enumerable: false },
    /*
    toJSON: function () {
        if (this.context) {
            var itemType = this.getType();
            var storageModel = this.context._storageModel[itemType.name];
            var o = new Object();
            for (var property in this) {
                if (typeof this[property] !== "function") {
                    var excludedFields = storageModel.Associations.every(function (association) {
                        return association.FromPropertyName == property && (association.FromMultiplicity == "0..1" || association.FromMultiplicity == "1");
                    }, this);
                    if (!excludedFields) {
                        o[property] = this[property];
                    }
                }
            }
            return o;
        }
        return this;
    }   */
    //,

    //onReady: function (callback) {
    //    this.__onReadyList = this.__onReadyList || [];
    //    this.__onReadyList.push(callback);
    //},

    remove: function remove() {
        if (_index2.default.ItemStore && 'EntityInstanceRemove' in _index2.default.ItemStore) return _index2.default.ItemStore.EntityInstanceRemove.apply(this, arguments);else throw 'not implemented'; //todo
    },
    save: function save() {
        if (_index2.default.ItemStore && 'EntityInstanceSave' in _index2.default.ItemStore) return _index2.default.ItemStore.EntityInstanceSave.apply(this, arguments);else throw 'not implemented'; //todo
    },
    refresh: function refresh() {
        if (_index2.default.ItemStore && 'EntityInstanceRefresh' in _index2.default.ItemStore) return _index2.default.ItemStore.EntityInstanceRefresh.apply(this, arguments);else throw 'not implemented'; //todo
    },
    storeToken: { type: Object, monitorChanges: false, notMapped: true, storeOnObject: true },

    getFieldUrl: function getFieldUrl(field) {
        if (this.context) {
            return this.context.getFieldUrl(this, field);
        } else if (this.getType().storeToken && typeof this.getType().storeToken.factory === 'function') {
            var context = this.getType().storeToken.factory();
            return context.getFieldUrl(this, field);
        } else if (this.getType().storeToken) {
            try {
                var ctx = _index2.default.ItemStore._getContextPromise('default', this.getType());
                if (ctx instanceof _index2.default.EntityContext) {
                    return ctx.getFieldUrl(this, field);
                }
            } catch (e) {}
        }
        return '#';
    }
}, {
    //create get_[property] and set_[property] functions for properties
    __setPropertyfunctions: { value: true, notMapped: true, enumerable: false, storeOnObject: true },
    //copy public properties to current instance
    __copyPropertiesToInstance: { value: false, notMapped: true, enumerable: false, storeOnObject: true },

    inheritedTypeProcessor: function inheritedTypeProcessor(type) {
        if (_index2.default.ItemStore && 'EntityInheritedTypeProcessor' in _index2.default.ItemStore) _index2.default.ItemStore.EntityInheritedTypeProcessor.apply(this, arguments);

        //default value setter method factory
        type.defaultValues = {};

        type.memberDefinitions.asArray().forEach(function (pd) {
            if (pd.hasOwnProperty("defaultValue")) {
                type.defaultValues[pd.name] = pd.defaultValue;
            }
        });

        if (Object.keys(type.defaultValues).length > 0) {
            type.setDefaultValues = function (initData, instance) {
                initData = initData || {};
                var dv = type.defaultValues;
                for (var n in dv) {
                    if (!(n in initData)) {
                        var value = dv[n];
                        if ("function" === typeof value) {
                            initData[n] = dv[n](n, instance);
                        } else {
                            initData[n] = dv[n];
                        }
                    }
                }
                return initData;
            };
        }
    },

    //Type Events
    addEventListener: function addEventListener(eventName, fn) {
        var delegateName = "on" + eventName;
        if (!(delegateName in this)) {
            this[delegateName] = new _index2.default.Event(eventName, this);
        }
        this[delegateName].attach(fn);
    },
    removeEventListener: function removeEventListener(eventName, fn) {
        var delegateName = "on" + eventName;
        if (!(delegateName in this)) {
            return;
        }
        this[delegateName].detach(fn);
    },
    raiseEvent: function raiseEvent(eventName, data) {
        var delegateName = "on" + eventName;
        if (!(delegateName in this)) {
            return;
        }
        this[delegateName].fire(data);
    },

    getFieldNames: function getFieldNames() {
        return this.memberDefinitions.getPublicMappedPropertyNames();
    },

    'from$data.Object': function from$dataObject(value, type, t, options) {
        if (!_index.Guard.isNullOrUndefined(value)) {
            var newInstanceOptions;
            if (options && options.converters) {
                newInstanceOptions = {
                    converters: options.converters
                };
            }

            return new this(value, newInstanceOptions);
        } else {
            return value;
        }
    }

});

_index2.default.define = function (name, container, definition) {
    if (container && !(container instanceof _index2.default.ContainerClass)) {
        definition = container;
        container = undefined;
    }
    if (!definition) {
        throw new Error("json object type is not supported yet");
    }
    var _def = {};
    var hasKey = false;
    var keyFields = [];
    Object.keys(definition).forEach(function (fieldName) {
        var propDef = definition[fieldName];
        if ((typeof propDef === "undefined" ? "undefined" : _typeof(propDef)) === 'object' && ("type" in propDef || "get" in propDef || "set" in propDef)) {

            _def[fieldName] = propDef;
            if (propDef.key) {
                keyFields.push(propDef);
            }

            if (("get" in propDef || "set" in propDef) && (!('notMapped' in propDef) || propDef.notMapped === true)) {
                propDef.notMapped = true;
                propDef.storeOnObject = true;
            }
            if ("get" in propDef && !("set" in propDef)) {
                propDef.set = function () {};
            } else if ("set" in propDef && !("get" in propDef)) {
                propDef.get = function () {};
            }
        } else {
            _def[fieldName] = { type: propDef };
        }
    });

    if (keyFields.length < 1) {
        var keyProp;
        switch (true) {
            case "id" in _def:
                keyProp = "id";
                break;
            case "Id" in _def:
                keyProp = "Id";
                break;
            case "ID" in _def:
                keyProp = "ID";
                break;
        }
        if (keyProp) {
            _def[keyProp].key = true;
            var propTypeName = _index2.default.Container.resolveName(_def[keyProp].type);
            _def[keyProp].computed = true;
            //if ("$data.Number" === propTypeName || "$data.Integer" === propTypeName) {
            //}
        } else {
                _def.Id = { type: "int", key: true, computed: true };
            }
    }

    var entityType = _index2.default.Entity.extend(name, container, _def);
    return entityType;
};
_index2.default.implementation = function (name) {
    return _index.Container.resolveType(name);
};

var Event = exports.Event = _index2.default.Event;
var Entity = exports.Entity = _index2.default.Entity;
exports.default = _index2.default;

},{"../TypeSystem/index.js":32}],45:[function(_dereq_,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _index = _dereq_('../TypeSystem/index.js');

var _index2 = _interopRequireDefault(_index);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

_index2.default.Class.define("$data.EntityAttachMode", null, null, {}, {
    defaultMode: 'Default',
    AllChanged: function AllChanged(data) {
        var memDefs = data.getType().memberDefinitions.getPublicMappedProperties();
        for (var i = 0; i < memDefs.length; i++) {
            data._setPropertyChanged(memDefs[i]);
        }
        data.entityState = _index2.default.EntityState.Modified;
    },
    KeepChanges: function KeepChanges(data) {
        if (data.changedProperties && data.changedProperties.length > 0) {
            data.entityState = _index2.default.EntityState.Modified;
        } else {
            data.entityState = _index2.default.EntityState.Unchanged;
        }
    },
    Default: function Default(data) {
        data.entityState = _index2.default.EntityState.Unchanged;
        data.changedProperties = undefined;
    }
});

exports.default = _index2.default;
module.exports = exports['default'];

},{"../TypeSystem/index.js":32}],46:[function(_dereq_,module,exports){
'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; };

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _index = _dereq_('../TypeSystem/index.js');

var _index2 = _interopRequireDefault(_index);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

(function () {

    _index2.default.defaults = _index2.default.defaults || {};
    _index2.default.defaults.defaultDatabaseName = 'JayDataDefault';
    _index2.default.defaults.enableRelatedEntityReadMethods = true;
    _index2.default.defaults.relatedEntityReadMethodPrefix = 'get';
    _index2.default.defaults.relatedEntityProxyPrefix = '$relatedProxy';
})();

_index2.default.Class.define('$data.StorageModel', null, null, {
    constructor: function constructor() {
        ///<field name="LogicalType" type="$data.Entity">User defined type</field>
        this.ComplexTypes = [];
        this.Enums = [];
        this.Associations = [];
    },
    LogicalType: {},
    LogicalTypeName: {},
    PhysicalType: {},
    PhysicalTypeName: {},
    EventHandlers: {},
    TableName: {},
    TableOptions: { value: undefined },
    ComplexTypes: {},
    Enums: {},
    Associations: {},
    ContextType: {},
    Roles: {}
}, null);
_index2.default.Class.define('$data.Association', null, null, {
    constructor: function constructor(initParam) {
        if (initParam) {
            this.From = initParam.From;
            this.FromType = initParam.FromType;
            this.FromMultiplicity = initParam.FromMultiplicity;
            this.FromPropertyName = initParam.FromPropertyName;
            this.To = initParam.To;
            this.ToType = initParam.ToType;
            this.ToMultiplicity = initParam.ToMultiplicity;
            this.ToPropertyName = initParam.ToPropertyName;
        }
    },
    From: {},
    FromType: {},
    FromMultiplicity: {},
    FromPropertyName: {},
    To: {},
    ToType: {},
    ToMultiplicity: {},
    ToPropertyName: {},
    ReferentialConstraint: {}
}, null);
_index2.default.Class.define('$data.ComplexType', _index2.default.Association, null, {}, null);

/**
 * @public
 * @module $data.EntityContext
 */
/**
* Provides facilities for querying and working with entity data as objects
*/
_index2.default.Class.define('$data.EntityContext', null, null, {
    /**
     * @constructs $data.EntityContext
     * Provides facilities for querying and working with entity data as objects
     * @param {Object} storageProviderCfg - Storage provider specific configuration object
     * @param {string} storageProviderCfg.provider - Storage provider type name: 'oData', 'indexedDb', 'webSql', 'sqLite', 'mongoDB'
     * @param {string} [storageProviderCfg.oDataServiceHost=/odata.svc] - URI of OData endpoint. Provider: OData
     * @param {string} [storageProviderCfg.maxDataServiceVersion=4.0] - Maximal OData version. Provider: OData
     * @param {string} [storageProviderCfg.dataServiceVersion] - version of your OData endpoint. Provider: OData
     * @param {string} [storageProviderCfg.user] - login name for basic auth. Provider: OData
     * @param {string} [storageProviderCfg.password] - password for basic auth. Provider: OData
     * @param {string} [storageProviderCfg.UpdateMethod=PATCH] - HTTP verb used while updating entities, this should be configured according the accepted verb by your OData endpoint. Provider: OData
     * @param {string} [storageProviderCfg.databaseName] - database name created by the following providers: webSql, sqLite, indexedDb, mongoDB
     * @example <caption>initialize OData context</caption>
     * var northwind = new Northwind({
     *  provider: 'oData',
     *  oDataServiceHost: '/api/odata.svc'
     * });
     * northwind.onReady(function() {
     *  //work with your context
     * });
     *
     * @example <caption>initialize webSql context</caption>
     * var northwind = new Northwind({
     *  provider: 'webSql',
     *  databaseName: 'Northwind'
     * });
     * northwind.onReady(function() {
     *  //work with your context
     * });
     */
    constructor: function constructor(storageProviderCfg) {
        if (_index2.default.ItemStore && 'ContextRegister' in _index2.default.ItemStore) _index2.default.ItemStore.ContextRegister.apply(this, arguments);

        if (storageProviderCfg.queryCache) this.queryCache = storageProviderCfg.queryCache;

        if ("string" === typeof storageProviderCfg) {
            if (0 === storageProviderCfg.indexOf("http")) {
                storageProviderCfg = {
                    name: "oData",
                    oDataServiceHost: storageProviderCfg
                };
            } else {
                storageProviderCfg = {
                    name: "local",
                    databaseName: storageProviderCfg
                };
            }
        }

        if ("provider" in storageProviderCfg) {
            storageProviderCfg.name = storageProviderCfg.provider;
        }

        //Initialize properties
        this.lazyLoad = false;
        this.trackChanges = false;
        this._entitySetReferences = {};
        this._storageModel = [];

        var ctx = this;
        ctx._isOK = false;

        var origSuccessInitProvider = this._successInitProvider;
        this._successInitProvider = function (errorOrContext) {
            if (errorOrContext instanceof _index2.default.EntityContext) {
                origSuccessInitProvider(ctx);
            } else {
                origSuccessInitProvider(ctx, errorOrContext);
            }
        };

        this._storageModel.getStorageModel = function (typeName) {
            var name = _index.Container.resolveName(typeName);
            return ctx._storageModel[name];
        };
        if (typeof storageProviderCfg.name === 'string') {
            var tmp = storageProviderCfg.name;
            storageProviderCfg.name = [tmp];
        }
        var i = 0,
            providerType;
        var providerList = [].concat(storageProviderCfg.name);
        var callBack = _index2.default.PromiseHandlerBase.createCallbackSettings({ success: this._successInitProvider, error: this._successInitProvider });

        this._initStorageModelSync();
        ctx._initializeEntitySets(ctx.getType());

        _index2.default.StorageProviderLoader.load(providerList, {
            success: function success(providerType) {
                ctx.storageProvider = new providerType(storageProviderCfg, ctx);
                ctx.storageProvider.setContext(ctx);
                ctx.stateManager = new _index2.default.EntityStateManager(ctx);

                var contextType = ctx.getType();
                if (providerType.name in contextType._storageModelCache) {
                    ctx._storageModel = contextType._storageModelCache[providerType.name];
                } else {
                    _index2.default.defaults.enableRelatedEntityReadMethods && ctx._applyRelatedEntityMethodsToTypes();
                    ctx._initializeStorageModel();
                    contextType._storageModelCache[providerType.name] = ctx._storageModel;
                }
                _index2.default.defaults.enableRelatedEntityReadMethods && ctx._applyRelatedEntityMethodsToContext();

                //ctx._initializeEntitySets(contextType);
                if (storageProviderCfg && storageProviderCfg.user) Object.defineProperty(ctx, 'user', { value: storageProviderCfg.user, enumerable: true });
                if (storageProviderCfg && storageProviderCfg.checkPermission) Object.defineProperty(ctx, 'checkPermission', { value: storageProviderCfg.checkPermission, enumerable: true });

                //ctx._isOK = false;
                ctx._initializeStore(callBack);
            },
            error: function error() {
                callBack.error('Provider fallback failed!');
            }
        });

        this.addEventListener = function (eventName, fn) {
            var delegateName = "on" + eventName;
            if (!(delegateName in this)) {
                this[delegateName] = new _index2.default.Event(eventName, this);
            }
            this[delegateName].attach(fn);
        };

        this.removeEventListener = function (eventName, fn) {
            var delegateName = "on" + eventName;
            if (!(delegateName in this)) {
                return;
            }
            this[delegateName].detach(fn);
        };

        this.raiseEvent = function (eventName, data) {
            var delegateName = "on" + eventName;
            if (!(delegateName in this)) {
                return;
            }
            this[delegateName].fire(data);
        };

        this.ready = this.onReady({
            success: _index2.default.defaultSuccessCallback,
            error: function error() {
                if (_index2.default.PromiseHandler !== _index2.default.PromiseHandlerBase) {
                    _index2.default.defaultErrorCallback.apply(this, arguments);
                } else {
                    _index2.default.Trace.error(arguments);
                }
            }
        });
    },
    beginTransaction: function beginTransaction() {
        var tables = null;
        var callBack = null;
        var isWrite = false;

        function readParam(value) {
            if (_index.Guard.isNullOrUndefined(value)) return;

            if (typeof value === 'boolean') {
                isWrite = value;
            } else if (Array.isArray(value)) {
                tables = value;
            } else {
                callBack = value;
            }
        }

        readParam(arguments[0]);
        readParam(arguments[1]);
        readParam(arguments[2]);

        var pHandler = new _index2.default.PromiseHandler();
        callBack = pHandler.createCallback(callBack);

        //callBack = $data.PromiseHandlerBase.createCallbackSettings(callBack);
        this.storageProvider._beginTran(tables, isWrite, callBack);

        return pHandler.getPromise();
    },
    _isReturnTransaction: function _isReturnTransaction(transaction) {
        return transaction instanceof _index2.default.Base || transaction === 'returnTransaction';
    },
    _applyTransaction: function _applyTransaction(scope, cb, args, transaction, isReturnTransaction) {
        if (isReturnTransaction === true) {
            if (transaction instanceof _index2.default.Transaction) {
                Array.prototype.push.call(args, transaction);
                cb.apply(scope, args);
            } else {
                this.beginTransaction(function (tran) {
                    Array.prototype.push.call(args, tran);
                    cb.apply(scope, args);
                });
            }
        } else {
            cb.apply(scope, args);
        }
    },

    getDataType: function getDataType(dataType) {
        // Obsolate
        if (typeof dataType == "string") {
            var memDef_dataType = this[dataType];
            if (memDef_dataType === undefined || memDef_dataType === null) {
                memDef_dataType = eval(dataType);
            }
            return memDef_dataType;
        }
        return dataType;
    },
    _initializeEntitySets: function _initializeEntitySets(ctor) {

        for (var i = 0, l = this._storageModel.length; i < l; i++) {
            var storageModel = this._storageModel[i];
            this[storageModel.ItemName] = new _index2.default.EntitySet(storageModel.LogicalType, this, storageModel.ItemName, storageModel.EventHandlers, storageModel.Roles);
            var sm = this[storageModel.ItemName];
            sm.name = storageModel.ItemName;
            sm.tableName = storageModel.TableName;
            sm.tableOptions = storageModel.TableOptions;
            sm.eventHandlers = storageModel.EventHandlers;
            this._entitySetReferences[storageModel.LogicalType.name] = sm;

            this._initializeActions(sm, ctor, ctor.getMemberDefinition(storageModel.ItemName));
        }
    },
    _initializeStore: function _initializeStore(callBack) {
        if (this.storageProvider) {
            this.storageProvider.initializeStore(callBack);
        }
    },

    _initStorageModelSync: function _initStorageModelSync() {
        var _memDefArray = this.getType().memberDefinitions.asArray();

        for (var i = 0; i < _memDefArray.length; i++) {
            var item = _memDefArray[i];
            if ('dataType' in item) {
                var itemResolvedDataType = _index.Container.resolveType(item.dataType);
                if (itemResolvedDataType && itemResolvedDataType.isAssignableTo && itemResolvedDataType.isAssignableTo(_index2.default.EntitySet)) {
                    var elementType = _index.Container.resolveType(item.elementType);
                    var storageModel = new _index2.default.StorageModel();
                    storageModel.TableName = item.tableName || item.name;
                    storageModel.TableOptions = item.tableOptions;
                    storageModel.ItemName = item.name;
                    storageModel.LogicalType = elementType;
                    storageModel.LogicalTypeName = elementType.name;
                    storageModel.PhysicalTypeName = _index2.default.EntityContext._convertLogicalTypeNameToPhysical(storageModel.LogicalTypeName);
                    storageModel.ContextType = this.getType();
                    storageModel.Roles = item.roles;
                    if (item.indices) {
                        storageModel.indices = item.indices;
                    }
                    if (item.beforeCreate) {
                        if (!storageModel.EventHandlers) storageModel.EventHandlers = {};
                        storageModel.EventHandlers.beforeCreate = item.beforeCreate;
                    }
                    if (item.beforeRead) {
                        if (!storageModel.EventHandlers) storageModel.EventHandlers = {};
                        storageModel.EventHandlers.beforeRead = item.beforeRead;
                    }
                    if (item.beforeUpdate) {
                        if (!storageModel.EventHandlers) storageModel.EventHandlers = {};
                        storageModel.EventHandlers.beforeUpdate = item.beforeUpdate;
                    }
                    if (item.beforeDelete) {
                        if (!storageModel.EventHandlers) storageModel.EventHandlers = {};
                        storageModel.EventHandlers.beforeDelete = item.beforeDelete;
                    }
                    if (item.afterCreate) {
                        if (!storageModel.EventHandlers) storageModel.EventHandlers = {};
                        storageModel.EventHandlers.afterCreate = item.afterCreate;
                    }
                    if (item.afterRead) {
                        if (!storageModel.EventHandlers) storageModel.EventHandlers = {};
                        storageModel.EventHandlers.afterRead = item.afterRead;
                    }
                    if (item.afterUpdate) {
                        if (!storageModel.EventHandlers) storageModel.EventHandlers = {};
                        storageModel.EventHandlers.afterUpdate = item.afterUpdate;
                    }
                    if (item.afterDelete) {
                        if (!storageModel.EventHandlers) storageModel.EventHandlers = {};
                        storageModel.EventHandlers.afterDelete = item.afterDelete;
                    }
                    this._storageModel.push(storageModel);
                    var name = _index.Container.resolveName(elementType);
                    this._storageModel[name] = storageModel;
                }
            }
        }
    },
    _initializeStorageModel: function _initializeStorageModel() {

        var _memDefArray = this.getType().memberDefinitions.asArray();

        if (typeof intellisense !== 'undefined') return;

        for (var i = 0; i < this._storageModel.length; i++) {
            var storageModel = this._storageModel[i];

            ///<param name="storageModel" type="$data.StorageModel">Storage model item</param>
            var dbEntityInstanceDefinition = {};

            storageModel.Associations = storageModel.Associations || [];
            storageModel.ComplexTypes = storageModel.ComplexTypes || [];
            storageModel.Enums = storageModel.Enums || [];
            for (var j = 0; j < storageModel.LogicalType.memberDefinitions.getPublicMappedProperties().length; j++) {
                var memDef = storageModel.LogicalType.memberDefinitions.getPublicMappedProperties()[j];
                ///<param name="memDef" type="MemberDefinition">Member definition instance</param>

                var memDefResolvedDataType = _index.Container.resolveType(memDef.dataType);

                if ((this.storageProvider.supportedDataTypes.indexOf(memDefResolvedDataType) > -1 || memDefResolvedDataType.isAssignableTo && memDefResolvedDataType.isAssignableTo(_index2.default.Enum)) && _index.Guard.isNullOrUndefined(memDef.inverseProperty)) {
                    //copy member definition
                    var t = JSON.parse(JSON.stringify(memDef));
                    //change datatype to resolved type
                    t.dataType = memDefResolvedDataType;
                    dbEntityInstanceDefinition[memDef.name] = t;

                    if (memDefResolvedDataType.isAssignableTo && memDefResolvedDataType.isAssignableTo(_index2.default.Enum)) {
                        this._build_EnumDefinition(dbEntityInstanceDefinition, storageModel, memDefResolvedDataType, memDef);
                    }

                    continue;
                }

                this._buildDbType_navigationPropertyComplite(memDef, memDefResolvedDataType, storageModel);

                //var memDef_dataType = this.getDataType(memDef.dataType);
                if ((memDefResolvedDataType === _index2.default.Array || memDefResolvedDataType.isAssignableTo && memDefResolvedDataType.isAssignableTo(_index2.default.EntitySet)) && memDef.inverseProperty && memDef.inverseProperty !== '$$unbound') {
                    this._buildDbType_Collection_OneManyDefinition(dbEntityInstanceDefinition, storageModel, memDefResolvedDataType, memDef);
                } else {
                    if (memDef.inverseProperty) {
                        if (memDef.inverseProperty === '$$unbound') {
                            //member definition is navigation but not back reference
                            if (memDefResolvedDataType === _index2.default.Array) {
                                this._buildDbType_Collection_OneManyDefinition(dbEntityInstanceDefinition, storageModel, memDefResolvedDataType, memDef);
                            } else {
                                this._buildDbType_ElementType_OneManyDefinition(dbEntityInstanceDefinition, storageModel, memDefResolvedDataType, memDef);
                            }
                        } else {
                            //member definition is navigation property one..one or one..many case
                            var fields = memDefResolvedDataType.memberDefinitions.getMember(memDef.inverseProperty);
                            if (fields) {
                                if (fields.elementType) {
                                    //member definition is one..many connection
                                    var referealResolvedType = _index.Container.resolveType(fields.elementType);
                                    if (referealResolvedType === storageModel.LogicalType) {
                                        this._buildDbType_ElementType_OneManyDefinition(dbEntityInstanceDefinition, storageModel, memDefResolvedDataType, memDef);
                                    } else {
                                        if (typeof intellisense === 'undefined') {
                                            _index.Guard.raise(new _index.Exception('Inverse property not valid, refereed item element type not match: ' + storageModel.LogicalTypeName, ', property: ' + memDef.name));
                                        }
                                    }
                                } else {
                                    //member definition is one..one connection
                                    this._buildDbType_ElementType_OneOneDefinition(dbEntityInstanceDefinition, storageModel, memDefResolvedDataType, memDef);
                                }
                            } else {
                                if (typeof intellisense === 'undefined') {
                                    _index.Guard.raise(new _index.Exception('Inverse property not valid'));
                                }
                            }
                        }
                    } else {
                        //member definition is a complex type
                        this._buildDbType_addComplexTypePropertyDefinition(dbEntityInstanceDefinition, storageModel, memDefResolvedDataType, memDef);
                    }
                }
            }
            this._buildDbType_modifyInstanceDefinition(dbEntityInstanceDefinition, storageModel, this);
            var dbEntityClassDefinition = {};
            dbEntityClassDefinition.convertTo = this._buildDbType_generateConvertToFunction(storageModel, this);
            this._buildDbType_modifyClassDefinition(dbEntityClassDefinition, storageModel, this);

            //create physical type
            //TODO
            storageModel.PhysicalType = _index2.default.Class.define(storageModel.PhysicalTypeName, _index2.default.Entity, storageModel.LogicalType.container, dbEntityInstanceDefinition, dbEntityClassDefinition);
        }
    },
    _initializeActions: function _initializeActions(es, ctor, esDef) {
        if (esDef && esDef.actions) {
            var actionKeys = Object.keys(esDef.actions);
            for (var i = 0; i < actionKeys.length; i++) {
                var actionName = actionKeys[i];
                var action = esDef.actions[actionName];
                if (typeof action === 'function') {
                    es[actionName] = action;
                } else {
                    var actionDef = _index2.default.MemberDefinition.translateDefinition(action, actionName, ctor);
                    if (actionDef instanceof _index2.default.MemberDefinition && actionDef.kind === _index2.default.MemberTypes.method) {
                        es[actionName] = actionDef.method;
                    }
                }
            }
        }
    },
    _buildDbType_navigationPropertyComplite: function _buildDbType_navigationPropertyComplite(memDef, memDefResolvedDataType, storageModel) {
        if (!memDef.inverseProperty) {
            var refMemDefs = null;
            if (memDefResolvedDataType === _index2.default.Array || memDefResolvedDataType.isAssignableTo && memDefResolvedDataType.isAssignableTo(_index2.default.EntitySet)) {
                var refStorageModel = this._storageModel.getStorageModel(_index.Container.resolveType(memDef.elementType));
                if (refStorageModel) {
                    refMemDefs = [];
                    var pubDefs = refStorageModel.LogicalType.memberDefinitions.getPublicMappedProperties();
                    for (var i = 0; i < pubDefs.length; i++) {
                        var m = pubDefs[i];
                        if (m.inverseProperty == memDef.name && _index.Container.resolveType(m.dataType) === _index.Container.resolveType(storageModel.LogicalType)) refMemDefs.push(m);
                    }
                }
            } else {
                var refStorageModel = this._storageModel.getStorageModel(memDefResolvedDataType);
                if (refStorageModel) {
                    refMemDefs = [];
                    var pubDefs = refStorageModel.LogicalType.memberDefinitions.getPublicMappedProperties();
                    for (var i = 0; i < pubDefs.length; i++) {
                        var m = pubDefs[i];
                        if (m.elementType && m.inverseProperty == memDef.name && _index.Container.resolveType(m.elementType) === storageModel.LogicalType) refMemDefs.push(m);else if (m.inverseProperty == memDef.name && _index.Container.resolveType(m.dataType) === storageModel.LogicalType) refMemDefs.push(m);
                    }
                }
            }
            if (refMemDefs) {
                if (refMemDefs.length > 1) {
                    if (typeof intellisense !== 'undefined') {
                        _index.Guard.raise(new _index.Exception('More than one inverse property refer to this member definition: ' + memDef.name + ', type: ' + _index.Container.resolveName(storageModel.LogicalType)));
                    }
                }
                var refMemDef = refMemDefs.pop();
                if (refMemDef) {
                    memDef.inverseProperty = refMemDef.name;
                }
            }
        } else {
            var refStorageModel = null;
            if (memDefResolvedDataType === _index2.default.Array || memDefResolvedDataType.isAssignableTo && memDefResolvedDataType.isAssignableTo(_index2.default.EntitySet)) {
                refStorageModel = this._storageModel.getStorageModel(_index.Container.resolveType(memDef.elementType));
            } else {
                refStorageModel = this._storageModel.getStorageModel(memDefResolvedDataType);
            }

            var p = refStorageModel.LogicalType.memberDefinitions.getMember(memDef.inverseProperty);
            if (p) {
                if (p.inverseProperty) {
                    if (p.inverseProperty != memDef.name) {
                        if (typeof intellisense === 'undefined') {
                            _index.Guard.raise(new _index.Exception('Inverse property mismatch'));
                        }
                    }
                } else {
                    p.inverseProperty = memDef.name;
                }
            }
        }
    },
    _buildDbType_generateConvertToFunction: function _buildDbType_generateConvertToFunction(storageModel) {
        return function (instance) {
            return instance;
        };
    },
    _buildDbType_modifyInstanceDefinition: function _buildDbType_modifyInstanceDefinition(instanceDefinition, storageModel) {
        return;
    },
    _buildDbType_modifyClassDefinition: function _buildDbType_modifyClassDefinition(classDefinition, storageModel) {
        return;
    },
    _buildDbType_addComplexTypePropertyDefinition: function _buildDbType_addComplexTypePropertyDefinition(dbEntityInstanceDefinition, storageModel, memDef_dataType, memDef) {
        this._addNavigationPropertyDefinition(dbEntityInstanceDefinition, memDef, memDef.name, _index2.default.MemberTypes.complexProperty);
        var complexType = this._createComplexElement(storageModel.LogicalType, "", memDef.name, memDef_dataType, "", "");
        storageModel.ComplexTypes[memDef.name] = complexType;
        storageModel.ComplexTypes.push(complexType);
    },
    _buildDbType_Collection_OneManyDefinition: function _buildDbType_Collection_OneManyDefinition(dbEntityInstanceDefinition, storageModel, memDef_dataType, memDef) {
        var refereedType = _index.Container.resolveType(memDef.elementType);
        if (refereedType === undefined || refereedType === null) {
            if (typeof intellisense === 'undefined') {
                _index.Guard.raise(new _index.Exception("Element type definition error", "Field definition", memDef));
            }
        }
        var refereedStorageModel = this._storageModel.getStorageModel(refereedType);
        //var refereedStorageModel = this._storageModel.filter(function (s) { return s.LogicalType === refereedType; })[0];
        if (!refereedStorageModel) {
            if (typeof intellisense === 'undefined') {
                _index.Guard.raise(new _index.Exception("No EntitySet definition for the following element type", "Field definition", memDef));
            }
        }

        this._addNavigationPropertyDefinition(dbEntityInstanceDefinition, memDef, memDef.name);
        var associationType = memDef.inverseProperty === '$$unbound' ? '$$unbound' : '0..1';
        var association = this._addAssociationElement(storageModel.LogicalType, associationType, memDef.name, refereedStorageModel.LogicalType, "*", memDef.inverseProperty);
        storageModel.Associations[memDef.name] = association;
        storageModel.Associations.push(association);
    },
    _buildDbType_ElementType_OneManyDefinition: function _buildDbType_ElementType_OneManyDefinition(dbEntityInstanceDefinition, storageModel, memDef_dataType, memDef) {
        var refereedType = _index.Container.resolveType(memDef.dataType);
        if (refereedType === undefined || refereedType === null) {
            if (typeof intellisense === 'undefined') {
                _index.Guard.raise(new _index.Exception("Element type definition error", "Field definition", memDef));
            }
        }
        var refereedStorageModel = this._storageModel.getStorageModel(refereedType);
        //var refereedStorageModel = this._storageModel.filter(function (s) { return s.LogicalType === refereedType; })[0];
        if (!refereedStorageModel) {
            if (typeof intellisense === 'undefined') {
                _index.Guard.raise(new _index.Exception("No EntitySet definition for the following element type", "Field definition", memDef));
            }
        }

        this._addNavigationPropertyDefinition(dbEntityInstanceDefinition, memDef, memDef.name);
        var associationType = memDef.inverseProperty === '$$unbound' ? '$$unbound' : '*';
        var association = this._addAssociationElement(storageModel.LogicalType, associationType, memDef.name, refereedStorageModel.LogicalType, "0..1", memDef.inverseProperty);
        storageModel.Associations[memDef.name] = association;
        storageModel.Associations.push(association);
    },
    _buildDbType_ElementType_OneOneDefinition: function _buildDbType_ElementType_OneOneDefinition(dbEntityInstanceDefinition, storageModel, memDef_dataType, memDef) {
        var refereedType = _index.Container.resolveType(memDef.dataType);
        if (refereedType === undefined || refereedType === null) {
            if (typeof intellisense === 'undefined') {
                _index.Guard.raise(new _index.Exception("Element type definition error", "Field definition", memDef));
            }
        }
        var refereedStorageModel = this._storageModel.getStorageModel(refereedType);;
        //var refereedStorageModel = this._storageModel.filter(function (s) { return s.LogicalType === refereedType; })[0];
        if (!refereedStorageModel) {
            if (typeof intellisense === 'undefined') {
                _index.Guard.raise(new _index.Exception("No EntitySet definition following element type", "Field definition", memDef));
            }
        }

        var refereedMemberDefinition = refereedStorageModel.LogicalType.memberDefinitions.getMember(memDef.inverseProperty);
        if (!refereedMemberDefinition.required && !memDef.required) {
            if (typeof intellisense === 'undefined') {
                if (typeof intellisense === 'undefined') {
                    _index.Guard.raise(new _index.Exception('In one to one connection, one side must required!', 'One to One connection', memDef));
                }
            }
        }

        this._addNavigationPropertyDefinition(dbEntityInstanceDefinition, memDef, memDef.name);

        var association = this._addAssociationElement(storageModel.LogicalType, memDef.required ? "0..1" : "1", memDef.name, refereedStorageModel.LogicalType, memDef.required ? "1" : "0..1", memDef.inverseProperty);
        storageModel.Associations[memDef.name] = association;
        storageModel.Associations.push(association);
    },
    _addNavigationPropertyDefinition: function _addNavigationPropertyDefinition(definition, member, associationName, kind) {
        var t = JSON.parse(JSON.stringify(member));
        t.dataType = _index2.default.EntitySet;
        t.notMapped = true;
        t.kind = kind ? kind : _index2.default.MemberTypes.navProperty;
        t.association = associationName;
        definition[member.name] = t;
    },
    _addAssociationElement: function _addAssociationElement(fromType, fromMultiplicity, fromPropName, toType, toMultiplicity, toPropName) {
        return new _index2.default.Association({
            From: fromType.name,
            FromType: fromType,
            FromMultiplicity: fromMultiplicity,
            FromPropertyName: fromPropName,
            To: toType.name,
            ToType: toType,
            ToMultiplicity: toMultiplicity,
            ReferentialConstraint: [],
            ToPropertyName: toPropName
        });
    },
    _createComplexElement: function _createComplexElement(fromType, fromMultiplicity, fromPropName, toType, toMultiplicity, toPropName) {
        return new _index2.default.ComplexType({
            From: fromType.name,
            FromType: fromType,
            FromMultiplicity: fromMultiplicity,
            FromPropertyName: fromPropName,
            To: toType.name,
            ToType: toType,
            ToMultiplicity: toMultiplicity,
            ReferentialConstraint: [],
            ToPropertyName: toPropName
        });
    },
    _build_EnumDefinition: function _build_EnumDefinition(dbEntityInstanceDefinition, storageModel, memDefResolvedDataType, memDef) {
        storageModel.Enums.push(memDefResolvedDataType);

        var typeName = _index.Container.resolveName(memDefResolvedDataType);
        var converterGroups = this.storageProvider.fieldConverter;

        var createEnumConverter = function createEnumConverter(converterGroup) {
            converterGroup[typeName] = function (value) {
                return converterGroup["$data.Enum"].call(this, value, memDefResolvedDataType);
            };
        };

        for (var i in converterGroups) {
            if (!converterGroups[i][typeName] && converterGroups[i]["$data.Enum"]) {
                createEnumConverter(converterGroups[i]);
            }
        }
    },

    _successInitProvider: function _successInitProvider(context, error) {
        if (context instanceof _index2.default.EntityContext && context._isOK !== undefined) {
            if (!error) {
                context._isOK = true;
                if (context.onReadyFunction) {
                    for (var i = 0; i < context.onReadyFunction.length; i++) {
                        context.onReadyFunction[i].success(context);
                    }
                    context.onReadyFunction = undefined;
                }
            } else {
                context._isOK = error;
                if (context.onReadyFunction) {
                    for (var i = 0; i < context.onReadyFunction.length; i++) {
                        context.onReadyFunction[i].error(error);
                    }
                    context.onReadyFunction = undefined;
                }
            }
        }
    },
    /**
     * Sets the callback function to be called when the initialization of the {@link $data.EntityContext} has successfully finished.
     * @event $data.EntityContext#onReady
     * @param {function|function[]} fn - Success callback
     * @returns {$.Deferred}
     */
    onReady: function onReady(fn) {
        /// <signature>
        ///     <summary>
        ///
        ///     </summary>
        ///     <param name="successCallback" type="Function">
        ///         <summary>Success callback</summary>
        ///         <param name="entityContext" type="$data.EntityContext">Current entityContext object</param>
        ///     </param>
        ///     <returns type="" />
        /// </signature>
        /// <signature>
        ///     <summary>
        ///         Sets the callback functions to be called when the initialization of the EntityContext has finished.
        ///     </summary>
        ///     <param name="callbacks" type="Object">
        ///         Success and error callbacks definition.
        ///         Example: [code]{ success: function(db) { .. }, error: function() { .. } }[/code]
        ///     </param>
        ///     <returns type="$.Deferred" />
        /// </signature>
        var pHandler = new _index2.default.PromiseHandler();
        var callBack = pHandler.createCallback(fn);
        if (this._isOK === true) {
            callBack.success(this);
        } else if (this._isOK !== false) {
            callBack.error(this._isOK);
        } else {
            this.onReadyFunction = this.onReadyFunction || [];
            this.onReadyFunction.push(callBack);
        }

        return pHandler.getPromise();
    },
    ready: { type: _index2.default.Promise },
    getEntitySetFromElementType: function getEntitySetFromElementType(elementType) {
        /// <signature>
        ///     <summary>Gets the matching EntitySet for an element type.</summary>
        ///     <param name="elementType" type="Function" />
        ///     <returns type="$data.EntitySet" />
        /// </signature>
        /// <signature>
        ///     <summary>Gets the matching EntitySet for an element type.</summary>
        ///     <param name="elementType" type="String" />
        ///     <returns type="$data.EntitySet" />
        /// </signature>
        var result = this._entitySetReferences[elementType];
        if (!result) {
            try {
                result = this._entitySetReferences[eval(elementType).name];
            } catch (ex) {}
        }
        return result;
    },
    executeQuery: function executeQuery(queryable, callBack, transaction) {
        var query = new _index2.default.Query(queryable.expression, queryable.defaultType, this);
        query.transaction = transaction instanceof _index2.default.Transaction ? transaction : undefined;
        var returnTransaction = this._isReturnTransaction(transaction);

        callBack = _index2.default.PromiseHandlerBase.createCallbackSettings(callBack);
        var that = this;
        var clbWrapper = {};
        clbWrapper.success = that.executeQuerySuccess(that, returnTransaction, callBack);
        clbWrapper.error = that.executeQueryError(that, returnTransaction, callBack);

        var sets = query.getEntitySets();

        var authorizedFn = function authorizedFn() {
            var ex = true;
            var wait = false;
            var ctx = that;

            var readyFn = function readyFn(cancel) {
                if (cancel === false) ex = false;

                if (ex) {
                    if (query.transaction) {
                        if (_index2.default.QueryCache && _index2.default.QueryCache.isInCache(that, query)) {
                            _index2.default.QueryCache.executeQuery(that, query, clbWrapper);
                        } else {
                            ctx.storageProvider.executeQuery(query, clbWrapper);
                        }
                    } else {
                        ctx.beginTransaction(function (tran) {
                            query.transaction = tran;
                            if (_index2.default.QueryCache && _index2.default.QueryCache.isInCache(that, query)) {
                                _index2.default.QueryCache.executeQuery(that, query, clbWrapper);
                            } else {
                                ctx.storageProvider.executeQuery(query, clbWrapper);
                            }
                        });
                    }
                } else {
                    query.rawDataList = [];
                    query.result = [];
                    clbWrapper.success(query);
                }
            };

            var i = 0;
            var callbackFn = function callbackFn(cancel) {
                if (cancel === false) ex = false;

                var es = sets[i];
                if (es.beforeRead) {
                    i++;
                    var r = es.beforeRead.call(this, sets, query);
                    if (typeof r === 'function') {
                        r.call(this, i < sets.length && ex ? callbackFn : readyFn, sets, query);
                    } else {
                        if (r === false) ex = false;

                        if (i < sets.length && ex) {
                            callbackFn();
                        } else readyFn();
                    }
                } else readyFn();
            };

            if (sets.length) callbackFn();else readyFn();
        };

        if (this.user && this.checkPermission) {
            this.checkPermission(query.expression.nodeType === _index2.default.Expressions.ExpressionType.BatchDelete ? _index2.default.Access.DeleteBatch : _index2.default.Access.Read, this.user, sets, {
                success: authorizedFn,
                error: clbWrapper.error
            });
        } else authorizedFn();
    },
    executeQuerySuccess: function executeQuerySuccess(that, returnTransaction, callBack) {
        return function (query) {
            if (_index2.default.QueryCache && _index2.default.QueryCache.isCacheable(that, query)) {
                _index2.default.QueryCache.addToCache(that, query);
            }

            query.buildResultSet(that);

            if (_index2.default.ItemStore && 'QueryResultModifier' in _index2.default.ItemStore) _index2.default.ItemStore.QueryResultModifier.call(that, query);

            var successResult;

            if (query.expression.nodeType === _index2.default.Expressions.ExpressionType.Single || query.expression.nodeType === _index2.default.Expressions.ExpressionType.Find || query.expression.nodeType === _index2.default.Expressions.ExpressionType.Count || query.expression.nodeType === _index2.default.Expressions.ExpressionType.BatchDelete || query.expression.nodeType === _index2.default.Expressions.ExpressionType.Some || query.expression.nodeType === _index2.default.Expressions.ExpressionType.Every) {
                if (query.result.length !== 1) {
                    callBack.error(new _index.Exception('result count failed'));
                    return;
                }

                successResult = query.result[0];
            } else if (query.expression.nodeType === _index2.default.Expressions.ExpressionType.First) {
                if (query.result.length === 0) {
                    callBack.error(new _index.Exception('result count failed'));
                    return;
                }

                successResult = query.result[0];
            } else {
                if (typeof query.__count === 'number' && query.result) query.result.totalCount = query.__count;

                that.storageProvider._buildContinuationFunction(that, query);

                successResult = query.result;
            }

            var readyFn = function readyFn() {
                that._applyTransaction(callBack, callBack.success, [successResult], query.transaction, returnTransaction);

                /*if (returnTransaction === true) {
                    if (query.transaction)
                        callBack.success(successResult, query.transaction);
                    else {
                        that.beginTransaction(function (tran) {
                            callBack.success(successResult, tran);
                        });
                    }
                }
                else
                    callBack.success(successResult);*/
            };

            var i = 0;
            var sets = query.getEntitySets();

            var callbackFn = function callbackFn() {
                var es = sets[i];
                if (es.afterRead) {
                    i++;
                    var r = es.afterRead.call(this, successResult, sets, query);
                    if (typeof r === 'function') {
                        r.call(this, i < sets.length ? callbackFn : readyFn, successResult, sets, query);
                    } else {
                        if (i < sets.length) {
                            callbackFn();
                        } else readyFn();
                    }
                } else readyFn();
            };

            if (sets.length) callbackFn();else readyFn();
        };
    },
    executeQueryError: function executeQueryError(that, returnTransaction, callBack) {
        return function () {
            if (returnTransaction) callBack.error.apply(this, arguments);else callBack.error.apply(this, Array.prototype.filter.call(arguments, function (p) {
                return !(p instanceof _index2.default.Transaction);
            }));
        };
    },

    batchExecuteQuery: function batchExecuteQuery(queryableOptions, callBack, transaction) {
        var pHandler = new _index2.default.PromiseHandler();
        var cbWrapper = pHandler.createCallback(callBack);

        var self = this;
        var methodOperationMappings = {
            count: 'length',
            length: 'length',
            forEach: 'forEach',
            toArray: 'toArray',
            single: 'single',
            some: 'some',
            every: 'every',
            first: 'first',
            removeAll: 'batchDelete'
        };
        var methodFrameMappings = {
            count: 'CountExpression',
            length: 'CountExpression',
            forEach: 'ForEachExpression',
            toArray: 'ToArrayExpression',
            single: 'SingleExpression',
            some: 'SomeExpression',
            every: 'EveryExpression',
            first: 'FirstExpression',
            removeAll: 'BatchDeleteExpression'
        };

        var returnFunc = function returnFunc() {
            return pHandler.getPromise();
        };

        if (typeof queryableOptions.length != "number") {
            cbWrapper.error(new _index.Exception('QueryableOptions array parameter missing', 'Invalid arguments'));
            return returnFunc();
        }

        var qOptions = [];
        for (var i = 0; i < queryableOptions.length; i++) {
            var queryOption = {};
            if (queryableOptions[i] instanceof _index2.default.Queryable) {
                queryOption.queryable = queryableOptions[i];
                queryOption.method = 'toArray';
            } else if (queryableOptions[i].queryable instanceof _index2.default.Queryable) {
                queryOption.queryable = queryableOptions[i].queryable;
                queryOption.method = queryableOptions[i].method || 'toArray';
            } else if (queryableOptions[i][0] instanceof _index2.default.Queryable) {
                queryOption.queryable = queryableOptions[i][0];
                queryOption.method = queryableOptions[i][1] || 'toArray';
            } else {
                cbWrapper.error(new _index.Exception('$data.Queryable is missing in queryableOptions at index ' + i, 'Invalid arguments'));
                return returnFunc();
            }

            if (queryOption.queryable.entityContext !== self) {
                cbWrapper.error(new _index.Exception('Queryable at index ' + i + ' contains different entity context', 'Invalid arguments'));
                return returnFunc();
            }

            queryOption.queryable._checkOperation(methodOperationMappings[queryOption.method] || queryOption.method);
            qOptions.push(queryOption);
        }

        var executableQueries = [];
        for (var i = 0; i < qOptions.length; i++) {
            var queryOption = qOptions[i];

            var frameExpressionName = methodFrameMappings[queryOption.method] || queryOption.method;
            if (frameExpressionName && _index2.default.Expressions[frameExpressionName] && _index2.default.Expressions[frameExpressionName].isAssignableTo(_index2.default.Expressions.FrameOperator)) {

                var queryExpression = _index.Container['create' + frameExpressionName](queryOption.queryable.expression);
                var preparator = _index.Container.createQueryExpressionCreator(queryOption.queryable.entityContext);

                try {
                    var expression = preparator.Visit(queryExpression);
                    queryOption.queryable.entityContext.log({ event: "EntityExpression", data: expression });

                    var queryable = _index.Container.createQueryable(queryOption.queryable, expression);
                    executableQueries.push(queryable);
                } catch (e) {
                    cbWrapper.error(e);
                    return returnFunc();
                }
            } else {
                cbWrapper.error(new _index.Exception('Invalid frame method \'' + frameExpressionName + '\' in queryableOptions at index ' + i, 'Invalid arguments'));
                return returnFunc();
            }
        }

        var queryResults = [];
        if (self.storageProvider.supportedContextOperation && self.storageProvider.supportedContextOperation.batchExecuteQuery) {
            //wrap queries
            var batchExecuteQueryExpression = _index.Container.createBatchExecuteQueryExpression(executableQueries.map(function (queryable) {
                return new _index2.default.Query(queryable.expression, queryable.defaultType, self);
            }));

            var batchExecuteQuery = _index.Container.createQueryable(self, batchExecuteQueryExpression);
            self.executeQuery(batchExecuteQuery, {
                success: function success(results) {
                    var batchResult = [];
                    var hasError = false;
                    var errorValue = null;
                    for (var i = 0; i < results.length && !hasError; i++) {
                        var query = results[i];
                        self.executeQuerySuccess(self, returnTransaction, {
                            success: function success(result) {
                                batchResult.push(result);
                            },
                            error: function error(err) {
                                hasError = true;
                                errorValue = err;
                            }
                        })(query);
                    }
                    if (!hasError) {
                        self._applyTransaction(cbWrapper, cbWrapper.success, [batchResult], batchExecuteQuery.transaction, returnTransaction);
                    } else {
                        cbWrapper.error(errorValue);
                    }
                },
                error: cbWrapper.error
            }, transaction);
        } else {
            var returnTransaction = this._isReturnTransaction(transaction);

            var readIterator = function readIterator(queries, index, iteratorCallback, itTransaction) {
                var query = queries[index];
                if (!query) {
                    return iteratorCallback.success(itTransaction);
                }

                self.executeQuery(executableQueries[index], {
                    success: function success(result, tr) {
                        queryResults.push(result);
                        readIterator(executableQueries, index + 1, iteratorCallback, tr);
                    },
                    error: iteratorCallback.error
                }, itTransaction);
            };

            readIterator(executableQueries, 0, {
                success: function success(lastTran) {
                    self._applyTransaction(cbWrapper, cbWrapper.success, [queryResults], lastTran, returnTransaction);
                },
                error: cbWrapper.error
            }, transaction);
        }
        return returnFunc();
    },

    /**
     * Saves the changes made to the context.
     *
     * @memberof $data.EntityContext
     * @instance
     * @param {Function|Object} callback - callback function or callback object with success & error properties
     * @param {$data.Transaction} transaction - Transaction object
     * @returns $.Deferred
     *
     * @example <caption>saveChanges with simple callback function</caption>
     * context.saveChanges(function(db) {
     *  //success
     * });
     *
     * @example <caption>saveChanges with callback object</caption>
     * var myCallback = {
     *  success: function(db) { //succeess },
     *  error: function(errors) { console.log(errors); }
     * }
     * context.saveChanges(myCallback);
     */
    saveChanges: function saveChanges(callback, transaction) {
        if (_index2.default.QueryCache) {
            _index2.default.QueryCache.reset(this);
        }

        var changedEntities = [];
        var trackedEntities = this.stateManager.trackedEntities;
        var pHandler = new _index2.default.PromiseHandler();
        var clbWrapper = pHandler.createCallback(callback);
        var pHandlerResult = pHandler.getPromise();
        var returnTransaction = this._isReturnTransaction(transaction);

        var skipItems = [];
        while (trackedEntities.length > 0) {
            var additionalEntities = [];
            //trackedEntities.forEach(function (entityCachedItem) {
            for (var i = 0; i < trackedEntities.length; i++) {
                var entityCachedItem = trackedEntities[i];

                var sModel = this._storageModel.getStorageModel(entityCachedItem.data.getType());
                if (entityCachedItem.data.entityState == _index2.default.EntityState.Unchanged) {
                    entityCachedItem.skipSave = true;
                    skipItems.push(entityCachedItem.data);
                } else {
                    if (entityCachedItem.data.entityState == _index2.default.EntityState.Modified) {
                        if (entityCachedItem.data.changedProperties) {
                            var changeStoredProperty = entityCachedItem.data.changedProperties.some(function (p) {
                                var pMemDef = sModel.PhysicalType.memberDefinitions.getMember(p.name);
                                if (pMemDef.kind == _index2.default.MemberTypes.navProperty) {
                                    var a = sModel.Associations[pMemDef.association];
                                    var multiplicity = a.FromMultiplicity + a.ToMultiplicity;
                                    return multiplicity == '*0..1' || multiplicity == '0..11';
                                }
                                return true;
                            });
                            if (!changeStoredProperty) {
                                entityCachedItem.skipSave = true;
                                skipItems.push(entityCachedItem.data);
                            }
                        } else {
                            entityCachedItem.skipSave = true;
                            skipItems.push(entityCachedItem.data);
                        }
                    }
                }

                //type before events with items
                this.processEntityTypeBeforeEventHandler(skipItems, entityCachedItem);

                var navigationProperties = [];
                var smPhyMemDefs = sModel.PhysicalType.memberDefinitions.asArray();
                for (var ism = 0; ism < smPhyMemDefs.length; ism++) {
                    var p = smPhyMemDefs[ism];
                    if (p.kind == _index2.default.MemberTypes.navProperty) navigationProperties.push(p);
                }
                //var navigationProperties = sModel.PhysicalType.memberDefinitions.asArray().filter(function (p) { return p.kind == $data.MemberTypes.navProperty; });
                //navigationProperties.forEach(function (navProp) {
                for (var j = 0; j < navigationProperties.length; j++) {
                    var navProp = navigationProperties[j];

                    var association = sModel.Associations[navProp.name]; //eg.:"Profile"
                    var name = navProp.name; //eg.: "Profile"
                    var navPropertyName = association.ToPropertyName; //eg.: User

                    var connectedDataList = [].concat(entityCachedItem.data[name]);
                    //connectedDataList.forEach(function (data) {
                    for (var k = 0; k < connectedDataList.length; k++) {
                        var data = connectedDataList[k];

                        if (data) {
                            var value = data[navPropertyName];
                            var associationType = association.FromMultiplicity + association.ToMultiplicity;
                            if (association.FromMultiplicity === '$$unbound') {
                                if (data instanceof _index2.default.Array) {
                                    entityCachedItem.dependentOn = entityCachedItem.dependentOn || [];
                                    //data.forEach(function (dataItem) {
                                    for (var l = 0; l < data.length; l++) {
                                        var dataItem = data[l];

                                        if (entityCachedItem.dependentOn.indexOf(data) < 0 && data.skipSave !== true) {
                                            entityCachedItem.dependentOn.push(data);
                                        }
                                    }
                                    //}, this);
                                } else {
                                        entityCachedItem.dependentOn = entityCachedItem.dependentOn || [];
                                        if (entityCachedItem.dependentOn.indexOf(data) < 0 && data.skipSave !== true) {
                                            entityCachedItem.dependentOn.push(data);
                                        }
                                    }
                            } else {
                                switch (associationType) {
                                    case "*0..1":
                                        //Array
                                        if (value) {
                                            if (value instanceof Array) {
                                                if (value.indexOf(entityCachedItem.data) == -1) {
                                                    value.push(entityCachedItem.data);
                                                    data.initData[navPropertyName] = value;
                                                    data._setPropertyChanged(association.ToType.getMemberDefinition(navPropertyName));
                                                }
                                            } else {
                                                if (typeof intellisense === 'undefined') {
                                                    _index.Guard.raise("Item must be array or subtype of array");
                                                }
                                            }
                                        } else {
                                            data.initData[navPropertyName] = [entityCachedItem.data];
                                            data._setPropertyChanged(association.ToType.getMemberDefinition(navPropertyName));
                                        }
                                        break;
                                    default:
                                        //Item
                                        if (value) {
                                            if (value !== entityCachedItem.data) {
                                                if (typeof intellisense === 'undefined') {
                                                    _index.Guard.raise("Integrity check error! Item assigned to another entity!");
                                                }
                                            }
                                        } else {
                                            data.initData[navPropertyName] = entityCachedItem.data; //set back reference for live object
                                            data._setPropertyChanged(association.ToType.getMemberDefinition(navPropertyName));
                                        }
                                        break;
                                }
                                switch (associationType) {
                                    case "*0..1":
                                    case "0..11":
                                        entityCachedItem.dependentOn = entityCachedItem.dependentOn || [];
                                        if (entityCachedItem.dependentOn.indexOf(data) < 0 && data.skipSave !== true) {
                                            entityCachedItem.dependentOn.push(data);
                                        }
                                        break;
                                }
                            }
                            if (!data.entityState) {
                                //if (data.storeToken === this.storeToken) {
                                //    data.entityState = $data.EntityState.Modified;
                                //} else {
                                //    data.entityState = $data.EntityState.Added;
                                //}
                                this.discoverDependentItemEntityState(data);
                            }
                            if (additionalEntities.indexOf(data) == -1) {
                                additionalEntities.push(data);
                            }
                        }
                    }
                    //}, this);
                }
                //}, this);
            }
            //}, this);

            //trackedEntities.forEach(function (entity) {
            for (var i = 0; i < trackedEntities.length; i++) {
                var entity = trackedEntities[i];

                if (entity.skipSave !== true) {
                    changedEntities.push(entity);
                }
            }
            //});

            trackedEntities = [];
            //additionalEntities.forEach(function (item) {
            for (var i = 0; i < additionalEntities.length; i++) {
                var item = additionalEntities[i];

                if (!skipItems.some(function (entity) {
                    return entity == item;
                })) {
                    if (!changedEntities.some(function (entity) {
                        return entity.data == item;
                    })) {
                        trackedEntities.push({ data: item, entitySet: this.getEntitySetFromElementType(item.getType().name) });
                    }
                }
            }
            //}, this);
        }

        //changedEntities.forEach(function (d) {
        for (var j = 0; j < changedEntities.length; j++) {
            var d = changedEntities[j];

            if (d.dependentOn) {
                var temp = [];
                for (var i = 0; i < d.dependentOn.length; i++) {
                    if (skipItems.indexOf(d.dependentOn[i]) < 0) {
                        temp.push(d.dependentOn[i]);
                    } else {
                        d.additionalDependentOn = d.additionalDependentOn || [];
                        d.additionalDependentOn.push(d.dependentOn[i]);
                    }
                }
                d.dependentOn = temp;
            }
        }
        //});
        skipItems = null;
        var ctx = this;
        if (changedEntities.length == 0) {
            this.stateManager.trackedEntities.length = 0;
            ctx._applyTransaction(clbWrapper, clbWrapper.success, [0], transaction, returnTransaction);

            /*if (returnTransaction) {
                clbWrapper.success(0, transaction);
            } else {
                clbWrapper.success(0);
            }*/
            return pHandlerResult;
        }

        //validate entities
        var errors = [];
        //changedEntities.forEach(function (entity) {
        for (var i = 0; i < changedEntities.length; i++) {
            var entity = changedEntities[i];

            if (entity.data.entityState === _index2.default.EntityState.Added) {
                //entity.data.getType().memberDefinitions.getPublicMappedProperties().forEach(function (memDef) {
                for (var j = 0; j < entity.data.getType().memberDefinitions.getPublicMappedProperties().length; j++) {
                    var memDef = entity.data.getType().memberDefinitions.getPublicMappedProperties()[j];

                    var memDefType = _index.Container.resolveType(memDef.type);
                    if (memDef.required && !memDef.computed && !entity.data[memDef.name] && !memDef.isDependentProperty) {
                        switch (memDefType) {
                            case _index2.default.String:
                            case _index2.default.Number:
                            case _index2.default.Float:
                            case _index2.default.Decimal:
                            case _index2.default.Integer:
                            case _index2.default.Int16:
                            case _index2.default.Int32:
                            case _index2.default.Int64:
                            case _index2.default.Byte:
                            case _index2.default.SByte:
                            case _index2.default.Date:
                            case _index2.default.Boolean:
                                entity.data[memDef.name] = _index.Container.getDefault(memDef.dataType);
                                break;
                            default:
                                break;
                        }
                    }
                }
                //}, this);
            }
            if ((entity.data.entityState === _index2.default.EntityState.Added || entity.data.entityState === _index2.default.EntityState.Modified) && !entity.data.isValid()) {
                errors.push({ item: entity.data, errors: entity.data.ValidationErrors });
            }
        }
        //});
        if (errors.length > 0) {
            clbWrapper.error(errors);
            return pHandlerResult;
        }

        var access = _index2.default.Access.None;

        var eventData = {};
        var sets = [];
        for (var i = 0; i < changedEntities.length; i++) {
            var it = changedEntities[i];
            var n = it.entitySet.elementType.name;
            if (sets.indexOf(it.entitySet) < 0) sets.push(it.entitySet);
            var es = this._entitySetReferences[n];
            if (es.beforeCreate || es.beforeUpdate || es.beforeDelete || this.user && this.checkPermission) {
                if (!eventData[n]) eventData[n] = {};

                switch (it.data.entityState) {
                    case _index2.default.EntityState.Added:
                        access |= _index2.default.Access.Create;
                        if (es.beforeCreate) {
                            if (!eventData[n].createAll) eventData[n].createAll = [];
                            eventData[n].createAll.push(it);
                        }
                        break;
                    case _index2.default.EntityState.Modified:
                        access |= _index2.default.Access.Update;
                        if (es.beforeUpdate) {
                            if (!eventData[n].modifyAll) eventData[n].modifyAll = [];
                            eventData[n].modifyAll.push(it);
                        }
                        break;
                    case _index2.default.EntityState.Deleted:
                        access |= _index2.default.Access.Delete;
                        if (es.beforeDelete) {
                            if (!eventData[n].deleteAll) eventData[n].deleteAll = [];
                            eventData[n].deleteAll.push(it);
                        }
                        break;
                }
            }
        }

        var readyFn = function readyFn(cancel) {
            if (cancel === false) {
                cancelEvent = 'async';
                changedEntities.length = 0;
            }

            if (changedEntities.length) {
                //console.log('changedEntities: ', changedEntities.map(function(it){ return it.data.initData; }));

                var innerCallback = {
                    success: function success(tran) {
                        ctx._postProcessSavedItems(clbWrapper, changedEntities, tran, returnTransaction);
                    },
                    error: function error() {
                        //TODO remove trans from args;
                        if (returnTransaction) clbWrapper.error.apply(this, arguments);else clbWrapper.error.apply(this, Array.prototype.filter.call(arguments, function (p) {
                            return !(p instanceof _index2.default.Transaction);
                        }));
                    }
                };

                if (transaction instanceof _index2.default.Transaction) {
                    ctx.storageProvider.saveChanges(innerCallback, changedEntities, transaction);
                } else {
                    ctx.beginTransaction(true, function (tran) {
                        ctx.storageProvider.saveChanges(innerCallback, changedEntities, tran);
                    });
                }
            } else if (cancelEvent) {
                clbWrapper.error(new _index.Exception('Cancelled event in ' + cancelEvent, 'CancelEvent'));
            } else {
                ctx._applyTransaction(clbWrapper, clbWrapper.success, [0], transaction, returnTransaction);

                /*if(returnTransaction)
                    clbWrapper.success(0, transaction);
                else
                    clbWrapper.success(0);*/
            };

            /*else if (cancelEvent) clbWrapper.error(new $data.Exception('saveChanges cancelled from event [' + cancelEvent + ']'));
            else Guard.raise('No changed entities');*/
        };

        var cancelEvent;
        var ies = Object.getOwnPropertyNames(eventData);
        var i = 0;
        var cmd = ['beforeUpdate', 'beforeDelete', 'beforeCreate'];
        var cmdAll = {
            beforeCreate: 'createAll',
            beforeDelete: 'deleteAll',
            beforeUpdate: 'modifyAll'
        };

        var callbackFn = function callbackFn(cancel) {
            if (cancel === false) {
                cancelEvent = 'async';
                changedEntities.length = 0;

                readyFn(cancel);
                return;
            }

            var es = ctx._entitySetReferences[ies[i]];
            var c = cmd.pop();
            var ed = eventData[ies[i]];
            var all = ed[cmdAll[c]];

            if (all) {
                var m = [];
                for (var im = 0; im < all.length; im++) {
                    m.push(all[im].data);
                }
                //var m = all.map(function(it){ return it.data; });
                if (!cmd.length) {
                    cmd = ['beforeUpdate', 'beforeDelete', 'beforeCreate'];
                    i++;
                }

                var r = es[c].call(ctx, m);
                if (typeof r === 'function') {
                    r.call(ctx, i < ies.length && !cancelEvent ? callbackFn : readyFn, m);
                } else if (r === false) {
                    cancelEvent = es.name + '.' + c;
                    //all.forEach(function (it) {
                    for (var index = 0; index < all.length; index++) {
                        var it = all[index];

                        var ix = changedEntities.indexOf(it);
                        changedEntities.splice(ix, 1);
                    }
                    //});

                    readyFn();
                } else {
                    if (i < ies.length && !cancelEvent) callbackFn();else readyFn();
                }
            } else {
                if (!cmd.length) {
                    cmd = ['beforeUpdate', 'beforeDelete', 'beforeCreate'];
                    i++;
                }

                if (i < ies.length && !cancelEvent) callbackFn();else readyFn();
            }
        };

        if (this.user && this.checkPermission) {
            this.checkPermission(access, this.user, sets, {
                success: function success() {
                    if (i < ies.length) callbackFn();else readyFn();
                },
                error: clbWrapper.error
            });
        } else {
            if (i < ies.length) callbackFn();else readyFn();
        }

        return pHandlerResult;
    },
    discoverDependentItemEntityState: function discoverDependentItemEntityState(data) {
        if (data.storeToken === this.storeToken) {
            data.entityState = data.changedProperties && data.changedProperties.length ? _index2.default.EntityState.Modified : _index2.default.EntityState.Unchanged;
        } else if (data.storeToken && this.storeToken && data.storeToken.typeName === this.storeToken.typeName && JSON.stringify(data.storeToken.args) === JSON.stringify(this.storeToken.args)) {
            data.entityState = data.changedProperties && data.changedProperties.length ? _index2.default.EntityState.Modified : _index2.default.EntityState.Unchanged;
        } else {
            data.entityState = _index2.default.EntityState.Added;
        }
    },

    processEntityTypeBeforeEventHandler: function processEntityTypeBeforeEventHandler(skipItems, entityCachedItem) {
        if (!entityCachedItem.skipSave) {
            var entity = entityCachedItem.data;
            var entityType = entity.getType();
            var state = entity.entityState;

            switch (true) {
                case state === _index2.default.EntityState.Added && entityType.onbeforeCreate instanceof _index2.default.Event:
                    if (entityType.onbeforeCreate.fireCancelAble(entity) === false) {
                        entityCachedItem.skipSave = true;
                        skipItems.push(entity);
                    }
                    break;
                case state === _index2.default.EntityState.Modified && entityType.onbeforeUpdate instanceof _index2.default.Event:
                    if (entityType.onbeforeUpdate.fireCancelAble(entity) === false) {
                        entityCachedItem.skipSave = true;
                        skipItems.push(entity);
                    }
                    break;
                case state === _index2.default.EntityState.Deleted && entityType.onbeforeDelete instanceof _index2.default.Event:
                    if (entityType.onbeforeDelete.fireCancelAble(entity) === false) {
                        entityCachedItem.skipSave = true;
                        skipItems.push(entity);
                    }
                    break;
                default:
                    break;
            }
        }
    },
    processEntityTypeAfterEventHandler: function processEntityTypeAfterEventHandler(entityCachedItem) {
        var entity = entityCachedItem.data;
        var entityType = entity.getType();
        var state = entity.entityState;

        switch (true) {
            case state === _index2.default.EntityState.Added && entityType.onafterCreate instanceof _index2.default.Event:
                entityType.onafterCreate.fire(entity);
                break;
            case state === _index2.default.EntityState.Modified && entityType.onafterUpdate instanceof _index2.default.Event:
                entityType.onafterUpdate.fire(entity);
                break;
            case state === _index2.default.EntityState.Deleted && entityType.onafterDelete instanceof _index2.default.Event:
                entityType.onafterDelete.fire(entity);
                break;
            default:
                break;
        }
    },

    bulkInsert: function bulkInsert(entitySet, fields, datas, callback) {
        var pHandler = new _index2.default.PromiseHandler();
        callback = pHandler.createCallback(callback);
        if (typeof entitySet === 'string') {
            var currentEntitySet;

            for (var entitySetName in this._entitySetReferences) {
                var actualEntitySet = this._entitySetReferences[entitySetName];
                if (actualEntitySet.tableName === entitySet) {
                    currentEntitySet = actualEntitySet;
                    break;
                }
            }

            if (!currentEntitySet) currentEntitySet = this[entitySet];

            entitySet = currentEntitySet;
        }
        if (entitySet) {
            this.storageProvider.bulkInsert(entitySet, fields, datas, callback);
        } else {
            callback.error(new _index.Exception('EntitySet not found'));
        }
        return pHandler.getPromise();
    },

    prepareRequest: function prepareRequest() {},
    _postProcessSavedItems: function _postProcessSavedItems(callBack, changedEntities, transaction, returnTransaction) {
        if (this.ChangeCollector && this.ChangeCollector instanceof _index2.default.Notifications.ChangeCollectorBase) this.ChangeCollector.processChangedData(changedEntities);

        var eventData = {};
        var ctx = this;
        //changedEntities.forEach(function (entity) {
        for (var i = 0; i < changedEntities.length; i++) {
            var entity = changedEntities[i];

            if (!entity.data.storeToken) entity.data.storeToken = ctx.storeToken;

            //type after events with items
            this.processEntityTypeAfterEventHandler(entity);

            var oes = entity.data.entityState;

            entity.data.entityState = _index2.default.EntityState.Unchanged;
            entity.data.changedProperties = [];
            entity.physicalData = undefined;

            var n = entity.entitySet.elementType.name;
            var es = ctx._entitySetReferences[n];

            var eventName = undefined;
            switch (oes) {
                case _index2.default.EntityState.Added:
                    eventName = 'added';
                    break;
                case _index2.default.EntityState.Deleted:
                    eventName = 'deleted';
                    break;
                case _index2.default.EntityState.Modified:
                    eventName = 'updated';
                    break;
            }
            if (eventName) {
                this.raiseEvent(eventName, entity);
            }

            if (es.afterCreate || es.afterUpdate || es.afterDelete) {
                if (!eventData[n]) eventData[n] = {};

                switch (oes) {
                    case _index2.default.EntityState.Added:
                        if (es.afterCreate) {
                            if (!eventData[n].createAll) eventData[n].createAll = [];
                            eventData[n].createAll.push(entity);
                        }
                        break;
                    case _index2.default.EntityState.Modified:
                        if (es.afterUpdate) {
                            if (!eventData[n].modifyAll) eventData[n].modifyAll = [];
                            eventData[n].modifyAll.push(entity);
                        }
                        break;
                    case _index2.default.EntityState.Deleted:
                        if (es.afterDelete) {
                            if (!eventData[n].deleteAll) eventData[n].deleteAll = [];
                            eventData[n].deleteAll.push(entity);
                        }
                        break;
                }
            }
        }
        //});

        var ies = Object.getOwnPropertyNames(eventData);
        var i = 0;
        var ctx = this;
        var cmd = ['afterUpdate', 'afterDelete', 'afterCreate'];
        var cmdAll = {
            afterCreate: 'createAll',
            afterDelete: 'deleteAll',
            afterUpdate: 'modifyAll'
        };

        var readyFn = function readyFn() {
            if (!ctx.trackChanges) {
                ctx.stateManager.reset();
            }

            ctx._applyTransaction(callBack, callBack.success, [changedEntities.length], transaction, returnTransaction);

            /*if (returnTransaction)
                callBack.success(changedEntities.length, transaction);
            else
                callBack.success(changedEntities.length);*/
        };

        var callbackFn = function callbackFn() {
            var es = ctx._entitySetReferences[ies[i]];
            var c = cmd.pop();
            var ed = eventData[ies[i]];
            var all = ed[cmdAll[c]];
            if (all) {
                var m = [];
                for (var im = 0; im < all.length; im++) {
                    m.push(all[im].data);
                }
                //var m = all.map(function(it){ return it.data; });
                if (!cmd.length) {
                    cmd = ['afterUpdate', 'afterDelete', 'afterCreate'];
                    i++;
                }

                var r = es[c].call(ctx, m);
                if (typeof r === 'function') {
                    r.call(ctx, i < ies.length ? callbackFn : readyFn, m);
                } else {
                    if (i < ies.length) callbackFn();else readyFn();
                }
            } else {
                if (!cmd.length) {
                    cmd = ['afterUpdate', 'afterDelete', 'afterCreate'];
                    i++;
                }

                if (i < ies.length) callbackFn();else readyFn();
            }
        };

        if (i < ies.length) callbackFn();else readyFn();
    },
    forEachEntitySet: function forEachEntitySet(fn, ctx) {
        /// <summary>
        ///     Iterates over the entity sets' of current EntityContext.
        /// </summary>
        /// <param name="fn" type="Function">
        ///     <param name="entitySet" type="$data.EntitySet" />
        /// </param>
        /// <param name="ctx">'this' argument for the 'fn' function.</param>
        for (var entitySetName in this._entitySetReferences) {
            var actualEntitySet = this._entitySetReferences[entitySetName];
            fn.call(ctx, actualEntitySet);
        }
    },

    loadItemProperty: function loadItemProperty(entity, property, callback, transaction) {
        /// <signature>
        ///     <summary>Loads a property of the entity through the storage provider.</summary>
        ///     <param name="entity" type="$data.Entity">Entity object</param>
        ///     <param name="property" type="String">Property name</param>
        ///     <param name="callback" type="Function">
        ///         <summary>C  allback function</summary>
        ///         <param name="propertyValue" />
        ///     </param>
        ///     <returns type="$.Deferred" />
        /// </signature>
        /// <signature>
        ///     <summary>Loads a property of the entity through the storage provider.</summary>
        ///     <param name="entity" type="$data.Entity">Entity object</param>
        ///     <param name="property" type="String">Property name</param>
        ///     <param name="callbacks" type="Object">
        ///         Success and error callbacks definition.
        ///         Example: [code]{ success: function(db) { .. }, error: function() { .. } }[/code]
        ///     </param>
        ///     <returns type="$.Deferred" />
        /// </signature>
        /// <signature>
        ///     <summary>Loads a property of the entity through the storage provider.</summary>
        ///     <param name="entity" type="$data.Entity">Entity object</param>
        ///     <param name="property" type="MemberDefinition">Property definition</param>
        ///     <param name="callback" type="Function">
        ///         <summary>Callback function</summary>
        ///         <param name="propertyValue" />
        ///     </param>
        ///     <returns type="$.Deferred" />
        /// </signature>
        /// <signature>
        ///     <summary>Loads a property of the entity through the storage provider.</summary>
        ///     <param name="entity" type="$data.Entity">Entity object</param>
        ///     <param name="property" type="MemberDefinition">Property definition</param>
        ///     <param name="callbacks" type="Object">
        ///         Success and error callbacks definition.
        ///         Example: [code]{ success: function(db) { .. }, error: function() { .. } }[/code]
        ///     </param>
        ///     <returns type="$.Deferred" />
        /// </signature>
        _index.Guard.requireType('entity', entity, _index2.default.Entity);

        var memberDefinition = typeof property === 'string' ? entity.getType().memberDefinitions.getMember(property) : property;
        var returnTransaction = this._isReturnTransaction(transaction);

        if (entity[memberDefinition.name] != undefined) {

            var pHandler = new _index2.default.PromiseHandler();
            var callBack = pHandler.createCallback(callback);
            this._applyTransaction(callback, callback.success, [entity[memberDefinition.name]], transaction, returnTransaction);
            /*if (returnTransaction)
                callback.success(entity[memberDefinition.name], transaction);
            else
                callback.success(entity[memberDefinition.name]);*/

            return pHandler.getPromise();
        }

        var isSingleSide = true;
        var storageModel = this._storageModel.getStorageModel(entity.getType().fullName);
        var elementType = _index.Container.resolveType(memberDefinition.dataType);
        if (elementType === _index2.default.Array || elementType.isAssignableTo && elementType.isAssignableTo(_index2.default.EntitySet)) {
            elementType = _index.Container.resolveType(memberDefinition.elementType);

            isSingleSide = false;
        } else {
            var associations;
            for (var i = 0; i < storageModel.Associations.length; i++) {
                var assoc = storageModel.Associations[i];
                if (assoc.FromPropertyName == memberDefinition.name) {
                    associations = assoc;
                    break;
                }
            }
            //var associations = storageModel.Associations.filter(function (assoc) { return assoc.FromPropertyName == memberDefinition.name; })[0];
            if (associations && associations.FromMultiplicity === "0..1" && associations.ToMultiplicity === "1") isSingleSide = false;
        }

        var keyProp = storageModel.LogicalType.memberDefinitions.getKeyProperties();
        if (isSingleSide === true) {
            //singleSide

            var filterFunc = "function (e) { return";
            var filterParams = {};
            //storageModel.LogicalType.memberDefinitions.getKeyProperties().forEach(function (memDefKey, index) {
            for (var index = 0; index < keyProp.length; index++) {
                var memDefKey = keyProp[index];

                if (index > 0) filterFunc += ' &&';
                filterFunc += " e." + memDefKey.name + " == this.key" + index;
                filterParams['key' + index] = entity[memDefKey.name];
            }
            //});
            filterFunc += "; }";

            var entitySet = this.getEntitySetFromElementType(entity.getType());
            return entitySet.map('function (e) { return e.' + memberDefinition.name + ' }').single(filterFunc, filterParams, callback, transaction);
        } else {
            //multipleSide

            var filterFunc = "function (e) { return";
            var filterParams = {};
            //storageModel.LogicalType.memberDefinitions.getKeyProperties().forEach(function (memDefKey, index) {
            for (var index = 0; index < keyProp.length; index++) {
                var memDefKey = keyProp[index];

                if (index > 0) filterFunc += ' &&';
                filterFunc += " e." + memberDefinition.inverseProperty + "." + memDefKey.name + " == this.key" + index;
                filterParams['key' + index] = entity[memDefKey.name];
            }
            //});
            filterFunc += "; }";

            var entitySet = this.getEntitySetFromElementType(elementType);
            return entitySet.filter(filterFunc, filterParams).toArray(callback, transaction);
        }
    },

    getTraceString: function getTraceString(queryable) {
        /// <summary>
        /// Returns a trace string. Used for debugging purposes!
        /// </summary>
        /// <param name="queryable" type="$data.Queryable" />
        /// <returns>Trace string</returns>
        var query = new _index2.default.Query(queryable.expression, queryable.defaultType, this);
        return this.storageProvider.getTraceString(query);
    },
    log: function log(logInfo) {
        //noop as do nothing
    },

    resolveBinaryOperator: function resolveBinaryOperator(operator, expression, frameType) {
        return this.storageProvider.resolveBinaryOperator(operator, expression, frameType);
    },
    resolveUnaryOperator: function resolveUnaryOperator(operator, expression, frameType) {
        return this.storageProvider.resolveUnaryOperator(operator, expression, frameType);
    },
    resolveFieldOperation: function resolveFieldOperation(operation, expression, frameType) {
        return this.storageProvider.resolveFieldOperation(operation, expression, frameType);
    },
    resolveSetOperations: function resolveSetOperations(operation, expression, frameType) {
        return this.storageProvider.resolveSetOperations(operation, expression, frameType);
    },
    resolveTypeOperations: function resolveTypeOperations(operation, expression, frameType) {
        return this.storageProvider.resolveTypeOperations(operation, expression, frameType);
    },
    resolveContextOperations: function resolveContextOperations(operation, expression, frameType) {
        return this.storageProvider.resolveContextOperations(operation, expression, frameType);
    },

    _generateServiceOperationQueryable: function _generateServiceOperationQueryable(functionName, returnEntitySet, arg, parameters) {
        if (typeof console !== 'undefined' && console.log) console.log('Obsolate: _generateServiceOperationQueryable, $data.EntityContext');

        var params = [];
        for (var i = 0; i < parameters.length; i++) {
            var obj = {};
            obj[parameters[i]] = _index.Container.resolveType(_index.Container.getTypeName(arg[i]));
            params.push(obj);
        }

        var tempOperation = _index2.default.EntityContext.generateServiceOperation({ serviceName: functionName, returnType: _index2.default.Queryable, elementType: this[returnEntitySet].elementType, params: params });
        return tempOperation.apply(this, arg);
    },
    attach: function attach(entity, mode) {
        /// <summary>
        ///     Attaches an entity to its matching entity set.
        /// </summary>
        /// <param name="entity" type="$data.Entity" />
        /// <returns type="$data.Entity">Returns the attached entity.</returns>

        if (entity instanceof _index2.default.EntityWrapper) {
            entity = entity.getEntity();
        }
        var entitySet = this.getEntitySetFromElementType(entity.getType());
        return entitySet.attach(entity, mode);
    },
    attachOrGet: function attachOrGet(entity, mode) {
        /// <summary>
        ///     Attaches an entity to its matching entity set, or returns if it's already attached.
        /// </summary>
        /// <param name="entity" type="$data.Entity" />
        /// <returns type="$data.Entity">Returns the entity.</returns>

        if (entity instanceof _index2.default.EntityWrapper) {
            entity = entity.getEntity();
        }
        var entitySet = this.getEntitySetFromElementType(entity.getType());
        return entitySet.attachOrGet(entity, mode);
    },

    addMany: function addMany(entities) {
        /// <summary>
        ///     Adds several entities to their matching entity set.
        /// </summary>
        /// <param name="entity" type="Array" />
        /// <returns type="Array">Returns the added entities.</returns>
        var self = this;
        entities.forEach(function (entity) {
            self.add(entity);
        });
        return entities;
    },

    add: function add(entity) {
        /// <summary>
        ///     Adds a new entity to its matching entity set.
        /// </summary>
        /// <param name="entity" type="$data.Entity" />
        /// <returns type="$data.Entity">Returns the added entity.</returns>

        if (entity instanceof _index2.default.EntityWrapper) {
            entity = entity.getEntity();
        }
        var entitySet = this.getEntitySetFromElementType(entity.getType());
        return entitySet.add(entity);
    },
    remove: function remove(entity) {
        /// <summary>
        ///     Removes an entity from its matching entity set.
        /// </summary>
        /// <param name="entity" type="$data.Entity" />
        /// <returns type="$data.Entity">Returns the removed entity.</returns>

        if (entity instanceof _index2.default.EntityWrapper) {
            entity = entity.getEntity();
        }
        var entitySet = this.getEntitySetFromElementType(entity.getType());
        return entitySet.remove(entity);
    },
    storeToken: { type: Object },

    getFieldUrl: function getFieldUrl(entity, member, collection) {
        try {
            var entitySet = typeof collection === 'string' ? this[collection] : collection;
            var fieldName = typeof member === 'string' ? member : member.name;
            if (entity instanceof _index2.default.Entity) {
                entitySet = this.getEntitySetFromElementType(entity.getType());
            } else if (!_index.Guard.isNullOrUndefined(entity) && entity.constructor !== _index2.default.Object) {
                //just a single key
                var keyDef = entitySet.elementType.memberDefinitions.getKeyProperties()[0];
                var key = {};
                key[keyDef.name] = entity;
                entity = key;
            }

            //key object
            if (!(entity instanceof _index2.default.Entity)) {
                entity = new entitySet.elementType(entity);
            }

            return this.storageProvider.getFieldUrl(entity, fieldName, entitySet);
        } catch (e) {}
        return '#';
    },

    //xxxx
    _applyRelatedEntityMethodsToContext: function _applyRelatedEntityMethodsToContext() {
        if (this.storageProvider.name === "oData") {
            for (var esName in this._entitySetReferences) {
                var es = this._entitySetReferences[esName];
                var newMemberName = _index2.default.defaults.relatedEntityReadMethodPrefix + es.name;
                //EntitiySets
                if (!(newMemberName in es)) {
                    es[newMemberName] = this._relatedEntityGetMethod(es.elementType, undefined, this);
                }
                //Context
                if (!(newMemberName in this)) {
                    this[newMemberName] = this._relatedEntityGetMethod(es.elementType, undefined, this);
                }
            }
        }
    },
    _applyRelatedEntityMethodsToTypes: function _applyRelatedEntityMethodsToTypes() {
        if (this.storageProvider.name === "oData") {
            for (var esName in this._entitySetReferences) {
                //add to Type
                var elementType = this._entitySetReferences[esName].elementType;
                var members = elementType.memberDefinitions.getPublicMappedProperties();
                for (var i = 0; i < members.length; i++) {
                    var member = members[i];
                    var memberElementType = null;
                    if (member.inverseProperty && _index.Container.resolveType(member.dataType) === _index2.default.Array && (memberElementType = _index.Container.resolveType(member.elementType)) && memberElementType.isAssignableTo && memberElementType.isAssignableTo(_index2.default.Entity)) {
                        var newMemberName = _index2.default.defaults.relatedEntityReadMethodPrefix + member.name;
                        if (!elementType.getMemberDefinition(newMemberName)) {
                            elementType.addMember(newMemberName, this._relatedEntityGetMethod(memberElementType, member));
                        }
                    }
                }
            }
        }
    },
    _createRelatedEntityProxyClass: function _createRelatedEntityProxyClass(type) {
        var proxyClassName = type.namespace + _index2.default.defaults.relatedEntityProxyPrefix + type.name;
        if (!_index.Container.isTypeRegistered(proxyClassName)) {
            var definition = {};
            var members = type.memberDefinitions.getPublicMappedProperties();
            for (var i = 0; i < members.length; i++) {
                var member = members[i];
                var memberElementType = null;
                if (member.inverseProperty && _index.Container.resolveType(member.dataType) === _index2.default.Array && (memberElementType = _index.Container.resolveType(member.elementType)) && memberElementType.isAssignableTo && memberElementType.isAssignableTo(_index2.default.Entity)) {
                    var newMemberName = _index2.default.defaults.relatedEntityReadMethodPrefix + member.name;
                    definition[newMemberName] = this._relatedEntityGetMethod(memberElementType, member);
                }
            }
            _index2.default.Class.define(proxyClassName, _index2.default.RelatedEntityProxy, null, definition, null);
        }

        return _index.Container.resolveType(proxyClassName);
    },
    _relatedEntityGetMethod: function _relatedEntityGetMethod(targetType, navigation, context) {
        var that = this;
        var keys = targetType.memberDefinitions.getKeyProperties();

        return function (keyValue) {
            var proxyClass = that._createRelatedEntityProxyClass(targetType);
            if (keys.length === 1 && (typeof keyValue === 'undefined' ? 'undefined' : _typeof(keyValue)) !== 'object') {
                var keyV = {};
                keyV[keys[0].name] = keyValue;
                keyValue = keyV;
            }

            if ((typeof keyValue === 'undefined' ? 'undefined' : _typeof(keyValue)) !== 'object') {
                throw new _index.Exception('Key parameter is invalid');
            } else {
                return new proxyClass(keyValue, navigation, targetType, this, context || (this.context instanceof _index2.default.EntityContext ? this.context : undefined));
            }
        };
    }
}, {
    inheritedTypeProcessor: function inheritedTypeProcessor(type) {
        if (type.resolveForwardDeclarations) {
            type.resolveForwardDeclarations();
        }
    },
    generateServiceOperation: function generateServiceOperation(cfg) {

        var fn;
        if (cfg.serviceMethod) {
            var returnType = cfg.returnType ? _index.Container.resolveType(cfg.returnType) : {};
            if (returnType.isAssignableTo && returnType.isAssignableTo(_index2.default.Queryable)) {
                fn = cfg.serviceMethod;
            } else {
                fn = function fn() {
                    var lastParam = arguments[arguments.length - 1];

                    var pHandler = new _index2.default.PromiseHandler();
                    var cbWrapper;

                    var args = arguments;
                    if (typeof lastParam === 'function') {
                        cbWrapper = pHandler.createCallback(lastParam);
                        arguments[arguments.length - 1] = cbWrapper;
                    } else {
                        cbWrapper = pHandler.createCallback();
                        arguments.push(cbWrapper);
                    }

                    try {
                        var result = cfg.serviceMethod.apply(this, arguments);
                        if (result !== undefined) cbWrapper.success(result);
                    } catch (e) {
                        cbWrapper.error(e);
                    }

                    return pHandler.getPromise();
                };
            }
        } else {
            fn = function fn() {
                var context = this;

                var boundItem;
                if (this instanceof _index2.default.Entity) {
                    if (!cfg.method) {
                        cfg.method = 'POST';
                    }

                    if (this.context) {
                        context = this.context;
                    } else {
                        _index.Guard.raise('entity not attached into context');
                        return;
                    }

                    boundItem = {
                        data: this,
                        entitySet: context.getEntitySetFromElementType(this.getType())
                    };
                }

                var virtualEntitySet = cfg.elementType ? context.getEntitySetFromElementType(_index.Container.resolveType(cfg.elementType)) : null;

                var paramConstExpression = null;
                if (cfg.params) {
                    paramConstExpression = [];
                    for (var i = 0; i < cfg.params.length; i++) {
                        //TODO: check params type
                        for (var name in cfg.params[i]) {
                            paramConstExpression.push(_index.Container.createConstantExpression(arguments[i], _index.Container.resolveType(cfg.params[i][name]), name));
                        }
                    }
                }

                var ec = _index.Container.createEntityContextExpression(context);
                var memberdef = (boundItem ? boundItem.data : context).getType().getMemberDefinition(cfg.serviceName);
                var es = _index.Container.createServiceOperationExpression(ec, _index.Container.createMemberInfoExpression(memberdef), paramConstExpression, cfg, boundItem);

                //Get callback function
                var clb = arguments[arguments.length - 1];
                if (typeof clb !== 'function') {
                    clb = undefined;
                }

                if (virtualEntitySet) {
                    var q = _index.Container.createQueryable(virtualEntitySet, es);
                    if (clb) {
                        es.isTerminated = true;
                        return q._runQuery(clb);
                    }
                    return q;
                } else {
                    var returnType = cfg.returnType ? _index.Container.resolveType(cfg.returnType) : null;

                    var q = _index.Container.createQueryable(context, es);
                    q.defaultType = returnType || _index2.default.Object;

                    if (returnType === _index2.default.Queryable) {
                        q.defaultType = _index.Container.resolveType(cfg.elementType);
                        if (clb) {
                            es.isTerminated = true;
                            return q._runQuery(clb);
                        }
                        return q;
                    }
                    es.isTerminated = true;
                    return q._runQuery(clb);
                }
            };
        };

        var params = [];
        if (cfg.params) {
            for (var i = 0; i < cfg.params.length; i++) {
                var param = cfg.params[i];
                for (var name in param) {
                    params.push({
                        name: name,
                        type: param[name]
                    });
                }
            }
        }
        _index2.default.typeSystem.extend(fn, cfg, { params: params });

        return fn;
    },
    _convertLogicalTypeNameToPhysical: function _convertLogicalTypeNameToPhysical(name) {
        return name + '_$db$';
    },
    _storageModelCache: {
        get: function get() {
            if (!this.__storageModelCache) this.__storageModelCache = {};
            return this.__storageModelCache;
        },
        set: function set() {
            //todo exception
        }
    }
});

exports.default = _index2.default;
module.exports = exports['default'];

},{"../TypeSystem/index.js":32}],47:[function(_dereq_,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _index = _dereq_('../TypeSystem/index.js');

var _index2 = _interopRequireDefault(_index);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

///EntitySet is responsible for
/// -creating and holding entityType through schema
/// - provide Add method
/// - provide Delete method
/// - provide Update method
/// - provide queryProvider for queryable

_index2.default.EntitySchemaConfig = function EntitySchemaConfig() {
    this.Name = "";
};
_index2.default.entitySetState = { created: 0, defined: 1, active: 2 };

_index2.default.Class.defineEx('$data.EntitySet', [{ type: _index2.default.Queryable, params: [new _index2.default.Class.ConstructorParameter(1)] }], null, {
    constructor: function constructor(elementType, context, collectionName, eventHandlers, roles) {
        /// <signature>
        ///     <summary>Represents a typed entity set that is used to perform create, read, update, and delete operations</summary>
        ///     <param name="elementType" type="Function" subClassOf="$data.Entity">Type of entity set elements, elementType must be subclass of $data.Entity</param>
        ///     <param name="context" type="$data.EntityContext">Context of the EntitySet</param>
        ///     <param name="collectionName" type="String">Name of the EntitySet</param>
        /// </signature>
        this.createNew = this[elementType.name] = this.elementType = this.defaultType = elementType;
        var self = this;
        context['createAdd' + elementType.name] = function (initData) {
            var entity = new elementType(initData);
            return self.add(entity);
        };
        this.stateManager = new _index2.default.EntityStateManager(this);

        this.collectionName = collectionName;
        this.roles = roles;

        for (var i in eventHandlers) {
            this[i] = eventHandlers[i];
        }
    },

    addNew: function addNew(item, cb) {
        var callback = _index2.default.PromiseHandlerBase.createCallbackSettings(cb);
        var _item = new this.createNew(item);
        this.entityContext.saveChanges(cb);
        return _item;
    },

    executeQuery: function executeQuery(expression, on_ready) {
        //var compiledQuery = this.entityContext
        var callBack = _index2.default.PromiseHandlerBase.createCallbackSettings(on_ready);
        this.entityContext.executeQuery(expression, callBack);
    },
    getTraceString: function getTraceString(expression) {
        return this.entityContext.getTraceString(expression);
    },
    setContext: function setContext(entityContext) {
        this.entitySetState = _index2.default.entitySetState.active;
        this.entityContext = entityContext;
        this.entityContext[this.schema.name] = this[this.schema.name];
    },
    _trackEntity: function _trackEntity(entity) {
        var trackedEntities = this.entityContext.stateManager.trackedEntities;
        for (var i = 0; i < trackedEntities.length; i++) {
            if (trackedEntities[i].data === entity) return;
        }
        trackedEntities.push({ entitySet: this, data: entity });
    },
    add: function add(entity) {
        /// <signature>
        ///     <summary>Creates a typed entity and adds to the context.</summary>
        ///     <param name="entity" type="Object">The init parameters whish is based on Entity</param>
        ///     <example>
        ///
        ///         Persons.add({ Name: 'John', Email: 'john@example.com', Age: 30, Gender: 'Male' });
        ///
        ///     </example>
        /// </signature>
        /// <signature>
        ///     <summary>Adds the given entity to the context.</summary>
        ///     <param name="entity" type="$data.Entity">The entity to add</param>
        ///     <example>
        ///
        ///         Persons.add(new $news.Types.Person({ Name: 'John', Email: 'john@example.com', Age: 30, Gender: 'Male' }));
        ///
        ///     </example>
        ///     <example>
        ///
        ///         var person = new $news.Types.Person({ Name: 'John', Email: 'john@example.com', Age: 30, Gender: 'Male' });
        ///         Persons.add(person);
        ///
        ///     </example>
        /// </signature>

        var data = entity;
        if (entity instanceof _index2.default.EntityWrapper) {
            data = entity.getEntity();
        } else if (!(entity instanceof this.createNew)) {
            data = new this.createNew(entity);
        }
        data.entityState = _index2.default.EntityState.Added;
        data.changedProperties = undefined;
        data.context = this.entityContext;
        this._trackEntity(data);
        return data;
    },

    addMany: function addMany(entities) {
        var result = [];
        var self = this;
        entities.forEach(function (entity) {
            result.push(self.add(entity));
        });
        return result;
    },
    remove: function remove(entity) {
        /// <signature>
        ///     <summary>Creates a typed entity and marks it as Deleted.</summary>
        ///     <param name="entity" type="Object">The init parameters whish is based on Entity</param>
        ///     <example>
        ///         Person will be marked as Deleted where an id is 5. Id is a key of entity.
        ///         Persons.remove({ Id: 5 });
        ///
        ///     </example>
        /// </signature>
        /// <signature>
        ///     <summary>Marks the given entity as Deleted.</summary>
        ///     <param name="entity" type="$data.Entity">The entity to remove</param>
        ///     <example>
        ///
        ///         Persons.remove(person);
        ///
        ///     </example>
        ///     <example>
        ///         Person will be marked as Deleted where an Id is 5. Id is a key of entity.
        ///         Persons.add(new $news.Types.Person({ Id: 5 }));
        ///
        ///     </example>
        /// </signature>

        var data = entity;
        if (entity instanceof _index2.default.EntityWrapper) {
            data = entity.getEntity();
        } else if (!(entity instanceof this.createNew)) {
            data = new this.createNew(entity);
        }
        data.entityState = _index2.default.EntityState.Deleted;
        data.changedProperties = undefined;
        this._trackEntity(data);
    },
    attach: function attach(entity, mode) {
        /// <signature>
        ///     <summary>Creates a typed entity and adds to the Context with Unchanged state.</summary>
        ///     <param name="entity" type="Object">The init parameters whish is based on Entity</param>
        ///     <example>
        ///
        ///         Persons.attach({ Id: 5, Email: 'newEmail@example.com' });
        ///
        ///     </example>
        /// </signature>
        /// <signature>
        ///     <summary>Adds to the context and sets state Unchanged.</summary>
        ///     <param name="entity" type="$data.Entity">The entity to attach</param>
        ///     <example>
        ///
        ///         Persons.attach(person);
        ///
        ///     </example>
        ///     <example>
        ///         Set an entity's related entities without loading
        ///
        ///         var categoryPromo = new $news.Types.Category({ Id: 5 });
        ///         Category.attach(categoryPromo);
        ///         var article = new $news.Types.Article({ Title: 'New Article title', Body: 'Article body', Category: [ categoryPromo ] });
        ///         Article.attach(article);
        ///
        ///     </example>
        /// </signature>

        var data = entity;
        if (entity instanceof _index2.default.EntityWrapper) {
            data = entity.getEntity();
        } else if (!(entity instanceof this.createNew)) {
            data = new this.createNew(entity);
        }

        for (var i = 0; i < this.entityContext.stateManager.trackedEntities.length; i++) {
            var current = this.entityContext.stateManager.trackedEntities[i];
            if (current.data === data) break;
            if (current.data.equals(data)) {
                _index.Guard.raise(new _index.Exception("Context already contains this entity!!!"));
            }
        }

        if (mode === true) {
            if (data.changedProperties && data.changedProperties.length > 0) {
                data.entityState = _index2.default.EntityState.Modified;
            } else {
                data.entityState = _index2.default.EntityState.Unchanged;
            }
        } else {
            if (typeof mode === "string") mode = _index2.default.EntityAttachMode[mode];
            var attachMode = mode || _index2.default.EntityAttachMode[_index2.default.EntityAttachMode.defaultMode];
            if (typeof attachMode === "function") {
                attachMode.call(_index2.default.EntityAttachMode, data);
            } else {
                data.entityState = _index2.default.EntityState.Unchanged;
                data.changedProperties = undefined;
            }
        }
        /*if (!keepChanges) {
            data.entityState = $data.EntityState.Unchanged;
            data.changedProperties = undefined;
        }*/
        data.context = this.entityContext;
        this._trackEntity(data);
    },
    detach: function detach(entity) {
        /// <signature>
        ///     <summary>Creates a typed entity and detach from the Context with Detached state.</summary>
        ///     <param name="entity" type="Object">The init parameters whish is based on Entity</param>
        ///     <example>
        ///         Person will be Detached where an id is 5. Id is a key of entity.
        ///         Persons.detach({ Id: 5 });
        ///
        ///     </example>
        /// </signature>
        /// <signature>
        ///     <summary>Detach from the context and sets state Detached.</summary>
        ///     <param name="entity" type="$data.Entity">The entity to detach</param>
        ///     <example>
        ///
        ///         Persons.detach(person);
        ///
        ///     </example>
        ///     <example>
        ///         Person will be Detached where an Id is 5. Id is a key of entity.
        ///         Persons.add(new $news.Types.Person({ Id: 5 }));
        ///
        ///     </example>
        /// </signature>

        var data = entity;
        if (entity instanceof _index2.default.EntityWrapper) {
            data = entity.getEntity();
        } else if (!(entity instanceof this.createNew)) {
            data = new this.createNew(entity);
        }

        var existsItem;
        var trackedEnt = this.entityContext.stateManager.trackedEntities;
        for (var i = 0; i < trackedEnt.length; i++) {
            if (trackedEnt[i].data.equals(data)) existsItem = trackedEnt[i];
        }

        //var existsItem = this.entityContext.stateManager.trackedEntities.filter(function (i) { return i.data.equals(data); }).pop();
        if (existsItem) {
            var idx = this.entityContext.stateManager.trackedEntities.indexOf(existsItem);
            entity.entityState = _index2.default.EntityState.Detached;
            this.entityContext.stateManager.trackedEntities.splice(idx, 1);
            return;
        }
    },
    attachOrGet: function attachOrGet(entity, mode) {
        /// <signature>
        ///     <summary>Creates a typed entity and adds to the Context with Unchanged state.</summary>
        ///     <param name="entity" type="Object">The init parameters whish is based on Entity</param>
        ///     <returns type="$data.Entity" />
        ///     <example>
        ///         Id is a key of entity.
        ///         var person = Persons.attachOrGet({ Id: 5  });
        ///
        ///     </example>
        /// </signature>
        /// <signature>
        ///     <summary>If not in context then adds to it and sets state Unchanged.</summary>
        ///     <param name="entity" type="$data.Entity">The entity to detach</param>
        ///     <returns type="$data.Entity" />
        ///     <example>
        ///
        ///         var attachedPerson = Persons.attachOrGet(person);
        ///
        ///     </example>
        ///     <example>
        ///         Id is a key of entity.
        ///         var p = new $news.Types.Person({ Id: 5 });
        ///         var attachedPerson = Persons.attachOrGet(p);
        ///
        ///     </example>
        /// </signature>

        var data = entity;
        if (entity instanceof _index2.default.EntityWrapper) {
            data = entity.getEntity();
        } else if (!(entity instanceof this.createNew)) {
            data = new this.createNew(entity);
        }

        var existsItem;
        var trackedEnt = this.entityContext.stateManager.trackedEntities;
        for (var i = 0; i < trackedEnt.length; i++) {
            if (trackedEnt[i].data.equals(data)) existsItem = trackedEnt[i];
        }
        //var existsItem = this.entityContext.stateManager.trackedEntities.filter(function (i) { return i.data.equals(data); }).pop();
        if (existsItem) {
            return existsItem.data;
        }

        if (typeof mode === "string") mode = _index2.default.EntityAttachMode[mode];
        var attachMode = mode || _index2.default.EntityAttachMode[_index2.default.EntityAttachMode.defaultMode];
        if (typeof attachMode === "function") {
            attachMode.call(_index2.default.EntityAttachMode, data);
        } else {
            data.entityState = _index2.default.EntityState.Unchanged;
            data.changedProperties = undefined;
        }
        //data.entityState = $data.EntityState.Unchanged;
        //data.changedProperties = undefined;
        data.context = this.entityContext;
        this._trackEntity(data);
        return data;
    },
    //find: function (keys) {
    //    //todo global scope
    //    if (!this.entityKeys) {
    //        this.entityKeys = this.createNew.memberDefinition.filter(function (prop) { return prop.key; }, this);
    //    }
    //    this.entityContext.stateManager.trackedEntities.forEach(function (item) {
    //        if (item.entitySet == this) {
    //            var isOk = true;
    //            this.entityKeys.forEach(function (item, index) { isOK = isOk && (item.data[item.name] == keys[index]); }, this);
    //            if (isOk) {
    //                return item.data;
    //            }
    //        }
    //    }, this);
    //    //TODO: db call
    //    return null;
    //},
    loadItemProperty: function loadItemProperty(entity, memberDefinition, callback) {
        /// <signature>
        ///     <summary>Loads a property of the entity through the storage provider.</summary>
        ///     <param name="entity" type="$data.Entity">Entity object</param>
        ///     <param name="property" type="String">Property name</param>
        ///     <param name="callback" type="Function">
        ///         <summary>Callback function</summary>
        ///         <param name="propertyValue" />
        ///     </param>
        ///     <returns type="$.Deferred" />
        /// </signature>
        /// <signature>
        ///     <summary>Loads a property of the entity through the storage provider.</summary>
        ///     <param name="entity" type="$data.Entity">Entity object</param>
        ///     <param name="property" type="String">Property name</param>
        ///     <param name="callbacks" type="Object">
        ///         Success and error callbacks definition.
        ///         Example: [code]{ success: function(db) { .. }, error: function() { .. } }[/code]
        ///     </param>
        ///     <returns type="$.Deferred" />
        /// </signature>
        /// <signature>
        ///     <summary>Loads a property of the entity through the storage provider.</summary>
        ///     <param name="entity" type="$data.Entity">Entity object</param>
        ///     <param name="property" type="$data.MemberDefinition">Property definition</param>
        ///     <param name="callback" type="Function">
        ///         <summary>Callback function</summary>
        ///         <param name="propertyValue" />
        ///     </param>
        ///     <returns type="$.Deferred" />
        /// </signature>
        /// <signature>
        ///     <summary>Loads a property of the entity through the storage provider.</summary>
        ///     <param name="entity" type="$data.Entity">Entity object</param>
        ///     <param name="property" type="$data.MemberDefinition">Property definition</param>
        ///     <param name="callbacks" type="Object">
        ///         Success and error callbacks definition.
        ///         Example: [code]{ success: function(db) { .. }, error: function() { .. } }[/code]
        ///     </param>
        ///     <returns type="$.Deferred" />
        /// </signature>

        return this.entityContext.loadItemProperty(entity, memberDefinition, callback);
    },
    saveChanges: function saveChanges() {
        return this.entityContext.saveChanges.apply(this.entityContext, arguments);
    },
    addProperty: function addProperty(name, getter, setter) {
        return this.elementType.addProperty.apply(this.elementType, arguments);
    },
    expression: {
        get: function get() {
            if (!this._expression) {
                var ec = _index.Container.createEntityContextExpression(this.entityContext);
                //var name = entitySet.collectionName;
                //var entitySet = this.entityContext[entitySetName];
                var memberdef = this.entityContext.getType().getMemberDefinition(this.collectionName);
                var es = _index.Container.createEntitySetExpression(ec, _index.Container.createMemberInfoExpression(memberdef), null, this);
                this._expression = es;
            }

            return this._expression;
        },
        set: function set(value) {
            this._expression = value;
        }
    },
    getFieldUrl: function getFieldUrl(keys, field) {
        return this.entityContext.getFieldUrl(keys, field, this);
    },
    bulkInsert: function bulkInsert(fields, datas, callback) {
        return this.entityContext.bulkInsert(this, fields, datas, callback);
    }
}, null);

exports.default = _index2.default;
module.exports = exports['default'];

},{"../TypeSystem/index.js":32}],48:[function(_dereq_,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _index = _dereq_('../TypeSystem/index.js');

var _index2 = _interopRequireDefault(_index);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

_index2.default.EntityState = {
    Detached: 0,
    Unchanged: 10,
    Added: 20,
    Modified: 30,
    Deleted: 40
};

exports.default = _index2.default;
module.exports = exports['default'];

},{"../TypeSystem/index.js":32}],49:[function(_dereq_,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _index = _dereq_('../TypeSystem/index.js');

var _index2 = _interopRequireDefault(_index);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

_index2.default.Class.define('$data.EntityStateManager', null, null, {
    constructor: function constructor(entityContext) {
        this.entityContext = null;
        this.trackedEntities = [];
        this.init(entityContext);
    },
    init: function init(entityContext) {
        this.entityContext = entityContext;
    },
    reset: function reset() {
        this.trackedEntities = [];
    }
}, null);

exports.default = _index2.default;
module.exports = exports['default'];

},{"../TypeSystem/index.js":32}],50:[function(_dereq_,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _index = _dereq_('../TypeSystem/index.js');

var _index2 = _interopRequireDefault(_index);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

_index2.default.Base.extend('$data.EntityWrapper', {
    getEntity: function getEntity() {
        _index.Guard.raise("pure object");
    }
});

exports.default = _index2.default;
module.exports = exports['default'];

},{"../TypeSystem/index.js":32}],51:[function(_dereq_,module,exports){
"use strict";

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; };

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.Enum = undefined;

var _index = _dereq_("../TypeSystem/index.js");

var _index2 = _interopRequireDefault(_index);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

_index2.default.createEnum = function (name, container, enumType, enumDefinition) {
    return _index2.default.Enum.extend(name, container, enumType, enumDefinition);
};

_index2.default.Enum = _index2.default.Class.define("$data.Enum", null, null, {
    constructor: function constructor() {
        return _index.Guard.raise(new _index.Exception("Type Error", "Cannot create instance from enum type!"));
    }
}, {
    extend: function extend(name, container, enumType, enumDefinition) {
        if (!enumDefinition) {
            if (!enumType) {
                enumDefinition = container;
                container = undefined;
            } else {
                enumDefinition = enumType;
                enumType = container;
                container = undefined;
            }
        }

        enumType = enumType || _index2.default.Integer;
        enumType = _index.Container.resolveType(enumType);
        var classDefinition = {
            __enumType: { get: function get() {
                    return enumType;
                }, set: function set() {}, enumerable: false, writable: false }
        };

        var getEnumDef = function getEnumDef(value, index) {
            return { get: function get() {
                    return value;
                }, set: function set() {}, enumMember: true, index: index };
        };

        var defaultValue = 0;
        var isValueCalculation = [_index2.default.Byte, _index2.default.SByte, _index2.default.Int16, _index2.default.Integer, _index2.default.Int64].indexOf(enumType) >= 0;
        var hasIndex = false;

        var enumDef = [];
        if (Array.isArray(enumDefinition)) {
            for (var i = 0; i < enumDefinition.length; i++) {
                var enumValA = enumDefinition[i];
                if ((typeof enumValA === "undefined" ? "undefined" : _typeof(enumValA)) === "object" && typeof enumValA.name === "string") {
                    enumDef.push({ name: enumValA.name, value: enumValA.value, index: enumValA.index });
                    if (typeof enumValA.index !== "undefined") {
                        hasIndex = true;
                    }
                } else if (typeof enumValA === "string") {
                    enumDef.push({ name: enumValA, value: undefined, index: undefined });
                } else {
                    return _index.Guard.raise(new _index.Exception("Type Error", "Invalid enum member"));
                }
            }
        } else if ((typeof enumDefinition === "undefined" ? "undefined" : _typeof(enumDefinition)) === "object") {
            for (var enumName in enumDefinition) {
                var enumValO = enumDefinition[enumName];
                if ((typeof enumValO === "undefined" ? "undefined" : _typeof(enumValO)) === "object") {
                    enumDef.push({ name: enumName, value: enumValO.value, index: enumValO.index });
                    if (typeof enumValO.index !== "undefined") {
                        hasIndex = true;
                    }
                } else {
                    enumDef.push({ name: enumName, value: enumValO, index: undefined });
                }
            }
        }

        if (hasIndex) {
            enumDef.sort(function (a, b) {
                if (a.index < b.index) return -1;
                if (a.index > b.index) return 1;
                return 0;
            });
        }

        var enumOptions = [];
        for (var i = 0; i < enumDef.length; i++) {
            var enumVal = enumDef[i];
            if (isValueCalculation && typeof enumVal.value !== "number" && !enumVal.value) {
                enumVal.value = defaultValue;
            }
            if (typeof enumVal.value === "number") {
                defaultValue = enumVal.value;
            }
            defaultValue++;
            enumOptions.push(enumVal.name);
            classDefinition[enumVal.name] = getEnumDef(enumVal.value, enumVal.index);
        }

        var enumClass = _index2.default.Base.extend.call(this, name, container, {}, classDefinition);

        _index2.default.Container.registerConverter(name, {
            'default': function _default(value) {
                if (typeof value == "string" && enumOptions.indexOf(value) >= 0) {
                    var enumMember = enumClass.staticDefinitions.getMember(value);
                    if (enumMember) {
                        return enumMember.get();
                    }
                }

                for (var i = 0; i < enumDef.length; i++) {
                    var enumVal = enumDef[i];
                    if (enumVal.value === value) return value;
                }

                throw 0;
            }
        });

        return enumClass;
    }
});

var Enum = exports.Enum = _index2.default.Enum;
exports.default = _index2.default;

},{"../TypeSystem/index.js":32}],52:[function(_dereq_,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _index = _dereq_('../../TypeSystem/index.js');

var _index2 = _interopRequireDefault(_index);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

(0, _index.$C)('$data.Expressions.ArrayLiteralExpression', _index2.default.Expressions.ExpressionNode, null, {
    constructor: function constructor(items) {
        ///<param name="name" type="string" />
        ///<field name="name" type="string" />
        ///<field name="items" type="Array" elementType="$data.Expression.ExpressionNode" />
        this.items = items || [];
    },
    nodeType: { value: _index2.default.Expressions.ExpressionType.ArrayLiteral, writable: true },

    items: { value: undefined, dataType: Array, elementType: _index2.default.Expressions.ExpressionNode },

    toString: function toString(debug) {
        //var result;
        //result = debug ? this.type + " " : "";
        //result = result + this.name;
        ///<var nam
        var result = "[" + this.items.map(function (item) {
            return item.toString();
        }).join(",") + "]";
        return result;
    }
}, null);

exports.default = _index2.default;
module.exports = exports['default'];

},{"../../TypeSystem/index.js":32}],53:[function(_dereq_,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _index = _dereq_('../../TypeSystem/index.js');

var _index2 = _interopRequireDefault(_index);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

(0, _index.$C)('$data.Expressions.CallExpression', _index2.default.Expressions.ExpressionNode, null, {
    constructor: function constructor(expression, member, args) {
        ///<summary>Represents a call to an object or global method</summary>
        ///<field name="object" type="$data.Expressions.ExpressionNode">The expression for object that has the method</field>
        ///<field name="member" type="$data.MemberDefinition">The member descriptor</field>
        this.expression = expression;
        this.member = member;
        this.args = args;
    },

    nodeType: {
        value: _index2.default.Expressions.ExpressionType.Call
    },

    expression: {
        value: undefined,
        dataType: _index2.default.Expressions.ExpressionNode,
        writable: true
    },

    member: {
        value: undefined,
        dataType: _index2.default.MemberDefinition,
        writable: true
    },

    type: {
        value: undefined,
        writable: true
    },

    implementation: {
        get: function get() {
            return function (thisObj, method, args) {
                if (typeof method !== 'function') {
                    method = thisObj[method];
                }
                _index.Guard.requireType("method", method, Function);
                return method.apply(thisObj, args);
            };
        },
        set: function set(value) {
            _index.Guard.raise("Property can not be set");
        }
    },

    toString: function toString(debug) {
        return this.object.toString() + "." + this.member.toString() + "(" + ")";
    }

});

exports.default = _index2.default;
module.exports = exports['default'];

},{"../../TypeSystem/index.js":32}],54:[function(_dereq_,module,exports){
'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; };

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _index = _dereq_('../../TypeSystem/index.js');

var _index2 = _interopRequireDefault(_index);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

(0, _index.$C)('$data.Expressions.CodeParser', null, null, {

    constructor: function constructor(scopeContext) {
        ///<signature>
        ///<param name="scopeContext" type="$data.Expressions.EntityContext" />
        ///</signature>
        ///<signature>
        ///</signature>
        this.scopeContext = scopeContext;
        this.lambdaParams = [];
    },

    log: function log(logInfo) {
        if (this.scopeContext) this.scopeContext.log(logInfo);
    },

    parseExpression: function parseExpression(code, resolver) {
        ///<signature>
        ///<summary>Parses the provided code and returns a parser result with parser information</summary>
        ///<param name="code" type="string">The JavaScript code to parse &#10;ex: "function (a,b,c) { return a + b /c }"</param>
        ///<param name="resolver" type="string">The ParameterResolver class that resolves vaiable and parameteres references</param>
        ///<returns type="$data.Expressions.ExpressionParserResult" />
        ///</signature>
        if ((typeof code === 'undefined' ? 'undefined' : _typeof(code)) === 'object') {
            code = '';
        }
        var result = {
            success: true,
            errorMessage: '',
            errorDetails: ''
        };
        ///<var name="AST" type="Date" />

        //console.log(code.toString());
        if (_index2.default.Acorn) {
            //console.log('using acorn.js');
            return { success: true, expression: this.ParserBuild(_index2.default.Acorn.parse('(' + code.toString() + ')').body[0]), errors: [] };
        } else if (_index2.default.Esprima) {
            //console.log('using esprima.js');
            return { success: true, expression: this.ParserBuild(_index2.default.Esprima.parse('(' + code.toString() + ')').body[0]), errors: [] };
        } else {
            //console.log('using JayLint');
            var AST = _index2.default.ASTParser.parseCode(code);
            this.log({ event: "AST", data: AST });
            if (!AST.success) {
                return {
                    success: false,
                    error: "ASTParser error",
                    errorMessage: AST.errors ? JSON.stringify(AST.errors) : "could not get code"
                };
            }
            var b = this.Build2(AST.tree.first[0]);
            result = { success: true, expression: b, errors: AST.errors };
            return result;
        }
    },

    createExpression: function createExpression(code, resolver) {
        ///<signature>
        ///<summary>Parses the provided code and returns a JavaScript code expression tree</summary>
        ///<param name="code" type="string">The JavaScript code to parse &#10;ex: "a + b /c"</param>
        ///<param name="resolver" type="string">The ParameterResolver class that resolves vaiable and parameteres references</param>
        ///<returns type="$data.Expressions.ExpressionParserResult" />
        ///</signature>
        ///<signature>
        ///<summary>Parses the provided code and returns a JavaScript code expression tree</summary>
        ///<param name="code" type="Function">The JavaScript function to parse &#10;ex: "function (a,b,c) { return a + b /c }"</param>
        ///<param name="resolver" type="string">The ParameterResolver class that resolves vaiable and parameteres references</param>
        ///<returns type="$data.Expressions.ExpressionParserResult" />
        ///</signature>

        var result = this.parseExpression(code, resolver);
        if (!result.success) {
            _index.Guard.raise("ExpressionParserError: " + result.errorMessage);
        }
        return result.expression;
    },

    ParserBuild: function ParserBuild(node) {
        //console.log(node);
        return this['Parser' + node.type](node);
    },

    ParserExpressionStatement: function ParserExpressionStatement(node) {
        return this.ParserBuild(node.expression);
    },

    ParserBlockStatement: function ParserBlockStatement(node) {
        return this.ParserBuild(node.body[0]);
    },

    ParserReturnStatement: function ParserReturnStatement(node) {
        return this.ParserBuild(node.argument);
    },

    ParserMemberExpression: function ParserMemberExpression(node) {
        return new _index2.default.Expressions.PropertyExpression(this.ParserBuild(node.object), new _index2.default.Expressions.ConstantExpression(node.property.name || node.property.value, _typeof(node.property.name || node.property.value)));
    },

    ParserIdentifier: function ParserIdentifier(node) {
        return this.ParserParameter(node, this.lambdaParams.indexOf(node.name) > -1 ? _index2.default.Expressions.ExpressionType.LambdaParameterReference : _index2.default.Expressions.ExpressionType.ParameterReference);
    },

    ParserObjectExpression: function ParserObjectExpression(node) {
        var props = new Array(node.properties.length);
        for (var i = 0; i < node.properties.length; i++) {
            props[i] = this.ParserProperty(node.properties[i]);
        }

        return new _index2.default.Expressions.ObjectLiteralExpression(props);
    },

    ParserArrayExpression: function ParserArrayExpression(node) {
        var items = new Array(node.elements.length);
        for (var i = 0; i < node.elements.length; i++) {
            items[i] = this.ParserBuild(node.elements[i]);
        }

        return new _index2.default.Expressions.ArrayLiteralExpression(items);
    },

    ParserProperty: function ParserProperty(node) {
        return new _index2.default.Expressions.ObjectFieldExpression(node.key.name, this.ParserBuild(node.value));
    },

    ParserArrowFunctionExpression: function ParserArrowFunctionExpression(node) {
        return this.ParserFunctionExpression(node);
    },

    ParserFunctionExpression: function ParserFunctionExpression(node) {
        var params = new Array(node.params.length);
        for (var i = 0; i < node.params.length; i++) {
            if (i === 0 || _index2.default.defaults.parameterResolutionCompatibility) {
                this.lambdaParams.push(node.params[i].name);
                params[i] = this.ParserParameter(node.params[i], _index2.default.Expressions.ExpressionType.LambdaParameter);
            } else {
                params[i] = this.ParserParameter(node.params[i], _index2.default.Expressions.ExpressionType.Parameter);
            }
            params[i].owningFunction = result;
        }
        var result = new _index2.default.Expressions.FunctionExpression(node.id ? node.id.name : node.id, params, this.ParserBuild(node.body));

        return result;
    },

    ParserParameter: function ParserParameter(node, nodeType) {
        var result = new _index2.default.Expressions.ParameterExpression(node.name, null, nodeType);
        if (nodeType == _index2.default.Expressions.ExpressionType.LambdaParameterReference) {
            result.paramIndex = this.lambdaParams.indexOf(node.name);
        }

        return result;
    },

    ParserLogicalExpression: function ParserLogicalExpression(node) {
        return this.ParserBinaryExpression(node);
    },

    ParserOperators: {
        value: {
            "==": { expressionType: _index2.default.Expressions.ExpressionType.Equal, type: "boolean", implementation: function implementation(a, b) {
                    return a == b;
                } },
            "===": { expressionType: _index2.default.Expressions.ExpressionType.EqualTyped, type: "boolean", implementation: function implementation(a, b) {
                    return a === b;
                } },
            "!=": { expressionType: _index2.default.Expressions.ExpressionType.NotEqual, type: "boolean", implementation: function implementation(a, b) {
                    return a != b;
                } },
            "!==": { expressionType: _index2.default.Expressions.ExpressionType.NotEqualTyped, type: "boolean", implementation: function implementation(a, b) {
                    return a !== b;
                } },
            ">": { expressionType: _index2.default.Expressions.ExpressionType.GreaterThen, type: "boolean", implementation: function implementation(a, b) {
                    return a > b;
                } },
            ">=": { expressionType: _index2.default.Expressions.ExpressionType.GreaterThenOrEqual, type: "boolean", implementation: function implementation(a, b) {
                    return a >= b;
                } },
            "<=": { expressionType: _index2.default.Expressions.ExpressionType.LessThenOrEqual, type: "boolean", implementation: function implementation(a, b) {
                    return a <= b;
                } },
            "<": { expressionType: _index2.default.Expressions.ExpressionType.LessThen, type: "boolean", implementation: function implementation(a, b) {
                    return a < b;
                } },
            "&&": { expressionType: _index2.default.Expressions.ExpressionType.And, type: "boolean", implementation: function implementation(a, b) {
                    return a && b;
                } },
            "||": { expressionType: _index2.default.Expressions.ExpressionType.Or, type: "boolean", implementation: function implementation(a, b) {
                    return a || b;
                } },
            "&": { expressionType: _index2.default.Expressions.ExpressionType.AndBitwise, type: "number", implementation: function implementation(a, b) {
                    return a & b;
                } },
            "|": { expressionType: _index2.default.Expressions.ExpressionType.OrBitwise, type: "number", implementation: function implementation(a, b) {
                    return a | b;
                } },
            "+": { expressionType: _index2.default.Expressions.ExpressionType.Add, type: "number", implementation: function implementation(a, b) {
                    return a + b;
                } },
            "-": { expressionType: _index2.default.Expressions.ExpressionType.Subtract, type: "number", implementation: function implementation(a, b) {
                    return a - b;
                } },
            "/": { expressionType: _index2.default.Expressions.ExpressionType.Divide, type: "number", implementation: function implementation(a, b) {
                    return a / b;
                } },
            "%": { expressionType: _index2.default.Expressions.ExpressionType.Modulo, type: "number", implementation: function implementation(a, b) {
                    return a % b;
                } },
            "*": { expressionType: _index2.default.Expressions.ExpressionType.Multiply, type: "number", implementation: function implementation(a, b) {
                    return a * b;
                } },
            "[": { expressionType: _index2.default.Expressions.ExpressionType.ArrayIndex, type: "number", implementation: function implementation(a, b) {
                    return a[b];
                } },
            "in": { expressionType: _index2.default.Expressions.ExpressionType.In, type: 'boolean', implementation: function implementation(a, b) {
                    return a in b;
                } }
        }
    },

    ParserUnaryOperators: {
        value: {
            "+": { arity: "prefix", expressionType: _index2.default.Expressions.ExpressionType.Positive, type: "number", implementation: function implementation(operand) {
                    return +operand;
                } },
            "-": { arity: "prefix", expressionType: _index2.default.Expressions.ExpressionType.Negative, type: "number", implementation: function implementation(operand) {
                    return -operand;
                } },
            "++true": { arity: "prefix", expressionType: _index2.default.Expressions.ExpressionType.Increment, type: "number", implementation: function implementation(operand) {
                    return ++operand;
                } },
            "--true": { arity: "prefix", expressionType: _index2.default.Expressions.ExpressionType.Decrement, type: "number", implementation: function implementation(operand) {
                    return --operand;
                } },
            "++false": { arity: "suffix", expressionType: _index2.default.Expressions.ExpressionType.Increment, type: "number", implementation: function implementation(operand) {
                    return operand++;
                } },
            "!": { arity: "prefix", expressionType: _index2.default.Expressions.ExpressionType.Not, type: "boolean", implementation: function implementation(operand) {
                    return !operand;
                } },
            "--false": { arity: "suffix", expressionType: _index2.default.Expressions.ExpressionType.Decrement, type: "number", implementation: function implementation(operand) {
                    return operand--;
                } }
        }
    },

    ParserUnaryExpression: function ParserUnaryExpression(node) {
        return new _index2.default.Expressions.UnaryExpression(this.ParserBuild(node.argument), this.ParserUnaryOperators[node.operator], this.ParserUnaryOperators[node.operator].expressionType);
    },

    ParserUpdateExpression: function ParserUpdateExpression(node) {
        return new _index2.default.Expressions.UnaryExpression(this.ParserBuild(node.argument), this.ParserUnaryOperators[node.operator + node.prefix], this.ParserUnaryOperators[node.operator + node.prefix].nodeType);
    },

    ParserBinaryExpression: function ParserBinaryExpression(node) {
        return new _index2.default.Expressions.SimpleBinaryExpression(this.ParserBuild(node.left), this.ParserBuild(node.right), this.ParserOperators[node.operator].expressionType, node.operator, this.ParserOperators[node.operator].type);
    },

    ParserThisExpression: function ParserThisExpression(node) {
        return new _index2.default.Expressions.ThisExpression();
    },

    ParserLiteral: function ParserLiteral(node) {
        return new _index2.default.Expressions.ConstantExpression(node.value, _typeof(node.value));
    },

    ParserCallExpression: function ParserCallExpression(node) {
        var method = this.ParserBuild(node.callee);
        var args = new Array(node.arguments.length);
        for (var i = 0; i < node.arguments.length; i++) {
            args[i] = this.ParserBuild(node.arguments[i]);
        }

        var member;
        var expression;
        switch (true) {
            case method instanceof _index2.default.Expressions.PropertyExpression:
                expression = method.expression;
                member = method.member;
                break;
            case method instanceof _index2.default.Expressions.ParameterExpression:
                expression = new _index2.default.Expressions.ConstantExpression(null, _typeof(null));
                member = method;
                break;
        }

        return new _index2.default.Expressions.CallExpression(expression, member, args);
    } /*,
       Build2: function (node) {
         ///<param name="node" type="Lint" />
         ///<returns type="$data.Expressions.ExpressionNode" />
         var n;
         switch (node.arity) {
             case "number":
             case "string":
                 n = this.BuildConstant(node);
                 break;
             case "prefix":
                 switch (node.value) {
                     case "{":
                         n = this.BuildObjectLiteral(node);
                         break;
                     case "[":
                         n = this.BuildArrayLiteral(node);
                         break;
                     case $data.unaryOperators.resolve(node.value):
                         n = this.BuildUnary(node);
                         break;
                     //TODO: default case
                 }
                 break;
             case "suffix":
                 switch (node.value) {
                     case $data.unaryOperators.resolve(node.value):
                         n = this.BuildUnary(node);
                         break;
                     default:
                         Guard.raise("Unknown suffix: " + node.value);
                 }
                 break;
             case "infix":
                 switch (node.value) {
                     case "[":
                         n = this.BuildArray(node);
                         break;
                     case $data.binaryOperators.resolve(node.value):
                         n = this.BuildSimpleBinary(node);
                         break;
                     case "function":
                         Guard.raise("Unexpected function arity");
                     case "(":
                         n = this.BuildCall(node);
                         break;
                     case ".":
                         n = this.BuildProperty(node);
                         break;
                     default:
                         debugger;
                         //TODO: remove debugger, throw exception or break
                 }
                 break;
             case "statement":
                 switch (node.value) {
                     case "function":
                         n = this.BuildFunction(node);
                         //TODO: consider adding break
                 }
                 break;
             default:
                 switch (node.value) {
                     case "function":
                         n = this.BuildFunction(node);
                         break;
                     case "true":
                     case "false":
                     case "null":
                         n = this.BuildConstant(node);
                         break;
                     case "this":
                         n = this.BuildThis(node);
                         break;
                     default:
                         n = this.BuildParameter(node);
                         break;
                 }
         }
         return n;
      },
       BuildThis: function (node) {
         var result = Container.createThisExpression();
         return result;
      },
       BuildConstant: function (node) {
         ///<param name="node" type="ConstantASTNode" />
         var value = node.value;
         var type = node.type;
         if (node.reserved === true) {
             switch (node.value) {
                 case "true": value = true; type = typeof true; break;
                 case "false": value = false; type = typeof false; break;
                 case "null": value = null; type = typeof null; break;
                 //TODO: missing default case
             }
         }
         var result = new $data.Expressions.ConstantExpression(value, type);
         return result;
      },
       BuildFunctionParameter: function (node) {
       },
       BuildArray: function (node) {
         switch (node.second.type) {
             case "string":
                 return this.BuildProperty(node);
             case "number":
             default:
                 return this.BuildSimpleBinary(node);
         }
      },
       BuildParameter: function (node) {
         ///<param name="node" type="ParameterASTNode" />
         ///<returns type="$data.Expressions.ParameterExpression" />
         var paramName = node.value;
         //TODO
         //var paramType = this.resolver.resolveParameterType(node);
         var nodeType = node.funct ? $data.Expressions.ExpressionType.LambdaParameter :
                                     this.lambdaParams.indexOf(node.value) > -1 ?
                                                 $data.Expressions.ExpressionType.LambdaParameterReference : $data.Expressions.ExpressionType.Parameter;
         var result = new $data.Expressions.ParameterExpression(node.value, null, nodeType);
           if (nodeType == $data.Expressions.ExpressionType.LambdaParameterReference) {
             result.paramIndex = this.lambdaParams.indexOf(node.value);
         }
           return result;
      },
       BuildArrayLiteral: function(node) {
         var self = this;
         var items = node.first.map(function (item) { return self.Build2(item); });
         var result = new $data.Expressions.ArrayLiteralExpression(items);
         return result;
      },
       BuildObjectLiteral: function (node) {
         var self = this;
         var fields = node.first.map(function (item) {
             var eItem = self.Build2(item.first);
             var result = new $data.Expressions.ObjectFieldExpression(item.value, eItem);
             return result;
         });
         var result = new $data.Expressions.ObjectLiteralExpression(fields);
         return result;
      },
       BuildFunction: function (node) {
         ///<param name="node" type="FunctionASTNode"/>
         ///<returns type="$data.Expressions.FunctionExpression" />
         var self = this;
         var paramStack = [];
         var params = node.first && node.first.map(function (paramNode) {
             //paramStack.push(paramNode.value);
             this.lambdaParams.push(paramNode.value);
             return self.BuildParameter(paramNode);
         }, this);
         params = params || [];
           //skipping return for convenience
         //Possible we should raise an error as predicates and selectors can
         //not be code blocks just expressions
           var hasReturn = node.block.length == 0 ? false :
             node.block[0].value === "return" ? true : false;
         var body = (node.block.length > 0) ? this.Build2(hasReturn ? node.block[0].first : node.block[0]) : null;
           paramStack.forEach(function () { this.lambdaParams.pop(); }, this);
           var result = new $data.Expressions.FunctionExpression(node.value, params, body);
         params.forEach(function (param) {
             param.owningFunction = result;
         });
           //TODO place on prototyope
         result.name = node.name;
         return result;
      },
       BuildCall: function (node) {
         var self = this;
         var method = self.Build2(node.first);
         var args = node.second.map(function (exp) { return self.Build2(exp); });
         var member;
         var expression;
         switch(true){
             case method instanceof $data.Expressions.PropertyExpression:
                 expression = method.expression;
                 member = method.member;
                 break;
             case method instanceof $data.Expressions.ParameterExpression:
                 expression = Container.createConstantExpression(null, typeof null);
                 member = method;
                 break;
             //TODO: missing default case
         }
           var result = Container.createCallExpression(expression, member, args);
         return result;
      },
       BuildProperty: function (node) {
         ///<summary>Builds a PropertyExpression from the AST node</summary>
         ///<param name="node" type="MemberAccessASTNode" />
         ///<returns type="$data.Expressions.PropertyExpression" />
         var expression = this.Build2(node.first);
         //TODO
         //var type = expression.type;
         //var member = type.getMemberDefinition()
         //TODO how to not if?????
         var member;
         if (node.second.identifier) {
             member = new $data.Expressions.ConstantExpression(node.second.value, "string");
         } else {
             member = this.Build2(node.second);
         }
         var result = new $data.Expressions.PropertyExpression(expression, member);
         return result;
      },
         BuildUnary: function(node) {
         var operator = $data.unaryOperators.getOperator(node.value, node.arity);
         var nodeType = operator.expressionType;
         var operand = this.Build2(node.first);
         var result = new $data.Expressions.UnaryExpression(operand, operator, nodeType);
         return result;
      },
       BuildSimpleBinary: function (node) {
         ///<param name="node" type="LintInflixNode" />
           var operator = $data.binaryOperators.getOperator(node.value);
         var nodeType = operator.expressionType;
           var left = this.Build2(node.first || node.left);
         var right = this.Build2(node.second || node.right);
         var result = new $data.Expressions.SimpleBinaryExpression(left, right, nodeType, node.value, operator.type);
         return result;
      }
       //Build: function (node, expNode) {
      //    var n;
      //    switch (node.arity) {
      //        case "ternary":
      //            if (node.value == "?")
      //                n = this.BuildDecision(node, expNode);
      //            else
      //                Guard.raise("Value of ternary node isn't implemented: " + node.value);
      //            break;
      //        case null:
      //        default:
      //            Guard.raise("Arity isn't implemented: " + node.arity);
      //    }
      //    return n;
      //},*/

});

exports.default = _index2.default;
module.exports = exports['default'];

},{"../../TypeSystem/index.js":32}],55:[function(_dereq_,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _index = _dereq_('../../TypeSystem/index.js');

var _index2 = _interopRequireDefault(_index);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

(0, _index.$C)('$data.Expressions.ConstantExpression', _index2.default.Expressions.ExpressionNode, null, {
    constructor: function constructor(value, type, name, elementType) {
        this.value = value;
        //TODO
        //this.type = Container.getTypeName(value);

        this.type = type;
        this.name = name;
        this.elementType = elementType;
        if (!_index.Guard.isNullOrUndefined(this.value)) {
            this.type = _index.Container.resolveType(this.type);
            if (this.type === _index2.default.Array && this.elementType || _index.Container.resolveType(_index.Container.getTypeName(this.value)) !== this.type) this.value = _index.Container.convertTo(value, this.type, this.elementType);
        }
    },
    nodeType: { value: _index2.default.Expressions.ExpressionType.Constant, enumerable: true },
    type: { value: Object, writable: true },
    elementType: { value: Object, writable: true },
    value: { value: undefined, writable: true },
    toString: function toString(debug) {
        //return "[constant: " + this.value.toString() + "]";
        return this.value.toString();
    }
});

exports.default = _index2.default;
module.exports = exports['default'];

},{"../../TypeSystem/index.js":32}],56:[function(_dereq_,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _index = _dereq_('../../TypeSystem/index.js');

var _index2 = _interopRequireDefault(_index);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

(0, _index.$C)('$data.Expressions.ContinuationExpressionBuilder', _index2.default.Expressions.EntityExpressionVisitor, null, {
    constructor: function constructor(mode) {
        this.mode = mode;
    },
    compile: function compile(query) {

        var findContext = { mode: "find", skipExists: false };
        this.Visit(query.expression, findContext);

        var result = {
            skip: findContext.skipSize,
            take: findContext.pageSize,
            message: ''
        };

        if ('pageSize' in findContext) {
            var expression;
            var context = { mode: this.mode, pageSize: findContext.pageSize };

            if (!findContext.skipExists && findContext.pageSize) {
                context.append = true;
                expression = this.Visit(query.expression, context);
            } else if (findContext.skipExists) {
                expression = this.Visit(query.expression, context);
            }

            if (!context.abort) {
                result.expression = expression;
            } else {
                result.skip = (result.skip || 0) - result.take;
                result.message = 'Invalid skip value!';
            }
        } else {
            result.message = 'take expression not defined in the chain!';
        }

        return result;
    },
    VisitPagingExpression: function VisitPagingExpression(expression, context) {

        switch (context.mode) {
            case 'find':
                if (expression.nodeType === _index2.default.Expressions.ExpressionType.Take) {
                    context.pageSize = expression.amount.value;
                } else {
                    context.skipSize = expression.amount.value;
                    context.skipExists = true;
                }
                break;
            case 'prev':
                if (expression.nodeType === _index2.default.Expressions.ExpressionType.Skip) {
                    var amount = expression.amount.value - context.pageSize;
                    context.abort = amount < 0 && expression.amount.value >= context.pageSize;

                    var constExp = _index.Container.createConstantExpression(Math.max(amount, 0), "number");
                    return _index.Container.createPagingExpression(expression.source, constExp, expression.nodeType);
                } else if (context.append) {
                    //no skip expression, skip: 0, no prev
                    context.abort = true;
                }
                break;
            case 'next':
                if (expression.nodeType === _index2.default.Expressions.ExpressionType.Skip) {
                    var amount = context.pageSize + expression.amount.value;
                    var constExp = _index.Container.createConstantExpression(amount, "number");
                    return _index.Container.createPagingExpression(expression.source, constExp, expression.nodeType);
                } else if (context.append) {
                    //no skip expression, skip: 0
                    var constExp = _index.Container.createConstantExpression(context.pageSize, "number");
                    return _index.Container.createPagingExpression(expression, constExp, _index2.default.Expressions.ExpressionType.Skip);
                }
                break;
            default:
        }

        this.Visit(expression.source, context);
    }
});

exports.default = _index2.default;
module.exports = exports['default'];

},{"../../TypeSystem/index.js":32}],57:[function(_dereq_,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _index = _dereq_('../../../TypeSystem/index.js');

var _index2 = _interopRequireDefault(_index);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

(0, _index.$C)('$data.Expressions.AssociationInfoExpression', _index2.default.Expressions.ExpressionNode, null, {
    constructor: function constructor(associationInfo) {
        this.associationInfo = associationInfo;
    },
    nodeType: { value: _index2.default.Expressions.ExpressionType.AssociationInfo, enumerable: true }
});

exports.default = _index2.default;
module.exports = exports['default'];

},{"../../../TypeSystem/index.js":32}],58:[function(_dereq_,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _index = _dereq_('../../../TypeSystem/index.js');

var _index2 = _interopRequireDefault(_index);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

(0, _index.$C)('$data.Expressions.CodeExpression', _index2.default.Expressions.ExpressionNode, null, {
    constructor: function constructor(source, parameters) {
        if (_index.Container.resolveType(_index.Container.getTypeName(source)) == _index2.default.String && source.replace(/^[\s\xA0]+/, "").match("^function") != "function" && !/^[^\.]*(=>)/.test(source.replace(/^[\s\xA0]+/, ""))) {
            source = "function (it) { return " + source + "; }";
        }

        this.source = source;
        this.parameters = parameters;
    },
    nodeType: { value: _index2.default.Expressions.ExpressionType.Code, enumerable: true }
});

exports.default = _index2.default;
module.exports = exports['default'];

},{"../../../TypeSystem/index.js":32}],59:[function(_dereq_,module,exports){
'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; };

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _index = _dereq_('../../../TypeSystem/index.js');

var _index2 = _interopRequireDefault(_index);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

(0, _index.$C)('$data.Expressions.CodeToEntityConverter', _index2.default.Expressions.ExpressionVisitor, null, {
    constructor: function constructor(scopeContext) {
        ///<summary>This visitor converts a JS language tree into a semantical Entity Expression Tree &#10;This visitor should be invoked on a CodeExpression</summary>
        ///<param name="context">context.thisArg contains parameters, context.lambdaParams should have an array value</param>
        this.scopeContext = scopeContext;
        this.parameters = [];
    },

    VisitBinary: function VisitBinary(expression, context) {
        var left = this.Visit(expression.left, context);
        var right = this.Visit(expression.right, context);

        if (!(left instanceof _index2.default.Expressions.ConstantExpression) && right instanceof _index2.default.Expressions.ConstantExpression || !(right instanceof _index2.default.Expressions.ConstantExpression) && left instanceof _index2.default.Expressions.ConstantExpression) {

            var refExpression, constExpr;
            if (right instanceof _index2.default.Expressions.ConstantExpression) {
                refExpression = left;
                constExpr = right;
            } else {
                refExpression = right;
                constExpr = left;
            }

            var memInfo;
            if ((memInfo = refExpression.selector) instanceof _index2.default.Expressions.MemberInfoExpression || (memInfo = refExpression.operation) instanceof _index2.default.Expressions.MemberInfoExpression) {

                if (memInfo.memberDefinition && (memInfo.memberDefinition.type || memInfo.memberDefinition.dataType)) {
                    var fieldType = _index.Container.resolveType(memInfo.memberDefinition.type || memInfo.memberDefinition.dataType);
                    var constExprType = _index.Container.resolveType(constExpr.type);

                    if (fieldType !== constExprType) {

                        var value = constExpr.value;
                        if (expression.operator === _index2.default.Expressions.ExpressionType.In) {
                            if (Array.isArray(value)) {
                                var resultExp = [];
                                for (var i = 0; i < value.length; i++) {
                                    resultExp.push(new _index2.default.Expressions.ConstantExpression(value[i], fieldType));
                                }
                                value = resultExp;
                                fieldType = _index2.default.Array;
                            } else {
                                fieldType = constExprType;
                            }
                        }

                        if (right === constExpr) {
                            right = new _index2.default.Expressions.ConstantExpression(value, fieldType, right.name);
                        } else {
                            left = new _index2.default.Expressions.ConstantExpression(value, fieldType, left.name);
                        }
                    }
                }
            }
        }

        var operatorResolution = this.scopeContext.resolveBinaryOperator(expression.nodeType, expression, context.frameType);
        var result = _index.Container.createSimpleBinaryExpression(left, right, expression.nodeType, expression.operator, expression.type, operatorResolution);
        return result;
    },

    VisitUnary: function VisitUnary(expression, context) {
        var operand = this.Visit(expression.operand, context);
        var operatorResolution = this.scopeContext.resolveUnaryOperator(expression.nodeType, expression, context.frameType);
        var result = _index.Container.createUnaryExpression(operand, expression.operator, expression.nodeType, operatorResolution);
        return result;
    },

    VisitParameter: function VisitParameter(expression, context) {
        _index.Guard.requireValue("context", context);
        var et = _index2.default.Expressions.ExpressionType;
        switch (expression.nodeType) {
            case et.LambdaParameterReference:
                var result = _index.Container.createEntityExpression(context.lambdaParameters[expression.paramIndex], { lambda: expression.name });
                return result;
            case et.LambdaParameter:
                //TODO: throw descriptive exception or return a value
                break;
            default:
                _index.Guard.raise("Parameter '" + expression.name + "' is missing!");
                break;
        }
    },

    VisitThis: function VisitThis(expression, context) {
        ///<summary>converts the ThisExpression into a QueryParameterExpression tha't value will be evaluated and stored in this.parameters collection</summary>
        var index = this.parameters.push({ name: "", value: undefined }) - 1;
        var result = _index.Container.createQueryParameterExpression("", index, context.queryParameters, undefined);
        return result;
    },

    VisitFunction: function VisitFunction(expression, context) {
        var result = _index2.default.Expressions.ExpressionVisitor.prototype.VisitFunction.apply(this, arguments);
        return result.body;
    },

    VisitCall: function VisitCall(expression, context) {
        //var exp = this.Visit(expression.expression);
        var self = this;
        var exp = this.Visit(expression.expression, context);
        var member = this.Visit(expression.member, context);
        var args = expression.args.map(function (arg) {
            if (arg instanceof _index2.default.Expressions.FunctionExpression && (exp instanceof _index2.default.Expressions.EntitySetExpression || exp instanceof _index2.default.Expressions.FrameOperationExpression)) {
                var operation = self.scopeContext.resolveSetOperations(member.value, exp, context.frameType);
                if (!operation) {
                    _index.Guard.raise("Unknown entity field operation: " + member.getJSON());
                }

                var entitySet = self.scopeContext.getEntitySetFromElementType(exp.elementType);
                var setExpr = null;
                if (!entitySet) {
                    //TODO
                    _index.Guard.raise("Nested operations without entity set is not supported");
                } else {
                    setExpr = entitySet.expression;
                }

                var frameType = context.frameType;
                context.frameType = operation.frameType;
                context.lambdaParameters.push(setExpr);
                var res = self.Visit(arg, context);
                context.lambdaParameters.pop();
                context.frameType = frameType;

                if (operation.frameTypeFactory) {
                    return operation.frameTypeFactory(setExpr, res);
                } else {
                    return new operation.frameType(setExpr, res);
                }
            } else {
                return self.Visit(arg, context);
            }
        });
        var result;

        ///filter=>function(p) { return p.Title == this.xyz.BogusFunction('asd','basd');}
        switch (true) {
            case exp instanceof _index2.default.Expressions.QueryParameterExpression:
                var argValues = args.map(function (a) {
                    return a.value;
                });
                result = expression.implementation(exp.value, member.value, argValues);
                //var args = expressions
                return _index.Container.createQueryParameterExpression(exp.name + "$" + member.value, exp.index, result, typeof result === 'undefined' ? 'undefined' : _typeof(result));
            case exp instanceof _index2.default.Expressions.EntityFieldExpression:

            case exp instanceof _index2.default.Expressions.EntityFieldOperationExpression:
                var operation = this.scopeContext.resolveFieldOperation(member.value, exp, context.frameType);
                if (!operation) {
                    _index.Guard.raise("Unknown entity field operation: " + member.getJSON());
                }
                member = _index.Container.createMemberInfoExpression(operation);
                result = _index.Container.createEntityFieldOperationExpression(exp, member, this._resolveFunctionArguments(args, operation.parameters));
                return result;

            case exp instanceof _index2.default.Expressions.EntitySetExpression:
            case exp instanceof _index2.default.Expressions.FrameOperationExpression:
                var operation = this.scopeContext.resolveSetOperations(member.value, exp, context.frameType);
                if (!operation) {
                    _index.Guard.raise("Unknown entity field operation: " + member.getJSON());
                }
                member = _index.Container.createMemberInfoExpression(operation);
                result = _index.Container.createFrameOperationExpression(exp, member, this._resolveFunctionArguments(args, operation.parameters));
                return result;

            case exp instanceof _index2.default.Expressions.EntityExpression:
                var operation = this.scopeContext.resolveTypeOperations(member.value, exp, context.frameType);
                if (!operation) {
                    _index.Guard.raise("Unknown entity function operation: " + member.getJSON());
                }

                member = _index.Container.createMemberInfoExpression(operation);
                result = _index.Container.createEntityFunctionOperationExpression(exp, member, this._resolveFunctionArguments(args, operation.method.params));
                return result;
                break;
            case exp instanceof _index2.default.Expressions.EntityContextExpression:
                var operation = this.scopeContext.resolveContextOperations(member.value, exp, context.frameType);
                if (!operation) {
                    _index.Guard.raise("Unknown entity function operation: " + member.getJSON());
                }

                member = _index.Container.createMemberInfoExpression(operation);
                result = _index.Container.createContextFunctionOperationExpression(exp, member, this._resolveFunctionArguments(args, operation.method.params));
                return result;
                break;
            default:
                _index.Guard.raise("VisitCall: Only fields can have operations: " + expression.getType().name);
            //TODO we must not alter the visited tree
        }
    },
    _resolveFunctionArguments: function _resolveFunctionArguments(args, params) {
        if (params) // remove current field poz
            params = params.filter(function (p, i) {
                return p.name !== '@expression';
            });

        //objectArgs
        if (args.length === 1 && args[0] instanceof _index2.default.Expressions.ConstantExpression && _typeof(args[0].value) === 'object' && args[0].value && params && params[0] && args[0].value.constructor === _index2.default.Object && params.some(function (param) {
            return param.name in args[0].value;
        })) {

            return params.map(function (p) {
                var type = p.type || p.dataType || args[0].type;
                return new _index2.default.Expressions.ConstantExpression(args[0].value[p.name], _index.Container.resolveType(type), p.name);
            });
        } else {
            return args.map(function (expr, i) {
                if (expr instanceof _index2.default.Expressions.ConstantExpression && params && params[i]) {
                    var type = params[i].type || params[i].dataType || expr.type;
                    return new _index2.default.Expressions.ConstantExpression(expr.value, _index.Container.resolveType(type), params[i].name);
                } else {
                    return expr;
                }
            });
        }
    },

    VisitProperty: function VisitProperty(expression, context) {
        ///<param name="expression" type="$data.Expressions.PropertyExpression" />
        var exp = this.Visit(expression.expression, context);
        var member = this.Visit(expression.member, context);

        //Guard.requireType("member", member, $data.Expressions.ConstantExpression);
        _index.Guard.requireType("member", member, _index2.default.Expressions.ConstantExpression);

        function isPrimitiveType(memberDefinitionArg) {

            var t = memberDefinitionArg.dataType;
            if (typeof t === 'function') {
                return false;
            }

            // suspicious code
            /*switch (t) {
                //TODO: implement this
            }*/
        }

        switch (exp.expressionType) {
            case _index2.default.Expressions.EntitySetExpression:
            case _index2.default.Expressions.EntityExpression:
                var memberDefinition = exp.getMemberDefinition(member.value);
                if (!memberDefinition) {
                    _index.Guard.raise(new _index.Exception("Unknown member: " + member.value, "MemberNotFound"));
                }
                //var storageMemberDefinition =
                var storageField = memberDefinition.storageModel.PhysicalType.memberDefinitions.getMember(memberDefinition.name);
                var res;
                var memberDefinitionExp;
                switch (storageField.kind) {
                    case "property":
                        memberDefinitionExp = _index.Container.createMemberInfoExpression(memberDefinition);
                        res = _index.Container.createEntityFieldExpression(exp, memberDefinitionExp);
                        return res;
                    case "navProperty":
                        var assocInfo = memberDefinition.storageModel.Associations[memberDefinition.name];
                        var setExpression = _index.Container.createEntitySetExpression(exp, _index.Container.createAssociationInfoExpression(assocInfo));
                        if (assocInfo.ToMultiplicity !== "*") {
                            var ee = _index.Container.createEntityExpression(setExpression, {});
                            return ee;
                        } /* else {
                             context.lambdaParameters.push(setExpression);
                          }*/
                        return setExpression;
                    case "complexProperty":
                        memberDefinitionExp = _index.Container.createMemberInfoExpression(memberDefinition);
                        res = _index.Container.createComplexTypeExpression(exp, memberDefinitionExp);
                        return res;
                    //TODO: missing default case
                }

            //s/switch => property or navigationproperty
            case _index2.default.Expressions.ComplexTypeExpression:
                var memDef = exp.getMemberDefinition(member.value);
                if (!memDef) {
                    _index.Guard.raise("Unknown member " + member.value + " on " + exp.entityType.name);
                }
                var memDefExp = _index.Container.createMemberInfoExpression(memDef);
                var result;
                //TODO!!!!
                if (_index.Container.isPrimitiveType(_index.Container.resolveType(memDef.dataType))) {
                    result = _index.Container.createEntityFieldExpression(exp, memDefExp);
                    return result;
                }
                result = _index.Container.createComplexTypeExpression(exp, memDefExp);
                return result;
            case _index2.default.Expressions.QueryParameterExpression:
                var value = expression.implementation(exp.value, member.value);
                this.parameters[exp.index].name += "$" + member.value;
                this.parameters[exp.index].value = value;
                return _index.Container.createQueryParameterExpression(exp.name + "$" + member.value, exp.index, value, _index.Container.getTypeName(value));
            case _index2.default.Expressions.EntityFieldExpression:
            case _index2.default.Expressions.EntityFieldOperationExpression:
                var operation = this.scopeContext.resolveFieldOperation(member.value, exp, context.frameType);
                if (!operation) {
                    _index.Guard.raise("Unknown entity field operation: " + member.getJSON());
                }
                member = _index.Container.createMemberInfoExpression(operation);
                result = _index.Container.createEntityFieldOperationExpression(exp, member, []);

                return result;
            default:
                _index.Guard.raise("Unknown expression type to handle: " + exp.expressionType.name);
        }
    }
});

exports.default = _index2.default;
module.exports = exports['default'];

},{"../../../TypeSystem/index.js":32}],60:[function(_dereq_,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _index = _dereq_('../../../TypeSystem/index.js');

var _index2 = _interopRequireDefault(_index);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

(0, _index.$C)('$data.Expressions.ComplexTypeExpression', _index2.default.Expressions.ExpressionNode, null, {
    constructor: function constructor(source, selector) {
        ///<signature>
        ///<param name="source" type="$data.Expressions.EntityExpression" />
        ///<param name="selector" type="$data.Expressions.MemberInfoExpression" />
        ///</signature>
        ///<signature>
        ///<param name="source" type="$data.Expressions.ComplexTypeExpression" />
        ///<param name="selector" type="$data.Expressions.MemberInfoExpression" />
        ///</signature>
        _index.Guard.requireType("source", source, [_index2.default.Expressions.EntityExpression, _index2.default.Expressions.ComplexTypeExpression]);
        _index.Guard.requireType("selector", selector, [_index2.default.Expressions.EntityExpression, _index2.default.Expressions.MemberInfoExpression]);
        this.source = source;
        this.selector = selector;
        var dt = source.entityType.getMemberDefinition(selector.memberName).dataType;
        var t = _index.Container.resolveType(dt);
        this.entityType = t;
    },

    getMemberDefinition: function getMemberDefinition(name) {
        return this.entityType.getMemberDefinition(name);
    },

    nodeType: { value: _index2.default.Expressions.ExpressionType.Com }
});

exports.default = _index2.default;
module.exports = exports['default'];

},{"../../../TypeSystem/index.js":32}],61:[function(_dereq_,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _index = _dereq_('../../../TypeSystem/index.js');

var _index2 = _interopRequireDefault(_index);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

(0, _index.$C)('$data.Expressions.EntityContextExpression', _index2.default.Expressions.ExpressionNode, null, {
    constructor: function constructor(instance) {
        ///<param name="instance" type="$data.EntityContext" />
        //Object.defineProperty(this, "instance", { value: instance, enumerable: false });
        this.instance = instance;
        //this.storage_type = {};
        //this.typeName = this.type.name;
    },
    instance: { enumerable: false },
    nodeType: { value: _index2.default.Expressions.ExpressionType.EntityContext, enumerable: true }

});

exports.default = _index2.default;
module.exports = exports['default'];

},{"../../../TypeSystem/index.js":32}],62:[function(_dereq_,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _index = _dereq_('../../../TypeSystem/index.js');

var _index2 = _interopRequireDefault(_index);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

(0, _index.$C)('$data.Expressions.EntityExpression', _index2.default.Expressions.ExpressionNode, null, {
    constructor: function constructor(source, selector) {
        ///<signature>
        ///<param name="source" type="$data.Expressions.EntitySetExpression" />
        ///<param name="selector" type="$data.Expressions.MemberInfoExpression" />
        ///</signature>
        ///<signature>
        ///<param name="source" type="$data.Expressions.EntitySetExpression" />
        ///<param name="selector" type="$data.Expressions.IndexingExpression" />
        ///</signature>
        ///<signature>
        ///<param name="source" type="$data.Expressions.EntitySetExpression" />
        ///<param name="selector" type="$data.Expressions.AccessorExpression" />
        ///</signature>
        _index.Guard.requireValue("source", source);
        _index.Guard.requireValue("selector", selector);
        if (!(source instanceof _index2.default.Expressions.EntitySetExpression) && !(source instanceof _index2.default.Expressions.ServiceOperationExpression)) {
            _index.Guard.raise("Only EntitySetExpressions can be the source for an EntityExpression");
        }

        this.source = source;
        this.selector = selector;

        this.entityType = this.source.elementType;
        this.storageModel = this.source.storageModel;

        _index.Guard.requireValue("entityType", this.entityType);
        _index.Guard.requireValue("storageModel", this.storageModel);
    },

    getMemberDefinition: function getMemberDefinition(name) {
        var memdef = this.entityType.getMemberDefinition(name);
        if (!memdef) {
            _index.Guard.raise(new _index.Exception("Unknown member " + name + " on type " + this.entityType.name, "MemberNotFound"));
        };
        memdef.storageModel = this.storageModel;
        return memdef;
    },

    nodeType: { value: _index2.default.Expressions.ExpressionType.Entity }
});

exports.default = _index2.default;
module.exports = exports['default'];

},{"../../../TypeSystem/index.js":32}],63:[function(_dereq_,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _index = _dereq_('../../../TypeSystem/index.js');

var _index2 = _interopRequireDefault(_index);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

(0, _index.$C)('$data.Expressions.EntityExpressionVisitor', null, null, {

    constructor: function constructor() {
        this.lambdaTypes = [];
    },

    canVisit: function canVisit(expression) {
        return expression instanceof _index2.default.Expressions.ExpressionNode;
    },

    Visit: function Visit(expression, context) {
        if (!this.canVisit(expression)) return expression;

        var visitorName = "Visit" + expression.getType().name;
        if (visitorName in this) {
            var fn = this[visitorName];
            var result = fn.call(this, expression, context);
            if (typeof result === 'undefined') {
                return expression;
            }
            return result;
        }
        //console.log("unhandled expression type:" + expression.getType().name);
        return expression;
    },
    VisitToArrayExpression: function VisitToArrayExpression(expression, context) {
        var source = this.Visit(expression.source, context);
        if (source !== expression.source) {
            return _index.Container.createToArrayExpression(source);
        }
        return expression;
    },
    VisitForEachExpression: function VisitForEachExpression(expression, context) {
        var source = this.Visit(expression.source, context);
        if (source !== expression.source) {
            return _index.Container.createForEachExpression(source);
        }
        return expression;
    },
    VisitMemberInfoExpression: function VisitMemberInfoExpression(expression, context) {
        return expression;
    },

    VisitSingleExpression: function VisitSingleExpression(expression, context) {
        var source = this.Visit(expression.source, context);
        if (source !== expression.source) return _index.Container.createSingleExpression(source);
        return expression;
    },

    VisitFirstExpression: function VisitFirstExpression(expression, context) {
        var source = this.Visit(expression.source, context);
        if (source !== expression.source) return _index.Container.createFirstExpression(source);
        return expression;
    },

    VisitSomeExpression: function VisitSomeExpression(expression, context) {
        var source = this.Visit(expression.source, context);
        if (source !== expression.source) return _index.Container.createSomeExpression(source);
        return expression;
    },

    VisitFindExpression: function VisitFindExpression(expression, context) {
        var source = this.Visit(expression.source, context);
        if (source !== expression.source) return _index.Container.createFindExpression(source);
        return expression;
    },

    VisitEveryExpression: function VisitEveryExpression(expression, context) {
        var source = this.Visit(expression.source, context);
        if (source !== expression.source) return _index.Container.createEveryExpression(source);
        return expression;
    },

    VisitCountExpression: function VisitCountExpression(expression, context) {
        var source = this.Visit(expression.source, context);
        if (source !== expression.source) return _index.Container.createCountExpression(source);
        return expression;
    },

    VisitBatchDeleteExpression: function VisitBatchDeleteExpression(expression, context) {
        var source = this.Visit(expression.source, context);
        if (source !== expression.source) {
            return _index.Container.createBatchDeleteExpression(source);
        }
        return expression;
    },

    VisitBatchExecuteQueryExpression: function VisitBatchExecuteQueryExpression(expression, context) {
        var newQueries = expression.members.map(function (expr) {
            return this.Visit(expr, context);
        }, this);

        var equal = true;
        for (var i = 0; i < expression.members.length; i++) {
            equal = equal && expression.members[i] === newQueries[i];
        }
        if (!equal) {
            return _index.Container.createBatchExecuteQueryExpression(newQueries);
        }

        return expression;
    },

    VisitObjectLiteralExpression: function VisitObjectLiteralExpression(expression, context) {
        var newValues = expression.members.map(function (ofe) {
            return this.Visit(ofe, context);
        }, this);
        var equal = true;
        for (var i = 0; i < expression.members.length; i++) {
            equal = equal && expression.members[i] === newValues[i];
        }
        if (!equal) {
            return _index.Container.createObjectLiteralExpression(newValues);
        }
        return expression;
    },
    VisitObjectFieldExpression: function VisitObjectFieldExpression(expression, context) {
        var newExpression = this.Visit(expression.expression, context);
        if (expression.expression !== newExpression) {
            return _index.Container.createObjectFieldExpression(expression.fieldName, newExpression);
        }
        return expression;
    },
    VisitIncludeExpression: function VisitIncludeExpression(expression, context) {
        var newExpression = this.Visit(expression.source, context);
        if (newExpression !== expression.source) {
            return _index.Container.createIncludeExpression(newExpression, expression.selector);
        }
        return expression;
    },

    VisitUnaryExpression: function VisitUnaryExpression(expression, context) {

        /// <param name="expression" type="$data.Expressions.UnaryExpression"></param>
        /// <param name="context"></param>
        var operand = this.Visit(expression.operand, context);
        if (expression.operand !== operand) {
            return _index.Container.createUnaryExpression(operand, expression.operator, expression.nodeType, expression.resolution);
        };
        return expression;
    },

    VisitSimpleBinaryExpression: function VisitSimpleBinaryExpression(expression, context) {
        ///<summary></summary>
        ///<param name="expression" type="$data.Expressions.SimpleBinaryExpression"/>
        ///<param name="context" type="Object"/>
        //<returns type="$data.Expressions.SimpleBinaryExpression"/>
        var left = this.Visit(expression.left, context);
        var right = this.Visit(expression.right, context);
        if (left !== expression.left || right !== expression.right) {
            return new _index2.default.Expressions.SimpleBinaryExpression(left, right, expression.nodeType, expression.operator, expression.type, expression.resolution);
        }
        return expression;
    },

    VisitEntityContextExpression: function VisitEntityContextExpression(expression, context) {
        return expression;
    },

    VisitCodeExpression: function VisitCodeExpression(expression, context) {
        /// <param name="expression" type="$data.Expressions.CodeExpression"></param>
        /// <param name="context"></param>
        /// <returns type="$data.Expressions.CodeExpression"></returns>
        return expression;
    },

    VisitComplexTypeExpression: function VisitComplexTypeExpression(expression, context) {
        var source = this.Visit(expression.source, context);
        var selector = this.Visit(expression.selector, context);
        if (source !== expression.source || selector !== expression.selector) {
            var result = _index.Container.createComplexTypeExpression(source, selector);
            return result;
        }
        return expression;
    },

    VisitEntityExpression: function VisitEntityExpression(expression, context) {
        var source = this.Visit(expression.source, context);
        var selector = this.Visit(expression.selector, context);
        if (source !== expression.source || selector !== expression.selector) {
            var result = _index.Container.createEntityExpression(source, selector);
            return result;
        }
        return expression;
    },

    VisitEntityFieldExpression: function VisitEntityFieldExpression(expression, context) {
        var source = this.Visit(expression.source, context);
        var selector = this.Visit(expression.selector, context);
        if (source !== expression.source || selector !== expression.selector) {
            var result = _index.Container.createEntityFieldExpression(source, selector);
            return result;
        }
        return expression;
    },

    VisitEntityFieldOperationExpression: function VisitEntityFieldOperationExpression(expression, context) {
        var source = this.Visit(expression.source, context);
        var operation = this.Visit(expression.operation, context);
        var parameters = expression.parameters.map(function (p) {
            return this.Visit(p);
        }, this);
        var result = _index.Container.createEntityFieldOperationExpression(source, operation, parameters);
        return result;
    },

    VisitParametricQueryExpression: function VisitParametricQueryExpression(expression, context) {
        var exp = this.Visit(expression.expression, context);
        var args = expression.parameters.map(function (p) {
            return this.Visit(p);
        }, this);
        var result = _index.Container.createParametricQueryExpression(exp, args);
        return result;
    },

    VisitEntitySetExpression: function VisitEntitySetExpression(expression, context) {
        var source = this.Visit(expression.source, context);
        var selector = this.Visit(expression.selector, context);
        if (source !== expression.source || selector !== expression.selector) {
            return _index.Container.createEntitySetExpression(source, selector, expression.params, expression.instance);
        }
        return expression;
    },

    VisitInlineCountExpression: function VisitInlineCountExpression(expression, context) {
        var source = this.Visit(expression.source, context);
        var selector = this.Visit(expression.selector, context);
        if (source !== expression.source || selector !== expression.selector) {
            return _index.Container.createInlineCountExpression(source, selector, expression.params, expression.instance);
        }
        return expression;
    },

    VisitFilterExpression: function VisitFilterExpression(expression, context) {
        var source = this.Visit(expression.source, context);
        var selector = this.Visit(expression.selector, context);
        if (source !== expression.source || selector !== expression.selector) {
            return _index.Container.createFilterExpression(source, selector, expression.params, expression.instance);
        }
        return expression;
    },

    VisitProjectionExpression: function VisitProjectionExpression(expression, context) {
        var source = this.Visit(expression.source, context);
        var selector = this.Visit(expression.selector, context);
        if (source !== expression.source || selector !== expression.selector) {
            var expr = _index.Container.createProjectionExpression(source, selector, expression.params, expression.instance);
            expr.projectionAs = expression.projectionAs;
            return expr;
        }
        return expression;
    },

    VisitOrderExpression: function VisitOrderExpression(expression, context) {
        var source = this.Visit(expression.source, context);
        var selector = this.Visit(expression.selector, context);
        if (source !== expression.source || selector !== expression.selector) {
            return _index.Container.createOrderExpression(source, selector, expression.nodeType);
        }
        return expression;
    },
    VisitPagingExpression: function VisitPagingExpression(expression, context) {
        var source = this.Visit(expression.source, context);
        var amount = this.Visit(expression.amount, context);
        if (source !== expression.source || amount !== expression.amount) {
            return _index.Container.createPagingExpression(source, amount, expression.nodeType);
        }
        return expression;
    }
});

exports.default = _index2.default;
module.exports = exports['default'];

},{"../../../TypeSystem/index.js":32}],64:[function(_dereq_,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _index = _dereq_('../../../TypeSystem/index.js');

var _index2 = _interopRequireDefault(_index);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

(0, _index.$C)('$data.Expressions.EntityFieldExpression', _index2.default.Expressions.ExpressionNode, null, {
    constructor: function constructor(source, selector) {
        ///<param name="source" type="$data.Entity.EntityExpression" />
        ///<param name="selector" type="$data.Entity.MemberInfoExpression" />
        this.selector = selector;
        this.source = source;

        if (this.selector instanceof _index2.default.Expressions.MemberInfoExpression || this.selector.name) {
            this.memberName = this.selector.name;
        }
    },

    nodeType: { value: _index2.default.Expressions.ExpressionType.EntityField }
});

exports.default = _index2.default;
module.exports = exports['default'];

},{"../../../TypeSystem/index.js":32}],65:[function(_dereq_,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _index = _dereq_('../../../TypeSystem/index.js');

var _index2 = _interopRequireDefault(_index);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

(0, _index.$C)('$data.Expressions.EntityFieldOperationExpression', _index2.default.Expressions.ExpressionNode, null, {
    constructor: function constructor(source, operation, parameters) {
        this.source = source;
        this.operation = operation;
        this.parameters = parameters;
    },
    nodeType: { value: _index2.default.Expressions.ExpressionType.EntityFieldOperation }

});

exports.default = _index2.default;
module.exports = exports['default'];

},{"../../../TypeSystem/index.js":32}],66:[function(_dereq_,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _index = _dereq_('../../../TypeSystem/index.js');

var _index2 = _interopRequireDefault(_index);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

(0, _index.$C)('$data.Expressions.EntitySetExpression', _index2.default.Expressions.ExpressionNode, null, {
    constructor: function constructor(source, selector, params, instance) {
        ///<signature>
        ///<param name="source" type="$data.Expressions.EntityExpression" />
        ///<param name="selector" type="$data.Expressions.MemberInfoExpression" />
        ///</signature>
        ///<signature>
        ///<param name="source" type="$data.Expressions.EntityContextExpression" />
        ///<param name="selector" type="$data.Expressions.MemberInfoExpression" />
        ///</signature>
        ///<signature>
        ///<param name="source" type="$data.Expressions.EntitySetExpression" />
        ///<param name="selector" type="$data.Expressions.ParametricQueryExpression" />
        ///</signature>
        ///<signature>
        ///<param name="source" type="$data.Expressions.EntitySetExpression" />
        ///<param name="selector" type="$data.Expressions.CodeExpression" />
        ///</signature>
        _index.Guard.requireType("source", source, [_index2.default.Expressions.EntityContextExpression, _index2.default.Expressions.EntitySetExpression]);
        _index.Guard.requireType("selector", source, [_index2.default.Expressions.MemberInfoExpression, _index2.default.Expressions.CodeExpression, _index2.default.Expressions.ParametricQueryExpression]);

        this.source = source;
        this.selector = selector;
        this.params = params;
        //Object.defineProperty(this, "instance", { value: instance, enumerable: false, writable: true });
        this.instance = instance;

        function findContext() {
            //TODO: use source from function parameter and return a value at the end of the function
            var r = source;
            while (r) {
                if (r instanceof _index2.default.Expressions.EntityContextExpression) {
                    return r;
                }
                r = r.source;
            }
        }

        ///TODO!!!
        this.storage_type = {};
        var c = findContext();
        switch (true) {
            case this.source instanceof _index2.default.Expressions.EntityContextExpression:
                _index.Guard.requireType("selector", selector, _index2.default.Expressions.MemberInfoExpression);
                this.elementType = selector.memberDefinition.elementType;
                this.storageModel = c.instance._storageModel.getStorageModel(this.elementType);
                break;
            case this.source instanceof _index2.default.Expressions.EntityExpression:
                _index.Guard.requireType("selector", selector, _index2.default.Expressions.AssociationInfoExpression);
                this.elementType = selector.associationInfo.ToType;
                this.storageModel = c.instance._storageModel.getStorageModel(this.elementType);
                break;
            case this.source instanceof _index2.default.Expressions.EntitySetExpression:
                if (selector instanceof _index2.default.Expressions.AssociationInfoExpression) {
                    this.elementType = selector.associationInfo.ToType, this.storageModel = c.instance._storageModel.getStorageModel(selector.associationInfo.ToType);
                } else {
                    this.elementType = this.source.elementType;
                    this.storageModel = this.source.storageModel;
                }
                break;
            case this.source instanceof _index2.default.Expressions.ServiceOperationExpression:
                this.elementType = this.source.elementType; //?????????
                this.storageModel = this.source.storageModel;
                break;
            default:
                _index.Guard.raise("take and skip must be the last expressions in the chain!");
                //Guard.raise("Unknown source type for EntitySetExpression: " + this.getType().name);
                break;
        }

        // suspicious code
        /*if (this.source instanceof $data.Expressions.EntitySetExpression) {
                //TODO: missing operation
        }*/
        //EntityTypeInfo
    },
    getMemberDefinition: function getMemberDefinition(name) {
        var memdef = this.elementType.getMemberDefinition(name);
        if (!memdef) {
            _index.Guard.raise(new _index.Exception("Unknown member " + name + " on type " + this.entityType.name, "MemberNotFound"));
        };
        memdef.storageModel = this.storageModel;
        return memdef;
    },

    instance: { enumerable: false },
    nodeType: { value: _index2.default.Expressions.ExpressionType.EntitySet, enumerable: true }
});

exports.default = _index2.default;
module.exports = exports['default'];

},{"../../../TypeSystem/index.js":32}],67:[function(_dereq_,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _index = _dereq_('../../../TypeSystem/index.js');

var _index2 = _interopRequireDefault(_index);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

(0, _index.$C)('$data.Expressions.ExpressionMonitor', _index2.default.Expressions.EntityExpressionVisitor, null, {
    constructor: function constructor(monitorDefinition) {
        this.Visit = function (expression, context) {

            var result = expression;
            var methodName;
            if (this.canVisit(expression)) {

                //if (monitorDefinition.FilterExpressionNode) {

                //};

                if (monitorDefinition.VisitExpressionNode) {
                    monitorDefinition.VisitExpressionNode.apply(monitorDefinition, arguments);
                };

                methodName = "Visit" + expression.getType().name;
                if (methodName in monitorDefinition) {
                    result = monitorDefinition[methodName].apply(monitorDefinition, arguments);
                }
            }

            //apply is about 3-4 times faster then call on webkit

            var args = arguments;
            if (result !== expression) args = [result, context];
            result = _index2.default.Expressions.EntityExpressionVisitor.prototype.Visit.apply(this, args);

            args = [result, context];

            if (this.canVisit(result)) {
                var expressionTypeName = result.getType().name;
                if (monitorDefinition.MonitorExpressionNode) {
                    monitorDefinition.MonitorExpressionNode.apply(monitorDefinition, args);
                }
                methodName = "Monitor" + expressionTypeName;
                if (methodName in monitorDefinition) {
                    monitorDefinition[methodName].apply(monitorDefinition, args);
                }

                if (monitorDefinition.MutateExpressionNode) {
                    monitorDefinition.MutateExpressionNode.apply(monitorDefinition, args);
                }
                methodName = "Mutate" + expressionTypeName;
                if (methodName in monitorDefinition) {
                    result = monitorDefinition[methodName].apply(monitorDefinition, args);
                }
            }
            return result;
        };
    }
});

exports.default = _index2.default;
module.exports = exports['default'];

},{"../../../TypeSystem/index.js":32}],68:[function(_dereq_,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _index = _dereq_('../../../TypeSystem/index.js');

var _index2 = _interopRequireDefault(_index);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

(0, _index.$C)('$data.Expressions.FilterExpression', _index2.default.Expressions.EntitySetExpression, null, {
    constructor: function constructor(source, selector) {
        ///<signature>
        ///<param name="source" type="$data.Expressions.EntitySetExpression" />
        ///<param name="selector" type="$data.Expressions.ParametricQueryExpression" />
        ///</signature>
        ///<signature>
        ///<param name="source" type="$data.Expressions.EntitySetExpression" />
        ///<param name="selector" type="$data.Expressions.CodeExpression" />
        ///</signature>
        this.resultType = _index2.default.Array;
    },
    nodeType: { value: _index2.default.Expressions.ExpressionType.Filter, enumerable: true }
});

(0, _index.$C)('$data.Expressions.InlineCountExpression', _index2.default.Expressions.EntitySetExpression, null, {
    constructor: function constructor(source, selector) {},
    nodeType: { value: _index2.default.Expressions.ExpressionType.InlineCount, enumerable: true }
});

(0, _index.$C)('$data.Expressions.BatchExecuteQueryExpression', _index2.default.Expressions.ExpressionNode, null, {
    constructor: function constructor(members) {
        this.members = members;
    },
    nodeType: { value: _index2.default.Expressions.ExpressionType.BatchExecuteQuery, enumerable: true }
});

(0, _index.$C)('$data.Expressions.FrameOperator', _index2.default.Expressions.ExpressionNode, null, {
    constructor: function constructor() {
        this.isTerminated = true;
    }
});

(0, _index.$C)('$data.Expressions.CountExpression', _index2.default.Expressions.FrameOperator, null, {
    constructor: function constructor(source) {
        ///<signature>
        ///<param name="source" type="$data.Expressions.EntitySetExpression" />
        ///</signature>
        this.source = source;
        this.resultType = _index2.default.Integer;
    },
    nodeType: { value: _index2.default.Expressions.ExpressionType.Count, enumerable: true }
});

(0, _index.$C)('$data.Expressions.SingleExpression', _index2.default.Expressions.FrameOperator, null, {
    constructor: function constructor(source) {
        ///<signature>
        ///<param name="source" type="$data.Expressions.EntitySetExpression" />
        ///</signature>
        this.source = source;
        this.resultType = _index2.default.Object;
    },
    nodeType: { value: _index2.default.Expressions.ExpressionType.Single, enumerable: true }
});

(0, _index.$C)('$data.Expressions.FindExpression', _index2.default.Expressions.FrameOperator, null, {
    constructor: function constructor(source, params, subMember) {
        ///<signature>
        ///<param name="source" type="$data.Expressions.EntitySetExpression" />
        ///</signature>
        this.source = source;
        this.params = params;
        this.subMember = subMember;
        this.resultType = _index2.default.Object;
    },
    nodeType: { value: _index2.default.Expressions.ExpressionType.Find, enumerable: true }
});

(0, _index.$C)('$data.Expressions.FirstExpression', _index2.default.Expressions.FrameOperator, null, {
    constructor: function constructor(source) {
        ///<signature>
        ///<param name="source" type="$data.Expressions.EntitySetExpression" />
        ///</signature>
        this.source = source;
        this.resultType = _index2.default.Object;
    },
    nodeType: { value: _index2.default.Expressions.ExpressionType.First, enumerable: true }
});

(0, _index.$C)('$data.Expressions.ForEachExpression', _index2.default.Expressions.FrameOperator, null, {
    constructor: function constructor(source) {
        ///<signature>
        ///<param name="source" type="$data.Expressions.EntitySetExpression" />
        ///</signature>
        this.source = source;
        this.resultType = _index2.default.Array;
    },
    nodeType: { value: _index2.default.Expressions.ExpressionType.ForEach, enumerable: true }
});
(0, _index.$C)('$data.Expressions.ToArrayExpression', _index2.default.Expressions.FrameOperator, null, {
    constructor: function constructor(source) {
        ///<signature>
        ///<param name="source" type="$data.Expressions.EntitySetExpression" />
        ///</signature>
        this.source = source;
        this.resultType = _index2.default.Array;
    },
    nodeType: { value: _index2.default.Expressions.ExpressionType.ToArray, enumerable: true }
});

(0, _index.$C)('$data.Expressions.SomeExpression', _index2.default.Expressions.FrameOperator, null, {
    constructor: function constructor(source) {
        ///<signature>
        ///<param name="source" type="$data.Expressions.EntitySetExpression" />
        ///</signature>
        this.source = source;
        this.resultType = _index2.default.Object;
    },
    nodeType: { value: _index2.default.Expressions.ExpressionType.Some, enumerable: true }
});

(0, _index.$C)('$data.Expressions.EveryExpression', _index2.default.Expressions.FrameOperator, null, {
    constructor: function constructor(source) {
        ///<signature>
        ///<param name="source" type="$data.Expressions.EntitySetExpression" />
        ///</signature>
        this.source = source;
        this.resultType = _index2.default.Object;
    },
    nodeType: { value: _index2.default.Expressions.ExpressionType.Every, enumerable: true }
});

(0, _index.$C)('$data.Expressions.BatchDeleteExpression', _index2.default.Expressions.FrameOperator, null, {
    constructor: function constructor(source) {
        ///<signature>
        ///<param name="source" type="$data.Expressions.EntitySetExpression" />
        ///</signature>
        this.source = source;
        this.resultType = _index2.default.Integer;
    },
    nodeType: { value: _index2.default.Expressions.ExpressionType.BatchDelete, enumerable: true }
});

exports.default = _index2.default;
module.exports = exports['default'];

},{"../../../TypeSystem/index.js":32}],69:[function(_dereq_,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _index = _dereq_('../../../TypeSystem/index.js');

var _index2 = _interopRequireDefault(_index);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

(0, _index.$C)('$data.Expressions.FrameOperationExpression', _index2.default.Expressions.ExpressionNode, null, {
    constructor: function constructor(source, operation, parameters) {
        this.source = source;
        this.operation = operation;
        this.parameters = parameters;

        switch (true) {
            case this.source instanceof _index2.default.Expressions.EntitySetExpression:
            case this.source instanceof _index2.default.Expressions.FrameOperationExpression:
                this.elementType = this.source.elementType;
                this.storageModel = this.source.storageModel;
                break;
        }
    },
    nodeType: { value: _index2.default.Expressions.ExpressionType.FrameOperation }

});

(0, _index.$C)('$data.Expressions.EntityFunctionOperationExpression', _index2.default.Expressions.FrameOperationExpression, null, {
    nodeType: { value: _index2.default.Expressions.ExpressionType.EntityFunctionOperation }
});

(0, _index.$C)('$data.Expressions.ContextFunctionOperationExpression', _index2.default.Expressions.FrameOperationExpression, null, {
    nodeType: { value: _index2.default.Expressions.ExpressionType.ContextFunctionOperation }
});

exports.default = _index2.default;
module.exports = exports['default'];

},{"../../../TypeSystem/index.js":32}],70:[function(_dereq_,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _index = _dereq_('../../../TypeSystem/index.js');

var _index2 = _interopRequireDefault(_index);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

(0, _index.$C)('$data.Expressions.IncludeExpression', _index2.default.Expressions.EntitySetExpression, null, {
    constructor: function constructor(source, selector) {},
    nodeType: { value: _index2.default.Expressions.ExpressionType.Include, writable: true },

    toString: function toString(debug) {
        //var result;
        //result = debug ? this.type + " " : "";
        //result = result + this.name;
        var result = "unimplemented";
        return result;
    }
}, null);

exports.default = _index2.default;
module.exports = exports['default'];

},{"../../../TypeSystem/index.js":32}],71:[function(_dereq_,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _index = _dereq_('../../../TypeSystem/index.js');

var _index2 = _interopRequireDefault(_index);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

(0, _index.$C)('$data.Expressions.MemberInfoExpression', _index2.default.Expressions.ExpressionNode, null, {
    constructor: function constructor(memberDefinition) {
        this.memberDefinition = memberDefinition;
        this.memberName = memberDefinition.name;
    },
    nodeType: { value: _index2.default.Expressions.ExpressionType.MemberInfo, enumerable: true }

});

exports.default = _index2.default;
module.exports = exports['default'];

},{"../../../TypeSystem/index.js":32}],72:[function(_dereq_,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _index = _dereq_('../../../TypeSystem/index.js');

var _index2 = _interopRequireDefault(_index);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

(0, _index.$C)('$data.Expressions.OrderExpression', _index2.default.Expressions.EntitySetExpression, null, {
    constructor: function constructor(source, expression, nType) {
        ///<param name="name" type="string" />
        ///<field name="name" type="string" />
        //this.source = source;
        //this.selector = expression;
        this.nodeType = nType;
    },
    nodeType: { value: _index2.default.Expressions.ExpressionType.OrderBy, writable: true },

    toString: function toString(debug) {
        //var result;
        //result = debug ? this.type + " " : "";
        //result = result + this.name;
        var result = "unimplemented";
        return result;
    }
}, null);

exports.default = _index2.default;
module.exports = exports['default'];

},{"../../../TypeSystem/index.js":32}],73:[function(_dereq_,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _index = _dereq_('../../../TypeSystem/index.js');

var _index2 = _interopRequireDefault(_index);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

(0, _index.$C)('$data.Expressions.ParametricQueryExpression', _index2.default.Expressions.ExpressionNode, null, {
    constructor: function constructor(expression, parameters) {
        this.expression = expression;
        this.parameters = parameters || [];
    },
    nodeType: { value: _index2.default.Expressions.ExpressionType.ParametricQuery, enumerable: true }
});

exports.default = _index2.default;
module.exports = exports['default'];

},{"../../../TypeSystem/index.js":32}],74:[function(_dereq_,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _index = _dereq_('../../../TypeSystem/index.js');

var _index2 = _interopRequireDefault(_index);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

(0, _index.$C)('$data.Expressions.ProjectionExpression', _index2.default.Expressions.EntitySetExpression, null, {
    constructor: function constructor(source, selector, params, instance) {},
    nodeType: { value: _index2.default.Expressions.ExpressionType.Projection, enumerable: true }

});

exports.default = _index2.default;
module.exports = exports['default'];

},{"../../../TypeSystem/index.js":32}],75:[function(_dereq_,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _index = _dereq_('../../../TypeSystem/index.js');

var _index2 = _interopRequireDefault(_index);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

(0, _index.$C)('$data.Expressions.QueryExpressionCreator', _index2.default.Expressions.EntityExpressionVisitor, null, {
    constructor: function constructor(scopeContext) {
        ///<param name="scopeContext" type="$data.Expressions.EntityContext" />
        _index.Guard.requireValue("scopeContext", scopeContext);
        this.scopeContext = scopeContext;
    },
    VisitEntitySetExpression: function VisitEntitySetExpression(expression, context) {
        if (expression.source instanceof _index2.default.Expressions.EntityContextExpression) {
            this.lambdaTypes.push(expression);
        }
        return expression;
    },

    VisitServiceOperationExpression: function VisitServiceOperationExpression(expression, context) {
        if (expression.source instanceof _index2.default.Expressions.EntityContextExpression) {
            this.lambdaTypes.push(expression);
        }
        return expression;
    },

    VisitCodeExpression: function VisitCodeExpression(expression, context) {
        ///<summary>Converts the CodeExpression into an EntityExpression</summary>
        ///<param name="expression" type="$data.Expressions.CodeExpression" />
        var source = expression.source.toString();
        var jsCodeTree = _index.Container.createCodeParser(this.scopeContext).createExpression(source);
        this.scopeContext.log({ event: "JSCodeExpression", data: jsCodeTree });

        //TODO rename classes to reflex variable names
        //TODO engage localValueResolver here
        //var globalVariableResolver = Container.createGlobalContextProcessor($data.__global);
        var constantResolver = _index.Container.createConstantValueResolver(expression.parameters, _index2.default.__global, this.scopeContext);
        var parameterProcessor = _index.Container.createParameterResolverVisitor();

        jsCodeTree = parameterProcessor.Visit(jsCodeTree, constantResolver);

        this.scopeContext.log({ event: "JSCodeExpressionResolved", data: jsCodeTree });
        var code2entity = _index.Container.createCodeToEntityConverter(this.scopeContext);

        ///user provided query parameter object (specified as thisArg earlier) is passed in
        var entityExpression = code2entity.Visit(jsCodeTree, { queryParameters: expression.parameters, lambdaParameters: this.lambdaTypes, frameType: context.frameType });

        ///parameters are referenced, ordered and named, also collected in a flat list of name value pairs
        var result = _index.Container.createParametricQueryExpression(entityExpression, code2entity.parameters);
        this.scopeContext.log({ event: "EntityExpression", data: entityExpression });

        return result;
    },

    VisitFilterExpression: function VisitFilterExpression(expression, context) {
        var source = this.Visit(expression.source, context);
        context = context || {};
        context.frameType = expression.getType();
        var selector = this.Visit(expression.selector, context);
        if (source !== expression.source || selector !== expression.selector) {
            return _index.Container.createFilterExpression(source, selector, expression.params, expression.instance);
        }
        return expression;
    },

    VisitInlineCountExpression: function VisitInlineCountExpression(expression, context) {
        var source = this.Visit(expression.source, context);
        context = context || {};
        context.frameType = expression.getType();
        var selector = this.Visit(expression.selector, context);
        if (source !== expression.source || selector !== expression.selector) {
            return _index.Container.createInlineCountExpression(source, selector, expression.params, expression.instance);
        }
        return expression;
    },

    VisitProjectionExpression: function VisitProjectionExpression(expression, context) {
        var source = this.Visit(expression.source, context);
        context = context || {};
        context.frameType = expression.getType();
        var selector = this.Visit(expression.selector, context);
        if (source !== expression.source || selector !== expression.selector) {
            var expr = _index.Container.createProjectionExpression(source, selector, expression.params, expression.instance);
            expr.projectionAs = expression.projectionAs;
            return expr;
        }
        return expression;
    },

    VisitOrderExpression: function VisitOrderExpression(expression, context) {
        var source = this.Visit(expression.source, context);
        context = context || {};
        context.frameType = expression.getType();
        var selector = this.Visit(expression.selector, context);
        if (source !== expression.source || selector !== expression.selector) {
            return _index.Container.createOrderExpression(source, selector, expression.nodeType);
        }
        return expression;
    },

    VisitIncludeExpression: function VisitIncludeExpression(expression, context) {
        var source = this.Visit(expression.source, context);
        context = context || {};
        context.frameType = expression.getType();
        var selector = this.Visit(expression.selector, context);
        if (source !== expression.source || selector !== expression.selector) {
            return _index.Container.createIncludeExpression(source, selector);
        }
        return expression;
    }
});

exports.default = _index2.default;
module.exports = exports['default'];

},{"../../../TypeSystem/index.js":32}],76:[function(_dereq_,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _index = _dereq_('../../../TypeSystem/index.js');

var _index2 = _interopRequireDefault(_index);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

(0, _index.$C)('$data.Expressions.QueryParameterExpression', _index2.default.Expressions.ExpressionNode, null, {
    constructor: function constructor(name, index, value, type) {
        this.name = name;
        this.index = index;
        this.value = value;
        //TODO
        this.type = _index.Container.getTypeName(value);
    },

    nodeType: { value: _index2.default.Expressions.ExpressionType.QueryParameter, writable: false }
});

exports.default = _index2.default;
module.exports = exports['default'];

},{"../../../TypeSystem/index.js":32}],77:[function(_dereq_,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _index = _dereq_('../../../TypeSystem/index.js');

var _index2 = _interopRequireDefault(_index);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

(0, _index.$C)('$data.Expressions.RepresentationExpression', _index2.default.Expressions.ExpressionNode, null, {
    constructor: function constructor(kind) {},

    getMemberDefinition: function getMemberDefinition(name) {
        return this.entityType.getMemberDefinition(name);
    },

    nodeType: { value: _index2.default.Expressions.ExpressionType.Entity }
});

exports.default = _index2.default;
module.exports = exports['default'];

},{"../../../TypeSystem/index.js":32}],78:[function(_dereq_,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _index = _dereq_('../../../TypeSystem/index.js');

var _index2 = _interopRequireDefault(_index);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

(0, _index.$C)('$data.Expressions.ServiceOperationExpression', _index2.default.Expressions.ExpressionNode, null, {
    constructor: function constructor(source, selector, params, cfg, boundItem) {
        ///<signature>
        ///<param name="source" type="$data.Expressions.EntityContextExpression" />
        ///<param name="selector" type="$data.Expressions.MemberInfoExpression" />
        ///<param name="params" type="$data.Array" />
        ///<param name="cfg" type="$data.Object" />
        ///</signature>
        _index.Guard.requireType("source", source, [_index2.default.Expressions.EntityContextExpression]);
        _index.Guard.requireType("selector", source, [_index2.default.Expressions.MemberInfoExpression]);

        this.source = source;
        this.selector = selector;
        this.params = params;
        this.cfg = cfg;
        this.boundItem = boundItem;

        function findContext() {
            //TODO: use source from function parameter and return a value at the end of the function
            var r = source;
            while (r) {
                if (r instanceof _index2.default.Expressions.EntityContextExpression) {
                    return r;
                }
                r = r.source;
            }
        }

        var c = findContext();
        switch (true) {
            case this.source instanceof _index2.default.Expressions.EntityContextExpression:
                this.elementType = cfg.elementType ? _index.Container.resolveType(cfg.elementType) : this.elementType ? _index.Container.resolveType(cfg.returnType) : null;
                this.storageModel = cfg.elementType ? c.instance._storageModel.getStorageModel(_index.Container.resolveType(cfg.elementType)) : null;
                break;
            default:
                _index.Guard.raise("Unknown source type for EntitySetExpression: " + this.source.getType().name);
        }
    },
    nodeType: { value: _index2.default.Expressions.ExpressionType.ServiceOperation, enumerable: true }
});

exports.default = _index2.default;
module.exports = exports['default'];

},{"../../../TypeSystem/index.js":32}],79:[function(_dereq_,module,exports){
'use strict';

var _index = _dereq_('../../TypeSystem/index.js');

var _index2 = _interopRequireDefault(_index);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

_index2.default.Class.define('$data.Expressions.ExpressionBuilder', null, null, {
    constructor: function constructor(context) {
        this.context = context;
    },
    _isLambdaParam: function _isLambdaParam(name) {
        var p = this.context.lambdaParams;
        for (var i = 0; i < p.length; i++) {
            if (p[i] == name) return true;
        }
        return false;
    },
    _isParam: function _isParam(name) {
        return this.context.paramContext[name] != undefined;
    },
    _isParamRoot: function _isParamRoot(name) {
        return this.context.paramsName == name;
    },
    Build: function Build(node, expNode) {
        var n;
        switch (node.arity) {
            case "infix":
                if ("(" == node.value) n = this.BuildMethodCall(node, expNode);else if ("." == node.value) n = this.BuildMember(node, expNode);else if (["===", "==", "!==", "!=", ">", "<", ">=", "<="].indexOf(node.value) >= 0) n = this.BuildEquality(node, expNode);else if (["&&", "||"].indexOf(node.value) >= 0) n = this.BuildBinary(node, expNode);else if (["+", "-", "*", "/", "%"].indexOf(node.value) >= 0) n = this.BuildBinary(node, expNode);else if ("[" == node.value) n = this.BuildArrayAccess(node, expNode);else _index.Guard.raise("Value of infix node isn't implemented: " + node.value);
                break;
            case "prefix":
                if (["+", "-", "!"].indexOf(node.value) >= 0) n = this.BuildUnary(node, expNode);else if (["++", "--"].indexOf(node.value) >= 0) n = this.BuildIncDec(node, expNode);else if ("{" == node.value /* && "object" == node.type*/) //TODO: check the second condition necessity
                    n = this.BuildNewExpression(node, expNode);else _index.Guard.raise("Value of prefix node isn't implemented: " + node.value);
                break;
            case "suffix":
                if (["++", "--"].indexOf(node.value) >= 0) n = this.BuildIncDec(node, expNode);else _index.Guard.raise("Value of suffix node isn't implemented: " + node.value);
                break;
            case "string":
            case "number":
                n = this.BuildLiteral(node, expNode); //TODO: more arity to literal?
                break;
            case "ternary":
                if (node.value == "?") n = this.BuildDecision(node, expNode);else _index.Guard.raise("Value of ternary node isn't implemented: " + node.value);
                break;
            case null:
            case undefined:
                if (node.type == "boolean" && (node.value == "true" || node.value == "false")) n = this.BuildBoolLiteral(node, expNode);else n = this.BuildVariable(node, expNode);
                break;
            default:
                _index.Guard.raise("Arity isn't implemented: " + node.arity);
        }
        return n;
    },
    BuildNewExpression: function BuildNewExpression(node, expNode) {
        var newExpression = _index2.default.Expressions.ExpressionNodeTypes.NewExpressionNode.create(true, []);
        var n = node.first;
        for (var i = 0; i < n.length; i++) {
            newExpression.values.push(this.Build(n[i], newExpression));
        }return newExpression;
    },
    BuildLiteral: function BuildLiteral(node, expNode) {
        return _index2.default.Expressions.ExpressionNodeTypes.LiteralExpressionNode.create(true, node.arity, node.value);
    },
    BuildBoolLiteral: function BuildBoolLiteral(node, expNode) {
        return _index2.default.Expressions.ExpressionNodeTypes.LiteralExpressionNode.create(true, node.type, node.value == "true" ? true : false);
    },
    BuildVariable: function BuildVariable(node, expNode) {
        if (!node.first) {
            if (expNode.type == MEMBERACCESS) {
                var subType;
                if (this._isLambdaParam(node.value)) subType = "LAMBDAPARAM";else if (this._isParamRoot(node.value)) subType = "PARAMETERROOT";else if (this._isParam(node.value)) subType = "PARAMETER";else subType = "PROPERTY";
            } else {
                if (this._isLambdaParam(node.value)) subType = "LAMBDAPARAM";else if (this._isParamRoot(node.value)) subType = "PARAMETERROOT";else if (this._isParam(node.value)) subType = "PARAMETER";else if (_index2.default.__global[node.value] != undefined) subType = "GLOBALOBJECT";else _index.Guard.raise(new _index.Exception("Unknown variable in '" + this.context.operation + "' operation. The variable isn't referenced in the parameter context and it's not a global variable: '" + node.value + "'.", "InvalidOperation", { operationName: this.context.operation, missingParameterName: node.value }));
            }
            return _index2.default.Expressions.ExpressionNodeTypes.VariableExpressionNode.create(true, node.value, subType);
        }

        var left = _index2.default.Expressions.ExpressionNodeTypes.LiteralExpressionNode.create(true, "name", node.value);

        var jsonAssign = _index2.default.Expressions.ExpressionNodeTypes.JsonAssignExpressionNode.create(true);
        var right = this.Build(node.first, jsonAssign);
        //left.parent = jsonAssign;
        jsonAssign.left = left;
        jsonAssign.right = right;

        left.JSONASSIGN = true;
        right.JSONASSIGN = true;

        return jsonAssign;
    },
    BuildMember: function BuildMember(node, expNode) {
        if (node.value != "." || node.arity != "infix") {
            if (node.type == "string") {
                //TODO: more types?
                return _index2.default.Expressions.ExpressionNodeTypes.LiteralExpressionNode.create(true, node.arity, node.value);
            }
            return _index2.default.Expressions.ExpressionNodeTypes.MemberAccessExpressionNode.create(true, null, node.value);
        }
        var result = _index2.default.Expressions.ExpressionNodeTypes.MemberAccessExpressionNode.create(true);
        var expression = this.Build(node.first, result);
        var member = this.Build(node.second, result);
        result.expression = expression;
        result.member = member;
        return result;
    },
    BuildUnary: function BuildUnary(node, expNode) {
        var result = _index2.default.Expressions.ExpressionNodeTypes.UnaryExpressionNode.create(true, node.value);
        result.operand = this.Build(node.first, result);
        return result;
    },
    BuildIncDec: function BuildIncDec(node, expNode) {
        var result = _index2.default.Expressions.ExpressionNodeTypes.IncDecExpressionNode.create(true, node.value, null, node.arity == "suffix");
        result.operand = this.Build(node.first, result);
        return result;
    },
    BuildBinary: function BuildBinary(node, expNode) {
        if (!node.first) _index.Guard.raise("Cannot build binary: node.first is null");
        if (!node.second) _index.Guard.raise("Cannot build binary: node.second is null");
        var result = _index2.default.Expressions.ExpressionNodeTypes.BinaryExpressionNode.create(true, node.value);
        result.left = this.Build(node.first, result);
        result.right = this.Build(node.second, result);
        return result;
    },
    BuildEquality: function BuildEquality(node, expNode) {
        var result = _index2.default.Expressions.ExpressionNodeTypes.EqualityExpressionNode.create(true, node.value);
        result.left = this.Build(node.first, result);
        result.right = this.Build(node.second, result);
        return result;
    },
    BuildDecision: function BuildDecision(node, expNode) {
        var result = _index2.default.Expressions.ExpressionNodeTypes.DecisionExpressionNode.create(true);
        result.expression = this.Build(node.first, result);
        result.left = this.Build(node.second, result);
        result.right = this.Build(node.third, result);
        return result;
    },
    BuildMethodCall: function BuildMethodCall(node, expNode) {
        var result = _index2.default.Expressions.ExpressionNodeTypes.MethodcallExpressionNode.create(true);
        if (node.first.type == "function") {
            //-- object's function
            result.object = this.Build(node.first.first, result);
            result.method = node.first.second.value;
        } else {
            //-- global function
            if (node.first.type != null) _index.Guard.raise("Cannot build MethodCall because type is " + type);
            result.object = null;
            result.method = node.first.value;
        }
        var argNodes = node.second;
        var args = [];
        for (var i = 0; i < argNodes.length; i++) {
            var arg = argNodes[i];
            args[i] = this.Build(arg, result);
        }
        result.args = args;
        return result;
    },
    BuildArrayAccess: function BuildArrayAccess(node, expNode) {
        // { type:ARRAYACCESS, executable:true, array:, index: }
        var result = _index2.default.Expressions.ExpressionNodeTypes.ArrayAccessExpressionNode.create(true);
        result.array = this.Build(node.first, result);
        result.index = this.Build(node.second, result);
        return result;
    }
}, null);

},{"../../TypeSystem/index.js":32}],80:[function(_dereq_,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _index = _dereq_("../../TypeSystem/index.js");

var _index2 = _interopRequireDefault(_index);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

//TODO: Finish refactoring ExpressionNode.js

_index2.default.Class.define("$data.Expressions.ExpressionType", null, null, {}, {
    Constant: "constant", // { type:LITERAL, executable:true, valueType:, value: }
    Variable: "variable", // { type:VARIABLE, executable:true, name: }
    MemberAccess: "memberAccess", // { type:MEMBERACCESS, executable:true, expression:, member: }
    Call: "call",

    /* binary operators */
    Equal: "equal",
    NotEqual: "notEqual",
    EqualTyped: "equalTyped",
    NotEqualTyped: "notEqualTyped",
    GreaterThen: "greaterThan",
    LessThen: "lessThan",
    GreaterThenOrEqual: "greaterThanOrEqual",
    LessThenOrEqual: "lessThenOrEqual",
    Or: "or",
    OrBitwise: "orBitwise",
    And: "and",
    AndBitwise: "andBitwise",

    In: "in",

    Add: "add",
    Divide: "divide",
    Multiply: "multiply",
    Subtract: "subtract",
    Modulo: "modulo",
    ArrayIndex: "arrayIndex",

    /* unary operators */
    New: "new",
    Positive: "positive",
    Negative: "negative",
    Increment: "increment",
    Decrement: "decrement",
    Not: "not",

    This: "this",
    LambdaParameterReference: "lambdaParameterReference",
    LambdaParameter: "lambdaParameter",
    ParameterReference: "parameterReference",
    Parameter: "parameter",

    ArrayLiteral: "arrayLiteral",
    ObjectLiteral: "objectLiteral",
    ObjectField: "objectField",
    Function: "Function",
    Unknown: "UNKNOWN",

    EntitySet: "EntitySet",
    ServiceOperation: "ServiceOperation",
    EntityField: "EntityField",
    EntityContext: "EntityContext",
    Entity: "Entity",
    Filter: "Filter",
    First: "First",
    Count: "Count",
    InlineCount: "InlineCount",
    BatchExecuteQuery: "BatchExecuteQuery",
    Single: "Single",
    Find: "Find",
    Some: "Some",
    Every: "Every",
    ToArray: "ToArray",
    BatchDelete: "BatchDelete",
    ForEach: "ForEach",
    Projection: "Projection",
    EntityMember: "EntityMember",
    EntityFieldOperation: "EntityFieldOperation",
    FrameOperation: "FrameOperation",
    EntityFunctionOperation: "EntityFunctionOperation",
    ContextFunctionOperation: "ContextFunctionOperation",
    EntityBinary: "EntityBinary",
    Code: "Code",
    ParametricQuery: "ParametricQuery",
    MemberInfo: "MemberInfo",
    QueryParameter: "QueryParameter",
    ComplexEntityField: "ComplexEntityField",

    Take: "Take",
    Skip: "Skip",
    OrderBy: "OrderBy",
    OrderByDescending: "OrderByDescending",
    Include: "Include",

    IndexedPhysicalAnd: "IndexedDBPhysicalAndFilterExpression",
    IndexedLogicalAnd: "IndexedDBLogicalAndFilterExpression",
    IndexedLogicalOr: "IndexedDBLogicalOrFilterExpression",
    IndexedLogicalIn: "IndexedDBLogicalInFilterExpression"
});

_index2.default.BinaryOperator = function () {
    ///<field name="operator" type="string" />
    ///<field name="expressionType" type="$data.ExpressionType" />
    ///<field name="type" type="string" />
};

_index2.default.binaryOperators = [{ operator: "==", expressionType: _index2.default.Expressions.ExpressionType.Equal, type: "boolean", implementation: function implementation(a, b) {
        return a == b;
    } }, { operator: "===", expressionType: _index2.default.Expressions.ExpressionType.EqualTyped, type: "boolean", implementation: function implementation(a, b) {
        return a === b;
    } }, { operator: "!=", expressionType: _index2.default.Expressions.ExpressionType.NotEqual, type: "boolean", implementation: function implementation(a, b) {
        return a != b;
    } }, { operator: "!==", expressionType: _index2.default.Expressions.ExpressionType.NotEqualTyped, type: "boolean", implementation: function implementation(a, b) {
        return a !== b;
    } }, { operator: ">", expressionType: _index2.default.Expressions.ExpressionType.GreaterThen, type: "boolean", implementation: function implementation(a, b) {
        return a > b;
    } }, { operator: ">=", expressionType: _index2.default.Expressions.ExpressionType.GreaterThenOrEqual, type: "boolean", implementation: function implementation(a, b) {
        return a >= b;
    } }, { operator: "<=", expressionType: _index2.default.Expressions.ExpressionType.LessThenOrEqual, type: "boolean", implementation: function implementation(a, b) {
        return a <= b;
    } }, { operator: "<", expressionType: _index2.default.Expressions.ExpressionType.LessThen, type: "boolean", implementation: function implementation(a, b) {
        return a < b;
    } }, { operator: "&&", expressionType: _index2.default.Expressions.ExpressionType.And, type: "boolean", implementation: function implementation(a, b) {
        return a && b;
    } }, { operator: "||", expressionType: _index2.default.Expressions.ExpressionType.Or, type: "boolean", implementation: function implementation(a, b) {
        return a || b;
    } }, { operator: "&", expressionType: _index2.default.Expressions.ExpressionType.AndBitwise, type: "number", implementation: function implementation(a, b) {
        return a & b;
    } }, { operator: "|", expressionType: _index2.default.Expressions.ExpressionType.OrBitwise, type: "number", implementation: function implementation(a, b) {
        return a | b;
    } }, { operator: "+", expressionType: _index2.default.Expressions.ExpressionType.Add, type: "number", implementation: function implementation(a, b) {
        return a + b;
    } }, { operator: "-", expressionType: _index2.default.Expressions.ExpressionType.Subtract, type: "number", implementation: function implementation(a, b) {
        return a - b;
    } }, { operator: "/", expressionType: _index2.default.Expressions.ExpressionType.Divide, type: "number", implementation: function implementation(a, b) {
        return a / b;
    } }, { operator: "%", expressionType: _index2.default.Expressions.ExpressionType.Modulo, type: "number", implementation: function implementation(a, b) {
        return a % b;
    } }, { operator: "*", expressionType: _index2.default.Expressions.ExpressionType.Multiply, type: "number", implementation: function implementation(a, b) {
        return a * b;
    } }, { operator: "[", expressionType: _index2.default.Expressions.ExpressionType.ArrayIndex, type: "number", implementation: function implementation(a, b) {
        return a[b];
    } }, { operator: "in", expressionType: _index2.default.Expressions.ExpressionType.In, type: 'boolean', implementation: function implementation(a, b) {
        return a in b;
    } }];

_index2.default.binaryOperators.resolve = function (operator) {
    var result = _index2.default.binaryOperators.filter(function (item) {
        return item.operator == operator;
    });
    if (result.length > 0) return operator;
    //Guard.raise("Unknown operator: " + operator);
};

_index2.default.binaryOperators.contains = function (operator) {
    return _index2.default.binaryOperators.some(function (item) {
        return item.operator == operator;
    });
};

_index2.default.binaryOperators.getOperator = function (operator) {
    ///<returns type="BinaryOperator" />
    var result = _index2.default.binaryOperators.filter(function (item) {
        return item.operator == operator;
    });
    if (result.length < 1) _index.Guard.raise("Unknown operator: " + operator);
    return result[0];
};

_index2.default.unaryOperators = [{ operator: "+", arity: "prefix", expressionType: _index2.default.Expressions.ExpressionType.Positive, type: "number", implementation: function implementation(operand) {
        return +operand;
    } }, { operator: "-", arity: "prefix", expressionType: _index2.default.Expressions.ExpressionType.Negative, type: "number", implementation: function implementation(operand) {
        return -operand;
    } }, { operator: "++", arity: "prefix", expressionType: _index2.default.Expressions.ExpressionType.Increment, type: "number", implementation: function implementation(operand) {
        return ++operand;
    } }, { operator: "--", arity: "prefix", expressionType: _index2.default.Expressions.ExpressionType.Decrement, type: "number", implementation: function implementation(operand) {
        return --operand;
    } }, { operator: "++", arity: "suffix", expressionType: _index2.default.Expressions.ExpressionType.Increment, type: "number", implementation: function implementation(operand) {
        return operand++;
    } }, { operator: "!", arity: "prefix", expressionType: _index2.default.Expressions.ExpressionType.Not, type: "boolean", implementation: function implementation(operand) {
        return !operand;
    } }, { operator: "--", arity: "suffix", expressionType: _index2.default.Expressions.ExpressionType.Decrement, type: "number", implementation: function implementation(operand) {
        return operand--;
    } }

//{ operator: "new", expressionType : $data.Expressions.ExpressionType.New, type: "object", implementation: function(operand) { return new operand; }
];

_index2.default.unaryOperators.resolve = function (operator) {
    var result = _index2.default.unaryOperators.filter(function (item) {
        return item.operator == operator;
    });
    if (result.length > 0) return operator;
    //Guard.raise("Unknown operator: " + operator);
};

_index2.default.unaryOperators.contains = function (operator) {
    return _index2.default.unaryOperators.some(function (item) {
        return item.operator == operator;
    });
};

_index2.default.unaryOperators.getOperator = function (operator, arity) {
    ///<returns type="BinaryOperator" />
    var result = _index2.default.unaryOperators.filter(function (item) {
        return item.operator == operator && (!arity || item.arity == arity);
    });
    if (result.length < 1) _index.Guard.raise("Unknown operator: " + operator);
    return result[0];
};

_index2.default.timeIt = function (fn, iterations) {
    iterations = iterations || 1;

    console.time("!");
    for (var i = 0; i < iterations; i++) {
        fn();
    }
    console.timeEnd("!");
};

_index2.default.Expressions.OperatorTypes = {
    UNARY: "UNARY", // { type:UNARY, executable:true, operator:, operand: }
    INCDEC: "INCDEC", // { type:INCDEC, executable:true, operator:, operand:, suffix: }
    DECISION: "DECISION", // { type:DECISION, executable:true, expression:, left:, right: }
    METHODCALL: "METHODCALL", // { type:METHODCALL, executable:true, object:, method:, args: }
    NEW: "NEW", // { type:NEW, executable:true, values: [] };
    JSONASSIGN: "JSONASSIGN", // { type:JSONASSIGN, executable:true, left:, right: }
    ARRAYACCESS: "ARRAYACCESS", // { type:ARRAYACCESS, executable:true, array:, index: }
    UNKNOWN: "UNKNOWN"
};

_index2.default.executable = true;

function jsonify(obj) {
    return JSON.stringify(obj, null, "\t");
}

(0, _index.$C)('$data.Expressions.ExpressionNode', null, null, {
    constructor: function constructor() {
        ///<summary>Provides a base class for all Expressions.</summary>
        ///<field name="nodeType" type="string">Represents the expression type of the node&#10;
        ///For the list of expression node types refer to $data.Expressions.ExpressionType
        ///</field>
        ///<field name="type" type="Function">The result type of the expression</field>
        ///<field name="executable" type="boolean">True if the expression can be evaluated to yield a result</field>
        ///this.nodeType = $data.Expressions.ExpressionType.Unknown;
        ///this.type = type;
        ///this.nodeType = $data.Expressions.ExpressionType.Unknown;
        ///this.executable = (executable === undefined || executable === null) ? true : executable;
        ///TODO
        this.expressionType = this.constructor;
    },
    toJSON: function toJSON() {
        var res = JSON.parse(JSON.stringify(this));
        res.expressionType = _index.Container.resolveName(this._expressionType);
        return res;
    },
    getJSON: function getJSON() {
        return jsonify(this);
    },

    //TOBLOG maybe
    /*expressionType: {
        value: undefined,
        ////OPTIMIZE
        set: function (value) {
            var _expressionType;
            Object.defineProperty(this, "expressionType", {
                set: function (value) {
                    if (typeof value === 'string') {
                        value = Container.resolveType(value);
                    }
                    _expressionType = value;
                },
                get: function (value) {
                    //IE ommits listing JSON.stringify in call chain
                          if (arguments.callee.caller == jsonify || arguments.callee.caller == JSON.stringify) {
                        return Container.resolveName(_expressionType);
                    }
                    return _expressionType;
                },
                enumerable: true
            });
              this.expressionType = value;
        },
        get: function () { return undefined; },
        enumerable: true
    },*/
    expressionType: {
        set: function set(value) {
            if (typeof value === 'string') {
                value = _index.Container.resolveType(value);
            }
            this._expressionType = value;
        },
        get: function get(value) {
            //IE ommits listing JSON.stringify in call chain

            // if (arguments.callee.caller == jsonify || arguments.callee.caller == JSON.stringify) {
            //     return Container.resolveName(this._expressionType);
            // }
            return this._expressionType;
        },
        enumerable: true
    },
    ///toString: function () { },
    nodeType: { value: _index2.default.Expressions.ExpressionType.Unknown, writable: false },

    type: {},

    isTerminated: { value: false },

    toString: function toString() {
        return this.value;
    }
}, null);

(0, _index.$C)('$data.Expressions.UnaryExpression', _index2.default.Expressions.ExpressionNode, null, {
    constructor: function constructor(operand, operator, nodeType, resolution) {
        /// <summary>
        /// Represents an operation with only one operand and an operator
        /// </summary>
        /// <param name="operand"></param>
        /// <param name="operator"></param>
        /// <param name="nodeType"></param>
        /// <param name="resolution"></param>
        this.operand = operand;
        this.operator = operator;
        this.nodeType = nodeType;
        this.resolution = resolution;
    },

    operator: { value: undefined, writable: true },
    operand: { value: undefined, writable: true },
    nodeType: { value: undefined, writable: true }
});

exports.default = _index2.default;
module.exports = exports['default'];

},{"../../TypeSystem/index.js":32}],81:[function(_dereq_,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _index = _dereq_('../../TypeSystem/index.js');

var _index2 = _interopRequireDefault(_index);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

(0, _index.$C)('$data.Expressions.FunctionExpression', _index2.default.Expressions.ExpressionNode, null, {
    constructor: function constructor(name, parameters, body) {
        ///<signature>
        ///<summary>Represents a function declaration.</summary>
        ///<param name="name" type="String">Function name</param>
        ///<param name="parameters" type="Array" elementType="$data.Expressions.ParameterExpression">The list of function parameters</param>
        ///<param name="body" type="$data.Expressions.ExpressionNode" />
        ///</signature>
        ///<field name="parameters" type="Array" elementType="$data.Expressions.ParameterExpression">The list of function parameters</field>
        ///<field name="body" type="$data.Expressions.ExpressionNode">The function body</field>

        this.parameters = parameters || [];
        this.name = name;
        this.body = body;
    },

    toString: function toString(debug) {
        var paramStrings = this.parameters.map(function (p) {
            return p.toString();
        });
        paramStrings = paramStrings.join(",");
        var bodyString = this.body ? this.body.toString(debug) : '';
        return "function " + this.name + "(" + paramStrings + ") { " + bodyString + "}";
    },
    nodeType: { value: _index2.default.Expressions.ExpressionType.Function, writable: true },
    parameters: { value: undefined, dataType: Array, elementType: _index2.default.Expressions.ParameterExpression },
    body: { value: undefined, dataType: _index2.default.Expressions.ExpressionNode },
    type: {}
}, null);

exports.default = _index2.default;
module.exports = exports['default'];

},{"../../TypeSystem/index.js":32}],82:[function(_dereq_,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _index = _dereq_('../../TypeSystem/index.js');

var _index2 = _interopRequireDefault(_index);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

(0, _index.$C)('$data.Expressions.ObjectFieldExpression', _index2.default.Expressions.ExpressionNode, null, {
    constructor: function constructor(fieldName, expression) {
        ///<param name="name" type="string" />
        ///<field name="name" type="string" />
        this.fieldName = fieldName;
        this.expression = expression;
    },
    nodeType: { value: _index2.default.Expressions.ExpressionType.ObjectField, writable: true },

    toString: function toString(debug) {
        //var result;
        //result = debug ? this.type + " " : "";
        //result = result + this.name;
        var result = "unimplemented";
        return result;
    }
}, null);

exports.default = _index2.default;
module.exports = exports['default'];

},{"../../TypeSystem/index.js":32}],83:[function(_dereq_,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _index = _dereq_('../../TypeSystem/index.js');

var _index2 = _interopRequireDefault(_index);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

(0, _index.$C)('$data.Expressions.ObjectLiteralExpression', _index2.default.Expressions.ExpressionNode, null, {
    constructor: function constructor(members) {
        ///<summary>Represent an object initializer literal expression &#10;Ex: { prop: value}</summary>
        ///<param name="member" type="Array" elementType="$data.Expressions.ObjectFieldExpression" />
        this.members = members;
    },
    nodeType: { value: _index2.default.Expressions.ExpressionType.ObjectLiteral, writable: true },

    toString: function toString(debug) {
        //var result;
        //result = debug ? this.type + " " : "";
        //result = result + this.name;
        var result = "unimplemented";
        return result;
    },

    implementation: {
        get: function get() {
            return function (namesAndValues) {
                var result = {};
                namesAndValues.forEach(function (item) {
                    result[item.name] = item.value;
                });
                return result;
            };
        },
        set: function set() {}
    }

}, null);

exports.default = _index2.default;
module.exports = exports['default'];

},{"../../TypeSystem/index.js":32}],84:[function(_dereq_,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _index = _dereq_('../../TypeSystem/index.js');

var _index2 = _interopRequireDefault(_index);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

(0, _index.$C)('$data.Expressions.PagingExpression', _index2.default.Expressions.ExpressionNode, null, {
    constructor: function constructor(source, expression, nType) {
        ///<param name="name" type="string" />
        ///<field name="name" type="string" />
        this.source = source;
        this.amount = expression;
        this.nodeType = nType;
    },
    nodeType: { value: _index2.default.Expressions.ExpressionType.Unknown, writable: true },

    toString: function toString(debug) {
        //var result;
        //result = debug ? this.type + " " : "";
        //result = result + this.name;
        var result = "unimplemented";
        return result;
    }
}, null);

exports.default = _index2.default;
module.exports = exports['default'];

},{"../../TypeSystem/index.js":32}],85:[function(_dereq_,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _index = _dereq_('../../TypeSystem/index.js');

var _index2 = _interopRequireDefault(_index);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

(0, _index.$C)('$data.Expressions.ParameterExpression', _index2.default.Expressions.ExpressionNode, null, {
    constructor: function constructor(name, type, nodeType) {
        ///<param name="name" type="string" />
        ///<field name="name" type="string" />
        //this.writePropertyValue("name", name);
        //this.writePropertyValue("type", type);
        this.nodeType = nodeType || _index2.default.Expressions.ExpressionType.Parameter;
        this.name = name;
        this.type = type || "unknown";
        var _owningFunction;
    },

    owningFunction: { value: undefined, enumerable: false },
    nodeType: { value: _index2.default.Expressions.ExpressionType.Parameter, writable: true },
    name: { value: undefined, dataType: String, writable: true },
    type: { value: undefined, dataType: "object", writable: true },
    toString: function toString(debug) {
        var result;
        result = debug ? this.type + " " : "";
        result = result + this.name;
        return result;
    }
}, null);

exports.default = _index2.default;
module.exports = exports['default'];

},{"../../TypeSystem/index.js":32}],86:[function(_dereq_,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _index = _dereq_('../../TypeSystem/index.js');

var _index2 = _interopRequireDefault(_index);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

(0, _index.$C)('$data.Expressions.PropertyExpression', _index2.default.Expressions.ExpressionNode, null, {
    constructor: function constructor(expression, member) {
        ///<summary>Represents accessing a property or field of an object</summary>
        ///<param name="expression" type="$data.Expressions.ExpressionNode">The expression for the property owner object</param>
        ///<param name="member" type="$data.Expressions.ConstantExpression">The member descriptor</param>
        ///<field name="expression" type="$data.Expressions.ExpressionNode">The expression for the property owner object</field>
        ///<field name="member" type="$data.Expression.ConstantExpression">The member descriptor</field>

        this.expression = expression;
        this.member = member;

        this.type = member.dataType;
    },

    nodeType: {
        value: _index2.default.Expressions.ExpressionType.MemberAccess
    },

    expression: {
        value: undefined,
        dataType: _index2.default.Expressions.ExpressionNode,
        writable: true
    },

    implementation: {
        get: function get() {
            return function (holder, memberName) {
                if (holder[memberName] === undefined) _index.Guard.raise(new _index.Exception("Parameter '" + memberName + "' not found in context", 'Property not found!'));
                return holder[memberName];
            };
        },
        set: function set() {}
    },

    member: {
        value: undefined,
        dataType: _index2.default.MemberDefinition,
        writable: true
    },

    type: {
        value: undefined,
        writable: true
    },

    toString: function toString(debug) {
        return this.expression.toString() + "." + this.member.toString();
    }

});

exports.default = _index2.default;
module.exports = exports['default'];

},{"../../TypeSystem/index.js":32}],87:[function(_dereq_,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _index = _dereq_('../../TypeSystem/index.js');

var _index2 = _interopRequireDefault(_index);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

(0, _index.$C)('$data.Expressions.SimpleBinaryExpression', _index2.default.Expressions.ExpressionNode, null, {
    constructor: function constructor(left, right, nodeType, operator, type, resolution) {
        ///<summary>Represents a bin operation with left and right operands and an operator///</summary>
        ///<param name="left" type="$data.Expression.ExpressionNode">The left element of the binary operation</param>
        ///<param name="right" type="$data.Expression.ExpressionNode">The right element of the binary operation</param>
        ///<field name="implementation" type="function" />
        this.left = left;
        this.right = right;
        this.nodeType = nodeType;
        this.operator = operator;
        this.type = type;
        this.resolution = resolution;
    },

    implementation: {
        get: function get() {
            return _index2.default.binaryOperators.getOperator(this.operator).implementation;
        },
        set: function set() {}

    },
    //nodeType: { value: $data.Expressions.ExpressionType },
    type: { value: "number", writable: true }
});

exports.default = _index2.default;
module.exports = exports['default'];

},{"../../TypeSystem/index.js":32}],88:[function(_dereq_,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _index = _dereq_('../../TypeSystem/index.js');

var _index2 = _interopRequireDefault(_index);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

(0, _index.$C)('$data.Expressions.ThisExpression', _index2.default.Expressions.ExpressionNode, null, {
    nodeType: { value: _index2.default.Expressions.ExpressionType.This }
});

exports.default = _index2.default;
module.exports = exports['default'];

},{"../../TypeSystem/index.js":32}],89:[function(_dereq_,module,exports){
'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; };

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _index = _dereq_('../../../TypeSystem/index.js');

var _index2 = _interopRequireDefault(_index);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

_index2.default.Class.define('$data.Expressions.ExecutorVisitor', _index2.default.Expressions.ExpTreeVisitor, null, {
    //--
    VisitVariable: function VisitVariable(eNode, context) {
        if (!eNode.executable) return eNode;
        var value = eNode.name == context.paramsName ? context.paramContext : _index2.default.__global[eNode.name];
        if (typeof value == 'undefined') _index.Guard.raise(new _index.Exception("Unknown variable in '" + context.operation + "' operation. The variable isn't referenced in the parameter context and it's not a global variable: '" + eNode.name + "'.", "InvalidOperation", { operationName: context.operation, missingParameterName: eNode.name }));
        return _index2.default.Expressions.ExpressionNodeTypes.LiteralExpressionNode.create(true, typeof value === 'undefined' ? 'undefined' : _typeof(value), value);
    },
    VisitMember: function VisitMember(eNode, context) {
        if (!eNode.executable) return eNode;
        var chain = this.GetMemberChain(eNode);
        var value;
        for (var i = 0; i < chain.length; i++) {
            if (i == 0) value = context.paramContext;else value = value[chain[i].name];
        }
        return _index2.default.Expressions.ExpressionNodeTypes.LiteralExpressionNode.create(true, typeof value === 'undefined' ? 'undefined' : _typeof(value), value);
    },
    VisitUnary: function VisitUnary(eNode, context) {
        var operand = this.Visit(eNode.operand, context);
        if (operand !== eNode.operand) eNode = _index2.default.Expressions.ExpressionNodeTypes.UnaryExpressionNode.create(eNode.executable, eNode.operator, operand);
        if (!eNode.executable) return eNode;
        // executing and returning with result as a literal
        var value;
        var src;
        var operandValue = operand.valueType == "string" ? "'" + operand.value + "'" : operand.value;
        src = "value = " + eNode.operator + " " + operandValue;
        eval(src);

        return _index2.default.Expressions.ExpressionNodeTypes.LiteralExpressionNode.create(true, typeof value === 'undefined' ? 'undefined' : _typeof(value), value);
    },
    VisitIncDec: function VisitIncDec(eNode, context) {
        var operand = this.Visit(eNode.operand, context);
        if (operand !== eNode.operand) eNode = _index2.default.Expressions.ExpressionNodeTypes.IncDecExpressionNode.create(eNode.executable, eNode.operator, operand, eNode.suffix);
        if (!eNode.executable) return eNode;
        // executing and returning with result as a literal
        var value;
        if (eNode.suffix) value = eNode.operator == "++" ? operand.value++ : operand.value--;else value = eNode.operator == "++" ? ++operand.value : --operand.value;
        return _index2.default.Expressions.ExpressionNodeTypes.LiteralExpressionNode.create(true, typeof value === 'undefined' ? 'undefined' : _typeof(value), value);
    },
    VisitBinary: function VisitBinary(eNode, context) {
        var left = this.Visit(eNode.left, context);
        var right = this.Visit(eNode.right, context);
        if (left !== eNode.left || right !== eNode.right) eNode = _index2.default.Expressions.ExpressionNodeTypes.BinaryExpressionNode.create(eNode.executable, eNode.operator, left, right);
        if (!eNode.executable) return eNode;
        // executing and returning with result as a literal
        var value;
        var src;
        var leftValue = left.valueType == "string" ? "'" + left.value + "'" : left.value;
        var rightValue = right.valueType == "string" ? "'" + right.value + "'" : right.value;
        src = "value = " + leftValue + " " + eNode.operator + " " + rightValue;
        eval(src);

        return _index2.default.Expressions.ExpressionNodeTypes.LiteralExpressionNode.create(true, typeof value === 'undefined' ? 'undefined' : _typeof(value), value);
    },
    VisitEquality: function VisitEquality(eNode, context) {
        var left = this.Visit(eNode.left, context);
        var right = this.Visit(eNode.right, context);
        if (left !== eNode.left || right !== eNode.right) eNode = _index2.default.Expressions.ExpressionNodeTypes.EqualityExpressionNode.create(eNode.executable, eNode.operator, left, right);
        if (!eNode.executable) return eNode;
        // executing and returning with result as a literal
        var value;
        var src;
        var leftValue = left.valueType == "string" ? "'" + left.value + "'" : left.value;
        var rightValue = right.valueType == "string" ? "'" + right.value + "'" : right.value;
        src = "value = " + leftValue + " " + eNode.operator + " " + rightValue;
        eval(src);
        return _index2.default.Expressions.ExpressionNodeTypes.LiteralExpressionNode.create(true, typeof value === 'undefined' ? 'undefined' : _typeof(value), value);
    },
    VisitDecision: function VisitDecision(eNode, context) {
        var expression = this.Visit(eNode.expression, context);
        var left = this.Visit(eNode.left, context);
        var right = this.Visit(eNode.right, context);
        if (expression !== eNode.expression || left !== eNode.left || right !== eNode.right) eNode = _index2.default.Expressions.ExpressionNodeTypes.DecisionExpressionNode.create(eNode.executable, expression, left, right);
        if (!eNode.executable) return eNode;
        // executing and returning with result as a literal
        var value = expression.value ? left.value : right.value;
        return _index2.default.Expressions.ExpressionNodeTypes.LiteralExpressionNode.create(true, typeof value === 'undefined' ? 'undefined' : _typeof(value), value);
    },
    VisitMethodCall: function VisitMethodCall(eNode, context) {
        var object = eNode.object ? this.Visit(eNode.object, context) : null;
        var args = this.VisitArray(eNode.args, context);
        if (object !== eNode.object || args != eNode.args) eNode = _index2.default.Expressions.ExpressionNodeTypes.MethodcallExpressionNode.create(eNode.executable, object, eNode.method, args);
        if (!eNode.executable) return eNode;
        // executing and returning with result as a literal
        var a = [];
        for (var i = 0; i < args.length; i++) {
            var arg = args[i];
            var t = _typeof(arg.value);
            a.push(t == "string" ? "'" + arg.value + "'" : arg.value);
        }
        var value;
        var src = object ? "value = object.value[eNode.method](" + a.join(",") + ");" : "value = " + eNode.method + "(" + a.join(",") + ");";
        eval(src);

        return _index2.default.Expressions.ExpressionNodeTypes.LiteralExpressionNode.create(true, typeof value === 'undefined' ? 'undefined' : _typeof(value), value);
    },
    VisitArrayAccess: function VisitArrayAccess(eNode, context) {
        // { type:ARRAYACCESS, executable:true, array:, index: }
        var arrayNode = this.Visit(eNode.array, context);
        var indexNode = this.Visit(eNode.index, context);
        var value = arrayNode.value[indexNode.value];
        return _index2.default.Expressions.ExpressionNodeTypes.LiteralExpressionNode.create(true, typeof value === 'undefined' ? 'undefined' : _typeof(value), value);
    }
}, null);

exports.default = _index2.default;
module.exports = exports['default'];

},{"../../../TypeSystem/index.js":32}],90:[function(_dereq_,module,exports){
'use strict';

var _index = _dereq_('../../../TypeSystem/index.js');

var _index2 = _interopRequireDefault(_index);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

_index2.default.Class.define('$data.Expressions.ExpTreeVisitor', null, null, {
    constructor: function constructor() {
        this._deep = 0;
    },
    Visit: function Visit(eNode, context) {
        ///<summary></summary>
        ///<param name="eNode" type="$data.Expressions.ExpressionNodeTypes.ExpressionNode"/>
        ///<param name="context" type="Object"/>
        //<return type="$data.Expressions.ExpressionNodeTypes.ExpressionNode"/>
        this._deep = this._deep + 1;
        var result = null;
        switch (eNode.type) {
            case LITERAL:
                result = this.VisitLiteral(eNode, context);break;
            case VARIABLE:
                result = this.VisitVariable(eNode, context);break;
            case MEMBERACCESS:
                result = this.VisitMember(eNode, context);break;
            case BINARY:
                result = this.VisitBinary(eNode, context);break;
            case UNARY:
                result = this.VisitUnary(eNode, context);break;
            case INCDEC:
                result = this.VisitIncDec(eNode, context);break;
            case EQUALITY:
                result = this.VisitEquality(eNode, context);break;
            case DECISION:
                result = this.VisitDecision(eNode, context);break;
            case METHODCALL:
                result = this.VisitMethodCall(eNode, context);break;
            case NEW:
                result = this.VisitNew(eNode, context);break;
            case JSONASSIGN:
                result = this.VisitJsonAssign(eNode, context);break;
            case ARRAYACCESS:
                result = this.VisitArrayAccess(eNode, context);break;
            default:
                _index.Guard.raise("Type isn't implemented: " + eNode.type);
        }
        this._deep = this._deep - 1;
        return result;
    },
    VisitLiteral: function VisitLiteral(eNode, context) {
        ///<summary></summary>
        ///<param name="eNode" type="$data.Expressions.ExpressionNodeTypes.LiteralExpressionNode"/>
        ///<param name="context" type="Object"/>
        //<return type="$data.Expressions.ExpressionNodeTypes.LiteralExpressionNode"/>

        return eNode;
    },
    VisitVariable: function VisitVariable(eNode, context) {
        ///<summary></summary>
        ///<param name="eNode" type="$data.Expressions.ExpressionNodeTypes.VariableExpressionNode"/>
        ///<param name="context" type="Object"/>
        //<return type="$data.Expressions.ExpressionNodeTypes.VariableExpressionNode"/>

        return eNode;
    },
    VisitMember: function VisitMember(eNode, context) {
        ///<summary></summary>
        ///<param name="eNode" type="$data.Expressions.ExpressionNodeTypes.MemberAccessExpressionNode"/>
        ///<param name="context" type="Object"/>
        //<return type="$data.Expressions.ExpressionNodeTypes.MemberAccessExpressionNode"/>

        var expression = this.Visit(eNode.expression, context);
        var member = this.Visit(eNode.member, context);
        if (expression === eNode.expression && member === eNode.member) return eNode;
        return _index2.default.Expressions.ExpressionNodeTypes.MemberAccessExpressionNode.create(eNode.executable, expression, member);
    },
    VisitBinary: function VisitBinary(eNode, context) {
        ///<summary></summary>
        ///<param name="eNode" type="$data.Expressions.ExpressionNodeTypes.BinaryExpressionNode"/>
        ///<param name="context" type="Object"/>
        //<return type="$data.Expressions.ExpressionNodeTypes.BinaryExpressionNode"/>

        var left = this.Visit(eNode.left, context);
        var right = this.Visit(eNode.right, context);
        if (left === eNode.left && right === eNode.right) return eNode;
        return _index2.default.Expressions.ExpressionNodeTypes.BinaryExpressionNode.create(eNode.executable, eNode.operator, left, right);
    },
    VisitUnary: function VisitUnary(eNode, context) {
        ///<summary></summary>
        ///<param name="eNode" type="$data.Expressions.ExpressionNodeTypes.UnaryExpressionNode"/>
        ///<param name="context" type="Object"/>
        //<return type="$data.Expressions.ExpressionNodeTypes.UnaryExpressionNode"/>

        var operand = this.Visit(eNode.operand, context);
        if (operand === eNode.operand) return eNode;
        return _index2.default.Expressions.ExpressionNodeTypes.UnaryExpressionNode.create(eNode.executable, eNode.operator, operand);
    },
    VisitIncDec: function VisitIncDec(eNode, context) {
        ///<summary></summary>
        ///<param name="eNode" type="$data.Expressions.ExpressionNodeTypes.IncDecExpressionNode"/>
        ///<param name="context" type="Object"/>
        //<return type="$data.Expressions.ExpressionNodeTypes.IncDecExpressionNode"/>

        var operand = this.Visit(eNode.operand, context);
        if (operand === eNode.operand) return eNode;
        return _index2.default.Expressions.ExpressionNodeTypes.IncDecExpressionNode.create(eNode.executable, eNode.operator, operand, eNode.suffix);
    },
    VisitEquality: function VisitEquality(eNode, context) {
        ///<summary></summary>
        ///<param name="eNode" type="$data.Expressions.ExpressionNodeTypes.EqualityExpressionNode"/>
        ///<param name="context" type="Object"/>
        //<return type="$data.Expressions.ExpressionNodeTypes.EqualityExpressionNode"/>

        var left = this.Visit(eNode.left, context);
        var right = this.Visit(eNode.right, context);
        if (left === eNode.left && right === eNode.right) return eNode;
        return _index2.default.Expressions.ExpressionNodeTypes.EqualityExpressionNode.create(eNode.executable, eNode.operator, left, right);
    },
    VisitDecision: function VisitDecision(eNode, context) {
        ///<summary></summary>
        ///<param name="eNode" type="$data.Expressions.ExpressionNodeTypes.DecisionExpressionNode"/>
        ///<param name="context" type="Object"/>
        //<return type="$data.Expressions.ExpressionNodeTypes.DecisionExpressionNode"/>

        var expression = this.Visit(eNode.expression, context);
        var left = this.Visit(eNode.left, context);
        var right = this.Visit(eNode.right, context);
        if (expression === eNode.expression && left === eNode.left && right === eNode.right) return eNode;
        return _index2.default.Expressions.ExpressionNodeTypes.DecisionExpressionNode.create(eNode.executable, expression, left, right);
    },
    VisitMethodCall: function VisitMethodCall(eNode, context) {
        ///<summary></summary>
        ///<param name="eNode" type="$data.Expressions.ExpressionNodeTypes.MethodcallExpressionNode"/>
        ///<param name="context" type="Object"/>
        //<return type="$data.Expressions.ExpressionNodeTypes.MethodcallExpressionNode"/>

        var object = eNode.object ? this.Visit(eNode.object, context) : null;
        var args = this.VisitArray(eNode.args, context);
        if (object === eNode.object && args === eNode.args) return eNode;
        return _index2.default.Expressions.ExpressionNodeTypes.MethodcallExpressionNode.create(eNode.executable, object, eNode.method, args);
    },
    VisitNew: function VisitNew(eNode, context) {
        ///<summary></summary>
        ///<param name="eNode" type="$data.Expressions.ExpressionNodeTypes.NewExpressionNode"/>
        ///<param name="context" type="Object"/>
        //<return type="$data.Expressions.ExpressionNodeTypes.NewExpressionNode"/>

        var values = this.VisitArray(eNode.values, context);
        if (values === eNode.values) return eNode;
        return _index2.default.Expressions.ExpressionNodeTypes.NewExpressionNode.create(true, values);
    },
    VisitJsonAssign: function VisitJsonAssign(eNode, context) {
        ///<summary></summary>
        ///<param name="eNode" type="$data.Expressions.ExpressionNodeTypes.JsonAssignExpressionNode"/>
        ///<param name="context" type="Object"/>
        //<return type="$data.Expressions.ExpressionNodeTypes.JsonAssignExpressionNode"/>

        var left = this.Visit(eNode.left, context);
        var right = this.Visit(eNode.right, context);
        if (left === eNode.left && right === eNode.right) return eNode;
        left.JSONASSIGN = true;
        right.JSONASSIGN = true;
        return _index2.default.Expressions.ExpressionNodeTypes.JsonAssignExpressionNode.create(true, left, right);
    },
    VisitArrayAccess: function VisitArrayAccess(eNode, context) {
        ///<summary></summary>
        ///<param name="eNode" type="$data.Expressions.ExpressionNodeTypes.ArrayAccessExpressionNode"/>
        ///<param name="context" type="Object"/>
        //<return type="$data.Expressions.ExpressionNodeTypes.ArrayAccessExpressionNode"/>

        var array = this.Visit(eNode.array, context);
        var index = this.Visit(eNode.index, context);
        if (array === eNode.array && index === eNode.index) return eNode;
        return _index2.default.Expressions.ExpressionNodeTypes.ArrayAccessExpressionNode.create(true, array, index);
    },
    VisitArray: function VisitArray(eNodes, context) {
        var args = [];
        var ok = true;
        for (var i = 0; i < eNodes.length; i++) {
            args[i] = this.Visit(eNodes[i], context);
            ok = ok && args[i] === eNodes[i];
        }
        return ok ? eNodes : args;
    },
    GetMemberChain: function GetMemberChain(memberAccess, context) {
        // { type:MEMBERACCESS, executable:true, expression:, member: }
        if (memberAccess.expression.type == MEMBERACCESS) {
            var a = this.GetMemberChain(memberAccess.expression, context);
            a.push(memberAccess.member);
            return a;
        }
        return [memberAccess.expression, memberAccess.member];
    }
}, {});

},{"../../../TypeSystem/index.js":32}],91:[function(_dereq_,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _index = _dereq_('../../../TypeSystem/index.js');

var _index2 = _interopRequireDefault(_index);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

(0, _index.$C)('$data.Expressions.ExpressionVisitor', null, null, {
    constructor: function constructor() {
        this._deep = 0;
    },

    Visit: function Visit(eNode, context) {
        ///<summary></summary>
        ///<param name="eNode" type="$data.Expressions.ExpressionNode"/>
        ///<param name="context" type="Object"/>
        //<return type="$data.Expressions.ExpressionNode"/>

        //this._deep = this._deep + 1;
        if (!eNode) {
            return eNode;
        }

        var result = null;

        switch (eNode.expressionType) {
            case _index2.default.Expressions.ParameterExpression:
                result = this.VisitParameter(eNode, context);
                break;
            case _index2.default.Expressions.ConstantExpression:
                result = this.VisitConstant(eNode, context);
                break;
            case _index2.default.Expressions.FunctionExpression:
                result = this.VisitFunction(eNode, context);
                break;
            case _index2.default.Expressions.CallExpression:
                result = this.VisitCall(eNode, context);
                break;
            case _index2.default.Expressions.SimpleBinaryExpression:
                result = this.VisitBinary(eNode, context);
                break;
            case _index2.default.Expressions.PropertyExpression:
                result = this.VisitProperty(eNode, context);
                break;
            //result = th
            case _index2.default.Expressions.ThisExpression:
                if (_index2.default.defaults.parameterResolutionCompatibility) {
                    result = this.VisitThis(eNode, context);
                } else {
                    _index.Guard.raise("Keyword 'this' is not allowed. You should get value from parameter. (it, p1) => it.Title == p1");
                }
                break;
            case _index2.default.Expressions.ObjectLiteralExpression:
                result = this.VisitObjectLiteral(eNode, context);
                break;
            case _index2.default.Expressions.ObjectFieldExpression:
                result = this.VisitObjectField(eNode, context);
                break;
            case _index2.default.Expressions.ArrayLiteralExpression:
                result = this.VisitArrayLiteral(eNode, context);
                break;
            case _index2.default.Expressions.UnaryExpression:
                result = this.VisitUnary(eNode, context);
                break;
            case _index2.default.Expressions.EntityContextExpression:
                result = this.VisitEntityContext(eNode, context);
                break;
            default:
                debugger;
                break;
            //case VARIABLE:

            //    result = this.VisitVariable(eNode, context);
            //    break;
            //case MEMBERACCESS:
            //    result = this.VisitMember(eNode, context);
            //    break;
            //case BINARY:
            //    result = this.VisitBinary(eNode, context);
            //    break;
            //case UNARY:
            //    result = this.VisitUnary(eNode, context);
            //    break;
            //case INCDEC:
            //    result = this.VisitIncDec(eNode, context);
            //    break;
            //case EQUALITY: result = this.VisitEquality(eNode, context); break;
            //case DECISION: result = this.VisitDecision(eNode, context); break;
            //case METHODCALL: result = this.VisitMethodCall(eNode, context); break;
            //case NEW: result = this.VisitNew(eNode, context); break;
            //case JSONASSIGN: result = this.VisitJsonAssign(eNode, context); break;
            //case ARRAYACCESS: result = this.VisitArrayAccess(eNode, context); break;
            //default:
            //    Guard.raise("Type isn't implemented: " + eNode.type);
        }

        this._deep = this._deep - 1;
        return result;
    },

    VisitArrayLiteral: function VisitArrayLiteral(eNode, context) {
        ///<param name="eNode" type="$data.Expressions.ArrayLiteralExpression" />
        var self = this;
        var items = eNode.items.map(function (item) {
            return self.Visit(item, context);
        });
        var result = _index.Container.createArrayLiteralExpression(items);
        return result;
    },

    VisitObjectLiteral: function VisitObjectLiteral(eNode, context) {
        ///<param name="eNode" type="$data.Expressions.ObjectLiteralExpression" />
        var self = this;
        var members = eNode.members.map(function (member) {
            return self.Visit(member, context);
        });
        var result = _index.Container.createObjectLiteralExpression(members);
        return result;
    },

    VisitObjectField: function VisitObjectField(eNode, context) {
        ///<param name="eNode" type="$data.Expressions.ObjectLiteralExpression" />
        var expression = this.Visit(eNode.expression, context);
        var result = _index.Container.createObjectFieldExpression(eNode.fieldName, expression);
        return result;
    },

    VisitThis: function VisitThis(eNode, context) {
        return eNode;
    },
    VisitCall: function VisitCall(eNode, context) {
        ///<param name="eNode" type="$data.Expressions.CallExpression" />
        var self = this;
        var args = eNode.args.map(function (arg) {
            return this.Visit(arg, context);
        }, this);
        var expression = this.Visit(eNode.expression, context);
        var member = this.Visit(eNode.member, context);
        return new _index2.default.Expressions.CallExpression(expression, member, args);
    },

    VisitParameter: function VisitParameter(eNode, context) {
        ///<param name="eNode" type="$data.Expressions.ParameterExpression" />
        ///<returns type="$data.Expressions.ParameterExpression" />
        //var result  = new $data.Expressions.ParameterExpression(eNode.name, eNode.type, eNode.nodeType);
        return eNode;
    },

    VisitConstant: function VisitConstant(eNode, context) {
        ///<param name="eNode" type="$data.Expressions.ParameterExpression" />
        ///<returns type="$data.Expressions.ParameterExpression" />
        //var result  = new $data.Expressions.ParameterExpression(eNode.name, eNode.type, eNode.nodeType);
        return eNode;
    },

    VisitFunction: function VisitFunction(eNode, context) {
        ///<param name="eNode" type="$data.Expressions.FunctionExpression" />
        var self = this;

        var params = eNode.parameters.map(function (p, i) {
            return self.Visit(p, context);
        });

        var body = self.Visit(eNode.body, context);
        var result = new _index2.default.Expressions.FunctionExpression(eNode.name, params, body);
        return result;
    },

    VisitBinary: function VisitBinary(eNode, context) {
        ///<summary></summary>
        ///<param name="eNode" type="$data.Expressions.SimpleBinaryExpression"/>
        ///<param name="context" type="Object"/>
        //<return type="$data.Expressions.ExpressionNodeTypes.BinaryExpressionNode"/>

        var left = this.Visit(eNode.left, context);
        var right = this.Visit(eNode.right, context);
        return new _index2.default.Expressions.SimpleBinaryExpression(left, right, eNode.nodeType, eNode.operator, eNode.type);
    },

    VisitProperty: function VisitProperty(eNode, context) {
        ///<param name="eNode" type="$data.Expressions.PropertyExpression" />
        var expression = this.Visit(eNode.expression, context);
        var member = this.Visit(eNode.member, context);
        return new _index2.default.Expressions.PropertyExpression(expression, member);
        //var member =
    },

    VisitUnary: function VisitUnary(eNode, context) {
        ///<summary></summary>
        ///<param name="eNode" type="$data.Expressions.UnaryExpression"/>
        ///<param name="context" type="Object"/>
        ///<returns type="$data.Expressions.UnaryExpression"/>
        var operand = this.Visit(eNode.operand, context);
        if (operand === eNode.operand) return eNode;
        return new _index2.default.Expressions.UnaryExpression(operand, eNode.operator, eNode.nodeType);
    },

    VisitEntityContext: function VisitEntityContext(eNode, context) {
        ///<param name="eNode" type="$data.Expressions.ParameterExpression" />
        ///<returns type="$data.Expressions.EntityContextExpression" />
        //var result  = new $data.Expressions.ParameterExpression(eNode.name, eNode.type, eNode.nodeType);
        return eNode;
    },

    VisitDecision: function VisitDecision(eNode, context) {
        ///<summary></summary>
        ///<param name="eNode" type="$data.Expressions.ExpressionNodeTypes.DecisionExpressionNode"/>
        ///<param name="context" type="Object"/>
        //<return type="$data.Expressions.ExpressionNodeTypes.DecisionExpressionNode"/>

        var expression = this.Visit(eNode.expression, context);
        var left = this.Visit(eNode.left, context);
        var right = this.Visit(eNode.right, context);
        if (expression === eNode.expression && left === eNode.left && right === eNode.right) return eNode;
        return _index2.default.Expressions.ExpressionNodeTypes.DecisionExpressionNode.create(eNode.executable, expression, left, right);
    },

    VisitNew: function VisitNew(eNode, context) {
        ///<summary></summary>
        ///<param name="eNode" type="$data.Expressions.ExpressionNodeTypes.NewExpressionNode"/>
        ///<param name="context" type="Object"/>
        //<return type="$data.Expressions.ExpressionNodeTypes.NewExpressionNode"/>

        var values = this.VisitArray(eNode.values, context);
        if (values === eNode.values) return eNode;
        return _index2.default.Expressions.ExpressionNodeTypes.NewExpressionNode.create(true, values);
    },
    VisitArrayAccess: function VisitArrayAccess(eNode, context) {
        ///<summary></summary>
        ///<param name="eNode" type="$data.Expressions.ExpressionNodeTypes.ArrayAccessExpressionNode"/>
        ///<param name="context" type="Object"/>
        //<return type="$data.Expressions.ExpressionNodeTypes.ArrayAccessExpressionNode"/>

        var array = this.Visit(eNode.array, context);
        var index = this.Visit(eNode.index, context);
        if (array === eNode.array && index === eNode.index) return eNode;
        return _index2.default.Expressions.ExpressionNodeTypes.ArrayAccessExpressionNode.create(true, array, index);
    },
    VisitArray: function VisitArray(eNodes, context) {
        var args = [];
        var ok = true;
        for (var i = 0; i < eNodes.length; i++) {
            args[i] = this.Visit(eNodes[i], context);
            ok = ok && args[i] === eNodes[i];
        }
        return ok ? eNodes : args;
    },
    GetMemberChain: function GetMemberChain(memberAccess, context) {
        // { type:MEMBERACCESS, executable:true, expression:, member: }
        if (memberAccess.expression.type == MEMBERACCESS) {
            var a = this.GetMemberChain(memberAccess.expression, context);
            a.push(memberAccess.member);
            return a;
        }
        return [memberAccess.expression, memberAccess.member];
    }
}, {});

exports.default = _index2.default;
module.exports = exports['default'];

},{"../../../TypeSystem/index.js":32}],92:[function(_dereq_,module,exports){
'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; };

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _index = _dereq_('../../../TypeSystem/index.js');

var _index2 = _interopRequireDefault(_index);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

(0, _index.$C)("$data.Expressions.GlobalContextProcessor", _index2.default.Expressions.ParameterProcessor, null, {
    constructor: function constructor(global) {
        ///<param name="global" type="object" />
        this.global = global;
    },

    canResolve: function canResolve(paramExpression) {
        ///<param name="paramExpression" type="$data.Expressions.ParameterExpression" />
        return (paramExpression.nodeType == _index2.default.Expressions.ExpressionType.Parameter || _index2.default.defaults.parameterResolutionCompatibility && paramExpression.nodeType == _index2.default.Expressions.ExpressionType.ParameterReference) && this.global && _typeof(this.global) === 'object' && paramExpression.name in this.global;
    },

    resolve: function resolve(paramExpression) {
        ///<param name="paramExpression" type="$data.Expressions.ParameterExpression" />
        ///<returns type="$data.Expressions.ExpressionNode" />
        var resultValue = this.global[paramExpression.name];
        var expression = _index.Container.createConstantExpression(resultValue, typeof resultValue === 'undefined' ? 'undefined' : _typeof(resultValue), paramExpression.name);
        return expression;
    }

});

(0, _index.$C)("$data.Expressions.ConstantValueResolver", _index2.default.Expressions.ParameterProcessor, null, {
    constructor: function constructor(paramsObject, global, scopeContext) {
        ///<param name="global" type="object" />
        this.globalResolver = _index.Container.createGlobalContextProcessor(global);
        this.paramResolver = _index.Container.createGlobalContextProcessor(paramsObject);
        this.paramsObject = paramsObject;
        this.scopeContext = scopeContext;
    },

    canResolve: function canResolve(paramExpression) {
        ///<param name="paramExpression" type="$data.Expressions.ParameterExpression" />
        if (_index2.default.defaults.parameterResolutionCompatibility) {
            return paramExpression.name === '$context' || paramExpression.nodeType == _index2.default.Expressions.ExpressionType.This && this.paramsObject ? true : this.paramResolver.canResolve(paramExpression) || this.globalResolver.canResolve(paramExpression);
        }
        return paramExpression.name === '$context' ? true : this.paramResolver.canResolve(paramExpression);
    },

    resolve: function resolve(paramExpression) {
        ///<param name="paramExpression" type="$data.Expressions.ParameterExpression" />
        ///<returns type="$data.Expressions.ExpressionNode" />
        if (paramExpression.name === '$context') {
            return _index.Container.createEntityContextExpression(this.scopeContext);
        }
        if (_index2.default.defaults.parameterResolutionCompatibility) {
            if (paramExpression.nodeType == _index2.default.Expressions.ExpressionType.This) {
                return _index.Container.createConstantExpression(this.paramsObject, _typeof(this.paramsObject), 'this');
            }
            return this.paramResolver.canResolve(paramExpression) ? this.paramResolver.resolve(paramExpression) : this.globalResolver.resolve(paramExpression);
        }
        return this.paramResolver.resolve(paramExpression);
    }

});

exports.default = _index2.default;
module.exports = exports['default'];

},{"../../../TypeSystem/index.js":32}],93:[function(_dereq_,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _index = _dereq_("../../../TypeSystem/index.js");

var _index2 = _interopRequireDefault(_index);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

(0, _index.$C)("$data.Expressions.LambdaParameterProcessor", _index2.default.Expressions.ParameterProcessor, null, {
    constructor: function constructor(lambdaParameterTypeInfos) {
        ///<param name="global" />
        ///<param name="evalMethod" />
        var paramIndices = {};
        var $idx = "name";

        this.canResolve = function (paramExpression, context) {
            if (paramExpression.nodeType == _index2.default.Expressions.ExpressionType.LambdaParameter) {
                var fnParams = paramExpression.owningFunction.parameters;

                if (fnParams.length == 1 && paramExpression.name == fnParams[0].name) {
                    paramIndices[paramExpression.name] = lambdaParameterTypeInfos[0];
                    return true;
                }

                for (var j = 0; j < fnParams.length; j++) {
                    if (fnParams[j].name == paramExpression.name) {
                        paramIndices[paramExpression.name] = lambdaParameterTypeInfos[j];
                        return true;
                    }
                }
                return false;
            }
            return false;
        };

        this.resolve = function (paramExpression, context) {
            var lambdaParamType = paramIndices[paramExpression.name];
            var result = _index.Container.createParameterExpression(paramExpression.name, lambdaParamType, _index2.default.Expressions.ExpressionType.LambdaParameter);
            result.owningFunction = paramExpression.owningFunction;
            return result;
        };
    }

});

exports.default = _index2.default;
module.exports = exports['default'];

},{"../../../TypeSystem/index.js":32}],94:[function(_dereq_,module,exports){
"use strict";

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; };

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _index = _dereq_("../../../TypeSystem/index.js");

var _index2 = _interopRequireDefault(_index);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

(0, _index.$C)("$data.Expressions.LocalContextProcessor", _index2.default.Expressions.GlobalContextProcessor, null, {
    constructor: function constructor(evalMethod) {
        ///<param name="global" type="object" />
        this.canResolve = function (paramExpression) {
            ///<param name="paramExpression" type="$data.Expressions.ParameterExpression" />
            return paramExpression.nodeType == _index2.default.Expressions.ExpressionType.Parameter && evalMethod("typeof " + paramExpression.name) !== 'undefined';
        };
        this.resolve = function (paramExpression) {
            ///<param name="paramExpression" type="$data.Expressions.ParameterExpression" />
            ///<returns type="$data.Expressions.ExpressionNode" />
            var resultValue = evalMethod(paramExpression.name);
            var expression = _index.Container.createConstantExpression(resultValue, typeof resultValue === "undefined" ? "undefined" : _typeof(resultValue));
            return expression;
        };
    }
});

exports.default = _index2.default;
module.exports = exports['default'];

},{"../../../TypeSystem/index.js":32}],95:[function(_dereq_,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _index = _dereq_('../../../TypeSystem/index.js');

var _index2 = _interopRequireDefault(_index);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

//"use strict"; // suspicious code

(0, _index.$C)('$data.Expressions.LogicalSchemaBinderVisitor', _index2.default.Expressions.ExpressionVisitor, null, {
    constructor: function constructor(expression, binder) {},

    VisitProperty: function VisitProperty(expression, context) {
        ///<param name="expression" type="$data.Expressions.ExpressionNode" />
        var exp = this.Visit(expression.expression, context);
        var mem = this.Visit(expression.member, context);

        var type = exp.type;
        var memberType = context.memberResolver.resolve(type, mem.value);
        mem.type = memberType;
        return _index.Container.createPropertyExpression(exp, mem);
    }

}, {});

exports.default = _index2.default;
module.exports = exports['default'];

},{"../../../TypeSystem/index.js":32}],96:[function(_dereq_,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _index = _dereq_("../../../TypeSystem/index.js");

var _index2 = _interopRequireDefault(_index);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

(0, _index.$C)("$data.Expressions.ParameterProcessor", _index2.default.Expressions.ExpressionVisitor, null, {
    constructor: function constructor() {
        ///<summary>Provides a base class for several ParameterProcessors like GlobalParameterProcessor or LambdaParameterProcessor</summary>
    },

    Visit: function Visit(node, context) {
        if ((node instanceof _index2.default.Expressions.ParameterExpression || node instanceof _index2.default.Expressions.ThisExpression) && this.canResolve(node)) {
            var result = this.resolve(node, context);
            if (result !== node) result["resolvedBy"] = this.constructor.name;
            return result;
        } else {
            return node;
        }
    },

    canResolve: function canResolve(paramExpression) {
        ///<returns type="boolean" />
        _index.Guard.raise("Pure method");
    },
    resolve: function resolve(paramExpression) {
        ///<returns type="XXX" />
        _index.Guard.raise("Pure method");
    }
});

exports.default = _index2.default;
module.exports = exports['default'];

},{"../../../TypeSystem/index.js":32}],97:[function(_dereq_,module,exports){
'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; };

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _index = _dereq_('../../../TypeSystem/index.js');

var _index2 = _interopRequireDefault(_index);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

(0, _index.$C)('$data.Expressions.ParameterResolverVisitor', _index2.default.Expressions.ExpressionVisitor, null, {

    constructor: function constructor(expression, resolver) {
        /// <summary>
        /// ParameterResolverVisitor traverses the JavaScript Code Expression tree and converts
        /// outer but otherwise execution local variable references into ConstantExpressions-t.
        /// for example: context.Persons.filter(function(p) { return p.Name == document.location.href })
        /// is transformed into a constant that has the current href as its value
        /// </summary>
        /// <param name="expression"></param>
        /// <param name="resolver"></param>
        this.lambdaParamCache = {};
        this.paramCache = {};
    },

    Visit: function Visit(expression, resolver) {
        ///<param name="expression" type="$data.Expressions.ExpressionNode" />
        ///<param name="resolver" type="$data.Expressions.Resolver" />
        //TODO base call is just ugly
        return _index2.default.Expressions.ExpressionVisitor.prototype.Visit.call(this, expression, resolver);
    },

    VisitArrayLiteral: function VisitArrayLiteral(eNode, context) {
        var self = this;
        var items = eNode.items.map(function (item) {
            return self.Visit(item, context);
        });
        var allLocal = items.every(function (item) {
            return item instanceof _index2.default.Expressions.ConstantExpression;
        });

        if (allLocal) {
            items = items.map(function (item) {
                return item.value;
            });
            return _index.Container.createConstantExpression(items, "array");
        } else {
            return _index.Container.createArrayLiteralExpression(items);
        }
    },

    VisitObjectLiteral: function VisitObjectLiteral(eNode, context) {
        var self = this;
        var members = eNode.members.map(function (item) {
            return self.Visit(item, context);
        });
        var allLocal = members.every(function (member) {
            return member.expression instanceof _index2.default.Expressions.ConstantExpression;
        });

        if (allLocal) {
            var params = members.map(function (member) {
                return { name: member.fieldName, value: member.expression.value };
            });
            var value = eNode.implementation(params);
            return _index.Container.createConstantExpression(value, typeof value === 'undefined' ? 'undefined' : _typeof(value));
        } else {
            return _index.Container.createObjectLiteralExpression(members);
        }
    },

    VisitThis: function VisitThis(eNode, resolver) {
        return resolver.Visit(eNode, resolver);
    },

    VisitParameter: function VisitParameter(eNode, resolver) {
        ///<param name="eNode" type="$data.Expressions.ParameterExpression" />
        ///<param name="resovler" type="$data.Expressions.ParameterResolver" />
        ///<returns type="$data.Expressions.ParameterExpression" />

        var node;
        ///TODO let the resolver handle lambdaReferences if it wants to deal with it
        switch (eNode.nodeType) {
            case _index2.default.Expressions.ExpressionType.Parameter:
                node = resolver.Visit(eNode, resolver);
                this.paramCache[node.name] = node;
                return node;
            case _index2.default.Expressions.ExpressionType.ParameterReference:
                if (_index2.default.defaults.parameterResolutionCompatibility) {
                    return resolver.Visit(eNode, resolver);
                }

                var paramNode = this.paramCache[eNode.name];
                if (paramNode) {
                    return paramNode;
                } else {
                    _index.Guard.raise("Missing parameter '" + eNode.name + "'");
                }
                break;
            case _index2.default.Expressions.ExpressionType.LambdaParameter:
                node = resolver.Visit(eNode, resolver);
                this.lambdaParamCache[node.name] = node;
                return node;
            case _index2.default.Expressions.ExpressionType.LambdaParameterReference:
                var lambdaParam = this.lambdaParamCache[eNode.name];
                if (lambdaParam) {
                    node = _index.Container.createParameterExpression(eNode.name, lambdaParam.type, _index2.default.Expressions.ExpressionType.LambdaParameterReference);
                    node.paramIndex = eNode.paramIndex;
                    //node.typeName = lambdaParam.type.name || lambdaParam.type;
                    return node;
                }
                break;
            default:
                return eNode;

        }

        return eNode;
    },

    VisitConstant: function VisitConstant(eNode, context) {
        ///<param name="eNode" type="$data.Expressions.ParameterExpression" />
        ///<returns type="$data.Expressions.ParameterExpression" />
        return eNode;
    },

    VisitFunction: function VisitFunction(eNode, context) {
        ///<param name="eNode" type="$data.Expressions.FunctionExpression" />

        var self = this;
        var params = eNode.parameters.map(function (p, i) {
            var result = self.Visit(p, context);
            return result;
        });
        var body = self.Visit(eNode.body, context);
        var result = new _index2.default.Expressions.FunctionExpression(eNode.name, params, body);

        return result;
    },

    VisitBinary: function VisitBinary(eNode, context) {
        ///<summary></summary>
        ///<param name="eNode" type="$data.Expressions.ExpressionNodeTypes.BinaryExpressionNode"/>
        ///<param name="context" type="Object"/>
        ///<return type="$data.Expressions.ExpressionNodeTypes.BinaryExpressionNode"/>

        var left = this.Visit(eNode.left, context);
        var right = this.Visit(eNode.right, context);
        var expr = _index2.default.Expressions;

        if (left instanceof expr.ConstantExpression && right instanceof expr.ConstantExpression) {
            var result = eNode.implementation(left.value, right.value);
            return _index.Container.createConstantExpression(result, typeof result === 'undefined' ? 'undefined' : _typeof(result));
        }
        return new _index.Container.createSimpleBinaryExpression(left, right, eNode.nodeType, eNode.operator, eNode.type);
    },

    VisitUnary: function VisitUnary(eNode, context) {
        ///<summary></summary>
        ///<param name="eNode" type="$data.Expressions.ExpressionNodeTypes.BinaryExpressionNode"/>
        ///<param name="context" type="Object"/>
        ///<return type="$data.Expressions.ExpressionNodeTypes.BinaryExpressionNode"/>

        var operand = this.Visit(eNode.operand, context);
        //var imp = $data.unaryOperators.getOperator(
        var expr = _index2.default.Expressions;
        if (operand instanceof expr.ConstantExpression) {
            var result = eNode.operator.implementation(operand.value);
            return _index.Container.createConstantExpression(result, typeof result === 'undefined' ? 'undefined' : _typeof(result));
        }
        return new _index.Container.createUnaryExpression(operand, eNode.operator, eNode.nodeType);
    },

    VisitProperty: function VisitProperty(eNode, context) {
        ///<param name="eNode" type="$data.Expressions.PropertyExpression" />
        var expression = this.Visit(eNode.expression, context);
        var member = this.Visit(eNode.member, context);
        var result;
        if (expression instanceof _index2.default.Expressions.ConstantExpression && member instanceof _index2.default.Expressions.ConstantExpression) {
            ///TODO implement checking for the member, throw on error
            result = eNode.implementation(expression.value, member.value);

            //Method call processed before
            //if (typeof result === 'function') {
            //    return new $data.Expressions.ConstantExpression(
            //        function () { return result.apply(expression.value, arguments); });
            //}
            return _index.Container.createConstantExpression(result, typeof result === 'undefined' ? 'undefined' : _typeof(result), expression.name + '$' + member.value);
        }
        if (expression === eNode.expression && member === eNode.member) return eNode;

        result = _index.Container.createPropertyExpression(expression, member);
        return result;
    },

    VisitCall: function VisitCall(eNode, context) {
        ///<param name="eNode" type="$data.Expressions.CallExpression" />
        function isExecutable(args, body, obj) {
            return body instanceof _index2.default.Expressions.ConstantExpression && (
            //global methods will not have a this.
            !obj || obj instanceof _index2.default.Expressions.ConstantExpression) && args.every(function (item) {
                return item instanceof _index2.default.Expressions.ConstantExpression;
            });
        }
        var call = _index2.default.Expressions.ExpressionVisitor.prototype.VisitCall.apply(this, arguments);
        var obj = call.expression;
        var body = call.member;
        var args = call.args;

        function convertToValue(arg) {
            if (arg instanceof _index2.default.Expressions.ConstantExpression) return arg.value;
            return arg;
        };

        if (isExecutable(args, body, obj)) {
            var fn = body.value;
            if (typeof fn === 'string' && obj.value) {
                fn = obj.value[fn];
            }
            if (typeof fn !== 'function') {
                //TODO dig that name out from somewhere
                _index.Guard.raise("Constant expression is not a method...");
            }
            var value = eNode.implementation(obj.value, fn, args.map(convertToValue));
            return new _index2.default.Expressions.ConstantExpression(value, typeof value === 'undefined' ? 'undefined' : _typeof(value));
        }
        return call;
    }
}, {});
(0, _index.$C)("$data.Expressions.AggregatedVisitor", _index2.default.Expressions.ExpressionVisitor, null, {
    constructor: function constructor(visitors) {
        ///<param name="resolver" type="Array" elementType="$data.Expression.ParameterResolver" />

        this.Visit = function (node, context) {
            for (var i = 0; i < visitors.length; i++) {
                var n = visitors[i].Visit(node, context);
                if (n !== node) return n;
            }
            return node;
        };
    }

});

exports.default = _index2.default;
module.exports = exports['default'];

},{"../../../TypeSystem/index.js":32}],98:[function(_dereq_,module,exports){
'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; };

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _index = _dereq_('../../../TypeSystem/index.js');

var _index2 = _interopRequireDefault(_index);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

_index2.default.Class.define('$data.Expressions.SetExecutableVisitor', _index2.default.Expressions.ExpTreeVisitor, null, {
    Visit: function Visit(eNode, context) {
        switch (eNode.type) {
            case LITERAL:
                return this.VisitLiteral(eNode, context);
            case VARIABLE:
                return this.VisitVariable(eNode, context);
            case MEMBERACCESS:
                return this.VisitMember(eNode, context);
            case BINARY:
                return this.VisitBinary(eNode, context);
            case UNARY:
                return this.VisitUnary(eNode, context);
            case INCDEC:
                return this.VisitIncDec(eNode, context);
            case EQUALITY:
                return this.VisitEquality(eNode, context);
            case DECISION:
                return this.VisitDecision(eNode, context);
            case METHODCALL:
                return this.VisitMethodCall(eNode, context);
            case NEW:
                return this.VisitNew(eNode, context);
            case JSONASSIGN:
                return this.VisitJsonAssign(eNode, context);
            case ARRAYACCESS:
                return this.VisitArrayAccess(eNode, context);
            default:
                _index.Guard.raise("Type isn't implemented: " + eNode.type);
        }
    },

    VisitBinary: function VisitBinary(eNode, context) {
        var left = this.Visit(eNode.left, context);
        var right = this.Visit(eNode.right, context);
        if (left === eNode.left && right === eNode.right && left.executable && right.executable == eNode.executable) return eNode;
        return _index2.default.Expressions.ExpressionNodeTypes.BinaryExpressionNode.create(left.executable && right.executable, eNode.operator, left, right);
    },
    VisitUnary: function VisitUnary(eNode, context) {
        var operand = this.Visit(eNode.operand, context);
        if (operand === eNode.operand) return eNode;
        return _index2.default.Expressions.ExpressionNodeTypes.UnaryExpressionNode.create(operand.executable, eNode.operator, operand);
    },
    VisitIncDec: function VisitIncDec(eNode, context) {
        var operand = this.Visit(eNode.operand, context);
        if (operand === eNode.operand) return eNode;
        return _index2.default.Expressions.ExpressionNodeTypes.IncDecExpressionNode.create(operand.executable, eNode.operator, operand, eNode.suffix);
    },
    VisitEquality: function VisitEquality(eNode, context) {
        var left = this.Visit(eNode.left, context);
        var right = this.Visit(eNode.right, context);
        if (left === eNode.left && right === eNode.right && left.executable && right.executable == eNode.executable) return eNode;
        return _index2.default.Expressions.ExpressionNodeTypes.EqualityExpressionNode.create(left.executable && right.executable, eNode.operator, left, right);
    },
    VisitDecision: function VisitDecision(eNode, context) {
        var expression = this.Visit(eNode.expression, context);
        var left = this.Visit(eNode.left, context);
        var right = this.Visit(eNode.right, context);
        if (expression === eNode.expression && left === eNode.left && right === eNode.right && left.executable && right.executable && expression.executable == eNode.executable) return eNode;
        return _index2.default.Expressions.ExpressionNodeTypes.DecisionExpressionNode.create(left.executable && right.executable && expression.executable, expression, left, right);
    },
    VisitMethodCall: function VisitMethodCall(eNode, context) {
        var object = eNode.object ? this.Visit(eNode.object, context) : null;
        var args = this.VisitArray(eNode.args, context);
        if (object === eNode.object && args === eNode.args && (object == null ? true : object.executable) == eNode.executable) return eNode;
        return _index2.default.Expressions.ExpressionNodeTypes.MethodcallExpressionNode.create(object == null ? true : object.executable, object, eNode.method, args);
    },
    VisitNew: function VisitNew(eNode, context) {
        // { type:NEW, executable:true, values: [] };
        var values = this.VisitArray(eNode.values, context);
        if (values === eNode.values) return eNode;
        return _index2.default.Expressions.ExpressionNodeTypes.NewExpressionNode.create(true, values);
    },
    VisitJsonAssign: function VisitJsonAssign(eNode, context) {
        // { type:JSONASSIGN, executable:true, left: variable, right: right }
        var left = this.Visit(eNode.left, context);
        var right = this.Visit(eNode.right, context);
        if (left === eNode.left && right === eNode.right) return eNode;
        left.JSONASSIGN = true;
        right.JSONASSIGN = true;
        return _index2.default.Expressions.ExpressionNodeTypes.JsonAssignExpressionNode.create(true, left, right);
    },
    VisitArrayAccess: function VisitArrayAccess(eNode, context) {
        // { type:ARRAYACCESS, executable:true, array:, index: }
        var array = this.Visit(eNode.array, context);
        var index = this.Visit(eNode.index, context);
        if (array === eNode.array && index === eNode.index) return eNode;
        return _index2.default.Expressions.ExpressionNodeTypes.ArrayAccessExpressionNode.create(true, array, index);
    },
    VisitArray: function VisitArray(eNodes, context) {
        var args = [];
        var ok = true;
        for (var i = 0; i < eNodes.length; i++) {
            args[i] = this.Visit(eNodes[i], context);
            ok = ok && args[i] === eNodes[i];
        }
        return ok ? eNodes : args;
    },

    VisitLiteral: function VisitLiteral(eNode, context) {
        return { type: eNode.type, executable: true, value: eNode.value, valueType: eNode.valueType };
    },
    VisitVariable: function VisitVariable(eNode, context) {
        if (_typeof(context.paramContext[eNode.name]) == undefined) // isn't param  //TODO: check ParamContext
            _index.Guard.raise("Variable is not defined in the paramContext: " + eNode.name);
        //this._setExecutable(eNode, true);
        return _index2.default.Expressions.ExpressionNodeTypes.VariableExpressionNode.create(true, "Math", "GLOBALOBJECT");
    },
    VisitMember: function VisitMember(eNode, context) {
        var chain = this.GetMemberChain(eNode);
        var firstMember = chain[0].name;
        var isLambdaParam = context.lambdaParams.indexOf(firstMember) >= 0;
        var isLocalParam = firstMember == context.paramsName; //TODO: check ParamContext // old: typeof context.paramContext[firstMember] != "undefined";
        if (!isLocalParam && !isLambdaParam) _index.Guard.raise("Variable is not defined in the paramContext or the lambda parameters: " + firstMember);

        return _index2.default.Expressions.ExpressionNodeTypes.MemberAccessExpressionNode.create(isLocalParam, eNode.expression, eNode.member);
    }
}, null);

exports.default = _index2.default;
module.exports = exports['default'];

},{"../../../TypeSystem/index.js":32}],99:[function(_dereq_,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _index = _dereq_('../../TypeSystem/index.js');

var _index2 = _interopRequireDefault(_index);

var _ExpressionNode = _dereq_('./ExpressionNode2.js');

var _ExpressionNode2 = _interopRequireDefault(_ExpressionNode);

var _ArrayLiteralExpression = _dereq_('./ArrayLiteralExpression.js');

var _ArrayLiteralExpression2 = _interopRequireDefault(_ArrayLiteralExpression);

var _CallExpression = _dereq_('./CallExpression.js');

var _CallExpression2 = _interopRequireDefault(_CallExpression);

var _CodeParser = _dereq_('./CodeParser.js');

var _CodeParser2 = _interopRequireDefault(_CodeParser);

var _ConstantExpression = _dereq_('./ConstantExpression.js');

var _ConstantExpression2 = _interopRequireDefault(_ConstantExpression);

var _FunctionExpression = _dereq_('./FunctionExpression.js');

var _FunctionExpression2 = _interopRequireDefault(_FunctionExpression);

var _ObjectFieldExpression = _dereq_('./ObjectFieldExpression.js');

var _ObjectFieldExpression2 = _interopRequireDefault(_ObjectFieldExpression);

var _ObjectLiteralExpression = _dereq_('./ObjectLiteralExpression.js');

var _ObjectLiteralExpression2 = _interopRequireDefault(_ObjectLiteralExpression);

var _PagingExpression = _dereq_('./PagingExpression.js');

var _PagingExpression2 = _interopRequireDefault(_PagingExpression);

var _ParameterExpression = _dereq_('./ParameterExpression.js');

var _ParameterExpression2 = _interopRequireDefault(_ParameterExpression);

var _PropertyExpression = _dereq_('./PropertyExpression.js');

var _PropertyExpression2 = _interopRequireDefault(_PropertyExpression);

var _SimpleBinaryExpression = _dereq_('./SimpleBinaryExpression.js');

var _SimpleBinaryExpression2 = _interopRequireDefault(_SimpleBinaryExpression);

var _ThisExpression = _dereq_('./ThisExpression.js');

var _ThisExpression2 = _interopRequireDefault(_ThisExpression);

var _ExpressionVisitor = _dereq_('./Visitors/ExpressionVisitor.js');

var _ExpressionVisitor2 = _interopRequireDefault(_ExpressionVisitor);

var _ParameterProcessor = _dereq_('./Visitors/ParameterProcessor.js');

var _ParameterProcessor2 = _interopRequireDefault(_ParameterProcessor);

var _GlobalContextProcessor = _dereq_('./Visitors/GlobalContextProcessor.js');

var _GlobalContextProcessor2 = _interopRequireDefault(_GlobalContextProcessor);

var _LocalContextProcessor = _dereq_('./Visitors/LocalContextProcessor.js');

var _LocalContextProcessor2 = _interopRequireDefault(_LocalContextProcessor);

var _LambdaParameterProcessor = _dereq_('./Visitors/LambdaParameterProcessor.js');

var _LambdaParameterProcessor2 = _interopRequireDefault(_LambdaParameterProcessor);

var _ParameterResolverVisitor = _dereq_('./Visitors/ParameterResolverVisitor.js');

var _ParameterResolverVisitor2 = _interopRequireDefault(_ParameterResolverVisitor);

var _LogicalSchemaBinderVisitor = _dereq_('./Visitors/LogicalSchemaBinderVisitor.js');

var _LogicalSchemaBinderVisitor2 = _interopRequireDefault(_LogicalSchemaBinderVisitor);

var _ExpTreeVisitor = _dereq_('./Visitors/ExpTreeVisitor.js');

var _ExpTreeVisitor2 = _interopRequireDefault(_ExpTreeVisitor);

var _SetExecutableVisitor = _dereq_('./Visitors/SetExecutableVisitor.js');

var _SetExecutableVisitor2 = _interopRequireDefault(_SetExecutableVisitor);

var _ExecutorVisitor = _dereq_('./Visitors/ExecutorVisitor.js');

var _ExecutorVisitor2 = _interopRequireDefault(_ExecutorVisitor);

var _ExpressionBuilder = _dereq_('./ExpressionBuilder.js');

var _ExpressionBuilder2 = _interopRequireDefault(_ExpressionBuilder);

var _AssociationInfoExpression = _dereq_('./EntityExpressions/AssociationInfoExpression.js');

var _AssociationInfoExpression2 = _interopRequireDefault(_AssociationInfoExpression);

var _CodeExpression = _dereq_('./EntityExpressions/CodeExpression.js');

var _CodeExpression2 = _interopRequireDefault(_CodeExpression);

var _CodeToEntityConverter = _dereq_('./EntityExpressions/CodeToEntityConverter.js');

var _CodeToEntityConverter2 = _interopRequireDefault(_CodeToEntityConverter);

var _ComplexTypeExpression = _dereq_('./EntityExpressions/ComplexTypeExpression.js');

var _ComplexTypeExpression2 = _interopRequireDefault(_ComplexTypeExpression);

var _EntityContextExpression = _dereq_('./EntityExpressions/EntityContextExpression.js');

var _EntityContextExpression2 = _interopRequireDefault(_EntityContextExpression);

var _EntityExpression = _dereq_('./EntityExpressions/EntityExpression.js');

var _EntityExpression2 = _interopRequireDefault(_EntityExpression);

var _EntityExpressionVisitor = _dereq_('./EntityExpressions/EntityExpressionVisitor.js');

var _EntityExpressionVisitor2 = _interopRequireDefault(_EntityExpressionVisitor);

var _ExpressionMonitor = _dereq_('./EntityExpressions/ExpressionMonitor.js');

var _ExpressionMonitor2 = _interopRequireDefault(_ExpressionMonitor);

var _EntityFieldExpression = _dereq_('./EntityExpressions/EntityFieldExpression.js');

var _EntityFieldExpression2 = _interopRequireDefault(_EntityFieldExpression);

var _EntityFieldOperationExpression = _dereq_('./EntityExpressions/EntityFieldOperationExpression.js');

var _EntityFieldOperationExpression2 = _interopRequireDefault(_EntityFieldOperationExpression);

var _EntitySetExpression = _dereq_('./EntityExpressions/EntitySetExpression.js');

var _EntitySetExpression2 = _interopRequireDefault(_EntitySetExpression);

var _FrameOperationExpression = _dereq_('./EntityExpressions/FrameOperationExpression.js');

var _FrameOperationExpression2 = _interopRequireDefault(_FrameOperationExpression);

var _FilterExpression = _dereq_('./EntityExpressions/FilterExpression.js');

var _FilterExpression2 = _interopRequireDefault(_FilterExpression);

var _IncludeExpression = _dereq_('./EntityExpressions/IncludeExpression.js');

var _IncludeExpression2 = _interopRequireDefault(_IncludeExpression);

var _MemberInfoExpression = _dereq_('./EntityExpressions/MemberInfoExpression.js');

var _MemberInfoExpression2 = _interopRequireDefault(_MemberInfoExpression);

var _OrderExpression = _dereq_('./EntityExpressions/OrderExpression.js');

var _OrderExpression2 = _interopRequireDefault(_OrderExpression);

var _ParametricQueryExpression = _dereq_('./EntityExpressions/ParametricQueryExpression.js');

var _ParametricQueryExpression2 = _interopRequireDefault(_ParametricQueryExpression);

var _ProjectionExpression = _dereq_('./EntityExpressions/ProjectionExpression.js');

var _ProjectionExpression2 = _interopRequireDefault(_ProjectionExpression);

var _QueryExpressionCreator = _dereq_('./EntityExpressions/QueryExpressionCreator.js');

var _QueryExpressionCreator2 = _interopRequireDefault(_QueryExpressionCreator);

var _QueryParameterExpression = _dereq_('./EntityExpressions/QueryParameterExpression.js');

var _QueryParameterExpression2 = _interopRequireDefault(_QueryParameterExpression);

var _RepresentationExpression = _dereq_('./EntityExpressions/RepresentationExpression.js');

var _RepresentationExpression2 = _interopRequireDefault(_RepresentationExpression);

var _ServiceOperationExpression = _dereq_('./EntityExpressions/ServiceOperationExpression.js');

var _ServiceOperationExpression2 = _interopRequireDefault(_ServiceOperationExpression);

var _ContinuationExpressionBuilder = _dereq_('./ContinuationExpressionBuilder.js');

var _ContinuationExpressionBuilder2 = _interopRequireDefault(_ContinuationExpressionBuilder);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

_index2.default.defaults = _index2.default.defaults || {};
_index2.default.defaults.parameterResolutionCompatibility = true;

exports.default = _index2.default;
module.exports = exports['default'];

},{"../../TypeSystem/index.js":32,"./ArrayLiteralExpression.js":52,"./CallExpression.js":53,"./CodeParser.js":54,"./ConstantExpression.js":55,"./ContinuationExpressionBuilder.js":56,"./EntityExpressions/AssociationInfoExpression.js":57,"./EntityExpressions/CodeExpression.js":58,"./EntityExpressions/CodeToEntityConverter.js":59,"./EntityExpressions/ComplexTypeExpression.js":60,"./EntityExpressions/EntityContextExpression.js":61,"./EntityExpressions/EntityExpression.js":62,"./EntityExpressions/EntityExpressionVisitor.js":63,"./EntityExpressions/EntityFieldExpression.js":64,"./EntityExpressions/EntityFieldOperationExpression.js":65,"./EntityExpressions/EntitySetExpression.js":66,"./EntityExpressions/ExpressionMonitor.js":67,"./EntityExpressions/FilterExpression.js":68,"./EntityExpressions/FrameOperationExpression.js":69,"./EntityExpressions/IncludeExpression.js":70,"./EntityExpressions/MemberInfoExpression.js":71,"./EntityExpressions/OrderExpression.js":72,"./EntityExpressions/ParametricQueryExpression.js":73,"./EntityExpressions/ProjectionExpression.js":74,"./EntityExpressions/QueryExpressionCreator.js":75,"./EntityExpressions/QueryParameterExpression.js":76,"./EntityExpressions/RepresentationExpression.js":77,"./EntityExpressions/ServiceOperationExpression.js":78,"./ExpressionBuilder.js":79,"./ExpressionNode2.js":80,"./FunctionExpression.js":81,"./ObjectFieldExpression.js":82,"./ObjectLiteralExpression.js":83,"./PagingExpression.js":84,"./ParameterExpression.js":85,"./PropertyExpression.js":86,"./SimpleBinaryExpression.js":87,"./ThisExpression.js":88,"./Visitors/ExecutorVisitor.js":89,"./Visitors/ExpTreeVisitor.js":90,"./Visitors/ExpressionVisitor.js":91,"./Visitors/GlobalContextProcessor.js":92,"./Visitors/LambdaParameterProcessor.js":93,"./Visitors/LocalContextProcessor.js":94,"./Visitors/LogicalSchemaBinderVisitor.js":95,"./Visitors/ParameterProcessor.js":96,"./Visitors/ParameterResolverVisitor.js":97,"./Visitors/SetExecutableVisitor.js":98}],100:[function(_dereq_,module,exports){
'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; };

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _index = _dereq_('../TypeSystem/index.js');

var _index2 = _interopRequireDefault(_index);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

_index2.default.Class.define('$data.ItemStoreClass', null, null, {
    constructor: function constructor() {
        var self = this;
        self.itemStoreConfig = {
            aliases: {},
            contextTypes: {}
        };

        self.resetStoreToDefault('local', true);
        _index2.default.addStore = function () {
            return self.addItemStoreAlias.apply(self, arguments);
        };
        _index2.default.implementation = self.implementation;

        _index2.default.Entity.addMember('storeToken', {
            get: function get() {
                if (this.storeConfigs && this.storeConfigs['default']) return this.storeConfigs.stores[this.storeConfigs['default']];
            },
            set: function set(value) {
                self._setTypeStoreConfig(this, 'default', value);
            }
        }, true);
    },
    itemStoreConfig: {},
    attachMode: _index2.default.EntityAttachMode ? _index2.default.EntityAttachMode.KeepChanges : true,

    addItemStoreAlias: function addItemStoreAlias(name, contextFactoryOrToken, isDefault) {
        var self = this;
        var promise = new _index2.default.PromiseHandler();
        var callback = promise.createCallback();

        if ('string' === typeof name) {
            //storeToken
            if ('object' === (typeof contextFactoryOrToken === 'undefined' ? 'undefined' : _typeof(contextFactoryOrToken)) && 'factory' in contextFactoryOrToken) {
                var type = _index.Container.resolveType(contextFactoryOrToken.typeName);

                self.itemStoreConfig.aliases[name] = contextFactoryOrToken.factory;
                self.itemStoreConfig.contextTypes[name] = type;
                if (isDefault) {
                    self.itemStoreConfig['default'] = name;
                }

                callback.success();
                return promise.getPromise();
            }
            //contextFactory
            else if ('function' === typeof contextFactoryOrToken) {
                    var preContext = contextFactoryOrToken();
                    var contextPromise;
                    if (preContext && preContext instanceof _index2.default.EntityContext) {
                        callback.success(preContext);
                        contextPromise = promise.getPromise();
                    } else {
                        contextPromise = preContext;
                    }

                    return contextPromise.then(function (ctx) {
                        if (typeof ctx === 'function') {
                            //factory resolve factory
                            return self.addItemStoreAlias(name, ctx, isDefault);
                        }

                        if (ctx instanceof _index2.default.EntityContext) {
                            return ctx.onReady().then(function (ctx) {
                                self.itemStoreConfig.aliases[name] = contextFactoryOrToken;
                                self.itemStoreConfig.contextTypes[name] = ctx.getType();
                                if (isDefault) {
                                    self.itemStoreConfig['default'] = name;
                                }

                                return ctx;
                            });
                        } else {
                            promise = new _index2.default.PromiseHandler();
                            callback = promise.createCallback();
                            callback.error(new _index.Exception('factory dont have context instance', 'Invalid arguments'));
                            return promise.getPromise();
                        }
                    });
                }
        }

        callback.error(new _index.Exception('Name or factory missing', 'Invalid arguments'));
        return promise.getPromise();
    },
    resetStoreToDefault: function resetStoreToDefault(name, isDefault) {
        this.itemStoreConfig.aliases[name] = this._getDefaultItemStoreFactory;
        delete this.itemStoreConfig.contextTypes[name];
        if (isDefault) {
            this.itemStoreConfig['default'] = name;
        }
    },
    _setStoreAlias: function _setStoreAlias(entity, storeToken) {
        if ('object' === (typeof storeToken === 'undefined' ? 'undefined' : _typeof(storeToken)) && !entity.storeToken) entity.storeToken = storeToken;
        return entity;
    },
    _getStoreAlias: function _getStoreAlias(entity, storeAlias) {
        var type;
        if (entity instanceof _index2.default.Entity) {
            var alias = storeAlias || entity.storeToken;
            if (alias) {
                return alias;
            } else {
                type = entity.getType();
            }
        } else {
            type = entity;
        }

        return storeAlias || (type.storeConfigs ? type.storeConfigs['default'] : undefined) || type.storeToken;
    },
    _getStoreContext: function _getStoreContext(aliasOrToken, type, nullIfInvalid) {
        var contextPromise = this._getContextPromise(aliasOrToken, type);

        if (!contextPromise || contextPromise instanceof _index2.default.EntityContext) {
            var promise = new _index2.default.PromiseHandler();
            var callback = promise.createCallback();
            callback.success(contextPromise);
            contextPromise = promise.getPromise();
        }

        return contextPromise.then(function (context) {
            if (context instanceof _index2.default.EntityContext) {
                return context.onReady();
            } else if (nullIfInvalid) {
                return null;
            } else {
                var promise = new _index2.default.PromiseHandler();
                var callback = promise.createCallback();
                callback.error(new _index.Exception('factory return type error', 'Error'));
                return promise.getPromise();
            }
        });
    },
    _getContextPromise: function _getContextPromise(aliasOrToken, type) {
        /*Token*/
        if (aliasOrToken && 'object' === (typeof aliasOrToken === 'undefined' ? 'undefined' : _typeof(aliasOrToken)) && 'function' === typeof aliasOrToken.factory) {
            return aliasOrToken.factory(type);
        } else if (aliasOrToken && 'object' === (typeof aliasOrToken === 'undefined' ? 'undefined' : _typeof(aliasOrToken)) && 'object' === _typeof(aliasOrToken.args) && 'string' === typeof aliasOrToken.typeName) {
            var type = _index.Container.resolveType(aliasOrToken.typeName);
            return new type(JSON.parse(JSON.stringify(aliasOrToken.args)));
        }
        /*resolve alias from type (Token)*/
        else if (aliasOrToken && 'string' === typeof aliasOrToken && type.storeConfigs && type.storeConfigs.stores[aliasOrToken] && typeof type.storeConfigs.stores[aliasOrToken].factory === 'function') {
                return type.storeConfigs.stores[aliasOrToken].factory();
            }
            /*resolve alias from type (constructor options)*/
            else if (aliasOrToken && 'string' === typeof aliasOrToken && type.storeConfigs && type.storeConfigs.stores[aliasOrToken]) {
                    return this._getDefaultItemStoreFactory(type, type.storeConfigs.stores[aliasOrToken]);
                }
                /*resolve alias from ItemStore (factories)*/
                else if (aliasOrToken && 'string' === typeof aliasOrToken && this.itemStoreConfig.aliases[aliasOrToken]) {
                        return this.itemStoreConfig.aliases[aliasOrToken](type);
                    }
                    /*token is factory*/
                    else if (aliasOrToken && 'function' === typeof aliasOrToken) {
                            return aliasOrToken();
                        }
                        /*default no hint*/
                        else {
                                return this.itemStoreConfig.aliases[this.itemStoreConfig['default']](type);
                            }
    },
    _getStoreEntitySet: function _getStoreEntitySet(storeAlias, instanceOrType) {
        var aliasOrToken = this._getStoreAlias(instanceOrType, storeAlias);
        var type = "function" === typeof instanceOrType ? instanceOrType : instanceOrType.getType();;

        return this._getStoreContext(aliasOrToken, type).then(function (ctx) {
            var entitySet = ctx.getEntitySetFromElementType(type);
            if (!entitySet) {
                var d = new _index2.default.PromiseHandler();
                var callback = d.createCallback();
                callback.error("EntitySet not exist for " + type.fullName);
                return d.getPromise();
            }
            return entitySet;
        });
    },
    _getDefaultItemStoreFactory: function _getDefaultItemStoreFactory(instanceOrType, initStoreConfig) {
        if (instanceOrType) {
            var type = "function" === typeof instanceOrType ? instanceOrType : instanceOrType.getType();
            var typeName = _index2.default.Container.resolveName(type) + "_items";
            var typeName = typeName.replace(/\./g, "_");

            var storeConfig = _index2.default.typeSystem.extend({
                collectionName: initStoreConfig && initStoreConfig.collectionName ? initStoreConfig.collectionName : 'Items',
                tableName: typeName,
                initParam: { provider: 'local', databaseName: typeName }
            }, initStoreConfig);

            var contextDef = {};
            contextDef[storeConfig.collectionName] = { type: _index2.default.EntitySet, elementType: type };
            if (storeConfig.tableName) contextDef[storeConfig.collectionName]['tableName'] = storeConfig.tableName;

            var inMemoryType = _index2.default.EntityContext.extend(typeName, contextDef);
            var ctx = new inMemoryType(storeConfig.initParam);
            if (initStoreConfig && (typeof initStoreConfig === 'undefined' ? 'undefined' : _typeof(initStoreConfig)) === 'object') initStoreConfig.factory = ctx._storeToken.factory;
            return ctx;
        }
        return undefined;
    },
    implementation: function implementation(name, contextOrAlias) {
        var self = _index2.default.ItemStore;
        var result;

        if (typeof contextOrAlias === 'string') {
            contextOrAlias = self.itemStoreConfig.contextTypes[contextOrAlias];
        } else if (contextOrAlias instanceof _index2.default.EntityContext) {
            contextOrAlias = contextOrAlias.getType();
        } else if (!(typeof contextOrAlias === 'function' && contextOrAlias.isAssignableTo)) {
            contextOrAlias = self.itemStoreConfig.contextTypes[self.itemStoreConfig['default']];
        }

        if (contextOrAlias) {
            result = self._resolveFromContext(contextOrAlias, name);
        }

        if (!result) {
            result = _index.Container.resolveType(name);
        }

        return result;
    },
    _resolveFromContext: function _resolveFromContext(contextType, name) {
        var memDefs = contextType.memberDefinitions.getPublicMappedProperties();
        for (var i = 0; i < memDefs.length; i++) {
            var memDef = memDefs[i];
            if (memDef.type) {
                var memDefType = _index.Container.resolveType(memDef.type);
                if (memDefType.isAssignableTo && memDefType.isAssignableTo(_index2.default.EntitySet)) {
                    var elementType = _index.Container.resolveType(memDef.elementType);
                    if (elementType.name === name) {
                        return elementType;
                    }
                }
            }
        }
        return null;
    },

    //Entity Instance
    EntityInstanceSave: function EntityInstanceSave(storeAlias, hint, attachMode) {
        var self = _index2.default.ItemStore;
        var entity = this;
        return self._getStoreEntitySet(storeAlias, entity).then(function (entitySet) {
            return self._getSaveMode(entity, entitySet, hint, storeAlias).then(function (mode) {
                mode = mode || 'add';
                switch (mode) {
                    case 'add':
                        entitySet.add(entity);
                        break;
                    case 'attach':
                        entitySet.attach(entity, attachMode || true);
                        break;
                    default:
                        var d = new _index2.default.PromiseHandler();
                        var callback = d.createCallback();
                        callback.error('save mode not supported: ' + mode);
                        return d.getPromise();
                }

                return entitySet.entityContext.saveChanges().then(function () {
                    self._setStoreAlias(entity, entitySet.entityContext.storeToken);return entity;
                });
            });
        });
    },
    EntityInstanceRemove: function EntityInstanceRemove(storeAlias) {
        var self = _index2.default.ItemStore;
        var entity = this;
        return self._getStoreEntitySet(storeAlias, entity).then(function (entitySet) {
            entitySet.remove(entity);

            return entitySet.entityContext.saveChanges().then(function () {
                return entity;
            });
        });
    },
    EntityInstanceRefresh: function EntityInstanceRefresh(storeAlias, keepStore) {
        var self = _index2.default.ItemStore;
        var entity = this;
        var entityType = entity.getType();

        var key = self._getKeyObjectFromEntity(entity, entityType);

        return entityType.read(key, storeAlias).then(function (loadedEntity) {
            entityType.memberDefinitions.getPublicMappedProperties().forEach(function (memDef) {
                entity[memDef.name] = loadedEntity[memDef.name];
            });
            entity.storeToken = (keepStore ? entity.storeToken : undefined) || loadedEntity.storeToken;
            entity.changedProperties = undefined;
            return entity;
        });
    },

    //Entity Type
    EntityInheritedTypeProcessor: function EntityInheritedTypeProcessor(type) {
        var self = _index2.default.ItemStore;
        type.readAll = self.EntityTypeReadAll(type);
        type.read = self.EntityTypeRead(type);
        type.removeAll = self.EntityTypeRemoveAll(type);
        type.remove = self.EntityTypeRemove(type);
        type.get = self.EntityTypeGet(type); //Not complete
        type.save = self.EntityTypeSave(type);
        type.addMany = self.EntityTypeAddMany(type);
        type.itemCount = self.EntityTypeItemCount(type);
        type.query = self.EntityTypeQuery(type);
        type.takeFirst = self.EntityTypeTakeFirst(type);

        type.setStore = self.EntityTypeSetStore(type);
    },
    EntityTypeReadAll: function EntityTypeReadAll(type) {
        return function (storeAlias) {
            var self = _index2.default.ItemStore;
            return self._getStoreEntitySet(storeAlias, type).then(function (entitySet) {
                return entitySet.forEach(function (item) {
                    self._setStoreAlias(item, entitySet.entityContext.storeToken);
                });
            });
        };
    },
    EntityTypeRemoveAll: function EntityTypeRemoveAll(type) {
        return function (storeAlias) {
            var self = _index2.default.ItemStore;
            return self._getStoreEntitySet(storeAlias, type).then(function (entitySet) {
                return entitySet.toArray().then(function (items) {
                    items.forEach(function (item) {
                        entitySet.remove(item);
                    });

                    return entitySet.entityContext.saveChanges().then(function () {
                        return items;
                    });
                });
            });
        };
    },
    EntityTypeRead: function EntityTypeRead(type) {
        return function (key, storeAlias) {
            var self = _index2.default.ItemStore;
            return self._getStoreEntitySet(storeAlias, type).then(function (entitySet) {
                try {
                    var singleParam = self._findByIdQueryable(entitySet, key);
                    return entitySet.single(singleParam.predicate, singleParam.thisArgs).then(function (item) {
                        return self._setStoreAlias(item, entitySet.entityContext.storeToken);
                    });
                } catch (e) {
                    var d = new _index2.default.PromiseHandler();
                    var callback = d.createCallback();
                    callback.error(e);
                    return d.getPromise();
                }
            });
        };
    },
    EntityTypeGet: function EntityTypeGet(type) {
        return function (key, storeAlias) {
            var self = _index2.default.ItemStore;
            var item = new type(self._getKeyObjectFromEntity(key));
            item.refresh(storeAlias);
            return item;
        };
    },
    EntityTypeSave: function EntityTypeSave(type) {
        return function (initData, storeAlias, hint) {

            var self = _index2.default.ItemStore;
            var instance = new type(initData);
            return instance.save(storeAlias, hint);
        };
    },
    EntityTypeAddMany: function EntityTypeAddMany(type) {
        return function (initDatas, storeAlias) {
            var self = _index2.default.ItemStore;
            return self._getStoreEntitySet(storeAlias, type).then(function (entitySet) {
                var items = entitySet.addMany(initDatas);
                return entitySet.entityContext.saveChanges().then(function () {
                    return items;
                });
            });
        };
    },
    EntityTypeRemove: function EntityTypeRemove(type) {
        return function (key, storeAlias) {
            var self = _index2.default.ItemStore;
            var entityPk = type.memberDefinitions.getKeyProperties();
            var entity;
            if (entityPk.length === 1) {
                var obj = {};
                obj[entityPk[0].name] = key;
                entity = new type(obj);
            } else {
                entity = new type(key);
            }
            return entity.remove(storeAlias);
        };
    },
    EntityTypeItemCount: function EntityTypeItemCount(type) {
        return function (storeAlias) {
            var self = _index2.default.ItemStore;
            return self._getStoreEntitySet(storeAlias, type).then(function (entitySet) {
                return entitySet.length();
            });
        };
    },
    EntityTypeQuery: function EntityTypeQuery(type) {
        return function (predicate, thisArg, storeAlias) {
            var self = _index2.default.ItemStore;
            return self._getStoreEntitySet(storeAlias, type).then(function (entitySet) {
                return entitySet.filter(predicate, thisArg).forEach(function (item) {
                    self._setStoreAlias(item, entitySet.entityContext.storeToken);
                });
            });
        };
    },
    EntityTypeTakeFirst: function EntityTypeTakeFirst(type) {
        return function (predicate, thisArg, storeAlias) {
            var self = _index2.default.ItemStore;
            return self._getStoreEntitySet(storeAlias, type).then(function (entitySet) {
                return entitySet.first(predicate, thisArg).then(function (item) {
                    return self._setStoreAlias(item, entitySet.entityContext.storeToken);
                });
            });
        };
    },

    EntityTypeSetStore: function EntityTypeSetStore(type) {
        return function (name, config) {
            if ((typeof name === 'undefined' ? 'undefined' : _typeof(name)) === 'object' && typeof config === 'undefined') {
                config = name;
                name = 'default';
            }

            var self = _index2.default.ItemStore;

            var defStoreConfig = {};
            if (config) {
                if (config.tableName) {
                    defStoreConfig.tableName = config.tableName;
                    delete config.tableName;
                }

                if (config.collectionName) {
                    defStoreConfig.collectionName = config.collectionName;
                    delete config.collectionName;
                }

                if (typeof config.dataSource === 'string') {
                    var ds = config.dataSource;
                    if (ds.lastIndexOf('/') === ds.length - 1) {
                        ds = ds.substring(0, ds.lastIndexOf('/'));
                    }
                    var parsedApiUrl = ds.substring(0, ds.lastIndexOf('/'));
                    if (!defStoreConfig.tableName) defStoreConfig.tableName = ds.substring(ds.lastIndexOf('/') + 1);

                    var provider = config.provider || config.name;
                    switch (provider) {
                        case 'oData':
                            config.oDataServiceHost = config.oDataServiceHost || parsedApiUrl;
                            break;
                        case 'webApi':
                            config.apiUrl = config.apiUrl || parsedApiUrl;
                            break;
                        default:
                            break;
                    }
                }
            } else {
                config = { name: 'local' };
            }

            defStoreConfig.initParam = config;
            self._setTypeStoreConfig(type, name, defStoreConfig);

            return type;
        };
    },
    _setTypeStoreConfig: function _setTypeStoreConfig(type, name, config) {
        if (!type.storeConfigs) {
            type.storeConfigs = {
                stores: {}
            };
        }
        type.storeConfigs.stores[name] = config;
        if (name === 'default') {
            type.storeConfigs['default'] = name;
        }
    },

    _findByIdQueryable: function _findByIdQueryable(set, keys) {
        var keysProps = set.defaultType.memberDefinitions.getKeyProperties();
        if (keysProps.length > 1 && keys && 'object' === (typeof keys === 'undefined' ? 'undefined' : _typeof(keys))) {
            var predicate = "",
                thisArgs = {};
            for (var i = 0; i < keysProps.length; i++) {
                if (i > 0) predicate += " && ";

                var key = keysProps[i];
                predicate += "it." + key.name + " == this." + key.name;
                thisArgs[key.name] = keys[key.name];
            }

            return {
                predicate: predicate,
                thisArgs: thisArgs
            };
        } else if (keysProps.length === 1) {
            return {
                predicate: "it." + keysProps[0].name + " == this.value",
                thisArgs: { value: keys }
            };
        } else {
            throw 'invalid keys';
        }
    },
    _getKeyObjectFromEntity: function _getKeyObjectFromEntity(obj, entityType) {
        var key;
        var keyDefs = entityType.memberDefinitions.getKeyProperties();
        if (keyDefs.length === 1) key = obj && (typeof obj === 'undefined' ? 'undefined' : _typeof(obj)) === 'object' ? obj[keyDefs[0].name] : obj;else {
            key = {};

            for (var i = 0; i < keyDefs.length; i++) {
                key[keyDefs[0].name] = obj ? obj[keyDefs[0].name] : obj;
            }
        }

        return key;
    },
    _getSaveMode: function _getSaveMode(entity, entitySet, hint, storeAlias) {
        var self = this;
        var promise = new _index2.default.PromiseHandler();
        var callback = promise.createCallback();
        var entityType = entity.getType();

        switch (true) {
            case hint === 'update':
                callback.success('attach');break;
            case hint === 'new':
                callback.success('add');break;
            case false === entityType.memberDefinitions.getKeyProperties().every(function (keyDef) {
                return entity[keyDef.name];
            }):
                callback.success('add');break;
            case !!entity.storeToken:
                callback.success('attach');break;
                break;
            default:
                //use the current entity store informations
                storeAlias = this._getStoreAlias(entity, storeAlias);
                entityType.read(self._getKeyObjectFromEntity(entity, entityType), storeAlias).then(function () {
                    callback.success('attach');
                }, function () {
                    callback.success('add');
                });
                break;
        }

        return promise.getPromise();
    },

    //EntityContext
    ContextRegister: function ContextRegister(storageProviderCfg) {
        //context instance
        var self = this;
        if (typeof storageProviderCfg.name === "string") {
            storageProviderCfg.name = [storageProviderCfg.name];
        }

        var args = JSON.parse(JSON.stringify(storageProviderCfg));
        this.storeToken = {
            typeName: this.getType().fullName,
            args: args,
            factory: function factory() {
                return new (self.getType())(args);
            }
        };

        //set elementType storetoken
        var members = this.getType().memberDefinitions.getPublicMappedProperties();
        for (var i = 0; i < members.length; i++) {
            var item = members[i];
            if (item.type) {
                var itemResolvedDataType = _index.Container.resolveType(item.type);
                if (itemResolvedDataType && itemResolvedDataType.isAssignableTo && itemResolvedDataType.isAssignableTo(_index2.default.EntitySet)) {
                    var elementType = _index.Container.resolveType(item.elementType);
                    if (!elementType.storeToken) {
                        elementType.storeToken = this.storeToken;
                    }
                }
            }
        }
    },
    QueryResultModifier: function QueryResultModifier(query) {
        var self = _index2.default.ItemStore;
        var context = query.context;
        var type = query.modelBinderConfig.$type;
        if ('string' === typeof type) {
            type = _index.Container.resolveType(type);
        }

        if (type === _index2.default.Array && query.modelBinderConfig.$item && query.modelBinderConfig.$item.$type) {
            type = query.modelBinderConfig.$item.$type;
        }

        //TODO: runs when model binding missed (inmemory)
        if (typeof type === 'undefined' && query.result && query.result[0] instanceof _index2.default.Entity) {
            var navProps = !type ? [] : type.memberDefinitions.getPublicMappedProperties().filter(function (memDef) {
                return !!memDef.inverseProperty;
            });

            for (var i = 0; i < query.result.length; i++) {
                self._setStoreAlias(query.result[i], context.storeToken);

                for (var j = 0; j < navProps.length; j++) {
                    var navProp = navProps[j];
                    if (query.result[i][navProp.name] instanceof _index2.default.Entity) {
                        self._setStoreAlias(query.result[i][navProp.name], context.storeToken);
                    } else if (Array.isArray(query.result[i][navProp.name])) {
                        for (var k = 0; k < query.result[i][navProp.name].length; k++) {
                            if (query.result[i][navProp.name][k] instanceof _index2.default.Entity) {
                                self._setStoreAlias(query.result[i][navProp.name][k], context.storeToken);
                            }
                        }
                    }
                }
            }
        }
    }
});
_index2.default.ItemStore = new _index2.default.ItemStoreClass();

_index2.default.Entity.addMember('field', function (propName) {
    var def = this.memberDefinitions.getMember(propName);
    if (def) {
        if (def.definedBy === this) {
            return new _index2.default.MemberWrapper(def);
        } else {
            _index.Guard.raise(new _index.Exception("Member '" + propName + "' defined on '" + def.definedBy.fullName + "'!", 'Invalid Operation'));
        }
    } else {
        _index.Guard.raise(new _index.Exception("Member '" + propName + "' not exists!", 'Invalid Operation'));
    }

    return this;
}, true);

_index2.default.Class.define('$data.MemberWrapper', null, null, {
    constructor: function constructor(memberDefinition) {
        this.memberDefinition = memberDefinition;
    },
    setKey: function setKey(value) {
        this.memberDefinition.key = value || value === undefined ? true : false;
        return this;
    },
    setComputed: function setComputed(value) {
        this.memberDefinition.computed = value || value === undefined ? true : false;
        return this;
    },
    setRequired: function setRequired(value) {
        this.memberDefinition.required = value || value === undefined ? true : false;
        return this;
    },
    setNullable: function setNullable(value) {
        this.memberDefinition.nullable = value || value === undefined ? true : false;
        return this;
    },
    changeDefinition: function changeDefinition(attr, value) {
        this.memberDefinition[attr] = value;
        return this;
    }
});

exports.default = _index2.default;
module.exports = exports['default'];

},{"../TypeSystem/index.js":32}],101:[function(_dereq_,module,exports){
'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; };

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _index = _dereq_('../TypeSystem/index.js');

var _index2 = _interopRequireDefault(_index);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

_index2.default.Class.define('$data.ModelBinder', null, null, {

    constructor: function constructor(context) {
        this.context = context;
        this.providerName = null;
        if (this.context.storageProvider && typeof this.context.storageProvider.getType === 'function') {
            this.references = !(this.context.storageProvider.providerConfiguration.modelBinderOptimization || false);
            this.providerName = this.context.storageProvider.providerName;
            if (!this.providerName) {
                for (var i in _index2.default.RegisteredStorageProviders) {
                    if (_index2.default.RegisteredStorageProviders[i] === this.context.storageProvider.getType()) {
                        this.providerName = i;
                        break;
                    }
                }
            }
        }
    },

    _deepExtend: function _deepExtend(o, r) {
        if (o === null || o === undefined) {
            return r;
        }
        for (var i in r) {
            if (o.hasOwnProperty(i)) {
                if (_typeof(r[i]) === 'object') {
                    if (Array.isArray(r[i])) {
                        for (var j = 0; j < r[i].length; j++) {
                            if (o[i].indexOf(r[i][j]) < 0) {
                                o[i].push(r[i][j]);
                            }
                        }
                    } else this._deepExtend(o[i], r[i]);
                }
            } else {
                o[i] = r[i];
            }
        }
        return this._finalize(o);
    },

    _finalize: function _finalize(o) {
        if (o instanceof _index2.default.Entity) {
            o.changedProperties = undefined;
            o.storeToken = this.context.storeToken;
        }
        return o;
    },

    _buildSelector: function _buildSelector(meta, context) {
        if (meta.$selector) {
            if (!Array.isArray(meta.$selector)) {
                meta.$selector = [meta.$selector];
            }

            for (var i = 0; i < meta.$selector.length; i++) {
                var selector = meta.$selector[i].replace('json:', '');
                context.src += 'if(';
                var path = selector.split('.');
                for (var j = 0; j < path.length; j++) {
                    context.src += 'di["' + path.slice(0, j + 1).join('"]["') + '"]' + (j < path.length - 1 ? ' && ' : ' !== undefined && typeof di.' + selector + ' === "object"');
                }
                context.src += '){di = di["' + path.join('"]["') + '"];}' + (i < meta.$selector.length - 1 ? 'else ' : '');
            }

            context.src += 'if (di === null){';
            if (context.iter) context.src += context.iter + ' = null;';
            context.src += 'return null;';
            context.src += '}';
        }
    },

    _buildKey: function _buildKey(name, type, keys, context, data) {
        if (keys) {
            var type = _index.Container.resolveType(type);
            var typeIndex = _index.Container.getIndex(type);
            type = type.fullName || type.name;
            context.src += 'var ' + name + 'Fn = function(di){';
            if (!Array.isArray(keys) || keys.length == 1) {
                if (typeof keys !== 'string') keys = keys[0];
                context.src += 'if (typeof di["' + keys + '"] === "undefined") return undefined;';
                context.src += 'if (di["' + keys + '"] === null) return null;';
                context.src += 'var key = ("' + type + '_' + typeIndex + '_' + keys + '#" + di["' + keys + '"]);';
            } else {
                context.src += 'var key = "";';
                for (var i = 0; i < keys.length; i++) {
                    var id = _typeof(keys[i]) !== 'object' ? keys[i] : keys[i].$source;
                    context.src += 'if (typeof di["' + id + '"] === "undefined") return undefined;';
                    context.src += 'if (di["' + id + '"] === null) return null;';
                    context.src += 'key += ("' + type + '_' + typeIndex + '_' + id + '#" + di["' + id + '"]);';
                }
            }

            context.src += 'return key;};';
        }

        context.src += 'var ' + name + ' = ' + (keys ? name + 'Fn(' + (data || 'di') + ')' : 'undefined') + ';';
    },

    build: function build(meta, context) {
        if (meta.$selector) {
            if (!Array.isArray(meta.$selector)) meta.$selector = [meta.$selector];
            for (var i = 0; i < meta.$selector.length; i++) {
                meta.$selector[i] = meta.$selector[i].replace('json:', '');
            }
        }

        if (meta.$value) {
            if (typeof meta.$value === 'function') {
                context.src += 'var di = di || data;';
                context.src += 'var fn = function(){ return meta' + (context.meta.length ? '.' + context.meta.join('.') : '') + '.$value.call(self, meta' + (context.meta.length ? '.' + context.meta.join('.') : '') + ', di); };';
                if (meta.$type) {
                    var type = _index.Container.resolveName(_index.Container.resolveType(meta.$type));
                    var typeIndex = _index.Container.getIndex(_index.Container.resolveType(meta.$type));
                    var converter = this.context.storageProvider.fieldConverter.fromDb[type];
                    if (converter) {
                        context.item = 'self.context.storageProvider.fieldConverter.fromDb["' + type + '"](fn())';
                    } else {
                        context.item = 'new (Container.resolveByIndex(' + typeIndex + '))(fn())';
                    }
                } else context.item = 'fn()';
            } else if (meta.$type) {
                var type = _index.Container.resolveName(_index.Container.resolveType(meta.$type));
                var typeIndex = _index.Container.getIndex(_index.Container.resolveType(meta.$type));
                var converter = this.context.storageProvider.fieldConverter.fromDb[type];
                if (converter) {
                    context.item = 'self.context.storageProvider.fieldConverter.fromDb["' + type + '"](' + meta.$value + ')';
                } else {
                    context.item = 'new (Container.resolveByIndex(' + typeIndex + '))(' + meta.$value + ')';
                }
            } else context.item = meta.$value;
        } else if (meta.$source) {
            var type = _index.Container.resolveName(_index.Container.resolveType(meta.$type));
            var typeIndex = _index.Container.getIndex(_index.Container.resolveType(meta.$type));
            var converter = this.context.storageProvider.fieldConverter.fromDb[type];
            var item = '_' + type.replace(/\./gi, '_') + '_';
            if (!context.forEach) context.src += 'var di = data;';
            context.item = item;
            this._buildSelector(meta, context);
            if (converter) {
                context.src += 'var ' + item + ' = self.context.storageProvider.fieldConverter.fromDb["' + type + '"](di["' + meta.$source + '"]);';
            } else {
                context.src += 'var ' + item + ' = new (Container.resolveByIndex(' + typeIndex + '))(di["' + meta.$source + '"]);';
            }
        } else if (meta.$item) {
            context.meta.push('$item');
            var iter = context.item && context.current ? context.item + '.' + context.current : context.item ? context.item : 'result';
            context.iter = iter;
            if (iter.indexOf('.') < 0) context.src += 'var ' + iter + ';';
            context.src += 'var fn = function(di){';
            if (meta.$selector) {
                context.src += 'if (typeof di !== "undefined" && !(Array.isArray(di))){';
                this._buildSelector(meta, context);
                context.src += '}';
            }
            if (this.references && meta.$keys) this._buildKey('forKey', meta.$type, meta.$keys, context);
            context.src += iter + ' = typeof ' + iter + ' == "undefined" ? [] : ' + iter + ';';
            if (this.references && meta.$item.$keys) {
                var keycacheName = 'keycache_' + iter.replace(/\./gi, '_');
                context.src += 'var ' + keycacheName + ';';
                context.src += 'var kci = keycacheIter.indexOf(' + iter + ');';
                context.src += 'if (kci < 0){';
                context.src += keycacheName + ' = [];';
                context.src += 'keycache.push(' + keycacheName + ');';
                context.src += 'keycacheIter.push(' + iter + ');';
                context.src += '}else{';
                context.src += keycacheName + ' = keycache[kci];';
                context.src += '}';
            }
            context.iter = undefined;
            context.forEach = true;
            var itemForKey = 'itemForKey_' + iter.replace(/\./gi, '_');
            context.src += 'var forEachFn = function(di, i){';
            context.src += 'var diBackup = di;';
            if (this.providerName == "sqLite" && this.references && meta.$item.$keys) this._buildKey(itemForKey, meta.$type, meta.$item.$keys, context);
            var item = context.item || 'iter';
            context.item = item;
            if (!meta.$item.$source) {
                this._buildSelector(meta.$item, context);
            }
            this.build(meta.$item, context);
            if (this.references && meta.$keys) {
                context.src += 'if (forKey){';
                context.src += 'if (cache[forKey]){';
                context.src += iter + ' = cache[forKey];';
                context.src += 'if (' + iter + '.indexOf(' + (context.item || item) + ') < 0){';
                context.src += iter + '.push(' + (context.item || item) + ');';
                context.src += '}}else{';
                context.src += 'cache[forKey] = ' + iter + ';';
                context.src += iter + '.push(' + (context.item || item) + ');';
                context.src += '}}else{';
                if (this.references && meta.$item.$keys) this._buildKey('cacheKey', meta.$type, meta.$item.$keys, context, 'diBackup');
                context.src += 'if (typeof cacheKey != "undefined" && cacheKey !== null){';
                context.src += 'if (keycache_' + iter.replace(/\./gi, '_') + ' && cacheKey){';
                context.src += 'if (keycache_' + iter.replace(/\./gi, '_') + '.indexOf(cacheKey) < 0){';
                context.src += iter + '.push(' + (context.item || item) + ');';
                context.src += 'keycache_' + iter.replace(/\./gi, '_') + '.push(cacheKey);';
                context.src += '}';
                context.src += '}else{';
                context.src += iter + '.push(' + (context.item || item) + ');';
                context.src += '}';
                context.src += '}';
                context.src += '}';
            } else {
                if (this.references && meta.$item.$keys) {
                    context.src += 'if (typeof ' + itemForKey + ' !== "undefined" && ' + itemForKey + ' !== null){';
                    context.src += 'if (typeof keycache_' + iter.replace(/\./gi, '_') + ' !== "undefined" && ' + itemForKey + '){';
                    context.src += 'if (keycache_' + iter.replace(/\./gi, '_') + '.indexOf(' + itemForKey + ') < 0){';
                    context.src += iter + '.push(' + (context.item || item) + ');';
                    context.src += 'keycache_' + iter.replace(/\./gi, '_') + '.push(' + itemForKey + ');';
                    context.src += '}}else{';
                    context.src += iter + '.push(' + (context.item || item) + ');';
                    context.src += '}}else{';
                    context.src += iter + '.push(' + (context.item || item) + ');';
                    context.src += '}';
                } else {
                    context.src += iter + '.push(' + (context.item || item) + ');';
                }
            }
            context.src += '};';
            context.src += 'if (Array.isArray(di)) di.forEach(forEachFn);';
            context.src += 'else forEachFn(di, 0);';
            context.forEach = false;
            context.item = null;
            context.src += '};fn(typeof di === "undefined" ? data : di);';
            context.meta.pop();
        } else if (meta.$type) {
            if (!context.forEach) {
                context.src += 'if (typeof di === "undefined"){';
                context.src += 'var di = data;';
                this._buildSelector(meta, context);
                context.src += '}';
            }
            var resolvedType = _index.Container.resolveType(meta.$type);
            var type = _index.Container.resolveName(resolvedType);
            var typeIndex = _index.Container.getIndex(resolvedType);
            var isEntityType = resolvedType.isAssignableTo && resolvedType.isAssignableTo(_index2.default.Entity);
            var item = '_' + type.replace(/\./gi, '_') + '_';
            if (context.item == item) item += 'new_';
            context.item = item;

            var isPrimitive = false;
            if (!meta.$source && !meta.$value && resolvedType !== _index2.default.Array && resolvedType !== _index2.default.Object && !resolvedType.isAssignableTo) isPrimitive = true;
            if (resolvedType === _index2.default.Object || resolvedType === _index2.default.Array) {
                var keys = Object.keys(meta);
                if (keys.length == 1 || keys.length == 2 && meta.$selector) isPrimitive = true;
            }

            if (isPrimitive) {
                var converter = this.context.storageProvider.fieldConverter.fromDb[type];
                if (converter) {
                    context.src += 'var ' + item + ' = di != undefined ? self.context.storageProvider.fieldConverter.fromDb["' + type + '"](di) : di;';
                } else {
                    context.src += 'var ' + item + ' = di;';
                }
            } else {
                if (this.references && meta.$keys) {
                    this._buildKey('itemKey', meta.$type, meta.$keys, context);
                    context.src += 'if (itemKey === null) return null;';
                    context.src += 'var ' + item + ';';
                    context.src += 'if (itemKey && cache[itemKey]){';
                    context.src += item + ' = cache[itemKey];';
                    context.src += '}else{';
                    if (isEntityType) {
                        context.src += item + ' = new (Container.resolveByIndex(' + typeIndex + '))(undefined, { setDefaultValues: false });';
                    } else {
                        context.src += item + ' = new (Container.resolveByIndex(' + typeIndex + '))();';
                    }
                    context.src += 'if (itemKey){';
                    context.src += 'cache[itemKey] = ' + item + ';';
                    context.src += '}';
                    context.src += '}';
                } else {
                    if (isEntityType) {
                        context.src += 'var ' + item + ' = new (Container.resolveByIndex(' + typeIndex + '))(undefined, { setDefaultValues: false });';
                    } else {
                        context.src += 'var ' + item + ' = new (Container.resolveByIndex(' + typeIndex + '))();';
                    }
                }
            }
            var openTypeProperty = null;
            if (this.providerName == "oData" && resolvedType && resolvedType.openType) {
                openTypeProperty = resolvedType.openType === true ? _index2.default.defaults.openTypeDefaultPropertyName : resolvedType.openType;
                context.src += item + '.' + openTypeProperty + ' = {};';
                context.src += 'for (var prop in di){ if ([' + resolvedType.memberDefinitions.getPublicMappedPropertyNames().map(function (prop) {
                    return '"' + prop + '"';
                }).join(',') + '].indexOf(prop) < 0 && prop.indexOf("@") < 0 && prop.indexOf("#") < 0){ ' + item + '.' + openTypeProperty + '[prop] = di[prop]; } };';
            }
            for (var i in meta) {
                if (i.indexOf('$') < 0 && i != openTypeProperty) {
                    context.current = i;
                    if (!meta[i].$item) {
                        if (meta[i].$value) {
                            context.meta.push(i);
                            var item = context.item;
                            this.build(meta[i], context);
                            context.src += item + '.' + i + ' = ' + context.item + ';';
                            context.item = item;
                            context.meta.pop();
                        } else if (meta[i].$source) {
                            context.src += 'var fn = function(di){';
                            this._buildSelector(meta[i], context);
                            if (meta[i].$type) {
                                var type = _index.Container.resolveName(_index.Container.resolveType(meta[i].$type));
                                var typeIndex = _index.Container.getIndex(_index.Container.resolveType(meta[i].$type));
                                var converter = this.context.storageProvider.fieldConverter.fromDb[type];
                                if (converter) {
                                    context.src += 'return self.context.storageProvider.fieldConverter.fromDb["' + type + '"](di["' + meta[i].$source + '"]);';
                                } else {
                                    context.src += 'return new (Container.resolveByIndex(' + typeIndex + '))(di["' + meta[i].$source + '"]);';
                                }
                            } else {
                                context.src += item + '.' + i + ' = di["' + meta[i].$source + '"];';
                            }
                            context.src += '};';
                            if (meta[i].$type) context.src += item + '.' + i + ' = fn(di);';else context.src += 'fn(di);';
                        } else if (meta[i].$type) {
                            context.meta.push(i);
                            context.src += 'var fn = function(di){';
                            this._buildSelector(meta[i], context);
                            this.build(meta[i], context);
                            context.src += 'return ' + context.item + ';};';
                            if (meta[i].$type === _index2.default.Object) context.src += item + '.' + i + ' = self._deepExtend(' + item + '.' + i + ', fn(di));';else context.src += item + '.' + i + ' = fn(di);';
                            context.item = item;
                            context.meta.pop();
                        } else if (meta.$type) {
                            var memDef = _index.Container.resolveType(meta.$type).memberDefinitions.getMember(i);
                            var type = _index.Container.resolveName(memDef.type);
                            var entityType = _index.Container.resolveType(meta.$type);
                            var entityTypeIndex = _index.Container.getIndex(meta.$type);
                            var converter = this.context.storageProvider.fieldConverter.fromDb[type];
                            if (this.providerName && memDef && memDef.converter && memDef.converter[this.providerName] && typeof memDef.converter[this.providerName].fromDb == 'function') {
                                context.src += item + '.' + i + ' = Container.resolveByIndex("' + entityTypeIndex + '").memberDefinitions.getMember("' + i + '").converter.' + this.providerName + '.fromDb(di["' + meta[i] + '"], Container.resolveByIndex("' + entityTypeIndex + '").memberDefinitions.getMember("' + i + '"), self.context, Container.resolveByIndex("' + entityTypeIndex + '"));';
                            } else if (converter) {
                                context.src += item + '.' + i + ' = self.context.storageProvider.fieldConverter.fromDb["' + type + '"](di["' + meta[i] + '"]);';
                            } else {
                                var typeIndex = _index.Container.getIndex(_index.Container.resolveType(type.memberDefinitions.getMember(i).type));
                                context.src += item + '.' + i + ' = new (Container.resolveByIndex(' + typeIndex + '))(di["' + meta[i] + '"]);';
                            }
                        }
                    } else {
                        context.meta.push(i);
                        this.build(meta[i], context);
                        context.item = item;
                        context.meta.pop();
                    }
                }
            }
            context.src += item + ' = self._finalize(' + item + ');';
        }
    },

    call: function call(data, meta) {
        if (!Object.getOwnPropertyNames(meta).length) {
            return data;
        }
        var context = {
            src: '',
            meta: []
        };
        context.src += 'var self = this;';
        context.src += 'var result;';
        context.src += 'var cache = {};';
        context.src += 'var keycache = [];';
        context.src += 'var keycacheIter = [];';
        this.build(meta, context);
        if (context.item) context.src += 'if (typeof result === "undefined") result = ' + context.item + ';';
        context.src += 'return result;';

        var fn = new Function('meta', 'data', 'Container', context.src).bind(this);
        var ret = fn(meta, data, _index.Container);
        return ret;
    }
});

exports.default = _index2.default;
module.exports = exports['default'];

},{"../TypeSystem/index.js":32}],102:[function(_dereq_,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _index = _dereq_('../../TypeSystem/index.js');

var _index2 = _interopRequireDefault(_index);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

_index2.default.Class.define('$data.Notifications.ChangeCollector', _index2.default.Notifications.ChangeCollectorBase, null, {
    buildData: function buildData(entities) {
        var result = [];
        entities.forEach(function (element) {
            var resObj = { entityState: element.data.entityState, typeName: element.data.getType().name };
            var enumerableMemDefCollection = [];

            switch (element.data.entityState) {
                case _index2.default.EntityState.Added:
                    enumerableMemDefCollection = element.data.getType().memberDefinitions.getPublicMappedProperties();
                    break;
                case _index2.default.EntityState.Modified:
                    enumerableMemDefCollection = element.data.changedProperties;
                    break;
                case _index2.default.EntityState.Deleted:
                    enumerableMemDefCollection = element.data.getType().memberDefinitions.getKeyProperties();
                    break;
                default:
                    break;
            }

            enumerableMemDefCollection.forEach(function (memDef) {
                resObj[memDef.name] = element.data[memDef.name];
            });

            result.push(resObj);
        });

        return result;
    }
}, null);

exports.default = _index2.default;
module.exports = exports['default'];

},{"../../TypeSystem/index.js":32}],103:[function(_dereq_,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _index = _dereq_('../../TypeSystem/index.js');

var _index2 = _interopRequireDefault(_index);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

_index2.default.Class.define('$data.Notifications.ChangeCollectorBase', null, null, {
    buildData: function buildData(entityContextData) {
        _index.Guard.raise("Pure class");
    },
    processChangedData: function processChangedData(entityData) {
        if (this.Distrbutor && this.Distrbutor.distributeData) this.Distrbutor.distributeData(this.buildData(entityData));
    },
    Distrbutor: { enumerable: false, dataType: _index2.default.Notifications.ChangeDistributorBase, storeOnObject: true }
}, null);

exports.default = _index2.default;
module.exports = exports['default'];

},{"../../TypeSystem/index.js":32}],104:[function(_dereq_,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _index = _dereq_('../../TypeSystem/index.js');

var _index2 = _interopRequireDefault(_index);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

_index2.default.Class.define('$data.Notifications.ChangeDistributor', _index2.default.Notifications.ChangeDistributorBase, null, {
    constructor: function constructor(broadcastUrl) {
        this.broadcastUrl = broadcastUrl;
    },
    distributeData: function distributeData(data) {
        _index2.default.ajax({
            url: this.broadcastUrl,
            type: "POST",
            data: 'data=' + JSON.stringify(data),
            succes: this.success,
            error: this.error
        });
    },
    broadcastUrl: { dataType: "string" },
    success: function success() {},
    error: function error() {}
}, null);

exports.default = _index2.default;
module.exports = exports['default'];

},{"../../TypeSystem/index.js":32}],105:[function(_dereq_,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _index = _dereq_('../../TypeSystem/index.js');

var _index2 = _interopRequireDefault(_index);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

_index2.default.Class.define('$data.Notifications.ChangeDistributorBase', null, null, {
    distributeData: function distributeData(collectorData) {
        _index.Guard.raise("Pure class");
    }
}, null);

exports.default = _index2.default;
module.exports = exports['default'];

},{"../../TypeSystem/index.js":32}],106:[function(_dereq_,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _index = _dereq_('../TypeSystem/index.js');

var _index2 = _interopRequireDefault(_index);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

(0, _index.$C)('$data.Query', null, null, {
    constructor: function constructor(expression, defaultType, context) {
        ///<param name="context" type="$data.EntityContext" />
        ///<field name="expression" type="$data.Expressions.ExpressionNode" />
        ///<field name="context" type="$data.EntityContext" />

        this.expression = expression;
        this.context = context;

        //TODO: expressions get as JSON string?!

        this.expressions = expression;
        this.defaultType = defaultType;
        this.result = [];
        this.rawDataList = [];
        this.modelBinderConfig = {};
        this.context = context;
    },

    rawDataList: { dataType: "Array" },
    result: { dataType: "Array" },
    resultType: {},
    buildResultSet: function buildResultSet(ctx) {
        var converter = new _index2.default.ModelBinder(this.context);
        this.result = converter.call(this.rawDataList, this.modelBinderConfig);
        return;
    },
    getEntitySets: function getEntitySets() {
        var ret = [];
        var ctx = this.context;

        var fn = function fn(expression) {
            if (expression instanceof _index2.default.Expressions.EntitySetExpression) {
                if (ret.indexOf(ctx._entitySetReferences[expression.elementType.name]) < 0) ret.push(ctx._entitySetReferences[expression.elementType.name]);
            }
            if (expression.source) fn(expression.source);
            if (expression.members) {
                for (var i = 0; i < expression.members.length; i++) {
                    fn(expression.members[i].expression);
                }
            }
        };

        fn(this.expression);

        return ret;
    }
}, null);

exports.default = _index2.default;
module.exports = exports['default'];

},{"../TypeSystem/index.js":32}],107:[function(_dereq_,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _index = _dereq_('../TypeSystem/index.js');

var _index2 = _interopRequireDefault(_index);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

(0, _index.$C)('$data.queryBuilder', null, null, {
    constructor: function constructor() {
        this._fragments = {};
        this.selectedFragment = null;
        this._binderConfig = {};
        this.modelBinderConfig = this._binderConfig;
        this._binderConfigPropertyStack = [];
    },
    selectTextPart: function selectTextPart(name) {
        if (!this._fragments[name]) {
            this._fragments[name] = { text: '', params: [] };
        }
        this.selectedFragment = this._fragments[name];
    },
    getTextPart: function getTextPart(name) {
        return this._fragments[name];
    },
    addText: function addText(textParticle) {
        this.selectedFragment.text += textParticle;
    },
    addParameter: function addParameter(param) {
        this.selectedFragment.params.push(param);
    },
    selectModelBinderProperty: function selectModelBinderProperty(name) {
        this._binderConfigPropertyStack.push(this.modelBinderConfig);
        if (!(name in this.modelBinderConfig)) {
            this.modelBinderConfig[name] = {};
        }
        this.modelBinderConfig = this.modelBinderConfig[name];
    },
    popModelBinderProperty: function popModelBinderProperty() {
        if (this._binderConfigPropertyStack.length === 0) {
            this.modelBinderConfig = this._binderConfig();
        } else {
            this.modelBinderConfig = this._binderConfigPropertyStack.pop();
        }
    },
    resetModelBinderProperty: function resetModelBinderProperty(name) {
        this._binderConfigPropertyStack = [];
        this.modelBinderConfig = this._binderConfig;
    },
    addKeyField: function addKeyField(name) {
        if (!this.modelBinderConfig['$keys']) {
            this.modelBinderConfig['$keys'] = new Array();
        }
        this.modelBinderConfig['$keys'].push(name);
    }
});

exports.default = _index2.default;
module.exports = exports['default'];

},{"../TypeSystem/index.js":32}],108:[function(_dereq_,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _index = _dereq_('../TypeSystem/index.js');

var _index2 = _interopRequireDefault(_index);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

_index2.default.Class.define('$data.QueryProvider', null, null, {
    //TODO: instance member?????
    constructor: function constructor() {
        this.requiresExpressions = false;
    },
    executeQuery: function executeQuery(queryable, resultHandler) {},
    getTraceString: function getTraceString(queryable) {}
}, null);

exports.default = _index2.default;
module.exports = exports['default'];

},{"../TypeSystem/index.js":32}],109:[function(_dereq_,module,exports){
'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; };

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _index = _dereq_('../TypeSystem/index.js');

var _index2 = _interopRequireDefault(_index);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

_index2.default.Class.define('$data.Queryable', null, null, {
    constructor: function constructor(source, rootExpression) {
        ///	<signature>
        /// <summary>Provides a base class for classes supporting JavaScript Language Query.</summary>
        /// <description>Provides a base class for classes supporting JavaScript Language Query.</description>
        /// <param name="source" type="$data.EntitySet" />
        /// <param name="rootExpression" type="$data.Expressions.ExpressionNode"></param>
        ///	</signature>
        ///	<signature>
        /// <summary>Provides a base class for classes supporting JavaScript Language Query.</summary>
        /// <description>Provides a base class for classes supporting JavaScript Language Query.</description>
        /// <param name="source" type="$data.EntityContext" />
        /// <param name="rootExpression" type="$data.Expressions.ExpressionNode"></param>
        ///	</signature>

        var context = source instanceof _index2.default.EntityContext ? source : source.entityContext;
        this.defaultType = source instanceof _index2.default.EntityContext ? null : source.defaultType;
        this.entityContext = context;
        this.expression = rootExpression;
    },

    filter: function filter(predicate, thisArg) {
        ///<summary>Filters a set of entities using a boolean expression.</summary>
        ///<param name="predicate" type="Function">A boolean query expression</param>
        ///<param name="thisArg" type="Object">The query parameters</param>
        ///<returns type="$data.Queryable" />
        ///<signature>
        ///<summary>Filters a set of entities using a boolean expression formulated as string.</summary>
        ///<param name="predicate" type="string">
        ///The expression body of the predicate function in string. &#10;
        ///To reference the lambda parameter use the 'it' context variable. &#10;
        ///Example: filter("it.Title == 'Hello'")
        ///</param>
        ///<param name="thisArg" type="Object" />
        ///<returns type="$data.Queryable" />
        ///</signature>
        ///<signature>
        ///<summary>Filters a set of entities using a bool expression formulated as a JavaScript function.</summary>
        ///<param name="predicate" type="Function">
        ///</param>
        ///<param name="thisArg" type="Object" optional="true">
        ///Contains the predicate parameters
        ///</param>
        ///<returns type="$data.Queryable" />
        ///<example>
        ///Filtering a set of entities with a predicate function&#10;
        ///var males = Persons.filter( function( person ) { return person.Gender == 'Male' } );
        ///</example>
        ///<example>
        ///Filtering a set of entities with a predicate function and parameters&#10;
        ///var draftables = Persons.filter( function( person ) {
        ///     return person.Gender == this.gender &amp;&amp; person.Age &gt; this.age
        /// }, { gender: 'Male',  age: 21 });
        ///</example>
        ///<example>
        ///Filtering a set of entities with a predicate as a string and parameters&#10;
        ///var draftables = Persons.filter("it.Gender == this.gender &amp;&amp;  it.Age &gt; this.age",
        /// { gender: 'Male',  age: 21 });
        ///</example>
        ///</signature>
        if (arguments.length === 3) {
            predicate = "it." + arguments[0] + (arguments[1][0] === "." ? arguments[1] + "(param)" : " " + arguments[1] + " param");
            thisArg = { param: arguments[2] };
        }
        this._checkOperation('filter');
        var expression = _index.Container.createCodeExpression(predicate, thisArg);
        var expressionSource = this.expression;
        if (this.expression instanceof _index2.default.Expressions.FilterExpression) {
            expressionSource = this.expression.source;

            var operatorResolution = this.entityContext.storageProvider.resolveBinaryOperator("and");
            expression = _index.Container.createSimpleBinaryExpression(this.expression.selector, expression, "and", "filter", "boolean", operatorResolution);
        }
        var exp = _index.Container.createFilterExpression(expressionSource, expression);
        var q = _index.Container.createQueryable(this, exp);
        return q;
    },
    where: function where(predicate, params) {
        ///<summary>Where is a convenience alias for C# developers. Use filter instead.</summary>
        ///<returns type="$data.Queryable" />
        return this.filter(predicate, params);
    },

    map: function map(projection, thisArg, mappedTo) {
        ///	<summary>Map specifies the shape or type of each returned element. You can specify whether your results will consist of complete Person objects, just one member, a subset of members, or some completely different result type based on a computation or new object creation. When map produces something other than a copy of the source element, the operation is called a projection. The use of projections to transform data is a powerful capability of JavaScript Language Query expressions.</summary>
        ///	<param name="projection" type="Function">A projection expression</param>
        ///	<param name="thisArg" type="Object">The query parameters</param>
        ///	<returns type="$data.Queryable" />
        ///	<signature>
        ///		<summary>Map specifies the shape or type of each returned element. You can specify whether your results will consist of complete Person objects, just one member, a subset of members, or some completely different result type based on a computation or new object creation. When map produces something other than a copy of the source element, the operation is called a projection. The use of projections to transform data is a powerful capability of JavaScript Language Query expressions.</summary>
        ///		<param name="projection" type="string">
        ///			The expression body of the projection function in string. &#10;
        ///			To reference the lambda parameter use the 'it' context variable. &#10;
        ///			Example: map("{ i: it.Id, t: it.Title }")
        ///		</param>
        ///		<param name="thisArg" type="Object" />
        ///		<returns type="$data.Queryable" />
        ///	</signature>
        ///	<signature>
        ///		<summary>Map specifies the shape or type of each returned element. You can specify whether your results will consist of complete Person objects, just one member, a subset of members, or some completely different result type based on a computation or new object creation. When map produces something other than a copy of the source element, the operation is called a projection. The use of projections to transform data is a powerful capability of JavaScript Language Query expressions.</summary>
        ///		<param name="projection" type="Function">
        ///			Projection function to specify the shape or type of each returned element.
        ///		</param>
        ///		<param name="thisArg" type="Object" optional="true">
        ///			Contains the projection parameters.
        ///		</param>
        ///		<returns type="$data.Queryable" />
        ///		<example>
        ///			Projection to get an array of the full name property of a set of Person entities&#10;
        ///			var personFullNames = Persons.map( function( person ) { return person.FullName; } );
        ///		</example>
        ///		<example>
        ///			Projection to get an array of the required fields of Person entities in an anonymous type.&#10;
        ///			var custom = Persons.map( function( person ) {
        ///				return { FullName: person.FullName, Info: { Address: person.Location.Address, Phone: person.Phone } };
        ///			});
        ///		</example>
        ///	</signature>

        this._checkOperation('map');
        var codeExpression = _index.Container.createCodeExpression(projection, thisArg);
        var exp = _index.Container.createProjectionExpression(this.expression, codeExpression);

        if (mappedTo === 'default') exp.projectionAs = this.defaultType;else if (mappedTo) exp.projectionAs = _index.Container.resolveType(mappedTo);else exp.projectionAs = _index2.default.Object;

        var q = _index.Container.createQueryable(this, exp);
        return q;
    },
    select: function select(projection, thisArg, mappedTo) {
        ///<summary>Select is a convenience alias for C# developers. Use map instead.</summary>
        ///<returns type="$data.Queryable" />
        return this.map(projection, thisArg, mappedTo);
    },

    length: function length(onResult, transaction) {
        ///	<summary>Returns the number of entities (or projected object) in a query as the callback parameter.</summary>
        ///	<param name="onResult" type="Function">A callback function</param>
        ///	<returns type="$data.Promise" />
        ///	<signature>
        ///		<summary>Returns the number of entities (or projected object) in a query as the callback parameter.</summary>
        ///		<param name="onResult" type="Function">
        ///			The callback function to handle the result.
        ///		</param>
        ///		<returns type="$data.Promise" />
        ///	</signature>
        ///	<signature>
        ///		<summary>Returns the number of entities (or projected object) in a query as the callback parameter.</summary>
        ///		<param name="onResult" type="Object">
        ///			Object of callback functions to handle success and error. &#10;
        ///			Example: { success: function(cnt) { ... }, error: function() { alert("Something went wrong..."); } }
        ///		</param>
        ///		<returns type="$data.Promise" />
        ///		<example>
        ///			Get the count of Person entities. &#10;
        ///			Persons.length( function( cnt ) { alert("There are " + cnt + " person(s) in the database."); } );
        ///		</example>
        ///	</signature>

        this._checkOperation('length');
        var pHandler = new _index2.default.PromiseHandler();
        var cbWrapper = pHandler.createCallback(onResult);

        var countExpression = _index.Container.createCountExpression(this.expression);
        var preparator = _index.Container.createQueryExpressionCreator(this.entityContext);
        try {
            var expression = preparator.Visit(countExpression);
            this.entityContext.log({ event: "EntityExpression", data: expression });

            this.entityContext.executeQuery(_index.Container.createQueryable(this, expression), cbWrapper, transaction);
        } catch (e) {
            cbWrapper.error(e);
        }

        return pHandler.getPromise();
    },
    count: function count(onResult, transaction) {
        ///<summary>Count is a convenience alias for C# developers. Use length instead.</summary>
        ///<returns type="$data.Integer" />
        return this.length(onResult, transaction);
    },

    forEach: function forEach(iterator, transaction) {
        ///	<summary>Calls the iterator function for all entity (or projected object) in the query.</summary>
        ///	<param name="iterator" type="Function">Iterator function</param>
        ///	<returns type="$data.Promise" />
        ///	<signature>
        ///		<summary>Calls the iterator function for all entity (or projected object) in the query.</summary>
        ///		<param name="iterator" type="Function">
        ///			Iterator function to handle the result elements.
        ///		</param>
        ///		<returns type="$data.Promise" />
        ///		<example>
        ///			Log the full name of each Person. &#10;
        ///			Persons.forEach( function( person ) { console.log(person.FullName; } );
        ///		</example>
        ///	</signature>

        this._checkOperation('forEach');
        var pHandler = new _index2.default.PromiseHandler();
        function iteratorFunc(items) {
            items.forEach(iterator);
        }
        var cbWrapper = pHandler.createCallback(iteratorFunc);

        var forEachExpression = _index.Container.createForEachExpression(this.expression);
        var preparator = _index.Container.createQueryExpressionCreator(this.entityContext);
        try {
            var expression = preparator.Visit(forEachExpression);
            this.entityContext.log({ event: "EntityExpression", data: expression });

            this.entityContext.executeQuery(_index.Container.createQueryable(this, expression), cbWrapper, transaction);
        } catch (e) {
            cbWrapper.error(e);
        }

        return pHandler.getPromise();
    },

    toArray: function toArray(onResult_items, transaction) {
        ///	<summary>Returns the query result as the callback parameter.</summary>
        ///	<param name="onResult_items" type="Function">A callback function</param>
        ///	<returns type="$data.Promise" />
        ///	<signature>
        ///		<summary>Returns the query result as the callback parameter.</summary>
        ///		<param name="onResult_items" type="Function">
        ///			The callback function to handle the result.
        ///		</param>
        ///		<returns type="$data.Promise" />
        ///	</signature>
        ///	<signature>
        ///		<summary>Returns the query result as the callback parameter.</summary>
        ///		<param name="onResult_items" type="Object">
        ///			Object of callback functions to handle success and error. &#10;
        ///			Example: { success: function(result) { ... }, error: function() { alert("Something went wrong..."); } }
        ///		</param>
        ///		<returns type="$data.Promise" />
        ///		<example>
        ///			Get all Person entities. &#10;
        ///			Persons.toArray( function( result ) { console.dir(result); } );
        ///		</example>
        ///	</signature>

        if (onResult_items instanceof _index2.default.Array) {
            return this.toArray(function (results) {
                onResult_items.length = 0;
                results.forEach(function (item, idx) {
                    onResult_items.push(item);
                });
            });
        }

        this._checkOperation('toArray');
        var pHandler = new _index2.default.PromiseHandler();
        var cbWrapper = pHandler.createCallback(onResult_items);

        var toArrayExpression = _index.Container.createToArrayExpression(this.expression);
        var preparator = _index.Container.createQueryExpressionCreator(this.entityContext);
        try {
            var expression = preparator.Visit(toArrayExpression);
            this.entityContext.log({ event: "EntityExpression", data: expression });

            this.entityContext.executeQuery(_index.Container.createQueryable(this, expression), cbWrapper, transaction);
        } catch (e) {
            cbWrapper.error(e);
        }

        return pHandler.getPromise();
    },
    toLiveArray: function toLiveArray(onResult, transaction) {
        var self = this;
        var result = [];

        var doAction = function doAction(action) {
            return function (onResult) {
                var pHandler = new _index2.default.PromiseHandler();
                var callback = pHandler.createCallback(onResult);

                var successFunc = function successFunc(res) {
                    result.length = 0;

                    var data = res;
                    _index2.default.typeSystem.extend(result, data);

                    result.prev = doAction(function (cb) {
                        data.prev(cb);
                    });
                    result.next = doAction(function (cb) {
                        data.next(cb);
                    });

                    callback.success.apply(this, [result].concat(Array.prototype.slice.call(arguments, 1)));
                };

                action({
                    success: successFunc,
                    error: callback.error
                }, transaction);

                var promise = pHandler.getPromise();
                _index2.default.typeSystem.extend(result, promise);

                return result;
            };
        };

        result.refresh = doAction(function (cb) {
            self.toArray(cb);
        });

        return result.refresh.apply(result, arguments);
    },

    single: function single(filterPredicate, thisArg, onResult, transaction) {
        ///	<summary>Filters a set of entities using a boolean expression and returns a single element or throws an error if more than one element is filtered.</summary>
        ///	<param name="onResult_items" type="Function">A callback function</param>
        ///	<returns type="$data.Promise" />
        ///	<signature>
        ///		<summary>Filters a set of entities using a boolean expression and returns a single element or throws an error if more than one element is filtered.</summary>
        ///		<param name="filterPredicate" type="string">
        ///			Same as in filter.
        ///		</param>
        ///		<param name="onResult" type="Function">
        ///			The callback function to handle the result, same as in toArray.
        ///		</param>
        ///		<returns type="$data.Promise" />
        ///	</signature>
        ///	<signature>
        ///		<summary>Filters a set of entities using a boolean expression and returns a single element or throws an error if more than one element is filtered.</summary>
        ///		<param name="filterPredicate" type="Function">
        ///			Same as in filter.
        ///		</param>
        ///		<param name="onResult" type="Function">
        ///			The callback function to handle the result, same as in toArray.
        ///		</param>
        ///		<returns type="$data.Promise" />
        ///		<example>
        ///			Get "George" from the Person entity set. &#10;
        ///			Persons.single( function( person ) { return person.FirstName == this.name; }, { name: "George" }, {&#10;
        ///				success: function ( result ){ ... },&#10;
        ///				error: function () { ... }
        ///			});
        ///		</example>
        ///	</signature>

        this._checkOperation('single');
        var q = this;
        if (filterPredicate) {
            q = this.filter(filterPredicate, thisArg);
        }
        q = q.take(2);

        var pHandler = new _index2.default.PromiseHandler();
        var cbWrapper = pHandler.createCallback(onResult);

        var singleExpression = _index.Container.createSingleExpression(q.expression);
        var preparator = _index.Container.createQueryExpressionCreator(q.entityContext);
        try {
            var expression = preparator.Visit(singleExpression);
            this.entityContext.log({ event: "EntityExpression", data: expression });

            q.entityContext.executeQuery(_index.Container.createQueryable(q, expression), cbWrapper, transaction);
        } catch (e) {
            cbWrapper.error(e);
        }

        return pHandler.getPromise();
    },

    some: function some(filterPredicate, thisArg, onResult, transaction) {
        ///	<summary>Filters a set of entities using a boolean expression and returns true if the query has any result element.</summary>
        ///	<param name="filterPredicate" type="Function">Filter function</param>
        ///	<param name="thisArg" type="Function">The query parameters for filter function</param>
        ///	<param name="onResult_items" type="Function">A callback function</param>
        ///	<returns type="$data.Promise" />
        ///	<signature>
        ///		<summary>Filters a set of entities using a boolean expression and returns true if the query has any result element.</summary>
        ///		<param name="filterPredicate" type="string">
        ///			Same as in filter.
        ///		</param>
        ///		<param name="onResult" type="Function">
        ///			The callback function to handle the result, same as in toArray.
        ///		</param>
        ///		<returns type="$data.Promise" />
        ///	</signature>
        ///	<signature>
        ///		<summary>Filters a set of entities using a boolean expression and returns true if the query has any result element.</summary>
        ///		<param name="filterPredicate" type="Function">
        ///			Same as in filter.
        ///		</param>
        ///		<param name="onResult" type="Function">
        ///			The callback function to handle the result, same as in toArray.
        ///		</param>
        ///		<returns type="$data.Promise" />
        ///		<example>
        ///         Is there any person who's first name is "George"? &#10;
        ///			Persons.some( function( person ) { return person.FirstName == this.name; }, { name: "George" }, {&#10;
        ///				success: function ( result ){ ... },&#10;
        ///				error: function () { ... }
        ///			});
        ///		</example>
        ///	</signature>

        this._checkOperation('some');
        var q = this;
        if (filterPredicate) {
            q = this.filter(filterPredicate, thisArg);
        }
        q = q.take(1);

        var pHandler = new _index2.default.PromiseHandler();
        var cbWrapper = pHandler.createCallback(onResult);

        var someExpression = _index.Container.createSomeExpression(q.expression);
        var preparator = _index.Container.createQueryExpressionCreator(q.entityContext);
        try {
            var expression = preparator.Visit(someExpression);
            this.entityContext.log({ event: "EntityExpression", data: expression });

            q.entityContext.executeQuery(_index.Container.createQueryable(q, expression), cbWrapper, transaction);
        } catch (e) {
            cbWrapper.error(e);
        }

        return pHandler.getPromise();
    },

    every: function every(filterPredicate, thisArg, onResult, transaction) {
        ///	<summary>Filters a set of entities using a boolean expression and returns true if all elements of the EntitySet is in the result set.</summary>
        ///	<param name="filterPredicate" type="Function">Filter function</param>
        ///	<param name="thisArg" type="Function">The query parameters for filter function</param>
        ///	<param name="onResult_items" type="Function">A callback function</param>
        ///	<returns type="$data.Promise" />
        ///	<signature>
        ///		<summary>Filters a set of entities using a boolean expression and returns a </summary>
        ///		<param name="filterPredicate" type="string">
        ///			Same as in filter.
        ///		</param>
        ///		<param name="onResult" type="Function">
        ///			The callback function to handle the result, same as in toArray.
        ///		</param>
        ///		<returns type="$data.Promise" />
        ///	</signature>
        ///	<signature>
        ///		<summary>Filters a set of entities using a boolean expression and returns a single element or throws an error if more than one element is filtered.</summary>
        ///		<param name="filterPredicate" type="Function">
        ///			Same as in filter.
        ///		</param>
        ///		<param name="onResult" type="Function">
        ///			The callback function to handle the result, same as in toArray.
        ///		</param>
        ///		<returns type="$data.Promise" />
        ///		<example>
        ///			Result is true when all person are married. &#10;
        ///			Persons.every( function( person ) { return person.Married == true; }, null, {&#10;
        ///				success: function ( result ){ ... },&#10;
        ///				error: function () { ... }
        ///			});
        ///		</example>
        ///	</signature>

        this._checkOperation('every');
        var q = this;
        if (filterPredicate) {
            q = this.filter(filterPredicate, thisArg);
        }
        q = q.take(1);

        var pHandler = new _index2.default.PromiseHandler();
        var cbWrapper = pHandler.createCallback(onResult);

        var everyExpression = _index.Container.createEveryExpression(q.expression);
        var preparator = _index.Container.createQueryExpressionCreator(q.entityContext);
        try {
            var expression = preparator.Visit(everyExpression);
            this.entityContext.log({ event: "EntityExpression", data: expression });

            q.entityContext.executeQuery(_index.Container.createQueryable(q, expression), cbWrapper, transaction);
        } catch (e) {
            cbWrapper.error(e);
        }

        return pHandler.getPromise();
    },

    take: function take(amount) {
        ///	<summary>Returns only a specified number of elements from the start of the result set.</summary>
        ///	<param name="amount" type="$data.Integer">The number of elements to return.</param>
        ///	<returns type="$data.Queryable" />
        ///	<signature>
        ///		<summary>Returns only a specified number of elements from the start of the result set.</summary>
        ///		<param name="amount" type="$data.Integer">
        ///			The number of elements to skip.
        ///		</param>
        ///		<returns type="$data.Queryable" />
        ///		<example>
        ///			Log the full name of each Person. &#10;
        ///			Persons.take(10).forEach( function( person ) { console.log(person.FullName; } );
        ///		</example>
        ///	</signature>

        this._checkOperation('take');
        var constExp = _index.Container.createConstantExpression(amount, "integer");
        var takeExp = _index.Container.createPagingExpression(this.expression, constExp, _index2.default.Expressions.ExpressionType.Take);
        return _index.Container.createQueryable(this, takeExp);
    },
    skip: function skip(amount) {
        ///	<summary>Skip a specified number of elements from the start of the result set.</summary>
        ///	<param name="amount" type="$data.Integer">The number of elements to skip.</param>
        ///	<returns type="$data.Queryable" />
        ///	<signature>
        ///		<summary>Skip a specified number of elements from the start of the result set.</summary>
        ///		<param name="amount" type="$data.Integer">
        ///			The number of elements to skip.
        ///		</param>
        ///		<returns type="$data.Queryable" />
        ///		<example>
        ///			Log the full name of each Person. &#10;
        ///			Persons.skip(1).take(5).forEach( function( person ) { console.log(person.FullName; } );
        ///		</example>
        ///	</signature>

        this._checkOperation('skip');
        var constExp = _index.Container.createConstantExpression(amount, "integer");
        var takeExp = _index.Container.createPagingExpression(this.expression, constExp, _index2.default.Expressions.ExpressionType.Skip);
        return _index.Container.createQueryable(this, takeExp);
    },

    order: function order(selector) {
        if (selector === '' || selector === undefined || selector === null) {
            return this;
        }
        if (selector[0] === "-") {
            var orderString = "it." + selector.replace("-", "");
            return this.orderByDescending(orderString);
        } else {
            return this.orderBy("it." + selector);
        }
    },

    orderBy: function orderBy(selector, thisArg) {
        ///<summary>Order a set of entities using an expression.</summary>
        ///<param name="selector" type="Function">An order expression</param>
        ///<param name="thisArg" type="Object">The query parameters</param>
        ///<returns type="$data.Queryable" />
        ///<signature>
        ///<summary>Order a set of entities using an expression.</summary>
        ///<param name="selector" type="string">
        ///The expression body of the order function in string. &#10;
        ///To reference the lambda parameter use the 'it' context variable. &#10;
        ///Example: orderBy("it.Id")
        ///</param>
        ///<param name="thisArg" type="Object" />
        ///<returns type="$data.Queryable" />
        ///</signature>
        ///<signature>
        ///<summary>Order a set of entities using an expression.</summary>
        ///<param name="selector" type="Function">
        ///</param>
        ///<param name="thisArg" type="Object" optional="true">
        ///Contains the predicate parameters
        ///</param>
        ///<returns type="$data.Queryable" />
        ///<example>
        ///Ordering a set of entities with a predicate function&#10;
        ///var males = Persons.orderBy( function( person ) { return person.Id; } );
        ///</example>
        ///</signature>

        this._checkOperation('orderBy');
        var codeExpression = _index.Container.createCodeExpression(selector, thisArg);
        var exp = _index.Container.createOrderExpression(this.expression, codeExpression, _index2.default.Expressions.ExpressionType.OrderBy);
        var q = _index.Container.createQueryable(this, exp);
        return q;
    },
    orderByDescending: function orderByDescending(selector, thisArg) {
        ///<summary>Order a set of entities descending using an expression.</summary>
        ///<param name="selector" type="Function">An order expression</param>
        ///<param name="thisArg" type="Object">The query parameters</param>
        ///<returns type="$data.Queryable" />
        ///<signature>
        ///<summary>Order a set of entities descending using an expression.</summary>
        ///<param name="selector" type="string">
        ///The expression body of the order function in string. &#10;
        ///To reference the lambda parameter use the 'it' context variable. &#10;
        ///Example: orderBy("it.Id")
        ///</param>
        ///<param name="thisArg" type="Object" />
        ///<returns type="$data.Queryable" />
        ///</signature>
        ///<signature>
        ///<summary>Order a set of entities descending using an expression.</summary>
        ///<param name="selector" type="Function">
        ///</param>
        ///<param name="thisArg" type="Object" optional="true">
        ///Contains the predicate parameters
        ///</param>
        ///<returns type="$data.Queryable" />
        ///<example>
        ///Ordering a set of entities with a predicate function&#10;
        ///var males = Persons.orderByDescending( function( person ) { return person.Id; } );
        ///</example>
        ///</signature>

        this._checkOperation('orderByDescending');
        var codeExpression = _index.Container.createCodeExpression(selector, thisArg);
        var exp = _index.Container.createOrderExpression(this.expression, codeExpression, _index2.default.Expressions.ExpressionType.OrderByDescending);
        var q = _index.Container.createQueryable(this, exp);
        return q;
    },

    first: function first(filterPredicate, thisArg, onResult, transaction) {
        ///	<summary>Filters a set of entities using a boolean expression and returns the first element.</summary>
        ///	<param name="onResult_items" type="Function">A callback function</param>
        ///	<returns type="$data.Promise" />
        ///	<signature>
        ///		<summary>Filters a set of entities using a boolean expression and returns the first element.</summary>
        ///		<param name="filterPredicate" type="string">
        ///			Same as in filter.
        ///		</param>
        ///		<param name="onResult" type="Function">
        ///			The callback function to handle the result, same as in toArray.
        ///		</param>
        ///		<returns type="$data.Promise" />
        ///	</signature>
        ///	<signature>
        ///		<summary>Filters a set of entities using a boolean expression and returns the first element.</summary>
        ///		<param name="filterPredicate" type="Function">
        ///			Same as in filter.
        ///		</param>
        ///		<param name="onResult" type="Function">
        ///			The callback function to handle the result, same as in toArray.
        ///		</param>
        ///		<returns type="$data.Promise" />
        ///		<example>
        ///			Get "George" from the Person entity set. &#10;
        ///			Persons.first( function( person ) { return person.FirstName == this.name; }, { name: "George" }, function ( result ){ ... });
        ///		</example>
        ///	</signature>

        this._checkOperation('first');
        var q = this;
        if (filterPredicate) {
            q = this.filter(filterPredicate, thisArg);
        }
        q = q.take(1);

        var pHandler = new _index2.default.PromiseHandler();
        var cbWrapper = pHandler.createCallback(onResult);

        var firstExpression = _index.Container.createFirstExpression(q.expression);
        var preparator = _index.Container.createQueryExpressionCreator(q.entityContext);
        try {
            var expression = preparator.Visit(firstExpression);
            q.entityContext.log({ event: "EntityExpression", data: expression });

            q.entityContext.executeQuery(_index.Container.createQueryable(q, expression), cbWrapper, transaction);
        } catch (e) {
            cbWrapper.error(e);
        }

        return pHandler.getPromise();
    },

    find: function find(keyValue, onResult, transaction) {

        var pHandler = new _index2.default.PromiseHandler();
        var cbWrapper = pHandler.createCallback(onResult);

        var keys = this.defaultType.memberDefinitions.getKeyProperties();

        try {

            if (keys.length === 1 && (typeof keyValue === 'undefined' ? 'undefined' : _typeof(keyValue)) !== 'object') {
                var keyV = {};
                keyV[keys[0].name] = keyValue;
                keyValue = keyV;
            }

            if ((typeof keyValue === 'undefined' ? 'undefined' : _typeof(keyValue)) !== 'object') {
                throw new _index.Exception('Key parameter is invalid');
            } else {

                var parameters = [];
                for (var i = 0; i < keys.length; i++) {
                    var keyProp = keys[i];
                    if (!(keyProp.name in keyValue)) {
                        throw new _index.Exception('Key value missing');
                    }
                    parameters.push(_index.Container.createConstantExpression(keyValue[keyProp.name], keyProp.type, keyProp.name));
                }

                var operation = this.entityContext.storageProvider.supportedSetOperations['find'];
                if (operation) {

                    var findExpression = _index.Container.createFindExpression(this.expression, parameters);
                    var preparator = _index.Container.createQueryExpressionCreator(this.entityContext);
                    try {
                        var expression = preparator.Visit(findExpression);
                        this.entityContext.log({ event: "EntityExpression", data: expression });

                        this.entityContext.executeQuery(_index.Container.createQueryable(this, expression), cbWrapper, transaction);
                    } catch (e) {
                        cbWrapper.error(e);
                    }
                } else {
                    var predicate = '';
                    var params = {};
                    for (var i = 0; i < parameters.length; i++) {
                        var param = parameters[i];
                        params[param.name] = param.value;
                        if (i > 0) predicate += ' && ';
                        predicate += "it." + param.name + " == this." + param.name;
                    }

                    this.single(predicate, params, cbWrapper, transaction);
                }
            }
        } catch (e) {
            cbWrapper.error(e);
        }

        return pHandler.getPromise();
    },

    include: function include(selector) {
        ///	<summary>Includes the given entity set in the query if it's an inverse property.</summary>
        ///	<param name="selector" type="$data.String">Entity set name</param>
        ///	<returns type="$data.Queryable" />
        ///	<signature>
        ///		<summary>Includes the given entity set in the query if it's an inverse property.</summary>
        ///		<param name="selector" type="$data.String">
        ///			The name of the entity set you want to include in the query.
        ///		</param>
        ///		<returns type="$data.Queryable" />
        ///		<example>
        ///			Include the Category on every Article. &#10;
        ///			Articles.include("Category");
        ///		</example>
        ///	</signature>

        if (this.entityContext && this.entityContext.storageProvider && this.entityContext.storageProvider.name === "oData") {
            return this.include2.apply(this, arguments);
        }

        this._checkOperation('include');
        var constExp = _index.Container.createConstantExpression(selector, "string");
        var takeExp = _index.Container.createIncludeExpression(this.expression, constExp);
        return _index.Container.createQueryable(this, takeExp);
    },
    include2: function include2(selector, thisArg) {
        ///	<summary>Includes the given entity set in the query if it's an inverse property.</summary>
        ///	<param name="selector" type="$data.String">Entity set name</param>
        ///	<returns type="$data.Queryable" />
        ///	<signature>
        ///		<summary>Includes the given entity set in the query if it's an inverse property.</summary>
        ///		<param name="selector" type="$data.String">
        ///			The name of the entity set you want to include in the query.
        ///		</param>
        ///		<returns type="$data.Queryable" />
        ///		<example>
        ///			Include the Category on every Article. &#10;
        ///			Articles.include("Category");
        ///		</example>
        ///	</signature>

        this._checkOperation('include');
        if (typeof selector === 'string' && (selector.length < 3 || selector.substr(0, 3) !== 'it.') && !/^[^\.]*(=>)/.test(selector)) {
            selector = 'it.' + selector;
        }
        var expression = _index.Container.createCodeExpression(selector, thisArg);
        var includeExp = _index.Container.createIncludeExpression(this.expression, expression);

        return _index.Container.createQueryable(this, includeExp);
    },

    withInlineCount: function withInlineCount(selector) {
        this._checkOperation('withInlineCount');
        var constExp = _index.Container.createConstantExpression(selector || 'allpages', "string");
        var inlineCountExp = _index.Container.createInlineCountExpression(this.expression, constExp);
        return _index.Container.createQueryable(this, inlineCountExp);
    },
    withCount: function withCount(selector) {
        return this.withInlineCount(selector);
    },

    removeAll: function removeAll(onResult, transaction) {
        ///	<summary>Delete the query result and returns the number of deleted entities in a query as the callback parameter.</summary>
        ///	<param name="onResult" type="Function">A callback function</param>
        ///	<returns type="$data.Promise" />
        ///	<signature>
        ///		<summary>Delete the query result and returns the number of deleted entities in a query as the callback parameter.</summary>
        ///		<param name="onResult" type="Function">
        ///			The callback function to handle the result.
        ///		</param>
        ///		<returns type="$data.Promise" />
        ///	</signature>
        ///	<signature>
        ///		<summary>Delete the query result and returns the number of deleted entities in a query as the callback parameter.</summary>
        ///		<param name="onResult" type="Object">
        ///			Object of callback functions to handle success and error. &#10;
        ///			Example: { success: function(result) { ... }, error: function() { alert("Something went wrong..."); } }
        ///		</param>
        ///		<returns type="$data.Promise" />
        ///		<example>
        ///			Delete all People who are younger than 18 years old. &#10;
        ///			Persons.filter( function( p ){ return p.Age &#60; 18; } ).removeAll( function( result ) { console.dir(result); } );
        ///		</example>
        ///	</signature>

        this._checkOperation('batchDelete');
        var pHandler = new _index2.default.PromiseHandler();
        var cbWrapper = pHandler.createCallback(onResult);

        var batchDeleteExpression = _index.Container.createBatchDeleteExpression(this.expression);
        var preparator = _index.Container.createQueryExpressionCreator(this.entityContext);
        try {
            var expression = preparator.Visit(batchDeleteExpression);
            this.entityContext.log({ event: "EntityExpression", data: expression });

            this.entityContext.executeQuery(_index.Container.createQueryable(this, expression), cbWrapper, transaction);
        } catch (e) {
            cbWrapper.error(e);
        }

        return pHandler.getPromise();
    },

    _runQuery: function _runQuery(onResult_items, transaction) {
        var pHandler = new _index2.default.PromiseHandler();
        var cbWrapper = pHandler.createCallback(onResult_items);

        var preparator = _index.Container.createQueryExpressionCreator(this.entityContext);
        try {
            var expression = preparator.Visit(this.expression);
            this.entityContext.log({ event: "EntityExpression", data: expression });

            this.entityContext.executeQuery(_index.Container.createQueryable(this, expression), cbWrapper, transaction);
        } catch (e) {
            cbWrapper.error(e);
        }

        return pHandler.getPromise();
    },

    toTraceString: function toTraceString(name) {
        ///	<summary>Returns the trace string of the query.</summary>
        ///	<param name="name" type="$data.String">Name of the execution method (toArray, length, etc.).</param>
        ///	<returns type="$data.String" />
        ///	<signature>
        ///		<summary>Returns the trace string of the query.</summary>
        ///		<param name="name" type="$data.String">
        ///			Name of the execution method (toArray, length, etc.). Optional. Default value is "toArray".
        ///		</param>
        ///		<returns type="$data.String" />
        ///		<example>
        ///			Get the trace string for Articles.toArray() &#10;
        ///			Articles.toTraceString();
        ///		</example>
        ///	</signature>

        var expression = this.expression;

        if (name) {
            expression = _index.Container['create' + name + 'Expression'](expression);
        } else {
            expression = _index.Container.createToArrayExpression(expression);
        }

        var preparator = _index.Container.createQueryExpressionCreator(this.entityContext);
        expression = preparator.Visit(expression);

        //this.expression = expression;
        var q = _index.Container.createQueryable(this, expression);
        return q.entityContext.getTraceString(q);
    },

    _checkOperation: function _checkOperation(name) {
        var operation = this.entityContext.resolveSetOperations(name);
        if (operation.invokable != undefined && !operation.invokable) _index.Guard.raise(new _index.Exception("Operation '" + name + "' is not invokable with the provider"));
    },
    defaultType: {}

}, null);

exports.default = _index2.default;
module.exports = exports['default'];

},{"../TypeSystem/index.js":32}],110:[function(_dereq_,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _index = _dereq_('../TypeSystem/index.js');

var _index2 = _interopRequireDefault(_index);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

_index2.default.Class.define("$data.RelatedEntityProxy", null, null, {
    constructor: function constructor(entityKeyObject, navigationProperty, type, parent, context) {
        this._entityKeyObject = entityKeyObject;
        this._navigationProperty = navigationProperty;
        this._type = type;
        this._parent = parent;
        this._context = context;
    },
    _entityKeyObject: { type: _index2.default.Object },
    _ctxFactory: {},
    _type: {},
    _navigationProperty: { type: _index2.default.String },
    _parent: { type: '$data.RelatedEntityProxy' },
    _context: { type: '$data.EntityContext' },

    read: function read(onResult) {
        var pHandler = new _index2.default.PromiseHandler();
        var cbWrapper = pHandler.createCallback(onResult);

        try {
            var proxyChains = this._chainToArray();
            var firstProxy = proxyChains[0];
            var context = firstProxy._context;
            if (!context) {
                var storeToken = firstProxy._parent instanceof _index2.default.Entity ? firstProxy._parent.storeToken : firstProxy._type.storeToken;
                if (storeToken && typeof storeToken.factory === 'function') {
                    context = storeToken.factory();
                }
            }

            if (!context) throw new _index.Exception('ContextNotExists');

            var entitySet = null;
            var expression = null;
            if (firstProxy._parent instanceof _index2.default.Entity) {
                entitySet = context.getEntitySetFromElementType(firstProxy._parent.getType());

                var proxyClass = context._createRelatedEntityProxyClass(entitySet.elementType);
                proxyChains.unshift(new proxyClass(firstProxy._parent, undefined, entitySet.elementType));
            } else {
                entitySet = context.getEntitySetFromElementType(firstProxy._type);
            }

            expression = entitySet.expression;
            var returnType = null;

            for (var i = 0; i < proxyChains.length; i++) {
                var item = proxyChains[i];
                var keys = item._type.memberDefinitions.getKeyProperties();

                var parameters = [];
                for (var j = 0; j < keys.length; j++) {
                    var keyProp = keys[j];
                    if (!(keyProp.name in item._entityKeyObject)) {
                        throw new _index.Exception('Key value missing');
                    }
                    parameters.push(_index.Container.createConstantExpression(item._entityKeyObject[keyProp.name], keyProp.type, keyProp.name));
                }

                var member = undefined;
                if (item._navigationProperty) {
                    member = _index.Container.createMemberInfoExpression(item._navigationProperty);
                    returnType = item._navigationProperty.elementType;
                }
                expression = _index.Container.createFindExpression(expression, parameters, member);
            }

            var preparator = _index.Container.createQueryExpressionCreator(context);
            expression = preparator.Visit(expression);
            //context.log({ event: "EntityExpression", data: expression });

            var queryable = _index.Container.createQueryable(entitySet, expression);
            queryable.defaultType = returnType || queryable.defaultType;
            context.executeQuery(queryable, cbWrapper);
        } catch (e) {
            cbWrapper.error(e);
        }

        return pHandler.getPromise();
    },
    _chainToArray: function _chainToArray(result) {
        result = result || [];
        if (this._parent instanceof _index2.default.RelatedEntityProxy) {
            this._parent._chainToArray(result);
        }

        result.push(this);
        return result;
    }
}, {});

exports.default = _index2.default;
module.exports = exports['default'];

},{"../TypeSystem/index.js":32}],111:[function(_dereq_,module,exports){
'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; };

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _index = _dereq_('../TypeSystem/index.js');

var _index2 = _interopRequireDefault(_index);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

_index2.default.Class.define('$data.ServiceOperation', null, null, {}, {
    translateDefinition: function translateDefinition(propertyDef, name, definedBy) {
        propertyDef.serviceName = name;
        var memDef = new _index2.default.MemberDefinition(this.generateServiceOperation(propertyDef), this);
        memDef.name = name;
        return memDef;
    },
    generateServiceOperation: function generateServiceOperation(cfg) {

        var fn;
        if (cfg.serviceMethod) {
            var returnType = cfg.returnType ? _index.Container.resolveType(cfg.returnType) : {};
            if (returnType.isAssignableTo && returnType.isAssignableTo(_index2.default.Queryable)) {
                fn = cfg.serviceMethod;
            } else {
                fn = function fn() {
                    var lastParam = arguments[arguments.length - 1];

                    var pHandler = new _index2.default.PromiseHandler();
                    var cbWrapper;

                    var args = arguments;
                    if (typeof lastParam === 'function') {
                        cbWrapper = pHandler.createCallback(lastParam);
                        arguments[arguments.length - 1] = cbWrapper;
                    } else {
                        cbWrapper = pHandler.createCallback();
                        arguments.push(cbWrapper);
                    }

                    try {
                        var result = cfg.serviceMethod.apply(this, arguments);
                        if (result !== undefined) cbWrapper.success(result);
                    } catch (e) {
                        cbWrapper.error(e);
                    }

                    return pHandler.getPromise();
                };
            }
        } else {
            fn = function fn() {
                var context = this;
                var memberdef;

                var boundItem;
                if (this instanceof _index2.default.Entity || this instanceof _index2.default.EntitySet) {
                    var entitySet;
                    if (this instanceof _index2.default.Entity) {
                        if (this.context) {
                            context = this.context;
                            entitySet = context.getEntitySetFromElementType(this.getType());
                        } else if (this.storeToken && typeof this.storeToken.factory === 'function') {
                            context = this.storeToken.factory();
                            entitySet = context.getEntitySetFromElementType(this.getType());
                        } else {
                            _index.Guard.raise(new _index.Exception("entity can't resolve context", 'Not Found!', this));
                            return;
                        }
                    } else if (this instanceof _index2.default.EntitySet) {
                        context = this.entityContext;
                        entitySet = this;

                        var esDef = context.getType().getMemberDefinition(entitySet.name);
                        memberdef = _index2.default.MemberDefinition.translateDefinition(esDef.actions[cfg.serviceName], cfg.serviceName, entitySet.getType());
                    }

                    boundItem = {
                        data: this,
                        entitySet: entitySet
                    };
                }

                var virtualEntitySet = cfg.elementType ? context.getEntitySetFromElementType(_index.Container.resolveType(cfg.elementType)) : null;

                var paramConstExpression = null;
                if (cfg.params) {
                    paramConstExpression = [];
                    //object as parameter
                    //FIX: object type parameters with the same property name as the name of the first parameter
                    if (arguments[0] && _typeof(arguments[0]) === 'object' && arguments[0].constructor === _index2.default.Object && cfg.params && cfg.params[0] && cfg.params[0].name in arguments[0]) {
                        var argObj = arguments[0];
                        for (var i = 0; i < cfg.params.length; i++) {
                            var paramConfig = cfg.params[i];
                            if (paramConfig.name && paramConfig.type && paramConfig.name in argObj) {
                                paramConstExpression.push(_index.Container.createConstantExpression(argObj[paramConfig.name], _index.Container.resolveType(paramConfig.type), paramConfig.name, paramConfig.elementType));
                            }
                        }
                    }
                    //arg params
                    else {
                            for (var i = 0; i < cfg.params.length; i++) {
                                if (typeof arguments[i] == 'function') break;

                                //TODO: check params type
                                var paramConfig = cfg.params[i];
                                if (paramConfig.name && paramConfig.type && arguments[i] !== undefined) {
                                    paramConstExpression.push(_index.Container.createConstantExpression(arguments[i], _index.Container.resolveType(paramConfig.type), paramConfig.name, paramConfig.elementType));
                                }
                            }
                        }
                }

                var ec = _index.Container.createEntityContextExpression(context);
                if (!memberdef) {
                    if (boundItem && boundItem.data) {
                        memberdef = boundItem.data.getType().getMemberDefinition(cfg.serviceName);
                    } else {
                        memberdef = context.getType().getMemberDefinition(cfg.serviceName);
                    }
                }
                var es = _index.Container.createServiceOperationExpression(ec, _index.Container.createMemberInfoExpression(memberdef), paramConstExpression, cfg, boundItem);

                //Get callback function
                var clb = arguments[arguments.length - 1];
                if (!(typeof clb === 'function' || (typeof clb === 'undefined' ? 'undefined' : _typeof(clb)) === 'object' /*&& clb.constructor === $data.Object*/ && (typeof clb.success === 'function' || typeof clb.error === 'function'))) {
                    clb = undefined;
                }

                if (virtualEntitySet) {
                    var q = _index.Container.createQueryable(virtualEntitySet, es);
                    if (clb) {
                        es.isTerminated = true;
                        return q._runQuery(clb);
                    }
                    return q;
                } else {
                    var returnType = cfg.returnType ? _index.Container.resolveType(cfg.returnType) : null;

                    var q = _index.Container.createQueryable(context, es);
                    q.defaultType = returnType || _index2.default.Object;

                    if (returnType === _index2.default.Queryable) {
                        q.defaultType = _index.Container.resolveType(cfg.elementType);
                        if (clb) {
                            es.isTerminated = true;
                            return q._runQuery(clb);
                        }
                        return q;
                    }
                    es.isTerminated = true;
                    return q._runQuery(clb);
                }
            };
        };

        var params = cfg.params || [];
        _index2.default.typeSystem.extend(fn, cfg, { params: params });

        return fn;
    }
});

_index2.default.Class.define('$data.ServiceAction', _index2.default.ServiceOperation, null, {}, {
    generateServiceOperation: function generateServiceOperation(cfg) {
        if (!cfg.method) {
            cfg.method = 'POST'; //default Action method is POST
        }

        return _index2.default.ServiceOperation.generateServiceOperation.apply(this, arguments);
    }
});

_index2.default.Class.define('$data.ServiceFunction', _index2.default.ServiceOperation, null, {}, {
    generateServiceOperation: function generateServiceOperation(cfg) {
        if (!cfg.method) {
            cfg.method = 'GET'; //default Function method is GET
        }

        return _index2.default.ServiceOperation.generateServiceOperation.apply(this, arguments);
    }
});

exports.default = _index2.default;
module.exports = exports['default'];

},{"../TypeSystem/index.js":32}],112:[function(_dereq_,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _index = _dereq_('../TypeSystem/index.js');

var _index2 = _interopRequireDefault(_index);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

_index2.default.storageProviders = {
    DbCreationType: {
        Merge: 10,
        DropTableIfChanged: 20,
        DropTableIfChange: 20,
        DropAllExistingTables: 30,
        ErrorIfChange: 40,
        DropDbIfChange: 50
    }
};

_index2.default.ConcurrencyMode = { Fixed: 'fixed', None: 'none' };
_index2.default.Class.define('$data.StorageProviderBase', null, null, {
    constructor: function constructor(schemaConfiguration, context) {
        this.providerConfiguration = schemaConfiguration || {};

        this.name = this.getType().name;
        if (_index2.default.RegisteredStorageProviders) {
            var keys = Object.keys(_index2.default.RegisteredStorageProviders);
            for (var i = 0; i < keys.length; i++) {
                if (this instanceof _index2.default.RegisteredStorageProviders[keys[i]]) {
                    this.name = keys[i];
                    break;
                }
            }
        }
    },
    providers: {},
    supportedDataTypes: { value: [], writable: false },
    initializeStore: function initializeStore(callBack) {
        _index.Guard.raise("Pure class");
    },

    executeQuery: function executeQuery(queryable, callBack) {
        _index.Guard.raise("Pure class");
    },
    loadRawData: function loadRawData(tableName, callBack) {
        callBack = _index2.default.PromiseHandlerBase.createCallbackSettings(callBack);
        callBack.error(new _index.Exception('loadRawData is not supported', 'Invalid Operation'));
    },

    buildIndependentBlocks: function buildIndependentBlocks(changedItems) {
        /// <summary>
        /// Build and processes a dependency graph from the changed items,
        /// and generates blocks that can be inserted to the database sequentially.
        /// </summary>
        /// <param name="changedItems">Array of changed items to build independent blocks from.</param>
        var edgesTo = [];
        var edgesFrom = [];

        function hasOwnProperty(obj) {
            /// <summary>
            /// Returns true if object has own property (used for 'hashset'-like objects)
            /// </summary>
            /// <param name="obj">Target object</param>
            /// <returns>True if the object has own property</returns>
            for (var p in obj) {
                if (obj.hasOwnProperty(p)) return true;
            }
            return false;
        }

        // Building edgesTo and edgesFrom arrays (containing only indeces of items in changedItems array.
        for (var i = 0; i < changedItems.length; i++) {
            var current = changedItems[i];
            if (!current.dependentOn || current.dependentOn.length == 0) {
                // This item is independent
                continue;
            }

            var to = null;
            // Iterating over items 'current' depends on
            for (var j = 0; j < current.dependentOn.length; j++) {
                var currentDependency = current.dependentOn[j];
                if (currentDependency.entityState == _index2.default.EntityState.Unchanged) {
                    continue;
                }
                to = to || {};
                // Getting the index of current dependency
                var ixDependendOn = -1;
                for (var k = 0; k < changedItems.length; k++) {
                    if (changedItems[k].data == currentDependency) {
                        ixDependendOn = k;
                        changedItems[k].referredBy = changedItems[k].referredBy || [];
                        changedItems[k].referredBy.push(current.data);
                        break;
                    }
                }
                // Sanity check
                if (ixDependendOn == -1) {
                    _index.Guard.raise(new _index.Exception('Dependent object not found', 'ObjectNotFound', current.dependentOn[j]));
                }
                // Setting edge in 'to' array
                to[ixDependendOn] = true;
                // Setting edge in 'from' array
                var from = edgesFrom[ixDependendOn] || {};
                from[i] = true;
                edgesFrom[ixDependendOn] = from;
            }
            // Persisting found edges in edgesTo array
            if (to !== null) edgesTo[i] = to;
        }

        // Array of sequentialyl independent blocks (containing objects, not just their id's)
        var independentBlocks = [];
        // Objects getting their dependency resolved in the current cycle.
        var currentBlock = [];
        // Filling currentBlock with initially independent objects.
        for (var x = 0; x < changedItems.length; x++) {
            if (!edgesTo.hasOwnProperty(x)) {
                currentBlock.push(x);
            }
        }
        while (currentBlock.length > 0) {
            // Shifting currentBlock to cbix,
            // and clearing currentBlock for next independent block
            var cbix = [].concat(currentBlock);
            currentBlock = [];
            // Iterating over previous independent block, to generate the new one
            for (var b = 0; b < cbix.length; b++) {
                var dependentNodes = edgesFrom[cbix[b]];
                if (typeof dependentNodes !== 'undefined') {
                    for (var d in dependentNodes) {
                        // Removing edge from 'edgesTo'
                        delete edgesTo[d][cbix[b]];
                        // Check if has any more dependency
                        if (!hasOwnProperty(edgesTo[d])) {
                            // It doesn't, so let's clean up a bit
                            delete edgesTo[d];
                            // and push the item to 'currentBlock'
                            currentBlock.push(d);
                        }
                    }
                }
                // Clearing processed item from 'edgesFrom'
                delete edgesFrom[cbix[b]];
            }
            // Push cbix t to independentBlocks
            var cb = [];
            for (var c = 0; c < cbix.length; c++) {
                var item = changedItems[cbix[c]];
                if (item.data.entityState != _index2.default.EntityState.Unchanged) cb.push(item);
            }
            if (cb.length > 0) independentBlocks.push(cb);
        }
        return independentBlocks;
    },
    getTraceString: function getTraceString(queryable) {
        _index.Guard.raise("Pure class");
    },
    setContext: function setContext(ctx) {
        this.context = ctx;
    },

    _buildContinuationFunction: function _buildContinuationFunction(context, query) {
        if (Array.isArray(query.result)) {
            query.result.next = this._buildPagingMethod(context, query, 'next');
            query.result.prev = this._buildPagingMethod(context, query, 'prev');
        }
    },
    _buildPagingMethod: function _buildPagingMethod(context, query, mode) {
        return function (onResult_items) {
            var pHandler = new _index2.default.PromiseHandler();
            var cbWrapper = pHandler.createCallback(onResult_items);

            var continuation = new _index2.default.Expressions.ContinuationExpressionBuilder(mode);
            var continuationResult = continuation.compile(query);
            if (continuationResult.expression) {
                var queryable = _index.Container.createQueryable(context, continuationResult.expression);
                queryable.defaultType = query.defaultType;
                context.executeQuery(queryable, cbWrapper);
            } else {
                cbWrapper.error(new _index.Exception(continuationResult.message, 'Invalid Operation', continuationResult));
            }

            return pHandler.getPromise();
        };
    },

    buildDbType_modifyInstanceDefinition: function buildDbType_modifyInstanceDefinition(instanceDefinition, storageModel) {
        var buildDbType_copyPropertyDefinition = function buildDbType_copyPropertyDefinition(propertyDefinition, refProp) {
            var cPropertyDef;
            if (refProp) {
                cPropertyDef = JSON.parse(JSON.stringify(instanceDefinition[refProp]));
                cPropertyDef.kind = propertyDefinition.kind;
                cPropertyDef.name = propertyDefinition.name;
                cPropertyDef.notMapped = false;
            } else {
                cPropertyDef = JSON.parse(JSON.stringify(propertyDefinition));
            }

            cPropertyDef.dataType = _index.Container.resolveType(propertyDefinition.dataType);
            cPropertyDef.type = cPropertyDef.dataType;
            cPropertyDef.key = false;
            cPropertyDef.computed = false;
            return cPropertyDef;
        };
        var buildDbType_createConstrain = function buildDbType_createConstrain(foreignType, dataType, propertyName, prefix, keyPropertyName) {
            var constrain = new Object();
            constrain[foreignType.name] = propertyName;
            constrain[dataType.name] = keyPropertyName ? keyPropertyName : prefix + '__' + propertyName;
            return constrain;
        };

        if (storageModel.Associations) {
            storageModel.Associations.forEach(function (association) {
                var addToEntityDef = false;
                var foreignType = association.FromType;
                var dataType = association.ToType;
                var foreignPropName = association.ToPropertyName;

                var memDef = association.FromType.getMemberDefinition(association.FromPropertyName);
                var keyProperties = [];
                if (memDef && typeof memDef.keys === "string" && memDef.keys) {
                    keyProperties = [memDef.keys];
                } else if (memDef && Array.isArray(memDef.keys)) {
                    keyProperties = [].concat(memDef.keys);
                }

                association.ReferentialConstraint = association.ReferentialConstraint || [];

                if (association.FromMultiplicity == "*" && association.ToMultiplicity == "0..1" || association.FromMultiplicity == "0..1" && association.ToMultiplicity == "1") {
                    foreignType = association.ToType;
                    dataType = association.FromType;
                    foreignPropName = association.FromPropertyName;
                    addToEntityDef = true;
                }

                foreignType.memberDefinitions.getPublicMappedProperties().filter(function (d) {
                    return d.key;
                }).forEach(function (d, i) {
                    var constraint = buildDbType_createConstrain(foreignType, dataType, d.name, foreignPropName, keyProperties[i]);
                    if (addToEntityDef) {
                        //instanceDefinition[foreignPropName + '__' + d.name] = buildDbType_copyPropertyDefinition(d, foreignPropName);
                        instanceDefinition[constraint[dataType.name]] = buildDbType_copyPropertyDefinition(d, foreignPropName);

                        var dependentMemDef = dataType.getMemberDefinition(keyProperties[i]);
                        if (dependentMemDef) {
                            dependentMemDef.isDependentProperty = true;
                            dependentMemDef.navigationPropertyName = association.FromPropertyName;
                        }
                    }
                    association.ReferentialConstraint.push(constraint);
                }, this);
            }, this);
        }
        //Copy complex type properties
        if (storageModel.ComplexTypes) {
            storageModel.ComplexTypes.forEach(function (complexType) {
                complexType.ReferentialConstraint = complexType.ReferentialConstraint || [];

                complexType.ToType.memberDefinitions.getPublicMappedProperties().forEach(function (d) {
                    instanceDefinition[complexType.FromPropertyName + '__' + d.name] = buildDbType_copyPropertyDefinition(d);
                    complexType.ReferentialConstraint.push(buildDbType_createConstrain(complexType.ToType, complexType.FromType, d.name, complexType.FromPropertyName));
                }, this);
            }, this);
        }
    },
    buildDbType_generateConvertToFunction: function buildDbType_generateConvertToFunction(storageModel) {
        return function (logicalEntity) {
            var dbInstance = new storageModel.PhysicalType();
            dbInstance.entityState = logicalEntity.entityState;

            //logicalEntity.changedProperties.forEach(function(memberDef){
            //}, this);
            storageModel.PhysicalType.memberDefinitions.getPublicMappedProperties().forEach(function (property) {
                if (logicalEntity[property.name] !== undefined) {
                    dbInstance[property.name] = logicalEntity[property.name];
                }
            }, this);

            if (storageModel.Associations) {
                storageModel.Associations.forEach(function (association) {
                    if (association.FromMultiplicity == "*" && association.ToMultiplicity == "0..1" || association.FromMultiplicity == "0..1" && association.ToMultiplicity == "1") {
                        var complexInstance = logicalEntity[association.FromPropertyName];
                        if (complexInstance !== undefined) {
                            association.ReferentialConstraint.forEach(function (constrain) {
                                if (complexInstance !== null) {
                                    dbInstance[constrain[association.From]] = complexInstance[constrain[association.To]];
                                } else {
                                    dbInstance[constrain[association.From]] = null;
                                }
                            }, this);
                        }
                    }
                }, this);
            }
            if (storageModel.ComplexTypes) {
                storageModel.ComplexTypes.forEach(function (cmpType) {
                    var complexInstance = logicalEntity[cmpType.FromPropertyName];
                    if (complexInstance !== undefined) {
                        cmpType.ReferentialConstraint.forEach(function (constrain) {
                            if (complexInstance !== null) {
                                dbInstance[constrain[cmpType.From]] = complexInstance[constrain[cmpType.To]];
                            } else {
                                dbInstance[constrain[cmpType.From]] = null;
                            }
                        }, this);
                    }
                }, this);
            }
            return dbInstance;
        };
    },

    bulkInsert: function bulkInsert(a, b, c, callback) {
        callback.error(new _index.Exception('Not Implemented'));
    },

    supportedFieldOperations: {
        value: {
            length: { dataType: "number", allowedIn: "filter, map" },
            substr: { dataType: "string", allowedIn: "filter", parameters: [{ name: "startFrom", dataType: "number" }, { name: "length", dataType: "number" }] },
            toLowerCase: { dataType: "string" }
        },
        enumerable: true,
        writable: true
    },

    resolveFieldOperation: function resolveFieldOperation(operationName, expression, frameType) {
        ///<summary></summary>
        var result = this.supportedFieldOperations[operationName];
        if (Array.isArray(result)) {
            var i = 0;
            for (; i < result.length; i++) {
                if (result[i].allowedType === 'default' || _index.Container.resolveType(result[i].allowedType) === _index.Container.resolveType(expression.selector.memberDefinition.type) && frameType && result[i].allowedIn && (Array.isArray(result[i].allowedIn) && result[i].allowedIn.some(function (type) {
                    return frameType === _index.Container.resolveType(type);
                }) || !Array.isArray(result[i].allowedIn) && frameType === _index.Container.resolveType(result[i].allowedIn))) {
                    result = result[i];
                    break;
                }
            }
            if (i === result.length) {
                result = undefined;
            }
        }

        if (!result) {
            _index.Guard.raise(new _index.Exception("Field operation '" + operationName + "' is not supported by the provider"));
        };
        if (frameType && result.allowedIn) {
            if (result.allowedIn instanceof Array && !result.allowedIn.some(function (type) {
                return frameType === _index.Container.resolveType(type);
            }) || !(result.allowedIn instanceof Array) && frameType !== _index.Container.resolveType(result.allowedIn)) {
                _index.Guard.raise(new _index.Exception(operationName + " not supported in: " + frameType.name));
            }
        }
        result.name = operationName;
        return result;
    },

    supportedBinaryOperators: {
        value: {
            equal: { mapTo: 'eq', dataType: "boolean" }
        },
        enumerable: true,
        writable: true
    },

    resolveBinaryOperator: function resolveBinaryOperator(operator, expression, frameType) {
        var result = this.supportedBinaryOperators[operator];
        if (!result) {
            _index.Guard.raise(new _index.Exception("Binary operator '" + operator + "' is not supported by the provider"));
        };
        if (frameType && result.allowedIn) {
            if (result.allowedIn instanceof Array && !result.allowedIn.some(function (type) {
                return frameType === _index.Container.resolveType(type);
            }) || !(result.allowedIn instanceof Array) && frameType !== _index.Container.resolveType(result.allowedIn)) {
                _index.Guard.raise(new _index.Exception(operator + " not supported in: " + frameType.name));
            }
        }
        result.name = operator;
        return result;
    },

    supportedUnaryOperators: {
        value: {
            not: { mapTo: 'not' }
        },
        enumerable: true,
        writable: true
    },
    resolveUnaryOperator: function resolveUnaryOperator(operator, expression, frameType) {
        var result = this.supportedUnaryOperators[operator];
        if (!result) {
            _index.Guard.raise(new _index.Exception("Unary operator '" + operator + "' is not supported by the provider"));
        };
        if (frameType && result.allowedIn) {
            if (result.allowedIn instanceof Array && !result.allowedIn.some(function (type) {
                return frameType === _index.Container.resolveType(type);
            }) || !(result.allowedIn instanceof Array) && frameType !== _index.Container.resolveType(result.allowedIn)) {
                _index.Guard.raise(new _index.Exception(operator + " not supported in: " + frameType.name));
            }
        }
        result.name = operator;
        return result;
    },

    supportedSetOperations: {
        value: {
            toArray: { invokable: true, allowedIn: [] }
        },
        enumerable: true,
        writable: true
    },
    resolveSetOperations: function resolveSetOperations(operation, expression, frameType) {
        var result = this.supportedSetOperations[operation];
        if (!result) {
            _index.Guard.raise(new _index.Exception("Operation '" + operation + "' is not supported by the provider"));
        };
        var allowedIn = result.allowedIn || [];
        if (frameType && allowedIn) {
            if (allowedIn instanceof Array && !allowedIn.some(function (type) {
                return frameType === _index.Container.resolveType(type);
            }) || !(allowedIn instanceof Array) && frameType !== _index.Container.resolveType(allowedIn)) {
                _index.Guard.raise(new _index.Exception(operation + " not supported in: " + frameType.name));
            }
        }
        return result;
    },

    resolveTypeOperations: function resolveTypeOperations(operation, expression, frameType) {
        _index.Guard.raise(new _index.Exception("Entity '" + expression.entityType.name + "' Operation '" + operation + "' is not supported by the provider"));
    },

    resolveContextOperations: function resolveContextOperations(operation, expression, frameType) {
        _index.Guard.raise(new _index.Exception("Context '" + expression.instance.getType().name + "' Operation '" + operation + "' is not supported by the provider"));
    },

    makePhysicalTypeDefinition: function makePhysicalTypeDefinition(entityDefinition, association) {},

    _beginTran: function _beginTran(tables, isWrite, callBack) {
        callBack.success(new _index2.default.Transaction());
    },

    getFieldUrl: function getFieldUrl() {
        return '#';
    },

    supportedAutoincrementKeys: {
        value: {}
    }
}, {
    onRegisterProvider: { value: new _index2.default.Event() },
    registerProvider: function registerProvider(name, provider) {
        this.onRegisterProvider.fire({ name: name, provider: provider }, this);
        _index2.default.RegisteredStorageProviders = _index2.default.RegisteredStorageProviders || [];
        _index2.default.RegisteredStorageProviders[name] = provider;
    },
    getProvider: function getProvider(name) {
        var provider = _index2.default.RegisteredStorageProviders[name];
        if (!provider) console.warn("Provider not found: '" + name + "'");
        return provider;
        /*var provider = $data.RegisteredStorageProviders[name];
        if (!provider)
            Guard.raise(new Exception("Provider not found: '" + name + "'", "Not Found"));
        return provider;*/
    },
    isSupported: {
        get: function get() {
            return true;
        },
        set: function set() {}
    }
});

exports.default = _index2.default;
module.exports = exports['default'];

},{"../TypeSystem/index.js":32}],113:[function(_dereq_,module,exports){
(function (process){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _index = _dereq_('../TypeSystem/index.js');

var _index2 = _interopRequireDefault(_index);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

_index2.default.Class.define('$data.StorageProviderLoaderBase', null, null, {
    isSupported: function isSupported(providerName) {
        _index2.default.Trace.log('Detecting ' + providerName + ' provider support');
        var supported = true;
        switch (providerName) {
            case 'indexedDb':
                supported = _index2.default.__global.indexedDB || _index2.default.__global.webkitIndexedDB || _index2.default.__global.mozIndexedDB || _index2.default.__global.msIndexedDB && !/^file:/.test(_index2.default.__global.location && _index2.default.__global.location.href);
                break;
            case 'storm':
                supported = 'XMLHttpRequest' in _index2.default.__global;
                break;
            case 'webSql':
            case 'sqLite':
                supported = 'openDatabase' in _index2.default.__global;
                break;
            case 'LocalStore':
                supported = 'localStorage' in _index2.default.__global && _index2.default.__global.localStorage ? true : false;
                break;
            case 'sqLite':
                supported = 'openDatabase' in _index2.default.__global;
                break;
            case 'mongoDB':
                supported = _index2.default.mongoDBDriver;
                break;
            default:
                break;
        }
        _index2.default.Trace.log(providerName + ' provider is ' + (supported ? '' : 'not') + ' supported');
        return supported;
    },
    scriptLoadTimeout: { type: 'int', value: 1000 },
    scriptLoadInterval: { type: 'int', value: 50 },
    npmModules: {
        value: {
            'indexedDb': 'jaydata-indexeddb',
            'InMemory': 'jaydata-inmemory',
            'LocalStore': 'jaydata-inmemory',
            'mongoDB': 'jaydata-mongodb',
            'oData': 'jaydata-odata',
            'webApi': 'jaydata-webapi',
            'sqLite': 'jaydata-sqlite',
            'webSql': 'jaydata-sqlite',
            'storm': 'jaydata-storm'
        }
    },
    ProviderNames: {
        value: {
            'indexedDb': 'IndexedDb',
            'InMemory': 'InMemory',
            'LocalStore': 'InMemory',
            'oData': 'oData',
            'webApi': 'WebApi',
            'sqLite': 'SqLite',
            'webSql': 'SqLite',
            'storm': 'Storm'
        }
    },
    load: function load(providerList, callback) {
        _index2.default.RegisteredStorageProviders = _index2.default.RegisteredStorageProviders || {};

        _index2.default.Trace.log('Loading provider(s): ' + providerList);
        callback = _index2.default.PromiseHandlerBase.createCallbackSettings(callback);

        var self = this;
        var cacheKey = providerList.join(',');
        self._fallbackCache = self._fallbackCache || {};

        if (self._fallbackCache[cacheKey]) {
            callback.success(self._fallbackCache[cacheKey]);
        } else {
            this.find(providerList, {
                success: function success(provider, selectedProvider) {
                    self._fallbackCache[cacheKey] = provider;
                    callback.success.call(this, provider);
                },
                error: callback.error
            });
        }
    },
    find: function find(providerList, callback) {
        var currentProvider = providerList.shift();
        var currentProvider = this.getVirtual(currentProvider);
        if (Array.isArray(currentProvider)) {
            providerList = currentProvider;
            currentProvider = providerList.shift();
        }

        while (currentProvider && !this.isSupported(currentProvider)) {
            currentProvider = providerList.shift();
        }

        _index2.default.Trace.log('First supported provider is ' + currentProvider);

        if (!currentProvider) {
            _index2.default.Trace.log('Provider fallback failed');
            callback.error();
        }

        if (_index2.default.RegisteredStorageProviders) {
            _index2.default.Trace.log('Is the ' + currentProvider + ' provider already registered?');
            var provider = _index2.default.RegisteredStorageProviders[currentProvider];
            if (provider) {
                _index2.default.Trace.log(currentProvider + ' provider registered');
                callback.success(provider);
                return;
            } else {
                _index2.default.Trace.log(currentProvider + ' provider not registered');
            }
        }

        if (!process.browser) {
            // NodeJS
            _index2.default.Trace.log('node.js detected trying to load NPM module');
            this.loadNpmModule(currentProvider, providerList, callback);
        } else {
            _index2.default.Trace.log('Browser detected trying to load provider');
            this.loadProvider(currentProvider, providerList, callback);
        }
    },
    loadProvider: function loadProvider(currentProvider, providerList, callback) {
        var self = this;
        var mappedName = _index2.default.StorageProviderLoader.ProviderNames[currentProvider] || currentProvider;
        _index2.default.Trace.log(currentProvider + ' provider is mapped to name ' + mappedName + 'Provider');
        if (mappedName) {
            var url = this.getUrl(mappedName);
            _index2.default.Trace.log(currentProvider + ' provider from URL: ' + url);

            var loader = this.loadScript;
            if (document && document.createElement) {
                _index2.default.Trace.log('document and document.createElement detected, using script element loader method');
                loader = this.loadScriptElement;
            }

            loader.call(this, url, currentProvider, function (successful) {
                var provider = _index2.default.RegisteredStorageProviders[currentProvider];
                if (successful && provider) {
                    _index2.default.Trace.log(currentProvider + ' provider successfully registered');
                    callback.success(provider);
                } else if (providerList.length > 0) {
                    _index2.default.Trace.log(currentProvider + ' provider failed to load, trying to fallback to ' + providerList + ' provider(s)');
                    self.find(providerList, callback);
                } else {
                    _index2.default.Trace.log(currentProvider + ' provider failed to load');
                    callback.error();
                }
            });
        }
    },
    getUrl: function getUrl(providerName) {
        var jaydataScriptMin = document.querySelector('script[src$="jaydata.min.js"]');
        var jaydataScript = document.querySelector('script[src$="jaydata.js"]');
        if (jaydataScriptMin) return jaydataScriptMin.src.substring(0, jaydataScriptMin.src.lastIndexOf('/') + 1) + 'jaydataproviders/' + providerName + 'Provider.min.js';else if (jaydataScript) return jaydataScript.src.substring(0, jaydataScript.src.lastIndexOf('/') + 1) + 'jaydataproviders/' + providerName + 'Provider.js';else return 'jaydataproviders/' + providerName + 'Provider.js';
    },
    loadScript: function loadScript(url, currentProvider, callback) {
        if (!url) {
            callback(false);
            return;
        }

        function getHttpRequest() {
            if (_index2.default.__global.XMLHttpRequest) return new XMLHttpRequest();else if (_index2.default.__global.ActiveXObject !== undefined) return new ActiveXObject("MsXml2.XmlHttp");else {
                _index2.default.Trace.log('XMLHttpRequest or MsXml2.XmlHttp ActiveXObject not found');
                callback(false);
                return;
            }
        }

        var oXmlHttp = getHttpRequest();
        oXmlHttp.onreadystatechange = function () {
            _index2.default.Trace.log('HTTP request is in state: ' + oXmlHttp.readyState);
            if (oXmlHttp.readyState == 4) {
                if (oXmlHttp.status == 200 || oXmlHttp.status == 304) {
                    _index2.default.Trace.log('HTTP request succeeded');
                    _index2.default.Trace.log('HTTP request response text: ' + oXmlHttp.responseText);
                    eval.call(_index2.default.__global, oXmlHttp.responseText);
                    if (typeof callback === 'function') callback(true);else _index2.default.Trace.log('Callback function is undefined');
                } else {
                    _index2.default.Trace.log('HTTP request status: ', oXmlHttp.status);
                    if (typeof callback === 'function') callback(false);else _index2.default.Trace.log('Callback function is undefined');
                }
            }
        };
        oXmlHttp.open('GET', url, true);
        oXmlHttp.send(null);
    },
    loadScriptElement: function loadScriptElement(url, currentProvider, callback) {
        var head = document.getElementsByTagName('head')[0] || document.documentElement;

        var script = document.createElement('script');
        script.type = 'text/javascript';
        script.src = url;
        _index2.default.Trace.log('Appending child ' + script + ' to ' + head);
        head.appendChild(script);

        var loadInterval = this.scriptLoadInterval || 50;
        var iteration = Math.ceil(this.scriptLoadTimeout / loadInterval);
        _index2.default.Trace.log('Script element watcher iterating ' + iteration + ' times');
        function watcher() {
            _index2.default.Trace.log('Script element watcher iteration ' + iteration);
            var provider = _index2.default.RegisteredStorageProviders[currentProvider];
            if (provider) {
                _index2.default.Trace.log(currentProvider + ' provider registered');
                callback(true);
            } else {
                iteration--;
                if (iteration > 0) {
                    _index2.default.Trace.log('Script element watcher next iteration');
                    setTimeout(watcher, loadInterval);
                } else {
                    _index2.default.Trace.log('Script element loader failed');
                    callback(false);
                }
            }
        }
        setTimeout(watcher, loadInterval);
    },

    loadNpmModule: function loadNpmModule(currentProvider, providerList, callback) {
        var provider = null;
        try {
            _dereq_(this.npmModules[currentProvider]);
            provider = _index2.default.RegisteredStorageProviders[currentProvider];
            _index2.default.Trace.log('NPM module loader successfully registered ' + currentProvider + ' provider');
        } catch (e) {
            _index2.default.Trace.log('NPM module loader failed for ' + currentProvider + ' provider');
        }

        if (provider) {
            callback.success(provider);
        } else if (providerList.length > 0) {
            this.find(providerList, callback);
        } else {
            callback.error();
        }
    },

    virtualProviders: {
        type: _index2.default.Array,
        value: {
            local: {
                fallbacks: ['webSql', 'indexedDb', 'LocalStore']
            }
        }
    },
    getVirtual: function getVirtual(name) {
        if (this.virtualProviders[name]) return [].concat(this.virtualProviders[name].fallbacks);

        return name;
    }
});

_index2.default.StorageProviderLoader = new _index2.default.StorageProviderLoaderBase();

exports.default = _index2.default;
module.exports = exports['default'];

}).call(this,_dereq_('_process'))

},{"../TypeSystem/index.js":32,"_process":14}],114:[function(_dereq_,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _index = _dereq_('../../TypeSystem/index.js');

var _index2 = _interopRequireDefault(_index);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

(0, _index.$C)('$data.modelBinder.FindProjectionVisitor', _index2.default.Expressions.EntityExpressionVisitor, null, {
    constructor: function constructor(includes) {
        this._includes = includes;
    },
    VisitProjectionExpression: function VisitProjectionExpression(expression, context) {
        this.projectionExpression = this.projectionExpression || expression;
        context && (context.projectionExpression = context.projectionExpression || expression);
        this.Visit(expression.source, context);
    },
    VisitIncludeExpression: function VisitIncludeExpression(expression, context) {
        this.Visit(expression.source, context);
        if (!(expression.selector instanceof _index2.default.Expressions.ConstantExpression)) {
            var selectorContext = {};
            this.Visit(expression.selector.expression, selectorContext);

            if (selectorContext.hasIncludeProjectionExpression) {
                var include = this._includes.filter(function (it) {
                    return it.name === selectorContext.includePath;
                })[0];
                if (include) {
                    include.projectionExpression = selectorContext.includeProjectionExpression;
                }

                context && (context.hasIncludeProjectionExpression = true);
            }
        }
    },
    VisitFrameOperationExpression: function VisitFrameOperationExpression(expression, context) {
        this.Visit(expression.source, context);

        var opDef = expression.operation.memberDefinition;
        if (opDef && opDef.frameType === _index2.default.Expressions.ProjectionExpression) {
            var paramCounter = 0;
            var params = opDef.parameters || [{ name: "@expression" }];

            var args = params.map(function (item, index) {
                if (item.name === "@expression") {
                    return expression.source;
                } else {
                    return expression.parameters[paramCounter++];
                };
            });

            for (var i = 0; i < args.length; i++) {
                var arg = args[i];

                if (arg instanceof _index2.default.Expressions.ConstantExpression && arg.value instanceof _index2.default.Queryable) {
                    var preparator = _index.Container.createQueryExpressionCreator(arg.value.entityContext);
                    arg = preparator.Visit(arg.value.expression);
                }

                var visitor = new _index2.default.modelBinder.FindProjectionVisitor(this._inculdes);
                var visitorContext = {};
                var compiled = visitor.Visit(arg, visitorContext);

                if (context && visitorContext.projectionExpression) {
                    context.hasIncludeProjectionExpression = true;
                    context.includeProjectionExpression = visitorContext.projectionExpression;
                }
            }
        }
    },
    VisitAssociationInfoExpression: function VisitAssociationInfoExpression(expression, context) {
        var propName = expression.associationInfo.FromPropertyName;

        if (context) {
            context.includePath = context.includePath ? context.includePath + '.' : "";
            context.includePath += propName;
        }
    }
});

(0, _index.$C)('$data.modelBinder.ModelBinderConfigCompiler', _index2.default.Expressions.EntityExpressionVisitor, null, {
    constructor: function constructor(query, includes, oDataProvider) {
        this._query = query;
        this._includes = includes;
        this._isoDataProvider = oDataProvider || false;
        this.depth = [];
    },
    VisitSingleExpression: function VisitSingleExpression(expression) {
        this._defaultModelBinder(expression);
    },
    VisitSomeExpression: function VisitSomeExpression(expression) {
        this._defaultModelBinder(expression);
    },
    VisitFindExpression: function VisitFindExpression(expression) {
        this._defaultModelBinder(expression);
    },
    VisitEveryExpression: function VisitEveryExpression(expression) {
        this._defaultModelBinder(expression);
    },
    VisitToArrayExpression: function VisitToArrayExpression(expression) {
        this._defaultModelBinder(expression);
    },
    VisitFirstExpression: function VisitFirstExpression(expression) {
        this._defaultModelBinder(expression);
    },
    VisitForEachExpression: function VisitForEachExpression(expression) {
        this._defaultModelBinder(expression);
    },
    VisitServiceOperationExpression: function VisitServiceOperationExpression(expression) {
        if (expression.cfg.returnType) {
            var returnType = _index.Container.resolveType(expression.cfg.returnType);
            if (typeof returnType.isAssignableTo === 'function' && returnType.isAssignableTo(_index2.default.Queryable) || returnType === _index2.default.Array) {
                this._defaultModelBinder(expression);
            } else {
                var builder = _index.Container.createqueryBuilder();
                builder.modelBinderConfig['$type'] = returnType;
                if (typeof returnType.isAssignableTo === 'function' && returnType.isAssignableTo(_index2.default.Entity)) {
                    builder.modelBinderConfig['$selector'] = ['json:' + expression.cfg.serviceName];
                } else {
                    builder.modelBinderConfig['$type'] = returnType;
                    builder.modelBinderConfig['$value'] = function (a, v) {
                        return expression.cfg.serviceName in v ? v[expression.cfg.serviceName] : v.value;
                    };
                }
                this.VisitExpression(expression, builder);
                builder.resetModelBinderProperty();
                this._query.modelBinderConfig = builder.modelBinderConfig;
            }
        }
    },
    VisitCountExpression: function VisitCountExpression(expression) {
        var builder = _index.Container.createqueryBuilder();

        builder.modelBinderConfig['$type'] = _index2.default.Array;
        builder.selectModelBinderProperty('$item');
        builder.modelBinderConfig['$type'] = _index2.default.Integer;
        builder.modelBinderConfig['$source'] = 'cnt';
        builder.resetModelBinderProperty();
        this._query.modelBinderConfig = builder.modelBinderConfig;
    },
    VisitBatchDeleteExpression: function VisitBatchDeleteExpression(expression) {
        var builder = _index.Container.createqueryBuilder();

        builder.modelBinderConfig['$type'] = _index2.default.Array;
        builder.selectModelBinderProperty('$item');
        builder.modelBinderConfig['$type'] = _index2.default.Integer;
        builder.modelBinderConfig['$source'] = 'cnt';
        builder.resetModelBinderProperty();
        this._query.modelBinderConfig = builder.modelBinderConfig;
    },
    VisitConstantExpression: function VisitConstantExpression(expression, builder) {
        builder.modelBinderConfig['$type'] = expression.type;
        builder.modelBinderConfig['$value'] = expression.value;
    },

    VisitExpression: function VisitExpression(expression, builder) {
        var projVisitor = _index.Container.createFindProjectionVisitor(this._includes);
        var projContext = {};
        projVisitor.Visit(expression, projContext);

        if (projContext.projectionExpression) {
            this.Visit(projContext.projectionExpression, builder);
        } else {
            this.DefaultSelection(builder, this._query.defaultType, this._includes, projContext.hasIncludeProjectionExpression);
        }
    },
    _defaultModelBinder: function _defaultModelBinder(expression) {
        var builder = _index.Container.createqueryBuilder();
        builder.modelBinderConfig['$type'] = _index2.default.Array;
        if (this._isoDataProvider) {
            builder.modelBinderConfig['$selector'] = ['json:d.results', 'json:d', 'json:results', 'json:value'];
        }
        builder.modelBinderConfig['$item'] = {};
        builder.selectModelBinderProperty('$item');

        this.VisitExpression(expression, builder);

        builder.resetModelBinderProperty();
        this._query.modelBinderConfig = builder.modelBinderConfig;
    },
    _addPropertyToModelBinderConfig: function _addPropertyToModelBinderConfig(elementType, builder) {
        var storageModel = this._query.context._storageModel.getStorageModel(elementType);
        if (elementType.memberDefinitions) {
            elementType.memberDefinitions.getPublicMappedProperties().forEach(function (prop) {
                if (!storageModel || storageModel && !storageModel.Associations[prop.name] && !storageModel.ComplexTypes[prop.name]) {

                    var type = _index.Container.resolveType(prop.dataType);
                    if (!storageModel && this._query.context.storageProvider.supportedDataTypes.indexOf(type) < 0) {
                        //complex type
                        builder.selectModelBinderProperty(prop.name);
                        builder.modelBinderConfig['$type'] = type;
                        if (this._isoDataProvider) {
                            builder.modelBinderConfig['$selector'] = ['json:' + prop.name + '.results', 'json:' + prop.name];
                        } else {
                            builder.modelBinderConfig['$selector'] = 'json:' + prop.name;
                        }
                        this._addPropertyToModelBinderConfig(type, builder);
                        builder.popModelBinderProperty();
                    } else {
                        if (prop.key) {
                            builder.addKeyField(prop.name);
                        }
                        if (prop.concurrencyMode === _index2.default.ConcurrencyMode.Fixed) {
                            builder.modelBinderConfig[prop.name] = { $source: '@odata.etag' };
                        } else if (type === _index2.default.Array && prop.elementType) {
                            builder.selectModelBinderProperty(prop.name);
                            builder.modelBinderConfig['$type'] = type;
                            if (this._isoDataProvider) {
                                builder.modelBinderConfig['$selector'] = ['json:' + prop.name + '.results', 'json:' + prop.name];
                            } else {
                                builder.modelBinderConfig['$selector'] = 'json:' + prop.name;
                            }
                            builder.selectModelBinderProperty('$item');
                            var arrayElementType = _index.Container.resolveType(prop.elementType);
                            builder.modelBinderConfig['$type'] = arrayElementType;
                            this._addPropertyToModelBinderConfig(arrayElementType, builder);
                            builder.popModelBinderProperty();
                            builder.popModelBinderProperty();
                        } else {
                            builder.modelBinderConfig[prop.name] = {
                                $source: prop.name,
                                $type: prop.type
                            };
                        }
                    }
                }
            }, this);
        } else {
            /*builder._binderConfig = {
                $selector: ['json:results'],
                $type: $data.Array,
                $item:{
                    $type: elementType,
                    $value: function (meta, data) { return data; }
                }
            }*/
            if (builder._binderConfig.$type === _index2.default.Array) {
                builder._binderConfig.$item = builder._binderConfig.$item || {};
                builder.modelBinderConfig = builder._binderConfig.$item;
            }
        }
        if (storageModel) {
            this._addComplexTypeProperties(storageModel.ComplexTypes, builder);
        }
    },
    _addComplexTypeProperties: function _addComplexTypeProperties(complexTypes, builder) {
        complexTypes.forEach(function (ct) {
            if (ct.ToType !== _index2.default.Array) {
                builder.selectModelBinderProperty(ct.FromPropertyName);
                builder.modelBinderConfig['$type'] = ct.ToType;
                if (this._isoDataProvider) {
                    builder.modelBinderConfig['$selector'] = ['json:' + ct.FromPropertyName + '.results', 'json:' + ct.FromPropertyName];
                } else {
                    builder.modelBinderConfig['$selector'] = 'json:' + ct.FromPropertyName;
                }
                this._addPropertyToModelBinderConfig(ct.ToType, builder);

                builder.popModelBinderProperty();
            } else {
                var dt = ct.ToType;
                var et = _index.Container.resolveType(ct.FromType.memberDefinitions.getMember(ct.FromPropertyName).elementType);
                if (dt === _index2.default.Array && et && et.isAssignableTo && et.isAssignableTo(_index2.default.Entity)) {
                    config = {
                        $type: _index2.default.Array,
                        $selector: 'json:' + ct.FromPropertyName,
                        $item: {
                            $type: et
                        }
                    };
                    var md = et.memberDefinitions.getPublicMappedProperties();
                    for (var i = 0; i < md.length; i++) {
                        config.$item[md[i].name] = { $type: md[i].type, $source: md[i].name };
                    }
                    builder.modelBinderConfig[ct.FromPropertyName] = config;
                } else {
                    builder.modelBinderConfig[ct.FromPropertyName] = {
                        $type: ct.ToType,
                        $source: ct.FromPropertyName
                    };
                }
            }
        }, this);
    },
    DefaultSelection: function DefaultSelection(builder, type, allIncludes, custom) {
        var _this = this;

        //no projection, get all item from entitySet
        builder.modelBinderConfig['$type'] = custom ? _index2.default.Object : type;

        var storageModel = this._query.context._storageModel.getStorageModel(type);
        this._addPropertyToModelBinderConfig(type, builder);
        if (allIncludes) {
            (function () {
                var excludeDeepInclude = [];
                allIncludes.forEach(function (include) {
                    if (excludeDeepInclude.some(function (incName) {
                        return include.name.length > incName.length && include.name.substr(0, incName.length) === incName;
                    })) {
                        return;
                    }
                    this.depth.push(include.name);

                    var includes = include.name.split('.');
                    var association = null;
                    var tmpStorageModel = storageModel;
                    var itemCount = 0;
                    for (var i = 0; i < includes.length; i++) {
                        if (builder.modelBinderConfig.$item) {
                            builder.selectModelBinderProperty('$item');
                            itemCount++;
                        }
                        builder.selectModelBinderProperty(includes[i]);
                        association = tmpStorageModel.Associations[includes[i]];
                        tmpStorageModel = this._query.context._storageModel.getStorageModel(association.ToType);
                    }
                    if (this._isoDataProvider) {
                        builder.modelBinderConfig['$selector'] = ['json:' + includes[includes.length - 1] + '.results', 'json:' + includes[includes.length - 1]];
                    } else {
                        builder.modelBinderConfig['$selector'] = 'json:' + includes[includes.length - 1];
                    }
                    if (association.ToMultiplicity === '*') {
                        builder.modelBinderConfig['$type'] = _index2.default.Array;
                        builder.selectModelBinderProperty('$item');
                        builder.modelBinderConfig['$type'] = include.type;
                        if (include.projectionExpression) {
                            excludeDeepInclude.push(include.name);
                            this.Visit(include.projectionExpression, builder);
                        } else {
                            this._addPropertyToModelBinderConfig(include.type, builder);
                        }
                        builder.popModelBinderProperty();
                    } else {
                        builder.modelBinderConfig['$type'] = include.type;
                        if (include.projectionExpression) {
                            excludeDeepInclude.push(include.name);
                            this.Visit(include.projectionExpression, builder);
                        } else {
                            this._addPropertyToModelBinderConfig(include.type, builder);
                        }
                    }

                    for (var i = 0; i < includes.length + itemCount; i++) {
                        builder.popModelBinderProperty();
                    }
                    this.depth.pop();
                }, _this);
            })();
        }
    },
    VisitProjectionExpression: function VisitProjectionExpression(expression, builder) {
        this.hasProjection = true;
        this.Visit(expression.selector, builder);

        if (expression.selector && expression.selector.expression instanceof _index2.default.Expressions.ObjectLiteralExpression) {
            builder.modelBinderConfig['$type'] = expression.projectionAs || builder.modelBinderConfig['$type'] || _index2.default.Object;
        }
    },
    VisitParametricQueryExpression: function VisitParametricQueryExpression(expression, builder) {
        if (expression.expression instanceof _index2.default.Expressions.EntityExpression || expression.expression instanceof _index2.default.Expressions.EntitySetExpression) {
            this.VisitEntityAsProjection(expression, builder);
        } else {
            this.Visit(expression.expression, builder);
        }
    },
    VisitEntityAsProjection: function VisitEntityAsProjection(expression, builder) {
        this.mapping = '';
        this.Visit(expression.expression, builder);
        this.depth.push(this.mapping);
        this.mapping = this.depth.join('.');

        var includes;
        var currentInclude;
        if (this.mapping && this._includes instanceof Array) {
            includes = this._includes.filter(function (inc) {
                return inc.name.indexOf(this.mapping + '.') === 0;
            }, this);
            includes = includes.map(function (inc) {
                return { name: inc.name.replace(this.mapping + '.', ''), type: inc.type };
            }, this);

            // if (includes.length > 0){
            //     this.DefaultSelection(builder, expression.expression.entityType, includes);
            //     //console.warn('WARN: include for mapped properties is not supported!');
            // }

            currentInclude = this._includes.filter(function (inc) {
                return inc.name === this.mapping;
            }, this)[0];
        }

        if (expression.expression instanceof _index2.default.Expressions.EntityExpression) {
            if (currentInclude && currentInclude.projectionExpression) {
                var tmpIncludes = this._includes;
                this._includes = includes;
                var tmpDepth = this.depth;
                this.depth = [];
                this.Visit(currentInclude.projectionExpression, builder);
                this._includes = tmpIncludes;
                this.depth = tmpDepth;
            } else {
                this.DefaultSelection(builder, expression.expression.entityType, includes);
            }
        } else if (expression.expression instanceof _index2.default.Expressions.EntitySetExpression) {
            builder.modelBinderConfig.$type = _index2.default.Array;
            builder.modelBinderConfig.$item = {};
            builder.selectModelBinderProperty('$item');
            if (currentInclude && currentInclude.projectionExpression) {
                var tmpIncludes = this._includes;
                this._includes = includes;
                var tmpDepth = this.depth;
                this.depth = [];
                this.Visit(currentInclude.projectionExpression, builder);
                this._includes = tmpIncludes;
                this.depth = tmpDepth;
            } else {
                this.DefaultSelection(builder, expression.expression.elementType, includes);
            }
            builder.popModelBinderProperty();
        }
        this.depth.pop();
    },

    VisitEntityFieldExpression: function VisitEntityFieldExpression(expression, builder) {
        this.Visit(expression.source, builder);
        this.Visit(expression.selector, builder);
    },
    VisitMemberInfoExpression: function VisitMemberInfoExpression(expression, builder) {
        builder.modelBinderConfig['$type'] = expression.memberDefinition.type;
        if (expression.memberDefinition.storageModel && expression.memberName in expression.memberDefinition.storageModel.ComplexTypes) {
            this._addPropertyToModelBinderConfig(_index.Container.resolveType(expression.memberDefinition.type), builder);
        } else {
            if (!(builder.modelBinderConfig.$type && _index.Container.resolveType(builder.modelBinderConfig.$type).isAssignableTo && _index.Container.resolveType(builder.modelBinderConfig.$type).isAssignableTo(_index2.default.Entity))) builder.modelBinderConfig['$source'] = expression.memberName;
        }
    },
    VisitEntitySetExpression: function VisitEntitySetExpression(expression, builder) {
        if (expression.source instanceof _index2.default.Expressions.EntityExpression) {
            this.Visit(expression.source, builder);
            this.Visit(expression.selector, builder);
        }
    },
    VisitComplexTypeExpression: function VisitComplexTypeExpression(expression, builder) {
        this.Visit(expression.source, builder);
        this.Visit(expression.selector, builder);

        if ('$selector' in builder.modelBinderConfig && builder.modelBinderConfig.$selector.length > 0) {
            if (builder.modelBinderConfig.$selector instanceof _index2.default.Array) {
                var temp = builder.modelBinderConfig.$selector[1];
                builder.modelBinderConfig.$selector[0] = temp + '.' + expression.selector.memberName + '.results';
                builder.modelBinderConfig.$selector[1] = temp + '.' + expression.selector.memberName;
            } else {
                builder.modelBinderConfig.$selector += '.' + expression.selector.memberName;
            }
        } else {
            if (this._isoDataProvider) {
                builder.modelBinderConfig['$selector'] = ['json:' + expression.selector.memberName + '.results', 'json:' + expression.selector.memberName];
            } else {
                builder.modelBinderConfig['$selector'] = 'json:' + expression.selector.memberName;
            }
        }
    },
    VisitEntityExpression: function VisitEntityExpression(expression, builder) {
        this.Visit(expression.source, builder);
    },
    VisitAssociationInfoExpression: function VisitAssociationInfoExpression(expression, builder) {
        if ('$selector' in builder.modelBinderConfig && builder.modelBinderConfig.$selector.length > 0) {
            if (builder.modelBinderConfig.$selector instanceof _index2.default.Array) {
                var temp = builder.modelBinderConfig.$selector[1];
                builder.modelBinderConfig.$selector[0] = temp + '.' + expression.associationInfo.FromPropertyName + '.results';
                builder.modelBinderConfig.$selector[1] = temp + '.' + expression.associationInfo.FromPropertyName;
            } else {
                builder.modelBinderConfig.$selector += '.' + expression.associationInfo.FromPropertyName;
            }
        } else {
            if (this._isoDataProvider) {
                builder.modelBinderConfig['$selector'] = ['json:' + expression.associationInfo.FromPropertyName + '.results', 'json:' + expression.associationInfo.FromPropertyName];
            } else {
                builder.modelBinderConfig['$selector'] = 'json:' + expression.associationInfo.FromPropertyName;
            }
        }

        if (this.mapping && this.mapping.length > 0) {
            this.mapping += '.';
        }
        this.mapping += expression.associationInfo.FromPropertyName;
    },
    VisitObjectLiteralExpression: function VisitObjectLiteralExpression(expression, builder) {
        builder.modelBinderConfig['$type'] = _index2.default.Object;
        expression.members.forEach(function (of) {
            this.Visit(of, builder);
        }, this);
    },
    VisitObjectFieldExpression: function VisitObjectFieldExpression(expression, builder) {
        builder.selectModelBinderProperty(expression.fieldName);
        if (expression.expression instanceof _index2.default.Expressions.EntityExpression || expression.expression instanceof _index2.default.Expressions.EntitySetExpression) {
            this.VisitEntityAsProjection(expression, builder);
        } else {
            this.Visit(expression.expression, builder);
        }
        builder.popModelBinderProperty();
    }
});

exports.default = _index2.default;
module.exports = exports['default'];

},{"../../TypeSystem/index.js":32}],115:[function(_dereq_,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _index = _dereq_('../TypeSystem/index.js');

var _index2 = _interopRequireDefault(_index);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

_index2.default.Class.define('$data.Transaction', null, null, {
    constructor: function constructor() {
        this._objectId = new Date().getTime();
        _index2.default.Trace.log("create: ", this._objectId);

        this.oncomplete = new _index2.default.Event("oncomplete", this);
        this.onerror = new _index2.default.Event("onerror", this);
    },
    abort: function abort() {
        _index.Guard.raise(new _index.Exception('Not Implemented', 'Not Implemented', arguments));
    },

    _objectId: { type: _index2.default.Integer },
    transaction: { type: _index2.default.Object },

    oncomplete: { type: _index2.default.Event },
    onerror: { type: _index2.default.Event }
}, null);

exports.default = _index2.default;
module.exports = exports['default'];

},{"../TypeSystem/index.js":32}],116:[function(_dereq_,module,exports){
'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; };

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _index = _dereq_('../../TypeSystem/index.js');

var _index2 = _interopRequireDefault(_index);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

_index2.default.Class.define('$data.Validation.Defaults', null, null, null, {
    validators: {
        value: {
            required: function required(value, definedValue) {
                return !_index.Guard.isNullOrUndefined(value);
            },
            customValidator: function customValidator(value, definedValue) {
                return _index.Guard.isNullOrUndefined(value) || typeof definedValue == "function" ? definedValue(value) : true;
            },

            minValue: function minValue(value, definedValue) {
                return _index.Guard.isNullOrUndefined(value) || value >= definedValue;
            },
            maxValue: function maxValue(value, definedValue) {
                return _index.Guard.isNullOrUndefined(value) || value <= definedValue;
            },

            minLength: function minLength(value, definedValue) {
                return _index.Guard.isNullOrUndefined(value) || value.length >= definedValue;
            },
            maxLength: function maxLength(value, definedValue) {
                return _index.Guard.isNullOrUndefined(value) || value.length <= definedValue;
            },
            length: function length(value, definedValue) {
                return _index.Guard.isNullOrUndefined(value) || value.length == definedValue;
            },
            regex: function regex(value, definedValue) {
                return _index.Guard.isNullOrUndefined(value) || value.match(typeof definedValue === 'string' ? new RegExp(definedValue.indexOf('/') === 0 && definedValue.lastIndexOf('/') === definedValue.length - 1 ? definedValue.slice(1, -1) : definedValue) : definedValue);
            }
        }
    },

    _getGroupValidations: function _getGroupValidations(validations) {
        var validators = {};
        if (Array.isArray(validations)) {
            for (var i = 0; i < validations.length; i++) {
                var validator = validations[i];
                if (typeof this.validators[validator] === 'function') {
                    validators[validator] = this.validators[validator];
                }
            }
        }

        return validators;
    }
});

_index2.default.Class.define('$data.Validation.EntityValidation', _index2.default.Validation.EntityValidationBase, null, {

    ValidateEntity: function ValidateEntity(entity) {
        ///<param name="entity" type="$data.Entity" />

        var errors = [];
        entity.getType().memberDefinitions.getPublicMappedProperties().forEach(function (memDef) {
            errors = errors.concat(this.ValidateEntityField(entity, memDef, undefined, true));
        }, this);
        return errors;
    },
    ValidateEntityField: function ValidateEntityField(entity, memberDefinition, newValue, valueNotSet) {
        ///<param name="entity" type="$data.Entity" />
        ///<param name="memberDefinition" type="$data.MemberDefinition" />
        var errors = [];
        var resolvedType = _index.Container.resolveType(memberDefinition.dataType);
        var typeName = _index.Container.resolveName(resolvedType);
        var value = !valueNotSet ? newValue : entity[memberDefinition.name];

        if (!memberDefinition.inverseProperty && resolvedType && typeof resolvedType.isAssignableTo === 'function' && resolvedType.isAssignableTo(_index2.default.Entity)) {
            typeName = _index2.default.Entity.fullName;
        }

        this.fieldValidate(entity, memberDefinition, value, errors, typeName);
        return errors;
    },

    getValidationValue: function getValidationValue(memberDefinition, validationName) {
        var value;
        if (memberDefinition[validationName] && memberDefinition[validationName].value) value = memberDefinition[validationName].value;else value = memberDefinition[validationName];

        if (this.convertableValidation[validationName]) {
            var typeToConvert;
            if (this.convertableValidation[validationName] === true) {
                typeToConvert = memberDefinition.type;
            } else {
                typeToConvert = this.convertableValidation[validationName];
            }

            if (typeToConvert) value = _index.Container.convertTo(value, typeToConvert, memberDefinition.elementType);
        }

        return value;
    },
    getValidationMessage: function getValidationMessage(memberDefinition, validationName, defaultMessage) {
        var eMessage = defaultMessage;
        if (_typeof(memberDefinition[validationName]) == "object" && memberDefinition[validationName].message) eMessage = memberDefinition[validationName].message;else if (memberDefinition.errorMessage) eMessage = memberDefinition.errorMessage;

        return eMessage;
    },
    createValidationError: function createValidationError(memberDefinition, validationName, defaultMessage) {
        return new _index2.default.Validation.ValidationError(this.getValidationMessage(memberDefinition, validationName, defaultMessage), memberDefinition, validationName);
    },

    convertableValidation: {
        value: {
            required: '$data.Boolean',
            minValue: true,
            maxValue: true,
            minLength: '$data.Integer',
            maxLength: '$data.Integer',
            length: '$data.Integer'
        }

    },
    supportedValidations: {
        value: {
            //'$data.Entity': $data.Validation.Defaults._getGroupValidations(['required', 'customValidator']),
            '$data.ObjectID': _index2.default.Validation.Defaults._getGroupValidations(['required', 'customValidator']),
            '$data.Byte': _index2.default.Validation.Defaults._getGroupValidations(['required', 'customValidator', 'minValue', 'maxValue']),
            '$data.SByte': _index2.default.Validation.Defaults._getGroupValidations(['required', 'customValidator', 'minValue', 'maxValue']),
            '$data.Decimal': _index2.default.Validation.Defaults._getGroupValidations(['required', 'customValidator', 'minValue', 'maxValue']),
            '$data.Float': _index2.default.Validation.Defaults._getGroupValidations(['required', 'customValidator', 'minValue', 'maxValue']),
            '$data.Number': _index2.default.Validation.Defaults._getGroupValidations(['required', 'customValidator', 'minValue', 'maxValue']),
            '$data.Int16': _index2.default.Validation.Defaults._getGroupValidations(['required', 'customValidator', 'minValue', 'maxValue']),
            '$data.Integer': _index2.default.Validation.Defaults._getGroupValidations(['required', 'customValidator', 'minValue', 'maxValue']),
            '$data.Int32': _index2.default.Validation.Defaults._getGroupValidations(['required', 'customValidator', 'minValue', 'maxValue']),
            '$data.Int64': _index2.default.Validation.Defaults._getGroupValidations(['required', 'customValidator', 'minValue', 'maxValue']),
            '$data.String': _index2.default.Validation.Defaults._getGroupValidations(['required', 'customValidator', 'minLength', 'maxLength', 'length', 'regex']),
            '$data.Date': _index2.default.Validation.Defaults._getGroupValidations(['required', 'customValidator', 'minValue', 'maxValue']),
            '$data.DateTimeOffset': _index2.default.Validation.Defaults._getGroupValidations(['required', 'customValidator', 'minValue', 'maxValue']),
            '$data.Time': _index2.default.Validation.Defaults._getGroupValidations(['required', 'customValidator', 'minValue', 'maxValue']),
            '$data.Day': _index2.default.Validation.Defaults._getGroupValidations(['required', 'customValidator', 'minValue', 'maxValue']),
            '$data.Duration': _index2.default.Validation.Defaults._getGroupValidations(['required', 'customValidator']),
            '$data.Boolean': _index2.default.Validation.Defaults._getGroupValidations(['required', 'customValidator']),
            '$data.Array': _index2.default.Validation.Defaults._getGroupValidations(['required', 'customValidator', 'length']),
            '$data.Object': _index2.default.Validation.Defaults._getGroupValidations(['required', 'customValidator']),
            '$data.Guid': _index2.default.Validation.Defaults._getGroupValidations(['required', 'customValidator']),
            '$data.Blob': _index2.default.Validation.Defaults._getGroupValidations(['required', 'customValidator', 'minLength', 'maxLength', 'length']),
            '$data.GeographyPoint': _index2.default.Validation.Defaults._getGroupValidations(['required', 'customValidator']),
            '$data.GeographyLineString': _index2.default.Validation.Defaults._getGroupValidations(['required', 'customValidator']),
            '$data.GeographyPolygon': _index2.default.Validation.Defaults._getGroupValidations(['required', 'customValidator']),
            '$data.GeographyMultiPoint': _index2.default.Validation.Defaults._getGroupValidations(['required', 'customValidator']),
            '$data.GeographyMultiLineString': _index2.default.Validation.Defaults._getGroupValidations(['required', 'customValidator']),
            '$data.GeographyMultiPolygon': _index2.default.Validation.Defaults._getGroupValidations(['required', 'customValidator']),
            '$data.GeographyCollection': _index2.default.Validation.Defaults._getGroupValidations(['required', 'customValidator']),
            '$data.GeometryPoint': _index2.default.Validation.Defaults._getGroupValidations(['required', 'customValidator']),
            '$data.GeometryLineString': _index2.default.Validation.Defaults._getGroupValidations(['required', 'customValidator']),
            '$data.GeometryPolygon': _index2.default.Validation.Defaults._getGroupValidations(['required', 'customValidator']),
            '$data.GeometryMultiPoint': _index2.default.Validation.Defaults._getGroupValidations(['required', 'customValidator']),
            '$data.GeometryMultiLineString': _index2.default.Validation.Defaults._getGroupValidations(['required', 'customValidator']),
            '$data.GeometryMultiPolygon': _index2.default.Validation.Defaults._getGroupValidations(['required', 'customValidator']),
            '$data.GeometryCollection': _index2.default.Validation.Defaults._getGroupValidations(['required', 'customValidator'])
        }
    },

    fieldValidate: function fieldValidate(entity, memberDefinition, value, errors, validationTypeName) {
        ///<param name="memberDefinition" type="$data.MemberDefinition" />
        ///<param name="value" type="Object" />
        ///<param name="errors" type="Array" />
        ///<param name="validationTypeName" type="string" />
        if (entity.entityState == _index2.default.EntityState.Modified && entity.changedProperties && entity.changedProperties.indexOf(memberDefinition) < 0) return;

        var validatonGroup = this.supportedValidations[validationTypeName];
        if (validatonGroup) {
            var validations = Object.keys(validatonGroup);
            validations.forEach(function (validation) {
                if (memberDefinition[validation] && validatonGroup[validation] && !validatonGroup[validation].call(entity, value, this.getValidationValue(memberDefinition, validation))) errors.push(this.createValidationError(memberDefinition, validation, 'Validation error!'));
            }, this);

            if (validationTypeName === _index2.default.Entity.fullName && value instanceof _index2.default.Entity && !value.isValid()) {
                errors.push(this.createValidationError(memberDefinition, 'ComplexProperty', 'Validation error!'));
            }
        }
    }

}, null);

_index2.default.Validation.Entity = new _index2.default.Validation.EntityValidation();

exports.default = _index2.default;
module.exports = exports['default'];

},{"../../TypeSystem/index.js":32}],117:[function(_dereq_,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _index = _dereq_('../../TypeSystem/index.js');

var _index2 = _interopRequireDefault(_index);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

_index2.default.Class.define('$data.Validation.ValidationError', null, null, {
    constructor: function constructor(message, propertyDefinition, type) {
        ///<param name="message" type="string" />
        ///<param name="propertyDefinition" type="$data.MemberDefinition" />

        this.Message = message;
        this.PropertyDefinition = propertyDefinition;
        this.Type = type;
    },
    Type: { dataType: 'string' },
    Message: { dataType: "string" },
    PropertyDefinition: { dataType: _index2.default.MemberDefinition }
}, null);

_index2.default.Class.define('$data.Validation.EntityValidationBase', null, null, {

    ValidateEntity: function ValidateEntity(entity) {
        ///<param name="entity" type="$data.Entity" />
        return [];
    },

    ValidateEntityField: function ValidateEntityField(entity, memberDefinition) {
        ///<param name="entity" type="$data.Entity" />
        ///<param name="memberDefinition" type="$data.MemberDefinition" />
        return [];
    },

    getValidationValue: function getValidationValue(memberDefinition, validationName) {
        _index.Guard.raise("Pure class");
    },
    getValidationMessage: function getValidationMessage(memberDefinition, validationName, defaultMessage) {
        _index.Guard.raise("Pure class");
    }

}, null);

_index2.default.Validation = _index2.default.Validation || {};
_index2.default.Validation.Entity = new _index2.default.Validation.EntityValidationBase();

exports.default = _index2.default;
module.exports = exports['default'];

},{"../../TypeSystem/index.js":32}],118:[function(_dereq_,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _index = _dereq_('../TypeSystem/index.js');

var _index2 = _interopRequireDefault(_index);

var _index3 = _dereq_('./Expressions/index.js');

var _index4 = _interopRequireDefault(_index3);

var _EntityValidationBase = _dereq_('./Validation/EntityValidationBase.js');

var _EntityValidationBase2 = _interopRequireDefault(_EntityValidationBase);

var _EntityValidation = _dereq_('./Validation/EntityValidation.js');

var _EntityValidation2 = _interopRequireDefault(_EntityValidation);

var _ChangeDistributorBase = _dereq_('./Notifications/ChangeDistributorBase.js');

var _ChangeDistributorBase2 = _interopRequireDefault(_ChangeDistributorBase);

var _ChangeCollectorBase = _dereq_('./Notifications/ChangeCollectorBase.js');

var _ChangeCollectorBase2 = _interopRequireDefault(_ChangeCollectorBase);

var _ChangeDistributor = _dereq_('./Notifications/ChangeDistributor.js');

var _ChangeDistributor2 = _interopRequireDefault(_ChangeDistributor);

var _ChangeCollector = _dereq_('./Notifications/ChangeCollector.js');

var _ChangeCollector2 = _interopRequireDefault(_ChangeCollector);

var _Transaction = _dereq_('./Transaction.js');

var _Transaction2 = _interopRequireDefault(_Transaction);

var _Access = _dereq_('./Access.js');

var _Access2 = _interopRequireDefault(_Access);

var _Entity = _dereq_('./Entity.js');

var _Entity2 = _interopRequireDefault(_Entity);

var _Enum = _dereq_('./Enum.js');

var _Enum2 = _interopRequireDefault(_Enum);

var _RelatedEntityProxy = _dereq_('./RelatedEntityProxy.js');

var _RelatedEntityProxy2 = _interopRequireDefault(_RelatedEntityProxy);

var _EntityContext = _dereq_('./EntityContext.js');

var _EntityContext2 = _interopRequireDefault(_EntityContext);

var _QueryProvider = _dereq_('./QueryProvider.js');

var _QueryProvider2 = _interopRequireDefault(_QueryProvider);

var _ModelBinder = _dereq_('./ModelBinder.js');

var _ModelBinder2 = _interopRequireDefault(_ModelBinder);

var _QueryBuilder = _dereq_('./QueryBuilder.js');

var _QueryBuilder2 = _interopRequireDefault(_QueryBuilder);

var _Query = _dereq_('./Query.js');

var _Query2 = _interopRequireDefault(_Query);

var _Queryable = _dereq_('./Queryable.js');

var _Queryable2 = _interopRequireDefault(_Queryable);

var _EntitySet = _dereq_('./EntitySet.js');

var _EntitySet2 = _interopRequireDefault(_EntitySet);

var _EntityState = _dereq_('./EntityState.js');

var _EntityState2 = _interopRequireDefault(_EntityState);

var _EntityAttachModes = _dereq_('./EntityAttachModes.js');

var _EntityAttachModes2 = _interopRequireDefault(_EntityAttachModes);

var _EntityStateManager = _dereq_('./EntityStateManager.js');

var _EntityStateManager2 = _interopRequireDefault(_EntityStateManager);

var _ItemStore = _dereq_('./ItemStore.js');

var _ItemStore2 = _interopRequireDefault(_ItemStore);

var _StorageProviderLoader = _dereq_('./StorageProviderLoader.js');

var _StorageProviderLoader2 = _interopRequireDefault(_StorageProviderLoader);

var _StorageProviderBase = _dereq_('./StorageProviderBase.js');

var _StorageProviderBase2 = _interopRequireDefault(_StorageProviderBase);

var _ServiceOperation = _dereq_('./ServiceOperation.js');

var _ServiceOperation2 = _interopRequireDefault(_ServiceOperation);

var _EntityWrapper = _dereq_('./EntityWrapper.js');

var _EntityWrapper2 = _interopRequireDefault(_EntityWrapper);

var _jQueryAjaxWrapper = _dereq_('./Ajax/jQueryAjaxWrapper.js');

var _jQueryAjaxWrapper2 = _interopRequireDefault(_jQueryAjaxWrapper);

var _WinJSAjaxWrapper = _dereq_('./Ajax/WinJSAjaxWrapper.js');

var _WinJSAjaxWrapper2 = _interopRequireDefault(_WinJSAjaxWrapper);

var _ExtJSAjaxWrapper = _dereq_('./Ajax/ExtJSAjaxWrapper.js');

var _ExtJSAjaxWrapper2 = _interopRequireDefault(_ExtJSAjaxWrapper);

var _AjaxStub = _dereq_('./Ajax/AjaxStub.js');

var _AjaxStub2 = _interopRequireDefault(_AjaxStub);

var _modelBinderConfigCompiler = _dereq_('./StorageProviders/modelBinderConfigCompiler.js');

var _modelBinderConfigCompiler2 = _interopRequireDefault(_modelBinderConfigCompiler);

var _AuthenticationBase = _dereq_('./Authentication/AuthenticationBase.js');

var _AuthenticationBase2 = _interopRequireDefault(_AuthenticationBase);

var _Anonymous = _dereq_('./Authentication/Anonymous.js');

var _Anonymous2 = _interopRequireDefault(_Anonymous);

var _FacebookAuth = _dereq_('./Authentication/FacebookAuth.js');

var _FacebookAuth2 = _interopRequireDefault(_FacebookAuth);

var _BasicAuth = _dereq_('./Authentication/BasicAuth.js');

var _BasicAuth2 = _interopRequireDefault(_BasicAuth);

var _jaydataPromiseHandler = _dereq_('jaydata-promise-handler');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

//import Promise from './Promise.js';

_jaydataPromiseHandler.PromiseHandler.use(_index2.default);
//import JaySvcUtil from '../JaySvcUtil/JaySvcUtil.js';
//import deferred from '../JayDataModules/deferred.js';
//import JayStorm from './JayStorm.js';

exports.default = _index2.default;
module.exports = exports['default'];

},{"../TypeSystem/index.js":32,"./Access.js":35,"./Ajax/AjaxStub.js":36,"./Ajax/ExtJSAjaxWrapper.js":37,"./Ajax/WinJSAjaxWrapper.js":38,"./Ajax/jQueryAjaxWrapper.js":39,"./Authentication/Anonymous.js":40,"./Authentication/AuthenticationBase.js":41,"./Authentication/BasicAuth.js":42,"./Authentication/FacebookAuth.js":43,"./Entity.js":44,"./EntityAttachModes.js":45,"./EntityContext.js":46,"./EntitySet.js":47,"./EntityState.js":48,"./EntityStateManager.js":49,"./EntityWrapper.js":50,"./Enum.js":51,"./Expressions/index.js":99,"./ItemStore.js":100,"./ModelBinder.js":101,"./Notifications/ChangeCollector.js":102,"./Notifications/ChangeCollectorBase.js":103,"./Notifications/ChangeDistributor.js":104,"./Notifications/ChangeDistributorBase.js":105,"./Query.js":106,"./QueryBuilder.js":107,"./QueryProvider.js":108,"./Queryable.js":109,"./RelatedEntityProxy.js":110,"./ServiceOperation.js":111,"./StorageProviderBase.js":112,"./StorageProviderLoader.js":113,"./StorageProviders/modelBinderConfigCompiler.js":114,"./Transaction.js":115,"./Validation/EntityValidation.js":116,"./Validation/EntityValidationBase.js":117,"jaydata-promise-handler":8}],"jaydata/core":[function(_dereq_,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _index = _dereq_('./TypeSystem/index.js');

var _index2 = _interopRequireDefault(_index);

var _index3 = _dereq_('./Types/Expressions/index.js');

var _index4 = _interopRequireDefault(_index3);

var _index5 = _dereq_('./JaySvcUtil/index.js');

var _index6 = _interopRequireDefault(_index5);

var _index7 = _dereq_('./Types/index.js');

var _index8 = _interopRequireDefault(_index7);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

exports.default = _index2.default;
module.exports = exports['default'];

},{"./JaySvcUtil/index.js":17,"./TypeSystem/index.js":32,"./Types/Expressions/index.js":99,"./Types/index.js":118}]},{},[])

	/*var $data = require('jaydata/core');
	$data.version = 'JayData 1.5.1';
	$data.versionNumber = '1.5.1';*/

	if (typeof exports === "object" && typeof module !== "undefined") {
		module.exports = require('jaydata/core')
	} else if (typeof define === "function" && define.amd) {
		var interopRequire = require;
		define([], function(){
			return interopRequire('jaydata/core');
		});

		define('jaydata/core', [], function(){
			return interopRequire('jaydata/core');
		});
	} else {
		var g;
		if (typeof window !== "undefined") {
			window.require = require;
			g = window
		} else if (typeof global !== "undefined") {
			g = global
		} else if (typeof self !== "undefined") {
			g = self
		} else {
			g = this
		}
		g.$data = require('jaydata/core');
	}
})();
