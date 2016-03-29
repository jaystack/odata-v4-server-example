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

/* Base: http://bitovi.com/blog/2010/06/convert-form-elements-to-javascript-object-literals-with-jquery-formBinder-plugin.html */
(function ($) {
    var radioCheck = /radio|checkbox/i,
        keyBreaker = /[^\[\]]+/g,
        numberMatcher = /^[\-+]?[0-9]*\.?[0-9]+([eE][\-+]?[0-9]+)?$/;

    var isNumber = function isNumber(value) {
        if (typeof value == 'number') {
            return true;
        }

        if (typeof value != 'string') {
            return false;
        }

        return value.match(numberMatcher);
    };

    $.fn.extend({
        /**
        * @parent dom
        * @download http://jmvcsite.heroku.com/pluginify?plugins[]=jquery/dom/form_params/form_params.js
        * @plugin jquery/dom/form_params
        * @test jquery/dom/form_params/qunit.html
        * <p>Returns an object of name-value pairs that represents values in a form.
        * It is able to nest values whose element's name has square brackets. </p>
        * Example html:
        * @codestart html
        * &lt;form>
        *   &lt;input name="foo[bar]" value='2'/>
        *   &lt;input name="foo[ced]" value='4'/>
        * &lt;form/>
        * @codeend
        * Example code:
        * @codestart
        * $('form').formBinder() //-> { foo:{bar:2, ced: 4} }
        * @codeend
        *
        * @demo jquery/dom/form_params/form_params.html
        *
        * @param {Boolean} [convert] True if strings that look like numbers and booleans should be converted.  Defaults to true.
        * @return {Object} An object of name-value pairs.
        */
        formBinder: function formBinder(obj, convert) {
            if (this[0].nodeName.toLowerCase() == 'form' && this[0].elements) {

                return (0, _jquery2.default)(_jquery2.default.makeArray(this[0].elements)).getParams(obj, convert);
            }
            return (0, _jquery2.default)("input[name], textarea[name], select[name]", this[0]).getParams(obj, convert);
        },
        getParams: function getParams(obj, convert) {
            var data = obj || {},
                current;

            convert = convert === undefined ? true : convert;

            this.each(function () {
                var el = this,
                    type = el.type && el.type.toLowerCase();
                //if we are submit, ignore
                if (type == 'submit' || !el.name) {
                    return;
                }

                var key = el.name,
                    value = $.data(el, "value") || $.fn.val.call([el]),
                    isRadioCheck = radioCheck.test(el.type),
                    parts = key.match(keyBreaker),
                    write = !isRadioCheck || !!el.checked,

                //make an array of values
                lastPart;

                if (convert) {
                    if (isNumber(value)) {
                        value = parseFloat(value);
                    } else if (value === 'true' || value === 'false') {
                        value = Boolean(value);
                    }
                }

                // go through and create nested objects
                current = data;
                for (var i = 0; i < parts.length - 1; i++) {
                    if (!current[parts[i]]) {
                        current[parts[i]] = {};
                    }
                    current = current[parts[i]];
                }
                lastPart = parts[parts.length - 1];

                //now we are on the last part, set the value
                if (lastPart in current && type === "checkbox") {
                    if (!$.isArray(current[lastPart])) {
                        current[lastPart] = current[lastPart] === undefined ? [] : [current[lastPart]];
                    }
                    if (write) {
                        current[lastPart].push(value);
                    }
                } else if (write || !current[lastPart]) {
                    current[lastPart] = write ? value : undefined;
                }
            });
            return data;
        }
    });
})(_jquery2.default);

exports.default = _core2.default;
module.exports = exports['default'];

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"jaydata/core":"jaydata/core"}]},{},[1])(1)
});

