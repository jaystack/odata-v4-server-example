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

(0, _core.$C)('$data.storageProviders.InMemory.InMemoryCompiler', _core2.default.Expressions.EntityExpressionVisitor, null, {
    constructor: function constructor(provider) {
        this.provider = provider;
    },
    compile: function compile(query) {

        var queryFragments = { urlText: "" };

        this.Visit(query.expression, queryFragments);

        var compiled = {};
        for (var name in queryFragments) {
            if (name.indexOf('$') == 0) {
                compiled[name] = queryFragments[name];
            }
        }

        return compiled;
    },
    VisitOrderExpression: function VisitOrderExpression(expression, context) {
        this.Visit(expression.source, context);
        context.data = "";
        context.lambda = "";
        var funcCompiler = _core.Container.createInMemoryFunctionCompiler(this.provider);
        funcCompiler.compile(expression.selector, context);
        context['$order'] = context['$order'] || [];
        var sort = new Function(context.lambda, 'return ' + context.data + ';');
        sort.ASC = expression.nodeType == 'OrderBy';
        context['$order'].push(sort);
        context.data = "";
        context.lambda = "";
    },
    VisitIncludeExpression: function VisitIncludeExpression(expression, context) {
        this.Visit(expression.source, context);
        context.$include = context.$include || [];
        if (context.$include.indexOf(expression.selector.value) < 0) context.$include.push(expression.selector.value);
        /*if (!context['$select']) {
            if (context['$expand']) { context['$expand'] += ','; } else { context['$expand'] = ''; }
            context['$expand'] += expression.selector.value.replace('.', '/');
              this.includes = this.includes || [];
            var includeFragment = expression.selector.value.split('.');
            var tempData = null;
            var storageModel = this.mainEntitySet.entityContext._storageModel.getStorageModel(this.mainEntitySet.createNew);
            for (var i = 0; i < includeFragment.length; i++) {
                if (tempData) { tempData += '.' + includeFragment[i]; } else { tempData = includeFragment[i]; }
                var association = storageModel.Associations[includeFragment[i]];
                if (association) {
                    if (!this.includes.some(function (include) { return include.name == tempData }, this)) {
                        this.includes.push({ name: tempData, type: association.ToType });
                    }
                }
                else {
                    Guard.raise(new Exception("The given include path is invalid: " + expression.selector.value + ", invalid point: " + tempData));
                }
                storageModel = this.mainEntitySet.entityContext._storageModel.getStorageModel(association.ToType);
            }
        }*/
    },
    VisitPagingExpression: function VisitPagingExpression(expression, context) {
        this.Visit(expression.source, context);
        context['$' + expression.nodeType.toLowerCase()] = expression.amount.value;
    },
    VisitProjectionExpression: function VisitProjectionExpression(expression, context) {
        this.defaultFunctionCompiler(expression, context, '$map');
    },
    VisitFilterExpression: function VisitFilterExpression(expression, context) {
        this.defaultFunctionCompiler(expression, context, '$filter');
    },
    VisitSomeExpression: function VisitSomeExpression(expression, context) {
        this.defaultFunctionCompiler(expression, context, '$some');
    },
    VisitEveryExpression: function VisitEveryExpression(expression, context) {
        this.defaultFunctionCompiler(expression, context, '$every');
    },
    VisitCountExpression: function VisitCountExpression(expression, context) {
        this.Visit(expression.source, context);
        context['$length'] = true;
    },
    VisitServiceOperationExpression: function VisitServiceOperationExpression(expression, context) {
        context.$serviceOperation = { name: expression.cfg.serviceName, params: expression.params };
    },
    defaultFunctionCompiler: function defaultFunctionCompiler(expression, context, type) {
        this.Visit(expression.source, context);
        context.data = "";
        context.lambda = "";
        var funcCompiler = _core.Container.createInMemoryFunctionCompiler(this.provider);
        funcCompiler.compile(expression.selector, context);
        context[type] = new Function(context.lambda, 'return ' + context.data + ';');
        context.data = "";
        context.lambda = "";
    }

}, {});

},{"jaydata/core":"jaydata/core"}],2:[function(_dereq_,module,exports){
'use strict';

var _core = _dereq_('jaydata/core');

var _core2 = _interopRequireDefault(_core);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

_core2.default.InMemoryConverter = {
    fromDb: {
        '$data.Byte': _core2.default.Container.proxyConverter,
        '$data.SByte': _core2.default.Container.proxyConverter,
        '$data.Decimal': _core2.default.Container.proxyConverter,
        '$data.Float': _core2.default.Container.proxyConverter,
        '$data.Int16': _core2.default.Container.proxyConverter,
        '$data.Int64': _core2.default.Container.proxyConverter,
        '$data.Integer': _core2.default.Container.proxyConverter,
        '$data.Int32': _core2.default.Container.proxyConverter,
        '$data.Number': _core2.default.Container.proxyConverter,
        '$data.Date': _core2.default.Container.proxyConverter,
        '$data.DateTimeOffset': _core2.default.Container.proxyConverter,
        '$data.Time': _core2.default.Container.proxyConverter,
        '$data.String': _core2.default.Container.proxyConverter,
        '$data.Boolean': _core2.default.Container.proxyConverter,
        '$data.Blob': _core2.default.Container.proxyConverter,
        '$data.Object': function $dataObject(o) {
            if (o === undefined) {
                return new _core2.default.Object();
            }return o;
        },
        '$data.Array': function $dataArray(o) {
            if (o === undefined) {
                return new _core2.default.Array();
            }return o;
        },
        '$data.Guid': function $dataGuid(guid) {
            return guid ? _core2.default.parseGuid(guid).toString() : guid;
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
        }
    },
    toDb: {
        '$data.Byte': _core2.default.Container.proxyConverter,
        '$data.SByte': _core2.default.Container.proxyConverter,
        '$data.Decimal': _core2.default.Container.proxyConverter,
        '$data.Float': _core2.default.Container.proxyConverter,
        '$data.Int16': _core2.default.Container.proxyConverter,
        '$data.Int64': _core2.default.Container.proxyConverter,
        '$data.Integer': _core2.default.Container.proxyConverter,
        '$data.Int32': _core2.default.Container.proxyConverter,
        '$data.Number': _core2.default.Container.proxyConverter,
        '$data.Date': _core2.default.Container.proxyConverter,
        '$data.DateTimeOffset': _core2.default.Container.proxyConverter,
        '$data.Time': _core2.default.Container.proxyConverter,
        '$data.String': _core2.default.Container.proxyConverter,
        '$data.Boolean': _core2.default.Container.proxyConverter,
        '$data.Blob': _core2.default.Container.proxyConverter,
        '$data.Object': _core2.default.Container.proxyConverter,
        '$data.Array': _core2.default.Container.proxyConverter,
        '$data.Guid': function $dataGuid(guid) {
            return guid ? guid.toString() : guid;
        },
        '$data.GeographyPoint': function $dataGeographyPoint(g) {
            if (g) {
                return g;
            }return g;
        },
        '$data.GeographyLineString': function $dataGeographyLineString(g) {
            if (g) {
                return g;
            }return g;
        },
        '$data.GeographyPolygon': function $dataGeographyPolygon(g) {
            if (g) {
                return g;
            }return g;
        },
        '$data.GeographyMultiPoint': function $dataGeographyMultiPoint(g) {
            if (g) {
                return g;
            }return g;
        },
        '$data.GeographyMultiLineString': function $dataGeographyMultiLineString(g) {
            if (g) {
                return g;
            }return g;
        },
        '$data.GeographyMultiPolygon': function $dataGeographyMultiPolygon(g) {
            if (g) {
                return g;
            }return g;
        },
        '$data.GeographyCollection': function $dataGeographyCollection(g) {
            if (g) {
                return g;
            }return g;
        },
        '$data.GeometryPoint': function $dataGeometryPoint(g) {
            if (g) {
                return g;
            }return g;
        },
        '$data.GeometryLineString': function $dataGeometryLineString(g) {
            if (g) {
                return g;
            }return g;
        },
        '$data.GeometryPolygon': function $dataGeometryPolygon(g) {
            if (g) {
                return g;
            }return g;
        },
        '$data.GeometryMultiPoint': function $dataGeometryMultiPoint(g) {
            if (g) {
                return g;
            }return g;
        },
        '$data.GeometryMultiLineString': function $dataGeometryMultiLineString(g) {
            if (g) {
                return g;
            }return g;
        },
        '$data.GeometryMultiPolygon': function $dataGeometryMultiPolygon(g) {
            if (g) {
                return g;
            }return g;
        },
        '$data.GeometryCollection': function $dataGeometryCollection(g) {
            if (g) {
                return g;
            }return g;
        }
    },
    escape: {
        '$data.Byte': _core2.default.Container.proxyConverter,
        '$data.SByte': _core2.default.Container.proxyConverter,
        '$data.Decimal': _core2.default.Container.proxyConverter,
        '$data.Float': _core2.default.Container.proxyConverter,
        '$data.Int16': _core2.default.Container.proxyConverter,
        '$data.Int64': _core2.default.Container.proxyConverter,
        '$data.Integer': _core2.default.Container.proxyConverter,
        '$data.Int32': _core2.default.Container.proxyConverter,
        '$data.Number': _core2.default.Container.proxyConverter,
        '$data.Date': function $dataDate(date) {
            return date ? "new Date(Date.parse('" + date.toISOString() + "'))" : date;
        },
        '$data.DateTimeOffset': function $dataDateTimeOffset(date) {
            return date ? "new Date(Date.parse('" + date.toISOString() + "'))" : date;
        },
        '$data.Time': function $dataTime(date) {
            return date ? "'" + date + "'" : date;
        },
        '$data.String': function $dataString(text) {
            return "'" + text.replace(/'/g, "''") + "'";
        },
        '$data.Boolean': function $dataBoolean(bool) {
            return bool ? 'true' : 'false';
        },
        '$data.Blob': function $dataBlob(blob) {
            return "'" + _core2.default.Blob.toString(blob) + "'";
        },
        '$data.Object': function $dataObject(o) {
            return JSON.stringify(o);
        },
        '$data.Array': function $dataArray(o) {
            return JSON.stringify(o);
        },
        '$data.Guid': function $dataGuid(guid) {
            return guid ? "'" + guid.toString() + "'" : guid;
        }
    }
};

},{"jaydata/core":"jaydata/core"}],3:[function(_dereq_,module,exports){
'use strict';

var _core = _dereq_('jaydata/core');

var _core2 = _interopRequireDefault(_core);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

(0, _core.$C)('$data.storageProviders.InMemory.InMemoryFunctionCompiler', _core2.default.Expressions.EntityExpressionVisitor, null, {
    constructor: function constructor(provider) {
        this.provider = provider;
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
        var self = this;
        if (expression.resolution.reverse) {
            context.data += "(";

            if (expression.resolution.name === 'in' && Array.isArray(expression.right.value)) {
                context.data += "[";
                expression.right.value.forEach(function (item, i) {
                    if (i > 0) context.data += ",";
                    self.Visit(item, context);
                });
                context.data += "]";
            } else {
                var right = this.Visit(expression.right, context);
            }
            context.data += expression.resolution.mapTo;
            var left = this.Visit(expression.left, context);
            if (expression.resolution.rightValue) context.data += expression.resolution.rightValue;
            context.data += ")";
        } else {
            context.data += "(";
            var left = this.Visit(expression.left, context);
            context.data += expression.resolution.mapTo;
            var right = this.Visit(expression.right, context);
            context.data += ")";
        }
    },

    VisitConstantExpression: function VisitConstantExpression(expression, context) {
        var type = _core.Container.resolveType(expression.type);
        var typeName = _core.Container.resolveName(type);
        var converter = this.provider.fieldConverter.escape[typeName];
        context.data += converter ? converter(expression.value) : expression.value;
    },
    VisitMemberInfoExpression: function VisitMemberInfoExpression(expression, context) {
        context.data += ".";
        context.data += expression.memberName;
    },

    VisitComplexTypeExpression: function VisitComplexTypeExpression(expression, context) {
        this.Visit(expression.source, context);
        this.Visit(expression.selector, context);
    },

    VisitEntityExpression: function VisitEntityExpression(expression, context) {
        context.data += expression.selector.lambda;
        context.lambda = expression.selector.lambda;
        this.Visit(expression.source, context);
    },
    VisitEntitySetExpression: function VisitEntitySetExpression() {},
    VisitObjectLiteralExpression: function VisitObjectLiteralExpression(expression, context) {
        context.data += '{ ';

        for (var i = 0; i < expression.members.length; i++) {
            var member = expression.members[i];

            if (i > 0) context.data += ', ';

            this.Visit(member, context);
        }

        context.data += ' }';
    },
    VisitObjectFieldExpression: function VisitObjectFieldExpression(expression, context) {
        context.data += expression.fieldName + ': ';
        this.Visit(expression.expression, context);
    },
    VisitEntityFieldOperationExpression: function VisitEntityFieldOperationExpression(expression, context) {
        _core.Guard.requireType("expression.operation", expression.operation, _core2.default.Expressions.MemberInfoExpression);

        //TODO refactor!
        var opDef = expression.operation.memberDefinition;
        if (opDef.propertyFunction) {
            this.Visit(expression.source, context);
            context.data += '.';
        }

        var opName = opDef.mapTo || opDef.name;
        context.data += opName;
        var paramCounter = 0;
        var params = opDef.parameters || [];

        var args = params.map(function (item, index) {
            if (item.name === "@expression") {
                return expression.source;
            } else {
                return expression.parameters[paramCounter++];
            };
        });

        args.forEach(function (arg, index) {
            if (arg) {
                if (index > 0) {
                    context.data += ",";
                };
                this.Visit(arg, context);
            }
        }, this);
        context.data += opDef.rightValue || "";
    }
});

},{"jaydata/core":"jaydata/core"}],4:[function(_dereq_,module,exports){
'use strict';

var _core = _dereq_('jaydata/core');

var _core2 = _interopRequireDefault(_core);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

(0, _core.$C)('$data.storageProviders.InMemory.InMemoryProvider', _core2.default.StorageProviderBase, null, {
    constructor: function constructor(cfg, ctx) {
        this.context = ctx;
        this.providerConfiguration = _core2.default.typeSystem.extend({
            source: null,
            persistentData: false,
            //obsolate
            localStoreName: 'JayData_InMemory_Provider',
            databaseName: 'JayData_InMemory_Provider',
            __instaceId: _core2.default.createGuid().toString()
        }, cfg);

        this.dataSource = this.providerConfiguration.source;
        delete this.providerConfiguration.source;

        if (this.providerConfiguration.databaseName === 'JayData_InMemory_Provider') this.providerConfiguration.databaseName = this.providerConfiguration.localStoreName;
    },
    initializeStore: function initializeStore(callBack) {
        callBack = _core2.default.PromiseHandlerBase.createCallbackSettings(callBack);

        var setKeys = [];
        for (var i in this.context._entitySetReferences) {
            setKeys.push(this.context._entitySetReferences[i].collectionName);
        }
        var localStorageData = null;
        if (this.providerConfiguration.persistentData && _core2.default.__global.localStorage && this.providerConfiguration.dbCreation !== _core2.default.storageProviders.DbCreationType.DropAllExistingTables) {
            var localStoreName = this.providerConfiguration.databaseName || "JayData_InMemory_Provider";
            var that = this;
            var storeData = _core2.default.__global.localStorage.getItem(localStoreName);

            if (!_core.Guard.isNullOrUndefined(storeData)) {
                localStorageData = JSON.parse(storeData, function (key, value) {
                    if (setKeys.indexOf(key) > -1 && value.map) {
                        return value.map(function (item) {
                            return new that.context[key].createNew(item);
                        });
                    }
                    return value;
                });
            }
        }

        var tempSource = localStorageData || this.dataSource || {};

        //check data and crate sequence table if needed
        this.dataSource = { 'inmemory_sequence': {} };
        for (var index = 0; index < this.context._storageModel.length; index++) {
            var storageModel = this.context._storageModel[index];
            //Create store for EntitySet
            this.dataSource[storageModel.TableName] = [];
            //Check primary key
            var keys = storageModel.LogicalType.memberDefinitions.getKeyProperties();
            var computedKeys = keys.filter(function (key) {
                return key.computed;
            });
            if (computedKeys.length > 1) {
                _core.Guard.raise(new _core.Exception('More than one computed field not supported in ' + storageModel.TableName + ' entity set.'));
            }
            var isIntegerPk = false;
            if (computedKeys.length === 1) {
                var resolvedType = _core.Container.resolveName(computedKeys[0].type);
                if (this.supportedAutoincrementKeys[resolvedType] === true) {
                    //if(resolvedType === $data.Integer){
                    this.dataSource['inmemory_sequence'][storageModel.TableName] = 0;
                    isIntegerPk = true;
                } else if (typeof this.supportedAutoincrementKeys[resolvedType] === 'function') {
                    //}else if (resolvedType === $data.Guid){

                } else {
                        console.log("WARRNING! '" + resolvedType + "' not supported as computed Key!");
                        //Guard.raise(new Exception('Not supported key field type. Computed pk field type are $data.Integer or $data.Guid!', 'ComputedKeyFieldError'));
                    }
            }
            //validate init data
            if (tempSource[storageModel.TableName]) {
                for (var i = 0; i < tempSource[storageModel.TableName].length; i++) {
                    var entity = tempSource[storageModel.TableName][i];
                    if (!(entity instanceof storageModel.LogicalType)) {
                        if (localStorageData) {
                            entity = new storageModel.LogicalType(entity);
                        } else {
                            _core.Guard.raise(new _core.Exception('Invalid element in source: ' + storageModel.TableName));
                        }
                    }

                    if (isIntegerPk) {
                        var keyValue = entity[computedKeys[0].name];
                        if (keyValue > this.dataSource['inmemory_sequence'][storageModel.TableName]) {
                            this.dataSource['inmemory_sequence'][storageModel.TableName] = keyValue;
                        }
                    }
                    this.dataSource[storageModel.TableName].push(entity);
                }
            }
        }
        callBack.success(this.context);
    },
    executeQuery: function executeQuery(query, callBack) {
        callBack = _core2.default.PromiseHandlerBase.createCallbackSettings(callBack);

        var sql;
        try {
            sql = this._compile(query);
        } catch (e) {
            callBack.error(e);
            return;
        }
        var sourceName = query.context.getEntitySetFromElementType(query.defaultType).tableName;
        var result = [].concat(this.dataSource[sourceName] || []);
        if (sql.$filter && !sql.$every) result = result.filter(sql.$filter);

        if (sql.$map && Object.keys(query.modelBinderConfig).length === 0) result = result.map(sql.$map);

        if (sql.$order && sql.$order.length > 0) {
            result.sort(function (a, b) {
                var result;
                for (var i = 0, l = sql.$order.length; i < l; i++) {
                    result = 0;
                    var aVal = sql.$order[i](a);
                    var bVal = sql.$order[i](b);

                    if (sql.$order[i].ASC) result = aVal === bVal ? 0 : aVal > bVal || bVal === null ? 1 : -1;else result = aVal === bVal ? 0 : aVal < bVal || aVal === null ? 1 : -1;

                    if (result !== 0) break;
                }
                return result;
            });
        }

        if (sql.$take !== undefined && sql.$skip !== undefined) {
            result = result.slice(sql.$skip, sql.$skip + sql.$take);
        } else if (sql.$take !== undefined && result.length > sql.$take) {
            result = result.slice(0, sql.$take);
        } else if (sql.$skip) {
            result = result.slice(sql.$skip, result.length);
        }

        if (sql.$some) result = [result.length > 0];

        //        if (sql.$every && sql.$filter)
        //            result = [result.every(sql.$filter)];

        if (sql.$length) result = [result.length];

        query.rawDataList = result;
        callBack.success(query);
    },
    _compile: function _compile(query, params) {
        var compiler = new _core2.default.storageProviders.InMemory.InMemoryCompiler(this);
        var compiled = compiler.compile(query);
        return compiled;
    },
    saveChanges: function saveChanges(callBack, changedItems) {
        for (var i = 0; i < changedItems.length; i++) {
            var item = changedItems[i];
            switch (item.data.entityState) {
                case _core2.default.EntityState.Added:
                    this._save_add_processPk(item);
                    this.dataSource[item.entitySet.tableName].push(item.data);
                    break;
                case _core2.default.EntityState.Deleted:
                    var collection = this.dataSource[item.entitySet.tableName];
                    var entity = this._save_getEntity(item, collection);
                    var idx = collection.indexOf(entity);
                    collection.splice(idx, 1);
                    break;
                case _core2.default.EntityState.Modified:
                    if (item.data.changedProperties && item.data.changedProperties.length > 0) {
                        var collection = this.dataSource[item.entitySet.tableName];
                        var entity = this._save_getEntity(item, collection);
                        for (var j = 0; j < item.data.changedProperties.length; j++) {
                            var field = item.data.changedProperties[j];
                            if (!field.key && item.entitySet.elementType.memberDefinitions.getPublicMappedPropertyNames().indexOf(field.name) > -1) {
                                entity[field.name] = item.data[field.name];
                            }
                        }
                    }
                    break;
                default:
                    break;
            }
        }
        if (this.providerConfiguration.persistentData && _core2.default.__global.localStorage) {
            var localStoreName = this.providerConfiguration.databaseName || "JayData_InMemory_Provider";

            var that = this;
            var setKeys = [];
            for (var i in this.context._entitySetReferences) {
                setKeys.push(this.context._entitySetReferences[i].collectionName);
            }
            var localStorageData = _core2.default.__global.localStorage.setItem(localStoreName, JSON.stringify(this.dataSource, function (key, value) {
                if (setKeys.indexOf(key) > -1 && Array.isArray(value)) {
                    var data = [];
                    for (var i = 0; i < value.length; i++) {
                        var dataItem = {};
                        that.context[key].elementType.memberDefinitions.getPublicMappedProperties().forEach(function (memDef) {
                            if (!memDef.inverseProperty) {
                                var typeName = _core.Container.resolveName(memDef.type);
                                var converter = that.fieldConverter.fromDb[typeName];
                                dataItem[memDef.name] = converter ? converter(value[i][memDef.name]) : value[i][memDef.name];
                            }
                        });
                        data.push(dataItem);
                    }
                    return data;
                }
                return value;
            }));
        }
        callBack.success();
    },
    _save_add_processPk: function _save_add_processPk(item) {
        var keys = item.entitySet.elementType.memberDefinitions.getKeyProperties();
        if (keys.length === 1 && keys[0].computed) {
            var key = keys[0];
            var keyResolveType = _core.Container.resolveName(key.type);
            //if(keyResolveType === $data.Guid){
            if (typeof this.supportedAutoincrementKeys[keyResolveType] === 'function') {
                item.data[key.name] = this.supportedAutoincrementKeys[keyResolveType]();
            } else if (this.supportedAutoincrementKeys[keyResolveType] === true) {
                var sequenceValue = this.dataSource['inmemory_sequence'][item.entitySet.tableName];
                item.data[key.name] = sequenceValue + 1;
                this.dataSource['inmemory_sequence'][item.entitySet.tableName] = sequenceValue + 1;
                //}else{
                //    Guard.raise(new Exception("Not supported data type!"))
            }
        } else {
                for (var j = 0; j < keys.length; j++) {
                    if (item.data[keys[j].name] === null || item.data[keys[j].name] === undefined) {
                        _core.Guard.raise(new _core.Exception('Key field must set value! Key field name without value: ' + keys[j].name));
                    }
                }
            }
    },
    _save_getEntity: function _save_getEntity(item, collection) {
        var keys = item.entitySet.elementType.memberDefinitions.getKeyProperties();
        var entities = collection.filter(function (entity) {
            var isEqual = true;
            for (var i = 0; i < keys.length; i++) {
                isEqual = isEqual && entity[keys[i].name] === item.data[keys[i].name];
            }
            return isEqual;
        });
        if (entities > 1) {
            _core.Guard.raise(new _core.Exception("Inconsistent storage!"));
        }
        return entities[0];
    },
    getTraceString: function getTraceString(queryable) {
        var compiled = this._compile(queryable);
        return compiled;
    },
    supportedDataTypes: {
        value: [_core2.default.Integer, _core2.default.String, _core2.default.Number, _core2.default.Blob, _core2.default.Boolean, _core2.default.Date, _core2.default.Object, _core2.default.Guid, _core2.default.GeographyPoint, _core2.default.GeographyLineString, _core2.default.GeographyPolygon, _core2.default.GeographyMultiPoint, _core2.default.GeographyMultiLineString, _core2.default.GeographyMultiPolygon, _core2.default.GeographyCollection, _core2.default.GeometryPoint, _core2.default.GeometryLineString, _core2.default.GeometryPolygon, _core2.default.GeometryMultiPoint, _core2.default.GeometryMultiLineString, _core2.default.GeometryMultiPolygon, _core2.default.GeometryCollection, _core2.default.Byte, _core2.default.SByte, _core2.default.Decimal, _core2.default.Float, _core2.default.Int16, _core2.default.Int32, _core2.default.Int64, _core2.default.Time, _core2.default.DateTimeOffset],
        writable: false
    },

    supportedBinaryOperators: {
        value: {
            equal: { mapTo: ' == ', dataType: "boolean", allowedIn: [_core2.default.Expressions.FilterExpression, _core2.default.Expressions.OrderExpression] },
            notEqual: { mapTo: ' != ', dataType: "boolean", allowedIn: [_core2.default.Expressions.FilterExpression, _core2.default.Expressions.OrderExpression] },
            equalTyped: { mapTo: ' === ', dataType: "boolean", allowedIn: [_core2.default.Expressions.FilterExpression, _core2.default.Expressions.OrderExpression] },
            notEqualTyped: { mapTo: ' !== ', dataType: "boolean", allowedIn: [_core2.default.Expressions.FilterExpression, _core2.default.Expressions.OrderExpression] },
            greaterThan: { mapTo: ' > ', dataType: "boolean", allowedIn: [_core2.default.Expressions.FilterExpression, _core2.default.Expressions.OrderExpression] },
            greaterThanOrEqual: { mapTo: ' >= ', dataType: "boolean", allowedIn: [_core2.default.Expressions.FilterExpression, _core2.default.Expressions.OrderExpression] },

            lessThan: { mapTo: ' < ', dataType: "boolean", allowedIn: [_core2.default.Expressions.FilterExpression, _core2.default.Expressions.OrderExpression] },
            lessThenOrEqual: { mapTo: ' <= ', dataType: "boolean", allowedIn: [_core2.default.Expressions.FilterExpression, _core2.default.Expressions.OrderExpression] },
            or: { mapTo: ' || ', dataType: "boolean", allowedIn: [_core2.default.Expressions.FilterExpression, _core2.default.Expressions.OrderExpression] },
            and: { mapTo: ' && ', dataType: "boolean", allowedIn: [_core2.default.Expressions.FilterExpression, _core2.default.Expressions.OrderExpression] },

            "in": { mapTo: ".indexOf(", allowedIn: [_core2.default.Expressions.FilterExpression], rightValue: ') > -1', reverse: true }
        }
    },

    supportedUnaryOperators: {
        value: {
            not: { mapTo: '!' }
        }
    },

    supportedFieldOperations: {
        value: {
            contains: {
                mapTo: "$data.StringFunctions.contains(",
                rightValue: ")",
                dataType: "boolean",
                parameters: [{ name: "@expression", dataType: "string" }, { name: "strFragment", dataType: "string" }]
            },

            startsWith: {
                mapTo: "$data.StringFunctions.startsWith(",
                rightValue: ")",
                dataType: "boolean",
                parameters: [{ name: "@expression", dataType: "string" }, { name: "strFragment", dataType: "string" }]
            },

            endsWith: {
                mapTo: "$data.StringFunctions.endsWith(",
                rightValue: ")",
                dataType: "boolean",
                parameters: [{ name: "@expression", dataType: "string" }, { name: "strFragment", dataType: "string" }]
            },
            length: {
                dataType: "number",
                propertyFunction: true
            },
            substr: {
                mapTo: "substr(",
                rightValue: ")",
                dataType: "string",
                parameters: [{ name: "startFrom", dataType: "number" }, { name: "length", dataType: "number" }],
                propertyFunction: true
            },
            toLowerCase: {
                dataType: "string", mapTo: "toLowerCase()",
                propertyFunction: true
            },
            toUpperCase: {
                dataType: "string", mapTo: "toUpperCase()",
                propertyFunction: true
            },
            'trim': {
                dataType: _core2.default.String,
                mapTo: 'trim()',
                propertyFunction: true
            },
            'ltrim': {
                dataType: _core2.default.String,
                mapTo: 'trimLeft()',
                propertyFunction: true
            },
            'rtrim': {
                dataType: _core2.default.String,
                mapTo: 'trimRight()',
                propertyFunction: true
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
            some: {},
            //every: {},
            take: {},
            skip: {},
            orderBy: {},
            orderByDescending: {},
            first: {}
        },
        enumerable: true,
        writable: true
    },
    fieldConverter: { value: _core2.default.InMemoryConverter },
    supportedAutoincrementKeys: {
        value: {
            '$data.Integer': true,
            '$data.Int32': true,
            '$data.Guid': function $dataGuid() {
                return _core2.default.createGuid();
            }
        }
    }
}, null);
(0, _core.$C)('$data.storageProviders.InMemory.LocalStorageProvider', _core2.default.storageProviders.InMemory.InMemoryProvider, null, {
    constructor: function constructor(cfg, ctx) {
        this.providerConfiguration.persistentData = true;
    }
}, null);
_core2.default.StorageProviderBase.registerProvider("InMemory", _core2.default.storageProviders.InMemory.InMemoryProvider);
_core2.default.StorageProviderBase.registerProvider("LocalStore", _core2.default.storageProviders.InMemory.LocalStorageProvider);

},{"jaydata/core":"jaydata/core"}],5:[function(_dereq_,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _core = _dereq_('jaydata/core');

var _core2 = _interopRequireDefault(_core);

var _InMemoryConverter = _dereq_('./InMemoryConverter.js');

var _InMemoryConverter2 = _interopRequireDefault(_InMemoryConverter);

var _InMemoryProvider = _dereq_('./InMemoryProvider.js');

var _InMemoryProvider2 = _interopRequireDefault(_InMemoryProvider);

var _InMemoryCompiler = _dereq_('./InMemoryCompiler.js');

var _InMemoryCompiler2 = _interopRequireDefault(_InMemoryCompiler);

var _InMemoryFunctionCompiler = _dereq_('./InMemoryFunctionCompiler.js');

var _InMemoryFunctionCompiler2 = _interopRequireDefault(_InMemoryFunctionCompiler);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

exports.default = _core2.default;
module.exports = exports['default'];

},{"./InMemoryCompiler.js":1,"./InMemoryConverter.js":2,"./InMemoryFunctionCompiler.js":3,"./InMemoryProvider.js":4,"jaydata/core":"jaydata/core"}]},{},[5])(5)
});

