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
(function (global){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _core = _dereq_('jaydata/core');

var _core2 = _interopRequireDefault(_core);

var _jquery = (typeof window !== "undefined" ? window['jQuery'] : typeof global !== "undefined" ? global['jQuery'] : null);

var _jquery2 = _interopRequireDefault(_jquery);

var _kendo = (typeof window !== "undefined" ? window['kendo'] : typeof global !== "undefined" ? global['kendo'] : null);

var _kendo2 = _interopRequireDefault(_kendo);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

(function ($data, $) {
    var oldProcessor = $data.Entity.inheritedTypeProcessor;

    $data.kendo = {};
    $data.kendo.BaseModelType = _kendo2.default.data.Model.define({
        init: function init(data) {
            _kendo2.default.data.Model.fn.init.call(this, data);
        }
    });
    $data.kendo.attachMode = true;
    if ($data.EntityAttachMode) {
        $data.kendo.attachMode = $data.EntityAttachMode.KeepChanges;
    }

    var kendoTypeMap = {
        "$data.Blob": "string",
        "$data.String": "string",
        "$data.Boolean": "boolean",
        "$data.Integer": "number",
        "$data.Number": "number",
        "$data.Date": "date",
        "$data.DateTimeOffset": "date",
        "$data.Time": "string",
        "$data.Day": "string",
        "$data.Duration": "string",
        "$data.Byte": "number",
        "$data.SByte": "number",
        "$data.Int16": "number",
        "$data.Int32": "number",
        "$data.Int64": "number",
        "$data.Decimal": "string",
        "$data.Float": "number"
    };

    $data.Entity.inheritedTypeProcessor = function (type) {
        var memberDefinitions = type.memberDefinitions;

        function getKendoTypeName(canonicType, pd) {
            return kendoTypeMap[canonicType] || 'object';
        };

        function createKendoModel(options) {
            ///<param name="options">Contains options.owningContextType if initialized in a scope of a context</param>
            var memberDefinitions = type.memberDefinitions,
                fields = {};
            //debugger;
            function getNullable(canonicType, pd) {
                if (canonicType === "$data.Boolean") {
                    //grid validation errs on requied/nonnull bools
                    return true;
                }
                return pd.required !== true;
            };

            function getRequired(canonicType, pd) {
                if ("$data.Boolean" === canonicType) {
                    return false;
                }
                return pd.required || "nullable" in pd ? !pd.nullable : false;
            }

            memberDefinitions.getPublicMappedProperties().forEach(function (pd) {
                var canonicType = $data.Container.resolveName(pd.type);
                //if (pd.dataType !== "Array" && !(pd.inverseProperty)) {
                fields[pd.name] = {
                    //TODO
                    type: getKendoTypeName(canonicType, pd),
                    nullable: getNullable(canonicType, pd),
                    defaultValue: pd.defaultValue,
                    //nullable: false,
                    //nullable:  "nullable" in pd ? pd.nullable : true,
                    editable: !pd.computed,
                    //defaultValue: true,
                    //defaultValue: 'abc',
                    //defaultValue: pd.type === "Edm.Boolean" ? false : undefined,
                    validation: {
                        required: getRequired(canonicType, pd)
                    }
                };
                //};
            });

            function setInitialValue(obj, memDef) {
                return;
                //if (!obj[memDef.name]) {
                //    function getDefault() {
                //        switch ($data.Container.resolveType(memDef.type)) {
                //            case $data.Number: return 0.0;
                //            case $data.Integer: return 0;
                //            case $data.Date: return new Date();
                //            case $data.Boolean: return false;
                //        }
                //    }
                //    obj[memDef.name] = getDefault();
                //}
            }

            var modelDefinition = {
                fields: fields,
                init: function init(data) {
                    var ctxType = options && options.owningContextType || undefined;

                    var contextSetTypes = [];
                    if (options && options.owningContextType) {
                        contextSetTypes = options.owningContextType.memberDefinitions.getPublicMappedProperties().filter(function (pd) {
                            return $data.Container.resolveType(pd.type) === $data.EntitySet;
                        }).map(function (pd) {
                            return $data.Container.resolveType(pd.elementType);
                        });
                    }

                    var newInstanceOptions = {
                        entityBuilder: function entityBuilder(instance, members) {
                            members.forEach(function (memberInfo) {
                                if (!(memberInfo.key === true) && (memberInfo.required === true || memberInfo.nullable === false)) {
                                    var memberType = $data.Container.resolveType(memberInfo.type);
                                    if (memberType.isAssignableTo && memberType.isAssignableTo($data.Entity) && contextSetTypes.indexOf(memberType) === -1) {
                                        //it's a complex property
                                        var _data;
                                        if (data) {
                                            _data = data[memberInfo.name];
                                        }
                                        instance[memberInfo.name] = new memberType(_data, newInstanceOptions);
                                    } else {
                                        setInitialValue(instance, memberInfo);
                                    }
                                }
                            });
                        }
                    };

                    var jayInstance = data instanceof type ? data : new type(data, newInstanceOptions);

                    var seed = jayInstance.initData;

                    var feed = {};

                    //TODO create precompiled strategy
                    for (var j in seed) {
                        var md = type.getMemberDefinition(j);
                        var seedValue = seed[j];
                        if (seedValue instanceof $data.Entity) {
                            var kendoInstance = seedValue.asKendoObservable();
                            feed[j] = kendoInstance;
                        } else if (md && $data.Container.resolveType(md.type) === Array) {
                            var jayType = $data.Container.resolveType(md.elementType);
                            var kendoType = jayType;
                            if (jayType.asKendoModel) {
                                kendoType = jayType.asKendoModel();
                            }
                            var feedValue = new _kendo2.default.data.ObservableArray(seed[j], kendoType);
                            feed[j] = feedValue;
                            feed[j].bind('change', function (e) {
                                jayInstance.changeFromKendo = true;
                                this.parent().dirty = true;
                                jayInstance[md.name] = this.toJSON();
                                delete jayInstance.changeFromKendo;
                            });
                        } else if (md && $data.Container.resolveType(md.type) === $data.Blob) {
                            feed[j] = $data.Blob.toBase64(seedValue);
                            //feed[j] = new kendo.data.Observable($data.Blob.toBase64(seedValue));
                            /*feed[j].bind('change', function(e){
                                //jayInstance.changeFromKendo = true;
                                jayInstance[md.name] = $data.Container.convertTo(atob(this), $data.Blob);
                                //delete jayInstance.changeFromKendo;
                            });*/
                        } else {
                                feed[j] = seedValue;
                            }
                    }

                    var arrayMemberDef = type.memberDefinitions.getPublicMappedProperties().filter(function (item) {
                        return $data.Container.resolveType(item.dataType) === Array && !$data.Container.resolveType(item.elementType).asKendoModel;
                    });
                    for (var j = 0; j < arrayMemberDef.length; j++) {
                        var memberDef = arrayMemberDef[j];
                        if (seed[memberDef.name] === null || seed[memberDef.name] === undefined) {
                            feed[memberDef.name] = new _kendo2.default.data.ObservableArray([], $data.Container.resolveType(memberDef.elementType));
                            feed[memberDef.name].bind('change', function (e) {
                                jayInstance.changeFromKendo = true;
                                this.parent().dirty = true;
                                jayInstance[memberDef.name] = this.toJSON();
                                delete jayInstance.changeFromKendo;
                            });
                        }
                    }

                    var self = this;
                    this.innerInstance = function () {
                        return jayInstance;
                    };

                    //kendo.data.Model.fn.init.call(this, feed);
                    $data.kendo.BaseModelType.fn.init.call(this, feed);

                    jayInstance.propertyChanged.attach(function (obj, propinfo) {
                        var jay = this;
                        var newValue = propinfo.newValue;
                        var md = jayInstance.getType().getMemberDefinition(propinfo.propertyName);
                        if (!jay.changeFromKendo) {
                            newValue = newValue ? newValue.asKendoObservable ? newValue.asKendoObservable() : newValue : newValue;
                            jayInstance.changeFromJay = true;
                            if ($data.Container.resolveType(md.type) === $data.Blob && newValue) {
                                newValue = $data.Blob.toBase64(newValue);
                            }
                            self.set(propinfo.propertyName, newValue);
                            if (md.computed && self[propinfo.propertyName] !== newValue) {
                                self[propinfo.propertyName] = newValue;
                            }
                            delete jayInstance.changeFromJay;
                        } else {
                            if ($data.Container.resolveType(md.type) === $data.Blob) {
                                var blob = $data.Blob.toString(newValue);
                                newValue = $data.Container.convertTo(atob(blob), $data.Blob);
                                jayInstance.changeFromJay = true;
                                jayInstance.initData[md.name] = newValue;
                                //self.set(propinfo.propertyName, blob);
                                delete jayInstance.changeFromJay;
                            }
                        }
                    });

                    this.bind("set", function (e) {
                        var propName = e.field;
                        var propNameParts = propName.split(".");
                        jayInstance.changeFromKendo = true;
                        if (propNameParts.length == 1) {
                            var propValue = e.value;
                            if (!jayInstance.changeFromJay) {
                                propValue = propValue.innerInstance ? propValue.innerInstance() : propValue;
                                jayInstance[propName] = propValue;
                                if (options && options.autoSave) {
                                    jayInstance.save();
                                }
                            }
                        } else {
                            var rootProp = jayInstance[propNameParts[0]];
                            if (rootProp instanceof $data.Entity) {
                                jayInstance[propNameParts[0]] = rootProp;
                            }
                        }
                        delete jayInstance.changeFromKendo;
                    });
                    if (options && options.newInstanceCallback) {
                        options.newInstanceCallback(jayInstance);
                    }
                },
                save: function save() {
                    //console.log("item.save", this, arguments);
                    return this.innerInstance().save();
                },
                remove: function remove() {
                    return this.innerInstance().remove();
                }

            };

            var keyProperties = memberDefinitions.getKeyProperties();
            switch (keyProperties.length) {
                case 0:
                    break;
                case 1:
                    modelDefinition.id = keyProperties[0].name;
                    break;
                default:
                    console.warn("entity with multiple keys not supported");
                    break;
            }
            $data.Trace.log("md", modelDefinition);

            var returnValue = _kendo2.default.data.Model.define($data.kendo.BaseModelType, modelDefinition);

            return returnValue;
        }

        function asKendoModel(options) {
            var cacheObject = options || type;
            return cacheObject.kendoModelType || (cacheObject.kendoModelType = createKendoModel(options));
        }

        function asKendoObservable(instance, options) {
            var kendoModel = type.asKendoModel(options);
            return new kendoModel(instance);
        }

        type.asKendoModel = asKendoModel;
        //type.asKendoModelType = asKendoModel;

        type.prototype.asKendoObservable = function (options) {
            var self = this;

            var kendoObservable = asKendoObservable(this, options);

            return kendoObservable;
        };

        function r(value) {
            return value || '';
        }
        function registerStoreAlias(type, options) {
            if (!options.provider) return;
            var key = r(options.databaseName) + r(options.tableName) + r(options.url) + r(options.apiUrl) + r(options.oDataServiceHost);
            var storeDef = {
                provider: options.provider,
                databaseName: options.databaseName,
                tableName: options.tableName,
                dataSource: options.url,
                apiUrl: options.apiUrl,
                oDataServiceHost: options.oDataServiceHost
            };
            Object.keys(storeDef).forEach(function (k) {
                delete options[k];
            });

            type.setStore(key, storeDef);
            return key;
        }

        type.asKendoDataSource = function (options, modelOptions, storeAlias) {
            options = options || {};
            var mOptions = modelOptions || {};
            var salias = registerStoreAlias(type, options) || storeAlias;
            var token = $data.ItemStore._getStoreAlias(type, salias);
            var ctx = $data.ItemStore._getContextPromise(token, type);
            var set = ctx.getEntitySetFromElementType(type);
            return set.asKendoDataSource(options, mOptions);
        };

        if (oldProcessor) {
            oldProcessor(type);
        }
    };
    $data.Queryable.addMember("asKendoColumns", function (columns) {
        var result = [];
        columns = columns || {};
        var showComplex = columns['$showComplexFields'] === true;
        delete columns['$showComplexFields'];

        this.defaultType.memberDefinitions.getPublicMappedProperties().forEach(function (pd) {
            //if (pd.dataType !== "Array" && !(pd.inverseProperty)) {
            if (showComplex || kendoTypeMap[$data.Container.resolveName(pd.type)]) {
                var col = columns[pd.name] || {};
                var colD = { field: pd.name };
                $.extend(colD, col);
                result.push(colD);
            }
            //}
        });

        function append(field) {
            field = Array.isArray(field) ? field : [field];
            var result = this.concat(field);
            return prepareResult(result);
        }

        function prepend(field) {
            field = Array.isArray(field) ? field : [field];
            var result = field.concat(this);
            return prepareResult(result);
        }

        function setColumn(colName, def) {
            var it = this.filter(function (item) {
                return item.field == colName;
            })[0];
            $.extend(it, def);
            return this;
        }

        function prepareResult(r) {
            r.prepend = prepend;
            r.append = append;
            r.setColumn = setColumn;
            return r;
        }
        return prepareResult(result);
        //return ['id', 'Year', 'Manufacturer', { command: ["edit", "create", "destroy", "update"] }];
    }),

    //, { command: ["edit", "create", "destroy", "update"]}
    $data.EntityContext.addProperty("EntitySetNames", function () {
        var self = this;
        //var sets = Object.keys(self._entitySetReferences);
        //return sets;
        return Object.keys(self._entitySetReferences).map(function (set) {
            return self._entitySetReferences[set].tableName;
        });
    });

    $data.Queryable.addMember("asKendoModel", function (options) {
        options.owningContextType = options.owningContextType || this.entityContext.getType();
        return this.defaultType.asKendoModel(options);
    });

    $data.Queryable.addMember("asKendoRemoteTransportClass", function (modelItemClass) {
        var self = this;
        var ctx = self.entityContext;
        function reset() {
            ctx.stateManager.reset();
        };
        var TransportClass = _kendo2.default.data.RemoteTransport.extend({
            init: function init() {
                this.items = [];
            },
            read: function read(options) {
                var query = self;

                query.entityContext.onReady().then(function () {
                    var _this = this;
                    var q = query;
                    var sp = query.entityContext.storageProvider;
                    var withInlineCount = query.entityContext.storageProvider.supportedSetOperations.withInlineCount;
                    var withLength = !withInlineCount && query.entityContext.storageProvider.supportedSetOperations.length;

                    if (withInlineCount) {
                        q = q.withInlineCount();
                    }

                    if (options.data.filter) {
                        var filter = "";
                        var thisArg = {};
                        options.data.filter.filters.forEach(function (f, index) {
                            if (index > 0) {
                                filter += options.data.filter.logic == "or" ? " || " : " && ";
                            }

                            switch (f.operator) {
                                case 'eq':
                                    filter += "it." + f.field;
                                    filter += " == this." + f.field;
                                    break;
                                case 'neq':
                                    filter += "it." + f.field;
                                    filter += " != this." + f.field;
                                    break;
                                case 'startswith':
                                    filter += "it." + f.field;
                                    filter += ".startsWith(this." + f.field + ")";
                                    break;
                                case 'contains':
                                    filter += "it." + f.field;
                                    filter += ".contains(this." + f.field + ")";
                                    break;
                                case 'doesnotcontain':
                                    filter += "!";
                                    filter += "it." + f.field;
                                    filter += ".contains(this." + f.field + ")";
                                    break;
                                case 'endswith':
                                    filter += "it." + f.field;
                                    filter += ".endsWith(this." + f.field + ")";
                                    break;
                                case 'gte':
                                    filter += "it." + f.field;
                                    filter += " >= this." + f.field;
                                    break;
                                case 'gt':
                                    filter += "it." + f.field;
                                    filter += " > this." + f.field;
                                    break;
                                case 'lte':
                                    filter += "it." + f.field;
                                    filter += " <= this." + f.field;
                                    break;
                                case 'lt':
                                    filter += "it." + f.field;
                                    filter += " < this." + f.field;
                                    break;
                                default:
                                    $data.Trace.log('unknown operator', f.operator);
                                    break;
                            }
                            thisArg[f.field] = f.value;
                        });
                        q = q.filter(filter, thisArg);
                    }
                    var allItemsQ = q;

                    if (options.data.sort) {
                        options.data.sort.forEach(function (s) {
                            q = q.order((s.dir == 'desc' ? "-" : "") + s.field);
                        });
                    }

                    if (options.data.skip) {
                        q = q.skip(options.data.skip);
                    }
                    if (options.data.take) {
                        q = q.take(options.data.take);
                    }

                    //Data.defaultHttpClient.enableJsonpCallback = true;
                    var promises = [];

                    promises.push(q.toArray());
                    //var ta = q.toArray();
                    if (withLength) {
                        promises.push(allItemsQ.length());
                    } else if (!withInlineCount) {
                        promises.push(allItemsQ.toArray());
                    }

                    $data.Trace.log(promises);
                    _jquery2.default.when.apply(this, promises).then(function (items, total) {
                        //var result = items.map(function (item) { return item instanceof $data.Entity ? new model(item.initData) : item; });
                        var result = items.map(function (item) {
                            var d = item instanceof $data.Entity ? item.initData : item;
                            var kendoItem = item.asKendoObservable();
                            return kendoItem;
                        });
                        var r = {
                            data: result,
                            total: withInlineCount ? items.totalCount : withLength ? total : total.length
                        };
                        $data.Trace.log(r);
                        options.success(r);
                    }).fail(function () {
                        console.log("error in create");
                        options.error({}, arguments);
                    });
                });
            },
            create: function create(options, model) {
                var query = self;
                query.entityContext.onReady().then(function () {
                    if (model.length > 1) {
                        var modelItems = [];
                        model.forEach(function (modelItem) {
                            modelItems.push(modelItem.innerInstance());
                        });
                        ctx.addMany(modelItems);
                        ctx.saveChanges().then(function () {
                            var data = [];
                            modelItems.forEach(function (modelItem) {
                                data.push(modelItem.initData);
                            });
                            options.success();
                        }). /*{ data: data }*/fail(function () {
                            console.log("error in create");
                            options.error({}, arguments);
                            ctx.stateManager.reset();
                        });
                    } else {
                        model[0].innerInstance().save(ctx.storeToken).then(function () {
                            options.success();
                        }). /*{ data: model[0].innerInstance().initData }*/fail(function () {
                            console.log("error in create");
                            options.error({}, arguments);
                        });
                    }
                });
            },
            update: function update(options, model) {
                var query = self;
                query.entityContext.onReady().then(function () {
                    if (model.length > 1) {
                        var items = model.map(function (item) {
                            return item.innerInstance();
                        });
                        items.forEach(function (item) {
                            ctx.attach(item, $data.kendo.attachMode);
                        });
                        ctx.saveChanges().then(function () {
                            options.success();
                        }).fail(function () {
                            ctx.stateManager.reset();
                            //alert("error in batch update");
                            options.error({}, arguments);
                        });
                    } else {
                        model[0].innerInstance().save(undefined, undefined, $data.kendo.attachMode).then(function (item) {
                            options.success();
                        }).fail(function () {
                            //alert("error in update")
                            options.error({}, arguments);
                        });
                    }
                });
            },

            destroy: function destroy(options, model) {
                var query = self;
                query.entityContext.onReady().then(function () {
                    if (model.length > 1) {
                        model.forEach(function (item) {
                            ctx.remove(item.innerInstance());
                        });
                        ctx.saveChanges().then(function () {
                            options.success({ data: options.data });
                        }).fail(function () {
                            ctx.stateManager.reset();
                            //alert("error in save:" + arguments[0]);
                            options.error({}, "error", options.data);
                        });
                    } else {
                        model[0].innerInstance().remove().then(function () {
                            options.success({ data: options.data });
                        }).fail(function () {
                            ctx.stateManager.reset();
                            //alert("error in save:" + arguments[0]);
                            options.error({}, "error", options.data);
                        });
                    }
                });
            },
            setup: function setup() {
                $data.Trace.log("setup");
                $data.Trace.log(arguments);
            }
        });
        return TransportClass;
    });

    var jayDataSource = _kendo2.default.data.DataSource.extend({
        init: function init() {
            _kendo2.default.data.DataSource.fn.init.apply(this, arguments);
        },
        createItem: function createItem(initData) {
            var type = this.options.schema.model;
            return new type(initData);
        },
        _promise: function _promise(data, models, type) {
            var that = this,
                extend = $.extend,
                transport = that.transport;

            return $.Deferred(function (deferred) {
                transport[type].call(transport, extend({
                    success: function success(response) {
                        deferred.resolve({
                            response: response,
                            models: models,
                            type: type
                        });
                    },
                    error: function error(response, status, _error) {
                        deferred.reject(response);
                        that.error(response, status, _error);
                    }
                }, data), models);
            }).promise();
        }
    });

    $data.kendo = $data.kendo || {};

    $data.kendo.defaultPageSize = 25;

    $data.Queryable.addMember("asKendoDataSource", function (ds, modelOptions) {
        var self = this;

        modelOptions = modelOptions || {};
        var model = self.asKendoModel(modelOptions);

        ds = ds || {};
        //unless user explicitly opts out server side logic
        //we just force it.
        ds.serverPaging = ds.serverPaging === undefined ? true : ds.serverPaging;
        ds.serverFiltering = ds.serverFiltering === undefined ? true : ds.serverFiltering;
        ds.serverSorting = ds.serverSorting === undefined ? true : ds.serverSorting;
        ds.pageSize = ds.pageSize === undefined ? $data.kendo.defaultPageSize : ds.pageSize;

        var TransportClass = self.asKendoRemoteTransportClass(model);
        ds.transport = new TransportClass();

        ds.schema = {
            model: model,
            data: "data",
            total: "total"
        };
        return new jayDataSource(ds);
    });

    _kendo2.default.data.binders.submit = _kendo2.default.data.Binder.extend({
        init: function init(element, bindings, options) {
            _kendo2.default.data.Binder.fn.init.call(this, element, bindings, options);
            $(element).bind("submit", function () {
                var obj = bindings.submit.source;
                var fn = obj[bindings.submit.path];
                if (typeof fn === 'function') {
                    fn.apply(obj, arguments);
                    return false;
                }
            });
        },
        refresh: function refresh() {}
    });
})(_core2.default, _jquery2.default);

exports.default = _core2.default;
module.exports = exports['default'];

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"jaydata/core":"jaydata/core"}]},{},[1])(1)
});

