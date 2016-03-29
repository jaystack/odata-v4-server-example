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

var _ko = (typeof window !== "undefined" ? window['ko'] : typeof global !== "undefined" ? global['ko'] : null);

var _ko2 = _interopRequireDefault(_ko);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

(function ($data) {

    /*converters*/
    Object.keys($data.Container.converters.to).forEach(function (typeName) {
        var origConverter = $data.Container.converters.to[typeName] ? $data.Container.converters.to[typeName]['$data.Function'] || $data.Container.converters.to[typeName]['default'] : undefined;
        $data.Container.registerConverter(typeName, '$data.Function', function (value) {
            if (_ko2.default.isObservable(value)) {
                return value;
            } else if (origConverter) {
                return origConverter.apply($data.Container.converters[typeName], arguments);
            } else {
                _core.Guard.raise(new _core.Exception('Type Error', 'value is not koObservable', value));
            }
        });
    });

    function ObservableFactory(originalType, observableClassNem) {
        var instanceDefinition = {
            constructor: function constructor() {
                var _this = this;

                _this.getEntity().propertyChanged.attach(function (sender, val) {
                    if (_this[val.propertyName]() !== val.newValue) {
                        _this[val.propertyName](val.newValue);
                    }
                });
            },

            retrieveProperty: function retrieveProperty(memberDefinition) {
                var _this = this;
                var propertyName = memberDefinition.name;
                var backingFieldName = "_" + propertyName;

                if (!_this[backingFieldName]) {
                    var koProperty = new _ko2.default.observable(_this.getEntity()[propertyName]);

                    koProperty.subscribe(function (val) {
                        _this.getEntity()[propertyName] = val;
                    });

                    _this[backingFieldName] = koProperty;
                }

                return _this[backingFieldName];
            },
            storeProperty: function storeProperty(memberDefinition, value) {},
            equalityComparers: { type: $data.Object }
        };

        var properties = originalType.memberDefinitions.getPublicMappedProperties();
        for (var i = 0, l = properties.length; i < l; i++) {
            var propName = properties[i].name;
            instanceDefinition[propName] = {
                type: _ko2.default.observable
            };
            instanceDefinition["ValidationErrors"] = {
                type: _ko2.default.observable
            };
        }

        $data.Class.defineEx(observableClassNem, [{ type: $data.KoObservableEntity, params: [new $data.Class.ConstructorParameter(0), function () {
                return originalType;
            }] }], null, instanceDefinition, {
            isWrappedType: function isWrappedType(type) {
                return type === originalType;
            }
        });
    };

    if (typeof _ko2.default !== 'undefined') {
        var ieVersion;
        var prVisitor;
        var qecVisitConstantExpression;
        var qecVisitCodeExpression;
        var qecVisit;
        var esExecuteQuery;
        var queryableToArray;

        (function () {
            var ensureDropdownSelectionIsConsistentWithModelValue = function ensureDropdownSelectionIsConsistentWithModelValue(element, modelValue, preferModelValue) {
                if (preferModelValue) {
                    if (modelValue !== _ko2.default.selectExtensions.readValue(element)) _ko2.default.selectExtensions.writeValue(element, modelValue);
                }

                // No matter which direction we're syncing in, we want the end result to be equality between dropdown value and model value.
                // If they aren't equal, either we prefer the dropdown value, or the model value couldn't be represented, so either way,
                // change the model value to match the dropdown.
                if (modelValue !== _ko2.default.selectExtensions.readValue(element)) _ko2.default.utils.triggerEvent(element, "change");
            };

            /* Observable Query*/

            var checkObservableValue = function checkObservableValue(expression, context) {
                if (expression instanceof $data.Expressions.ConstantExpression && _ko2.default.isObservable(expression.value)) {
                    context.some(function (item) {
                        if (item.observable === expression.value) {
                            item.skipExecute = true;
                        }
                    });
                    context.push({
                        observable: expression.value,
                        skipExecute: false
                    });
                    var observableValue = expression.value();
                    return _core.Container.createConstantExpression(observableValue, _core.Container.getTypeName(observableValue), expression.name + '$Observable');
                }
                return expression;
            };

            //$data.Expressions.ParameterResolverVisitor.prototype.resolvedObservables = [];

            // custom bindings

            ieVersion = function () {
                var version = 3,
                    div = document.createElement('div'),
                    iElems = div.getElementsByTagName('i');

                // Keep constructing conditional HTML blocks until we hit one that resolves to an empty fragment
                while (div.innerHTML = '<!--[if gt IE ' + ++version + ']><i></i><![endif]-->', iElems[0]) {};
                return version > 4 ? version : undefined;
            }();

            _ko2.default.utils.ensureSelectElementIsRenderedCorrectly = function (selectElement) {
                // Workaround for IE9 rendering bug - it doesn't reliably display all the text in dynamically-added select boxes unless you force it to re-render by updating the width.
                // (See https://github.com/SteveSanderson/knockout/issues/312, http://stackoverflow.com/questions/5908494/select-only-shows-first-char-of-selected-option)
                if (ieVersion >= 9) {
                    var originalWidth = selectElement.style.width;
                    selectElement.style.width = 0;
                    selectElement.style.width = originalWidth;
                }
            };

            _ko2.default.utils.setOptionNodeSelectionState = function (optionNode, isSelected) {
                // IE6 sometimes throws "unknown error" if you try to write to .selected directly, whereas Firefox struggles with setAttribute. Pick one based on browser.
                if (navigator.userAgent.indexOf("MSIE 6") >= 0) optionNode.setAttribute("selected", isSelected);else optionNode.selected = isSelected;
            };

            _ko2.default.utils.setTextContent = function (element, textContent) {
                var value = _ko2.default.utils.unwrapObservable(textContent);
                if (value === null || value === undefined) value = "";

                'innerText' in element ? element.innerText = value : element.textContent = value;

                if (ieVersion >= 9) {
                    // Believe it or not, this actually fixes an IE9 rendering bug
                    // (See https://github.com/SteveSanderson/knockout/issues/209)
                    element.style.display = element.style.display;
                }
            };

            ;

            _ko2.default.bindingHandlers['options'] = {
                'update': function update(element, valueAccessor, allBindingsAccessor) {
                    if (element.tagName.toLowerCase() !== "select") throw new Error("options binding applies only to SELECT elements");

                    var selectWasPreviouslyEmpty = element.length == 0;
                    var previousSelectedValues = _ko2.default.utils.arrayMap(_ko2.default.utils.arrayFilter(element.childNodes, function (node) {
                        return node.tagName && node.tagName.toLowerCase() === "option" && node.selected;
                    }), function (node) {
                        return _ko2.default.selectExtensions.readValue(node) || node.innerText || node.textContent;
                    });
                    var previousScrollTop = element.scrollTop;

                    var value = _ko2.default.utils.unwrapObservable(valueAccessor());
                    var selectedValue = element.value;

                    // Remove all existing <option>s.
                    // Need to use .remove() rather than .removeChild() for <option>s otherwise IE behaves oddly (https://github.com/SteveSanderson/knockout/issues/134)
                    while (element.length > 0) {
                        _ko2.default.cleanNode(element.options[0]);
                        element.remove(0);
                    }

                    if (value) {
                        var allBindings = allBindingsAccessor();
                        if (typeof value.length != "number") value = [value];
                        if (allBindings['optionsCaption']) {
                            var option = document.createElement("option");
                            _ko2.default.utils.setHtml(option, allBindings['optionsCaption']);
                            _ko2.default.selectExtensions.writeValue(option, allBindings['optionsCaptionValue'] || undefined);
                            element.appendChild(option);
                        }
                        for (var i = 0, j = value.length; i < j; i++) {
                            var option = document.createElement("option");

                            // Apply a value to the option element
                            var optionValue = typeof allBindings['optionsValue'] == "string" ? value[i][allBindings['optionsValue']] : value[i];
                            optionValue = _ko2.default.utils.unwrapObservable(optionValue);
                            _ko2.default.selectExtensions.writeValue(option, optionValue);

                            // Apply some text to the option element
                            var optionsTextValue = allBindings['optionsText'];
                            var optionText;
                            if (typeof optionsTextValue == "function") optionText = optionsTextValue(value[i]); // Given a function; run it against the data value
                            else if (typeof optionsTextValue == "string") optionText = value[i][optionsTextValue]; // Given a string; treat it as a property name on the data value
                                else optionText = optionValue; // Given no optionsText arg; use the data value itself
                            if (optionText === null || optionText === undefined) optionText = "";

                            _ko2.default.utils.setTextContent(option, optionText);

                            element.appendChild(option);
                        }

                        // IE6 doesn't like us to assign selection to OPTION nodes before they're added to the document.
                        // That's why we first added them without selection. Now it's time to set the selection.
                        var newOptions = element.getElementsByTagName("option");
                        var countSelectionsRetained = 0;
                        for (var i = 0, j = newOptions.length; i < j; i++) {
                            if (_ko2.default.utils.arrayIndexOf(previousSelectedValues, _ko2.default.selectExtensions.readValue(newOptions[i])) >= 0) {
                                _ko2.default.utils.setOptionNodeSelectionState(newOptions[i], true);
                                countSelectionsRetained++;
                            }
                        }

                        element.scrollTop = previousScrollTop;

                        if (selectWasPreviouslyEmpty && 'value' in allBindings) {
                            // Ensure consistency between model value and selected option.
                            // If the dropdown is being populated for the first time here (or was otherwise previously empty),
                            // the dropdown selection state is meaningless, so we preserve the model value.
                            ensureDropdownSelectionIsConsistentWithModelValue(element, _ko2.default.utils.unwrapObservable(allBindings['value']), /* preferModelValue */true);
                        }

                        // Workaround for IE9 bug
                        _ko2.default.utils.ensureSelectElementIsRenderedCorrectly(element);
                    }
                }
            };
            _ko2.default.bindingHandlers['options'].optionValueDomDataKey = '__ko.optionValueDomData__';prVisitor = $data.Expressions.ParameterResolverVisitor.prototype.VisitProperty;

            $data.Expressions.ParameterResolverVisitor.prototype.VisitProperty = function (eNode, context) {
                var expression = prVisitor.call(this, eNode, context);
                this.resolvedObservables = this.resolvedObservables || [];
                return checkObservableValue(expression, this.resolvedObservables);
            };

            qecVisitConstantExpression = $data.Expressions.QueryExpressionCreator.prototype.VisitConstantExpression;

            $data.Expressions.QueryExpressionCreator.prototype.VisitConstantExpression = function (expression, context) {
                if (qecVisitConstantExpression) expression = qecVisitConstantExpression.call(this, expression, context);

                return checkObservableValue(expression, this.resolvedObservables);
            };

            //$data.Expressions.QueryExpressionCreator.prototype.resolvedObservables = [];
            qecVisitCodeExpression = $data.Expressions.QueryExpressionCreator.prototype.VisitCodeExpression;

            $data.Expressions.QueryExpressionCreator.prototype.VisitCodeExpression = function (expression, context) {
                ///<summary>Converts the CodeExpression into an EntityExpression</summary>
                ///<param name="expression" type="$data.Expressions.CodeExpression" />
                var source = expression.source.toString();
                var jsCodeTree = _core.Container.createCodeParser(this.scopeContext).createExpression(source);
                this.scopeContext.log({ event: "JSCodeExpression", data: jsCodeTree });

                //TODO rename classes to reflex variable names
                //TODO engage localValueResolver here
                //var globalVariableResolver = Container.createGlobalContextProcessor($data.__global);
                var constantResolver = _core.Container.createConstantValueResolver(expression.parameters, $data.__global, this.scopeContext);
                var parameterProcessor = _core.Container.createParameterResolverVisitor();

                jsCodeTree = parameterProcessor.Visit(jsCodeTree, constantResolver);

                //added
                this.resolvedObservables = (this.resolvedObservables || []).concat(parameterProcessor.resolvedObservables);

                this.scopeContext.log({ event: "JSCodeExpressionResolved", data: jsCodeTree });
                var code2entity = _core.Container.createCodeToEntityConverter(this.scopeContext);

                ///user provided query parameter object (specified as thisArg earlier) is passed in
                var entityExpression = code2entity.Visit(jsCodeTree, { queryParameters: expression.parameters, lambdaParameters: this.lambdaTypes, frameType: context.frameType });

                ///parameters are referenced, ordered and named, also collected in a flat list of name value pairs
                var result = _core.Container.createParametricQueryExpression(entityExpression, code2entity.parameters);
                this.scopeContext.log({ event: "EntityExpression", data: entityExpression });

                return result;
            };

            qecVisit = $data.Expressions.QueryExpressionCreator.prototype.Visit;

            $data.Expressions.QueryExpressionCreator.prototype.Visit = function (expression, context) {

                var expressionRes;
                if (expression instanceof $data.Expressions.FrameOperator) {
                    this.resolvedObservables = [];
                    var expressionRes = qecVisit.call(this, expression, context);

                    expressionRes.observables = this.resolvedObservables;
                    expressionRes.baseExpression = expression;
                } else {
                    expressionRes = qecVisit.call(this, expression, context);
                }
                return expressionRes;
            };

            esExecuteQuery = $data.EntityContext.prototype.executeQuery;

            $data.EntityContext.prototype.executeQuery = function (expression, on_ready, transaction) {
                var self = this;
                var observables = expression.expression.observables;
                if (observables && observables.length > 0) {
                    observables.forEach(function (obsObj) {
                        if (!obsObj) return;

                        obsObj.observable.subscribe(function () {
                            if (!obsObj.skipExecute) {
                                var preparator = _core.Container.createQueryExpressionCreator(self);
                                var newExpression = preparator.Visit(expression.expression.baseExpression);

                                esExecuteQuery.call(self, _core.Container.createQueryable(expression, newExpression), on_ready, transaction);
                            }
                        });
                    });
                }

                esExecuteQuery.call(self, expression, on_ready, transaction);
            };

            /* Observable Query End*/

            /* Observable entities */
            $data.EntityWrapper.extend('$data.KoObservableEntity', {
                constructor: function constructor(innerData, wrappedType) {
                    if (!(wrappedType && wrappedType.isAssignableTo && wrappedType.isAssignableTo($data.Entity))) {
                        _core.Guard.raise(new _core.Exception("Type: '" + wrappedType + "' is not assignable to $data.Entity"));
                    }

                    var innerInstance;
                    if (innerData instanceof wrappedType) {
                        innerInstance = innerData;
                    } else if (innerData instanceof $data.Entity) {
                        _core.Guard.raise(new _core.Exception("innerData is instance of '$data.Entity' instead of '" + wrappedType.fullName + "'"));
                    } else {
                        innerInstance = new wrappedType(innerData);
                    }

                    this._wrappedType = wrappedType;
                    this.innerInstance = innerInstance;
                },
                getEntity: function getEntity() {
                    return this.innerInstance;
                },
                updateEntity: function updateEntity(entity) {
                    var data;
                    if (entity instanceof this._wrappedType) data = entity;else if (entity && !(entity instanceof $data.Entity) && entity instanceof $data.Object) data = entity;else _core.Guard.raise('entity is an invalid object');

                    var members = this._wrappedType.memberDefinitions.getPublicMappedProperties();
                    for (var i = 0; i < members.length; i++) {
                        var memDef = members[i];
                        if (data[memDef.name] !== undefined) {
                            this[memDef.name](data[memDef.name]);
                            var idx = this.innerInstance.changedProperties.indexOf(memDef);
                            if (idx >= 0) this.innerInstance.changedProperties.splice(idx, 1);
                        }
                    }
                },

                getProperties: function getProperties() {
                    //todo cache!
                    var self = this;
                    var props = this.innerInstance.getType().memberDefinitions.getPublicMappedProperties();
                    //todo remove map
                    var koData = props.map(function (memberInfo) {
                        return {
                            type: memberInfo.type,
                            name: memberInfo.name,
                            owner: self,
                            metadata: memberInfo,
                            value: self[memberInfo.name]
                        };
                    });
                    return koData;
                }
            });

            $data.Entity.prototype.asKoObservable = function () {
                var type = this.getType();
                var observableTypeName = type.namespace + '.Observable' + type.name;
                if (!_core.Container.isTypeRegistered(observableTypeName)) {
                    ObservableFactory(type, observableTypeName);
                }
                var observableType = _core.Container.resolveType(observableTypeName);

                if (!observableType.isWrappedType(type)) {
                    ObservableFactory(type, observableTypeName);
                    observableType = _core.Container.resolveType(observableTypeName);
                }

                return new observableType(this);
            };

            queryableToArray = $data.Queryable.prototype.toArray;

            $data.Queryable.prototype.toArray = function (onResult_items, transaction) {
                if (_ko2.default.isObservable(onResult_items)) {
                    if (typeof onResult_items.push !== 'undefined') {
                        var callBack = $data.PromiseHandlerBase.createCallbackSettings();

                        return this.toArray(function (results, tran) {
                            onResult_items([]);
                            results.forEach(function (result, idx) {
                                if (result instanceof $data.Entity) {
                                    onResult_items.push(result.asKoObservable());
                                } else {
                                    callBack.error('Not Implemented: Observable result has anonymous objects');
                                }
                            });
                        }, transaction);
                    } else {
                        return queryableToArray.call(this, function (result, tran) {
                            onResult_items(result);
                        }, transaction);
                    }
                } else {
                    return queryableToArray.call(this, onResult_items, transaction);
                }
            };
            /* Observable entities End*/
        })();
    } else {
            var requiredError = function requiredError() {
                _core.Guard.raise(new _core.Exception('Knockout js is required', 'Not Found!'));
            };

            $data.Entity.prototype.asKoObservable = requiredError;
        }
})(_core2.default);

exports.default = _core2.default;
module.exports = exports['default'];

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"jaydata/core":"jaydata/core"}]},{},[1])(1)
});

