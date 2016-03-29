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

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

(function ($data, $) {
    var toTemplate = function toTemplate(templateId, targetId, callback) {
        ///<summary></summary>
        ///<param name="templateId" type="string"/>
        ///<param name="targetId" type="string"/>
        ///<param name="callback" type="function"/>

        //Adat tulajdonság jelölése. Akár úgy is mint tmpl-ben: prefix: '\\${', postfix: '}'
        var prefix = '\\${',
            postfix = '}';
        return this.toArray(function (data) {
            var template = document.getElementById(templateId);
            var target = document.getElementById(targetId);
            if (!template || !target) return;

            target.innerHTML = "";
            var regex = new RegExp(prefix + "(.*?)" + postfix, "g");
            var myArray = template.innerHTML.match(regex);
            for (var i = 0; i < data.length; i++) {
                var currTemp = template.innerHTML;
                for (var j = 0; j < myArray.length; j++) {
                    var prop = myArray[j].substring(prefix.replace("\\", "").length, myArray[j].length - postfix.replace("\\", "").length);
                    var root = data[i];
                    var parts = prop.split('.');
                    for (var k = 0; k < parts.length; k++) {
                        if (root) root = root[parts[k]];
                    }
                    currTemp = currTemp.replace(myArray[j], root);
                }
                target.innerHTML += currTemp;
            }

            if (typeof callback == "function") callback(data);
        });
    };
    var tojQueryTemplate = function tojQueryTemplate(templateName, targetSelector, options, callback) {
        ///<summary></summary>
        ///<param name="templateName" type="string"/>
        ///<param name="targetSelector" type="string"/>
        ///<param name="callback" type="function"/>
        return this.toArray(function (data) {
            if ($ && $.tmpl) {
                var templateSource = $(templateName);
                if (templateSource.length) templateSource.tmpl(data, options).appendTo($(targetSelector));else $.tmpl(templateName, data, options).appendTo($(targetSelector));
            }
            if (typeof callback == "function") callback(data);
        });
    };

    $data.Queryable.prototype.toTemplate = $data.Queryable.prototype.toTemplate || toTemplate;
    $data.EntitySet.prototype.toTemplate = $data.EntitySet.prototype.toTemplate || toTemplate;

    if (typeof $ != 'undefined' && typeof $.tmpl != 'undefined') {
        $data.Queryable.prototype.tojQueryTemplate = $data.Queryable.prototype.tojQueryTemplate || tojQueryTemplate;
        $data.EntitySet.prototype.tojQueryTemplate = $data.EntitySet.prototype.tojQueryTemplate || tojQueryTemplate;
    } else {
        $data.Queryable.prototype.tojQueryTemplate = $data.EntitySet.prototype.tojQueryTemplate = function () {
            _core.Guard.raise(new _core.Exception('jQuery and jQuery tmpl plugin is required', 'Not Found!'));
        };
    }
})(_core2.default, _jquery2.default);

exports.default = _core2.default;
module.exports = exports['default'];

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"jaydata/core":"jaydata/core"}]},{},[1])(1)
});

