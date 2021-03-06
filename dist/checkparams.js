(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
    typeof define === 'function' && define.amd ? define(['exports'], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.rem = {}));
}(this, (function (exports) { 'use strict';

    var CONFIG = {};

    var internals = {
      'number': function number(val) {
        if (typeof val === 'undefined') return false;
        if (isNaN(val)) return false;
        return true;
      },
      'required': function required(val) {
        return !!val;
      },
      'string': function string(val) {
        return typeof val === 'string';
      }
    };

    var TRUE_RESULT = Object.freeze({
      pass: true
    });
    var CHECK_FN_CACHE = Object.create(null);
    var RULES_CACHE = new Map();

    var DEFAULT_CONFIG = function DEFAULT_CONFIG() {
      return {
        params: {},
        pages: {}
      };
    };
    /**
     *
     * @param {String} url      接口地址
     * @param {Object} params   接口参数
     */


    var checkParams = function checkParams(url, params) {
      if (CONFIG[url]) {
        try {
          var check = checkFnFactory(url);
          return check(params);
        } catch (e) {
          // uploadLog( location, url, params )
          console.log(e, typeof window !== 'undefined' && window.location, url, params, CONFIG);
          return TRUE_RESULT;
        }
      }

      return TRUE_RESULT;
    };
    /**
     * 动态注入规则( 当前的配置中不包含 url的配置)
     * @param {*} url  需添加校验的url
     * @param {*} config 参考 ./config.js
     */

    var registerAPI = function registerAPI(url, config) {
      if (!CONFIG[url]) {
        CONFIG[url] = config;
      } else {
        console.warn("API[".concat(url, "] has already setted the configuartion"));
      }
    };
    /**
     * 动态扩展 url 的配置
     * @param {*} url  需扩展校验规则的url
     * @param {*} config  参考./config.js里的 params
     * @param {*} isPageLevel  是否以页面为维度的配置
     */

    var extendAPI = function extendAPI(url, config) {
      var isPageLevel = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;

      if (!CONFIG[url]) {
        CONFIG[url] = DEFAULT_CONFIG();
      }

      if (isPageLevel) {
        Object.assign(CONFIG[url].pages, config);
      } else {
        Object.assign(CONFIG[url].params, config);
      } // config changed, and need reset check function


      CHECK_FN_CACHE[url] = null;
    }; // defualt check function

    var RETURN_TRUE = function RETURN_TRUE() {
      console.warn('!!!You use the default check fn');
      return true;
    };
    /**
     * 获取当前页的url pathname
     */


    function getPagePathname() {
      return typeof window === 'undefined' ? '' : window.location.pathname.replace(/(\/[a-z]+)-alias/gi, '$1');
    }
    /**
     * 根据rule获取校验方法
     * @param {Object} rule
     * {
     *  msg: String,  校验不同的提示语
     *  validator: String|Function
     * }
     */


    function getValidator(rule) {
      if (!RULES_CACHE.has(rule)) {
        var validator = rule.validator,
            msg = rule.msg;
        var fn = typeof validator === 'function' ? validator : internals[validator] || RETURN_TRUE;
        RULES_CACHE.set(rule, function () {
          for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
            args[_key] = arguments[_key];
          }

          return {
            pass: fn.apply(null, args),
            msg: msg || ""
          };
        });
      }

      return RULES_CACHE.get(rule);
    }
    /**
     * 获取参数路径
     * @param {String} path  多级的情况，以“.”隔开，例如：'name1' | 'name1.name2'
     */


    function getPathNodes(path) {
      if (typeof path !== 'string' || !path) return [];
      return path.split('.');
    } // generator a check function for the url

    /**
     * 生成某个url的校验方法
     * @param {*} url
     */


    function checkFnFactory() {
      var url = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : '';
      return CHECK_FN_CACHE[url] || (CHECK_FN_CACHE[url] = function (target) {
        var _ref = CONFIG[url] || DEFAULT_CONFIG(),
            _ref$params = _ref.params,
            params = _ref$params === void 0 ? {} : _ref$params,
            _ref$pages = _ref.pages,
            pages = _ref$pages === void 0 ? {} : _ref$pages;

        var page = pages[getPagePathname()] || {};
        var allPaths = Object.assign(Object.assign({}, params), page); // get all path's  check functions

        var rules = [];
        Object.keys(allPaths).forEach(function (path) {
          var pathValues = traverse(getPathNodes(path), target);
          pathValues = Array.isArray(pathValues) ? pathValues : [pathValues]; // get single path's check functions

          allPaths[path].map(function (rule) {
            return getValidator(rule);
          }).forEach(function (validator) {
            pathValues.forEach(function (val) {
              rules.push(function () {
                return validator(val);
              });
            });
          });
        }); // start check ......

        var result = TRUE_RESULT;
        var checkFn = rules[Symbol.iterator]();
        var next = checkFn.next();

        while (typeof next.value === 'function') {
          result = next.value();

          if (result.pass === false) {
            // result.msg && console.log(result.msg)
            break;
          }

          next = checkFn.next();
        }

        return result;
      });
    } // get the values that needs to check

    /**
     * 获取需要校验的值
     * @param {*} path 参数路径 ['name']
     * @param {*} obj  参数对象
     * @return 单个值 ｜ 数组
     */


    function traverse() {
      var path = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [];
      var obj = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
      var curKey,
          curValue = obj;

      var _loop = function _loop(i) {
        curKey = path[i];
        curValue = curValue[curKey];

        if (curValue === undefined || curValue === null && i !== path.length - 1) {
          return "break";
        } else if (Array.isArray(curValue)) {
          // 获取数组的每一项去校验
          curValue = curValue.map(function (item) {
            return traverse(path.slice(i + 1), item);
          }).flat();
          return "break";
        }
      };

      for (var i = 0; i < path.length; i++) {
        var _ret = _loop(i);

        if (_ret === "break") break;
      }

      return curValue;
    }

    exports.checkParams = checkParams;
    exports.extendAPI = extendAPI;
    exports.registerAPI = registerAPI;

    Object.defineProperty(exports, '__esModule', { value: true });

})));
