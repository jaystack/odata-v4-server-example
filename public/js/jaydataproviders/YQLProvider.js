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
(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.$data = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(_dereq_,module,exports){
'use strict';

var _core = _dereq_('jaydata/core');

var _core2 = _interopRequireDefault(_core);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

_core2.default.Class.define("$data.Yahoo.YQLContext", _core2.default.EntityContext, null, {
    //Geo
    Continents: { type: _core2.default.EntitySet, elementType: _core2.default.Yahoo.types.Geo.continent, tableName: 'geo.continents' },
    Counties: { type: _core2.default.EntitySet, elementType: _core2.default.Yahoo.types.Geo.county, tableName: 'geo.counties' },
    Countries: { type: _core2.default.EntitySet, elementType: _core2.default.Yahoo.types.Geo.country, tableName: 'geo.countries' },
    Districts: { type: _core2.default.EntitySet, elementType: _core2.default.Yahoo.types.Geo.district, tableName: 'geo.districts' },
    Oceans: { type: _core2.default.EntitySet, elementType: _core2.default.Yahoo.types.Geo.ocean, tableName: 'geo.oceans' },
    Places: { type: _core2.default.EntitySet, elementType: _core2.default.Yahoo.types.Geo.place, tableName: 'geo.places' },
    PlaceTypes: { type: _core2.default.EntitySet, elementType: _core2.default.Yahoo.types.Geo.placetype, tableName: 'geo.placetypes' },
    PlaceSiblings: { type: _core2.default.EntitySet, elementType: _core2.default.Yahoo.types.Geo.sibling, tableName: 'geo.places.siblings' },
    PlaceParents: { type: _core2.default.EntitySet, elementType: _core2.default.Yahoo.types.Geo.parent, tableName: 'geo.places.parent' },
    PlaceNeighbors: { type: _core2.default.EntitySet, elementType: _core2.default.Yahoo.types.Geo.neighbor, tableName: 'geo.places.neighbors' },
    PlaceCommons: { type: _core2.default.EntitySet, elementType: _core2.default.Yahoo.types.Geo.common, tableName: 'geo.places.common' },
    PlaceChildrens: { type: _core2.default.EntitySet, elementType: _core2.default.Yahoo.types.Geo.children, tableName: 'geo.places.children' },
    PlaceBelongtos: { type: _core2.default.EntitySet, elementType: _core2.default.Yahoo.types.Geo.belongto, tableName: 'geo.places.belongtos' },
    PlaceAncestors: { type: _core2.default.EntitySet, elementType: _core2.default.Yahoo.types.Geo.ancestor, tableName: 'geo.places.ancestors' },
    Seas: { type: _core2.default.EntitySet, elementType: _core2.default.Yahoo.types.Geo.sea, tableName: 'geo.seas' },
    States: { type: _core2.default.EntitySet, elementType: _core2.default.Yahoo.types.Geo.state, tableName: 'geo.states' },
    PlaceDescendants: { type: _core2.default.EntitySet, elementType: _core2.default.Yahoo.types.Geo.descendant, tableName: 'geo.places.descendants' },

    placeTypeNameRef: { value: _core2.default.Yahoo.types.Geo.placeTypeNameCf },
    centroidRef: { value: _core2.default.Yahoo.types.Geo.centroidCf },
    countryRef: { value: _core2.default.Yahoo.types.Geo.countryCf },
    adminRef: { value: _core2.default.Yahoo.types.Geo.adminCf },
    localityRef: { value: _core2.default.Yahoo.types.Geo.localityCf },
    postalRef: { value: _core2.default.Yahoo.types.Geo.postalCf },
    boundingBoxRef: { value: _core2.default.Yahoo.types.Geo.boundingBoxCf },

    //Data
    Atom: {
        anonymousResult: true,
        tableName: 'atom',
        resultPath: ["query", "results"],
        resultSkipFirstLevel: true,
        type: _core2.default.EntitySet,
        elementType: _core2.default.Class.define("$data.Yahoo.types.YQLAtom", _core2.default.Entity, null, {
            url: { type: 'string', required: true, searchable: true }
        }, null)
    },
    Csv: {
        anonymousResult: true,
        tableName: 'csv',
        resultPath: ["query", "results"],
        resultSkipFirstLevel: true,
        type: _core2.default.EntitySet,
        elementType: _core2.default.Class.define("$data.Yahoo.types.YQLCsv", _core2.default.Entity, null, {
            url: { type: 'string', required: true, searchable: true },
            charset: { type: 'string', searchable: true },
            columns: { type: 'string', searchable: true }
        }, null)
    },
    DataUri: {
        anonymousResult: true,
        tableName: 'data.uri',
        resultPath: ["query", "results"],
        resultSkipFirstLevel: true,
        type: _core2.default.EntitySet,
        elementType: _core2.default.Class.define("$data.Yahoo.types.YQLDataUri", _core2.default.Entity, null, {
            url: { type: 'string', required: true, searchable: true }
        }, null)
    },
    Feed: {
        anonymousResult: true,
        tableName: 'feed',
        resultPath: ["query", "results"],
        resultSkipFirstLevel: true,
        type: _core2.default.EntitySet,
        elementType: _core2.default.Class.define("$data.Yahoo.types.YQLFeed", _core2.default.Entity, null, {
            url: { type: 'string', required: true, searchable: true }
        }, null)
    },
    FeedNormalizer: {
        anonymousResult: true,
        tableName: 'feednormalizer',
        resultPath: ["query", "results"],
        resultSkipFirstLevel: true,
        type: _core2.default.EntitySet,
        elementType: _core2.default.Class.define("$data.Yahoo.types.YQLFeedNormalizer", _core2.default.Entity, null, {
            url: { type: 'string', required: true, searchable: true },
            output: { type: 'string', searchable: true },
            prexslurl: { type: 'string', searchable: true },
            postxslurl: { type: 'string', searchable: true },
            timeout: { type: 'string', searchable: true }
        }, null)
    },
    Html: {
        anonymousResult: true,
        tableName: 'html',
        resultPath: ["query", "results"],
        resultSkipFirstLevel: true,
        type: _core2.default.EntitySet,
        elementType: _core2.default.Class.define("$data.Yahoo.types.YQLHtml", _core2.default.Entity, null, {
            url: { type: 'string', required: true, searchable: true },
            charset: { type: 'string', searchable: true },
            browser: { type: 'bool', searchable: true },
            xpath: { type: 'string', searchable: true },
            compat: { type: 'string', searchable: true, description: "valid values for compat is 'html5' and 'html4'" },
            Result: { type: 'string', searchable: true }
        }, null)
    },
    Json: {
        anonymousResult: true,
        tableName: 'json',
        resultPath: ["query", "results"],
        resultSkipFirstLevel: true,
        type: _core2.default.EntitySet,
        elementType: _core2.default.Class.define("$data.Yahoo.types.YQLJson", _core2.default.Entity, null, {
            url: { type: 'string', required: true, searchable: true },
            itemPath: { type: 'string', searchable: true }
        }, null)
    },
    Rss: {
        anonymousResult: false,
        tableName: 'rss',
        resultPath: ["query", "results"],
        resultSkipFirstLevel: true,
        type: _core2.default.EntitySet,
        elementType: _core2.default.Class.define("$data.Yahoo.types.YQLRss", _core2.default.Entity, null, {
            url: { type: 'string', required: true, searchable: true },
            guid: { type: 'GuidField' },
            title: { type: 'string' },
            description: { type: 'string' },
            link: { type: 'string' },
            pubDate: { type: 'string' }
        }, null)
    },
    GuidField: {
        type: _core2.default.Class.define("GuidField", _core2.default.Entity, null, {
            isPermaLink: { type: 'string' },
            content: { type: 'string' }
        }, null)
    },
    Xml: {
        anonymousResult: true,
        tableName: 'xml',
        resultPath: ["query", "results"],
        resultSkipFirstLevel: true,
        type: _core2.default.EntitySet,
        elementType: _core2.default.Class.define("$data.Yahoo.types.YQLXml", _core2.default.Entity, null, {
            url: { type: 'string', required: true, searchable: true },
            itemPath: { type: 'string', searchable: true }
        }, null)
    },
    Xslt: {
        anonymousResult: true,
        tableName: 'xslt',
        resultPath: ["query", "results"],
        resultSkipFirstLevel: true,
        type: _core2.default.EntitySet,
        elementType: _core2.default.Class.define("$data.Yahoo.types.YQLXslt", _core2.default.Entity, null, {
            url: { type: 'string', searchable: true },
            xml: { type: 'string', searchable: true },
            stylesheet: { type: 'string', searchable: true },
            stylesheetliteral: { type: 'string', searchable: true },
            wrapperelement: { type: 'string', searchable: true }
        }, null)
    }

}, null);

},{"jaydata/core":"jaydata/core"}],2:[function(_dereq_,module,exports){
'use strict';

var _core = _dereq_('jaydata/core');

var _core2 = _interopRequireDefault(_core);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

_core2.default.Class.define('$data.Yahoo.types.Geo.placeTypeNameCf', _core2.default.Entity, null, {
    code: { type: 'string' },
    content: { type: 'string' }
}, null);

_core2.default.Class.define('$data.Yahoo.types.Geo.countryCf', _core2.default.Entity, null, {
    code: { type: 'string' },
    type: { type: 'string' },
    content: { type: 'string' }
}, null);

_core2.default.Class.define('$data.Yahoo.types.Geo.adminCf', _core2.default.Entity, null, {
    code: { type: 'string' },
    type: { type: 'string' },
    content: { type: 'string' }
}, null);

_core2.default.Class.define('$data.Yahoo.types.Geo.localityCf', _core2.default.Entity, null, {
    code: { type: 'string' },
    content: { type: 'string' }
}, null);

_core2.default.Class.define('$data.Yahoo.types.Geo.centroidCf', _core2.default.Entity, null, {
    latitude: { type: 'string' },
    longitude: { type: 'string' }
}, null);

_core2.default.Class.define('$data.Yahoo.types.Geo.postalCf', _core2.default.Entity, null, {
    type: { type: 'string' },
    content: { type: 'string' }
}, null);

_core2.default.Class.define('$data.Yahoo.types.Geo.boundingBoxCf', _core2.default.Entity, null, {
    southWest: { type: 'centroidRef' },
    northEast: { type: 'centroidRef' }
}, null);

_core2.default.Class.define('$data.Yahoo.types.Geo.PlaceMeta', null, null, {
    woeid: { type: 'int', key: true },
    name: { type: 'string' },
    uri: { type: 'string' },
    placeTypeName: { type: 'placeTypeNameRef' },
    lang: { type: 'string' }
}, null);

_core2.default.Class.defineEx('$data.Yahoo.types.Geo.PlaceMetaFull', [{ type: null }, { type: _core2.default.Yahoo.types.Geo.PlaceMeta }], null, {
    country: { type: 'countryRef' },
    admin1: { type: 'adminRef' },
    admin2: { type: 'adminRef' },
    admin3: { type: 'adminRef' },
    locality1: { type: 'localityRef' },
    locality2: { type: 'localityRef' },
    postal: { type: 'postalRef' },
    centroid: { type: 'centroidRef' },
    boundingBox: { type: 'boundingBoxRef' },
    areaRank: { type: 'int' },
    popRank: { type: 'int' }
}, null);

_core2.default.Class.define('$data.Yahoo.types.Geo.placetype', _core2.default.Entity, null, {
    placeTypeDescription: { type: 'string' },
    uri: { type: 'string', key: true },
    placeTypeName: { type: 'placeTypeNameRef' },
    lang: { type: 'string' }
}, null);

_core2.default.Class.defineEx('$data.Yahoo.types.Geo.sibling', [{ type: _core2.default.Entity }, { type: _core2.default.Yahoo.types.Geo.PlaceMetaFull }], null, {
    sibling_woeid: { type: 'string' }
}, null);

_core2.default.Class.defineEx('$data.Yahoo.types.Geo.parent', [{ type: _core2.default.Entity }, { type: _core2.default.Yahoo.types.Geo.PlaceMetaFull }], null, {
    child_woeid: { type: 'string' }
}, null);

_core2.default.Class.defineEx('$data.Yahoo.types.Geo.neighbor', [{ type: _core2.default.Entity }, { type: _core2.default.Yahoo.types.Geo.PlaceMetaFull }], null, {
    neighbor_woeid: { type: 'string' }
}, null);

_core2.default.Class.defineEx('$data.Yahoo.types.Geo.common', [{ type: _core2.default.Entity }, { type: _core2.default.Yahoo.types.Geo.PlaceMetaFull }], null, {
    woeid1: { type: 'string' },
    woeid2: { type: 'string' },
    woeid3: { type: 'string' },
    woeid4: { type: 'string' },
    woeid5: { type: 'string' },
    woeid6: { type: 'string' },
    woeid7: { type: 'string' },
    woeid8: { type: 'string' },
    'long': { type: 'string' }
}, null);

_core2.default.Class.defineEx('$data.Yahoo.types.Geo.children', [{ type: _core2.default.Entity }, { type: _core2.default.Yahoo.types.Geo.PlaceMetaFull }], null, {
    parent_woeid: { type: 'string' },
    placetype: { type: 'string' }
}, null);

_core2.default.Class.defineEx('$data.Yahoo.types.Geo.belongto', [{ type: _core2.default.Entity }, { type: _core2.default.Yahoo.types.Geo.PlaceMetaFull }], null, {
    member_woeid: { type: 'string' },
    placetype: { type: 'string' }
}, null);

_core2.default.Class.defineEx('$data.Yahoo.types.Geo.ancestor', [{ type: _core2.default.Entity }, { type: _core2.default.Yahoo.types.Geo.PlaceMetaFull }], null, {
    descendant_woeid: { type: 'string' }
}, null);

_core2.default.Class.defineEx('$data.Yahoo.types.Geo.place', [{ type: _core2.default.Entity }, { type: _core2.default.Yahoo.types.Geo.PlaceMetaFull }], null, {
    text: { type: 'string' },
    focus: { type: 'string' },
    placetype: { type: 'string' }
}, null);

_core2.default.Class.defineEx('$data.Yahoo.types.Geo.county', [{ type: _core2.default.Entity }, { type: _core2.default.Yahoo.types.Geo.PlaceMeta }], null, {
    place: { type: 'string' }
}, null);
_core2.default.Class.defineEx('$data.Yahoo.types.Geo.country', [{ type: _core2.default.Entity }, { type: _core2.default.Yahoo.types.Geo.PlaceMeta }], null, {
    place: { type: 'string' }
}, null);
_core2.default.Class.defineEx('$data.Yahoo.types.Geo.district', [{ type: _core2.default.Entity }, { type: _core2.default.Yahoo.types.Geo.PlaceMeta }], null, {
    place: { type: 'string' }
}, null);
_core2.default.Class.defineEx('$data.Yahoo.types.Geo.sea', [{ type: _core2.default.Entity }, { type: _core2.default.Yahoo.types.Geo.PlaceMeta }], null, {
    place: { type: 'string' }
}, null);
_core2.default.Class.defineEx('$data.Yahoo.types.Geo.state', [{ type: _core2.default.Entity }, { type: _core2.default.Yahoo.types.Geo.PlaceMeta }], null, {
    place: { type: 'string' }
}, null);
_core2.default.Class.defineEx('$data.Yahoo.types.Geo.continent', [{ type: _core2.default.Entity }, { type: _core2.default.Yahoo.types.Geo.PlaceMeta }], null, {
    place: { type: 'string' },
    view: { type: 'string' }
}, null);
_core2.default.Class.defineEx('$data.Yahoo.types.Geo.ocean', [{ type: _core2.default.Entity }, { type: _core2.default.Yahoo.types.Geo.PlaceMeta }], null, {
    place: { type: 'string' },
    view: { type: 'string' }
}, null);
_core2.default.Class.defineEx('$data.Yahoo.types.Geo.descendant', [{ type: _core2.default.Entity }, { type: _core2.default.Yahoo.types.Geo.PlaceMeta }], null, {
    ancestor_woeid: { type: 'string' },
    placetype: { type: 'string' },
    degree: { type: 'string' },
    view: { type: 'string' }
}, null);

_core.Container.registerType('placeTypeNameRef', _core2.default.Yahoo.types.Geo.placeTypeNameCf);
_core.Container.registerType('centroidRef', _core2.default.Yahoo.types.Geo.centroidCf);
_core.Container.registerType('countryRef', _core2.default.Yahoo.types.Geo.countryCf);
_core.Container.registerType('adminRef', _core2.default.Yahoo.types.Geo.adminCf);
_core.Container.registerType('localityRef', _core2.default.Yahoo.types.Geo.localityCf);
_core.Container.registerType('postalRef', _core2.default.Yahoo.types.Geo.postalCf);
_core.Container.registerType('boundingBoxRef', _core2.default.Yahoo.types.Geo.boundingBoxCf);

},{"jaydata/core":"jaydata/core"}],3:[function(_dereq_,module,exports){
'use strict';

var _core = _dereq_('jaydata/core');

var _core2 = _interopRequireDefault(_core);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

//"use strict" // suspicious code;

(0, _core.$C)('$data.storageProviders.YQL.YQLCompiler', _core2.default.Expressions.EntityExpressionVisitor, null, {
    constructor: function constructor() {
        this.provider = {};
        this.cTypeCache = {};
    },

    compile: function compile(query) {
        this.provider = query.context.storageProvider;

        var context = {
            filterSql: { sql: '' },
            projectionSql: { sql: '' },
            orderSql: { sql: '' },
            skipSql: { sql: '' },
            takeSql: { sql: '' },
            tableName: ''
        };
        this.Visit(query.expression, context);

        if (context.projectionSql.sql == '') context.projectionSql.sql = "SELECT *";

        if (context.orderSql.sql) context.orderSql.sql = " | sort(" + context.orderSql.sql + ')';

        //special skip-take logic
        if (context.skipSql.value && context.takeSql.value) {
            var skipVal = context.skipSql.value;
            context.skipSql.value = context.takeSql.value;
            context.takeSql.value = context.takeSql.value + skipVal;
        }
        if (context.skipSql.value) context.skipSql.sql = context.skipSql.sqlPre + context.skipSql.value + context.skipSql.sqlSuf;
        if (context.takeSql.value) context.takeSql.sql = context.takeSql.sqlPre + context.takeSql.value + context.takeSql.sqlSuf;

        return {
            queryText: context.projectionSql.sql + ' FROM ' + context.tableName + context.filterSql.sql + context.orderSql.sql + context.takeSql.sql + (context.takeSql.sql ? context.skipSql.sql : ''),
            selectMapping: context.projectionSql.selectFields,
            params: []
        };
    },

    VisitFilterExpression: function VisitFilterExpression(expression, context) {
        ///<param name="expression" type="$data.Expressions.FilterExpression" />
        this.Visit(expression.source, context);

        context.filterSql.type = expression.nodeType;
        if (context.filterSql.sql == '') context.filterSql.sql = ' WHERE ';else context.filterSql.sql += ' AND ';

        this.Visit(expression.selector, context.filterSql);
    },
    VisitProjectionExpression: function VisitProjectionExpression(expression, context) {
        ///<param name="expression" type="$data.Expressions.ProjectionExpression" />
        this.Visit(expression.source, context);

        context.projectionSql.type = expression.nodeType;
        if (context.projectionSql.sql == '') context.projectionSql.sql = 'SELECT ';else _core.Guard.raise(new _core.Exception('multiple select error'));

        this.Visit(expression.selector, context.projectionSql);
    },
    VisitOrderExpression: function VisitOrderExpression(expression, context) {
        ///<param name="expression" type="$data.Expressions.OrderExpression" />
        this.Visit(expression.source, context);

        context.orderSql.type = expression.nodeType;

        var orderContext = { sql: '' };
        this.Visit(expression.selector, orderContext);
        context.orderSql.sql = "field='" + orderContext.sql + "', descending='" + (expression.nodeType == _core2.default.Expressions.ExpressionType.OrderByDescending) + "'" + (context.orderSql.sql != '' ? ', ' + context.orderSql.sql : '');
    },
    VisitPagingExpression: function VisitPagingExpression(expression, context) {
        ///<param name="expression" type="$data.Expressions.PagingExpression" />
        this.Visit(expression.source, context);

        if (expression.nodeType == _core2.default.Expressions.ExpressionType.Skip) {
            context.skipSql.type = expression.nodeType;
            context.skipSql.sqlPre = ' | tail(count=';
            this.Visit(expression.amount, context.skipSql);
            context.skipSql.sqlSuf = ')';
        } else if (expression.nodeType == _core2.default.Expressions.ExpressionType.Take) {
            context.takeSql.type = expression.nodeType;
            context.takeSql.sqlPre = ' | truncate(count=';
            this.Visit(expression.amount, context.takeSql);
            context.takeSql.sqlSuf = ')';
        }
    },

    VisitSimpleBinaryExpression: function VisitSimpleBinaryExpression(expression, context) {
        context.sql += "(";
        var left = this.Visit(expression.left, context);
        context.sql += expression.resolution.mapTo;

        if (expression.resolution.resolvableType && !_core.Guard.requireType(expression.resolution.mapTo + ' expression.right.value', expression.right.value, expression.resolution.resolvableType)) {
            _core.Guard.raise(new _core.Exception(expression.right.type + " not allowed in '" + expression.resolution.mapTo + "' statement", "invalid operation"));
        }

        if (expression.resolution.name === 'in' && expression.right.value instanceof Array) {
            var self = this;
            context.sql += "(";
            expression.right.value.forEach(function (item, i) {
                if (i > 0) context.sql += ", ";
                self.Visit(item, context);
            });
            context.sql += ")";
        } else {
            var right = this.Visit(expression.right, context);
        }
        context.sql += ")";
    },

    VisitEntityFieldExpression: function VisitEntityFieldExpression(expression, context) {
        this.Visit(expression.source, context);
        this.Visit(expression.selector, context);
    },
    VisitMemberInfoExpression: function VisitMemberInfoExpression(expression, context) {
        var memberName;
        if (context.wasComplex === true) context.sql += '.';
        context.sql += expression.memberName;

        if (context.isComplex == true) {
            context.complex += expression.memberName;
            context.wasComplex = true;
        } else {
            context.wasComplex = false;
            if (context.complex) memberName = context.complex + expression.memberName;else memberName = expression.memberName;

            context.complex = null;
            //context.sql += memberName;
            //context.fieldName = memberName;
            context.fieldData = { name: memberName, dataType: expression.memberDefinition.dataType };

            if (context.type == 'Projection' && !context.selectFields) context.selectFields = [{ from: memberName, dataType: expression.memberDefinition.dataType }];
        }
    },

    VisitConstantExpression: function VisitConstantExpression(expression, context) {
        if (context.type == 'Projection') _core.Guard.raise(new _core.Exception('Constant value is not supported in Projection.', 'Not supported!'));

        this.VisitQueryParameterExpression(expression, context);
    },

    VisitQueryParameterExpression: function VisitQueryParameterExpression(expression, context) {
        context.value = expression.value;
        var expressionValueType = _core.Container.resolveType(expression.type); //Container.resolveType(Container.getTypeName(expression.value));
        if (expression.value instanceof _core2.default.Queryable) {
            context.sql += '(' + expression.value.toTraceString().queryText + ')';
        } else if (this.provider.supportedDataTypes.indexOf(expressionValueType) != -1) context.sql += this.provider.fieldConverter.toDb[_core.Container.resolveName(expressionValueType)](expression.value);else {
            context.sql += "" + expression.value + "";
        }
    },

    VisitParametricQueryExpression: function VisitParametricQueryExpression(expression, context) {
        if (context.type == 'Projection') {
            this.Visit(expression.expression, context);
            if (expression.expression instanceof _core2.default.Expressions.ComplexTypeExpression) {
                context.selectFields = context.selectFields || [];
                var type = expression.expression.entityType;
                var includes = this._getComplexTypeIncludes(type);
                context.selectFields.push({ from: context.complex, type: type, includes: includes });
            }
        } else {

            var exp = this.Visit(expression.expression, context);
            context.parameters = expression.parameters;
        }
    },

    VisitEntitySetExpression: function VisitEntitySetExpression(expression, context) {
        if (context.type) {
            if (!context.complex) context.complex = '';
        } else {
            context.tableName = expression.instance.tableName;
        }
    },

    VisitObjectLiteralExpression: function VisitObjectLiteralExpression(expression, context) {
        var self = this;
        context.selectFields = context.selectFields || [];
        expression.members.forEach(function (member) {
            if (member.expression instanceof _core2.default.Expressions.ObjectLiteralExpression) {
                context.mappingPrefix = context.mappingPrefix || [];
                context.mappingPrefix.push(member.fieldName);
                self.Visit(member, context);
                context.mappingPrefix.pop();
            } else {
                if (context.selectFields.length > 0) context.sql += ', ';
                self.Visit(member, context);

                var mapping = { from: context.fieldData.name, to: context.mappingPrefix instanceof Array ? context.mappingPrefix.join('.') + '.' + member.fieldName : member.fieldName };
                if (context.selectType) {
                    mapping.type = context.selectType;
                    var includes = this._getComplexTypeIncludes(context.selectType);
                    mapping.includes = includes;
                } else {
                    mapping.dataType = context.fieldData.dataType;
                }
                context.selectFields.push(mapping);

                delete context.fieldData;
                delete context.selectType;
            }
        }, this);
    },
    VisitObjectFieldExpression: function VisitObjectFieldExpression(expression, context) {
        this.Visit(expression.expression, context);
        if (expression.expression instanceof _core2.default.Expressions.ComplexTypeExpression) {
            context.fieldData = context.fieldData || {};
            context.fieldData.name = context.complex;
            context.selectType = expression.expression.entityType;
        }
    },
    VisitEntityFieldOperationExpression: function VisitEntityFieldOperationExpression(expression, context) {
        _core.Guard.requireType("expression.operation", expression.operation, _core2.default.Expressions.MemberInfoExpression);

        var opDef = expression.operation.memberDefinition;
        var opName = opDef.mapTo || opDef.name;

        context.sql += '(';

        if (opDef.expressionInParameter == false) this.Visit(expression.source, context);

        context.sql += opName;
        var paramCounter = 0;
        var params = opDef.parameters || [];

        var args = params.map(function (item, index) {
            var result = { dataType: item.dataType, prefix: item.prefix, suffix: item.suffix };
            if (item.value) {
                result.value = item.value;
            } else if (item.name === "@expression") {
                result.value = expression.source;
            } else {
                result.value = expression.parameters[paramCounter];
                result.itemType = expression.parameters[paramCounter++].type;
            };
            return result;
        });

        args.forEach(function (arg, index) {
            var itemType = arg.itemType ? _core.Container.resolveType(arg.itemType) : null;
            if (!itemType || arg.dataType instanceof Array && arg.dataType.indexOf(itemType) != -1 || arg.dataType == itemType) {
                if (index > 0) {
                    context.sql += ", ";
                };
                var funcContext = { sql: '' };
                this.Visit(arg.value, funcContext);

                if (opName == ' LIKE ') {
                    var valueType = _core.Container.getTypeName(funcContext.value);
                    context.sql += valueType == 'string' ? "'" : "";
                    context.sql += (arg.prefix ? arg.prefix : '') + funcContext.value + (arg.suffix ? arg.suffix : '');
                    context.sql += valueType == 'string' ? "'" : "";
                } else {
                    context.sql += funcContext.sql;
                }
            } else _core.Guard.raise(new _core.Exception(itemType + " not allowed in '" + expression.operation.memberName + "' statement", "invalid operation"));
        }, this);

        if (opDef.rigthValue) context.sql += opDef.rigthValue;else context.sql += "";

        context.sql += ')';
    },

    VisitComplexTypeExpression: function VisitComplexTypeExpression(expression, context) {
        this.Visit(expression.source, context);

        context.isComplex = true;
        this.Visit(expression.selector, context);
        context.isComplex = false;

        if (context.complex != '' /*&& context.isComplex*/) context.complex += '.';
    },

    VisitEntityExpression: function VisitEntityExpression(expression, context) {
        this.Visit(expression.source, context);
    },

    _findComplexType: function _findComplexType(type, result, depth) {
        type.memberDefinitions.getPublicMappedProperties().forEach(function (memDef) {
            var dataType = _core.Container.resolveType(memDef.dataType);
            if (dataType.isAssignableTo && !dataType.isAssignableTo(_core2.default.EntitySet)) {
                var name = depth ? depth + '.' + memDef.name : memDef.name;
                result.push({ name: name, type: dataType });
                this._findComplexType(dataType, result, name);
            }
        }, this);
    },
    _getComplexTypeIncludes: function _getComplexTypeIncludes(type) {
        if (!this.cTypeCache[type.name]) {
            var inc = [];
            this._findComplexType(type, inc);
            this.cTypeCache[type.name] = inc;
        }
        return this.cTypeCache[type.name];
    }

}, null);

},{"jaydata/core":"jaydata/core"}],4:[function(_dereq_,module,exports){
'use strict';

var _core = _dereq_('jaydata/core');

var _core2 = _interopRequireDefault(_core);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

_core2.default.YQLConverter = {
    fromDb: {
        '$data.Byte': _core2.default.Container.proxyConverter,
        '$data.SByte': _core2.default.Container.proxyConverter,
        '$data.Decimal': _core2.default.Container.proxyConverter,
        '$data.Float': _core2.default.Container.proxyConverter,
        '$data.Int16': _core2.default.Container.proxyConverter,
        '$data.Int32': _core2.default.Container.proxyConverter,
        '$data.Int64': _core2.default.Container.proxyConverter,
        '$data.Number': function $dataNumber(value) {
            return typeof value === "number" ? value : parseInt(value);
        },
        '$data.Integer': function $dataInteger(value) {
            return typeof value === "number" ? value : parseFloat(value);
        },
        '$data.String': _core2.default.Container.proxyConverter,
        '$data.Date': function $dataDate(value) {
            return new Date(typeof value === "string" ? parseInt(value) : value);
        },
        '$data.Boolean': function $dataBoolean(value) {
            return !!value;
        },
        '$data.Blob': _core2.default.Container.proxyConverter,
        '$data.Array': function $dataArray(value) {
            if (value === undefined) {
                return new _core2.default.Array();
            }return value;
        }
    },
    toDb: {
        '$data.Byte': _core2.default.Container.proxyConverter,
        '$data.SByte': _core2.default.Container.proxyConverter,
        '$data.Decimal': _core2.default.Container.proxyConverter,
        '$data.Float': _core2.default.Container.proxyConverter,
        '$data.Int16': _core2.default.Container.proxyConverter,
        '$data.Int32': _core2.default.Container.proxyConverter,
        '$data.Int64': _core2.default.Container.proxyConverter,
        '$data.Number': _core2.default.Container.proxyConverter,
        '$data.Integer': _core2.default.Container.proxyConverter,
        '$data.String': function $dataString(value) {
            return "'" + value + "'";
        },
        '$data.Date': function $dataDate(value) {
            return value ? value.valueOf() : null;
        },
        '$data.Boolean': _core2.default.Container.proxyConverter,
        '$data.Blob': _core2.default.Container.proxyConverter,
        '$data.Array': function $dataArray(value) {
            return '(' + value.join(', ') + ')';
        }
    }
};

},{"jaydata/core":"jaydata/core"}],5:[function(_dereq_,module,exports){
'use strict';

var _core = _dereq_('jaydata/core');

var _core2 = _interopRequireDefault(_core);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

_core2.default.Class.define('$data.storageProviders.YQL.YQLProvider', _core2.default.StorageProviderBase, null, {
    constructor: function constructor(cfg) {
        var provider = this;
        this.SqlCommands = [];
        this.context = {};
        this.extendedCreateNew = [];
        this.providerConfiguration = _core2.default.typeSystem.extend({
            YQLFormat: "format=json",
            YQLQueryUrl: "http://query.yahooapis.com/v1/public/yql?q=",
            YQLEnv: '',
            resultPath: ["query", "results"],
            resultSkipFirstLevel: true
        }, cfg);
        this.initializeStore = function (callBack) {
            callBack = _core2.default.PromiseHandlerBase.createCallbackSettings(callBack);
            callBack.success(this.context);
        };
    },
    AuthenticationProvider: { dataType: '$data.Authentication.AuthenticationBase', enumerable: false },
    supportedDataTypes: { value: [_core2.default.Integer, _core2.default.Number, _core2.default.Date, _core2.default.String, _core2.default.Boolean, _core2.default.Blob, _core2.default.Array], writable: false },
    supportedFieldOperations: {
        value: {
            'contains': {
                dataType: _core2.default.String,
                allowedIn: _core2.default.Expressions.FilterExpression,
                mapTo: ' LIKE ',
                expressionInParameter: false,
                parameters: [{ name: 'inStatement', dataType: _core2.default.String, prefix: '%', suffix: '%' }]
            },
            'startsWith': {
                dataType: _core2.default.String,
                allowedIn: _core2.default.Expressions.FilterExpression,
                mapTo: ' LIKE ',
                expressionInParameter: false,
                parameters: [{ name: 'inStatement', dataType: _core2.default.String, suffix: '%' }]
            },
            'endsWith': {
                dataType: _core2.default.String,
                allowedIn: _core2.default.Expressions.FilterExpression,
                mapTo: ' LIKE ',
                expressionInParameter: false,
                parameters: [{ name: 'inStatement', dataType: _core2.default.String, prefix: '%' }]
            }
        },
        enumerable: true,
        writable: true
    },
    supportedBinaryOperators: {
        value: {
            equal: { mapTo: ' = ', dataType: _core2.default.Boolean, allowedIn: _core2.default.Expressions.FilterExpression },
            notEqual: { mapTo: ' != ', dataType: _core2.default.Boolean, allowedIn: _core2.default.Expressions.FilterExpression },
            equalTyped: { mapTo: ' = ', dataType: _core2.default.Boolean, allowedIn: _core2.default.Expressions.FilterExpression },
            notEqualTyped: { mapTo: ' != ', dataType: _core2.default.Boolean, allowedIn: _core2.default.Expressions.FilterExpression },
            greaterThan: { mapTo: ' > ', dataType: _core2.default.Boolean, allowedIn: _core2.default.Expressions.FilterExpression },
            greaterThanOrEqual: { mapTo: ' >= ', dataType: _core2.default.Boolean, allowedIn: _core2.default.Expressions.FilterExpression },

            lessThan: { mapTo: ' < ', dataType: _core2.default.Boolean, allowedIn: _core2.default.Expressions.FilterExpression },
            lessThenOrEqual: { mapTo: ' <= ', dataType: _core2.default.Boolean, allowedIn: _core2.default.Expressions.FilterExpression },
            or: { mapTo: ' OR ', dataType: _core2.default.Boolean, allowedIn: _core2.default.Expressions.FilterExpression },
            and: { mapTo: ' AND ', dataType: _core2.default.Boolean, allowedIn: _core2.default.Expressions.FilterExpression },

            "in": { mapTo: " IN ", dataType: _core2.default.Boolean, resolvableType: [_core2.default.Array, _core2.default.Queryable], allowedIn: _core2.default.Expressions.FilterExpression }
        }
    },
    supportedUnaryOperators: {
        value: {}
    },
    supportedSetOperations: {
        value: {
            filter: {},
            map: {},
            forEach: {},
            toArray: {},
            single: {},
            take: {},
            skip: {},
            orderBy: {},
            orderByDescending: {},
            first: {}
        },
        enumerable: true,
        writable: true
    },
    fieldConverter: { value: _core2.default.YQLConverter },
    executeQuery: function executeQuery(query, callBack) {
        var self = this;
        callBack = _core2.default.PromiseHandlerBase.createCallbackSettings(callBack);
        var schema = query.defaultType;
        var entitSetDefinition = query.context.getType().memberDefinitions.asArray().filter(function (m) {
            return m.elementType == schema;
        })[0] || {};
        var ctx = this.context;

        if (!this.AuthenticationProvider) this.AuthenticationProvider = new _core2.default.Authentication.Anonymous({});

        var sql;
        try {
            sql = this._compile(query);
        } catch (e) {
            callBack.error(e);
            return;
        }

        var includes = [];
        var requestData = {
            url: this.providerConfiguration.YQLQueryUrl + encodeURIComponent(sql.queryText) + "&" + this.providerConfiguration.YQLFormat + (this.providerConfiguration.YQLEnv ? "&env=" + this.providerConfiguration.YQLEnv : ""),
            dataType: "JSON",
            success: function success(data, textStatus, jqXHR) {
                var resultData = self._preProcessData(data, entitSetDefinition);
                if (resultData == false) {
                    callBack.success(query);
                    return;
                }

                query.rawDataList = resultData;
                if (entitSetDefinition.anonymousResult) {
                    query.rawDataList = resultData;
                    callBack.success(query);
                    return;
                } else {
                    var compiler = _core.Container.createModelBinderConfigCompiler(query, []);
                    compiler.Visit(query.expression);
                }

                callBack.success(query);
            },
            error: function error(jqXHR, textStatus, errorThrow) {
                var errorData = {};
                try {
                    errorData = JSON.parse(jqXHR.responseText).error;
                } catch (e) {
                    errorData = errorThrow + ': ' + jqXHR.responseText;
                }
                callBack.error(errorData);
            }
        };

        this.context.prepareRequest.call(this, requestData);
        this.AuthenticationProvider.CreateRequest(requestData);
    },
    _preProcessData: function _preProcessData(jsonResult, entityDef) {
        var resultData = jsonResult;
        var depths = entityDef.resultPath != undefined ? entityDef.resultPath : this.providerConfiguration.resultPath;
        for (var i = 0; i < depths.length; i++) {
            if (resultData[depths[i]]) resultData = resultData[depths[i]];else {
                return false;
            }
        }

        var skipFirstLevel = entityDef.resultSkipFirstLevel != undefined ? entityDef.resultSkipFirstLevel : this.providerConfiguration.resultSkipFirstLevel;
        if (skipFirstLevel == true) {
            var keys = Object.keys(resultData);
            if (keys.length == 1 && (resultData[keys[0]] instanceof Array || !entityDef.anonymousResult)) resultData = resultData[keys[0]];
        }

        if (resultData.length) {
            return resultData;
        } else return [resultData];
    },
    _compile: function _compile(query) {
        var sqlText = _core.Container.createYQLCompiler().compile(query);
        return sqlText;
    },
    getTraceString: function getTraceString(query) {
        if (!this.AuthenticationProvider) this.AuthenticationProvider = new _core2.default.Authentication.Anonymous({});

        var sqlText = this._compile(query);
        return sqlText;
    },
    setContext: function setContext(ctx) {
        this.context = ctx;
    },
    saveChanges: function saveChanges(callBack) {
        _core.Guard.raise(new _core.Exception("Not Implemented", "Not Implemented"));
    }
}, null);

_core2.default.StorageProviderBase.registerProvider("YQL", _core2.default.storageProviders.YQL.YQLProvider);

},{"jaydata/core":"jaydata/core"}],6:[function(_dereq_,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _core = _dereq_('jaydata/core');

var _core2 = _interopRequireDefault(_core);

var _YQLConverter = _dereq_('./YQLConverter.js');

var _YQLConverter2 = _interopRequireDefault(_YQLConverter);

var _YQLProvider = _dereq_('./YQLProvider.js');

var _YQLProvider2 = _interopRequireDefault(_YQLProvider);

var _YQLCompiler = _dereq_('./YQLCompiler.js');

var _YQLCompiler2 = _interopRequireDefault(_YQLCompiler);

var _geo = _dereq_('./EntitySets/geo.js');

var _geo2 = _interopRequireDefault(_geo);

var _YQLContext = _dereq_('./EntitySets/YQLContext.js');

var _YQLContext2 = _interopRequireDefault(_YQLContext);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

exports.default = _core2.default;
module.exports = exports['default'];

},{"./EntitySets/YQLContext.js":1,"./EntitySets/geo.js":2,"./YQLCompiler.js":3,"./YQLConverter.js":4,"./YQLProvider.js":5,"jaydata/core":"jaydata/core"}]},{},[6])(6)
});

