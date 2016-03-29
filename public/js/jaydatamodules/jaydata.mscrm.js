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

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _core = _dereq_('jaydata/core');

var _core2 = _interopRequireDefault(_core);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/* data js patch to support window messaging */
/* will be implemented as customHttpClient in next version */
(function ($data, undefined) {
    var odata = $data.__global.OData;

    odata.originalHttpClient = odata.defaultHttpClient;
    $data.postMessageODataHandler = {
        postMessageHttpClient: {
            targetIframe: undefined,
            request: function request(_request, success, error) {
                var targetIframe = _request.targetIframe || $data.postMessageODataHandler.postMessageHttpClient.targetIframe;
                var targetOrigin = _request.targetOrigin || $data.postMessageODataHandler.postMessageHttpClient.targetOrigin || '*';

                if (targetIframe) {
                    var listener = function listener(event) {
                        $data.Trace.log('in listener');
                        $data.__global.removeEventListener('message', listener);
                        var statusCode = event.data.statusCode;
                        if (statusCode >= 200 && statusCode <= 299) {
                            success(event.data);
                        } else {
                            error(event.data);
                        }
                    };
                    $data.__global.addEventListener('message', listener, false);
                    $data.Trace.log('before post', targetIframe);
                    targetIframe.postMessage(_request, targetOrigin);
                } else {
                    return odata.originalHttpClient.request(_request, success, error);
                }
            }
        },
        requestProxy: function requestProxy(request, success, error) {
            success = request.success || success;
            error = request.error || error;

            delete request.success;
            delete request.error;

            var targetIframe = request.targetIframe || $data.postMessageODataHandler.postMessageHttpClient.targetIframe;
            var targetOrigin = request.targetOrigin || $data.postMessageODataHandler.postMessageHttpClient.targetOrigin || '*';

            if (targetIframe) {
                request.requestProxy = true;
                var listener = function listener(event) {
                    $data.Trace.log('in listener');
                    $data.__global.removeEventListener('message', listener);
                    var statusCode = event.data.statusCode;
                    if (statusCode >= 200 && statusCode <= 299) {
                        success(event.data);
                    } else {
                        error(event.data);
                    }
                };
                $data.__global.addEventListener('message', listener, false);
                $data.Trace.log('before post', targetIframe);
                targetIframe.postMessage(request, targetOrigin);
            } else {
                error({ message: "No iframe detected", request: request, response: undefined });
            }
        }
    };
    odata.defaultHttpClient = $data.postMessageODataHandler.postMessageHttpClient;
})(_core2.default);

(function ($data) {
    $data.MsCrm = {
        disableBatch: true
    };
    $data.MsCrm.Auth = {
        trace: true,
        clientAuthorizationPath: "/WebResources/new_authorize.html",
        messageHandlerPath: "/WebResources/new_postmessage.html",
        login: function do_login(crmUrl, cb, local) {
            var iframe;

            var onMessagehandlerLoaded = function onMessagehandlerLoaded(e) {
                if ($data.MsCrm.Auth.trace) $data.Trace.log("Message received", crmUrl);
                if (e.data.MessageHandlerLoaded) {
                    if ($data.MsCrm.Auth.trace) $data.Trace.log("Message handler loaded", crmUrl);
                    $data.__global.removeEventListener("message", onMessagehandlerLoaded);
                    $data.__global.OData.defaultHttpClient.targetIframe = iframe.contentWindow;
                    cb(iframe.contentWindow, crmUrl);
                }
            };

            var onAuthenticated = function onAuthenticated(e) {
                iframe = document.createElement("iframe");
                if (e.data.Authenticated) {
                    $data.Trace.log("Logged in to CRM: " + crmUrl);
                    $data.__global.removeEventListener("message", onAuthenticated);
                    $data.__global.addEventListener("message", onMessagehandlerLoaded);
                    var url = local ? "postmessage.html" : crmUrl + $data.MsCrm.Auth.messageHandlerPath;
                    iframe.src = url;
                    iframe.style.display = "none";
                    document.body.appendChild(iframe);
                }
            };
            $data.__global.addEventListener("message", onAuthenticated);
            var url = local ? "authorize.html" : crmUrl + $data.MsCrm.Auth.clientAuthorizationPath;
            url = url;
            var w = $data.__global.open(url, "_blank", "resizable=false,location=0,menubar=0,toolbar=0,width=400,height=600");
        }

    };
    $data.MsCrm.init = function (crmAddress, contextType, cb) {
        var config = {};
        if ((typeof crmAddress === 'undefined' ? 'undefined' : _typeof(crmAddress)) === 'object' && crmAddress) {
            config = crmAddress;
            crmAddress = config.url;
            delete config.url;
        }
        var serviceUrl = crmAddress + '/XRMServices/2011/OrganizationData.svc';

        if ($data.__global.location.href.indexOf(crmAddress) > -1) {
            initContext();
        } else {
            $data.MsCrm.Auth.login(crmAddress, function () {
                initContext();
            });
        }

        function initContext() {
            if (!(contextType.isAssignableTo && contextType.isAssignableTo($data.EntityContext))) {
                cb = contextType;
                config.disableBatch = $data.MsCrm.disableBatch;
                $data.service(serviceUrl, config, function (factory) {
                    var ctx = factory();
                    ctx.onReady().then(function () {
                        cb(ctx, factory);
                    });
                });
            } else {
                var ctx;

                (function () {
                    var factory = function factory() {
                        return new contextType({ name: 'oData', oDataServiceHost: serviceUrl, disableBatch: $data.MsCrm.disableBatch });
                    };

                    ctx = factory();

                    ctx.onReady().then(function () {
                        cb(ctx, factory);
                    });
                })();
            }
        }
    };
})(_core2.default);

exports.default = _core2.default;
module.exports = exports['default'];

},{"jaydata/core":"jaydata/core"}]},{},[1])(1)
});

