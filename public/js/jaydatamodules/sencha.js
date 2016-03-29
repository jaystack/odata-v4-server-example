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

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; };

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _core = _dereq_('jaydata/core');

var _core2 = _interopRequireDefault(_core);

var _Ext = (typeof window !== "undefined" ? window['Ext'] : typeof global !== "undefined" ? global['Ext'] : null);

var _Ext2 = _interopRequireDefault(_Ext);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

(function ($data, Ext) {

    $data.Entity.buildExtFields = function (type, config) {
        if (!type.isAssignableTo) return [];

        var fields = type.memberDefinitions.getPublicMappedProperties().map(function (memDef) {
            return memDef.name;
        });

        if (config instanceof $data.Array) {
            config.forEach(function (fieldConfig) {
                if ((typeof fieldConfig === 'undefined' ? 'undefined' : _typeof(fieldConfig)) === 'object' && fieldConfig.name) {
                    var fieldIndex = fields.indexOf(fieldConfig.name);
                    if (fieldIndex >= 0) {
                        fields[fieldIndex] = fieldConfig;
                    } else {
                        fields.push(fieldConfig);
                    }
                }
            });
        }
        return fields;
    };

    Ext.define('Ext.data.proxy.JayData', {
        extend: 'Ext.data.proxy.Server',

        alias: 'proxy.JayData',
        alternateClassName: ['Ext.data.JayData'],

        config: {
            queryable: null
        },

        doRequest: function doRequest(operation, callback, scope) {
            var me = this,
                request = this.buildRequest(operation);

            if (!me.config.queryable) me.processResponse(false, operation, request, null, callback, scope);

            if (operation.getAction() == 'read') return me.doRead(request, operation, callback, scope);

            return request;
        },

        buildRequest: function buildRequest(operation) {
            var me = this,
                params = Ext.applyIf(operation.getParams() || {}, me.getExtraParams() || {}),
                request;

            //copy any sorters, filters etc into the params so they can be sent over the wire
            params = Ext.applyIf(params, me.getParams(operation));

            request = Ext.create('Ext.data.Request', {
                params: params,
                action: operation.getAction(),
                records: operation.getRecords(),
                operation: operation,
                proxy: me
            });

            operation.setRequest(request);

            return request;
        },

        doRead: function doRead(request, operation, callback, scope) {
            var me = this;
            var queryable = me.buildQueryable(operation, me.getQueryable());

            queryable.toArray({
                success: function success(response) {
                    me.processResponse(true, operation, request, response, callback, scope);
                },
                error: function error(response) {
                    me.processResponse(false, operation, request, response, callback, scope);
                }
            });

            return request;
        },

        buildQueryable: function buildQueryable(operation, queryable) {
            if (!queryable) return queryable;

            var filters = operation.getFilters();
            if (filters) {
                filters.forEach(function (filter) {
                    if (filter.config.hasOwnProperty('scope')) queryable = queryable.filter(filter.getFilterFn(), filter.getScope());else if (filter.getProperty() && filter.getValue()) queryable = queryable.filter('it.' + filter.getProperty() + ' == this.value', { value: filter.getValue() });
                });
            }

            var sorters = operation.getSorters();
            if (sorters) {
                sorters.forEach(function (sorter) {
                    var direction = sorter.getDirection() === 'ASC' ? queryable.orderBy : queryable.orderByDescending;
                    if (sorter.getSorterFn()) queryable = direction.call(queryable, sorter.getSorterFn());else queryable = direction.call(queryable, 'it.' + sorter.getProperty());
                });
            }

            var pageNum = operation.getPage();
            var pageLimit = operation.getLimit();
            if (pageNum > 1) queryable = queryable.skip((pageNum - 1) * pageLimit);

            queryable = queryable.take(pageLimit);

            return queryable;
        }

    });
})(_core2.default, _Ext2.default);

exports.default = _core2.default;
module.exports = exports['default'];

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"jaydata/core":"jaydata/core"}]},{},[1])(1)
});

