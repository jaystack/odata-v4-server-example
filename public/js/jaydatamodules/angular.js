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

var _angular = (typeof window !== "undefined" ? window['angular'] : typeof global !== "undefined" ? global['angular'] : null);

var _angular2 = _interopRequireDefault(_angular);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

(function () {

    Object.defineProperty(_core2.default.Entity.prototype, "_isNew", {
        get: function get() {
            return !this.storeToken;
        }
    });
    Object.defineProperty(_core2.default.Entity.prototype, "_isDirty", {
        get: function get() {
            return !this._isNew && this.changedProperties && this.changedProperties.length > 0;
        }
    });

    var originalSave = _core2.default.Entity.prototype.save;
    var originalRemove = _core2.default.Entity.prototype.remove;
    var originalSaveChanges = _core2.default.EntityContext.prototype.saveChanges;

    var _getCacheKey = function _getCacheKey(query) {
        var key = query.expression.getJSON();
        var hash = 0,
            i,
            charC;
        if (key.length == 0) return hash;
        for (i = 0; i < key.length; i++) {
            charC = key.charCodeAt(i);
            hash = (hash << 5) - hash + charC;
            hash = hash & hash;
        }
        return hash;
    };

    _angular2.default.module('jaydata', ['ng', ['$provide', function ($provide) {

        $provide.factory('$data', ['$rootScope', '$q', function ($rootScope, $q) {
            var cache = {};

            _core2.default.Entity.prototype.hasOwnProperty = function (propName) {
                var member;
                if (this.getType && this.getType().memberDefinitions) {
                    if (member = this.getType().memberDefinitions['$' + propName]) {
                        return "property" === member.kind && member.enumerable;
                    } else {
                        return false;
                    }
                }
                return Object.prototype.hasOwnProperty.apply(this, arguments);
            };

            _core2.default.Queryable.prototype.toLiveArrayEx = function (options, resultHolder) {
                if (Array.isArray(options)) {
                    resultHolder = options;
                    options = undefined;
                }
                resultHolder = resultHolder || [];
                options = options || {};
                var self = this,
                    scope = options.scope || $rootScope;

                function thunk(newDefer) {
                    self.toArray().then(function (items) {
                        resultHolder.length = 0;
                        items.forEach(function (item) {
                            resultHolder.push(item);
                        });
                        newDefer.resolve(resultHolder);
                    }).fail(newDefer.reject).then(function () {
                        scope.$apply();
                    });
                }

                function refresh() {
                    var defer = _jquery2.default.Deferred(thunk);
                    defer.promise(resultHolder);
                    return resultHolder;
                }
                resultHolder.refresh = refresh;

                return refresh();
            };

            _core2.default.Queryable.prototype.toLiveArray = function (cb) {
                var _this = this;

                var trace = this.toTraceString();
                var cacheKey = _getCacheKey(this); // trace.queryText || trace.sqlText + JSON.stringify(trace.params);

                if (cache[cacheKey]) {
                    return cache[cacheKey];
                }

                var result = [];
                cache[cacheKey] = result;

                result.state = "inprogress";
                result.successHandlers = [];
                result.errorHandlers = [];

                if (cb && typeof cb === 'function') {
                    chainOrFire(cb, "success");
                }

                function chainOrFire(cb, type) {
                    if (!cb) return;
                    var targetCbArr = type === "success" ? result.successHandlers : result.errorHandlers;
                    if (result.state === "completed") {
                        cb(result);
                    } else {
                        targetCbArr.push(cb);
                    }
                    return result;
                }

                result.then = result.success = function (cb) {
                    return chainOrFire(cb, "success");
                };

                result.error = function (cb) {
                    return result;
                };

                result.refresh = function (cb) {
                    //result = [];
                    result.length = 0;
                    result.state = "inprogress";
                    chainOrFire(cb, "success");
                    _this.toArray({ success: result.resolve, error: result.reject });
                    return result;
                };

                result.resolve = function (items) {
                    result.state = "completed";
                    items.forEach(function (item) {
                        result.push(item);
                    });
                    result.successHandlers.forEach(function (handler) {
                        handler(result);
                    });
                    if (!$rootScope.$$phase) $rootScope.$apply();
                };

                result.reject = function (err) {
                    result.state = "failed";
                    result.errorHandlers.forEach(function (handler) {
                        handler(err);
                    });
                    if (!$rootScope.$$phase) $rootScope.$apply();
                };

                this.toArray({ success: result.resolve, error: result.reject });

                return result;
            };

            _core2.default.Entity.prototype.save = function () {
                var _this = this;
                var d = $q.defer();
                originalSave.call(_this).then(function () {
                    cache = {};
                    d.resolve(_this);
                    if (!$rootScope.$$phase) $rootScope.$apply();
                }).fail(function (err) {
                    d.reject(err);
                    if (!$rootScope.$$phase) $rootScope.$apply();
                });
                return d.promise;
            };

            _core2.default.ItemStoreClass.prototype.EntityInstanceSave = function (storeAlias, hint) {
                var self = _core2.default.ItemStore;
                var entity = this;
                return self._getStoreEntitySet(storeAlias, entity).then(function (entitySet) {
                    return self._getSaveMode(entity, entitySet, hint, storeAlias).then(function (mode) {
                        mode = mode || 'add';
                        switch (mode) {
                            case 'add':
                                entitySet.add(entity);
                                break;
                            case 'attach':
                                entitySet.attach(entity, true);
                                entity.entityState = _core2.default.EntityState.Modified;
                                break;
                            default:
                                var d = new _core2.default.PromiseHandler();
                                var callback = d.createCallback();
                                callback.error('save mode not supported: ' + mode);
                                return d.getPromise();
                        }

                        return originalSaveChanges.call(entitySet.entityContext).then(function () {
                            self._setStoreAlias(entity, entitySet.entityContext.storeToken);return entity;
                        });
                    });
                });
            };
            _core2.default.ItemStoreClass.prototype.EntityInstanceRemove = function (storeAlias) {
                var self = _core2.default.ItemStore;
                var entity = this;
                return self._getStoreEntitySet(storeAlias, entity).then(function (entitySet) {
                    entitySet.remove(entity);

                    return originalSaveChanges.call(entitySet.entityContext).then(function () {
                        return entity;
                    });
                });
            };
            _core2.default.ItemStoreClass.prototype.EntityTypeRemoveAll = function (type) {
                return function (storeAlias) {
                    var self = _core2.default.ItemStore;
                    return self._getStoreEntitySet(storeAlias, type).then(function (entitySet) {
                        return entitySet.toArray().then(function (items) {
                            items.forEach(function (item) {
                                entitySet.remove(item);
                            });

                            return originalSaveChanges.call(entitySet.entityContext).then(function () {
                                return items;
                            });
                        });
                    });
                };
            };
            _core2.default.ItemStoreClass.prototype.EntityTypeAddMany = function (type) {
                return function (initDatas, storeAlias) {
                    var self = _core2.default.ItemStore;
                    return self._getStoreEntitySet(storeAlias, type).then(function (entitySet) {
                        var items = entitySet.addMany(initDatas);
                        return originalSaveChanges.call(entitySet.entityContext).then(function () {
                            return items;
                        });
                    });
                };
            };

            _core2.default.Entity.prototype.remove = function () {
                var d = $q.defer();
                var _this = this;
                originalRemove.call(_this).then(function () {
                    cache = {};
                    d.resolve(_this);
                    if (!$rootScope.$$phase) $rootScope.$apply();
                }).fail(function (err) {
                    d.reject(err);
                    if (!$rootScope.$$phase) $rootScope.$apply();
                });

                return d.promise;
            };

            _core2.default.EntityContext.prototype.saveChanges = function () {
                var _this = this;
                var d = $q.defer();
                originalSaveChanges.call(_this).then(function (n) {
                    cache = {};
                    d.resolve(n);
                    if (!$rootScope.$$phase) $rootScope.$apply();
                }).fail(function (err) {
                    d.reject(err);
                    if (!$rootScope.$$phase) $rootScope.$apply();
                });
                return d.promise;
            };
            return _core2.default;
        }]);
    }]]);
})();

exports.default = _core2.default;
module.exports = exports['default'];

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"jaydata/core":"jaydata/core"}]},{},[1])(1)
});

