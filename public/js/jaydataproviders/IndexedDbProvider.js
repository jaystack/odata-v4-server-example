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

_core2.default.IndexedDBConverter = {
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
        '$data.Blob': function $dataBlob(b) {
            return b ? _core2.default.Container.convertTo(b, _core2.default.Blob) : b;
        },
        '$data.Array': function $dataArray(arr) {
            if (arr === undefined) {
                return new _core2.default.Array();
            }return arr;
        },
        '$data.Object': _core2.default.Container.proxyConverter,
        "$data.Guid": function $dataGuid(g) {
            return g ? _core2.default.parseGuid(g).toString() : g;
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
        '$data.Blob': function $dataBlob(b) {
            return b ? _core2.default.Blob.toString(b) : b;
        },
        '$data.Array': function $dataArray(arr) {
            return arr ? JSON.parse(JSON.stringify(arr)) : arr;
        },
        '$data.Object': _core2.default.Container.proxyConverter,
        "$data.Guid": function $dataGuid(g) {
            return g ? g.toString() : g;
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
    }
};

},{"jaydata/core":"jaydata/core"}],2:[function(_dereq_,module,exports){
'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; };

var _core = _dereq_('jaydata/core');

var _core2 = _interopRequireDefault(_core);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

_core2.default.Class.define('$data.storageProviders.indexedDb.IndexedDBStorageProvider', _core2.default.StorageProviderBase, null, {
    constructor: function constructor(cfg, ctxInstance) {
        // mapping IndexedDB types to browser invariant name
        this.indexedDB = _core2.default.__global.indexedDB || _core2.default.__global.webkitIndexedDB || _core2.default.__global.mozIndexedDB || _core2.default.__global.msIndexedDB;
        this.IDBRequest = _core2.default.__global.IDBRequest || _core2.default.__global.webkitIDBRequest || _core2.default.__global.mozIDBRequest || _core2.default.__global.msIDBRequest;
        this.IDBTransaction = _core2.default.__global.IDBTransaction || _core2.default.__global.webkitIDBTransaction || _core2.default.__global.mozIDBTransaction || _core2.default.__global.msIDBTransaction;
        this.IDBTransactionType = { READ_ONLY: "readonly", READ_WRITE: "readwrite", VERSIONCHANGE: "versionchange" };
        if (typeof this.IDBTransaction.READ_ONLY !== 'undefined' && typeof this.IDBTransaction.READ_WRITE !== 'undefined') {
            this.IDBTransactionType.READ_ONLY = this.IDBTransaction.READ_ONLY;
            this.IDBTransactionType.READ_WRITE = this.IDBTransaction.READ_WRITE;
        }

        this.IDBKeyRange = _core2.default.__global.IDBKeyRange || _core2.default.__global.webkitIDBKeyRange || _core2.default.__global.mozIDBKeyRange || _core2.default.__global.msIDBKeyRange;
        this.IDBDatabaseException = _core2.default.__global.IDBDatabaseException || _core2.default.__global.webkitIDBDatabaseException || _core2.default.__global.mozIDBDatabaseException || _core2.default.__global.msIDBDatabaseException;
        this.IDBOpenDBRequest = _core2.default.__global.IDBOpenDBRequest || _core2.default.__global.webkitIDBOpenDBRequest || _core2.default.__global.mozIDBOpenDBRequest || _core2.default.__global.msIDBOpenDBRequest;
        this.newVersionAPI = !!(_core2.default.__global.IDBFactory && IDBFactory.prototype.deleteDatabase);
        this.sequenceStore = '__jayData_sequence';
        this.SqlCommands = [];
        this.context = {};
        this.providerConfiguration = _core2.default.typeSystem.extend({
            databaseName: _core2.default.defaults.defaultDatabaseName,
            version: 1,
            dbCreation: _core2.default.storageProviders.DbCreationType.DropTableIfChanged,
            memoryOperations: true
        }, cfg);
        this._setupExtensionMethods();

        if (ctxInstance) this.originalContext = ctxInstance.getType();
    },
    supportedBinaryOperators: {
        value: {
            equal: { mapTo: ' == ', dataType: _core2.default.Boolean },
            notEqual: { mapTo: ' != ', dataType: _core2.default.Boolean },
            equalTyped: { mapTo: ' == ', dataType: _core2.default.Boolean },
            notEqualTyped: { mapTo: ' != ', dataType: _core2.default.Boolean },
            greaterThan: { mapTo: ' > ', dataType: _core2.default.Boolean },
            greaterThanOrEqual: { mapTo: ' >= ', dataType: _core2.default.Boolean },

            lessThan: { mapTo: ' < ', dataType: _core2.default.Boolean },
            lessThenOrEqual: { mapTo: ' <= ', dataType: _core2.default.Boolean },
            or: { mapTo: ' || ', dataType: _core2.default.Boolean },
            and: { mapTo: ' && ', dataType: _core2.default.Boolean }
            //'in': { mapTo: ' in ', dataType: $data.Boolean, resolvableType: [$data.Array, $data.Queryable] }
        }
    },
    supportedSetOperations: {
        value: {
            length: {},
            toArray: {},
            forEach: {}
        },
        enumerable: true,
        writable: true
    },
    supportedFieldOperations: {
        value: {},
        enumerable: true,
        writable: true
    },
    supportedUnaryOperators: {
        value: {},
        enumerable: true,
        writable: true
    },
    _setupExtensionMethods: function _setupExtensionMethods() {
        /// <summary>
        /// Sets the extension method 'setCallback' on IDBRequest, IDBOpenDBRequest, and IDBTransaction types
        /// </summary>
        var self = this;
        var idbRequest = this.IDBRequest;
        var idbTran = this.IDBTransaction;
        var idbOpenDBRequest = this.IDBOpenDBRequest;
        var setCallbacks = function setCallbacks(callbackSettings) {
            /// <summary>
            /// Sets the callbacks on the object.
            /// </summary>
            /// <param name="callbackSettings">Named value pairs of the callbacks</param>
            if ((typeof callbackSettings === 'undefined' ? 'undefined' : _typeof(callbackSettings)) !== 'object') _core.Guard.raise(new _core.Exception('Invalid callbackSettings', null, callbackSettings));
            for (var i in callbackSettings) {
                if (typeof this[i] === 'undefined' || typeof callbackSettings[i] !== 'function') continue;
                this[i] = callbackSettings[i];
            }

            //if (this.readyState == self.IDBRequest.DONE)
            //    console.log('WARNING: request finished before setCallbacks. Do not use breakpoints between creating the request object and finishing the setting of callbacks');
            return this;
        };
        if (idbRequest && typeof idbRequest.prototype.setCallbacks !== 'function') idbRequest.prototype.setCallbacks = setCallbacks;
        if (idbTran && typeof idbTran.prototype.setCallbacks !== 'function') idbTran.prototype.setCallbacks = setCallbacks;
        if (idbOpenDBRequest && typeof idbOpenDBRequest.prototype.setCallbacks !== 'function') idbOpenDBRequest.prototype.setCallbacks = setCallbacks;
    },
    supportedDataTypes: {
        value: [_core2.default.Integer, _core2.default.Number, _core2.default.Date, _core2.default.String, _core2.default.Boolean, _core2.default.Blob, _core2.default.Array, _core2.default.Object, _core2.default.Guid, _core2.default.GeographyPoint, _core2.default.GeographyLineString, _core2.default.GeographyPolygon, _core2.default.GeographyMultiPoint, _core2.default.GeographyMultiLineString, _core2.default.GeographyMultiPolygon, _core2.default.GeographyCollection, _core2.default.GeometryPoint, _core2.default.GeometryLineString, _core2.default.GeometryPolygon, _core2.default.GeometryMultiPoint, _core2.default.GeometryMultiLineString, _core2.default.GeometryMultiPolygon, _core2.default.GeometryCollection, _core2.default.Byte, _core2.default.SByte, _core2.default.Decimal, _core2.default.Float, _core2.default.Int16, _core2.default.Int32, _core2.default.Int64, _core2.default.Time, _core2.default.DateTimeOffset],
        writable: false
    },
    fieldConverter: { value: _core2.default.IndexedDBConverter },

    supportedAutoincrementKeys: {
        value: {
            '$data.Integer': true,
            '$data.Int32': true,
            '$data.Guid': function $dataGuid() {
                return _core2.default.createGuid();
            }
        }
    },

    _getObjectStoreDefinition: function _getObjectStoreDefinition(setDefinition) {
        var contextStore = {
            storeName: setDefinition.TableName
        };
        var keyFields = setDefinition.PhysicalType.memberDefinitions.getKeyProperties();

        if (0 == keyFields.length) {
            var error = new Error("Entity must have a key field: " + contextStore.storeName);
            error.name = "KeyNotFoundError";
            throw error;
        }
        /*if (1 != keyFields.length) {
            var error = new Error("Entity must have only one key field: " + contextStore.storeName);
            error.name = "MultipleKeysNotSupportedError";
            throw error;
        }*/
        //var keyField = keyFields[0];
        /*for (var i = 0; i < keyFields.length; i++) {
              if (keyFields[i].computed === true &&
                ("$data.Integer" !== Container.resolveName(keyFields[i].type))) {
                var error = new Error("Computed key field must be of integer type: " + contextStore.storeName);
                error.name = "ComputedKeyFieldError";
                throw error;
            }
            if (keyFields.length > 2 && keyFields[i].computed) {
                var error = new Error("With multiple keys the computed field is not allowed: " + contextStore.storeName);
                error.name = "MultipleComputedKeyFieldError";
                throw error;
            }
        }*/

        if (keyFields.length > 2 && keyFields.some(function (memDef) {
            return memDef.computed;
        })) {
            _core.Guard.raise("With multiple keys the computed field is not allowed: " + contextStore.storeName, "MultipleComputedKeyFieldError");
        }

        for (var i = 0; i < keyFields.length; i++) {
            var typeName = _core.Container.resolveName(keyFields[i].type);
            if (keyFields[i].computed && !this.supportedAutoincrementKeys[typeName]) {
                console.log("WARRNING! '" + typeName + "' not supported as computed Key!");
            }
        }

        contextStore.keyFields = keyFields;
        return contextStore;
    },

    _getObjectStoreDefinitions: function _getObjectStoreDefinitions() {
        var objectStoreDefinitions = [];
        var self = this;
        self.context._storageModel.forEach(function (memDef) {
            var objectStoreDefinition = self._getObjectStoreDefinition(memDef);
            objectStoreDefinitions.push(objectStoreDefinition);
        });
        return objectStoreDefinitions;
    },

    _oldCreateDB: function _oldCreateDB(setVersionTran, definitions, onready) {
        var self = this;
        setVersionTran.db.onversionchange = function (event) {
            return event.target.close();
        };

        self._createDB(setVersionTran.db, definitions);
        setVersionTran.oncomplete = onready;
    },
    _createDB: function _createDB(db, definitions) {
        for (var i = 0; i < definitions.length; i++) {
            if (definitions[i].dropIfExists && db.objectStoreNames.contains(definitions[i].storeName)) {
                db.deleteObjectStore(definitions[i].storeName);
            }
        }

        for (var i = 0; i < definitions.length; i++) {
            var storeDef = definitions[i];

            if (!db.objectStoreNames.contains(storeDef.storeName)) {
                var settings = {};
                if (storeDef.keyFields.length == 1) {
                    settings = {
                        keyPath: storeDef.keyFields[0].name
                        //autoIncrement: storeDef.keyFields[0].computed
                    };
                    var typeName = _core.Container.resolveName(storeDef.keyFields[0].type);
                    settings.autoIncrement = this.supportedAutoincrementKeys[typeName] ? true : false;
                } else {
                    settings.key = [];
                    for (var i = 0; i < storeDef.keyFields.length; i++) {
                        settings.key.push(storeDef.keyFields[i].name);
                    }
                }
                db.createObjectStore(storeDef.storeName, settings);
            }
        }
    },
    _hasDbChanges: function _hasDbChanges(db, definitions, dropTabes) {
        var isOriginal = true;
        for (var i = 0; i < definitions.length; i++) {
            isOriginal = isOriginal && db.objectStoreNames.contains(definitions[i].storeName);

            if (dropTabes) {
                definitions[i].dropIfExists = true;
                isOriginal = false;
            }
        }

        return !isOriginal;
    },
    onupgradeneeded: function onupgradeneeded(objectStoreDefinitions) {
        var self = this;
        return function (e) {
            var db = e.target.result;
            db.onversionchange = function (event) {
                return event.target.close();
            };
            var hasTableChanges = self._hasDbChanges(db, objectStoreDefinitions, self.providerConfiguration.dbCreation == _core2.default.storageProviders.DbCreationType.DropAllExistingTables);
            if (hasTableChanges) self._createDB(db, objectStoreDefinitions);
        };
    },

    initializeStore: function initializeStore(callBack) {
        callBack = _core2.default.PromiseHandlerBase.createCallbackSettings(callBack);
        var self = this;

        this.initializeMemoryStore({
            success: function success() {
                var objectStoreDefinitions;
                try {
                    objectStoreDefinitions = self._getObjectStoreDefinitions();
                } catch (e) {
                    console.log(objectStoreDefinitions);
                    callBack.error(e);
                    return;
                }
                self.indexedDB.open(self.providerConfiguration.databaseName).setCallbacks({
                    onsuccess: function onsuccess(e) {
                        var db = e.target.result;
                        db.onversionchange = function (event) {
                            return event.target.close();
                        };

                        var hasTableChanges = self._hasDbChanges(db, objectStoreDefinitions, self.providerConfiguration.dbCreation == _core2.default.storageProviders.DbCreationType.DropAllExistingTables);
                        //oldAPI
                        if (db.setVersion) {
                            if (db.version === "" || hasTableChanges) {
                                db.setVersion((parseInt(db.version) || 0) + 1).setCallbacks({
                                    onsuccess: function onsuccess(e) {
                                        var db = e.target.result;
                                        self._oldCreateDB(db /*setVerTran*/, objectStoreDefinitions, function (e) {
                                            self.db = e.target.db;
                                            callBack.success(self.context);
                                        });
                                    },
                                    onerror: function onerror() {
                                        var v = arguments;
                                    },
                                    onblocked: function onblocked() {
                                        var v = arguments;
                                    }
                                });
                                return;
                            };
                        } else if (hasTableChanges) {
                            //newVersionAPI
                            db.close();
                            var version = parseInt(db.version) + 1;
                            self.indexedDB.open(self.providerConfiguration.databaseName, version).setCallbacks({
                                onsuccess: function onsuccess(e) {
                                    self.db = e.target.result;
                                    callBack.success(self.context);
                                },
                                onupgradeneeded: self.onupgradeneeded(objectStoreDefinitions),
                                onerror: callBack.error,
                                onabort: callBack.error,
                                onblocked: callBack.error
                            });
                            return;
                        }

                        self.db = db;
                        callBack.success(self.context);
                    },
                    //newVersionAPI
                    onupgradeneeded: self.onupgradeneeded(objectStoreDefinitions),
                    onerror: callBack.error,
                    onabort: callBack.error,
                    onblocked: callBack.error
                });
            },
            error: callBack.error
        });
    },
    initializeMemoryStore: function initializeMemoryStore(callBack) {
        callBack = _core2.default.PromiseHandlerBase.createCallbackSettings(callBack);
        var self = this;

        if (self.originalContext && self.providerConfiguration.memoryOperations) {
            self.operationProvider = new self.originalContext({ name: 'InMemory' });
            self.operationProvider.onReady({
                success: function success() {
                    self.supportedBinaryOperators = self.operationProvider.storageProvider.supportedBinaryOperators;
                    self.supportedSetOperations = self.operationProvider.storageProvider.supportedSetOperations;
                    self.supportedFieldOperations = self.operationProvider.storageProvider.supportedFieldOperations;
                    self.supportedUnaryOperators = self.operationProvider.storageProvider.supportedUnaryOperators;
                    callBack.success();
                },
                error: callBack.error
            });
        } else {
            callBack.success();
        }
    },

    _initializeStore: function _initializeStore(callBack) {
        callBack = _core2.default.PromiseHandlerBase.createCallbackSettings(callBack);
        var self = this;

        var initDb = function initDb(db) {
            db.onversionchange = function (event) {
                var ret = event.target.close();
                return ret;
            };
            var newSequences = [];
            self.context._storageModel.forEach(function (memDef) {
                function createStore() {
                    /// <summary>
                    /// Creates a store for 'memDef'
                    /// </summary>
                    var osParam = {};
                    var keySettings = self._getKeySettings(memDef);
                    if (self.newVersionAPI) {
                        if (keySettings.autoIncrement) newSequences.push(memDef.TableName);
                    } else {
                        osParam.autoIncrement = keySettings.autoIncrement;
                    }
                    if (keySettings.keyPath !== undefined) osParam.keyPath = keySettings.keyPath;
                    db.createObjectStore(memDef.TableName, osParam);
                }
                if (db.objectStoreNames.contains(memDef.TableName)) {
                    // ObjectStore already present.
                    if (self.providerConfiguration.dbCreation === _core2.default.storageProviders.DbCreationType.DropAllExistingTables) {
                        // Force drop and recreate object store
                        db.deleteObjectStore(memDef.TableName);
                        createStore();
                    }
                } else {
                    // Store does not exists yet, we need to create it
                    createStore();
                }
            });
            if (newSequences.length > 0 && !db.objectStoreNames.contains(self.sequenceStore)) {
                // Sequence store does not exists yet, we create it
                db.createObjectStore(self.sequenceStore, { keyPath: 'store' });
                newSequences = [];
            }
            return newSequences;
        };
        var newSequences = null;
        // Creating openCallbacks settings for both type of db.open() method
        var openCallbacks = {
            onupgradeneeded: function onupgradeneeded(event) {
                newSequences = initDb(event.target.result);
            },
            onerror: callBack.error,
            onblocked: callBack.error,
            onsuccess: function onsuccess(event) {
                self.db = event.target.result;
                self.db.onversionchange = function (event) {
                    event.target.close();
                };
                if (self.newVersionAPI) {
                    if (newSequences && newSequences.length > 0) {
                        var store = self.db.transaction([self.sequenceStore], self.IDBTransactionType.READ_WRITE).setCallbacks({
                            onerror: callBack.error,
                            oncomplete: function oncomplete() {
                                callBack.success(self.context);
                            }
                        }).objectStore(self.sequenceStore);
                        switch (self.providerConfiguration.dbCreation) {
                            case _core2.default.storageProviders.DbCreationType.DropAllExistingTables:
                            case _core2.default.storageProviders.DbCreationType.DropTableIfChanged:
                                // Clearing all data
                                store.clear();
                                break;
                            default:
                                // Removing data for newly created stores, if they previously existed
                                newSequences.forEach(function (item) {
                                    store['delete'](item);
                                });
                                break;
                        }
                    }
                    callBack.success(self.context);
                } else {
                    // Calling setVersion on webkit
                    var versionRequest = self.db.setVersion(self.providerConfiguration.version.toString()).setCallbacks({
                        onerror: callBack.error,
                        onblocked: callBack.error,
                        onsuccess: function onsuccess(event) {
                            initDb(self.db);
                            versionRequest.result.oncomplete = function (evt) {
                                callBack.success(self.context);
                            };
                        }
                    });
                }
            }
        };
        // For Firefox we need to pass the version here
        if (self.newVersionAPI) self.indexedDB.open(self.providerConfiguration.databaseName, parseInt(self.providerConfiguration.version, 10)).setCallbacks(openCallbacks);else self.indexedDB.open(self.providerConfiguration.databaseName).setCallbacks(openCallbacks);
    },

    executeQuery: function executeQuery(query, callBack) {
        callBack = _core2.default.PromiseHandlerBase.createCallbackSettings(callBack);
        var self = this;

        //var compiledQuery = self._compile(query);

        // Creating read only transaction for query. Results are passed in transaction's oncomplete event
        var entitySet = query.context.getEntitySetFromElementType(query.defaultType);
        var store = self.db.transaction([entitySet.tableName], self.IDBTransactionType.READ_ONLY).setCallbacks({
            onerror: callBack.error,
            onabort: callBack.error,
            oncomplete: function oncomplete(event) {
                if (self.operationProvider) {
                    self.operationProvider.storageProvider.dataSource[entitySet.tableName] = query.rawDataList;
                    self.operationProvider.storageProvider.executeQuery(query, {
                        success: function success(query) {
                            if (query.expression.nodeType === _core2.default.Expressions.ExpressionType.Count) {
                                query.rawDataList[0] = { cnt: query.rawDataList[0] };
                            }
                            callBack.success(query);
                        },
                        error: callBack.error
                    });
                } else {
                    callBack.success(query);
                }
            }
        }).objectStore(entitySet.tableName);
        var modelBinderCompiler = _core.Container.createModelBinderConfigCompiler(query, []);
        modelBinderCompiler.Visit(query.expression);

        if (self.operationProvider) {
            store.openCursor().onsuccess = function (event) {
                // We currently support only toArray() so let's just dump all data
                var cursor = event.target.result;
                if (cursor) {
                    var value = cursor.value;
                    query.rawDataList.push(cursor.value);
                    cursor['continue']();
                }
            };
        } else {
            switch (query.expression.nodeType) {
                case _core2.default.Expressions.ExpressionType.Count:
                    store.count().onsuccess = function (event) {
                        var count = event.target.result;
                        query.rawDataList.push({ cnt: count });
                    };
                    break;
                default:
                    store.openCursor().onsuccess = function (event) {
                        // We currently support only toArray() so let's just dump all data
                        var cursor = event.target.result;
                        if (cursor) {
                            var value = cursor.value;
                            query.rawDataList.push(cursor.value);
                            cursor['continue']();
                        }
                    };
                    break;
            }
        };
    },
    _getKeySettings: function _getKeySettings(memDef) {
        /// <summary>
        /// Gets key settings for item type's member definition
        /// </summary>
        /// <param name="memDef">memDef of item</param>
        /// <returns>KeySettings object</returns>
        var self = this;
        var settings = { autoIncrement: false };
        var keys = [];
        memDef.PhysicalType.memberDefinitions.getPublicMappedProperties().forEach(function (item) {
            if (item.key) {
                // We found a key
                keys.push(item.name);
            }
            if (item.computed) {
                // AutoIncrement field, must be key
                if (!item.key) _core.Guard.raise(new _core.Exception('Only key field can be a computed field!'));

                var typeName = _core.Container.resolveName(item.type);
                if (self.supportedAutoincrementKeys[typeName] === true) {
                    settings.autoIncrement = true;
                }
            }
        });
        if (keys.length > 1) {
            if (settings.autoIncrement) _core.Guard.raise(new _core.Exception('Auto increment is only valid for a single key!'));
            // Setting key fields (composite key)
            settings.keys = keys;
        } else if (keys.length == 1) {
            // Simple key
            settings.keyPath = keys[0];
        } else {
            _core.Guard.raise(new _core.Exception('No valid key found!'));
        }
        return settings;
    },
    saveChanges: function saveChanges(callBack, changedItems) {
        var self = this;
        // Building independent blocks and processing them sequentially
        var independentBlocks = self.buildIndependentBlocks(changedItems);
        function saveNextIndependentBlock() {
            /// <summary>
            /// Saves the next independent block
            /// </summary>
            if (independentBlocks.length === 0) {
                // No more blocks left, calling success callback
                callBack.success();
            } else {
                var KeySettingsCache = function KeySettingsCache() {
                    /// <summary>
                    /// Simple cache for key settings of types
                    /// </summary>
                    var cache = {};
                    this.getSettingsForItem = function (item) {
                        var typeName = item.data.getType().fullName;
                        if (!cache.hasOwnProperty(typeName)) {
                            cache[typeName] = self._getKeySettings(self.context._storageModel.getStorageModel(item.data.getType()));
                        }
                        return cache[typeName];
                    };
                };

                // 'Popping' next block
                var currentBlock = independentBlocks.shift();
                // Collecting stores of items for transaction initialize
                var storesObj = {};
                // Generating physicalData
                var convertedItems = currentBlock.map(function (item) {
                    storesObj[item.entitySet.tableName] = true;
                    item.physicalData = {};
                    item.entitySet.elementType.memberDefinitions.getPublicMappedProperties().forEach(function (memDef) {
                        var typeName = _core.Container.resolveName(memDef.type);
                        if (memDef.key && memDef.computed && item.data[memDef.name] == undefined) {
                            if (typeof self.supportedAutoincrementKeys[typeName] === 'function') {
                                var keyValue = self.supportedAutoincrementKeys[typeName]();
                                item.data[memDef.name] = self.fieldConverter.toDb[typeName](keyValue);
                            } else {
                                // Autogenerated fields for new items should not be present in the physicalData
                                return;
                            }
                        }
                        if (!memDef.inverseProperty && typeof memDef.concurrencyMode === 'undefined' && (memDef.key === true || item.data.entityState === _core2.default.EntityState.Added || item.data.changedProperties && item.data.changedProperties.some(function (def) {
                            return def.name === memDef.name;
                        }))) {
                            if (self.fieldConverter.toDb[typeName]) {
                                item.physicalData[memDef.name] = self.fieldConverter.toDb[typeName](item.data[memDef.name]);
                            } else {
                                var value = item.data[memDef.name];
                                if (value !== undefined) {
                                    value = JSON.parse(JSON.stringify(value));
                                }
                                item.physicalData[memDef.name] = value;
                            }
                        }
                    });
                    return item;
                });
                var stores = [];
                for (var i in storesObj) {
                    stores.push(i);
                }
                var tran = self.db.transaction(stores, self.IDBTransactionType.READ_WRITE).setCallbacks({
                    onerror: function onerror(event) {
                        // Only call the error callback when it's not because of an abort
                        // aborted cases should call the error callback there
                        if (!event.target || !self.IDBDatabaseException || event.target && self.IDBDatabaseException && event.target.errorCode !== self.IDBDatabaseException.ABORT_ERR) callBack.error(event);
                    },
                    oncomplete: function oncomplete(event) {
                        // Moving to next block
                        saveNextIndependentBlock();
                    }
                });

                var ksCache = new KeySettingsCache();
                convertedItems.forEach(function (item) {
                    // Getting store and keysettings for the current item
                    var store = tran.objectStore(item.entitySet.tableName);
                    var keySettings = ksCache.getSettingsForItem(item);
                    // Contains the keys that should be passed for create, update and delete (composite keys)
                    var itemKeys = keySettings.keys && keySettings.keys.map(function (key) {
                        return item.physicalData[key];
                    }) || null;
                    try {
                        var cursorAction = function cursorAction(action) {
                            /// <summary>
                            /// Find the current item in the store, and calls the action on it. Error raised when item was not found
                            /// </summary>
                            /// <param name="action">Action to call on the item</param>
                            var key = keySettings.keyPath ? item.physicalData[keySettings.keyPath] : itemKeys;
                            var data = item.physicalData;
                            store.openCursor(self.IDBKeyRange.only(key)).onsuccess = function (event) {
                                try {
                                    var cursor = event.target.result;
                                    if (cursor) action(cursor, key, data);else _core.Guard.raise(new _core.Exception('Object not found', null, item));
                                } catch (ex) {
                                    tran.abort();
                                    callBack.error(ex);
                                }
                            };
                        };
                        switch (item.data.entityState) {
                            case _core2.default.EntityState.Added:
                                if (!keySettings.keyPath) {
                                    // Item needs explicit keys
                                    store.add(item.physicalData, itemKeys);
                                } else {
                                    store.add(item.physicalData).onsuccess = function (event) {
                                        // Saves the generated key back to the entity
                                        item.data[keySettings.keyPath] = event.target.result;
                                    };
                                }
                                break;
                            case _core2.default.EntityState.Deleted:
                                // Deletes the item
                                cursorAction(function (cursor) {
                                    cursor['delete']();
                                });
                                break;
                            case _core2.default.EntityState.Modified:
                                // Updates the item
                                cursorAction(function (cursor, key, data) {
                                    cursor.update(_core2.default.typeSystem.extend(cursor.value, data));
                                });
                                break;
                            case _core2.default.EntityState.Unchanged:
                                break;
                            default:
                                _core.Guard.raise(new _core.Exception('Not supported entity state', null, item));
                        }
                    } catch (ex) {
                        // Abort on exceptions
                        tran.abort();
                        callBack.error(ex);
                    }
                });
            }
        }
        saveNextIndependentBlock();
    },
    _compile: function _compile(query) {
        var sqlText = _core.Container.createIndexedDBCompiler().compile(query);
        return sqlText;
    }
}, {
    isSupported: {
        get: function get() {
            return _core2.default.__global.indexedDB || _core2.default.__global.webkitIndexedDB || _core2.default.__global.mozIndexedDB || _core2.default.__global.msIndexedDB ? true : false;
        },
        set: function set() {}
    }
});

if (_core2.default.storageProviders.indexedDb.IndexedDBStorageProvider.isSupported) _core2.default.StorageProviderBase.registerProvider('indexedDb', _core2.default.storageProviders.indexedDb.IndexedDBStorageProvider);

},{"jaydata/core":"jaydata/core"}],3:[function(_dereq_,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _core = _dereq_('jaydata/core');

var _core2 = _interopRequireDefault(_core);

var _IndexedDBConverter = _dereq_('./IndexedDBConverter.js');

var _IndexedDBConverter2 = _interopRequireDefault(_IndexedDBConverter);

var _IndexedDBStorageProvider = _dereq_('./IndexedDBStorageProvider.js');

var _IndexedDBStorageProvider2 = _interopRequireDefault(_IndexedDBStorageProvider);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

exports.default = _core2.default;
module.exports = exports['default'];

},{"./IndexedDBConverter.js":1,"./IndexedDBStorageProvider.js":2,"jaydata/core":"jaydata/core"}]},{},[3])(3)
});

