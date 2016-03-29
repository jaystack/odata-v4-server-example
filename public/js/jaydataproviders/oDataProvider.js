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

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.strategy = undefined;

var _core = _dereq_('jaydata/core');

var _core2 = _interopRequireDefault(_core);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var strategy = {
    name: 'batch',
    condition: function condition(provider, convertedItems) {
        var disabled = false;
        if (typeof provider.providerConfiguration.disableBatch !== 'undefined') {
            disabled = !!provider.providerConfiguration.disableBatch;
        } else {
            disabled = !!_core2.default.defaults.OData.disableBatch;
        }

        if (!disabled) {
            var requests = convertedItems.getItems();
            return requests.length > 1;
        }

        return false;
    },
    save: function save(provider, convertedItems, callBack) {
        var that = provider;
        var items = convertedItems.getItems();
        var requests = items.map(function (it) {
            return it.request.build().get();
        });

        var requestData = [{
            requestUri: that.providerConfiguration.oDataServiceHost + "/$batch",
            method: "POST",
            data: {
                __batchRequests: [{ __changeRequests: requests }]
            },
            headers: {}
        }, function (data, response) {
            if (response.statusCode == 200 || response.statusCode == 202) {
                var result = data.__batchResponses[0].__changeResponses;
                var errors = [];

                for (var i = 0; i < result.length; i++) {
                    if (result[i].statusCode >= 200 && result[i].statusCode < 300) {
                        var item = convertedItems.getByResponse(result[i], i);
                        if (item instanceof _core2.default.Entity && result[i].statusCode != 204) {
                            that.reload_fromResponse(item, result[i].data, result[i]);
                            convertedItems.setProcessed(item);
                        }
                    } else {
                        errors.push(that.parseError(result[i]));
                    }
                }
                if (errors.length > 0) {
                    if (errors.length === 1) {
                        callBack.error(errors[0]);
                    } else {
                        callBack.error(new _core.Exception('See inner exceptions', 'Batch failed', errors));
                    }
                } else if (callBack.success) {
                    callBack.success(convertedItems.length);
                }
            } else {
                callBack.error(that.parseError(response));
            }
        }, function (e) {
            callBack.error(that.parseError(e));
        }, that.oData.batch.batchHandler];

        if (typeof that.providerConfiguration.useJsonLight !== 'undefined') {
            requestData[0].useJsonLight = that.providerConfiguration.useJsonLight;
        }

        that.appendBasicAuth(requestData[0], that.providerConfiguration.user, that.providerConfiguration.password, that.providerConfiguration.withCredentials);

        that.context.prepareRequest.call(that, requestData);
        that.oData.request.apply(that, requestData);
    }
};

exports.strategy = strategy;

},{"jaydata/core":"jaydata/core"}],2:[function(_dereq_,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var strategy = {
    name: 'empty',
    condition: function condition(provider, convertedItems) {
        return true;
    },
    save: function save(provider, convertedItems, callBack) {
        callBack.success(0);
    }
};

exports.strategy = strategy;

},{}],3:[function(_dereq_,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.strategy = undefined;

var _core = _dereq_('jaydata/core');

var _core2 = _interopRequireDefault(_core);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var strategy = {
    name: 'single',
    condition: function condition(provider, convertedItems) {
        var requests = convertedItems.getItems();
        return requests.length > 0;
    },
    save: function save(provider, convertedItems, callBack) {
        var that = provider;
        var items = convertedItems.getItems();

        var doSave = function doSave(items, index, done) {
            var item = items[index];
            if (!item) return done();

            var request = item.request.build().get();
            var requestData = [request, function (data, response) {
                if (response.statusCode >= 200 && response.statusCode < 300) {
                    var item = convertedItems.getByResponse(response, index);
                    if (item instanceof _core2.default.Entity && response.statusCode != 204) {
                        that.reload_fromResponse(item, data, response);
                        convertedItems.setProcessed(item);
                    }

                    doSave(items, ++index, done);
                } else {
                    done(response);
                }
            }, done];

            that.appendBasicAuth(requestData[0], that.providerConfiguration.user, that.providerConfiguration.password, that.providerConfiguration.withCredentials);
            that.context.prepareRequest.call(that, requestData);
            that.oData.request.apply(that, requestData);
        };

        doSave(items, 0, function (err, result) {
            if (err) return callBack.error(that.parseError(err));
            callBack.success(result);
        });
    }
};

exports.strategy = strategy;

},{"jaydata/core":"jaydata/core"}],4:[function(_dereq_,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _core = _dereq_('jaydata/core');

var _core2 = _interopRequireDefault(_core);

var _oDataConverter = _dereq_('./oDataConverter.js');

var _oDataConverter2 = _interopRequireDefault(_oDataConverter);

var _oDataProvider = _dereq_('./oDataProvider.js');

var _oDataProvider2 = _interopRequireDefault(_oDataProvider);

var _oDataCompiler = _dereq_('./oDataCompiler.js');

var _oDataCompiler2 = _interopRequireDefault(_oDataCompiler);

var _oDataWhereCompiler = _dereq_('./oDataWhereCompiler.js');

var _oDataWhereCompiler2 = _interopRequireDefault(_oDataWhereCompiler);

var _oDataIncludeCompiler = _dereq_('./oDataIncludeCompiler.js');

var _oDataIncludeCompiler2 = _interopRequireDefault(_oDataIncludeCompiler);

var _oDataOrderCompiler = _dereq_('./oDataOrderCompiler.js');

var _oDataOrderCompiler2 = _interopRequireDefault(_oDataOrderCompiler);

var _oDataPagingCompiler = _dereq_('./oDataPagingCompiler.js');

var _oDataPagingCompiler2 = _interopRequireDefault(_oDataPagingCompiler);

var _oDataProjectionCompiler = _dereq_('./oDataProjectionCompiler.js');

var _oDataProjectionCompiler2 = _interopRequireDefault(_oDataProjectionCompiler);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

exports.default = _core2.default;
module.exports = exports['default'];

},{"./oDataCompiler.js":5,"./oDataConverter.js":6,"./oDataIncludeCompiler.js":7,"./oDataOrderCompiler.js":8,"./oDataPagingCompiler.js":9,"./oDataProjectionCompiler.js":10,"./oDataProvider.js":11,"./oDataWhereCompiler.js":13,"jaydata/core":"jaydata/core"}],5:[function(_dereq_,module,exports){
'use strict';

var _core = _dereq_('jaydata/core');

var _core2 = _interopRequireDefault(_core);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

(0, _core.$C)('$data.storageProviders.oData.oDataCompiler', _core2.default.Expressions.EntityExpressionVisitor, null, {
    constructor: function constructor() {
        this.context = {};
        this.provider = {};
        //this.logicalType = null;
        this.includes = null;
        this.mainEntitySet = null;
    },
    compile: function compile(query) {

        this.provider = query.context.storageProvider;
        this.context = query.context;

        if (query.defaultType) {
            this.mainEntitySet = query.context.getEntitySetFromElementType(query.defaultType);
        }

        var queryFragments = { urlText: "" };

        this.Visit(query.expression, queryFragments);
        if (queryFragments.$expand) {
            queryFragments.$expand = queryFragments.$expand.toString();
        }

        query.modelBinderConfig = {};
        var modelBinder = _core.Container.createModelBinderConfigCompiler(query, this.includes, true);
        modelBinder.Visit(query.expression);

        var queryText = queryFragments.urlText;
        var addAmp = false;

        if (queryFragments.$funcParams) {
            queryText += "(" + queryFragments.$funcParams + ")";
        }

        for (var name in queryFragments) {
            if (name != "urlText" && name != "actionPack" && name != "data" && name != "lambda" && name != "method" && name != "postData" && name != "_isBatchExecuteQuery" && name != "_subQueries" && name != "$funcParams" && queryFragments[name] != "") {

                if (addAmp) {
                    queryText += "&";
                } else {
                    queryText += "?";
                }
                addAmp = true;
                if (name != "$urlParams") {
                    queryText += name + '=' + queryFragments[name];
                } else {
                    queryText += queryFragments[name];
                }
            }
        }
        query.queryText = queryText;
        query.postData = queryFragments.postData;
        var result = {
            queryText: queryText,
            withInlineCount: '$inlinecount' in queryFragments || '$count' in queryFragments,
            method: queryFragments.method || 'GET',
            postData: queryFragments.postData,
            isBatchExecuteQuery: queryFragments._isBatchExecuteQuery,
            subQueries: queryFragments._subQueries,
            params: []
        };

        query._getComplitedData = function () {
            return result;
        };

        return result;
    },
    VisitOrderExpression: function VisitOrderExpression(expression, context) {
        this.Visit(expression.source, context);

        var orderCompiler = _core.Container.createoDataOrderCompiler(this.provider);
        orderCompiler.compile(expression, context);
    },
    VisitPagingExpression: function VisitPagingExpression(expression, context) {
        this.Visit(expression.source, context);

        var pagingCompiler = _core.Container.createoDataPagingCompiler(this.provider);
        pagingCompiler.compile(expression, context);
    },
    VisitIncludeExpression: function VisitIncludeExpression(expression, context) {
        this.Visit(expression.source, context);

        var includeCompiler = _core.Container.createoDataIncludeCompiler(this.provider);
        this.includes = this.includes || [];
        var includeContext = { data: context["$expand"], includes: this.includes };
        includeCompiler.compile(expression.selector, includeContext);
        context["$expand"] = includeContext.data;
    },
    VisitFindExpression: function VisitFindExpression(expression, context) {
        this.Visit(expression.source, context);

        if (expression.subMember) {
            context.urlText += "/" + expression.subMember.memberName;
        }

        context.urlText += '(';
        if (expression.params.length === 1) {
            var param = expression.params[0];
            var typeName = _core.Container.resolveName(param.type);

            var converter = this.provider.fieldConverter.toDb[typeName];
            var value = converter ? converter(param.value) : param.value;

            converter = this.provider.fieldConverter.escape[typeName];
            value = converter ? converter(param.value) : param.value;
            context.urlText += value;
        } else {
            for (var i = 0; i < expression.params.length; i++) {
                var param = expression.params[i];
                var typeName = _core.Container.resolveName(param.type);

                var converter = this.provider.fieldConverter.toDb[typeName];
                var value = converter ? converter(param.value) : param.value;

                converter = this.provider.fieldConverter.escape[typeName];
                value = converter ? converter(param.value) : param.value;

                if (i > 0) context.urlText += ',';
                context.urlText += param.name + '=' + value;
            }
        }
        context.urlText += ')';
    },
    VisitProjectionExpression: function VisitProjectionExpression(expression, context) {
        this.Visit(expression.source, context);

        var projectionCompiler = _core.Container.createoDataProjectionCompiler(this.provider);
        projectionCompiler.compile(expression, context);
    },
    VisitFilterExpression: function VisitFilterExpression(expression, context) {
        ///<param name="expression" type="$data.Expressions.FilterExpression" />

        this.Visit(expression.source, context);

        var filterCompiler = _core.Container.createoDataWhereCompiler(this.provider);
        context.data = "";
        filterCompiler.compile(expression.selector, context);
        context["$filter"] = context.data;
        context.data = "";
    },
    VisitInlineCountExpression: function VisitInlineCountExpression(expression, context) {
        this.Visit(expression.source, context);
        if (this.provider.providerConfiguration.maxDataServiceVersion === "4.0") {
            context["$count"] = expression.selector.value === 'allpages';
        } else {
            context["$inlinecount"] = expression.selector.value;
        }
    },
    VisitEntitySetExpression: function VisitEntitySetExpression(expression, context) {
        context.urlText += "/" + expression.instance.tableName;
        //this.logicalType = expression.instance.elementType;
        if (expression.params) {
            for (var i = 0; i < expression.params.length; i++) {
                this.Visit(expression.params[i], context);
            }
        }
    },
    VisitServiceOperationExpression: function VisitServiceOperationExpression(expression, context) {
        if (expression.boundItem) {
            context.urlText += "/" + expression.boundItem.entitySet.tableName;
            if (expression.boundItem.data instanceof _core2.default.Entity) {
                context.urlText += '(' + this.provider.getEntityKeysValue(expression.boundItem) + ')';
            }
        }
        context.urlText += "/" + (expression.cfg.namespace ? expression.cfg.namespace + "." + expression.cfg.serviceName : expression.cfg.serviceName);
        context.method = context.method || expression.cfg.method;

        //this.logicalType = expression.returnType;
        if (expression.params) {
            context.serviceConfig = expression.cfg;
            for (var i = 0; i < expression.params.length; i++) {
                this.Visit(expression.params[i], context);
            }
            delete context.serviceConfig;
        }
    },
    VisitBatchDeleteExpression: function VisitBatchDeleteExpression(expression, context) {
        this.Visit(expression.source, context);
        context.urlText += '/$batchDelete';
        context.method = 'DELETE';
    },

    VisitConstantExpression: function VisitConstantExpression(expression, context) {
        var typeName = _core.Container.resolveName(expression.type);
        if (expression.value instanceof _core2.default.Entity) typeName = _core2.default.Entity.fullName;

        var converter = this.provider.fieldConverter.toDb[typeName];
        var value = converter ? converter(expression.value, expression) : expression.value;

        if (context.method === 'GET' || !context.method) {
            converter = this.provider.fieldConverter.escape[typeName];
            value = converter ? converter(value, expression) : value;
            if (value !== undefined) {
                var serviceConfig = context.serviceConfig || {};
                var paramConfig = serviceConfig && serviceConfig.params.filter(function (p) {
                    return p.name == expression.name;
                })[0] || {};

                var useAlias = serviceConfig.namespace && (paramConfig.useAlias || serviceConfig.useAlias || this.provider.providerConfiguration.useParameterAlias || _core2.default.defaults.OData.useParameterAlias);

                var paramValue = useAlias ? "@" + expression.name : value;
                var paramName = (useAlias ? "@" : "") + expression.name;

                if (serviceConfig.namespace) {
                    if (context['$funcParams']) {
                        context['$funcParams'] += ',';
                    } else {
                        context['$funcParams'] = '';
                    }
                    context['$funcParams'] += expression.name + '=' + paramValue;
                }

                if (!serviceConfig.namespace || useAlias) {
                    if (context['$urlParams']) {
                        context['$urlParams'] += '&';
                    } else {
                        context['$urlParams'] = '';
                    }
                    context['$urlParams'] += paramName + '=' + value;
                }
            }
        } else {
            context.postData = context.postData || {};
            context.postData[expression.name] = value;
        }
    },
    //    VisitConstantExpression: function (expression, context) {
    //        if (context['$urlParams']) { context['$urlParams'] += '&'; } else { context['$urlParams'] = ''; }
    //
    //
    //        var valueType = Container.getTypeName(expression.value);
    //
    //
    //
    //        context['$urlParams'] += expression.name + '=' + this.provider.fieldConverter.toDb[Container.resolveName(Container.resolveType(valueType))](expression.value);
    //    },

    VisitCountExpression: function VisitCountExpression(expression, context) {
        this.Visit(expression.source, context);
        context.urlText += '/$count';
    },

    VisitBatchExecuteQueryExpression: function VisitBatchExecuteQueryExpression(expression, context) {
        context.urlText += '/$batch';
        context.method = 'POST';
        context.postData = { __batchRequests: [] };
        context._isBatchExecuteQuery = true;
        context._subQueries = expression.members;

        for (var i = 0; i < expression.members.length; i++) {
            var queryable = expression.members[i];
            var compiler = new _core2.default.storageProviders.oData.oDataCompiler();
            var compiled = compiler.compile(queryable);
            context.postData.__batchRequests.push({
                requestUri: this.provider.providerConfiguration.oDataServiceHost + compiled.queryText,
                method: compiled.method,
                data: compiled.data,
                headers: compiled.headers
            });
        }
    }
}, {});

},{"jaydata/core":"jaydata/core"}],6:[function(_dereq_,module,exports){
(function (global){
'use strict';

var _core = _dereq_('jaydata/core');

var _core2 = _interopRequireDefault(_core);

var _atob = (typeof window !== "undefined" ? window['atob'] : typeof global !== "undefined" ? global['atob'] : null);

var _atob2 = _interopRequireDefault(_atob);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

_core2.default.defaults = _core2.default.defaults || {};
_core2.default.defaults.oDataWebApi = false;

_core2.default.oDataConverter = {
    fromDb: {
        '$data.Enum': function $dataEnum(v, enumType) {
            return _core2.default.Container.convertTo(v, enumType);
        },
        '$data.Byte': _core2.default.Container.proxyConverter,
        '$data.SByte': _core2.default.Container.proxyConverter,
        '$data.Decimal': function $dataDecimal(v) {
            return _core2.default.Container.convertTo(v, _core2.default.Decimal);
        },
        '$data.Float': _core2.default.Container.proxyConverter,
        '$data.Int16': _core2.default.Container.proxyConverter,
        '$data.Int64': function $dataInt64(v) {
            return _core2.default.Container.convertTo(v, _core2.default.Int64);
        },
        '$data.ObjectID': _core2.default.Container.proxyConverter,
        '$data.Integer': _core2.default.Container.proxyConverter, //function (number) { return (typeof number === 'string' && /^\d+$/.test(number)) ? parseInt(number) : number; },
        '$data.Int32': _core2.default.Container.proxyConverter,
        '$data.Number': _core2.default.Container.proxyConverter,
        '$data.Date': function $dataDate(dbData) {
            if (dbData) {
                if (dbData instanceof Date) {
                    return dbData;
                } else if (dbData.substring(0, 6) === '/Date(') {
                    return new Date(parseInt(dbData.substr(6)));
                } else {
                    //ISODate without Z? Safari compatible with Z
                    if (dbData.indexOf('Z') === -1 && !dbData.match('T.*[+-]')) dbData += 'Z';
                    return new Date(dbData);
                }
            } else {
                return dbData;
            }
        },
        '$data.DateTimeOffset': function $dataDateTimeOffset(dbData) {
            if (dbData) {
                if (dbData instanceof Date) {
                    return dbData;
                } else if (dbData.substring(0, 6) === '/Date(') {
                    return new Date(parseInt(dbData.substr(6)));
                } else {
                    //ISODate without Z? Safari compatible with Z
                    if (dbData.indexOf('Z') === -1 && !dbData.match('T.*[+-]')) dbData += 'Z';
                    return new Date(dbData);
                }
            } else {
                return dbData;
            }
        },
        '$data.Time': function $dataTime(v) {
            return _core2.default.Container.convertTo(v, _core2.default.Time);
        },
        '$data.Day': _core2.default.Container.proxyConverter,
        '$data.Duration': _core2.default.Container.proxyConverter,
        '$data.String': _core2.default.Container.proxyConverter,
        '$data.Boolean': _core2.default.Container.proxyConverter,
        '$data.Blob': function $dataBlob(v) {
            if (typeof v == 'string') {
                try {
                    return _core2.default.Container.convertTo((0, _atob2.default)(v), '$data.Blob');
                } catch (e) {
                    return v;
                }
            } else return v;
        },
        '$data.Object': function $dataObject(o) {
            if (o === undefined) {
                return new _core2.default.Object();
            } else if (typeof o === 'string') {
                return JSON.parse(o);
            }return o;
        },
        '$data.Array': function $dataArray(o) {
            if (o === undefined) {
                return new _core2.default.Array();
            } else if (o instanceof _core2.default.Array) {
                return o;
            }return JSON.parse(o);
        },
        '$data.GeographyPoint': function $dataGeographyPoint(g) {
            if (g) {
                return new _core2.default.GeographyPoint(g);
            }return g;
        },
        '$data.GeographyLineString': function $dataGeographyLineString(g) {
            if (g) {
                return new _core2.default.GeographyLineString(g);
            }return g;
        },
        '$data.GeographyPolygon': function $dataGeographyPolygon(g) {
            if (g) {
                return new _core2.default.GeographyPolygon(g);
            }return g;
        },
        '$data.GeographyMultiPoint': function $dataGeographyMultiPoint(g) {
            if (g) {
                return new _core2.default.GeographyMultiPoint(g);
            }return g;
        },
        '$data.GeographyMultiLineString': function $dataGeographyMultiLineString(g) {
            if (g) {
                return new _core2.default.GeographyMultiLineString(g);
            }return g;
        },
        '$data.GeographyMultiPolygon': function $dataGeographyMultiPolygon(g) {
            if (g) {
                return new _core2.default.GeographyMultiPolygon(g);
            }return g;
        },
        '$data.GeographyCollection': function $dataGeographyCollection(g) {
            if (g) {
                return new _core2.default.GeographyCollection(g);
            }return g;
        },
        '$data.GeometryPoint': function $dataGeometryPoint(g) {
            if (g) {
                return new _core2.default.GeometryPoint(g);
            }return g;
        },
        '$data.GeometryLineString': function $dataGeometryLineString(g) {
            if (g) {
                return new _core2.default.GeometryLineString(g);
            }return g;
        },
        '$data.GeometryPolygon': function $dataGeometryPolygon(g) {
            if (g) {
                return new _core2.default.GeometryPolygon(g);
            }return g;
        },
        '$data.GeometryMultiPoint': function $dataGeometryMultiPoint(g) {
            if (g) {
                return new _core2.default.GeometryMultiPoint(g);
            }return g;
        },
        '$data.GeometryMultiLineString': function $dataGeometryMultiLineString(g) {
            if (g) {
                return new _core2.default.GeometryMultiLineString(g);
            }return g;
        },
        '$data.GeometryMultiPolygon': function $dataGeometryMultiPolygon(g) {
            if (g) {
                return new _core2.default.GeometryMultiPolygon(g);
            }return g;
        },
        '$data.GeometryCollection': function $dataGeometryCollection(g) {
            if (g) {
                return new _core2.default.GeometryCollection(g);
            }return g;
        },
        '$data.Guid': function $dataGuid(guid) {
            return guid ? guid.toString() : guid;
        }
    },
    toDb: {
        '$data.Enum': _core2.default.Container.proxyConverter,
        '$data.Entity': _core2.default.Container.proxyConverter,
        '$data.Byte': _core2.default.Container.proxyConverter,
        '$data.SByte': _core2.default.Container.proxyConverter,
        '$data.Decimal': _core2.default.Container.proxyConverter, //function (v) { return v ? parseFloat(v) : v },
        '$data.Float': _core2.default.Container.proxyConverter,
        '$data.Int16': _core2.default.Container.proxyConverter,
        '$data.Int64': _core2.default.Container.proxyConverter, //function (v) { return v ? parseInt(v) : v },
        '$data.ObjectID': _core2.default.Container.proxyConverter,
        '$data.Integer': _core2.default.Container.proxyConverter,
        '$data.Int32': _core2.default.Container.proxyConverter,
        '$data.Number': _core2.default.Container.proxyConverter,
        '$data.Date': function $dataDate(e) {
            return e ? e.toISOString().replace('Z', '') : e;
        },
        '$data.Time': _core2.default.Container.proxyConverter,
        '$data.Day': _core2.default.Container.proxyConverter,
        '$data.Duration': _core2.default.Container.proxyConverter,
        '$data.DateTimeOffset': function $dataDateTimeOffset(v) {
            return v ? v.toISOString() : v;
        },
        '$data.String': _core2.default.Container.proxyConverter,
        '$data.Boolean': _core2.default.Container.proxyConverter,
        '$data.Blob': function $dataBlob(v) {
            return v ? _core2.default.Blob.toBase64(v) : v;
        },
        '$data.Object': _core2.default.Container.proxyConverter,
        '$data.Array': function $dataArray(o, def) {
            if (o && def && def.elementType) {
                var typeName = _core.Container.resolveName(def.elementType);
                var values = [];
                for (var i = 0; i < o.length; i++) {
                    values.push(_core2.default.oDataConverter['toDb'][typeName](o[i]));
                }

                return values;
            }
            return _core2.default.Container.proxyConverter.apply(this, arguments);
        },
        '$data.GeographyPoint': _core2.default.Container.proxyConverter,
        '$data.GeographyLineString': _core2.default.Container.proxyConverter,
        '$data.GeographyPolygon': _core2.default.Container.proxyConverter,
        '$data.GeographyMultiPoint': _core2.default.Container.proxyConverter,
        '$data.GeographyMultiLineString': _core2.default.Container.proxyConverter,
        '$data.GeographyMultiPolygon': _core2.default.Container.proxyConverter,
        '$data.GeographyCollection': _core2.default.Container.proxyConverter,
        '$data.GeometryPoint': _core2.default.Container.proxyConverter,
        '$data.GeometryLineString': _core2.default.Container.proxyConverter,
        '$data.GeometryPolygon': _core2.default.Container.proxyConverter,
        '$data.GeometryMultiPoint': _core2.default.Container.proxyConverter,
        '$data.GeometryMultiLineString': _core2.default.Container.proxyConverter,
        '$data.GeometryMultiPolygon': _core2.default.Container.proxyConverter,
        '$data.GeometryCollection': _core2.default.Container.proxyConverter,
        '$data.Guid': _core2.default.Container.proxyConverter
    },
    escape: {
        '$data.Enum': function $dataEnum(e, enumType) {
            return e !== null && e !== undefined ? (enumType ? enumType.fullName : "") + "'" + e + "'" : e;
        },
        '$data.Entity': function $dataEntity(e) {
            return JSON.stringify(e);
        },
        '$data.Integer': _core2.default.Container.proxyConverter,
        '$data.Int32': _core2.default.Container.proxyConverter,
        '$data.Number': function $dataNumber(v) {
            return v && _core2.default.defaults.oDataWebApi ? v + 'd' : v;
        },
        '$data.Int16': _core2.default.Container.proxyConverter,
        '$data.Byte': _core2.default.Container.proxyConverter,
        '$data.SByte': _core2.default.Container.proxyConverter,
        '$data.Decimal': function $dataDecimal(v) {
            return v && _core2.default.defaults.oDataWebApi ? v + 'm' : v;
        },
        '$data.Float': function $dataFloat(v) {
            return v && _core2.default.defaults.oDataWebApi ? v + 'f' : v;
        },
        '$data.Int64': _core2.default.Container.proxyConverter,
        '$data.Time': _core2.default.Container.proxyConverter,
        '$data.Day': _core2.default.Container.proxyConverter,
        '$data.Duration': function $dataDuration(v) {
            return v ? "duration'" + v + "'" : v;
        },
        '$data.DateTimeOffset': function $dataDateTimeOffset(d) {
            return d ? encodeURIComponent(d) : d;
        },
        '$data.Date': function $dataDate(date) {
            return date ? "datetime'" + date + "'" : date;
        },
        '$data.String': function $dataString(text) {
            return typeof text === 'string' ? "'" + text.replace(/'/g, "''") + "'" : text;
        },
        '$data.ObjectID': function $dataObjectID(text) {
            return typeof text === 'string' ? "'" + text.replace(/'/g, "''") + "'" : text;
        },
        '$data.Boolean': function $dataBoolean(bool) {
            return typeof bool === 'boolean' ? bool.toString() : bool;
        },
        '$data.Blob': function $dataBlob(b) {
            return b ? "binary'" + b + "'" : b;
        },
        '$data.Object': function $dataObject(o) {
            return JSON.stringify(o);
        },
        '$data.Array': function $dataArray(o, def) {
            if (o && def && def.elementType) {
                var typeName = _core.Container.resolveName(def.elementType);
                var values = [];
                for (var i = 0; i < o.length; i++) {
                    values.push(_core2.default.oDataConverter['escape'][typeName](o[i]));
                }

                return "[" + values.join(',') + "]";
            }
            return JSON.stringify(o);
        },
        '$data.GeographyPoint': function $dataGeographyPoint(g) {
            if (g) {
                return _core2.default.GeographyBase.stringifyToUrl(g);
            }return g;
        },
        '$data.GeographyLineString': function $dataGeographyLineString(g) {
            if (g) {
                return _core2.default.GeographyBase.stringifyToUrl(g);
            }return g;
        },
        '$data.GeographyPolygon': function $dataGeographyPolygon(g) {
            if (g) {
                return _core2.default.GeographyBase.stringifyToUrl(g);
            }return g;
        },
        '$data.GeographyMultiPoint': function $dataGeographyMultiPoint(g) {
            if (g) {
                return _core2.default.GeographyBase.stringifyToUrl(g);
            }return g;
        },
        '$data.GeographyMultiLineString': function $dataGeographyMultiLineString(g) {
            if (g) {
                return _core2.default.GeographyBase.stringifyToUrl(g);
            }return g;
        },
        '$data.GeographyMultiPolygon': function $dataGeographyMultiPolygon(g) {
            if (g) {
                return _core2.default.GeographyBase.stringifyToUrl(g);
            }return g;
        },
        '$data.GeographyCollection': function $dataGeographyCollection(g) {
            if (g) {
                return _core2.default.GeographyBase.stringifyToUrl(g);
            }return g;
        },
        '$data.GeometryPoint': function $dataGeometryPoint(g) {
            if (g) {
                return _core2.default.GeometryBase.stringifyToUrl(g);
            }return g;
        },
        '$data.GeometryLineString': function $dataGeometryLineString(g) {
            if (g) {
                return _core2.default.GeometryBase.stringifyToUrl(g);
            }return g;
        },
        '$data.GeometryPolygon': function $dataGeometryPolygon(g) {
            if (g) {
                return _core2.default.GeometryBase.stringifyToUrl(g);
            }return g;
        },
        '$data.GeometryMultiPoint': function $dataGeometryMultiPoint(g) {
            if (g) {
                return _core2.default.GeometryBase.stringifyToUrl(g);
            }return g;
        },
        '$data.GeometryMultiLineString': function $dataGeometryMultiLineString(g) {
            if (g) {
                return _core2.default.GeometryBase.stringifyToUrl(g);
            }return g;
        },
        '$data.GeometryMultiPolygon': function $dataGeometryMultiPolygon(g) {
            if (g) {
                return _core2.default.GeometryBase.stringifyToUrl(g);
            }return g;
        },
        '$data.GeometryCollection': function $dataGeometryCollection(g) {
            if (g) {
                return _core2.default.GeometryBase.stringifyToUrl(g);
            }return g;
        },
        '$data.Guid': function $dataGuid(guid) {
            return guid ? "" + guid.toString() + "" : guid;
        }
    },
    unescape: {
        '$data.Entity': function $dataEntity(v, c) {
            var config = c || {};
            var value = JSON.parse(v);
            if (value && config.type) {
                var type = _core.Container.resolveType(config.type);
                /*Todo converter*/
                return new type(value, { converters: undefined });
            }
            return value;
        },
        '$data.Number': function $dataNumber(v) {
            return JSON.parse(v);
        },
        '$data.Integer': function $dataInteger(v) {
            return JSON.parse(v);
        },
        '$data.Int32': function $dataInt32(v) {
            return JSON.parse(v);
        },
        '$data.Byte': function $dataByte(v) {
            return JSON.parse(v);
        },
        '$data.SByte': function $dataSByte(v) {
            return JSON.parse(v);
        },
        '$data.Decimal': function $dataDecimal(v) {
            if (typeof v === 'string' && v.toLowerCase().lastIndexOf('m') === v.length - 1) {
                return v.substr(0, v.length - 1);
            } else {
                return v;
            }
        },
        '$data.Float': function $dataFloat(v) {
            if (typeof v === 'string' && v.toLowerCase().lastIndexOf('f') === v.length - 1) {
                return v.substr(0, v.length - 1);
            } else {
                return v;
            }
        },
        '$data.Int16': function $dataInt16(v) {
            return JSON.parse(v);
        },
        '$data.Int64': function $dataInt64(v) {
            return v;
        },
        '$data.Boolean': function $dataBoolean(v) {
            return JSON.parse(v);
        },
        '$data.Date': function $dataDate(v) {
            if (typeof v === 'string' && /^datetime'/.test(v)) {
                return v.slice(9, v.length - 1);
            }
            return v;
        },
        '$data.String': function $dataString(v) {
            if (typeof v === 'string' && v.indexOf("'") === 0 && v.lastIndexOf("'") === v.length - 1) {
                return v.slice(1, v.length - 1);
            } else {
                return v;
            }
        },
        '$data.ObjectID': function $dataObjectID(v) {
            if (typeof v === 'string' && v.indexOf("'") === 0 && v.lastIndexOf("'") === v.length - 1) {
                return v.slice(1, v.length - 1);
            } else {
                return v;
            }
        },
        '$data.Guid': function $dataGuid(v) {
            if (/^\w{8}-\w{4}-\w{4}-\w{4}-\w{12}$/.test(v)) {
                var data = v.slice(5, v.length - 1);
                return _core2.default.parseGuid(data).toString();
            }
            return v;
        },
        '$data.Array': function $dataArray(v, c) {
            var config = c || {};

            var value = JSON.parse(v) || [];
            if (value && config.elementType) {
                var type = _core.Container.resolveType(config.elementType);
                var typeName = _core.Container.resolveName(type);
                if (type && type.isAssignableTo && type.isAssignableTo(_core2.default.Entity)) {
                    typeName = _core2.default.Entity.fullName;
                }

                if (Array.isArray(value)) {
                    var converter = _core2.default.oDataConverter.unescape[typeName];
                    for (var i = 0; i < value.length; i++) {
                        value[i] = converter ? converter(value[i]) : value[i];
                    }
                }
                return value;
            }
            return value;
        },
        '$data.DateTimeOffset': function $dataDateTimeOffset(v) {
            if (typeof v === 'string') {
                return _core2.default.Container.convertTo(v, _core2.default.DateTimeOffset);
            }
            return v;
        },
        '$data.Time': function $dataTime(v) {
            if (typeof v === 'string' && /^time'/.test(v)) {
                return _core2.default.Container.convertTo(v.slice(5, v.length - 1), _core2.default.Time);
            }
            return v;
        },
        '$data.Day': function $dataDay(v) {
            if (typeof v === 'string' && /^date'/.test(v)) {
                return _core2.default.Container.convertTo(v.slice(5, v.length - 1), _core2.default.Day);
            }
            return v;
        },
        '$data.Duration': function $dataDuration(v) {
            if (typeof v === 'string' && /^duration'/.test(v)) {
                return _core2.default.Container.convertTo(v.slice(9, v.length - 1), _core2.default.Duration);
            }
            return v;
        },
        '$data.Blob': function $dataBlob(v) {
            if (typeof v === 'string') {
                if (/^X'/.test(v)) {
                    return _core2.default.Blob.createFromHexString(v.slice(2, v.length - 1));
                } else if (/^binary'/.test(v)) {
                    return _core2.default.Blob.createFromHexString(v.slice(7, v.length - 1));
                }
            }
            return v;
        },
        '$data.Object': function $dataObject(v) {
            return JSON.parse(v);
        },
        '$data.GeographyPoint': function $dataGeographyPoint(v) {
            if (/^geography'POINT\(/i.test(v)) {
                var data = v.slice(10, v.length - 1);
                return _core2.default.GeographyBase.parseFromString(data);
            }
            return v;
        },
        '$data.GeographyPolygon': function $dataGeographyPolygon(v) {
            if (/^geography'POLYGON\(/i.test(v)) {
                var data = v.slice(10, v.length - 1);
                return _core2.default.GeographyBase.parseFromString(data);
            }
            return v;
        },
        '$data.GeometryPoint': function $dataGeometryPoint(v) {
            if (/^geometry'POINT\(/i.test(v)) {
                var data = v.slice(9, v.length - 1);
                return _core2.default.GeometryBase.parseFromString(data);
            }
            return v;
        },
        '$data.GeometryPolygon': function $dataGeometryPolygon(v) {
            if (/^geometry'POLYGON\(/i.test(v)) {
                var data = v.slice(9, v.length - 1);
                return _core2.default.GeometryBase.parseFromString(data);
            }
            return v;
        }
    },
    xmlEscape: {
        '$data.Byte': function $dataByte(v) {
            return v.toString();
        },
        '$data.SByte': function $dataSByte(v) {
            return v.toString();
        },
        '$data.Decimal': function $dataDecimal(v) {
            return v.toString();
        },
        '$data.Float': function $dataFloat(v) {
            return v.toString();
        },
        '$data.Int16': function $dataInt16(v) {
            return v.toString();
        },
        '$data.Int64': function $dataInt64(v) {
            return v.toString();
        },
        '$data.Integer': function $dataInteger(v) {
            return v.toString();
        },
        '$data.Int32': function $dataInt32(v) {
            return v.toString();
        },
        '$data.Boolean': function $dataBoolean(v) {
            return v.toString();
        },
        '$data.Blob': function $dataBlob(v) {
            return _core2.default.Blob.toBase64(v);
        },
        '$data.Date': function $dataDate(v) {
            return v.toISOString().replace('Z', '');
        },
        '$data.DateTimeOffset': function $dataDateTimeOffset(v) {
            return v.toISOString();
        },
        '$data.Time': function $dataTime(v) {
            return v.toString();
        },
        '$data.Day': function $dataDay(v) {
            return v.toString();
        },
        '$data.Duration': function $dataDuration(v) {
            return v.toString();
        },
        '$data.Number': function $dataNumber(v) {
            return v.toString();
        },
        '$data.String': function $dataString(v) {
            return v.toString();
        },
        '$data.ObjectID': function $dataObjectID(v) {
            return v.toString();
        },
        '$data.Object': function $dataObject(v) {
            return JSON.stringify(v);
        },
        '$data.Guid': function $dataGuid(v) {
            return v.toString();
        } /*,
          '$data.GeographyPoint': function (v) { return this._buildSpatialPoint(v, 'http://www.opengis.net/def/crs/EPSG/0/4326'); },
          '$data.GeometryPoint': function (v) { return this._buildSpatialPoint(v, 'http://www.opengis.net/def/crs/EPSG/0/0'); },
          '$data.GeographyLineString': function (v) { return this._buildSpatialLineString(v, 'http://www.opengis.net/def/crs/EPSG/0/4326'); },
          '$data.GeometryLineString': function (v) { return this._buildSpatialLineString(v, 'http://www.opengis.net/def/crs/EPSG/0/0'); }*/
    },
    simple: { //$value, $count
        '$data.Byte': function $dataByte(v) {
            return v.toString();
        },
        '$data.SByte': function $dataSByte(v) {
            return v.toString();
        },
        '$data.Decimal': function $dataDecimal(v) {
            return v.toString();
        },
        '$data.Float': function $dataFloat(v) {
            return v.toString();
        },
        '$data.Int16': function $dataInt16(v) {
            return v.toString();
        },
        '$data.Int64': function $dataInt64(v) {
            return v.toString();
        },
        '$data.ObjectID': function $dataObjectID(o) {
            return o.toString();
        },
        '$data.Integer': function $dataInteger(o) {
            return o.toString();
        },
        '$data.Int32': function $dataInt32(o) {
            return o.toString();
        },
        '$data.Number': function $dataNumber(o) {
            return o.toString();
        },
        '$data.Date': function $dataDate(o) {
            return o instanceof _core2.default.Date ? o.toISOString().replace('Z', '') : o.toString();
        },
        '$data.DateTimeOffset': function $dataDateTimeOffset(v) {
            return v ? v.toISOString() : v;
        },
        '$data.Time': function $dataTime(o) {
            return o.toString();
        },
        '$data.Day': function $dataDay(o) {
            return o.toString();
        },
        '$data.Duration': function $dataDuration(o) {
            return o.toString();
        },
        '$data.String': function $dataString(o) {
            return o.toString();
        },
        '$data.Boolean': function $dataBoolean(o) {
            return o.toString();
        },
        '$data.Blob': function $dataBlob(o) {
            return o;
        },
        '$data.Object': function $dataObject(o) {
            return JSON.stringify(o);
        },
        '$data.Array': function $dataArray(o) {
            return JSON.stringify(o);
        },
        '$data.Guid': function $dataGuid(o) {
            return o.toString();
        },
        '$data.GeographyPoint': function $dataGeographyPoint(o) {
            return JSON.stringify(o);
        },
        '$data.GeometryPoint': function $dataGeometryPoint(o) {
            return JSON.stringify(o);
        },
        '$data.GeographyLineString': function $dataGeographyLineString(o) {
            return JSON.stringify(o);
        },
        '$data.GeographyPolygon': function $dataGeographyPolygon(o) {
            return JSON.stringify(o);
        },
        '$data.GeographyMultiPoint': function $dataGeographyMultiPoint(o) {
            return JSON.stringify(o);
        },
        '$data.GeographyMultiLineString': function $dataGeographyMultiLineString(o) {
            return JSON.stringify(o);
        },
        '$data.GeographyMultiPolygon': function $dataGeographyMultiPolygon(o) {
            return JSON.stringify(o);
        },
        '$data.GeographyCollection': function $dataGeographyCollection(o) {
            return JSON.stringify(o);
        },
        '$data.GeometryLineString': function $dataGeometryLineString(o) {
            return JSON.stringify(o);
        },
        '$data.GeometryPolygon': function $dataGeometryPolygon(o) {
            return JSON.stringify(o);
        },
        '$data.GeometryMultiPoint': function $dataGeometryMultiPoint(o) {
            return JSON.stringify(o);
        },
        '$data.GeometryMultiLineString': function $dataGeometryMultiLineString(o) {
            return JSON.stringify(o);
        },
        '$data.GeometryMultiPolygon': function $dataGeometryMultiPolygon(o) {
            return JSON.stringify(o);
        },
        '$data.GeometryCollection': function $dataGeometryCollection(o) {
            return JSON.stringify(o);
        }
    }
};

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"jaydata/core":"jaydata/core"}],7:[function(_dereq_,module,exports){
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.ODataIncludeFragment = undefined;

var _core = _dereq_('jaydata/core');

var _core2 = _interopRequireDefault(_core);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var ODataIncludeFragment = exports.ODataIncludeFragment = function () {
    function ODataIncludeFragment(name) {
        _classCallCheck(this, ODataIncludeFragment);

        this.name = name;
        this.$expand = [];
        this.$operators = [];
    }

    _createClass(ODataIncludeFragment, [{
        key: 'toString',
        value: function toString() {
            var data = '';
            if (this.$expand.length) {
                if (this.name) {
                    data += this.name + '($expand=';
                }
                for (var i = 0; i < this.$expand.length; i++) {
                    if (i !== 0) data += ',';
                    data += this[this.$expand[i]].toString();
                }
                if (this.name) {
                    data += ')';
                }
            }

            if (this.name) {
                for (var i = 0; i < this.$operators.length; i++) {
                    var operator = this.$operators[i];
                    var values = this[operator];
                    for (var j = 0; j < values.length; j++) {
                        if (data) data += ',';
                        data += this.name + '(' + operator + '=';
                        data += values[j];
                        data += ')';
                    }
                }
            }

            if (this.name && !data) {
                data = this.name;
            }

            return data;
        }
    }, {
        key: 'addInclude',
        value: function addInclude(path, map) {
            this._createIncludePath(path);
        }
    }, {
        key: 'addImplicitMap',
        value: function addImplicitMap(path, map) {
            var includedFragment = this._createIncludePath(path);
            this._setImplicitMap(includedFragment, map);
        }
    }, {
        key: '_createIncludePath',
        value: function _createIncludePath(path) {
            if (!path) return this;
            var inc = path.split('.');

            var current = this;
            for (var i = 0; i < inc.length; i++) {
                var it = inc[i];
                var included = true;
                if (current.$expand.indexOf(it) < 0) {
                    included = false;
                    current.$expand.push(it);
                    current[it] = new ODataIncludeFragment(it);
                    current[it].__implicit = true;
                }

                current = current[it];
                if (i < inc.length - 1 && current.__implicit) {
                    this._setImplicitMap(current, inc[i + 1]);
                }
            }

            return current;
        }
    }, {
        key: '_setImplicitMap',
        value: function _setImplicitMap(includeFragment, map) {
            if (map) {
                if (includeFragment.$operators.indexOf('$select') < 0) {
                    if (includeFragment.__implicit) {
                        includeFragment.$operators.push('$select');
                        includeFragment.$select = [map];
                    }
                } else if (includeFragment.$expand.indexOf(map) < 0) {
                    includeFragment.$select[0] += ',' + map;
                }
            }
        }
    }]);

    return ODataIncludeFragment;
}();

_core2.default.storageProviders.oData.ODataIncludeFragment = ODataIncludeFragment;

(0, _core.$C)('$data.storageProviders.oData.oDataIncludeCompiler', _core2.default.Expressions.EntityExpressionVisitor, null, {
    constructor: function constructor(provider) {
        this.provider = provider;
    },

    compile: function compile(expression, context) {
        context.data = context.data || new ODataIncludeFragment();
        context.current = context.data;
        this.Visit(expression, context);
    },
    VisitParametricQueryExpression: function VisitParametricQueryExpression(expression, context) {
        this.Visit(expression.expression, context);
    },

    VisitEntitySetExpression: function VisitEntitySetExpression(expression, context) {
        this.Visit(expression.source, context);
        if (expression.selector instanceof _core2.default.Expressions.AssociationInfoExpression) {
            this.Visit(expression.selector, context);
        }
    },

    VisitAssociationInfoExpression: function VisitAssociationInfoExpression(expression, context) {
        var propName = expression.associationInfo.FromPropertyName;

        this.includePath = this.includePath ? this.includePath + '.' : "";
        this.includePath += propName;

        var currentPath = this.includePath;
        if (!context.includes.some(function (include) {
            return include.name == currentPath;
        }, this)) {
            context.includes.push({ name: currentPath, type: expression.associationInfo.ToType });
        }

        if (context.current.$expand.indexOf(propName) < 0) {
            context.current.$expand.push(propName);
            context.current[propName] = new ODataIncludeFragment(propName);
        }
        context.current = context.current[propName];
    },

    VisitFrameOperationExpression: function VisitFrameOperationExpression(expression, context) {
        this.Visit(expression.source, context);

        var opDef = expression.operation.memberDefinition;
        if (opDef && opDef.includeFrameName) {
            var opName = opDef.includeFrameName;
            var paramCounter = 0;
            var params = opDef.parameters || [{ name: "@expression" }];

            var args = params.map(function (item, index) {
                if (item.name === "@expression") {
                    return expression.source;
                } else {
                    return expression.parameters[paramCounter++];
                };
            });

            if (opDef.includeCompiler) {
                for (var i = 0; i < args.length; i++) {
                    var arg = args[i];
                    var compilerType = _core.Container.resolveType(opDef.includeCompiler);
                    var compiler = new compilerType(this.provider);
                    var frameContext = { data: "", $expand: context.current };

                    if (arg && arg.value instanceof _core2.default.Queryable) {
                        var preparator = _core.Container.createQueryExpressionCreator(arg.value.entityContext);
                        var prep_expression = preparator.Visit(arg.value.expression);
                        arg = prep_expression;
                    }

                    var compiled = compiler.compile(arg, frameContext);

                    if (context.current['$operators'].indexOf(opName) < 0) {
                        context.current[opName] = [];
                        context.current['$operators'].push(opName);
                    }
                    context.current[opName].push(frameContext[opName] || frameContext.data);
                }
            } else if (opDef.implementation) {
                if (context.current['$operators'].indexOf(opName) < 0) {
                    context.current[opName] = [];
                    context.current['$operators'].push(opName);
                }
                context.current[opName].push(opDef.implementation());
            }
        }
    }
});

},{"jaydata/core":"jaydata/core"}],8:[function(_dereq_,module,exports){
'use strict';

var _core = _dereq_('jaydata/core');

var _core2 = _interopRequireDefault(_core);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

(0, _core.$C)('$data.storageProviders.oData.oDataOrderCompiler', _core2.default.storageProviders.oData.oDataWhereCompiler, null, {
    constructor: function constructor(provider) {
        this.provider = provider;
    },

    compile: function compile(expression, context) {
        this.Visit(expression, context);
    },
    VisitOrderExpression: function VisitOrderExpression(expression, context) {
        var orderContext = { data: "" };
        this.Visit(expression.selector, orderContext);
        if (context['$orderby']) {
            context['$orderby'] += ',';
        } else {
            context['$orderby'] = '';
        }
        context['$orderby'] += orderContext.data + (expression.nodeType == _core2.default.Expressions.ExpressionType.OrderByDescending ? " desc" : "");
    },
    VisitParametricQueryExpression: function VisitParametricQueryExpression(expression, context) {
        this.Visit(expression.expression, context);
    },
    VisitEntityFieldExpression: function VisitEntityFieldExpression(expression, context) {
        this.Visit(expression.source, context);
        this.Visit(expression.selector, context);
    },
    VisitComplexTypeExpression: function VisitComplexTypeExpression(expression, context) {
        this.Visit(expression.source, context);
        this.Visit(expression.selector, context);
        context.data += "/";
    },
    VisitEntitySetExpression: function VisitEntitySetExpression(expression, context) {
        if (expression.selector instanceof _core2.default.Expressions.AssociationInfoExpression) {
            this.Visit(expression.source, context);
            this.Visit(expression.selector, context);
        }
    },
    VisitAssociationInfoExpression: function VisitAssociationInfoExpression(expression, context) {
        context.data += expression.associationInfo.FromPropertyName + '/';
    },
    VisitEntityExpression: function VisitEntityExpression(expression, context) {
        this.Visit(expression.source, context);
        this.Visit(expression.selector, context);
    },
    VisitMemberInfoExpression: function VisitMemberInfoExpression(expression, context) {
        context.data += expression.memberName;
    },
    VisitEntityFieldOperationExpression: function VisitEntityFieldOperationExpression(expression, context) {
        _core.Guard.requireType("expression.operation", expression.operation, _core2.default.Expressions.MemberInfoExpression);

        //TODO refactor!
        var opDef = expression.operation.memberDefinition;
        var opName = opDef.mapTo || opDef.name;
        context.data += opName;
        context.data += "(";
        var paramCounter = 0;
        var params = opDef.parameters || [{ name: "@expression" }];

        var args = params.map(function (item, index) {
            if (item.name === "@expression") {
                return expression.source;
            } else {
                return expression.parameters[paramCounter++];
            };
        });

        args.forEach(function (arg, index) {
            if (index > 0) {
                context.data += ",";
            };
            this.Visit(arg, context);
        }, this);
        context.data += ")";
    },
    VisitEntityFunctionOperationExpression: function VisitEntityFunctionOperationExpression(expression, context) {
        _core.Guard.requireType("expression.operation", expression.operation, _core2.default.Expressions.MemberInfoExpression);
        this.Visit(expression.source, context);

        //TODO refactor!
        var opDef = expression.operation.memberDefinition;
        var opName = opDef.mapTo || opDef.name;
        context.data += opName;
        context.data += "(";
        var paramCounter = 0;
        var params = opDef.method.params || [{ name: "@expression" }];

        var args = params.map(function (item, index) {
            if (item.name === "@expression") {
                return expression.source;
            } else {
                return expression.parameters[paramCounter++];
            };
        });

        var i = 0;
        args.forEach(function (arg, index) {
            if (arg === undefined || arg instanceof _core2.default.Expressions.ConstantExpression && typeof arg.value === 'undefined') return;

            if (i > 0) {
                context.data += ",";
            };
            i++;
            context.data += params[index].name + '=';
            this.Visit(arg, context);
        }, this);
        context.data += ")";
    },
    VisitContextFunctionOperationExpression: function VisitContextFunctionOperationExpression(expression, context) {
        return this.VisitEntityFunctionOperationExpression(expression, context);
    }
});

},{"jaydata/core":"jaydata/core"}],9:[function(_dereq_,module,exports){
'use strict';

var _core = _dereq_('jaydata/core');

var _core2 = _interopRequireDefault(_core);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

(0, _core.$C)('$data.storageProviders.oData.oDataPagingCompiler', _core2.default.Expressions.EntityExpressionVisitor, null, {
    constructor: function constructor(provider) {
        this.provider = provider;
    },

    compile: function compile(expression, context) {
        this.Visit(expression, context);
    },
    VisitPagingExpression: function VisitPagingExpression(expression, context) {
        var pagingContext = { data: "" };
        this.Visit(expression.amount, pagingContext);
        switch (expression.nodeType) {
            case _core2.default.Expressions.ExpressionType.Skip:
                context['$skip'] = pagingContext.data;break;
            case _core2.default.Expressions.ExpressionType.Take:
                context['$top'] = pagingContext.data;break;
            default:
                _core.Guard.raise("Not supported nodeType");break;
        }
    },
    VisitConstantExpression: function VisitConstantExpression(expression, context) {
        var typeName = _core.Container.resolveName(expression.type);
        var converter = this.provider.fieldConverter.escape[typeName];
        context.data += converter ? converter(expression.value) : expression.value;
    }
});

},{"jaydata/core":"jaydata/core"}],10:[function(_dereq_,module,exports){
'use strict';

var _core = _dereq_('jaydata/core');

var _core2 = _interopRequireDefault(_core);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

(0, _core.$C)('$data.storageProviders.oData.oDataProjectionCompiler', _core2.default.Expressions.EntityExpressionVisitor, null, {
    constructor: function constructor(provider) {
        this.provider = provider;
        this.entityContext = provider.context;
        this.hasObjectLiteral = false;
        this.modelBinderMapping = [];
    },

    compile: function compile(expression, context) {
        this.Visit(expression, context);
    },
    VisitProjectionExpression: function VisitProjectionExpression(expression, context) {
        ///<summary></summary>
        ///<param name="expression" type="$data.Expressions.ProjectionExpression" mayBeNull="false"></param>
        ///<param name="context" mayBeNull="false"></param>
        context.data = "";
        this.mapping = "";

        this.Visit(expression.selector, context);
        if (context['$select']) {
            context['$select'] += ',';
        } else {
            context['$select'] = '';
        }
        context["$select"] += context.data;
        context.data = "";
    },
    VisitParametricQueryExpression: function VisitParametricQueryExpression(expression, context) {
        this.Visit(expression.expression, context);
        var m = this.mapping.split('.');

        if (!(expression.expression instanceof _core2.default.Expressions.EntityExpression) && !(expression.expression instanceof _core2.default.Expressions.EntitySetExpression)) {
            m.pop();
        }

        if (m.length > 0) {
            if (!context['$expand'] || !(context['$expand'] instanceof _core2.default.storageProviders.oData.ODataIncludeFragment)) {
                context['$expand'] = new _core2.default.storageProviders.oData.ODataIncludeFragment();
            }
            context['$expand'].addInclude(m.join('.'));
        }
    },
    VisitObjectLiteralExpression: function VisitObjectLiteralExpression(expression, context) {
        ///<summary></summary>
        ///<param name="expression" type="$data.Expressions.ObjectLiteralExpression" mayBeNull="false"></param>
        ///<param name="context" mayBeNull="false"></param>

        this.hasObjectLiteral = true;
        expression.members.forEach(function (member, index) {
            this.Visit(member, context);
            if (index < expression.members.length - 1) {
                context.data += ',';
            }
            this.mapping = '';
        }, this);
    },
    VisitObjectFieldExpression: function VisitObjectFieldExpression(expression, context) {
        this.Visit(expression.expression, context);

        var m = this.mapping.split('.');
        var propertyName = "";
        if (!(expression.expression instanceof _core2.default.Expressions.EntityExpression) && !(expression.expression instanceof _core2.default.Expressions.EntitySetExpression)) {
            propertyName = m.pop();
        }

        if (m.length > 0) {
            if (!context['$expand'] || !(context['$expand'] instanceof _core2.default.storageProviders.oData.ODataIncludeFragment)) {
                context['$expand'] = new _core2.default.storageProviders.oData.ODataIncludeFragment();
            }

            if (expression.expression instanceof _core2.default.Expressions.EntityFieldExpression && expression.expression.selector instanceof _core2.default.Expressions.MemberInfoExpression) {
                var storageModel = this.entityContext._storageModel.getStorageModel(expression.expression.selector.memberDefinition.definedBy);
                if (!storageModel) return;

                var isComplexProperty = storageModel && !!storageModel.ComplexTypes[expression.memberName];
                if (isComplexProperty) {
                    var complexProperty = m.pop();
                    context['$expand'].addImplicitMap(m.join('.'), complexProperty);
                    return;
                }
            }

            if (expression.expression instanceof _core2.default.Expressions.ComplexTypeExpression) {
                context['$expand'].addImplicitMap(m.join('.'), propertyName);
            } else {
                context['$expand'].addInclude(m.join('.'));
            }
        }
    },

    VisitComplexTypeExpression: function VisitComplexTypeExpression(expression, context) {
        this.Visit(expression.source, context);
        this.Visit(expression.selector, context);
    },

    VisitEntityFieldExpression: function VisitEntityFieldExpression(expression, context) {
        this.Visit(expression.source, context);
        this.Visit(expression.selector, context);
    },
    VisitEntityExpression: function VisitEntityExpression(expression, context) {
        ///<summary></summary>
        ///<param name="expression" type="$data.Expressions.EntityExpression" mayBeNull="false"></param>
        ///<param name="context" mayBeNull="false"></param>
        this.Visit(expression.source, context);
    },
    VisitEntitySetExpression: function VisitEntitySetExpression(expression, context) {
        ///<summary></summary>
        ///<param name="expression" type="$data.Expressions.EntitySetExpression" mayBeNull="false"></param>
        ///<param name="context" mayBeNull="false"></param>
        if (expression.source instanceof _core2.default.Expressions.EntityExpression) {
            this.Visit(expression.source, context);
        }
        if (expression.selector instanceof _core2.default.Expressions.AssociationInfoExpression) {
            this.Visit(expression.selector, context);
        }
    },
    VisitAssociationInfoExpression: function VisitAssociationInfoExpression(expression, context) {
        if (this.mapping && this.mapping.length > 0) {
            this.mapping += '.';
        }
        this.mapping += expression.associationInfo.FromPropertyName;

        if (context.data && context.data.length > 0 && context.data[context.data.length - 1] != ',') {
            if (!context['$expand'] || !(context['$expand'] instanceof _core2.default.storageProviders.oData.ODataIncludeFragment)) {
                context['$expand'] = new _core2.default.storageProviders.oData.ODataIncludeFragment();
            }
            context['$expand'].addInclude(this.mapping);
        } else {
            context.data += expression.associationInfo.FromPropertyName;
        }
    },
    VisitMemberInfoExpression: function VisitMemberInfoExpression(expression, context) {
        var storageModel = this.entityContext._storageModel.getStorageModel(expression.memberDefinition.definedBy);
        var isComplexProperty = storageModel && !!storageModel.ComplexTypes[expression.memberName];
        var isComplexField = !storageModel;

        if (context.data && context.data.length > 0 && context.data[context.data.length - 1] != ',') {
            if (this.mapping) {
                if (!context['$expand'] || !(context['$expand'] instanceof _core2.default.storageProviders.oData.ODataIncludeFragment)) {
                    context['$expand'] = new _core2.default.storageProviders.oData.ODataIncludeFragment();
                }
                if (isComplexField) {
                    var m = this.mapping.split('.');
                    var complexProperty = m.pop();
                    if (this.provider.checkODataMode("disableCompltexTypeMapping")) {
                        context['$expand'].addImplicitMap(m.join('.'), complexProperty);
                    } else {
                        context['$expand'].addImplicitMap(m.join('.'), complexProperty + "/" + expression.memberName);
                    }
                } else if (!isComplexProperty) {
                    context['$expand'].addImplicitMap(this.mapping, expression.memberName);
                }
            }
        } else {
            //if(context.data[context.data.length - 1] != ',') context.data += '/';
            context.data += expression.memberName;
        }

        if (this.mapping && this.mapping.length > 0) {
            this.mapping += '.';
        }
        this.mapping += expression.memberName;
    },
    VisitConstantExpression: function VisitConstantExpression(expression, context) {
        //Guard.raise(new Exception('Constant value is not supported in Projection.', 'Not supported!'));
        //context.data += expression.value;
        context.data = context.data.slice(0, context.data.length - 1);
    }
});

},{"jaydata/core":"jaydata/core"}],11:[function(_dereq_,module,exports){
(function (global){
'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; };

var _core = _dereq_('jaydata/core');

var _core2 = _interopRequireDefault(_core);

var _jaydataOdatajs = (typeof window !== "undefined" ? window['odatajs'] : typeof global !== "undefined" ? global['odatajs'] : null);

var odatajs = _interopRequireWildcard(_jaydataOdatajs);

var _oDataRequestActivities = _dereq_('./oDataRequestActivities.js');

var activities = _interopRequireWildcard(_oDataRequestActivities);

var _empty = _dereq_('./SaveStrategies/empty');

var _single = _dereq_('./SaveStrategies/single');

var _batch = _dereq_('./SaveStrategies/batch');

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var OData = _core2.default.__global['OData'];
var datajs = _core2.default.__global['datajs'];

var _datajsPatch;
_datajsPatch = function datajsPatch(OData) {
    // just datajs-1.1.0
    if (OData && OData.jsonHandler && 'useJsonLight' in OData.jsonHandler && (typeof datajs === 'undefined' ? 'undefined' : _typeof(datajs)) === 'object' && !datajs.version) {
        _core2.default.Trace.log('!!!!!!! - patch datajs 1.1.0');
        var oldread = OData.defaultHandler.read;
        OData.defaultHandler.read = function (p, context) {
            delete context.contentType;
            delete context.dataServiceVersion;

            oldread.apply(this, arguments);
        };
        var oldwrite = OData.defaultHandler.write;
        OData.defaultHandler.write = function (p, context) {
            delete context.contentType;
            delete context.dataServiceVersion;

            oldwrite.apply(this, arguments);
        };
    }
    _datajsPatch = function datajsPatch() {};
};

_core2.default.defaults = _core2.default.defaults || {};
_core2.default.defaults.OData = _core2.default.defaults.OData || {};
if (!("withReferenceMethods" in _core2.default.defaults.OData)) {
    _core2.default.defaults.OData.withReferenceMethods = false;
}
if (!("disableBatch" in _core2.default.defaults.OData)) {
    _core2.default.defaults.OData.disableBatch = false;
}
if (!("eTagAny" in _core2.default.defaults.OData)) {
    _core2.default.defaults.OData.eTagAny = '*';
}
if (!("enableDeepSave" in _core2.default.defaults.OData)) {
    _core2.default.defaults.OData.enableDeepSave = false;
}
if (!("disableCompltexTypeMapping" in _core2.default.defaults.OData)) {
    _core2.default.defaults.OData.disableCompltexTypeMapping = false;
}

var _checkODataMode = function _checkODataMode(context, functionName) {
    if (typeof context.providerConfiguration[functionName] !== 'undefined') {
        return !!context.providerConfiguration[functionName];
    }
    return !!_core2.default.defaults.OData[functionName];
};

(0, _core.$C)('$data.storageProviders.oData.RequestManager', _core2.default.Base, null, {
    constructor: function constructor() {
        this._items = [];
        this._entities = [];
    },
    _items: { type: _core2.default.Array },
    _entities: { type: _core2.default.Array },
    add: function add(changedItem, request, countable) {
        var item = {
            data: changedItem,
            entity: changedItem.data,
            request: request,
            itemIndex: ++this.maxItemIndex,
            references: []
        };

        // request.headers = request.headers || {};
        // request.headers["content-Id"] = item.itemIndex;
        request.add(new activities.SetHeaderProperty("content-Id", item.itemIndex));

        if (countable !== false) {
            this.length++;
        }

        this._entities.push(item.entity);
        this._items.push(item);

        return item;
    },
    addItemReference: function addItemReference(entity, reference) {
        var item = this.getItem(entity);
        if (item) {
            item.references.push(reference);
        }
    },
    getItemIndex: function getItemIndex(entity) {
        if (!entity) return -1;
        var idx = this._entities.indexOf(entity);
        if (idx >= 0 && !this._items[idx].removed) {
            return this._items[idx].itemIndex;
        }
        return -1;
    },
    getItem: function getItem(entity, onlyAvailable) {
        if (!entity) return null;
        var idx = this._entities.indexOf(entity);
        if (idx >= 0 && (!onlyAvailable || !this._items[idx].removed)) {
            return this._items[idx];
        }
        return null;
    },
    remove: function remove(entity) {
        var idx = this._entities.indexOf(entity);
        if (idx >= 0) {
            var item = this._items[idx];
            if (!item.removed) {
                this._items[idx].removed = true;
                this.length--;
                return true;
            }
        }
        return false;
    },
    getItems: function getItems() {
        return this._items.filter(function (it) {
            return !it.removed;
        });
    },
    getByResponse: function getByResponse(response, i) {
        //use response.headers['content-id']

        var idx = i;

        if (!this._indexCalculated) {
            this._indexCalculated = true;
            this._dataForResult = this._items.filter(function (it) {
                return !it.removed;
            });
        }

        var item = this._dataForResult[idx++];
        return item ? item.entity : null;
    },
    setProcessed: function setProcessed(entity) {
        var idx = this._entities.indexOf(entity);
        if (idx >= 0) {
            var item = this._items[idx];
            if (!item.isProcessed) {
                this._items[idx].isProcessed = true;
                return true;
            }
        }
        return false;
    },

    maxItemIndex: { value: 0 },
    length: { value: 0 }
});

(0, _core.$C)('$data.storageProviders.oData.oDataProvider', _core2.default.StorageProviderBase, null, {
    constructor: function constructor(cfg, ctx) {
        this.SqlCommands = [];
        this.context = ctx;
        this.providerConfiguration = _core2.default.typeSystem.extend({
            dbCreation: _core2.default.storageProviders.DbCreationType.DropTableIfChanged,
            oDataServiceHost: "/odata.svc",
            serviceUrl: "",
            maxDataServiceVersion: '4.0',
            dataServiceVersion: undefined,
            user: null,
            password: null,
            withCredentials: false,
            //enableJSONP: undefined,
            //useJsonLight: undefined
            //disableBatch: undefined
            //withReferenceMethods: undefined
            //enableDeepSave: undefined
            UpdateMethod: 'PATCH'
        }, cfg);

        if (this.providerConfiguration.maxDataServiceVersion === "4.0") {
            if (typeof odatajs === 'undefined' || typeof odatajs.oData === 'undefined') {
                _core.Guard.raise(new _core.Exception('odatajs is required', 'Not Found!'));
            } else {
                this.oData = odatajs.oData;
            }
        } else {
            if (typeof OData === 'undefined') {
                _core.Guard.raise(new _core.Exception('datajs is required', 'Not Found!'));
            } else {
                this.oData = OData;
                _datajsPatch(this.oData);
            }
        }

        //this.fixkDataServiceVersions(cfg);

        if (this.context && this.context._buildDbType_generateConvertToFunction && this.buildDbType_generateConvertToFunction) {
            this.context._buildDbType_generateConvertToFunction = this.buildDbType_generateConvertToFunction;
        }
        if (this.context && this.context._buildDbType_modifyInstanceDefinition && this.buildDbType_modifyInstanceDefinition) {
            this.context._buildDbType_modifyInstanceDefinition = this.buildDbType_modifyInstanceDefinition;
        }
    },
    fixkDataServiceVersions: function fixkDataServiceVersions(cfg) {
        if (this.providerConfiguration.dataServiceVersion > this.providerConfiguration.maxDataServiceVersion) {
            this.providerConfiguration.dataServiceVersion = this.providerConfiguration.maxDataServiceVersion;
        }

        if (this.providerConfiguration.setDataServiceVersionToMax === true) {
            this.providerConfiguration.dataServiceVersion = this.providerConfiguration.maxDataServiceVersion;
        }

        if (cfg && !cfg.UpdateMethod && this.providerConfiguration.dataServiceVersion < '3.0' || !this.providerConfiguration.dataServiceVersion) {
            this.providerConfiguration.UpdateMethod = 'MERGE';
        }
    },
    initializeStore: function initializeStore(callBack) {
        callBack = _core2.default.PromiseHandlerBase.createCallbackSettings(callBack);
        switch (this.providerConfiguration.dbCreation) {
            case _core2.default.storageProviders.DbCreationType.DropAllExistingTables:
                var that = this;
                if (this.providerConfiguration.serviceUrl) {

                    var requestData = [{
                        requestUri: that.providerConfiguration.serviceUrl + "/Delete",
                        method: 'POST'
                    }, function (d) {
                        //console.log("RESET oData database");
                        callBack.success(that.context);
                    }, function (error) {
                        callBack.success(that.context);
                    }];

                    this.appendBasicAuth(requestData[0], this.providerConfiguration.user, this.providerConfiguration.password, this.providerConfiguration.withCredentials);
                    //if (this.providerConfiguration.user) {
                    //    requestData[0].user = this.providerConfiguration.user;
                    //    requestData[0].password = this.providerConfiguration.password || "";
                    //}

                    this.context.prepareRequest.call(this, requestData);
                    this.oData.request.apply(this, requestData);
                } else {
                    callBack.success(that.context);
                }
                break;
            default:
                callBack.success(this.context);
                break;
        }
    },
    buildDbType_generateConvertToFunction: function buildDbType_generateConvertToFunction(storageModel, context) {
        return function (logicalEntity, convertedItems) {
            var dbInstance = new storageModel.PhysicalType();
            dbInstance.entityState = logicalEntity.entityState;

            storageModel.PhysicalType.memberDefinitions.getPublicMappedProperties().forEach(function (property) {
                dbInstance.initData[property.name] = logicalEntity[property.name];
            }, this);

            if (storageModel.Associations) {
                storageModel.Associations.forEach(function (association) {
                    if (association.FromMultiplicity == "*" && association.ToMultiplicity == "0..1" || association.FromMultiplicity == "0..1" && association.ToMultiplicity == "1" || association.FromMultiplicity == '$$unbound') {
                        var refValue = logicalEntity[association.FromPropertyName];
                        if ( /*refValue !== null &&*/refValue !== undefined) {
                            if (refValue instanceof _core2.default.Array) {
                                dbInstance.initData[association.FromPropertyName] = dbInstance[association.FromPropertyName] || [];
                                refValue.forEach(function (rv) {
                                    var item = convertedItems.getItem(rv, true);
                                    var contentId = item ? item.itemIndex : -1;
                                    if (rv.entityState == _core2.default.EntityState.Modified || contentId < 0) {
                                        var sMod = context._storageModel.getStorageModel(rv.getType());
                                        var tblName = sMod.TableName;
                                        var pk = '(' + context.storageProvider.getEntityKeysValue({ data: rv, entitySet: context.getEntitySetFromElementType(rv.getType()) }) + ')';
                                        dbInstance.initData[association.FromPropertyName].push({ __metadata: { uri: tblName + pk } });
                                    } else {
                                        if (contentId < 0) {
                                            _core.Guard.raise("Dependency graph error");
                                        }
                                        //dbInstance.initData[association.FromPropertyName].push({ __metadata: { uri: "$" + (contentId) } });
                                        dbInstance.initData[association.FromPropertyName].push({ __convertedRefence: item });
                                    }
                                }, this);
                            } else if (refValue === null) {
                                dbInstance.initData[association.FromPropertyName] = null;
                            } else {
                                var item = convertedItems.getItem(refValue, true);
                                var contentId = item ? item.itemIndex : -1;
                                if (refValue.entityState == _core2.default.EntityState.Modified || contentId < 0) {
                                    var sMod = context._storageModel.getStorageModel(refValue.getType());
                                    var tblName = sMod.TableName;
                                    var pk = '(' + context.storageProvider.getEntityKeysValue({ data: refValue, entitySet: context.getEntitySetFromElementType(refValue.getType()) }) + ')';
                                    dbInstance.initData[association.FromPropertyName] = { __metadata: { uri: tblName + pk } };
                                } else {
                                    if (contentId < 0) {
                                        _core.Guard.raise("Dependency graph error");
                                    }
                                    //dbInstance.initData[association.FromPropertyName] = { __metadata: { uri: "$" + (contentId) } };
                                    dbInstance.initData[association.FromPropertyName] = { __convertedRefence: item };
                                }
                            }
                        }
                    }
                }, this);
            }
            if (storageModel.ComplexTypes) {
                storageModel.ComplexTypes.forEach(function (cmpType) {
                    dbInstance.initData[cmpType.FromPropertyName] = logicalEntity[cmpType.FromPropertyName];
                }, this);
            }
            return dbInstance;
        };
    },
    buildDbType_modifyInstanceDefinition: function buildDbType_modifyInstanceDefinition() {
        return;
    },
    executeQuery: function executeQuery(query, callBack) {
        callBack = _core2.default.PromiseHandlerBase.createCallbackSettings(callBack);

        var sql = {};
        try {
            sql = this._compile(query);
        } catch (e) {
            callBack.error(e);
            return;
        }
        var schema = this.context;

        var that = this;
        var countProperty = "@odata.count";

        var requestData = [{
            requestUri: this.providerConfiguration.oDataServiceHost + sql.queryText,
            method: sql.method,
            data: sql.postData,
            headers: {}
        }, function (data, textStatus, jqXHR) {

            if (!data && textStatus.body && !sql.isBatchExecuteQuery) data = JSON.parse(textStatus.body);
            if (callBack.success) {
                var processSuccess = function processSuccess(query, data, sql) {
                    query.rawDataList = typeof data === 'string' ? [{ cnt: _core.Container.convertTo(data, _core2.default.Integer) }] : data;
                    if (sql.withInlineCount && (typeof data === 'undefined' ? 'undefined' : _typeof(data)) === 'object' && (typeof data[countProperty] !== 'undefined' || 'd' in data && typeof data.d[countProperty] !== 'undefined')) {
                        query.__count = new Number(typeof data[countProperty] !== 'undefined' ? data[countProperty] : data.d[countProperty]).valueOf();
                    }
                };

                if (sql.isBatchExecuteQuery) {
                    query.rawDataList = sql.subQueries;
                    for (var i = 0; i < data.__batchResponses.length; i++) {
                        var resp = data.__batchResponses[i];

                        if (!resp.data) {
                            if (resp.body) {
                                resp.data = JSON.parse(resp.body);
                            } else {
                                callBack.error(that.parseError(resp, arguments));
                                return;
                            }
                        }

                        processSuccess(sql.subQueries[i], resp.data, sql.subQueries[i]._getComplitedData());
                    }
                } else {
                    processSuccess(query, data, sql);
                }

                callBack.success(query);
            }
        }, function (error) {
            callBack.error(that.parseError(error, arguments));
        }, sql.isBatchExecuteQuery ? this.oData.batch.batchHandler : undefined];

        if (typeof this.providerConfiguration.enableJSONP !== 'undefined') {
            requestData[0].enableJsonpCallback = this.providerConfiguration.enableJSONP;
        }
        if (typeof this.providerConfiguration.useJsonLight !== 'undefined') {
            requestData[0].useJsonLight = this.providerConfiguration.useJsonLight;
        }

        this.appendBasicAuth(requestData[0], this.providerConfiguration.user, this.providerConfiguration.password, this.providerConfiguration.withCredentials);
        //if (this.providerConfiguration.user) {
        //    requestData[0].user = this.providerConfiguration.user;
        //    requestData[0].password = this.providerConfiguration.password || "";
        //}

        this.context.prepareRequest.call(this, requestData);
        //$data.ajax(requestData);
        //OData.request(requestData, requestData.success, requestData.error);
        this.oData.request.apply(this, requestData);
    },
    _compile: function _compile(queryable, params) {
        var compiler = new _core2.default.storageProviders.oData.oDataCompiler();
        var compiled = compiler.compile(queryable);
        return compiled;
    },
    saveChanges: function saveChanges(callBack, changedItems) {
        if (changedItems.length > 0) {
            this.saveInternal(changedItems, callBack);
        } else {
            callBack.success(0);
        }
    },
    saveInternal: function saveInternal(changedItems, callBack) {
        var independentBlocks = this.buildIndependentBlocks(changedItems);
        if (_checkODataMode(this, "enableDeepSave")) {
            this._checkDeepSave(changedItems);
        }
        var convertedItems = this._buildSaveData(independentBlocks, changedItems);
        var actionMode = this.saveStrategySelector(convertedItems);
        if (actionMode) {
            actionMode.save(this, convertedItems, callBack);
        } else {
            callBack.error(new _core.Exception('Not Found', 'Save action not found'));
        }
    },
    saveStrategySelector: function saveStrategySelector(convertedItems) {
        for (var i = 0; i < this.saveStrategies.length; i++) {
            var saveAction = this.saveStrategies[i];
            if (saveAction.condition(this, convertedItems)) {
                return saveAction;
            }
        }

        return null;
    },
    saveStrategies: {
        value: [_batch.strategy, _single.strategy, _empty.strategy]
    },

    _discoverSaveOrder: function _discoverSaveOrder(changedItems) {
        var entityItems = changedItems.map(function (it) {
            return it.data;
        });
        var entityInfo = changedItems.map(function (it) {
            return { path: [], visited: false, result: true };
        });
        var entityQueue = [];
        var discoveredEntities = [];

        var process = function process(currentEntity) {
            var index = entityItems.indexOf(currentEntity);
            var changedItem = changedItems[index];
            var info = entityInfo[index];

            if (info.visited) return info.result;
            if (info.visiting) return false;

            var references = [];
            if (changedItem.referredBy) {
                references = references.concat(changedItem.referredBy);
            }
            if (changedItem.dependentOn) {
                references = references.concat(changedItem.dependentOn);
            }

            for (var i = 0; i < references.length; i++) {
                var ref = references[i];
                if (discoveredEntities.indexOf(ref) < 0) {
                    entityQueue.push(ref);
                    discoveredEntities.push(ref);
                    var refIndex = entityItems.indexOf(ref);
                    changedItems[refIndex].deepParent = currentEntity;
                }
            }
        };

        for (var i = 0; i < changedItems.length; i++) {
            var changedItem = changedItems[i];
            if (entityQueue.indexOf(changedItem.data) < 0) {
                entityQueue.push(changedItem.data);
                discoveredEntities.push(changedItem.data);
                entityInfo[i].parent = null;
            }

            while (entityQueue.length) {
                var currentItem = entityQueue.shift();
                process(currentItem);
            }
        }
    },

    _checkDeepSave: function _checkDeepSave(changedItems) {
        var entityItems = changedItems.map(function (it) {
            return it.data;
        });
        var entityInfo = changedItems.map(function (it) {
            return { path: [], visited: false, result: true };
        });

        var discover = function discover(changedItem, parent, index) {
            var info = entityInfo[index];
            if (info.visited) return info.result;
            if (info.visiting) return false;

            var references = [];
            if (changedItem.referredBy) {
                references = references.concat(changedItem.referredBy);
            }
            if (changedItem.dependentOn) {
                references = references.concat(changedItem.dependentOn);
            }

            if (references.length === 0) {
                info.visited = true;
                info.result = true;
            } else {
                info.visiting = true;

                for (var i = 0; i < references.length; i++) {
                    var entity = references[i];
                    var idx = entityItems.indexOf(entity);
                    var innerChangeItem = changedItems[idx];
                    if (!innerChangeItem) return false;
                    if (innerChangeItem === parent) continue;

                    var result = discover(innerChangeItem, changedItem, idx);
                    info.result = info.result && changedItem.data.entityState === _core2.default.EntityState.Added && (!changedItem.additionalDependentOn || changedItem.additionalDependentOn.length === 0) && result;
                }
                delete info.visiting;
                info.visited = true;
            }

            changedItem.enableDeepSave = info.result;
            return info.result;
        };

        for (var i = 0; i < changedItems.length; i++) {
            var changedItem = changedItems[i];
            discover(changedItem, null, i);
        }

        this._discoverSaveOrder(changedItems);
    },

    _buildSaveData: function _buildSaveData(independentBlocks, changedItems) {
        var convertedItems = new _core2.default.storageProviders.oData.RequestManager();
        for (var index = 0; index < independentBlocks.length; index++) {
            for (var i = 0; i < independentBlocks[index].length; i++) {
                var independentItem = independentBlocks[index][i];

                var request = null;
                var item = convertedItems.getItem(independentItem.data);
                if (!item) {
                    request = new activities.RequestBuilder(this);
                    request.add(new activities.SetUrl(this.providerConfiguration.oDataServiceHost + '/'));
                    item = convertedItems.add(independentItem, request);
                }
                request = item.request;

                var entityState = independentItem.data.entityState;
                if (typeof this._buildRequestObject['EntityState_' + entityState] === 'function') {
                    this._buildRequestObject['EntityState_' + entityState](this, independentItem, convertedItems, request, changedItems);
                } else {
                    _core.Guard.raise(new _core.Exception("Not supported Entity state"));
                }
            }
        }

        return convertedItems;
    },
    _buildRequestObject: {
        value: {
            'EntityState_20': function EntityState_20(provider, item, convertedItem, request, changedItems) {
                request.add(new activities.SetMethod("POST"), new activities.AppendUrl(item.entitySet.tableName));

                provider.save_getInitData(item, convertedItem, undefined, undefined, request, changedItems);
            },
            'EntityState_30': function EntityState_30(provider, item, convertedItem, request, changedItems) {
                request.add(new activities.SetMethod(provider.providerConfiguration.UpdateMethod), new activities.AppendUrl(item.entitySet.tableName), new activities.AppendUrl("(" + provider.getEntityKeysValue(item) + ")"));

                provider.addETagHeader(item, request);

                provider.save_getInitData(item, convertedItem, undefined, undefined, request, changedItems);
            },
            'EntityState_40': function EntityState_40(provider, item, convertedItem, request, changedItems) {
                request.add(new activities.SetMethod("DELETE"), new activities.ClearRequestData(), new activities.AppendUrl(item.entitySet.tableName), new activities.AppendUrl("(" + provider.getEntityKeysValue(item) + ")"));

                provider.addETagHeader(item, request);
            }
        }
    },
    reload_fromResponse: function reload_fromResponse(item, data, response) {
        var that = this;
        item.getType().memberDefinitions.getPublicMappedProperties().forEach(function (memDef) {
            var propType = _core.Container.resolveType(memDef.type);
            if (memDef.computed || memDef.key || !memDef.inverseProperty) {
                if (memDef.concurrencyMode === _core2.default.ConcurrencyMode.Fixed) {
                    //unescape?
                    //item[memDef.name] = response.headers.ETag || response.headers.Etag || response.headers.etag;
                    item[memDef.name] = data['@odata.etag'];
                } else if (memDef.isAssignableTo) {
                    if (data[memDef.name]) {
                        item[memDef.name] = new propType(data[memDef.name], { converters: that.fieldConverter.fromDb });
                    } else {
                        item[memDef.name] = data[memDef.name];
                    }
                } else if (propType === _core2.default.Array && memDef.elementType) {
                    var aeType = _core.Container.resolveType(memDef.elementType);
                    if (data[memDef.name] && Array.isArray(data[memDef.name])) {
                        var arrayProperty = [];
                        for (var ap = 0; ap < data[memDef.name].length; ap++) {
                            var aitem = data[memDef.name][ap];
                            if (aeType.isAssignableTo && !_core.Guard.isNullOrUndefined(aitem)) {
                                arrayProperty.push(new aeType(aitem, { converters: that.fieldConverter.fromDb }));
                            } else {
                                var etypeName = _core.Container.resolveName(aeType);
                                var econverter = that.fieldConverter.fromDb[etypeName];

                                arrayProperty.push(econverter ? econverter(aitem) : aitem);
                            }
                        }
                        item[memDef.name] = arrayProperty;
                    } else if (!data[memDef.name]) {
                        item[memDef.name] = data[memDef.name];
                    }
                } else {
                    var typeName = _core.Container.resolveName(memDef.type);
                    var converter = that.fieldConverter.fromDb[typeName];

                    item[memDef.name] = converter ? converter(data[memDef.name]) : data[memDef.name];
                }
            }
        }, this);
    },

    save_getInitData: function save_getInitData(item, convertedItems, isComplex, isDeep, request, changedItems) {
        var self = this;
        if (!isComplex) {
            item.physicalData = this.context._storageModel.getStorageModel(item.data.getType()).PhysicalType.convertTo(item.data, convertedItems);
        } else {
            item.physicalData = item.data;
        }
        var hasSavedProperty = item.data.entityState === _core2.default.EntityState.Added;
        item.physicalData.getType().memberDefinitions.asArray().forEach(function (memdef) {
            hasSavedProperty = self.propertyConversationSelector(item, memdef, convertedItems, request, changedItems, isDeep) || hasSavedProperty;
        }, this);

        if (!hasSavedProperty && !isDeep) {
            convertedItems.remove(item.data);
        }
    },
    propertyConversationSelector: function propertyConversationSelector(item, memdef, convertedItems, request, changedItems, isDeep) {
        if (memdef.kind == _core2.default.MemberTypes.complexProperty) {
            return this._complexPropertySelector.apply(this, arguments);
        }

        if (memdef.kind == _core2.default.MemberTypes.property) {
            return this._propertySelector.apply(this, arguments);
        }

        if (memdef.kind == _core2.default.MemberTypes.navProperty) {
            return this._navigationPropertySelector.apply(this, arguments);
        }

        return false;
    },
    _complexPropertySelector: function _complexPropertySelector(item, memdef, convertedItems, request, changedItems, isDeep) {
        return this.propertyConversationStrategies["complex"].apply(this, arguments);
    },
    _propertySelector: function _propertySelector(item, memdef, convertedItems, request, changedItems, isDeep) {
        if (typeof memdef.concurrencyMode === 'undefined') {
            switch (true) {
                case memdef.notMapped:
                    return false;
                case memdef.key === true:
                    this.propertyConversationStrategies["default"].apply(this, arguments);
                    return false;
                case isDeep:
                case item.data.entityState === _core2.default.EntityState.Added:
                case this._propertyIsChanged(item.data, memdef):
                    return this.propertyConversationStrategies["default"].apply(this, arguments);
                default:
                    return false;
            }
        }

        return false;
    },
    _navigationPropertySelector: function _navigationPropertySelector(item, memdef, convertedItems, request, changedItems, isDeep) {
        var _this = this;

        if (isDeep || item.data.entityState === _core2.default.EntityState.Added || this._propertyIsChanged(item.data, memdef)) {

            var navigationValue = item.data[memdef.name];
            if (_checkODataMode(this, 'enableDeepSave') && navigationValue && item.data.entityState === _core2.default.EntityState.Added) {
                var result = null;
                if (Array.isArray(navigationValue)) {
                    navigationValue.forEach(function (navItem, index) {
                        _this._processDeepSaveItems(item, memdef, convertedItems, request, changedItems, navItem, "deepSaveArray", index);
                        //update not supported here
                    });
                    return true; //item.data is new
                } else {
                        result = this._processDeepSaveItems(item, memdef, convertedItems, request, changedItems, navigationValue, "deepSave");
                    }

                if (result !== null) {
                    return result;
                }
            }

            return this._simpleNavigationPropertySelector.apply(this, arguments);
        }
        return false;
    },
    _simpleNavigationPropertySelector: function _simpleNavigationPropertySelector(item, memdef, convertedItems, request, changedItems, isDeep) {
        if (_checkODataMode(this, 'withReferenceMethods')) {
            return this.propertyConversationStrategies["withReferenceMethods"].apply(this, arguments);
        }

        return this.propertyConversationStrategies["navigation"].apply(this, arguments);
    },

    _processDeepSaveItems: function _processDeepSaveItems(item, memdef, convertedItems, request, changedItems, navigationEntity, strategy, index) {
        var referencedItems = changedItems.filter(function (it) {
            return it.data == navigationEntity;
        });

        if (referencedItems.length === 1 && referencedItems[0].enableDeepSave && navigationEntity.entityState === _core2.default.EntityState.Added && referencedItems[0].deepParent === item.data) {
            var deepItem = convertedItems.getItem(referencedItems[0].data);
            if (!deepItem) {
                var referencedRequest = new activities.RequestBuilder(this);
                referencedRequest.add(new activities.SetUrl(this.providerConfiguration.oDataServiceHost + '/'));
                deepItem = convertedItems.add(referencedItems[0], referencedRequest);
            }

            convertedItems.addItemReference(item.data, deepItem);
            if (!deepItem.removed) {
                convertedItems.remove(referencedItems[0].data);
            }

            return this.propertyConversationStrategies[strategy].call(this, item, memdef, convertedItems, request, changedItems, index);
        }

        return null;
    },
    _propertyIsChanged: function _propertyIsChanged(entity, memdef) {
        return entity && entity.changedProperties && entity.changedProperties.some(function (def) {
            return def.name === memdef.name;
        });
    },
    propertyConversationStrategies: {
        value: {
            "default": function _default(item, memdef, convertedItems, request, changedItems) {
                var typeName = _core.Container.resolveName(memdef.type);
                var converter = this.fieldConverter.toDb[typeName];
                request.add(new activities.SetProperty(memdef.name, converter ? converter(item.physicalData[memdef.name]) : item.physicalData[memdef.name]));
                return true;
            },
            "withReferenceMethods": function withReferenceMethods(item, memdef, convertedItems, request, changedItems) {
                var reqItem = convertedItems.getItem(item.data);
                if (reqItem && reqItem.removed) return false; //deep saved

                var additionalRequest = new activities.RequestBuilder(this);
                var value = item.physicalData[memdef.name];
                if (value) {
                    additionalRequest.add(new activities.SetMethod('POST'));
                    if (value.__metadata) {
                        additionalRequest.add(new activities.SetProperty('@odata.id', this.providerConfiguration.oDataServiceHost + '/' + value.__metadata.uri));
                    } else if (value.__convertedRefence) {
                        additionalRequest.add(function (req, provider) {
                            var targetItem = value.__convertedRefence;
                            req.data = req.data || {};
                            if (targetItem.isProcessed) {
                                req.data["@odata.id"] = provider.getEntityUrlReference(targetItem.entity);
                            } else {
                                req.data["@odata.id"] = provider.providerConfiguration.oDataServiceHost + '/$' + targetItem.itemIndex;
                            }
                        });
                    }
                } else {
                    if (item.data.entityState === _core2.default.EntityState.Added || value !== null) return;

                    additionalRequest.add(new activities.SetUrl(this.providerConfiguration.oDataServiceHost + '/'), new activities.AppendUrl(item.entitySet.tableName), new activities.AppendUrl("(" + this.getEntityKeysValue(item) + ")"), new activities.SetMethod('DELETE'), new activities.ClearRequestData());
                }

                additionalRequest.add(function (req, provider) {
                    if (reqItem.isProcessed || item.data.entityState !== _core2.default.EntityState.Added) {
                        req.requestUri = provider.providerConfiguration.oDataServiceHost + '/';
                        req.requestUri += item.entitySet.tableName;
                        req.requestUri += "(" + provider.getEntityKeysValue(item) + ")";
                        provider.addETagHeader(item, req);
                    } else {
                        req.requestUri = '$' + reqItem.itemIndex;
                        provider.addETagHeader(item, req, _core2.default.defaults.OData.eTagAny);
                    }

                    req.requestUri += '/' + memdef.name + '/$ref';
                });

                var refItem = convertedItems.add(item, additionalRequest, false);
                convertedItems.addItemReference(item.data, refItem);
                return false;
            },
            "deepSave": function deepSave(item, memdef, convertedItems, request, changedItems) {
                var refItem = convertedItems.getItem(item.data[memdef.name]);
                request.add(function (req, provider) {
                    req.data[memdef.name] = refItem.request.build().get().data;
                });
                return true;
            },
            "deepSaveArray": function deepSaveArray(item, memdef, convertedItems, request, changedItems, index) {
                var refItem = convertedItems.getItem(item.data[memdef.name][index]);
                request.add(function (req, provider) {
                    req.data[memdef.name] = req.data[memdef.name] || [];
                    req.data[memdef.name].push(refItem.request.build().get().data);
                });
                return true;
            },
            "navigation": function navigation(item, memdef, convertedItems, request, changedItems) {

                request.add(function (req, provider) {
                    req.data = req.data || {};

                    if (item.physicalData[memdef.name] && item.physicalData[memdef.name].__metadata) {
                        req.data[memdef.name + "@odata.bind"] = item.physicalData[memdef.name].__metadata.uri;
                    } else if (item.physicalData[memdef.name] && item.physicalData[memdef.name].__convertedRefence) {
                        var targetItem = item.physicalData[memdef.name].__convertedRefence;
                        if (targetItem.isProcessed) {
                            req.data[memdef.name + "@odata.bind"] = provider.getEntityUrlReference(targetItem.entity);
                        } else {
                            req.data[memdef.name + "@odata.bind"] = "$" + targetItem.itemIndex;
                        }
                    } else if (item.physicalData[memdef.name] === null) {
                        req.data[memdef.name + "@odata.bind"] = null;
                    }
                });
                return true;
            },
            "complex": function complex(item, memdef, convertedItems, request, changedItems) {
                if (item.physicalData[memdef.name]) {
                    var innerRequest = new activities.RequestBuilder(this);
                    this.save_getInitData({ data: item.physicalData[memdef.name] }, convertedItems, true, true, innerRequest);
                    request.add(function (req) {
                        req.data = req.data || {};
                        req.data[memdef.name] = innerRequest.build().get().data;
                    });
                    return true;
                }
                return false;
            }
        }
    },

    addETagHeader: function addETagHeader(item, request, value) {
        var property = item.data.getType().memberDefinitions.getPublicMappedProperties().filter(function (memDef) {
            return memDef.concurrencyMode === _core2.default.ConcurrencyMode.Fixed;
        });
        if (property && property[0]) {
            var headerValue = typeof value !== "undefined" ? value : item.data[property[0].name];
            if (typeof headerValue !== "undefined") {
                if (request instanceof activities.RequestBuilder) {
                    request.add(new activities.SetHeaderProperty('If-Match', headerValue));
                } else {
                    request.headers['If-Match'] = headerValue;
                }
            }
        }
    },

    getTraceString: function getTraceString(queryable) {
        var sqlText = this._compile(queryable);
        return queryable;
    },
    supportedDataTypes: {
        value: [_core2.default.Array, _core2.default.Integer, _core2.default.String, _core2.default.Number, _core2.default.Blob, _core2.default.Boolean, _core2.default.Date, _core2.default.Object, _core2.default.GeographyPoint, _core2.default.Guid, _core2.default.GeographyLineString, _core2.default.GeographyPolygon, _core2.default.GeographyMultiPoint, _core2.default.GeographyMultiLineString, _core2.default.GeographyMultiPolygon, _core2.default.GeographyCollection, _core2.default.GeometryPoint, _core2.default.GeometryLineString, _core2.default.GeometryPolygon, _core2.default.GeometryMultiPoint, _core2.default.GeometryMultiLineString, _core2.default.GeometryMultiPolygon, _core2.default.GeometryCollection, _core2.default.Byte, _core2.default.SByte, _core2.default.Decimal, _core2.default.Float, _core2.default.Int16, _core2.default.Int32, _core2.default.Int64, _core2.default.Time, _core2.default.Day, _core2.default.DateTimeOffset, _core2.default.Duration],
        writable: false
    },

    supportedBinaryOperators: {
        value: {
            equal: { mapTo: 'eq', dataType: "boolean", allowedIn: [_core2.default.Expressions.FilterExpression, _core2.default.Expressions.OrderExpression] },
            notEqual: { mapTo: 'ne', dataType: "boolean", allowedIn: [_core2.default.Expressions.FilterExpression, _core2.default.Expressions.OrderExpression] },
            equalTyped: { mapTo: 'eq', dataType: "boolean", allowedIn: [_core2.default.Expressions.FilterExpression, _core2.default.Expressions.OrderExpression] },
            notEqualTyped: { mapTo: 'ne', dataType: "boolean", allowedIn: [_core2.default.Expressions.FilterExpression, _core2.default.Expressions.OrderExpression] },
            greaterThan: { mapTo: 'gt', dataType: "boolean", allowedIn: [_core2.default.Expressions.FilterExpression, _core2.default.Expressions.OrderExpression] },
            greaterThanOrEqual: { mapTo: 'ge', dataType: "boolean", allowedIn: [_core2.default.Expressions.FilterExpression, _core2.default.Expressions.OrderExpression] },

            lessThan: { mapTo: 'lt', dataType: "boolean", allowedIn: [_core2.default.Expressions.FilterExpression, _core2.default.Expressions.OrderExpression] },
            lessThenOrEqual: { mapTo: 'le', dataType: "boolean", allowedIn: [_core2.default.Expressions.FilterExpression, _core2.default.Expressions.OrderExpression] },
            or: { mapTo: 'or', dataType: "boolean", allowedIn: [_core2.default.Expressions.FilterExpression, _core2.default.Expressions.OrderExpression] },
            and: { mapTo: 'and', dataType: "boolean", allowedIn: [_core2.default.Expressions.FilterExpression, _core2.default.Expressions.OrderExpression] },

            add: { mapTo: 'add', dataType: "number", allowedIn: [_core2.default.Expressions.FilterExpression, _core2.default.Expressions.OrderExpression] },
            divide: { mapTo: 'div', allowedIn: [_core2.default.Expressions.FilterExpression, _core2.default.Expressions.OrderExpression] },
            multiply: { mapTo: 'mul', allowedIn: [_core2.default.Expressions.FilterExpression, _core2.default.Expressions.OrderExpression] },
            subtract: { mapTo: 'sub', allowedIn: [_core2.default.Expressions.FilterExpression, _core2.default.Expressions.OrderExpression] },
            modulo: { mapTo: 'mod', allowedIn: [_core2.default.Expressions.FilterExpression, _core2.default.Expressions.OrderExpression] },

            "in": { mapTo: "in", allowedIn: [_core2.default.Expressions.FilterExpression, _core2.default.Expressions.OrderExpression] }
        }
    },

    supportedUnaryOperators: {
        value: {
            not: { mapTo: 'not' }
        }
    },

    supportedFieldOperations: {
        value: {
            /* string functions */

            contains: {
                mapTo: "substringof",
                dataType: "boolean", allowedIn: [_core2.default.Expressions.FilterExpression, _core2.default.Expressions.OrderExpression],
                parameters: [{ name: "substring", dataType: "string" }, { name: "@expression" }]
            },

            startsWith: {
                mapTo: "startswith",
                dataType: "string", allowedIn: [_core2.default.Expressions.FilterExpression, _core2.default.Expressions.OrderExpression],
                parameters: [{ name: "@expression", dataType: "string" }, { name: "strFragment", dataType: "string" }]
            },

            endsWith: {
                mapTo: "endswith",
                dataType: "string", allowedIn: [_core2.default.Expressions.FilterExpression, _core2.default.Expressions.OrderExpression],
                parameters: [{ name: "@expression", dataType: "string" }, { name: "strFragment", dataType: "string" }]
            },

            length: [{
                allowedType: 'string',
                dataType: "number", allowedIn: [_core2.default.Expressions.FilterExpression, _core2.default.Expressions.ProjectionExpression],
                parameters: [{ name: "@expression", dataType: "string" }]
            }, {
                allowedType: 'GeographyLineString',
                mapTo: "geo.length",
                dataType: "number", allowedIn: [_core2.default.Expressions.FilterExpression, _core2.default.Expressions.OrderExpression],
                parameters: [{ name: "@expression", dataType: ['GeographyLineString'] }],
                fixedDataType: 'decimal'
            }, {
                allowedType: 'GeometryLineString',
                mapTo: "geo.length",
                dataType: "number", allowedIn: [_core2.default.Expressions.FilterExpression, _core2.default.Expressions.OrderExpression],
                parameters: [{ name: "@expression", dataType: 'GeometryLineString' }],
                fixedDataType: 'decimal'
            }],

            strLength: {
                mapTo: "length",
                dataType: "number", allowedIn: [_core2.default.Expressions.FilterExpression, _core2.default.Expressions.ProjectionExpression],
                parameters: [{ name: "@expression", dataType: "string" }]
            },

            indexOf: {
                dataType: "number", allowedIn: [_core2.default.Expressions.FilterExpression, _core2.default.Expressions.OrderExpression],
                mapTo: "indexof",
                baseIndex: 1,
                parameters: [{ name: '@expression', dataType: "string" }, { name: 'strFragment', dataType: 'string' }]
            },

            replace: {
                dataType: "string", allowedIn: [_core2.default.Expressions.FilterExpression, _core2.default.Expressions.OrderExpression],
                parameters: [{ name: '@expression', dataType: "string" }, { name: 'strFrom', dataType: 'string' }, { name: 'strTo', dataType: 'string' }]
            },

            substr: {
                mapTo: "substring",
                dataType: "string", allowedIn: [_core2.default.Expressions.FilterExpression, _core2.default.Expressions.OrderExpression],
                parameters: [{ name: "@expression", dataType: "string" }, { name: "startFrom", dataType: "number" }, { name: "length", dataType: "number", optional: "true" }]
            },

            toLowerCase: {
                mapTo: "tolower",
                dataType: "string", allowedIn: [_core2.default.Expressions.FilterExpression, _core2.default.Expressions.OrderExpression],
                parameters: [{ name: "@expression", dataType: "string" }]
            },

            toUpperCase: {
                mapTo: "toupper",
                dataType: "string", allowedIn: [_core2.default.Expressions.FilterExpression, _core2.default.Expressions.OrderExpression],
                parameters: [{ name: "@expression", dataType: "string" }]

            },

            trim: {
                dataType: "string", allowedIn: [_core2.default.Expressions.FilterExpression, _core2.default.Expressions.OrderExpression],
                parameters: [{ name: "@expression", dataType: "string" }]
            },

            concat: {
                dataType: "string", allowedIn: [_core2.default.Expressions.FilterExpression, _core2.default.Expressions.OrderExpression],
                parameters: [{ name: "@expression", dataType: "string" }, { name: "strFragment", dataType: "string" }]
            },

            /* data functions */

            day: {
                allowedIn: [_core2.default.Expressions.FilterExpression, _core2.default.Expressions.OrderExpression],
                parameters: [{ name: "@expression", dataType: "date" }]
            },
            hour: {
                allowedIn: [_core2.default.Expressions.FilterExpression, _core2.default.Expressions.OrderExpression],
                parameters: [{ name: "@expression", dataType: "date" }]
            },
            minute: {
                allowedIn: [_core2.default.Expressions.FilterExpression, _core2.default.Expressions.OrderExpression],
                parameters: [{ name: "@expression", dataType: "date" }]
            },
            month: {
                allowedIn: [_core2.default.Expressions.FilterExpression, _core2.default.Expressions.OrderExpression],
                parameters: [{ name: "@expression", dataType: "date" }]
            },
            second: {
                allowedIn: [_core2.default.Expressions.FilterExpression, _core2.default.Expressions.OrderExpression],
                parameters: [{ name: "@expression", dataType: "date" }]
            },
            year: {
                allowedIn: [_core2.default.Expressions.FilterExpression, _core2.default.Expressions.OrderExpression],
                parameters: [{ name: "@expression", dataType: "date" }]
            },

            /* number functions */
            round: {
                allowedIn: [_core2.default.Expressions.FilterExpression, _core2.default.Expressions.OrderExpression],
                parameters: [{ name: "@expression", dataType: "date" }]
            },
            floor: {
                allowedIn: [_core2.default.Expressions.FilterExpression, _core2.default.Expressions.OrderExpression],
                parameters: [{ name: "@expression", dataType: "date" }]
            },
            ceiling: {
                allowedIn: [_core2.default.Expressions.FilterExpression, _core2.default.Expressions.OrderExpression],
                parameters: [{ name: "@expression", dataType: "date" }]
            },

            /* geo functions */
            distance: [{
                allowedType: 'GeographyPoint',
                mapTo: "geo.distance",
                dataType: "number", allowedIn: [_core2.default.Expressions.FilterExpression, _core2.default.Expressions.OrderExpression],
                parameters: [{ name: "@expression", dataType: 'GeographyPoint' }, { name: "to", dataType: 'GeographyPoint' }],
                fixedDataType: 'decimal'
            }, {
                allowedType: 'GeometryPoint',
                mapTo: "geo.distance",
                dataType: "number", allowedIn: [_core2.default.Expressions.FilterExpression, _core2.default.Expressions.OrderExpression],
                parameters: [{ name: "@expression", dataType: 'GeometryPoint' }, { name: "to", dataType: 'GeometryPoint' }],
                fixedDataType: 'decimal'
            }],

            intersects: [{
                allowedType: 'GeographyPoint',
                mapTo: "geo.intersects",
                dataType: "boolean", allowedIn: [_core2.default.Expressions.FilterExpression, _core2.default.Expressions.OrderExpression],
                parameters: [{ name: "@expression", dataType: 'GeographyPoint' }, { name: "in", dataType: 'GeographyPolygon' }]

            }, {
                allowedType: 'GeometryPoint',
                mapTo: "geo.intersects",
                dataType: "boolean", allowedIn: [_core2.default.Expressions.FilterExpression, _core2.default.Expressions.OrderExpression],
                parameters: [{ name: "@expression", dataType: 'GeometryPoint' }, { name: "in", dataType: 'GeometryPolygon' }]

            }]
        },
        enumerable: true,
        writable: true
    },
    supportedSetOperations: {
        value: {
            filter: {
                allowedIn: [_core2.default.Expressions.IncludeExpression],
                parameters: [{ name: "filter", dataType: "$data.Queryable" }],
                frameType: _core2.default.Expressions.FilterExpression,
                includeFrameName: '$filter',
                includeCompiler: '$data.storageProviders.oData.oDataWhereCompiler'
            },
            map: {
                allowedIn: [_core2.default.Expressions.IncludeExpression],
                parameters: [{ name: "map", dataType: "$data.Queryable" }],
                frameType: _core2.default.Expressions.ProjectionExpression,
                includeFrameName: '$select',
                includeCompiler: '$data.storageProviders.oData.oDataProjectionCompiler'
            },
            length: {},
            forEach: {},
            toArray: {},
            single: {},
            some: {
                invokable: false,
                allowedIn: [_core2.default.Expressions.FilterExpression],
                parameters: [{ name: "some", dataType: "$data.Queryable" }],
                mapTo: 'any',
                frameType: _core2.default.Expressions.SomeExpression
            },
            every: {
                invokable: false,
                allowedIn: [_core2.default.Expressions.FilterExpression],
                parameters: [{ name: "every", dataType: "$data.Queryable" }],
                mapTo: 'all',
                frameType: _core2.default.Expressions.EveryExpression
            },
            take: {
                allowedIn: [_core2.default.Expressions.IncludeExpression],
                parameters: [{ name: "take", dataType: "$data.Integer" }],
                frameType: _core2.default.Expressions.PagingExpression,
                includeFrameName: '$top',
                includeCompiler: '$data.storageProviders.oData.oDataPagingCompiler'
            },
            skip: {
                allowedIn: [_core2.default.Expressions.IncludeExpression],
                parameters: [{ name: "skip", dataType: "$data.Integer" }],
                frameType: _core2.default.Expressions.PagingExpression,
                includeFrameName: '$skip',
                includeCompiler: '$data.storageProviders.oData.oDataPagingCompiler'
            },
            orderBy: {
                allowedIn: [_core2.default.Expressions.IncludeExpression],
                parameters: [{ name: "orderBy", dataType: "$data.Queryable" }],
                frameType: _core2.default.Expressions.OrderExpression,
                includeFrameName: '$orderby',
                includeCompiler: '$data.storageProviders.oData.oDataOrderCompiler'
            },
            orderByDescending: {
                allowedIn: [_core2.default.Expressions.IncludeExpression],
                parameters: [{ name: "orderByDescending", dataType: "$data.Queryable" }],
                frameType: _core2.default.Expressions.OrderExpression,
                frameTypeFactory: function frameTypeFactory(source, selector) {
                    return new _core2.default.Expressions.OrderExpression(source, selector, _core2.default.Expressions.ExpressionType.OrderByDescending);
                },
                includeFrameName: '$orderby',
                includeCompiler: '$data.storageProviders.oData.oDataOrderCompiler'
            },
            first: {},
            include: {},
            batchDelete: {},
            withInlineCount: {
                allowedIn: [_core2.default.Expressions.IncludeExpression],
                parameters: [],
                frameType: _core2.default.Expressions.InlineCountExpression,
                includeFrameName: '$count',
                implementation: function implementation() {
                    return 'true';
                }
            },
            find: {}
        },
        enumerable: true,
        writable: true
    },
    supportedContextOperation: {
        value: {
            batchExecuteQuery: true
        },
        enumerable: true,
        writable: true
    },

    fieldConverter: { value: _core2.default.oDataConverter },
    resolveTypeOperations: function resolveTypeOperations(operation, expression, frameType) {
        var memDef = expression.entityType.getMemberDefinition(operation);
        if (!memDef || !memDef.method || memDef.method.IsSideEffecting !== false || !memDef.method.returnType || !(frameType === _core2.default.Expressions.FilterExpression || frameType === _core2.default.Expressions.OrderExpression)) {
            _core.Guard.raise(new _core.Exception("Entity '" + expression.entityType.name + "' Operation '" + operation + "' is not supported by the provider"));
        }

        return memDef;
    },
    resolveSetOperations: function resolveSetOperations(operation, expression, frameType) {
        if (expression) {
            var esDef = expression.storageModel.ContextType.getMemberDefinition(expression.storageModel.ItemName);
            if (esDef && esDef.actions && esDef.actions[operation]) {
                var memDef = _core2.default.MemberDefinition.translateDefinition(esDef.actions[operation], operation, this.getType());
                if (!memDef || !memDef.method || memDef.method.IsSideEffecting !== false || !memDef.method.returnType || !(frameType === _core2.default.Expressions.FilterExpression || frameType === _core2.default.Expressions.OrderExpression)) {

                    _core.Guard.raise(new _core.Exception("Collection '" + expression.storageModel.ItemName + "' Operation '" + operation + "' is not supported by the provider"));
                }

                return memDef;
            }
        }
        return _core2.default.StorageProviderBase.prototype.resolveSetOperations.apply(this, arguments);
    },
    resolveContextOperations: function resolveContextOperations(operation, expression, frameType) {
        var memDef = this.context.getType().getMemberDefinition(operation);
        if (!memDef || !memDef.method || memDef.method.IsSideEffecting !== false || !memDef.method.returnType || !(frameType === _core2.default.Expressions.FilterExpression || frameType === _core2.default.Expressions.OrderExpression)) {
            _core.Guard.raise(new _core.Exception("Context '" + expression.instance.getType().name + "' Operation '" + operation + "' is not supported by the provider"));
        }
        return memDef;
    },

    getEntityUrlReference: function getEntityUrlReference(entity) {
        var sMod = this.context._storageModel.getStorageModel(entity.getType());
        var tblName = sMod.TableName;
        var pk = '(' + this.getEntityKeysValue({ data: entity, entitySet: this.context.getEntitySetFromElementType(entity.getType()) }) + ')';
        return this.providerConfiguration.oDataServiceHost + '/' + tblName + pk;
    },

    getEntityKeysValue: function getEntityKeysValue(entity) {
        var result = [];
        var keyValue = undefined;
        var memDefs = entity.data.getType().memberDefinitions.getKeyProperties();
        for (var i = 0, l = memDefs.length; i < l; i++) {
            var field = memDefs[i];
            if (field.key) {
                keyValue = entity.data[field.name];
                var typeName = _core.Container.resolveName(field.type);

                var converter = this.fieldConverter.toDb[typeName];
                keyValue = converter ? converter(keyValue) : keyValue;

                converter = this.fieldConverter.escape[typeName];
                keyValue = converter ? converter(keyValue) : keyValue;

                result.push(field.name + "=" + keyValue);
            }
        }
        if (result.length > 1) {
            return result.join(",");
        }
        return keyValue;
    },
    getFieldUrl: function getFieldUrl(entity, fieldName, entitySet) {
        var keyPart = this.getEntityKeysValue({ data: entity });
        var servicehost = this.providerConfiguration.oDataServiceHost;
        if (servicehost.lastIndexOf('/') === servicehost.length) servicehost = servicehost.substring(0, servicehost.length - 1);

        return servicehost + '/' + entitySet.tableName + '(' + keyPart + ')/' + fieldName + '/$value';
    }, /*
       getServiceMetadata: function () {
         $data.ajax(this._setAjaxAuthHeader({
             url: this.providerConfiguration.oDataServiceHost + "/$metadata",
             dataType: "xml",
             success: function (d) {
                 console.log("OK");
                 console.dir(d);
                 console.log(typeof d);
                 window["s"] = d;
                 window["k"] = this.nsResolver;
                 //s.evaluate("edmx:Edmx/edmx:DataServices/Schema", s, $data.storageProviders.oData.oDataProvider.prototype.nsResolver, XPathResult.ANY_TYPE, null).iterateNext()
               },
             error: function (error) {
                 console.log("error:");
                 console.dir(error);
             }
         }));
       },
       nsResolver: function (sPrefix) {
         switch (sPrefix) {
             case "edmx":
                 return "http://schemas.microsoft.com/ado/2007/06/edmx";
                 break;
             case "m":
                 return "http://schemas.microsoft.com/ado/2007/08/dataservices/metadata";
                 break;
             case "d":
                 return "http://schemas.microsoft.com/ado/2007/08/dataservices";
                 break;
             default:
                 return "http://schemas.microsoft.com/ado/2008/09/edm";
                 break;
         }
       }
       */
    parseError: function parseError(error, data) {

        var message = (error.response || error || {}).body || '';
        try {
            if (message.indexOf('{') === 0) {
                var errorObj = JSON.parse(message);
                errorObj = errorObj['odata.error'] || errorObj.error || errorObj;
                if (errorObj.message) {
                    message = errorObj.message.value || errorObj.message;
                }
            }
        } catch (e) {}

        return new _core.Exception(message, error.message, data || error);
    },
    appendBasicAuth: function appendBasicAuth(request, user, password, withCredentials) {
        request.headers = request.headers || {};
        if (!request.headers.Authorization && user && password) {
            request.headers.Authorization = "Basic " + this.__encodeBase64(user + ":" + password);
        }
        if (withCredentials) {
            request.withCredentials = withCredentials;
        }
    },
    __encodeBase64: function __encodeBase64(val) {
        var b64array = "ABCDEFGHIJKLMNOP" + "QRSTUVWXYZabcdef" + "ghijklmnopqrstuv" + "wxyz0123456789+/" + "=";

        var input = val;
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
    },
    checkODataMode: function checkODataMode(functionName) {
        return _checkODataMode(this, functionName);
    }
}, null);

_core2.default.StorageProviderBase.registerProvider("oData", _core2.default.storageProviders.oData.oDataProvider);

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"./SaveStrategies/batch":1,"./SaveStrategies/empty":2,"./SaveStrategies/single":3,"./oDataRequestActivities.js":12,"jaydata/core":"jaydata/core"}],12:[function(_dereq_,module,exports){
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

Object.defineProperty(exports, "__esModule", {
    value: true
});

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var RequestBuilder = exports.RequestBuilder = function () {
    function RequestBuilder(context, request) {
        _classCallCheck(this, RequestBuilder);

        this._context = context;
        this._request = request || {};
        this._activities = [];
    }

    _createClass(RequestBuilder, [{
        key: 'get',
        value: function get() {
            return this._request;
        }
    }, {
        key: 'add',
        value: function add() {
            var _activities;

            (_activities = this._activities).push.apply(_activities, arguments);
            return this;
        }
    }, {
        key: 'build',
        value: function build() {
            var _this = this;

            this._request.headers = this._request.headers || {};
            this._request.data = this._request.data || {};

            this._activities.forEach(function (a) {
                return a instanceof RequestActivity ? a.implementation(_this._request, _this._context) : a(_this._request, _this._context);
            });

            this._activities = [];
            return this;
        }
    }]);

    return RequestBuilder;
}();

var RequestActivity = exports.RequestActivity = function () {
    function RequestActivity() {
        _classCallCheck(this, RequestActivity);
    }

    _createClass(RequestActivity, [{
        key: 'implementation',
        value: function implementation(request, provider) {}
    }]);

    return RequestActivity;
}();

var SetRequestActivity = exports.SetRequestActivity = function (_RequestActivity) {
    _inherits(SetRequestActivity, _RequestActivity);

    function SetRequestActivity(key, value) {
        _classCallCheck(this, SetRequestActivity);

        var _this2 = _possibleConstructorReturn(this, Object.getPrototypeOf(SetRequestActivity).call(this));

        _this2.key = key;
        _this2.value = value;
        return _this2;
    }

    _createClass(SetRequestActivity, [{
        key: 'implementation',
        value: function implementation(request, provider) {}
    }]);

    return SetRequestActivity;
}(RequestActivity);

var SetRequestProperty = exports.SetRequestProperty = function (_SetRequestActivity) {
    _inherits(SetRequestProperty, _SetRequestActivity);

    function SetRequestProperty() {
        _classCallCheck(this, SetRequestProperty);

        return _possibleConstructorReturn(this, Object.getPrototypeOf(SetRequestProperty).apply(this, arguments));
    }

    _createClass(SetRequestProperty, [{
        key: 'implementation',
        value: function implementation(request, provider) {
            request[this.key] = this.value;
        }
    }]);

    return SetRequestProperty;
}(SetRequestActivity);

var SetDataProperty = exports.SetDataProperty = function (_SetRequestActivity2) {
    _inherits(SetDataProperty, _SetRequestActivity2);

    function SetDataProperty() {
        _classCallCheck(this, SetDataProperty);

        return _possibleConstructorReturn(this, Object.getPrototypeOf(SetDataProperty).apply(this, arguments));
    }

    _createClass(SetDataProperty, [{
        key: 'implementation',
        value: function implementation(request, provider) {
            request.data[this.key] = this.value;
        }
    }]);

    return SetDataProperty;
}(SetRequestActivity);

var SetHeaderProperty = exports.SetHeaderProperty = function (_SetRequestActivity3) {
    _inherits(SetHeaderProperty, _SetRequestActivity3);

    function SetHeaderProperty() {
        _classCallCheck(this, SetHeaderProperty);

        return _possibleConstructorReturn(this, Object.getPrototypeOf(SetHeaderProperty).apply(this, arguments));
    }

    _createClass(SetHeaderProperty, [{
        key: 'implementation',
        value: function implementation(request, provider) {
            request.headers[this.key] = this.value;
        }
    }]);

    return SetHeaderProperty;
}(SetRequestActivity);

var SetUrl = exports.SetUrl = function (_SetRequestProperty) {
    _inherits(SetUrl, _SetRequestProperty);

    function SetUrl(url) {
        _classCallCheck(this, SetUrl);

        return _possibleConstructorReturn(this, Object.getPrototypeOf(SetUrl).call(this, 'requestUri', url));
    }

    return SetUrl;
}(SetRequestProperty);

var AppendUrl = exports.AppendUrl = function (_SetUrl) {
    _inherits(AppendUrl, _SetUrl);

    function AppendUrl() {
        _classCallCheck(this, AppendUrl);

        return _possibleConstructorReturn(this, Object.getPrototypeOf(AppendUrl).apply(this, arguments));
    }

    _createClass(AppendUrl, [{
        key: 'implementation',
        value: function implementation(request, provider) {
            request[this.key] == request[this.key] || "";
            request[this.key] += this.value;
        }
    }]);

    return AppendUrl;
}(SetUrl);

var SetMethod = exports.SetMethod = function (_SetRequestProperty2) {
    _inherits(SetMethod, _SetRequestProperty2);

    function SetMethod(method) {
        _classCallCheck(this, SetMethod);

        return _possibleConstructorReturn(this, Object.getPrototypeOf(SetMethod).call(this, 'method', method));
    }

    return SetMethod;
}(SetRequestProperty);

var SetProperty = exports.SetProperty = function (_SetDataProperty) {
    _inherits(SetProperty, _SetDataProperty);

    function SetProperty() {
        _classCallCheck(this, SetProperty);

        return _possibleConstructorReturn(this, Object.getPrototypeOf(SetProperty).apply(this, arguments));
    }

    return SetProperty;
}(SetDataProperty);

var SetNavigationProperty = exports.SetNavigationProperty = function (_SetDataProperty2) {
    _inherits(SetNavigationProperty, _SetDataProperty2);

    function SetNavigationProperty() {
        _classCallCheck(this, SetNavigationProperty);

        return _possibleConstructorReturn(this, Object.getPrototypeOf(SetNavigationProperty).apply(this, arguments));
    }

    _createClass(SetNavigationProperty, [{
        key: 'implementation',
        value: function implementation(request, provider) {
            request.data[this.key] = this.value;
        }
    }]);

    return SetNavigationProperty;
}(SetDataProperty);

var ClearRequestData = exports.ClearRequestData = function (_RequestActivity2) {
    _inherits(ClearRequestData, _RequestActivity2);

    function ClearRequestData() {
        _classCallCheck(this, ClearRequestData);

        return _possibleConstructorReturn(this, Object.getPrototypeOf(ClearRequestData).apply(this, arguments));
    }

    _createClass(ClearRequestData, [{
        key: 'implementation',
        value: function implementation(request, provider) {
            delete request.data;
        }
    }]);

    return ClearRequestData;
}(RequestActivity);

},{}],13:[function(_dereq_,module,exports){
'use strict';

var _core = _dereq_('jaydata/core');

var _core2 = _interopRequireDefault(_core);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

(0, _core.$C)('$data.storageProviders.oData.oDataWhereCompiler', _core2.default.Expressions.EntityExpressionVisitor, null, {
    constructor: function constructor(provider, lambdaPrefix) {
        this.provider = provider;
        this.lambdaPrefix = lambdaPrefix;
    },

    compile: function compile(expression, context) {
        this.Visit(expression, context);
    },

    VisitParametricQueryExpression: function VisitParametricQueryExpression(expression, context) {
        this.Visit(expression.expression, context);
    },

    VisitUnaryExpression: function VisitUnaryExpression(expression, context) {
        context.data += expression.resolution.mapTo;
        context.data += "(";
        this.Visit(expression.operand, context);
        context.data += ")";
    },

    VisitSimpleBinaryExpression: function VisitSimpleBinaryExpression(expression, context) {
        context.data += "(";
        //TODO refactor!!!
        if (expression.nodeType == "in") {
            _core.Guard.requireType("expression.right", expression.type, _core2.default.Expressions.ConstantExpression);
            var paramValue = expression.right.value;
            if (!(paramValue instanceof Array)) {
                _core.Guard.raise(new _core.Exception("Right to the 'in' operator must be an array value"));
            }
            var result = null;
            var orResolution = { mapTo: "or", dataType: "boolean", name: "or" };
            var eqResolution = { mapTo: "eq", dataType: "boolean", name: "equal" };

            paramValue.forEach(function (item) {
                var idValue = item;
                var idCheck = _core.Container.createSimpleBinaryExpression(expression.left, idValue, _core2.default.Expressions.ExpressionType.Equal, "==", "boolean", eqResolution);
                if (result) {
                    result = _core.Container.createSimpleBinaryExpression(result, idCheck, _core2.default.Expressions.ExpressionType.Or, "||", "boolean", orResolution);
                } else {
                    result = idCheck;
                };
            });
            var temp = context.data;
            context.data = '';
            this.Visit(result, context);
            context.data = temp + context.data.replace(/\(/g, '').replace(/\)/g, '');
        } else {
            this.Visit(expression.left, context);
            context.data += " ";
            context.data += expression.resolution.mapTo;
            context.data += " ";
            this.Visit(expression.right, context);
        };
        context.data += ")";
    },

    VisitEntityFieldExpression: function VisitEntityFieldExpression(expression, context) {
        this.Visit(expression.source, context);
        if (expression.source instanceof _core2.default.Expressions.ComplexTypeExpression) {
            context.data += "/";
        }
        this.Visit(expression.selector, context);
    },

    VisitAssociationInfoExpression: function VisitAssociationInfoExpression(expression, context) {
        context.data += expression.associationInfo.FromPropertyName;
    },

    VisitMemberInfoExpression: function VisitMemberInfoExpression(expression, context) {
        context.data += expression.memberName;
    },

    VisitQueryParameterExpression: function VisitQueryParameterExpression(expression, context) {
        var typeName = _core.Container.resolveName(expression.type);

        var converter = this.provider.fieldConverter.toDb[typeName];
        var value = converter ? converter(expression.value) : expression.value;

        converter = this.provider.fieldConverter.escape[typeName];
        context.data += converter ? converter(value) : value;
    },

    VisitEntityFieldOperationExpression: function VisitEntityFieldOperationExpression(expression, context) {
        _core.Guard.requireType("expression.operation", expression.operation, _core2.default.Expressions.MemberInfoExpression);

        //TODO refactor!
        var opDef = expression.operation.memberDefinition;
        var opName = opDef.mapTo || opDef.name;
        context.data += opName;
        context.data += "(";
        var paramCounter = 0;
        var params = opDef.parameters || [{ name: "@expression" }];

        var args = params.map(function (item, index) {
            if (item.name === "@expression") {
                return expression.source;
            } else {
                return expression.parameters[paramCounter++];
            };
        });

        args.forEach(function (arg, index) {
            if (index > 0) {
                context.data += ",";
            };
            this.Visit(arg, context);
        }, this);
        context.data += ")";
    },
    VisitEntityFunctionOperationExpression: function VisitEntityFunctionOperationExpression(expression, context) {
        _core.Guard.requireType("expression.operation", expression.operation, _core2.default.Expressions.MemberInfoExpression);
        this.Visit(expression.source, context);

        //TODO refactor!
        var opDef = expression.operation.memberDefinition;
        var opName = opDef.mapTo || opDef.name;
        context.data += opName;
        context.data += "(";
        var paramCounter = 0;
        var params = opDef.method.params || [{ name: "@expression" }];

        var args = params.map(function (item, index) {
            if (item.name === "@expression") {
                return expression.source;
            } else {
                return expression.parameters[paramCounter++];
            };
        });
        var i = 0;
        args.forEach(function (arg, index) {
            if (arg === undefined || arg instanceof _core2.default.Expressions.ConstantExpression && typeof arg.value === 'undefined') return;

            if (i > 0) {
                context.data += ",";
            };
            i++;
            context.data += params[index].name + '=';
            this.Visit(arg, context);
        }, this);
        context.data += ")";
    },
    VisitContextFunctionOperationExpression: function VisitContextFunctionOperationExpression(expression, context) {
        return this.VisitEntityFunctionOperationExpression(expression, context);
    },

    VisitConstantExpression: function VisitConstantExpression(expression, context) {
        var typeName = _core.Container.resolveName(expression.type);

        var converter = this.provider.fieldConverter.toDb[typeName];
        var value = converter ? converter(expression.value) : expression.value;

        converter = this.provider.fieldConverter.escape[typeName];
        context.data += converter ? converter(value) : value;
    },

    VisitEntityExpression: function VisitEntityExpression(expression, context) {
        this.Visit(expression.source, context);

        if (this.lambdaPrefix && expression.selector.lambda) {
            context.lambda = expression.selector.lambda;
            context.data += expression.selector.lambda + '/';
        }

        //if (expression.selector instanceof $data.Expressions.EntityExpression) {
        //    this.Visit(expression.selector, context);
        //}
    },

    VisitEntitySetExpression: function VisitEntitySetExpression(expression, context) {
        this.Visit(expression.source, context);
        if (expression.selector instanceof _core2.default.Expressions.AssociationInfoExpression) {
            this.Visit(expression.selector, context);
            context.data += "/";
        }
    },

    VisitFrameOperationExpression: function VisitFrameOperationExpression(expression, context) {
        this.Visit(expression.source, context);

        _core.Guard.requireType("expression.operation", expression.operation, _core2.default.Expressions.MemberInfoExpression);

        //TODO refactor!
        var opDef = expression.operation.memberDefinition;
        var opName = opDef.mapTo || opDef.name;
        context.data += opName;
        context.data += "(";
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
            if (arg && arg.value instanceof _core2.default.Queryable) {
                var frameExpression = new opDef.frameType(arg.value.expression);
                var preparator = _core.Container.createQueryExpressionCreator(arg.value.entityContext);
                var prep_expression = preparator.Visit(frameExpression);

                var compiler = new _core2.default.storageProviders.oData.oDataWhereCompiler(this.provider, true);
                var frameContext = { data: "" };
                var compiled = compiler.compile(prep_expression, frameContext);

                context.data += frameContext.lambda + ': ' + frameContext.data;
            };
        }
        context.data += ")";
    }
});

},{"jaydata/core":"jaydata/core"}]},{},[4])(4)
});

