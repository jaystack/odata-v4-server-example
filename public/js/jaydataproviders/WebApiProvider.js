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

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; };

var _core = _dereq_('jaydata/core');

var _core2 = _interopRequireDefault(_core);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

_core2.default.WebApiConverter = {
    fromDb: {
        '$data.Byte': _core2.default.Container.proxyConverter,
        '$data.SByte': _core2.default.Container.proxyConverter,
        '$data.Decimal': _core2.default.Container.proxyConverter,
        '$data.Float': _core2.default.Container.proxyConverter,
        '$data.Int16': _core2.default.Container.proxyConverter,
        '$data.Int64': _core2.default.Container.proxyConverter,

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
        '$data.Time': _core2.default.Container.proxyConverter,
        '$data.String': _core2.default.Container.proxyConverter,
        '$data.Boolean': _core2.default.Container.proxyConverter,
        '$data.Blob': function $dataBlob(v) {
            if (typeof v == 'string') {
                try {
                    return _core2.default.Container.convertTo(atob(v), '$data.Blob');
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
        '$data.GeographyPoint': function $dataGeographyPoint(geo) {
            if (geo && (typeof geo === 'undefined' ? 'undefined' : _typeof(geo)) === 'object' && Array.isArray(geo.coordinates)) {
                return new _core2.default.GeographyPoint(geo.coordinates);
            }
            return geo;
        },
        '$data.Guid': function $dataGuid(guid) {
            return guid ? guid.toString() : guid;
        }
    },
    toDb: {
        '$data.Entity': _core2.default.Container.proxyConverter,
        '$data.Byte': _core2.default.Container.proxyConverter,
        '$data.SByte': _core2.default.Container.proxyConverter,
        '$data.Decimal': _core2.default.Container.proxyConverter,
        '$data.Float': _core2.default.Container.proxyConverter,
        '$data.Int16': _core2.default.Container.proxyConverter,
        '$data.Int64': _core2.default.Container.proxyConverter,
        '$data.ObjectID': _core2.default.Container.proxyConverter,
        '$data.Integer': _core2.default.Container.proxyConverter,
        '$data.Int32': _core2.default.Container.proxyConverter,
        '$data.Number': _core2.default.Container.proxyConverter,
        '$data.Date': function $dataDate(e) {
            return e ? e.toISOString().replace('Z', '') : e;
        },
        '$data.Time': _core2.default.Container.proxyConverter,
        '$data.DateTimeOffset': function $dataDateTimeOffset(v) {
            return v ? v.toISOString() : v;
        },
        '$data.String': _core2.default.Container.proxyConverter,
        '$data.Boolean': _core2.default.Container.proxyConverter,
        '$data.Blob': function $dataBlob(v) {
            return v ? _core2.default.Blob.toBase64(v) : v;
        },
        '$data.Object': _core2.default.Container.proxyConverter,
        '$data.Array': _core2.default.Container.proxyConverter,
        '$data.GeographyPoint': _core2.default.Container.proxyConverter,
        '$data.Guid': _core2.default.Container.proxyConverter
    },
    escape: {
        '$data.Entity': function $dataEntity(e) {
            return JSON.stringify(e);
        },
        '$data.Integer': _core2.default.Container.proxyConverter,
        '$data.Int32': _core2.default.Container.proxyConverter,
        '$data.Number': _core2.default.Container.proxyConverter, // double: 13.5D
        '$data.Int16': _core2.default.Container.proxyConverter,
        '$data.Byte': _core2.default.Container.proxyConverter,
        '$data.SByte': _core2.default.Container.proxyConverter,
        '$data.Decimal': function $dataDecimal(v) {
            return v ? v + 'm' : v;
        },
        '$data.Float': function $dataFloat(v) {
            return v ? v + 'f' : v;
        },
        '$data.Int64': function $dataInt64(v) {
            return v ? v + 'L' : v;
        },
        '$data.Time': function $dataTime(v) {
            return v ? "time'" + v + "'" : v;
        },
        '$data.DateTimeOffset': function $dataDateTimeOffset(date) {
            return date ? "datetimeoffset'" + date + "'" : date;
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
            return b ? "X'" + _core2.default.Blob.toHexString(_core2.default.Container.convertTo(atob(b), _core2.default.Blob)) + "'" : b;
        },
        '$data.Object': function $dataObject(o) {
            return JSON.stringify(o);
        },
        '$data.Array': function $dataArray(o) {
            return JSON.stringify(o);
        },
        '$data.GeographyPoint': function $dataGeographyPoint(g) {
            if (g) {
                return _core2.default.GeographyBase.stringifyToUrl(g);
            }return g;
        },
        '$data.Guid': function $dataGuid(guid) {
            return guid ? "guid'" + guid.toString() + "'" : guid;
        }
    }
};

},{"jaydata/core":"jaydata/core"}],2:[function(_dereq_,module,exports){
'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; };

var _core = _dereq_('jaydata/core');

var _core2 = _interopRequireDefault(_core);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

(0, _core.$C)('$data.Expressions.ExpressionWalker', _core2.default.Expressions.EntityExpressionVisitor, null, {
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
            result = _core2.default.Expressions.EntityExpressionVisitor.prototype.Visit.apply(this, args);

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
_core2.default.Expressions.ExpressionNode.prototype.walk = function (monitorDefinition, context) {
    var m = _core.Container.createExpressionWalker(monitorDefinition);
    return m.Visit(this, context);
};

_core2.default.Expressions.ExpressionNode.prototype.dig = function (predicate) {
    var result = [];
    this.walk({
        MonitorExpressionNode: function MonitorExpressionNode(exp) {
            var value;
            if (value = predicate(exp)) {
                result.push(value);
            }
        }
    });
    return result;
};

(0, _core.$C)('$data.storageProviders.webApi.webApiProvider', _core2.default.StorageProviderBase, null, {
    constructor: function constructor(cfg, ctx) {
        this.context = ctx;
        this.providerConfiguration = _core2.default.typeSystem.extend({
            dbCreation: _core2.default.storageProviders.DbCreationType.DropTableIfChanged,
            apiUrl: "/odata.svc",
            serviceUrl: "",
            maxDataServiceVersion: '2.0',
            user: null,
            password: null,
            withCredentials: false,
            enableJSONP: false
            //disableBatch: undefined
        }, cfg);
        if (this.context && this.context._buildDbType_generateConvertToFunction && this.buildDbType_generateConvertToFunction) {
            this.context._buildDbType_generateConvertToFunction = this.buildDbType_generateConvertToFunction;
        }
        if (this.context && this.context._buildDbType_modifyInstanceDefinition && this.buildDbType_modifyInstanceDefinition) {
            this.context._buildDbType_modifyInstanceDefinition = this.buildDbType_modifyInstanceDefinition;
        }
    },
    initializeStore: function initializeStore(callBack) {
        callBack = _core2.default.PromiseHandlerBase.createCallbackSettings(callBack);
        callBack.success(this.context);
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
                        if (refValue !== null && refValue !== undefined) {
                            if (refValue instanceof _core2.default.Array) {
                                dbInstance.initData[association.FromPropertyName] = dbInstance[association.FromPropertyName] || [];
                                refValue.forEach(function (rv) {
                                    var contentId = convertedItems.indexOf(rv);
                                    if (contentId < 0) {
                                        _core.Guard.raise("Dependency graph error");
                                    }
                                    dbInstance.initData[association.FromPropertyName].push({ __metadata: { uri: "$" + (contentId + 1) } });
                                }, this);
                            } else {
                                if (refValue.entityState === _core2.default.EntityState.Modified) {
                                    var sMod = context._storageModel.getStorageModel(refValue.getType());
                                    var tblName = sMod.TableName;
                                    var pk = '(' + context.storageProvider.getEntityKeysValue({ data: refValue, entitySet: context.getEntitySetFromElementType(refValue.getType()) }) + ')';
                                    dbInstance.initData[association.FromPropertyName] = { __metadata: { uri: tblName + pk } };
                                } else {
                                    var contentId = convertedItems.indexOf(refValue);
                                    if (contentId < 0) {
                                        _core.Guard.raise("Dependency graph error");
                                    }
                                    dbInstance.initData[association.FromPropertyName] = { __metadata: { uri: "$" + (contentId + 1) } };
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

        var result;
        try {
            result = this._compile(query);
        } catch (e) {
            callBack.error(e);
            return;
        }
        var schema = this.context;
        //console.dir(expressionTree);
        //console.log(query.expression.walk);
        function checkForRead(query) {

            var ex = _core2.default.Expressions;
            var bincount = 0;
            var eqbins = query.expression.dig(function (exp) {
                if (exp instanceof ex.SimpleBinaryExpression) {
                    bincount++;
                }
                if (exp.nodeType == "equal") {
                    var constExp = null;
                    var fieldExp = null;
                    if (exp.left instanceof ex.ConstantExpression) constExp = exp.left;
                    if (exp.left instanceof ex.EntityFieldExpression) fieldExp = exp.left;
                    if (exp.right instanceof ex.ConstantExpression) constExp = exp.right;
                    if (exp.right instanceof ex.EntityFieldExpression) fieldExp = exp.right;
                    if (fieldExp && constExp) {

                        if (fieldExp.source.entityType === query.defaultType && fieldExp.selector.memberName == query.defaultType.memberDefinitions.getKeyProperties()[0].name) {
                            return constExp.value;
                        }
                    }
                }
            });
            if (bincount == 1 && eqbins.length == 1) {
                result.queryText = "/" + query.context.getEntitySetFromElementType(query.defaultType).tableName + "/" + eqbins[0].toString();
            };
            //query.w
        }
        checkForRead(query);

        var request = {
            url: this.providerConfiguration.apiUrl + result.queryText,
            type: result.method,
            success: function success(data) {
                if (callBack.success) {
                    query.rawDataList = typeof data === 'string' ? [{ cnt: data }] : data;
                    callBack.success(query);
                }
            },
            error: function error() {
                console.dir(arguments);
                callBack.error(arguments);
                //callBack.error(errorThrow || new Exception('Request failed', 'RequestError', arguments));
            }
        };

        this.appendBasicAuth(request, this.providerConfiguration.user, this.providerConfiguration.password, this.providerConfiguration.withCredentials);

        this.context.prepareRequest.call(this, request);
        _core2.default.ajax(request);
    },
    _compile: function _compile(queryable, params) {
        var compiler = new _core2.default.storageProviders.webApi.webApiCompiler();
        var compiled = compiler.compile(queryable);
        return compiled;
    },
    saveChanges: function saveChanges(callBack, changedItems) {
        if (changedItems.length > 0) {
            var independentBlocks = this.buildIndependentBlocks(changedItems);
            this.saveInternal(independentBlocks, 0, callBack);
        } else {
            callBack.success(0);
        }
    },
    saveInternal: function saveInternal(independentBlocks, index2, callBack) {
        if ((this.providerConfiguration.disableBatch === true || _typeof(_core2.default.defaults) === 'object' && _core2.default.defaults.disableBatch === true) && typeof this._saveRestMany === 'function') {
            this._saveRestMany(independentBlocks, index2, callBack);
        } else {
            if (independentBlocks.length > 1 || independentBlocks.length == 1 && independentBlocks[0].length > 1) {
                this._saveBatch(independentBlocks, index2, callBack);
            } else {
                this._saveRest(independentBlocks, index2, callBack);
            }
        }
    },
    _saveRest: function _saveRest(independentBlocks, index2, callBack) {
        var batchRequests = [];
        var convertedItem = [];
        var request;
        for (var index = 0; index < independentBlocks.length; index++) {
            for (var i = 0; i < independentBlocks[index].length; i++) {
                convertedItem.push(independentBlocks[index][i].data);
                request = {
                    url: this.providerConfiguration.apiUrl + '/',
                    headers: {},
                    contentType: "application/json",
                    dataType: "json"
                };

                //request.headers = { "Content-Id": convertedItem.length };
                switch (independentBlocks[index][i].data.entityState) {
                    case _core2.default.EntityState.Unchanged:
                        continue;break;
                    case _core2.default.EntityState.Added:
                        request.type = "POST";
                        request.url += independentBlocks[index][i].entitySet.tableName;
                        request.data = this.save_getInitData(independentBlocks[index][i], convertedItem);
                        break;
                    case _core2.default.EntityState.Modified:
                        request.type = "PUT";
                        request.url += independentBlocks[index][i].entitySet.tableName;
                        request.url += "/" + this.getEntityKeysValue(independentBlocks[index][i]);
                        this.save_addConcurrencyHeader(independentBlocks[index][i], request.headers);
                        request.data = this.save_getInitData(independentBlocks[index][i], convertedItem);
                        break;
                    case _core2.default.EntityState.Deleted:
                        request.type = "DELETE";
                        request.url += independentBlocks[index][i].entitySet.tableName;
                        request.url += "/" + this.getEntityKeysValue(independentBlocks[index][i]);
                        this.save_addConcurrencyHeader(independentBlocks[index][i], request.headers);
                        break;
                    default:
                        _core.Guard.raise(new _core.Exception("Not supported Entity state"));
                }
                if (request.data) {
                    request.data = JSON.stringify(request.data);
                }
                //batchRequests.push(request);
            }
        }
        var that = this;

        request.success = function (data, status, xhr) {
            var arg = arguments;
            var s = xhr.status;
            if (s >= 200 && s < 300) {

                if (data) {
                    var item = convertedItem[0];
                    item.getType().memberDefinitions.getPublicMappedProperties().forEach(function (memDef) {
                        var propType = _core.Container.resolveType(memDef.type);
                        if (memDef.computed || memDef.key || !propType.isAssignableTo && !memDef.inverseProperty) {
                            //if (memDef.concurrencyMode === $data.ConcurrencyMode.Fixed) {
                            //    item[memDef.name] = response.headers.ETag || response.headers.Etag;
                            //} else {
                            var converter = that.fieldConverter.fromDb[_core.Container.resolveName(memDef.type)];
                            item[memDef.name] = converter ? converter(data[memDef.name]) : data[memDef.name];
                            //}
                        }
                    }, this);
                }
                //if (s == 204) {
                //    //TODO versioning/ETag
                //    if (response.headers.ETag || response.headers.Etag) {
                //        var property = item.getType().memberDefinitions.getPublicMappedProperties().filter(function (memDef) { return memDef.concurrencyMode === $data.ConcurrencyMode.Fixed });
                //        if (property && property[0]) {
                //            item[property[0].name] = response.headers.ETag || response.headers.Etag;
                //        }
                //    }

                //} else {
                //    //its optional to send back content from webapi
                //    if (data) {
                //        //item.getType().memberDefinitions.getPublicMappedProperties().forEach(function (memDef) {
                //        //    if (memDef.computed || memDef.key) {
                //        //        if (memDef.concurrencyMode === $data.ConcurrencyMode.Fixed) {
                //        //            item[memDef.name] = response.headers.ETag || response.headers.Etag;
                //        //        } else {
                //        //            var converter = that.fieldConverter.fromDb[Container.resolveType(memDef.type)];
                //        //            item[memDef.name] = converter ? converter(data[memDef.name]) : data[memDef.name];
                //        //        }
                //        //    }
                //        //}, this);
                //        //item.getType().memberDefinitions.getPublicMappedProperties().forEach(function (memDef) {
                //        //    var propType = Container.resolveType(memDef.type);
                //        //    if (memDef.computed || memDef.key || (!propType.isAssignableTo && !memDef.inverseProperty)) {
                //        //        if (memDef.concurrencyMode === $data.ConcurrencyMode.Fixed) {
                //        //            item[memDef.name] = response.headers.ETag || response.headers.Etag;
                //        //        } else {
                //        //            var converter = that.fieldConverter.fromDb[Container.resolveName(memDef.type)];
                //        //            item[memDef.name] = converter ? converter(data[memDef.name]) : data[memDef.name];
                //        //        }
                //        //    }
                //        //}, this);
                //    }
                //}

                if (callBack.success) {
                    callBack.success(convertedItem.length);
                }
            } else {
                callBack.error(response);
            }
        };
        request.error = function (e) {
            callBack.error(new _core.Exception((e.response || {}).body, e.message, e));
        };

        this.appendBasicAuth(request, this.providerConfiguration.user, this.providerConfiguration.password, this.providerConfiguration.withCredentials);
        //if (this.providerConfiguration.user) {
        //    requestData[0].user = this.providerConfiguration.user;
        //    requestData[0].password = this.providerConfiguration.password || "";
        //}

        this.context.prepareRequest.call(this, request);
        _core2.default.ajax(request);
        //OData.request.apply(this, requestData);
    },
    _saveBatch: function _saveBatch(independentBlocks, index2, callBack) {
        var batchRequests = [];
        var convertedItem = [];
        for (var index = 0; index < independentBlocks.length; index++) {
            for (var i = 0; i < independentBlocks[index].length; i++) {
                convertedItem.push(independentBlocks[index][i].data);
                var request = {};
                request.headers = { "Content-Id": convertedItem.length };
                switch (independentBlocks[index][i].data.entityState) {
                    case _core2.default.EntityState.Unchanged:
                        continue;break;
                    case _core2.default.EntityState.Added:
                        request.method = "POST";
                        request.requestUri = independentBlocks[index][i].entitySet.tableName;
                        request.data = this.save_getInitData(independentBlocks[index][i], convertedItem);
                        break;
                    case _core2.default.EntityState.Modified:
                        request.method = "MERGE";
                        request.requestUri = independentBlocks[index][i].entitySet.tableName;
                        request.requestUri += "(" + this.getEntityKeysValue(independentBlocks[index][i]) + ")";
                        this.save_addConcurrencyHeader(independentBlocks[index][i], request.headers);
                        request.data = this.save_getInitData(independentBlocks[index][i], convertedItem);
                        break;
                    case _core2.default.EntityState.Deleted:
                        request.method = "DELETE";
                        request.requestUri = independentBlocks[index][i].entitySet.tableName;
                        request.requestUri += "(" + this.getEntityKeysValue(independentBlocks[index][i]) + ")";
                        this.save_addConcurrencyHeader(independentBlocks[index][i], request.headers);
                        break;
                    default:
                        _core.Guard.raise(new _core.Exception("Not supported Entity state"));
                }
                batchRequests.push(request);
            }
        }
        var that = this;

        var requestData = [{
            requestUri: this.providerConfiguration.apiUrl + "/$batch",
            method: "POST",
            data: {
                __batchRequests: [{ __changeRequests: batchRequests }]
            }
        }, function (data, response) {
            if (response.statusCode == 202) {
                var result = data.__batchResponses[0].__changeResponses;
                var errors = [];

                for (var i = 0; i < result.length; i++) {
                    if (result[i].statusCode > 200 && result[i].statusCode < 300) {
                        var item = convertedItem[i];
                        if (result[i].statusCode == 204) {
                            if (result[i].headers.ETag || result[i].headers.Etag || result[i].headers.etag) {
                                var property = item.getType().memberDefinitions.getPublicMappedProperties().filter(function (memDef) {
                                    return memDef.concurrencyMode === _core2.default.ConcurrencyMode.Fixed;
                                });
                                if (property && property[0]) {
                                    item[property[0].name] = result[i].headers.ETag || result[i].headers.Etag || result[i].headers.etag;
                                }
                            }
                            continue;
                        }

                        item.getType().memberDefinitions.getPublicMappedProperties().forEach(function (memDef) {
                            //TODO: is this correct?
                            if (memDef.computed || memDef.key) {
                                if (memDef.concurrencyMode === _core2.default.ConcurrencyMode.Fixed) {
                                    item[memDef.name] = result[i].headers.ETag || result[i].headers.Etag || result[i].headers.etag;
                                } else {
                                    var converter = that.fieldConverter.fromDb[_core.Container.resolveType(memDef.type)];
                                    item[memDef.name] = converter ? converter(result[i].data[memDef.name]) : result[i].data[memDef.name];
                                }
                            }
                        }, this);
                    } else {
                        errors.push(new _core.Exception((result[i].response || {}).body, result[i].message, result[i]));
                    }
                }
                if (errors.length > 0) {
                    callBack.error(new _core.Exception('See inner exceptions', 'Batch failed', errors));
                } else if (callBack.success) {
                    callBack.success(convertedItem.length);
                }
            } else {
                callBack.error(response);
            }
        }, function (e) {
            callBack.error(new _core.Exception((e.response || {}).body, e.message, e));
        }, OData.batchHandler];

        this.appendBasicAuth(requestData[0], this.providerConfiguration.user, this.providerConfiguration.password, this.providerConfiguration.withCredentials);
        //if (this.providerConfiguration.user) {
        //    requestData[0].user = this.providerConfiguration.user;
        //    requestData[0].password = this.providerConfiguration.password || "";
        //}

        this.context.prepareRequest.call(this, requestData);
        OData.request.apply(this, requestData);
    },
    save_getInitData: function save_getInitData(item, convertedItems) {
        item.physicalData = this.context._storageModel.getStorageModel(item.data.getType()).PhysicalType.convertTo(item.data, convertedItems);
        var serializableObject = {};
        item.physicalData.getType().memberDefinitions.asArray().forEach(function (memdef) {
            if (memdef.kind == _core2.default.MemberTypes.navProperty || memdef.kind == _core2.default.MemberTypes.complexProperty || memdef.kind == _core2.default.MemberTypes.property && !memdef.notMapped) {
                //if (typeof memdef.concurrencyMode === 'undefined' &&
                //    (memdef.key === true || item.data.entityState === $data.EntityState.Added ||
                //    item.data.changedProperties.some(function (def) { return def.name === memdef.name; }))
                //)
                serializableObject[memdef.name] = item.physicalData[memdef.name];
            }
        }, this);
        return serializableObject;
    },
    save_addConcurrencyHeader: function save_addConcurrencyHeader(item, headers) {
        var property = item.data.getType().memberDefinitions.getPublicMappedProperties().filter(function (memDef) {
            return memDef.concurrencyMode === _core2.default.ConcurrencyMode.Fixed;
        });
        if (property && property[0]) {
            headers['If-Match'] = item.data[property[0].name];
            //item.data[property[0].name] = "";
        }
    },
    getTraceString: function getTraceString(queryable) {
        var sqlText = this._compile(queryable);
        return queryable;
    },
    supportedDataTypes: { value: [_core2.default.Integer, _core2.default.String, _core2.default.Number, _core2.default.Blob, _core2.default.Boolean, _core2.default.Date, _core2.default.Object, _core2.default.GeographyPoint, _core2.default.Guid, _core2.default.Byte, _core2.default.SByte, _core2.default.Decimal, _core2.default.Float, _core2.default.Int16, _core2.default.Int32, _core2.default.Int64, _core2.default.Time, _core2.default.DateTimeOffset], writable: false },

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

            length: {
                dataType: "number", allowedIn: [_core2.default.Expressions.FilterExpression, _core2.default.Expressions.ProjectionExpression],
                parameters: [{ name: "@expression", dataType: "string" }]
            },
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
            }
        },
        enumerable: true,
        writable: true
    },
    supportedSetOperations: {
        value: {
            filter: {},
            map: {},
            length: {},
            forEach: {},
            toArray: {},
            single: {},
            some: {
                invokable: false,
                allowedIn: [_core2.default.Expressions.FilterExpression],
                parameters: [{ name: "filter", dataType: "$data.Queryable" }],
                mapTo: 'any',
                frameType: _core2.default.Expressions.SomeExpression
            },
            every: {
                invokable: false,
                allowedIn: [_core2.default.Expressions.FilterExpression],
                parameters: [{ name: "filter", dataType: "$data.Queryable" }],
                mapTo: 'all',
                frameType: _core2.default.Expressions.EveryExpression
            },
            take: {},
            skip: {},
            orderBy: {},
            orderByDescending: {},
            first: {},
            include: {},
            batchDelete: {}
        },
        enumerable: true,
        writable: true
    },
    fieldConverter: { value: _core2.default.WebApiConverter },
    getEntityKeysValue: function getEntityKeysValue(entity) {
        var result = [];
        var keyValue = undefined;

        var memDefs = entity.entitySet.createNew.memberDefinitions.asArray();
        for (var i = 0, l = memDefs.length; i < l; i++) {
            var field = memDefs[i];
            if (field.key) {
                keyValue = entity.data[field.name];
                switch (_core.Container.getName(field.originalType)) {
                    case "$data.Guid":
                    case "Edm.Guid":
                        keyValue = "guid'" + (keyValue ? keyValue.value : keyValue) + "'";
                        break;
                    case "$data.Blob":
                    case "Edm.Binary":
                        keyValue = "binary'" + keyValue + "'";
                        break;
                    case "Edm.Byte":
                        var hexDigits = '0123456789ABCDEF';
                        keyValue = hexDigits[i >> 4 & 15] + hexDigits[i & 15];
                        break;
                    case "$data.Date":
                    case "Edm.DateTime":
                        keyValue = "datetime'" + keyValue.toISOString() + "'";
                        break;
                    case "Edm.Decimal":
                        keyValue = keyValue + "M";
                        break;
                    case "Edm.Single":
                        keyValue = keyValue + "f";
                        break;
                    case "Edm.Int64":
                        keyValue = keyValue + "L";
                        break;
                    case 'Edm.String':
                    case "$data.String":
                        keyValue = "'" + keyValue + "'";
                        break;
                }
                result.push(field.name + "=" + keyValue);
            }
        }
        if (result.length > 1) {
            return result.join(",");
        }
        return keyValue;
    },
    appendBasicAuth: function appendBasicAuth(request, user, password, withCredentials) {
        request.headers = request.headers || {};
        if (!request.headers.Authorization && user && password) {
            request.headers.Authorization = "Basic " + this.__encodeBase64(user + ":" + password);
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
    }
}, null);

_core2.default.StorageProviderBase.registerProvider("webApi", _core2.default.storageProviders.webApi.webApiProvider);

(0, _core.$C)('$data.storageProviders.webApi.webApiCompiler', _core2.default.Expressions.EntityExpressionVisitor, null, {
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
        this.mainEntitySet = query.context.getEntitySetFromElementType(query.defaultType);

        var queryFragments = { urlText: "" };

        this.Visit(query.expression, queryFragments);

        query.modelBinderConfig = {};
        var modelBinder = _core.Container.createModelBinderConfigCompiler(query, this.includes, true);
        modelBinder.Visit(query.expression);

        var queryText = queryFragments.urlText;
        var addAmp = false;
        for (var name in queryFragments) {
            if (name != "urlText" && name != "actionPack" && name != "data" && name != "lambda" && name != "method" && queryFragments[name] != "") {
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

        return {
            queryText: queryText,
            method: queryFragments.method || 'GET',
            params: []
        };
    },
    VisitOrderExpression: function VisitOrderExpression(expression, context) {
        this.Visit(expression.source, context);

        var orderCompiler = _core.Container.createwebApiOrderCompiler(this.provider);
        orderCompiler.compile(expression, context);
    },
    VisitPagingExpression: function VisitPagingExpression(expression, context) {
        this.Visit(expression.source, context);

        var pagingCompiler = _core.Container.createwebApiPagingCompiler();
        pagingCompiler.compile(expression, context);
    },
    VisitIncludeExpression: function VisitIncludeExpression(expression, context) {
        this.Visit(expression.source, context);
        if (!context['$select']) {
            if (context['$expand']) {
                context['$expand'] += ',';
            } else {
                context['$expand'] = '';
            }
            context['$expand'] += expression.selector.value.replace(/\./g, '/');

            this.includes = this.includes || [];
            var includeFragment = expression.selector.value.split('.');
            var tempData = null;
            var storageModel = this.mainEntitySet.entityContext._storageModel.getStorageModel(this.mainEntitySet.createNew);
            for (var i = 0; i < includeFragment.length; i++) {
                if (tempData) {
                    tempData += '.' + includeFragment[i];
                } else {
                    tempData = includeFragment[i];
                }
                var association = storageModel.Associations[includeFragment[i]];
                if (association) {
                    if (!this.includes.some(function (include) {
                        return include.name == tempData;
                    }, this)) {
                        this.includes.push({ name: tempData, type: association.ToType });
                    }
                } else {
                    _core.Guard.raise(new _core.Exception("The given include path is invalid: " + expression.selector.value + ", invalid point: " + tempData));
                }
                storageModel = this.mainEntitySet.entityContext._storageModel.getStorageModel(association.ToType);
            }
        }
    },
    VisitProjectionExpression: function VisitProjectionExpression(expression, context) {
        this.Visit(expression.source, context);

        var projectionCompiler = _core.Container.createwebApiProjectionCompiler(this.context);
        projectionCompiler.compile(expression, context);
    },
    VisitFilterExpression: function VisitFilterExpression(expression, context) {
        ///<param name="expression" type="$data.Expressions.FilterExpression" />

        this.Visit(expression.source, context);

        var filterCompiler = _core.Container.createwebApiWhereCompiler(this.provider);
        context.data = "";
        filterCompiler.compile(expression.selector, context);
        context["$filter"] = context.data;
        context.data = "";
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
        context.urlText += "/" + expression.cfg.serviceName;
        //this.logicalType = expression.returnType;
        if (expression.params) {
            for (var i = 0; i < expression.params.length; i++) {
                this.Visit(expression.params[i], context);
            }
        }
    },
    VisitBatchDeleteExpression: function VisitBatchDeleteExpression(expression, context) {
        this.Visit(expression.source, context);
        context.urlText += '/$batchDelete';
        context.method = 'DELETE';
    },

    VisitConstantExpression: function VisitConstantExpression(expression, context) {
        if (context['$urlParams']) {
            context['$urlParams'] += '&';
        } else {
            context['$urlParams'] = '';
        }

        var typeName = _core.Container.resolveName(expression.type);
        if (expression.value instanceof _core2.default.Entity) typeName = _core2.default.Entity.fullName;

        var converter = this.provider.fieldConverter.toDb[typeName];
        var value = converter ? converter(expression.value) : expression.value;

        converter = this.provider.fieldConverter.escape[typeName];
        value = converter ? converter(value) : value;

        /*var value;
        if (expression.value instanceof $data.Entity) {
            value = this.provider.fieldConverter.toDb['$data.Entity'](expression.value);
        } else {
            //var valueType = Container.getTypeName(expression.value);
            value = this.provider.fieldConverter.toDb[Container.resolveName(Container.resolveType(expression.type))](expression.value);
        }*/
        context['$urlParams'] += expression.name + '=' + value;
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
    }
}, {});

(0, _core.$C)('$data.storageProviders.webApi.webApiWhereCompiler', _core2.default.Expressions.EntityExpressionVisitor, null, {
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
        //context.data += this.provider.fieldConverter.toDb[expression.type](expression.value);

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

    VisitConstantExpression: function VisitConstantExpression(expression, context) {
        //var valueType = Container.getTypeName(expression.value);
        //context.data += this.provider.fieldConverter.toDb[Container.resolveName(Container.resolveType(expression.type))](expression.value);

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

                var compiler = new _core2.default.storageProviders.webApi.webApiWhereCompiler(this.provider, true);
                var frameContext = { data: "" };
                var compiled = compiler.compile(prep_expression, frameContext);

                context.data += frameContext.lambda + ': ' + frameContext.data;
            };
        }
        context.data += ")";
    }
});

(0, _core.$C)('$data.storageProviders.webApi.webApiOrderCompiler', _core2.default.storageProviders.webApi.webApiWhereCompiler, null, {
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
    }
});
(0, _core.$C)('$data.storageProviders.webApi.webApiPagingCompiler', _core2.default.Expressions.EntityExpressionVisitor, null, {
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
        context.data += expression.value;
    }
});
(0, _core.$C)('$data.storageProviders.webApi.webApiProjectionCompiler', _core2.default.Expressions.EntityExpressionVisitor, null, {
    constructor: function constructor(entityContext) {
        this.entityContext = entityContext;
        this.hasObjectLiteral = false;
        this.ObjectLiteralPath = "";
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
        if (expression.expression instanceof _core2.default.Expressions.EntityExpression || expression.expression instanceof _core2.default.Expressions.EntitySetExpression) {
            if (context['$expand']) {
                context['$expand'] += ',';
            } else {
                context['$expand'] = '';
            }
            context['$expand'] += this.mapping.replace(/\./g, '/');
        }if (expression.expression instanceof _core2.default.Expressions.ComplexTypeExpression) {
            var m = this.mapping.split('.');
            m.pop();
            if (m.length > 0) {
                if (context['$expand']) {
                    context['$expand'] += ',';
                } else {
                    context['$expand'] = '';
                }
                context['$expand'] += m.join('/');
            }
        } else {
            var m = this.mapping.split('.');
            m.pop();
            if (m.length > 0) {
                if (context['$expand']) {
                    context['$expand'] += ',';
                } else {
                    context['$expand'] = '';
                }
                context['$expand'] += m.join('/');
            }
        }
    },
    VisitObjectLiteralExpression: function VisitObjectLiteralExpression(expression, context) {
        ///<summary></summary>
        ///<param name="expression" type="$data.Expressions.ObjectLiteralExpression" mayBeNull="false"></param>
        ///<param name="context" mayBeNull="false"></param>
        var tempObjectLiteralPath = this.ObjectLiteralPath;
        this.hasObjectLiteral = true;
        expression.members.forEach(function (member, index) {
            this.Visit(member, context);
            if (index < expression.members.length - 1) {
                context.data += ',';
            }
            this.mapping = '';
        }, this);
        this.ObjectLiteralPath = tempObjectLiteralPath;
    },
    VisitObjectFieldExpression: function VisitObjectFieldExpression(expression, context) {

        if (this.ObjectLiteralPath) {
            this.ObjectLiteralPath += '.' + expression.fieldName;
        } else {
            this.ObjectLiteralPath = expression.fieldName;
        }
        this.Visit(expression.expression, context);

        if (expression.expression instanceof _core2.default.Expressions.EntityExpression || expression.expression instanceof _core2.default.Expressions.EntitySetExpression) {
            if (context['$expand']) {
                context['$expand'] += ',';
            } else {
                context['$expand'] = '';
            }
            context['$expand'] += this.mapping.replace(/\./g, '/');
        } else {
            var m = this.mapping.split('.');
            m.pop();
            if (m.length > 0) {
                if (context['$expand']) {
                    context['$expand'] += ',';
                } else {
                    context['$expand'] = '';
                }
                context['$expand'] += m.join('/');
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
        if (context.data && context.data.length > 0 && context.data[context.data.length - 1] != ',') {
            context.data += '/';
        }
        context.data += expression.associationInfo.FromPropertyName;
        if (this.mapping && this.mapping.length > 0) {
            this.mapping += '.';
        }
        this.mapping += expression.associationInfo.FromPropertyName;
    },
    VisitMemberInfoExpression: function VisitMemberInfoExpression(expression, context) {
        if (context.data && context.data.length > 0 && context.data[context.data.length - 1] != ',') {
            context.data += '/';
        }
        context.data += expression.memberName;
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

},{"jaydata/core":"jaydata/core"}],3:[function(_dereq_,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _core = _dereq_('jaydata/core');

var _core2 = _interopRequireDefault(_core);

var _WebApiConverter = _dereq_('./WebApiConverter.js');

var _WebApiConverter2 = _interopRequireDefault(_WebApiConverter);

var _WebApiProvider = _dereq_('./WebApiProvider.js');

var _WebApiProvider2 = _interopRequireDefault(_WebApiProvider);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

exports.default = _core2.default;
module.exports = exports['default'];

},{"./WebApiConverter.js":1,"./WebApiProvider.js":2,"jaydata/core":"jaydata/core"}]},{},[3])(3)
});

