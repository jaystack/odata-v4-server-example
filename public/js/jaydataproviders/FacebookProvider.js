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

_core2.default.Class.define('$data.storageProviders.Facebook.EntitySets.Command', null, null, {
    constructor: function constructor(cfg) {
        this.Config = _core2.default.typeSystem.extend({
            CommandValue: ""
        }, cfg);
    },
    toString: function toString() {
        return this.Config.CommandValue;
    },
    Config: {}
}, {
    'to$data.Integer': function to$dataInteger(value) {
        return value;
    },
    'to$data.Number': function to$dataNumber(value) {
        return value;
    }
});

_core2.default.Class.define("$data.Facebook.FQLContext", _core2.default.EntityContext, null, {
    constructor: function constructor() {
        var friendsQuery = this.Friends.where(function (f) {
            return f.uid1 == this.me;
        }, { me: _core2.default.Facebook.FQLCommands.me }).select(function (f) {
            return f.uid2;
        });

        this.MyFriends = this.Users.where(function (u) {
            return u.uid in this.friends;
        }, { friends: friendsQuery });
    },
    Users: {
        dataType: _core2.default.EntitySet,
        tableName: 'user',
        elementType: _core2.default.Facebook.types.FbUser
    },
    Friends: {
        dataType: _core2.default.EntitySet,
        tableName: 'friend',
        elementType: _core2.default.Facebook.types.FbFriend
    },
    Pages: {
        dataType: _core2.default.EntitySet,
        tableName: 'page',
        elementType: _core2.default.Facebook.types.FbPage
    }
}, null);

_core2.default.Facebook.FQLCommands = {
    __namespace: true,
    me: new _core2.default.storageProviders.Facebook.EntitySets.Command({ CommandValue: "me()" }),
    now: new _core2.default.storageProviders.Facebook.EntitySets.Command({ CommandValue: "now()" })
};

},{"jaydata/core":"jaydata/core"}],2:[function(_dereq_,module,exports){
"use strict";

var _core = _dereq_("jaydata/core");

var _core2 = _interopRequireDefault(_core);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

_core2.default.Class.define("$data.Facebook.types.FbFriend", _core2.default.Entity, null, {
    uid1: { type: "number", key: true, searchable: true },
    uid2: { type: "number", key: true, searchable: true }
}, null);

},{"jaydata/core":"jaydata/core"}],3:[function(_dereq_,module,exports){
"use strict";

var _core = _dereq_("jaydata/core");

var _core2 = _interopRequireDefault(_core);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

_core2.default.Class.define("$data.Facebook.types.FbPage", _core2.default.Entity, null, {
    page_id: { type: "number", key: true, isPublic: true, searchable: true },
    name: { type: "string", isPublic: true, searchable: true },
    username: { type: "string", isPublic: true, searchable: true },
    description: { type: "string", isPublic: true },
    categories: { type: "array", isPublic: true }, //array	The categories
    is_community_page: { type: "bool", isPublic: true }, //string	Indicates whether the Page is a community Page.
    pic_small: { type: "string", isPublic: true },
    pic_big: { type: "string", isPublic: true },
    pic_square: { type: "string", isPublic: true },
    pic: { type: "string", isPublic: true },
    pic_large: { type: "string", isPublic: true },
    pic_cover: { type: "object", isPublic: true }, //object	The JSON object containing three fields:�cover_id�(the ID of the cover photo),�source�(the URL for the cover photo), andoffset_y�(indicating percentage offset from top [0-100])
    unread_notif_count: { type: "number", isPublic: false },
    new_like_count: { type: "number", isPublic: false },
    fan_count: { type: "number", isPublic: true },
    type: { type: "string", isPublic: true },
    website: { type: "string", isPublic: true },
    has_added_app: { type: "bool", isPublic: true },
    general_info: { type: "string", isPublic: true },
    can_post: { type: "bool", isPublic: true },
    checkins: { type: "number", isPublic: true },
    is_published: { type: "bool", isPublic: true },
    founded: { type: "string", isPublic: true },
    company_overview: { type: "string", isPublic: true },
    mission: { type: "string", isPublic: true },
    products: { type: "string", isPublic: true },
    location: { type: "object", isPublic: true }, //	array	Applicable to all�Places.
    parking: { type: "object", isPublic: true }, //     array	Applicable to�Businesses�and�Places. Can be one of�street,�lot�orvalet
    hours: { type: "array", isPublic: true }, //	array	Applicable to�Businesses�and�Places.
    pharma_safety_info: { type: "string", isPublic: true },
    public_transit: { type: "string", isPublic: true },
    attire: { type: "string", isPublic: true },
    payment_options: { type: "object", isPublic: true }, //array	Applicable to�Restaurants�or�Nightlife.
    culinary_team: { type: "string", isPublic: true },
    general_manager: { type: "string", isPublic: true },
    price_range: { type: "string", isPublic: true },
    restaurant_services: { type: "object", isPublic: true }, //	array	Applicable to�Restaurants.
    restaurant_specialties: { type: "object", isPublic: true }, //	array	Applicable to�Restaurants.
    phone: { type: "string", isPublic: true },
    release_date: { type: "string", isPublic: true },
    genre: { type: "string", isPublic: true },
    starring: { type: "string", isPublic: true },
    screenplay_by: { type: "string", isPublic: true },
    directed_by: { type: "string", isPublic: true },
    produced_by: { type: "string", isPublic: true },
    studio: { type: "string", isPublic: true },
    awards: { type: "string", isPublic: true },
    plot_outline: { type: "string", isPublic: true },
    season: { type: "string", isPublic: true },
    network: { type: "string", isPublic: true },
    schedule: { type: "string", isPublic: true },
    written_by: { type: "string", isPublic: true },
    band_members: { type: "string", isPublic: true },
    hometown: { type: "string", isPublic: true },
    current_location: { type: "string", isPublic: true },
    record_label: { type: "string", isPublic: true },
    booking_agent: { type: "string", isPublic: true },
    press_contact: { type: "string", isPublic: true },
    artists_we_like: { type: "string", isPublic: true },
    influences: { type: "string", isPublic: true },
    band_interests: { type: "string", isPublic: true },
    bio: { type: "string", isPublic: true },
    affiliation: { type: "string", isPublic: true },
    birthday: { type: "string", isPublic: true },
    personal_info: { type: "string", isPublic: true },
    personal_interests: { type: "string", isPublic: true },
    built: { type: "string", isPublic: true },
    features: { type: "string", isPublic: true },
    mpg: { type: "string", isPublic: true }
}, null);

},{"jaydata/core":"jaydata/core"}],4:[function(_dereq_,module,exports){
"use strict";

var _core = _dereq_("jaydata/core");

var _core2 = _interopRequireDefault(_core);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

_core2.default.Class.define("$data.Facebook.types.FbUser", _core2.default.Entity, null, {
    uid: { type: "number", key: true, isPublic: true, searchable: true },
    username: { type: "string", isPublic: true, searchable: true },
    first_name: { type: "string", isPublic: true },
    middle_name: { type: "string", isPublic: true },
    last_name: { type: "string", isPublic: true },
    name: { type: "string", isPublic: true, searchable: true },
    pic_small: { type: "string" },
    pic_big: { type: "string" },
    pic_square: { type: "string" },
    pic: { type: "string" },
    affiliations: { type: "Array", elementType: "Object" },
    profile_update_time: { type: "datetime" },
    timezone: { type: "number" },
    religion: { type: "string" },
    birthday: { type: "string" },
    birthday_date: { type: "string" },
    sex: { type: "string", isPublic: true },
    hometown_location: { type: "Array", elementType: "Object" },
    meeting_sex: { type: "Array", elementType: "Object" },
    meeting_for: { type: "Array", elementType: "Object" },
    relationship_status: { type: "string" },
    significant_other_id: { type: "number" /*uid*/ },
    political: { type: "string" },
    current_location: { type: "Array", elementType: "Object" },
    activities: { type: "string" },
    interests: { type: "string" },
    is_app_user: { type: "bool" },
    music: { type: "string" },
    tv: { type: "string" },
    movies: { type: "string" },
    books: { type: "string" },
    quotes: { type: "string" },
    about_me: { type: "string" },
    hs_info: { type: "Array", elementType: "Object" },
    education_history: { type: "Array", elementType: "Object" },
    work_history: { type: "Array", elementType: "Object" },
    notes_count: { type: "number" },
    wall_count: { type: "number" },
    status: { type: "string" },
    has_added_app: { type: "bool" },
    online_presence: { type: "string" },
    locale: { type: "string", isPublic: true },
    proxied_email: { type: "string" },
    profile_url: { type: "string" },
    email_hashes: { type: "Array", elementType: "Object" },
    pic_small_with_logo: { type: "string", isPublic: true },
    pic_big_with_logo: { type: "string", isPublic: true },
    pic_square_with_logo: { type: "string", isPublic: true },
    pic_with_logo: { type: "string", isPublic: true },
    allowed_restrictions: { type: "string" },
    verified: { type: "bool" },
    profile_blurb: { type: "string" },
    family: { type: "Array", elementType: "Object" },
    website: { type: "string" },
    is_blocked: { type: "bool" },
    contact_email: { type: "string" },
    email: { type: "string" },
    third_party_id: { type: "string", searchable: true },
    name_format: { type: "string" },
    video_upload_limits: { type: "Array", elementType: "Object" },
    games: { type: "string" },
    work: { type: "Array", elementType: "Object" },
    education: { type: "Array", elementType: "Object" },
    sports: { type: "Array", elementType: "Object" },
    favorite_athletes: { type: "Array", elementType: "Object" },
    favorite_teams: { type: "Array", elementType: "Object" },
    inspirational_people: { type: "Array", elementType: "Object" },
    languages: { type: "Array", elementType: "Object" },
    likes_count: { type: "number" },
    friend_count: { type: "number" },
    mutual_friend_count: { type: "number" },
    can_post: { type: "bool" }
}, null);

},{"jaydata/core":"jaydata/core"}],5:[function(_dereq_,module,exports){
'use strict';

var _core = _dereq_('jaydata/core');

var _core2 = _interopRequireDefault(_core);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

//"use strict";	// suspicious code

(0, _core.$C)('$data.storageProviders.Facebook.FacebookCompiler', _core2.default.Expressions.EntityExpressionVisitor, null, {
    constructor: function constructor() {
        this.provider = {};
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

        var autoGeneratedSelect = false;
        if (!context.projectionSql.sql) {
            context.projectionSql = this.autoGenerateProjection(query);
            autoGeneratedSelect = true;
        }

        if (context.filterSql.sql == '') _core.Guard.raise(new _core.Exception('Filter/where statement is required', 'invalid operation'));

        return {
            queryText: context.projectionSql.sql + ' FROM ' + context.tableName + context.filterSql.sql + context.orderSql.sql + context.takeSql.sql + (context.takeSql.sql ? context.skipSql.sql : ''),
            selectMapping: autoGeneratedSelect == false ? context.projectionSql.selectFields : null,
            params: []
        };
    },

    autoGenerateProjection: function autoGenerateProjection(query) {
        var entitySet = query.context.getEntitySetFromElementType(query.defaultType);
        var newQueryable = new _core2.default.Queryable(query.context, entitySet.expression);
        //newQueryable._checkRootExpression(entitySet.collectionName);
        var codeExpression = _core.Container.createCodeExpression(this.generateProjectionFunc(query));
        var exp = _core.Container.createProjectionExpression(newQueryable.expression, codeExpression);
        var q = _core.Container.createQueryable(newQueryable, exp);

        var expression = q.expression;
        var preparator = _core.Container.createQueryExpressionCreator(query.context);
        expression = preparator.Visit(expression);

        var databaseQuery = {
            projectionSql: { sql: '' }
        };
        this.Visit(expression, databaseQuery);

        return databaseQuery.projectionSql;
    },
    generateProjectionFunc: function generateProjectionFunc(query) {
        var isAuthenticated = this.provider.AuthenticationProvider.Authenticated || this.provider.providerConfiguration.Access_Token;
        var publicMemberDefinitions = query.defaultType.memberDefinitions.getPublicMappedProperties();
        if (!isAuthenticated && publicMemberDefinitions.some(function (memDef) {
            return memDef.isPublic == true;
        })) {
            publicMemberDefinitions = publicMemberDefinitions.filter(function (memDef) {
                return memDef.isPublic == true;
            });
        }

        var selectStr = 'function (s){ return {';
        publicMemberDefinitions.forEach(function (memDef, i) {
            if (i != 0) selectStr += ', ';
            selectStr += memDef.name + ': s.' + memDef.name;
        });
        selectStr += '}; }';

        //var projectionFunc = null;
        //eval(selectStr);
        return selectStr;
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
        if (context.projectionSql.sql == '') context.projectionSql.sql = 'SELECT ';else _core.Guard.raise(new _core.Exception('Multiple select error'));

        this.Visit(expression.selector, context.projectionSql);
    },
    VisitOrderExpression: function VisitOrderExpression(expression, context) {
        ///<param name="expression" type="$data.Expressions.OrderExpression" />
        this.Visit(expression.source, context);

        context.orderSql.type = expression.nodeType;
        if (context.orderSql.sql == '') context.orderSql.sql = ' ORDER BY ';else _core.Guard.raise(new _core.Exception('Multiple sorting not supported', 'not supported'));

        this.Visit(expression.selector, context.orderSql);
        context.orderSql.sql += expression.nodeType == _core2.default.Expressions.ExpressionType.OrderByDescending ? " DESC" : " ASC";
    },
    VisitPagingExpression: function VisitPagingExpression(expression, context) {
        ///<param name="expression" type="$data.Expressions.PagingExpression" />
        this.Visit(expression.source, context);

        if (expression.nodeType == _core2.default.Expressions.ExpressionType.Skip) {
            context.skipSql.type = expression.nodeType;
            context.skipSql.sql = ' OFFSET ';
            this.Visit(expression.amount, context.skipSql);
        } else if (expression.nodeType == _core2.default.Expressions.ExpressionType.Take) {
            context.takeSql.type = expression.nodeType;
            context.takeSql.sql = ' LIMIT ';
            this.Visit(expression.amount, context.takeSql);
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
        var source = this.Visit(expression.selector, context);
    },
    VisitMemberInfoExpression: function VisitMemberInfoExpression(expression, context) {
        var memberName = expression.memberName;
        context.sql += memberName;
        //context.fieldName = memberName;
        context.fieldData = { name: memberName, dataType: expression.memberDefinition.dataType };

        if (context.type == 'Projection' && !context.selectFields) {
            if (context.fieldOperation === true) context.selectFields = [{ from: 'anon' }];else context.selectFields = [{ from: memberName, dataType: expression.memberDefinition.dataType }];
        }
    },

    VisitConstantExpression: function VisitConstantExpression(expression, context) {
        if (context.type == 'Projection') _core.Guard.raise(new _core.Exception('Constant value is not supported in Projection.', 'Not supported!'));

        this.VisitQueryParameterExpression(expression, context);
    },

    VisitQueryParameterExpression: function VisitQueryParameterExpression(expression, context) {
        if (expression.value instanceof _core2.default.storageProviders.Facebook.EntitySets.Command) {
            context.sql += "" + expression.value + "";
        } else if (expression.value instanceof _core2.default.Queryable) {
            context.sql += '(' + expression.value.toTraceString().queryText + ')';
        } else {
            var expressionValueType = _core.Container.resolveType(expression.type);
            if (this.provider.supportedDataTypes.indexOf(expressionValueType) != -1) context.sql += this.provider.fieldConverter.toDb[_core.Container.resolveName(expressionValueType)](expression.value);else {
                context.sql += "" + expression.value + "";
            }
        }
    },

    VisitParametricQueryExpression: function VisitParametricQueryExpression(expression, context) {
        var exp = this.Visit(expression.expression, context);
        context.parameters = expression.parameters;
    },

    VisitEntitySetExpression: function VisitEntitySetExpression(expression, context) {
        context.tableName = expression.instance.tableName;
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
                var toProperty = context.mappingPrefix instanceof Array ? context.mappingPrefix.join('.') + '.' + member.fieldName : member.fieldName;
                context.selectFields.push({ from: context.fieldData.name, to: toProperty, dataType: context.fieldData.dataType });
            }
        });
    },
    VisitObjectFieldExpression: function VisitObjectFieldExpression(expression, context) {
        return this.Visit(expression.expression, context);
    },

    VisitEntityFieldOperationExpression: function VisitEntityFieldOperationExpression(expression, context) {
        _core.Guard.requireType("expression.operation", expression.operation, _core2.default.Expressions.MemberInfoExpression);

        var opDef = expression.operation.memberDefinition;
        var opName = opDef.mapTo || opDef.name;

        context.sql += '(';

        if (opDef.expressionInParameter == false) this.Visit(expression.source, context);

        context.sql += opName;
        context.sql += "(";
        var paramCounter = 0;
        var params = opDef.parameters || [];

        var args = params.map(function (item, index) {
            var result = { dataType: item.dataType };
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

                if (context.type == 'Projection') context.fieldOperation = true;

                this.Visit(arg.value, context);

                if (context.type == 'Projection') context.fieldOperation = undefined;
            } else _core.Guard.raise(new _core.Exception(arg.dataType + " not allowed in '" + expression.operation.memberName + "' statement", "invalid operation"));
        }, this);

        if (context.fieldData && context.fieldData.name) context.fieldData.name = 'anon';

        if (opDef.rigthValue) context.sql += opDef.rigthValue;else context.sql += ")";

        context.sql += ')';
    }
}, null);

},{"jaydata/core":"jaydata/core"}],6:[function(_dereq_,module,exports){
'use strict';

var _core = _dereq_('jaydata/core');

var _core2 = _interopRequireDefault(_core);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

_core2.default.FacebookConverter = {
    fromDb: {
        '$data.Byte': _core2.default.Container.proxyConverter,
        '$data.SByte': _core2.default.Container.proxyConverter,
        '$data.Decimal': _core2.default.Container.proxyConverter,
        '$data.Float': _core2.default.Container.proxyConverter,
        '$data.Int16': _core2.default.Container.proxyConverter,
        '$data.Int64': _core2.default.Container.proxyConverter,
        '$data.Number': _core2.default.Container.proxyConverter,
        '$data.Integer': _core2.default.Container.proxyConverter,
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

},{"jaydata/core":"jaydata/core"}],7:[function(_dereq_,module,exports){
'use strict';

var _core = _dereq_('jaydata/core');

var _core2 = _interopRequireDefault(_core);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

_core2.default.Class.define('$data.storageProviders.Facebook.FacebookProvider', _core2.default.StorageProviderBase, null, {
    constructor: function constructor(cfg) {
        var provider = this;
        this.SqlCommands = [];
        this.context = {};
        this.providerConfiguration = _core2.default.typeSystem.extend({
            FQLFormat: "format=json",
            FQLQueryUrl: "https://graph.facebook.com/fql?q=",
            Access_Token: ''
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
                mapTo: "strpos",
                parameters: [{ name: "@expression", dataType: _core2.default.String }, { name: "strFragment", dataType: _core2.default.String }],
                rigthValue: ') >= 0'
            },
            'startsWith': {
                dataType: _core2.default.String,
                allowedIn: _core2.default.Expressions.FilterExpression,
                mapTo: "strpos",
                parameters: [{ name: "@expression", dataType: _core2.default.String }, { name: "strFragment", dataType: _core2.default.String }],
                rigthValue: ') = 0'
            },
            'strpos': {
                dataType: _core2.default.Integer,
                allowedIn: [_core2.default.Expressions.FilterExpression, _core2.default.Expressions.ProjectionExpression],
                mapTo: "strpos",
                parameters: [{ name: "@expression", dataType: _core2.default.String }, { name: "strFragment", dataType: _core2.default.String }]
            },
            'substr': {
                dataType: _core2.default.String,
                allowedIn: [_core2.default.Expressions.FilterExpression, _core2.default.Expressions.ProjectionExpression],
                mapTo: "substr",
                parameters: [{ name: "@expression", dataType: _core2.default.String }, { name: "startIdx", dataType: _core2.default.Number }, { name: "length", dataType: _core2.default.Number }]
            },
            'strlen': {
                dataType: _core2.default.Integer,
                allowedIn: [_core2.default.Expressions.FilterExpression, _core2.default.Expressions.ProjectionExpression],
                mapTo: "strlen",
                parameters: [{ name: "@expression", dataType: _core2.default.String }]
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
            and: { mapTo: ' AND ', dataType: _core2.default.Booleanv },
            'in': { mapTo: ' IN ', dataType: _core2.default.Boolean, resolvableType: [_core2.default.Array, _core2.default.Queryable], allowedIn: _core2.default.Expressions.FilterExpression }
        }
    },
    supportedUnaryOperators: {
        value: {}
    },
    fieldConverter: { value: _core2.default.FacebookConverter },
    supportedSetOperations: {
        value: {
            filter: {},
            length: {},
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
    executeQuery: function executeQuery(query, callBack) {
        callBack = _core2.default.PromiseHandlerBase.createCallbackSettings(callBack);

        if (!this.AuthenticationProvider) this.AuthenticationProvider = new _core2.default.Authentication.Anonymous({});

        var sql;
        try {
            sql = this._compile(query);
        } catch (e) {
            callBack.error(e);
            return;
        }

        var schema = query.defaultType;
        var ctx = this.context;

        var includes = [];
        if (!sql.selectMapping) this._discoverType('', schema, includes);

        var requestUrl = this.providerConfiguration.FQLQueryUrl + encodeURIComponent(sql.queryText) + "&" + this.providerConfiguration.FQLFormat;
        if (this.providerConfiguration.Access_Token) {
            requestUrl += '&access_token=' + this.providerConfiguration.Access_Token;
        }

        var requestData = {
            url: requestUrl,
            dataType: "JSON",
            success: function success(data, textStatus, jqXHR) {
                query.rawDataList = data.data;
                var compiler = _core.Container.createModelBinderConfigCompiler(query, []);
                compiler.Visit(query.expression);

                if (query.expression instanceof _core2.default.Expressions.CountExpression) {
                    query.rawDataList = [{ cnt: data.data.length }];
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
    _discoverType: function _discoverType(dept, type, result) {
        type.memberDefinitions.getPublicMappedProperties().forEach(function (memDef) {
            var type = _core.Container.resolveType(memDef.dataType);

            if (type.isAssignableTo || type == Array) {
                var name = dept ? dept + '.' + memDef.name : memDef.name;

                if (type == Array || type.isAssignableTo(_core2.default.EntitySet)) {
                    if (memDef.inverseProperty) type = _core.Container.resolveType(memDef.elementType);else return;
                }

                result.push({ name: name, type: type });
                this._discoverType(name, type, result);
            }
        }, this);
    },
    _compile: function _compile(query) {
        var sqlText = _core.Container.createFacebookCompiler().compile(query);
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
        _core.Guard.raise(new _core.Exception("Not implemented", "Not implemented"));
    }
}, null);

_core2.default.StorageProviderBase.registerProvider("Facebook", _core2.default.storageProviders.Facebook.FacebookProvider);

},{"jaydata/core":"jaydata/core"}],8:[function(_dereq_,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _core = _dereq_('jaydata/core');

var _core2 = _interopRequireDefault(_core);

var _FacebookConverter = _dereq_('./FacebookConverter.js');

var _FacebookConverter2 = _interopRequireDefault(_FacebookConverter);

var _FacebookProvider = _dereq_('./FacebookProvider.js');

var _FacebookProvider2 = _interopRequireDefault(_FacebookProvider);

var _FacebookCompiler = _dereq_('./FacebookCompiler.js');

var _FacebookCompiler2 = _interopRequireDefault(_FacebookCompiler);

var _user = _dereq_('./EntitySets/FQL/user.js');

var _user2 = _interopRequireDefault(_user);

var _friend = _dereq_('./EntitySets/FQL/friend.js');

var _friend2 = _interopRequireDefault(_friend);

var _page = _dereq_('./EntitySets/FQL/page.js');

var _page2 = _interopRequireDefault(_page);

var _FQLContext = _dereq_('./EntitySets/FQLContext.js');

var _FQLContext2 = _interopRequireDefault(_FQLContext);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

exports.default = _core2.default;
module.exports = exports['default'];

},{"./EntitySets/FQL/friend.js":2,"./EntitySets/FQL/page.js":3,"./EntitySets/FQL/user.js":4,"./EntitySets/FQLContext.js":1,"./FacebookCompiler.js":5,"./FacebookConverter.js":6,"./FacebookProvider.js":7,"jaydata/core":"jaydata/core"}]},{},[8])(8)
});

