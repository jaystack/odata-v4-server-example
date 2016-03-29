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

var _jquery = (typeof window !== "undefined" ? window['jQuery'] : typeof global !== "undefined" ? global['jQuery'] : null);

var _jquery2 = _interopRequireDefault(_jquery);

var _Handlebars = (typeof window !== "undefined" ? window['Handlebars'] : typeof global !== "undefined" ? global['Handlebars'] : null);

var _Handlebars2 = _interopRequireDefault(_Handlebars);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

(function ($data, Handlebars, $) {
    var oldProcessor = $data.Entity.inheritedTypeProcessor;
    var templateCache = {};

    function getTemplate(templateName) {
        return templateCache[templateName] || (templateCache[templateName] = templateName[0] === '<' ? Handlebars.compile(templateName) : Handlebars.compile($('#' + templateName).html()));
    }

    function handleBarTemplateCompiler(templateCode) {
        return Handlebars.compile(templateCode);
    }

    function htmlTemplateResolver(type, templateName) {
        if (!templateName) {
            return undefined;
        }
        templateName = templateName.trim();
        return templateName ? templateName[0] === "<" || templateName[0] === "{" ? templateName : undefined : undefined;
    }

    function typeTemplateResolver(type, templateName) {

        //if (!templateName) {
        //    var sname = $data.Container.resolveName(type).split(".");
        //    var name = sname[sname.length - 1];
        //    templateName = name;
        //}
        //var template = getTemplate(templateName);
        return undefined;
    }

    function globalTemplateNameResolver(type, templateName) {
        if (!templateName) {
            var sname = $data.Container.resolveName(type).split(".");
            var name = sname[sname.length - 1];
            templateName = name;
        }
        return $('#' + templateName).html();
    }

    var templateEngine = {
        templateResolvers: [htmlTemplateResolver, typeTemplateResolver, globalTemplateNameResolver],
        templateCompiler: handleBarTemplateCompiler,
        templateCache: {},
        getTemplate: function getTemplate(type, templateName) {
            var template, incache, i;
            var cacheKey = type.fullName + "::" + templateName;
            incache = template = this.templateCache[cacheKey], i = 0;
            while (!template && i < this.templateResolvers.length) {
                template = this.templateResolvers[i++](type, templateName);
            }
            if (template && !incache) {
                template = this.templateCache[cacheKey] = this.templateCompiler(template);
            }
            if (!template) {
                console.log("Can not find template: " + templateName);
            }
            return template;
        }
    };

    $data.templateEngine = templateEngine;

    $data.render = function (data, templateName) {
        if (data instanceof $data.Entity) {
            return data.render(templateName);
        }

        var typeName;
        var item = Array.isArray(data) ? data[0] : data;
        for (var field in item) {
            if (item.hasOwnProperty(field)) {
                typeName += field + "::";
            }
        };
        var type = { fullName: typeName };
        var template = templateEngine.getTemplate(type, templateName);
        return template(data);
    };

    $data.renderItems = function (data, templateName) {
        var result = '';
        for (var i = 0; i < data.length; i++) {
            result += $data.render(data[i], templateName);
        }
        return result;
    };

    //render modes: replace, replaceContent, append, before, after
    $data.renderTo = function (selector, templateName, renderMode) {
        renderMode = renderMode || "replaceContent";

        return function (data) {
            if (renderMode === 'replaceContent') {
                $(selector).empty();
            };

            var result;
            result = $data.render(data, templateName);
            switch (renderMode) {
                case "append":
                case "replaceContent":
                    $(selector).append(result);
                    break;
                case "replace":
                    $(selector).replaceWith(result);
                    break;
                case "after":
                    $(selector).after(result);
                    break;
                case "before":
                    $(selector).before(result);
                    break;
            }

            return data;
        };
    };

    $data.renderItemsTo = function (selector, templateName, renderMode) {
        renderMode = renderMode || "replaceContent";

        return function (data) {
            if (renderMode === 'replaceContent') {
                $(selector).empty();
            };

            var result;
            result = $data.renderItems(data, templateName);
            switch (renderMode) {
                case "append":
                case "replaceContent":
                    $(selector).append(result);
                    break;
                case "replace":
                    $(selector).replaceWith(result);
                    break;
                case "after":
                    $(selector).after(result);
                    break;
                case "before":
                    $(selector).before(result);
                    break;
            }

            return data;
        };
    };

    $data.Entity.inheritedTypeProcessor = function (type) {
        if (oldProcessor) {
            oldProcessor(type);
        }

        function render(item, templateName) {
            var template = templateEngine.getTemplate(type, templateName);
            if (!(item instanceof $data.Entity)) {
                item = new type(item);
            }
            return template(item);
        }

        type.render = render;

        function renderItems(items, templateName) {
            var result = '';
            for (var i = 0; i < items.length; i++) {
                result += render(items[i], templateName);
            }
            return result;
        }

        type.renderItems = renderItems;

        type.addCommand = function (commandName, event, handler, root) {
            root = root || document;
            if (typeof event === 'function') {
                handler = event;
                event = 'click';
            }
            var sname = type.fullName.split(".");
            var name = sname[sname.length - 1];
            var filter = "[data-command='" + commandName + "'][data-type='" + name + "']";
            //alert(filter);
            $(root).delegate(filter, event, function () {
                var self = this;
                var cacheKey = $(this).data("cache-item");
                var entity = getFromCache(cacheKey);
                var args = [entity, $(this).data("id")];
                handler.apply(entity, [entity, self, $(self).data("id")]);
            });
        };

        type.renderTo = function (item, selector, templateName, renderMode) {
            if ((typeof item === 'undefined' ? 'undefined' : _typeof(item)) !== 'object') {
                renderMode = templateName;
                templateName = selector;
                selector = item;
                return type.readAll().then($data.renderTo(selector, templateName, renderMode));
            }
            throw new Error("Not implemented");
        };

        type.renderItemsTo = function (items, selector, templateName, renderMode) {
            if (!Array.isArray(items)) {
                renderMode = templateName;
                templateName = selector;
                selector = items;
                return type.readAll().then($data.renderItemsTo(selector, templateName, renderMode));
            }
            throw new Error("Not implemented");
        };
        //type.renderTo = function (data, selector, template, renderMode) {
        //    $data.renderTo(selector, template, renderMode)(data);
        //}
    };

    $data.Entity.prototype.render = function (templateName) {
        return this.getType().render(this, templateName);
    };

    $data.Entity.prototype.renderTo = function (selector, templateName, renderMode) {
        return $data.renderTo(selector, templateName, renderMode)(this);
    };

    $data.Queryable.prototype.renderTo = function (selector, templateName, renderMode) {
        return this.toArray().then(function (items) {
            return $data.renderTo(selector, templateName, renderMode)(items);
        });
    };

    $data.Queryable.prototype.renderItemsTo = function (selector, templateName, renderMode) {
        return this.toArray().then(function (items) {
            return $data.renderItemsTo(selector, templateName, renderMode)(items);
        });
    };

    Object.defineProperty($data.Entity.prototype, "fields", {
        get: function get() {
            var self = this;
            var results = [];
            this.getType().memberDefinitions.getPublicMappedProperties().forEach(function (md) {
                var name = md.name;
                if (md.kind === "property") {
                    var field = {
                        name: md.name,
                        metadata: md
                    };
                    Object.defineProperty(field, 'value', {
                        get: function get() {
                            return self[name];
                        }
                    });
                    results.push(field);
                }
            });
            return results;
        }
    });

    Handlebars.registerHelper("renderEntity", function (templateName) {
        if (arguments.length < 2) {
            templateName = undefined;
        }
        return new Handlebars.SafeString($data.render(this, templateName));
    });

    $data.displayCache = {};
    var _cacheItemId = 0;
    var _clientId = 0;

    function addToCache(item, clientId) {
        if ('undefined' === typeof clientId) {
            clientId = clientId || _clientId++;
        }
        var key = item.cacheKey;
        if ('undefined' === typeof key) {
            key = item.cacheKey = _cacheItemId++;
            $data.displayCache[item.cacheKey] = {
                value: item,
                references: [clientId]
            };
        } else {
            var value = $data.displayCache[key];
            if (value.references.indexOf(clientId) < 0) {
                value.references.push(clientId);
            }
        }
        return { cacheKey: key, clientId: clientId };
    }
    function getFromCache(cacheKey) {
        return $data.displayCache[cacheKey].value;
    }
    Handlebars.registerHelper("entityScope", function () {

        var sname = $data.Container.resolveName(this.getType()).split(".");
        var name = sname[sname.length - 1];
        var key = this.getType().memberDefinitions.getKeyProperties()[0];
        var id = this[key.name];

        var result = "data-" + name.toLowerCase() + "-" + id;
        var cacheInfo = addToCache(this);
        result += " data-cache-client=" + cacheInfo.clientId;
        result += " data-cache-item=" + cacheInfo.cacheKey;
        return result;
    });

    Handlebars.registerHelper("entityCommand", function (command) {
        var self = this;
        $data.entityCache = $data.entityCache || {};
        var sname = $data.Container.resolveName(this.getType()).split(".");
        var name = sname[sname.length - 1];
        var key = self.getType().memberDefinitions.getKeyProperties()[0];
        var id = self[key.name];
        var entKey = name + ":" + id;

        if (!$data.entityCache[entKey]) {
            $data.entityCache[entKey] = self;
        }
        var result = "data-command=" + command + " data-type=" + name + " data-id=" + id;
        var cacheInfo = addToCache(this);
        result += " data-cache-client=" + cacheInfo.clientId;
        result += " data-cache-item=" + cacheInfo.cacheKey;
        return result;
    });

    $data.setCommandHandler = function (app, root) {
        root = root || document;
        $(root).delegate("[data-command]", "click", function () {
            var entKey = $(this).data("type") + ":" + $(this).data("id");
            var method = app[$(this).data("command") + $(this).data("type")];
            var cacheKey = $(this).data("cache-item");
            var entity = getFromCache(cacheKey);
            var args = [entity, $(this).data("id")];
            method.apply(app, args);
        });
    };

    $(document).delegate(".single-select", "click", function (evt) {
        var result = $(evt.srcElement).parentsUntil(this);
        $(this).children().removeClass("active");
        result.addClass("active");
    });
})(_core2.default, _Handlebars2.default, _jquery2.default);

exports.default = _core2.default;
module.exports = exports['default'];

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"jaydata/core":"jaydata/core"}]},{},[1])(1)
});

