(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var Tracker = Package.tracker.Tracker;
var Deps = Package.tracker.Deps;
var _ = Package.underscore._;
var HTML = Package.htmljs.HTML;
var ObserveSequence = Package['observe-sequence'].ObserveSequence;
var ReactiveVar = Package['reactive-var'].ReactiveVar;

/* Package-scope variables */
var Blaze, UI, Handlebars;

(function () {

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/blaze/preamble.js                                                                                          //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
/**                                                                                                                    // 1
 * @namespace Blaze                                                                                                    // 2
 * @summary The namespace for all Blaze-related methods and classes.                                                   // 3
 */                                                                                                                    // 4
Blaze = {};                                                                                                            // 5
                                                                                                                       // 6
// Utility to HTML-escape a string.  Included for legacy reasons.                                                      // 7
Blaze._escape = (function() {                                                                                          // 8
  var escape_map = {                                                                                                   // 9
    "<": "&lt;",                                                                                                       // 10
    ">": "&gt;",                                                                                                       // 11
    '"': "&quot;",                                                                                                     // 12
    "'": "&#x27;",                                                                                                     // 13
    "`": "&#x60;", /* IE allows backtick-delimited attributes?? */                                                     // 14
    "&": "&amp;"                                                                                                       // 15
  };                                                                                                                   // 16
  var escape_one = function(c) {                                                                                       // 17
    return escape_map[c];                                                                                              // 18
  };                                                                                                                   // 19
                                                                                                                       // 20
  return function (x) {                                                                                                // 21
    return x.replace(/[&<>"'`]/g, escape_one);                                                                         // 22
  };                                                                                                                   // 23
})();                                                                                                                  // 24
                                                                                                                       // 25
Blaze._warn = function (msg) {                                                                                         // 26
  msg = 'Warning: ' + msg;                                                                                             // 27
                                                                                                                       // 28
  if ((typeof Log !== 'undefined') && Log && Log.warn)                                                                 // 29
    Log.warn(msg); // use Meteor's "logging" package                                                                   // 30
  else if ((typeof console !== 'undefined') && console.log)                                                            // 31
    console.log(msg);                                                                                                  // 32
};                                                                                                                     // 33
                                                                                                                       // 34
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function () {

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/blaze/exceptions.js                                                                                        //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
var debugFunc;                                                                                                         // 1
                                                                                                                       // 2
// We call into user code in many places, and it's nice to catch exceptions                                            // 3
// propagated from user code immediately so that the whole system doesn't just                                         // 4
// break.  Catching exceptions is easy; reporting them is hard.  This helper                                           // 5
// reports exceptions.                                                                                                 // 6
//                                                                                                                     // 7
// Usage:                                                                                                              // 8
//                                                                                                                     // 9
// ```                                                                                                                 // 10
// try {                                                                                                               // 11
//   // ... someStuff ...                                                                                              // 12
// } catch (e) {                                                                                                       // 13
//   reportUIException(e);                                                                                             // 14
// }                                                                                                                   // 15
// ```                                                                                                                 // 16
//                                                                                                                     // 17
// An optional second argument overrides the default message.                                                          // 18
                                                                                                                       // 19
// Set this to `true` to cause `reportException` to throw                                                              // 20
// the next exception rather than reporting it.  This is                                                               // 21
// useful in unit tests that test error messages.                                                                      // 22
Blaze._throwNextException = false;                                                                                     // 23
                                                                                                                       // 24
Blaze._reportException = function (e, msg) {                                                                           // 25
  if (Blaze._throwNextException) {                                                                                     // 26
    Blaze._throwNextException = false;                                                                                 // 27
    throw e;                                                                                                           // 28
  }                                                                                                                    // 29
                                                                                                                       // 30
  if (! debugFunc)                                                                                                     // 31
    // adapted from Tracker                                                                                            // 32
    debugFunc = function () {                                                                                          // 33
      return (typeof Meteor !== "undefined" ? Meteor._debug :                                                          // 34
              ((typeof console !== "undefined") && console.log ? console.log :                                         // 35
               function () {}));                                                                                       // 36
    };                                                                                                                 // 37
                                                                                                                       // 38
  // In Chrome, `e.stack` is a multiline string that starts with the message                                           // 39
  // and contains a stack trace.  Furthermore, `console.log` makes it clickable.                                       // 40
  // `console.log` supplies the space between the two arguments.                                                       // 41
  debugFunc()(msg || 'Exception caught in template:', e.stack || e.message);                                           // 42
};                                                                                                                     // 43
                                                                                                                       // 44
Blaze._wrapCatchingExceptions = function (f, where) {                                                                  // 45
  if (typeof f !== 'function')                                                                                         // 46
    return f;                                                                                                          // 47
                                                                                                                       // 48
  return function () {                                                                                                 // 49
    try {                                                                                                              // 50
      return f.apply(this, arguments);                                                                                 // 51
    } catch (e) {                                                                                                      // 52
      Blaze._reportException(e, 'Exception in ' + where + ':');                                                        // 53
    }                                                                                                                  // 54
  };                                                                                                                   // 55
};                                                                                                                     // 56
                                                                                                                       // 57
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function () {

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/blaze/view.js                                                                                              //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
/// [new] Blaze.View([name], renderMethod)                                                                             // 1
///                                                                                                                    // 2
/// Blaze.View is the building block of reactive DOM.  Views have                                                      // 3
/// the following features:                                                                                            // 4
///                                                                                                                    // 5
/// * lifecycle callbacks - Views are created, rendered, and destroyed,                                                // 6
///   and callbacks can be registered to fire when these things happen.                                                // 7
///                                                                                                                    // 8
/// * parent pointer - A View points to its parentView, which is the                                                   // 9
///   View that caused it to be rendered.  These pointers form a                                                       // 10
///   hierarchy or tree of Views.                                                                                      // 11
///                                                                                                                    // 12
/// * render() method - A View's render() method specifies the DOM                                                     // 13
///   (or HTML) content of the View.  If the method establishes                                                        // 14
///   reactive dependencies, it may be re-run.                                                                         // 15
///                                                                                                                    // 16
/// * a DOMRange - If a View is rendered to DOM, its position and                                                      // 17
///   extent in the DOM are tracked using a DOMRange object.                                                           // 18
///                                                                                                                    // 19
/// When a View is constructed by calling Blaze.View, the View is                                                      // 20
/// not yet considered "created."  It doesn't have a parentView yet,                                                   // 21
/// and no logic has been run to initialize the View.  All real                                                        // 22
/// work is deferred until at least creation time, when the onViewCreated                                              // 23
/// callbacks are fired, which happens when the View is "used" in                                                      // 24
/// some way that requires it to be rendered.                                                                          // 25
///                                                                                                                    // 26
/// ...more lifecycle stuff                                                                                            // 27
///                                                                                                                    // 28
/// `name` is an optional string tag identifying the View.  The only                                                   // 29
/// time it's used is when looking in the View tree for a View of a                                                    // 30
/// particular name; for example, data contexts are stored on Views                                                    // 31
/// of name "with".  Names are also useful when debugging, so in                                                       // 32
/// general it's good for functions that create Views to set the name.                                                 // 33
/// Views associated with templates have names of the form "Template.foo".                                             // 34
                                                                                                                       // 35
/**                                                                                                                    // 36
 * @class                                                                                                              // 37
 * @summary Constructor for a View, which represents a reactive region of DOM.                                         // 38
 * @locus Client                                                                                                       // 39
 * @param {String} [name] Optional.  A name for this type of View.  See [`view.name`](#view_name).                     // 40
 * @param {Function} renderFunction A function that returns [*renderable content*](#renderable_content).  In this function, `this` is bound to the View.
 */                                                                                                                    // 42
Blaze.View = function (name, render) {                                                                                 // 43
  if (! (this instanceof Blaze.View))                                                                                  // 44
    // called without `new`                                                                                            // 45
    return new Blaze.View(name, render);                                                                               // 46
                                                                                                                       // 47
  if (typeof name === 'function') {                                                                                    // 48
    // omitted "name" argument                                                                                         // 49
    render = name;                                                                                                     // 50
    name = '';                                                                                                         // 51
  }                                                                                                                    // 52
  this.name = name;                                                                                                    // 53
  this._render = render;                                                                                               // 54
                                                                                                                       // 55
  this._callbacks = {                                                                                                  // 56
    created: null,                                                                                                     // 57
    rendered: null,                                                                                                    // 58
    destroyed: null                                                                                                    // 59
  };                                                                                                                   // 60
                                                                                                                       // 61
  // Setting all properties here is good for readability,                                                              // 62
  // and also may help Chrome optimize the code by keeping                                                             // 63
  // the View object from changing shape too much.                                                                     // 64
  this.isCreated = false;                                                                                              // 65
  this._isCreatedForExpansion = false;                                                                                 // 66
  this.isRendered = false;                                                                                             // 67
  this._isAttached = false;                                                                                            // 68
  this.isDestroyed = false;                                                                                            // 69
  this._isInRender = false;                                                                                            // 70
  this.parentView = null;                                                                                              // 71
  this._domrange = null;                                                                                               // 72
  // This flag is normally set to false except for the cases when view's parent                                        // 73
  // was generated as part of expanding some syntactic sugar expressions or                                            // 74
  // methods.                                                                                                          // 75
  // Ex.: Blaze.renderWithData is an equivalent to creating a view with regular                                        // 76
  // Blaze.render and wrapping it into {{#with data}}{{/with}} view. Since the                                         // 77
  // users don't know anything about these generated parent views, Blaze needs                                         // 78
  // this information to be available on views to make smarter decisions. For                                          // 79
  // example: removing the generated parent view with the view on Blaze.remove.                                        // 80
  this._hasGeneratedParent = false;                                                                                    // 81
                                                                                                                       // 82
  this.renderCount = 0;                                                                                                // 83
};                                                                                                                     // 84
                                                                                                                       // 85
Blaze.View.prototype._render = function () { return null; };                                                           // 86
                                                                                                                       // 87
Blaze.View.prototype.onViewCreated = function (cb) {                                                                   // 88
  this._callbacks.created = this._callbacks.created || [];                                                             // 89
  this._callbacks.created.push(cb);                                                                                    // 90
};                                                                                                                     // 91
                                                                                                                       // 92
Blaze.View.prototype._onViewRendered = function (cb) {                                                                 // 93
  this._callbacks.rendered = this._callbacks.rendered || [];                                                           // 94
  this._callbacks.rendered.push(cb);                                                                                   // 95
};                                                                                                                     // 96
                                                                                                                       // 97
Blaze.View.prototype.onViewReady = function (cb) {                                                                     // 98
  var self = this;                                                                                                     // 99
  var fire = function () {                                                                                             // 100
    Tracker.afterFlush(function () {                                                                                   // 101
      if (! self.isDestroyed) {                                                                                        // 102
        Blaze._withCurrentView(self, function () {                                                                     // 103
          cb.call(self);                                                                                               // 104
        });                                                                                                            // 105
      }                                                                                                                // 106
    });                                                                                                                // 107
  };                                                                                                                   // 108
  self._onViewRendered(function onViewRendered() {                                                                     // 109
    if (self.isDestroyed)                                                                                              // 110
      return;                                                                                                          // 111
    if (! self._domrange.attached)                                                                                     // 112
      self._domrange.onAttached(fire);                                                                                 // 113
    else                                                                                                               // 114
      fire();                                                                                                          // 115
  });                                                                                                                  // 116
};                                                                                                                     // 117
                                                                                                                       // 118
Blaze.View.prototype.onViewDestroyed = function (cb) {                                                                 // 119
  this._callbacks.destroyed = this._callbacks.destroyed || [];                                                         // 120
  this._callbacks.destroyed.push(cb);                                                                                  // 121
};                                                                                                                     // 122
                                                                                                                       // 123
/// View#autorun(func)                                                                                                 // 124
///                                                                                                                    // 125
/// Sets up a Tracker autorun that is "scoped" to this View in two                                                     // 126
/// important ways: 1) Blaze.currentView is automatically set                                                          // 127
/// on every re-run, and 2) the autorun is stopped when the                                                            // 128
/// View is destroyed.  As with Tracker.autorun, the first run of                                                      // 129
/// the function is immediate, and a Computation object that can                                                       // 130
/// be used to stop the autorun is returned.                                                                           // 131
///                                                                                                                    // 132
/// View#autorun is meant to be called from View callbacks like                                                        // 133
/// onViewCreated, or from outside the rendering process.  It may not                                                  // 134
/// be called before the onViewCreated callbacks are fired (too early),                                                // 135
/// or from a render() method (too confusing).                                                                         // 136
///                                                                                                                    // 137
/// Typically, autoruns that update the state                                                                          // 138
/// of the View (as in Blaze.With) should be started from an onViewCreated                                             // 139
/// callback.  Autoruns that update the DOM should be started                                                          // 140
/// from either onViewCreated (guarded against the absence of                                                          // 141
/// view._domrange), or onViewReady.                                                                                   // 142
Blaze.View.prototype.autorun = function (f, _inViewScope, displayName) {                                               // 143
  var self = this;                                                                                                     // 144
                                                                                                                       // 145
  // The restrictions on when View#autorun can be called are in order                                                  // 146
  // to avoid bad patterns, like creating a Blaze.View and immediately                                                 // 147
  // calling autorun on it.  A freshly created View is not ready to                                                    // 148
  // have logic run on it; it doesn't have a parentView, for example.                                                  // 149
  // It's when the View is materialized or expanded that the onViewCreated                                             // 150
  // handlers are fired and the View starts up.                                                                        // 151
  //                                                                                                                   // 152
  // Letting the render() method call `this.autorun()` is problematic                                                  // 153
  // because of re-render.  The best we can do is to stop the old                                                      // 154
  // autorun and start a new one for each render, but that's a pattern                                                 // 155
  // we try to avoid internally because it leads to helpers being                                                      // 156
  // called extra times, in the case where the autorun causes the                                                      // 157
  // view to re-render (and thus the autorun to be torn down and a                                                     // 158
  // new one established).                                                                                             // 159
  //                                                                                                                   // 160
  // We could lift these restrictions in various ways.  One interesting                                                // 161
  // idea is to allow you to call `view.autorun` after instantiating                                                   // 162
  // `view`, and automatically wrap it in `view.onViewCreated`, deferring                                              // 163
  // the autorun so that it starts at an appropriate time.  However,                                                   // 164
  // then we can't return the Computation object to the caller, because                                                // 165
  // it doesn't exist yet.                                                                                             // 166
  if (! self.isCreated) {                                                                                              // 167
    throw new Error("View#autorun must be called from the created callback at the earliest");                          // 168
  }                                                                                                                    // 169
  if (this._isInRender) {                                                                                              // 170
    throw new Error("Can't call View#autorun from inside render(); try calling it from the created or rendered callback");
  }                                                                                                                    // 172
  if (Tracker.active) {                                                                                                // 173
    throw new Error("Can't call View#autorun from a Tracker Computation; try calling it from the created or rendered callback");
  }                                                                                                                    // 175
                                                                                                                       // 176
  // Each local variable allocate additional space on each frame of the                                                // 177
  // execution stack. When too many variables are allocated on stack, you can                                          // 178
  // run out of memory on stack running a deep recursion (which is typical for                                         // 179
  // Blaze functions) and get stackoverlow error. (The size of the stack varies                                        // 180
  // between browsers).                                                                                                // 181
  // The trick we use here is to allocate only one variable on stack `locals`                                          // 182
  // that keeps references to all the rest. Since locals is allocated on heap,                                         // 183
  // we don't take up any space on the stack.                                                                          // 184
  var locals = {};                                                                                                     // 185
  locals.templateInstanceFunc = Blaze.Template._currentTemplateInstanceFunc;                                           // 186
                                                                                                                       // 187
  locals.f = function viewAutorun(c) {                                                                                 // 188
    return Blaze._withCurrentView(_inViewScope || self, function () {                                                  // 189
      return Blaze.Template._withTemplateInstanceFunc(locals.templateInstanceFunc, function () {                       // 190
        return f.call(self, c);                                                                                        // 191
      });                                                                                                              // 192
    });                                                                                                                // 193
  };                                                                                                                   // 194
                                                                                                                       // 195
  // Give the autorun function a better name for debugging and profiling.                                              // 196
  // The `displayName` property is not part of the spec but browsers like Chrome                                       // 197
  // and Firefox prefer it in debuggers over the name function was declared by.                                        // 198
  locals.f.displayName =                                                                                               // 199
    (self.name || 'anonymous') + ':' + (displayName || 'anonymous');                                                   // 200
  locals.c = Tracker.autorun(locals.f);                                                                                // 201
                                                                                                                       // 202
  self.onViewDestroyed(function () { locals.c.stop(); });                                                              // 203
                                                                                                                       // 204
  return locals.c;                                                                                                     // 205
};                                                                                                                     // 206
                                                                                                                       // 207
Blaze.View.prototype._errorIfShouldntCallSubscribe = function () {                                                     // 208
  var self = this;                                                                                                     // 209
                                                                                                                       // 210
  if (! self.isCreated) {                                                                                              // 211
    throw new Error("View#subscribe must be called from the created callback at the earliest");                        // 212
  }                                                                                                                    // 213
  if (self._isInRender) {                                                                                              // 214
    throw new Error("Can't call View#subscribe from inside render(); try calling it from the created or rendered callback");
  }                                                                                                                    // 216
  if (self.isDestroyed) {                                                                                              // 217
    throw new Error("Can't call View#subscribe from inside the destroyed callback, try calling it inside created or rendered.");
  }                                                                                                                    // 219
};                                                                                                                     // 220
                                                                                                                       // 221
/**                                                                                                                    // 222
 * Just like Blaze.View#autorun, but with Meteor.subscribe instead of                                                  // 223
 * Tracker.autorun. Stop the subscription when the view is destroyed.                                                  // 224
 * @return {SubscriptionHandle} A handle to the subscription so that you can                                           // 225
 * see if it is ready, or stop it manually                                                                             // 226
 */                                                                                                                    // 227
Blaze.View.prototype.subscribe = function (args, options) {                                                            // 228
  var self = this;                                                                                                     // 229
  options = {} || options;                                                                                             // 230
                                                                                                                       // 231
  self._errorIfShouldntCallSubscribe();                                                                                // 232
                                                                                                                       // 233
  var subHandle;                                                                                                       // 234
  if (options.connection) {                                                                                            // 235
    subHandle = options.connection.subscribe.apply(options.connection, args);                                          // 236
  } else {                                                                                                             // 237
    subHandle = Meteor.subscribe.apply(Meteor, args);                                                                  // 238
  }                                                                                                                    // 239
                                                                                                                       // 240
  self.onViewDestroyed(function () {                                                                                   // 241
    subHandle.stop();                                                                                                  // 242
  });                                                                                                                  // 243
                                                                                                                       // 244
  return subHandle;                                                                                                    // 245
};                                                                                                                     // 246
                                                                                                                       // 247
Blaze.View.prototype.firstNode = function () {                                                                         // 248
  if (! this._isAttached)                                                                                              // 249
    throw new Error("View must be attached before accessing its DOM");                                                 // 250
                                                                                                                       // 251
  return this._domrange.firstNode();                                                                                   // 252
};                                                                                                                     // 253
                                                                                                                       // 254
Blaze.View.prototype.lastNode = function () {                                                                          // 255
  if (! this._isAttached)                                                                                              // 256
    throw new Error("View must be attached before accessing its DOM");                                                 // 257
                                                                                                                       // 258
  return this._domrange.lastNode();                                                                                    // 259
};                                                                                                                     // 260
                                                                                                                       // 261
Blaze._fireCallbacks = function (view, which) {                                                                        // 262
  Blaze._withCurrentView(view, function () {                                                                           // 263
    Tracker.nonreactive(function fireCallbacks() {                                                                     // 264
      var cbs = view._callbacks[which];                                                                                // 265
      for (var i = 0, N = (cbs && cbs.length); i < N; i++)                                                             // 266
        cbs[i].call(view);                                                                                             // 267
    });                                                                                                                // 268
  });                                                                                                                  // 269
};                                                                                                                     // 270
                                                                                                                       // 271
Blaze._createView = function (view, parentView, forExpansion) {                                                        // 272
  if (view.isCreated)                                                                                                  // 273
    throw new Error("Can't render the same View twice");                                                               // 274
                                                                                                                       // 275
  view.parentView = (parentView || null);                                                                              // 276
  view.isCreated = true;                                                                                               // 277
  if (forExpansion)                                                                                                    // 278
    view._isCreatedForExpansion = true;                                                                                // 279
                                                                                                                       // 280
  Blaze._fireCallbacks(view, 'created');                                                                               // 281
};                                                                                                                     // 282
                                                                                                                       // 283
var doFirstRender = function (view, initialContent) {                                                                  // 284
  var domrange = new Blaze._DOMRange(initialContent);                                                                  // 285
  view._domrange = domrange;                                                                                           // 286
  domrange.view = view;                                                                                                // 287
  view.isRendered = true;                                                                                              // 288
  Blaze._fireCallbacks(view, 'rendered');                                                                              // 289
                                                                                                                       // 290
  var teardownHook = null;                                                                                             // 291
                                                                                                                       // 292
  domrange.onAttached(function attached(range, element) {                                                              // 293
    view._isAttached = true;                                                                                           // 294
                                                                                                                       // 295
    teardownHook = Blaze._DOMBackend.Teardown.onElementTeardown(                                                       // 296
      element, function teardown() {                                                                                   // 297
        Blaze._destroyView(view, true /* _skipNodes */);                                                               // 298
      });                                                                                                              // 299
  });                                                                                                                  // 300
                                                                                                                       // 301
  // tear down the teardown hook                                                                                       // 302
  view.onViewDestroyed(function () {                                                                                   // 303
    teardownHook && teardownHook.stop();                                                                               // 304
    teardownHook = null;                                                                                               // 305
  });                                                                                                                  // 306
                                                                                                                       // 307
  return domrange;                                                                                                     // 308
};                                                                                                                     // 309
                                                                                                                       // 310
// Take an uncreated View `view` and create and render it to DOM,                                                      // 311
// setting up the autorun that updates the View.  Returns a new                                                        // 312
// DOMRange, which has been associated with the View.                                                                  // 313
//                                                                                                                     // 314
// The private arguments `_workStack` and `_intoArray` are passed in                                                   // 315
// by Blaze._materializeDOM.  If provided, then we avoid the mutual                                                    // 316
// recursion of calling back into Blaze._materializeDOM so that deep                                                   // 317
// View hierarchies don't blow the stack.  Instead, we push tasks onto                                                 // 318
// workStack for the initial rendering and subsequent setup of the                                                     // 319
// View, and they are done after we return.  When there is a                                                           // 320
// _workStack, we do not return the new DOMRange, but instead push it                                                  // 321
// into _intoArray from a _workStack task.                                                                             // 322
Blaze._materializeView = function (view, parentView, _workStack, _intoArray) {                                         // 323
  Blaze._createView(view, parentView);                                                                                 // 324
                                                                                                                       // 325
  var domrange;                                                                                                        // 326
  var lastHtmljs;                                                                                                      // 327
  // We don't expect to be called in a Computation, but just in case,                                                  // 328
  // wrap in Tracker.nonreactive.                                                                                      // 329
  Tracker.nonreactive(function () {                                                                                    // 330
    view.autorun(function doRender(c) {                                                                                // 331
      // `view.autorun` sets the current view.                                                                         // 332
      view.renderCount++;                                                                                              // 333
      view._isInRender = true;                                                                                         // 334
      // Any dependencies that should invalidate this Computation come                                                 // 335
      // from this line:                                                                                               // 336
      var htmljs = view._render();                                                                                     // 337
      view._isInRender = false;                                                                                        // 338
                                                                                                                       // 339
      if (! c.firstRun) {                                                                                              // 340
        Tracker.nonreactive(function doMaterialize() {                                                                 // 341
          // re-render                                                                                                 // 342
          var rangesAndNodes = Blaze._materializeDOM(htmljs, [], view);                                                // 343
          if (! Blaze._isContentEqual(lastHtmljs, htmljs)) {                                                           // 344
            domrange.setMembers(rangesAndNodes);                                                                       // 345
            Blaze._fireCallbacks(view, 'rendered');                                                                    // 346
          }                                                                                                            // 347
        });                                                                                                            // 348
      }                                                                                                                // 349
      lastHtmljs = htmljs;                                                                                             // 350
                                                                                                                       // 351
      // Causes any nested views to stop immediately, not when we call                                                 // 352
      // `setMembers` the next time around the autorun.  Otherwise,                                                    // 353
      // helpers in the DOM tree to be replaced might be scheduled                                                     // 354
      // to re-run before we have a chance to stop them.                                                               // 355
      Tracker.onInvalidate(function () {                                                                               // 356
        domrange.destroyMembers();                                                                                     // 357
      });                                                                                                              // 358
    }, undefined, 'materialize');                                                                                      // 359
                                                                                                                       // 360
    // first render.  lastHtmljs is the first htmljs.                                                                  // 361
    var initialContents;                                                                                               // 362
    if (! _workStack) {                                                                                                // 363
      initialContents = Blaze._materializeDOM(lastHtmljs, [], view);                                                   // 364
      domrange = doFirstRender(view, initialContents);                                                                 // 365
      initialContents = null; // help GC because we close over this scope a lot                                        // 366
    } else {                                                                                                           // 367
      // We're being called from Blaze._materializeDOM, so to avoid                                                    // 368
      // recursion and save stack space, provide a description of the                                                  // 369
      // work to be done instead of doing it.  Tasks pushed onto                                                       // 370
      // _workStack will be done in LIFO order after we return.                                                        // 371
      // The work will still be done within a Tracker.nonreactive,                                                     // 372
      // because it will be done by some call to Blaze._materializeDOM                                                 // 373
      // (which is always called in a Tracker.nonreactive).                                                            // 374
      initialContents = [];                                                                                            // 375
      // push this function first so that it happens last                                                              // 376
      _workStack.push(function () {                                                                                    // 377
        domrange = doFirstRender(view, initialContents);                                                               // 378
        initialContents = null; // help GC because of all the closures here                                            // 379
        _intoArray.push(domrange);                                                                                     // 380
      });                                                                                                              // 381
      // now push the task that calculates initialContents                                                             // 382
      _workStack.push([lastHtmljs, initialContents, view]);                                                            // 383
    }                                                                                                                  // 384
  });                                                                                                                  // 385
                                                                                                                       // 386
  if (! _workStack) {                                                                                                  // 387
    return domrange;                                                                                                   // 388
  } else {                                                                                                             // 389
    return null;                                                                                                       // 390
  }                                                                                                                    // 391
};                                                                                                                     // 392
                                                                                                                       // 393
// Expands a View to HTMLjs, calling `render` recursively on all                                                       // 394
// Views and evaluating any dynamic attributes.  Calls the `created`                                                   // 395
// callback, but not the `materialized` or `rendered` callbacks.                                                       // 396
// Destroys the view immediately, unless called in a Tracker Computation,                                              // 397
// in which case the view will be destroyed when the Computation is                                                    // 398
// invalidated.  If called in a Tracker Computation, the result is a                                                   // 399
// reactive string; that is, the Computation will be invalidated                                                       // 400
// if any changes are made to the view or subviews that might affect                                                   // 401
// the HTML.                                                                                                           // 402
Blaze._expandView = function (view, parentView) {                                                                      // 403
  Blaze._createView(view, parentView, true /*forExpansion*/);                                                          // 404
                                                                                                                       // 405
  view._isInRender = true;                                                                                             // 406
  var htmljs = Blaze._withCurrentView(view, function () {                                                              // 407
    return view._render();                                                                                             // 408
  });                                                                                                                  // 409
  view._isInRender = false;                                                                                            // 410
                                                                                                                       // 411
  var result = Blaze._expand(htmljs, view);                                                                            // 412
                                                                                                                       // 413
  if (Tracker.active) {                                                                                                // 414
    Tracker.onInvalidate(function () {                                                                                 // 415
      Blaze._destroyView(view);                                                                                        // 416
    });                                                                                                                // 417
  } else {                                                                                                             // 418
    Blaze._destroyView(view);                                                                                          // 419
  }                                                                                                                    // 420
                                                                                                                       // 421
  return result;                                                                                                       // 422
};                                                                                                                     // 423
                                                                                                                       // 424
// Options: `parentView`                                                                                               // 425
Blaze._HTMLJSExpander = HTML.TransformingVisitor.extend();                                                             // 426
Blaze._HTMLJSExpander.def({                                                                                            // 427
  visitObject: function (x) {                                                                                          // 428
    if (x instanceof Blaze.Template)                                                                                   // 429
      x = x.constructView();                                                                                           // 430
    if (x instanceof Blaze.View)                                                                                       // 431
      return Blaze._expandView(x, this.parentView);                                                                    // 432
                                                                                                                       // 433
    // this will throw an error; other objects are not allowed!                                                        // 434
    return HTML.TransformingVisitor.prototype.visitObject.call(this, x);                                               // 435
  },                                                                                                                   // 436
  visitAttributes: function (attrs) {                                                                                  // 437
    // expand dynamic attributes                                                                                       // 438
    if (typeof attrs === 'function')                                                                                   // 439
      attrs = Blaze._withCurrentView(this.parentView, attrs);                                                          // 440
                                                                                                                       // 441
    // call super (e.g. for case where `attrs` is an array)                                                            // 442
    return HTML.TransformingVisitor.prototype.visitAttributes.call(this, attrs);                                       // 443
  },                                                                                                                   // 444
  visitAttribute: function (name, value, tag) {                                                                        // 445
    // expand attribute values that are functions.  Any attribute value                                                // 446
    // that contains Views must be wrapped in a function.                                                              // 447
    if (typeof value === 'function')                                                                                   // 448
      value = Blaze._withCurrentView(this.parentView, value);                                                          // 449
                                                                                                                       // 450
    return HTML.TransformingVisitor.prototype.visitAttribute.call(                                                     // 451
      this, name, value, tag);                                                                                         // 452
  }                                                                                                                    // 453
});                                                                                                                    // 454
                                                                                                                       // 455
// Return Blaze.currentView, but only if it is being rendered                                                          // 456
// (i.e. we are in its render() method).                                                                               // 457
var currentViewIfRendering = function () {                                                                             // 458
  var view = Blaze.currentView;                                                                                        // 459
  return (view && view._isInRender) ? view : null;                                                                     // 460
};                                                                                                                     // 461
                                                                                                                       // 462
Blaze._expand = function (htmljs, parentView) {                                                                        // 463
  parentView = parentView || currentViewIfRendering();                                                                 // 464
  return (new Blaze._HTMLJSExpander(                                                                                   // 465
    {parentView: parentView})).visit(htmljs);                                                                          // 466
};                                                                                                                     // 467
                                                                                                                       // 468
Blaze._expandAttributes = function (attrs, parentView) {                                                               // 469
  parentView = parentView || currentViewIfRendering();                                                                 // 470
  return (new Blaze._HTMLJSExpander(                                                                                   // 471
    {parentView: parentView})).visitAttributes(attrs);                                                                 // 472
};                                                                                                                     // 473
                                                                                                                       // 474
Blaze._destroyView = function (view, _skipNodes) {                                                                     // 475
  if (view.isDestroyed)                                                                                                // 476
    return;                                                                                                            // 477
  view.isDestroyed = true;                                                                                             // 478
                                                                                                                       // 479
  Blaze._fireCallbacks(view, 'destroyed');                                                                             // 480
                                                                                                                       // 481
  // Destroy views and elements recursively.  If _skipNodes,                                                           // 482
  // only recurse up to views, not elements, for the case where                                                        // 483
  // the backend (jQuery) is recursing over the elements already.                                                      // 484
                                                                                                                       // 485
  if (view._domrange)                                                                                                  // 486
    view._domrange.destroyMembers(_skipNodes);                                                                         // 487
};                                                                                                                     // 488
                                                                                                                       // 489
Blaze._destroyNode = function (node) {                                                                                 // 490
  if (node.nodeType === 1)                                                                                             // 491
    Blaze._DOMBackend.Teardown.tearDownElement(node);                                                                  // 492
};                                                                                                                     // 493
                                                                                                                       // 494
// Are the HTMLjs entities `a` and `b` the same?  We could be                                                          // 495
// more elaborate here but the point is to catch the most basic                                                        // 496
// cases.                                                                                                              // 497
Blaze._isContentEqual = function (a, b) {                                                                              // 498
  if (a instanceof HTML.Raw) {                                                                                         // 499
    return (b instanceof HTML.Raw) && (a.value === b.value);                                                           // 500
  } else if (a == null) {                                                                                              // 501
    return (b == null);                                                                                                // 502
  } else {                                                                                                             // 503
    return (a === b) &&                                                                                                // 504
      ((typeof a === 'number') || (typeof a === 'boolean') ||                                                          // 505
       (typeof a === 'string'));                                                                                       // 506
  }                                                                                                                    // 507
};                                                                                                                     // 508
                                                                                                                       // 509
/**                                                                                                                    // 510
 * @summary The View corresponding to the current template helper, event handler, callback, or autorun.  If there isn't one, `null`.
 * @locus Client                                                                                                       // 512
 * @type {Blaze.View}                                                                                                  // 513
 */                                                                                                                    // 514
Blaze.currentView = null;                                                                                              // 515
                                                                                                                       // 516
Blaze._withCurrentView = function (view, func) {                                                                       // 517
  var oldView = Blaze.currentView;                                                                                     // 518
  try {                                                                                                                // 519
    Blaze.currentView = view;                                                                                          // 520
    return func();                                                                                                     // 521
  } finally {                                                                                                          // 522
    Blaze.currentView = oldView;                                                                                       // 523
  }                                                                                                                    // 524
};                                                                                                                     // 525
                                                                                                                       // 526
// Blaze.render publicly takes a View or a Template.                                                                   // 527
// Privately, it takes any HTMLJS (extended with Views and Templates)                                                  // 528
// except null or undefined, or a function that returns any extended                                                   // 529
// HTMLJS.                                                                                                             // 530
var checkRenderContent = function (content) {                                                                          // 531
  if (content === null)                                                                                                // 532
    throw new Error("Can't render null");                                                                              // 533
  if (typeof content === 'undefined')                                                                                  // 534
    throw new Error("Can't render undefined");                                                                         // 535
                                                                                                                       // 536
  if ((content instanceof Blaze.View) ||                                                                               // 537
      (content instanceof Blaze.Template) ||                                                                           // 538
      (typeof content === 'function'))                                                                                 // 539
    return;                                                                                                            // 540
                                                                                                                       // 541
  try {                                                                                                                // 542
    // Throw if content doesn't look like HTMLJS at the top level                                                      // 543
    // (i.e. verify that this is an HTML.Tag, or an array,                                                             // 544
    // or a primitive, etc.)                                                                                           // 545
    (new HTML.Visitor).visit(content);                                                                                 // 546
  } catch (e) {                                                                                                        // 547
    // Make error message suitable for public API                                                                      // 548
    throw new Error("Expected Template or View");                                                                      // 549
  }                                                                                                                    // 550
};                                                                                                                     // 551
                                                                                                                       // 552
// For Blaze.render and Blaze.toHTML, take content and                                                                 // 553
// wrap it in a View, unless it's a single View or                                                                     // 554
// Template already.                                                                                                   // 555
var contentAsView = function (content) {                                                                               // 556
  checkRenderContent(content);                                                                                         // 557
                                                                                                                       // 558
  if (content instanceof Blaze.Template) {                                                                             // 559
    return content.constructView();                                                                                    // 560
  } else if (content instanceof Blaze.View) {                                                                          // 561
    return content;                                                                                                    // 562
  } else {                                                                                                             // 563
    var func = content;                                                                                                // 564
    if (typeof func !== 'function') {                                                                                  // 565
      func = function () {                                                                                             // 566
        return content;                                                                                                // 567
      };                                                                                                               // 568
    }                                                                                                                  // 569
    return Blaze.View('render', func);                                                                                 // 570
  }                                                                                                                    // 571
};                                                                                                                     // 572
                                                                                                                       // 573
// For Blaze.renderWithData and Blaze.toHTMLWithData, wrap content                                                     // 574
// in a function, if necessary, so it can be a content arg to                                                          // 575
// a Blaze.With.                                                                                                       // 576
var contentAsFunc = function (content) {                                                                               // 577
  checkRenderContent(content);                                                                                         // 578
                                                                                                                       // 579
  if (typeof content !== 'function') {                                                                                 // 580
    return function () {                                                                                               // 581
      return content;                                                                                                  // 582
    };                                                                                                                 // 583
  } else {                                                                                                             // 584
    return content;                                                                                                    // 585
  }                                                                                                                    // 586
};                                                                                                                     // 587
                                                                                                                       // 588
/**                                                                                                                    // 589
 * @summary Renders a template or View to DOM nodes and inserts it into the DOM, returning a rendered [View](#blaze_view) which can be passed to [`Blaze.remove`](#blaze_remove).
 * @locus Client                                                                                                       // 591
 * @param {Template|Blaze.View} templateOrView The template (e.g. `Template.myTemplate`) or View object to render.  If a template, a View object is [constructed](#template_constructview).  If a View, it must be an unrendered View, which becomes a rendered View and is returned.
 * @param {DOMNode} parentNode The node that will be the parent of the rendered template.  It must be an Element node. // 593
 * @param {DOMNode} [nextNode] Optional. If provided, must be a child of <em>parentNode</em>; the template will be inserted before this node. If not provided, the template will be inserted as the last child of parentNode.
 * @param {Blaze.View} [parentView] Optional. If provided, it will be set as the rendered View's [`parentView`](#view_parentview).
 */                                                                                                                    // 596
Blaze.render = function (content, parentElement, nextNode, parentView) {                                               // 597
  if (! parentElement) {                                                                                               // 598
    Blaze._warn("Blaze.render without a parent element is deprecated. " +                                              // 599
                "You must specify where to insert the rendered content.");                                             // 600
  }                                                                                                                    // 601
                                                                                                                       // 602
  if (nextNode instanceof Blaze.View) {                                                                                // 603
    // handle omitted nextNode                                                                                         // 604
    parentView = nextNode;                                                                                             // 605
    nextNode = null;                                                                                                   // 606
  }                                                                                                                    // 607
                                                                                                                       // 608
  // parentElement must be a DOM node. in particular, can't be the                                                     // 609
  // result of a call to `$`. Can't check if `parentElement instanceof                                                 // 610
  // Node` since 'Node' is undefined in IE8.                                                                           // 611
  if (parentElement && typeof parentElement.nodeType !== 'number')                                                     // 612
    throw new Error("'parentElement' must be a DOM node");                                                             // 613
  if (nextNode && typeof nextNode.nodeType !== 'number') // 'nextNode' is optional                                     // 614
    throw new Error("'nextNode' must be a DOM node");                                                                  // 615
                                                                                                                       // 616
  parentView = parentView || currentViewIfRendering();                                                                 // 617
                                                                                                                       // 618
  var view = contentAsView(content);                                                                                   // 619
  Blaze._materializeView(view, parentView);                                                                            // 620
                                                                                                                       // 621
  if (parentElement) {                                                                                                 // 622
    view._domrange.attach(parentElement, nextNode);                                                                    // 623
  }                                                                                                                    // 624
                                                                                                                       // 625
  return view;                                                                                                         // 626
};                                                                                                                     // 627
                                                                                                                       // 628
Blaze.insert = function (view, parentElement, nextNode) {                                                              // 629
  Blaze._warn("Blaze.insert has been deprecated.  Specify where to insert the " +                                      // 630
              "rendered content in the call to Blaze.render.");                                                        // 631
                                                                                                                       // 632
  if (! (view && (view._domrange instanceof Blaze._DOMRange)))                                                         // 633
    throw new Error("Expected template rendered with Blaze.render");                                                   // 634
                                                                                                                       // 635
  view._domrange.attach(parentElement, nextNode);                                                                      // 636
};                                                                                                                     // 637
                                                                                                                       // 638
/**                                                                                                                    // 639
 * @summary Renders a template or View to DOM nodes with a data context.  Otherwise identical to `Blaze.render`.       // 640
 * @locus Client                                                                                                       // 641
 * @param {Template|Blaze.View} templateOrView The template (e.g. `Template.myTemplate`) or View object to render.     // 642
 * @param {Object|Function} data The data context to use, or a function returning a data context.  If a function is provided, it will be reactively re-run.
 * @param {DOMNode} parentNode The node that will be the parent of the rendered template.  It must be an Element node. // 644
 * @param {DOMNode} [nextNode] Optional. If provided, must be a child of <em>parentNode</em>; the template will be inserted before this node. If not provided, the template will be inserted as the last child of parentNode.
 * @param {Blaze.View} [parentView] Optional. If provided, it will be set as the rendered View's [`parentView`](#view_parentview).
 */                                                                                                                    // 647
Blaze.renderWithData = function (content, data, parentElement, nextNode, parentView) {                                 // 648
  // We defer the handling of optional arguments to Blaze.render.  At this point,                                      // 649
  // `nextNode` may actually be `parentView`.                                                                          // 650
  return Blaze.render(Blaze._TemplateWith(data, contentAsFunc(content)),                                               // 651
                          parentElement, nextNode, parentView);                                                        // 652
};                                                                                                                     // 653
                                                                                                                       // 654
/**                                                                                                                    // 655
 * @summary Removes a rendered View from the DOM, stopping all reactive updates and event listeners on it.             // 656
 * @locus Client                                                                                                       // 657
 * @param {Blaze.View} renderedView The return value from `Blaze.render` or `Blaze.renderWithData`.                    // 658
 */                                                                                                                    // 659
Blaze.remove = function (view) {                                                                                       // 660
  if (! (view && (view._domrange instanceof Blaze._DOMRange)))                                                         // 661
    throw new Error("Expected template rendered with Blaze.render");                                                   // 662
                                                                                                                       // 663
  while (view) {                                                                                                       // 664
    if (! view.isDestroyed) {                                                                                          // 665
      var range = view._domrange;                                                                                      // 666
      if (range.attached && ! range.parentRange)                                                                       // 667
        range.detach();                                                                                                // 668
      range.destroy();                                                                                                 // 669
    }                                                                                                                  // 670
                                                                                                                       // 671
    view = view._hasGeneratedParent && view.parentView;                                                                // 672
  }                                                                                                                    // 673
};                                                                                                                     // 674
                                                                                                                       // 675
/**                                                                                                                    // 676
 * @summary Renders a template or View to a string of HTML.                                                            // 677
 * @locus Client                                                                                                       // 678
 * @param {Template|Blaze.View} templateOrView The template (e.g. `Template.myTemplate`) or View object from which to generate HTML.
 */                                                                                                                    // 680
Blaze.toHTML = function (content, parentView) {                                                                        // 681
  parentView = parentView || currentViewIfRendering();                                                                 // 682
                                                                                                                       // 683
  return HTML.toHTML(Blaze._expandView(contentAsView(content), parentView));                                           // 684
};                                                                                                                     // 685
                                                                                                                       // 686
/**                                                                                                                    // 687
 * @summary Renders a template or View to HTML with a data context.  Otherwise identical to `Blaze.toHTML`.            // 688
 * @locus Client                                                                                                       // 689
 * @param {Template|Blaze.View} templateOrView The template (e.g. `Template.myTemplate`) or View object from which to generate HTML.
 * @param {Object|Function} data The data context to use, or a function returning a data context.                      // 691
 */                                                                                                                    // 692
Blaze.toHTMLWithData = function (content, data, parentView) {                                                          // 693
  parentView = parentView || currentViewIfRendering();                                                                 // 694
                                                                                                                       // 695
  return HTML.toHTML(Blaze._expandView(Blaze._TemplateWith(                                                            // 696
    data, contentAsFunc(content)), parentView));                                                                       // 697
};                                                                                                                     // 698
                                                                                                                       // 699
Blaze._toText = function (htmljs, parentView, textMode) {                                                              // 700
  if (typeof htmljs === 'function')                                                                                    // 701
    throw new Error("Blaze._toText doesn't take a function, just HTMLjs");                                             // 702
                                                                                                                       // 703
  if ((parentView != null) && ! (parentView instanceof Blaze.View)) {                                                  // 704
    // omitted parentView argument                                                                                     // 705
    textMode = parentView;                                                                                             // 706
    parentView = null;                                                                                                 // 707
  }                                                                                                                    // 708
  parentView = parentView || currentViewIfRendering();                                                                 // 709
                                                                                                                       // 710
  if (! textMode)                                                                                                      // 711
    throw new Error("textMode required");                                                                              // 712
  if (! (textMode === HTML.TEXTMODE.STRING ||                                                                          // 713
         textMode === HTML.TEXTMODE.RCDATA ||                                                                          // 714
         textMode === HTML.TEXTMODE.ATTRIBUTE))                                                                        // 715
    throw new Error("Unknown textMode: " + textMode);                                                                  // 716
                                                                                                                       // 717
  return HTML.toText(Blaze._expand(htmljs, parentView), textMode);                                                     // 718
};                                                                                                                     // 719
                                                                                                                       // 720
/**                                                                                                                    // 721
 * @summary Returns the current data context, or the data context that was used when rendering a particular DOM element or View from a Meteor template.
 * @locus Client                                                                                                       // 723
 * @param {DOMElement|Blaze.View} [elementOrView] Optional.  An element that was rendered by a Meteor, or a View.      // 724
 */                                                                                                                    // 725
Blaze.getData = function (elementOrView) {                                                                             // 726
  var theWith;                                                                                                         // 727
                                                                                                                       // 728
  if (! elementOrView) {                                                                                               // 729
    theWith = Blaze.getView('with');                                                                                   // 730
  } else if (elementOrView instanceof Blaze.View) {                                                                    // 731
    var view = elementOrView;                                                                                          // 732
    theWith = (view.name === 'with' ? view :                                                                           // 733
               Blaze.getView(view, 'with'));                                                                           // 734
  } else if (typeof elementOrView.nodeType === 'number') {                                                             // 735
    if (elementOrView.nodeType !== 1)                                                                                  // 736
      throw new Error("Expected DOM element");                                                                         // 737
    theWith = Blaze.getView(elementOrView, 'with');                                                                    // 738
  } else {                                                                                                             // 739
    throw new Error("Expected DOM element or View");                                                                   // 740
  }                                                                                                                    // 741
                                                                                                                       // 742
  return theWith ? theWith.dataVar.get() : null;                                                                       // 743
};                                                                                                                     // 744
                                                                                                                       // 745
// For back-compat                                                                                                     // 746
Blaze.getElementData = function (element) {                                                                            // 747
  Blaze._warn("Blaze.getElementData has been deprecated.  Use " +                                                      // 748
              "Blaze.getData(element) instead.");                                                                      // 749
                                                                                                                       // 750
  if (element.nodeType !== 1)                                                                                          // 751
    throw new Error("Expected DOM element");                                                                           // 752
                                                                                                                       // 753
  return Blaze.getData(element);                                                                                       // 754
};                                                                                                                     // 755
                                                                                                                       // 756
// Both arguments are optional.                                                                                        // 757
                                                                                                                       // 758
/**                                                                                                                    // 759
 * @summary Gets either the current View, or the View enclosing the given DOM element.                                 // 760
 * @locus Client                                                                                                       // 761
 * @param {DOMElement} [element] Optional.  If specified, the View enclosing `element` is returned.                    // 762
 */                                                                                                                    // 763
Blaze.getView = function (elementOrView, _viewName) {                                                                  // 764
  var viewName = _viewName;                                                                                            // 765
                                                                                                                       // 766
  if ((typeof elementOrView) === 'string') {                                                                           // 767
    // omitted elementOrView; viewName present                                                                         // 768
    viewName = elementOrView;                                                                                          // 769
    elementOrView = null;                                                                                              // 770
  }                                                                                                                    // 771
                                                                                                                       // 772
  // We could eventually shorten the code by folding the logic                                                         // 773
  // from the other methods into this method.                                                                          // 774
  if (! elementOrView) {                                                                                               // 775
    return Blaze._getCurrentView(viewName);                                                                            // 776
  } else if (elementOrView instanceof Blaze.View) {                                                                    // 777
    return Blaze._getParentView(elementOrView, viewName);                                                              // 778
  } else if (typeof elementOrView.nodeType === 'number') {                                                             // 779
    return Blaze._getElementView(elementOrView, viewName);                                                             // 780
  } else {                                                                                                             // 781
    throw new Error("Expected DOM element or View");                                                                   // 782
  }                                                                                                                    // 783
};                                                                                                                     // 784
                                                                                                                       // 785
// Gets the current view or its nearest ancestor of name                                                               // 786
// `name`.                                                                                                             // 787
Blaze._getCurrentView = function (name) {                                                                              // 788
  var view = Blaze.currentView;                                                                                        // 789
  // Better to fail in cases where it doesn't make sense                                                               // 790
  // to use Blaze._getCurrentView().  There will be a current                                                          // 791
  // view anywhere it does.  You can check Blaze.currentView                                                           // 792
  // if you want to know whether there is one or not.                                                                  // 793
  if (! view)                                                                                                          // 794
    throw new Error("There is no current view");                                                                       // 795
                                                                                                                       // 796
  if (name) {                                                                                                          // 797
    while (view && view.name !== name)                                                                                 // 798
      view = view.parentView;                                                                                          // 799
    return view || null;                                                                                               // 800
  } else {                                                                                                             // 801
    // Blaze._getCurrentView() with no arguments just returns                                                          // 802
    // Blaze.currentView.                                                                                              // 803
    return view;                                                                                                       // 804
  }                                                                                                                    // 805
};                                                                                                                     // 806
                                                                                                                       // 807
Blaze._getParentView = function (view, name) {                                                                         // 808
  var v = view.parentView;                                                                                             // 809
                                                                                                                       // 810
  if (name) {                                                                                                          // 811
    while (v && v.name !== name)                                                                                       // 812
      v = v.parentView;                                                                                                // 813
  }                                                                                                                    // 814
                                                                                                                       // 815
  return v || null;                                                                                                    // 816
};                                                                                                                     // 817
                                                                                                                       // 818
Blaze._getElementView = function (elem, name) {                                                                        // 819
  var range = Blaze._DOMRange.forElement(elem);                                                                        // 820
  var view = null;                                                                                                     // 821
  while (range && ! view) {                                                                                            // 822
    view = (range.view || null);                                                                                       // 823
    if (! view) {                                                                                                      // 824
      if (range.parentRange)                                                                                           // 825
        range = range.parentRange;                                                                                     // 826
      else                                                                                                             // 827
        range = Blaze._DOMRange.forElement(range.parentElement);                                                       // 828
    }                                                                                                                  // 829
  }                                                                                                                    // 830
                                                                                                                       // 831
  if (name) {                                                                                                          // 832
    while (view && view.name !== name)                                                                                 // 833
      view = view.parentView;                                                                                          // 834
    return view || null;                                                                                               // 835
  } else {                                                                                                             // 836
    return view;                                                                                                       // 837
  }                                                                                                                    // 838
};                                                                                                                     // 839
                                                                                                                       // 840
Blaze._addEventMap = function (view, eventMap, thisInHandler) {                                                        // 841
  thisInHandler = (thisInHandler || null);                                                                             // 842
  var handles = [];                                                                                                    // 843
                                                                                                                       // 844
  if (! view._domrange)                                                                                                // 845
    throw new Error("View must have a DOMRange");                                                                      // 846
                                                                                                                       // 847
  view._domrange.onAttached(function attached_eventMaps(range, element) {                                              // 848
    _.each(eventMap, function (handler, spec) {                                                                        // 849
      var clauses = spec.split(/,\s+/);                                                                                // 850
      // iterate over clauses of spec, e.g. ['click .foo', 'click .bar']                                               // 851
      _.each(clauses, function (clause) {                                                                              // 852
        var parts = clause.split(/\s+/);                                                                               // 853
        if (parts.length === 0)                                                                                        // 854
          return;                                                                                                      // 855
                                                                                                                       // 856
        var newEvents = parts.shift();                                                                                 // 857
        var selector = parts.join(' ');                                                                                // 858
        handles.push(Blaze._EventSupport.listen(                                                                       // 859
          element, newEvents, selector,                                                                                // 860
          function (evt) {                                                                                             // 861
            if (! range.containsElement(evt.currentTarget))                                                            // 862
              return null;                                                                                             // 863
            var handlerThis = thisInHandler || this;                                                                   // 864
            var handlerArgs = arguments;                                                                               // 865
            return Blaze._withCurrentView(view, function () {                                                          // 866
              return handler.apply(handlerThis, handlerArgs);                                                          // 867
            });                                                                                                        // 868
          },                                                                                                           // 869
          range, function (r) {                                                                                        // 870
            return r.parentRange;                                                                                      // 871
          }));                                                                                                         // 872
      });                                                                                                              // 873
    });                                                                                                                // 874
  });                                                                                                                  // 875
                                                                                                                       // 876
  view.onViewDestroyed(function () {                                                                                   // 877
    _.each(handles, function (h) {                                                                                     // 878
      h.stop();                                                                                                        // 879
    });                                                                                                                // 880
    handles.length = 0;                                                                                                // 881
  });                                                                                                                  // 882
};                                                                                                                     // 883
                                                                                                                       // 884
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function () {

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/blaze/builtins.js                                                                                          //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
Blaze._calculateCondition = function (cond) {                                                                          // 1
  if (cond instanceof Array && cond.length === 0)                                                                      // 2
    cond = false;                                                                                                      // 3
  return !! cond;                                                                                                      // 4
};                                                                                                                     // 5
                                                                                                                       // 6
/**                                                                                                                    // 7
 * @summary Constructs a View that renders content with a data context.                                                // 8
 * @locus Client                                                                                                       // 9
 * @param {Object|Function} data An object to use as the data context, or a function returning such an object.  If a function is provided, it will be reactively re-run.
 * @param {Function} contentFunc A Function that returns [*renderable content*](#renderable_content).                  // 11
 */                                                                                                                    // 12
Blaze.With = function (data, contentFunc) {                                                                            // 13
  var view = Blaze.View('with', contentFunc);                                                                          // 14
                                                                                                                       // 15
  view.dataVar = new ReactiveVar;                                                                                      // 16
                                                                                                                       // 17
  view.onViewCreated(function () {                                                                                     // 18
    if (typeof data === 'function') {                                                                                  // 19
      // `data` is a reactive function                                                                                 // 20
      view.autorun(function () {                                                                                       // 21
        view.dataVar.set(data());                                                                                      // 22
      }, view.parentView, 'setData');                                                                                  // 23
    } else {                                                                                                           // 24
      view.dataVar.set(data);                                                                                          // 25
    }                                                                                                                  // 26
  });                                                                                                                  // 27
                                                                                                                       // 28
  return view;                                                                                                         // 29
};                                                                                                                     // 30
                                                                                                                       // 31
/**                                                                                                                    // 32
 * @summary Constructs a View that renders content conditionally.                                                      // 33
 * @locus Client                                                                                                       // 34
 * @param {Function} conditionFunc A function to reactively re-run.  Whether the result is truthy or falsy determines whether `contentFunc` or `elseFunc` is shown.  An empty array is considered falsy.
 * @param {Function} contentFunc A Function that returns [*renderable content*](#renderable_content).                  // 36
 * @param {Function} [elseFunc] Optional.  A Function that returns [*renderable content*](#renderable_content).  If no `elseFunc` is supplied, no content is shown in the "else" case.
 */                                                                                                                    // 38
Blaze.If = function (conditionFunc, contentFunc, elseFunc, _not) {                                                     // 39
  var conditionVar = new ReactiveVar;                                                                                  // 40
                                                                                                                       // 41
  var view = Blaze.View(_not ? 'unless' : 'if', function () {                                                          // 42
    return conditionVar.get() ? contentFunc() :                                                                        // 43
      (elseFunc ? elseFunc() : null);                                                                                  // 44
  });                                                                                                                  // 45
  view.__conditionVar = conditionVar;                                                                                  // 46
  view.onViewCreated(function () {                                                                                     // 47
    this.autorun(function () {                                                                                         // 48
      var cond = Blaze._calculateCondition(conditionFunc());                                                           // 49
      conditionVar.set(_not ? (! cond) : cond);                                                                        // 50
    }, this.parentView, 'condition');                                                                                  // 51
  });                                                                                                                  // 52
                                                                                                                       // 53
  return view;                                                                                                         // 54
};                                                                                                                     // 55
                                                                                                                       // 56
/**                                                                                                                    // 57
 * @summary An inverted [`Blaze.If`](#blaze_if).                                                                       // 58
 * @locus Client                                                                                                       // 59
 * @param {Function} conditionFunc A function to reactively re-run.  If the result is falsy, `contentFunc` is shown, otherwise `elseFunc` is shown.  An empty array is considered falsy.
 * @param {Function} contentFunc A Function that returns [*renderable content*](#renderable_content).                  // 61
 * @param {Function} [elseFunc] Optional.  A Function that returns [*renderable content*](#renderable_content).  If no `elseFunc` is supplied, no content is shown in the "else" case.
 */                                                                                                                    // 63
Blaze.Unless = function (conditionFunc, contentFunc, elseFunc) {                                                       // 64
  return Blaze.If(conditionFunc, contentFunc, elseFunc, true /*_not*/);                                                // 65
};                                                                                                                     // 66
                                                                                                                       // 67
/**                                                                                                                    // 68
 * @summary Constructs a View that renders `contentFunc` for each item in a sequence.                                  // 69
 * @locus Client                                                                                                       // 70
 * @param {Function} argFunc A function to reactively re-run.  The function may return a Cursor, an array, null, or undefined.
 * @param {Function} contentFunc A Function that returns [*renderable content*](#renderable_content).                  // 72
 * @param {Function} [elseFunc] Optional.  A Function that returns [*renderable content*](#renderable_content) to display in the case when there are no items to display.
 */                                                                                                                    // 74
Blaze.Each = function (argFunc, contentFunc, elseFunc) {                                                               // 75
  var eachView = Blaze.View('each', function () {                                                                      // 76
    var subviews = this.initialSubviews;                                                                               // 77
    this.initialSubviews = null;                                                                                       // 78
    if (this._isCreatedForExpansion) {                                                                                 // 79
      this.expandedValueDep = new Tracker.Dependency;                                                                  // 80
      this.expandedValueDep.depend();                                                                                  // 81
    }                                                                                                                  // 82
    return subviews;                                                                                                   // 83
  });                                                                                                                  // 84
  eachView.initialSubviews = [];                                                                                       // 85
  eachView.numItems = 0;                                                                                               // 86
  eachView.inElseMode = false;                                                                                         // 87
  eachView.stopHandle = null;                                                                                          // 88
  eachView.contentFunc = contentFunc;                                                                                  // 89
  eachView.elseFunc = elseFunc;                                                                                        // 90
  eachView.argVar = new ReactiveVar;                                                                                   // 91
                                                                                                                       // 92
  eachView.onViewCreated(function () {                                                                                 // 93
    // We evaluate argFunc in an autorun to make sure                                                                  // 94
    // Blaze.currentView is always set when it runs (rather than                                                       // 95
    // passing argFunc straight to ObserveSequence).                                                                   // 96
    eachView.autorun(function () {                                                                                     // 97
      eachView.argVar.set(argFunc());                                                                                  // 98
    }, eachView.parentView, 'collection');                                                                             // 99
                                                                                                                       // 100
    eachView.stopHandle = ObserveSequence.observe(function () {                                                        // 101
      return eachView.argVar.get();                                                                                    // 102
    }, {                                                                                                               // 103
      addedAt: function (id, item, index) {                                                                            // 104
        Tracker.nonreactive(function () {                                                                              // 105
          var newItemView = Blaze.With(item, eachView.contentFunc);                                                    // 106
          eachView.numItems++;                                                                                         // 107
                                                                                                                       // 108
          if (eachView.expandedValueDep) {                                                                             // 109
            eachView.expandedValueDep.changed();                                                                       // 110
          } else if (eachView._domrange) {                                                                             // 111
            if (eachView.inElseMode) {                                                                                 // 112
              eachView._domrange.removeMember(0);                                                                      // 113
              eachView.inElseMode = false;                                                                             // 114
            }                                                                                                          // 115
                                                                                                                       // 116
            var range = Blaze._materializeView(newItemView, eachView);                                                 // 117
            eachView._domrange.addMember(range, index);                                                                // 118
          } else {                                                                                                     // 119
            eachView.initialSubviews.splice(index, 0, newItemView);                                                    // 120
          }                                                                                                            // 121
        });                                                                                                            // 122
      },                                                                                                               // 123
      removedAt: function (id, item, index) {                                                                          // 124
        Tracker.nonreactive(function () {                                                                              // 125
          eachView.numItems--;                                                                                         // 126
          if (eachView.expandedValueDep) {                                                                             // 127
            eachView.expandedValueDep.changed();                                                                       // 128
          } else if (eachView._domrange) {                                                                             // 129
            eachView._domrange.removeMember(index);                                                                    // 130
            if (eachView.elseFunc && eachView.numItems === 0) {                                                        // 131
              eachView.inElseMode = true;                                                                              // 132
              eachView._domrange.addMember(                                                                            // 133
                Blaze._materializeView(                                                                                // 134
                  Blaze.View('each_else',eachView.elseFunc),                                                           // 135
                  eachView), 0);                                                                                       // 136
            }                                                                                                          // 137
          } else {                                                                                                     // 138
            eachView.initialSubviews.splice(index, 1);                                                                 // 139
          }                                                                                                            // 140
        });                                                                                                            // 141
      },                                                                                                               // 142
      changedAt: function (id, newItem, oldItem, index) {                                                              // 143
        Tracker.nonreactive(function () {                                                                              // 144
          if (eachView.expandedValueDep) {                                                                             // 145
            eachView.expandedValueDep.changed();                                                                       // 146
          } else {                                                                                                     // 147
            var itemView;                                                                                              // 148
            if (eachView._domrange) {                                                                                  // 149
              itemView = eachView._domrange.getMember(index).view;                                                     // 150
            } else {                                                                                                   // 151
              itemView = eachView.initialSubviews[index];                                                              // 152
            }                                                                                                          // 153
            itemView.dataVar.set(newItem);                                                                             // 154
          }                                                                                                            // 155
        });                                                                                                            // 156
      },                                                                                                               // 157
      movedTo: function (id, item, fromIndex, toIndex) {                                                               // 158
        Tracker.nonreactive(function () {                                                                              // 159
          if (eachView.expandedValueDep) {                                                                             // 160
            eachView.expandedValueDep.changed();                                                                       // 161
          } else if (eachView._domrange) {                                                                             // 162
            eachView._domrange.moveMember(fromIndex, toIndex);                                                         // 163
          } else {                                                                                                     // 164
            var subviews = eachView.initialSubviews;                                                                   // 165
            var itemView = subviews[fromIndex];                                                                        // 166
            subviews.splice(fromIndex, 1);                                                                             // 167
            subviews.splice(toIndex, 0, itemView);                                                                     // 168
          }                                                                                                            // 169
        });                                                                                                            // 170
      }                                                                                                                // 171
    });                                                                                                                // 172
                                                                                                                       // 173
    if (eachView.elseFunc && eachView.numItems === 0) {                                                                // 174
      eachView.inElseMode = true;                                                                                      // 175
      eachView.initialSubviews[0] =                                                                                    // 176
        Blaze.View('each_else', eachView.elseFunc);                                                                    // 177
    }                                                                                                                  // 178
  });                                                                                                                  // 179
                                                                                                                       // 180
  eachView.onViewDestroyed(function () {                                                                               // 181
    if (eachView.stopHandle)                                                                                           // 182
      eachView.stopHandle.stop();                                                                                      // 183
  });                                                                                                                  // 184
                                                                                                                       // 185
  return eachView;                                                                                                     // 186
};                                                                                                                     // 187
                                                                                                                       // 188
Blaze._TemplateWith = function (arg, contentFunc) {                                                                    // 189
  var w;                                                                                                               // 190
                                                                                                                       // 191
  var argFunc = arg;                                                                                                   // 192
  if (typeof arg !== 'function') {                                                                                     // 193
    argFunc = function () {                                                                                            // 194
      return arg;                                                                                                      // 195
    };                                                                                                                 // 196
  }                                                                                                                    // 197
                                                                                                                       // 198
  // This is a little messy.  When we compile `{{> Template.contentBlock}}`, we                                        // 199
  // wrap it in Blaze._InOuterTemplateScope in order to skip the intermediate                                          // 200
  // parent Views in the current template.  However, when there's an argument                                          // 201
  // (`{{> Template.contentBlock arg}}`), the argument needs to be evaluated                                           // 202
  // in the original scope.  There's no good order to nest                                                             // 203
  // Blaze._InOuterTemplateScope and Spacebars.TemplateWith to achieve this,                                           // 204
  // so we wrap argFunc to run it in the "original parentView" of the                                                  // 205
  // Blaze._InOuterTemplateScope.                                                                                      // 206
  //                                                                                                                   // 207
  // To make this better, reconsider _InOuterTemplateScope as a primitive.                                             // 208
  // Longer term, evaluate expressions in the proper lexical scope.                                                    // 209
  var wrappedArgFunc = function () {                                                                                   // 210
    var viewToEvaluateArg = null;                                                                                      // 211
    if (w.parentView && w.parentView.name === 'InOuterTemplateScope') {                                                // 212
      viewToEvaluateArg = w.parentView.originalParentView;                                                             // 213
    }                                                                                                                  // 214
    if (viewToEvaluateArg) {                                                                                           // 215
      return Blaze._withCurrentView(viewToEvaluateArg, argFunc);                                                       // 216
    } else {                                                                                                           // 217
      return argFunc();                                                                                                // 218
    }                                                                                                                  // 219
  };                                                                                                                   // 220
                                                                                                                       // 221
  var wrappedContentFunc = function () {                                                                               // 222
    var content = contentFunc.call(this);                                                                              // 223
                                                                                                                       // 224
    // Since we are generating the Blaze._TemplateWith view for the                                                    // 225
    // user, set the flag on the child view.  If `content` is a template,                                              // 226
    // construct the View so that we can set the flag.                                                                 // 227
    if (content instanceof Blaze.Template) {                                                                           // 228
      content = content.constructView();                                                                               // 229
    }                                                                                                                  // 230
    if (content instanceof Blaze.View) {                                                                               // 231
      content._hasGeneratedParent = true;                                                                              // 232
    }                                                                                                                  // 233
                                                                                                                       // 234
    return content;                                                                                                    // 235
  };                                                                                                                   // 236
                                                                                                                       // 237
  w = Blaze.With(wrappedArgFunc, wrappedContentFunc);                                                                  // 238
  w.__isTemplateWith = true;                                                                                           // 239
  return w;                                                                                                            // 240
};                                                                                                                     // 241
                                                                                                                       // 242
Blaze._InOuterTemplateScope = function (templateView, contentFunc) {                                                   // 243
  var view = Blaze.View('InOuterTemplateScope', contentFunc);                                                          // 244
  var parentView = templateView.parentView;                                                                            // 245
                                                                                                                       // 246
  // Hack so that if you call `{{> foo bar}}` and it expands into                                                      // 247
  // `{{#with bar}}{{> foo}}{{/with}}`, and then `foo` is a template                                                   // 248
  // that inserts `{{> Template.contentBlock}}`, the data context for                                                  // 249
  // `Template.contentBlock` is not `bar` but the one enclosing that.                                                  // 250
  if (parentView.__isTemplateWith)                                                                                     // 251
    parentView = parentView.parentView;                                                                                // 252
                                                                                                                       // 253
  view.onViewCreated(function () {                                                                                     // 254
    this.originalParentView = this.parentView;                                                                         // 255
    this.parentView = parentView;                                                                                      // 256
  });                                                                                                                  // 257
  return view;                                                                                                         // 258
};                                                                                                                     // 259
                                                                                                                       // 260
// XXX COMPAT WITH 0.9.0                                                                                               // 261
Blaze.InOuterTemplateScope = Blaze._InOuterTemplateScope;                                                              // 262
                                                                                                                       // 263
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function () {

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/blaze/lookup.js                                                                                            //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
Blaze._globalHelpers = {};                                                                                             // 1
                                                                                                                       // 2
// Documented as Template.registerHelper.                                                                              // 3
// This definition also provides back-compat for `UI.registerHelper`.                                                  // 4
Blaze.registerHelper = function (name, func) {                                                                         // 5
  Blaze._globalHelpers[name] = func;                                                                                   // 6
};                                                                                                                     // 7
                                                                                                                       // 8
var bindIfIsFunction = function (x, target) {                                                                          // 9
  if (typeof x !== 'function')                                                                                         // 10
    return x;                                                                                                          // 11
  return _.bind(x, target);                                                                                            // 12
};                                                                                                                     // 13
                                                                                                                       // 14
// If `x` is a function, binds the value of `this` for that function                                                   // 15
// to the current data context.                                                                                        // 16
var bindDataContext = function (x) {                                                                                   // 17
  if (typeof x === 'function') {                                                                                       // 18
    return function () {                                                                                               // 19
      var data = Blaze.getData();                                                                                      // 20
      if (data == null)                                                                                                // 21
        data = {};                                                                                                     // 22
      return x.apply(data, arguments);                                                                                 // 23
    };                                                                                                                 // 24
  }                                                                                                                    // 25
  return x;                                                                                                            // 26
};                                                                                                                     // 27
                                                                                                                       // 28
Blaze._OLDSTYLE_HELPER = {};                                                                                           // 29
                                                                                                                       // 30
var getTemplateHelper = Blaze._getTemplateHelper = function (template, name) {                                         // 31
  // XXX COMPAT WITH 0.9.3                                                                                             // 32
  var isKnownOldStyleHelper = false;                                                                                   // 33
                                                                                                                       // 34
  if (template.__helpers.has(name)) {                                                                                  // 35
    var helper = template.__helpers.get(name);                                                                         // 36
    if (helper === Blaze._OLDSTYLE_HELPER) {                                                                           // 37
      isKnownOldStyleHelper = true;                                                                                    // 38
    } else {                                                                                                           // 39
      return helper;                                                                                                   // 40
    }                                                                                                                  // 41
  }                                                                                                                    // 42
                                                                                                                       // 43
  // old-style helper                                                                                                  // 44
  if (name in template) {                                                                                              // 45
    // Only warn once per helper                                                                                       // 46
    if (! isKnownOldStyleHelper) {                                                                                     // 47
      template.__helpers.set(name, Blaze._OLDSTYLE_HELPER);                                                            // 48
      if (! template._NOWARN_OLDSTYLE_HELPERS) {                                                                       // 49
        Blaze._warn('Assigning helper with `' + template.viewName + '.' +                                              // 50
                    name + ' = ...` is deprecated.  Use `' + template.viewName +                                       // 51
                    '.helpers(...)` instead.');                                                                        // 52
      }                                                                                                                // 53
    }                                                                                                                  // 54
    return template[name];                                                                                             // 55
  }                                                                                                                    // 56
                                                                                                                       // 57
  return null;                                                                                                         // 58
};                                                                                                                     // 59
                                                                                                                       // 60
var wrapHelper = function (f, templateFunc) {                                                                          // 61
  if (typeof f !== "function") {                                                                                       // 62
    return f;                                                                                                          // 63
  }                                                                                                                    // 64
                                                                                                                       // 65
  return function () {                                                                                                 // 66
    var self = this;                                                                                                   // 67
    var args = arguments;                                                                                              // 68
                                                                                                                       // 69
    return Blaze.Template._withTemplateInstanceFunc(templateFunc, function () {                                        // 70
      return Blaze._wrapCatchingExceptions(f, 'template helper').apply(self, args);                                    // 71
    });                                                                                                                // 72
  };                                                                                                                   // 73
};                                                                                                                     // 74
                                                                                                                       // 75
// Looks up a name, like "foo" or "..", as a helper of the                                                             // 76
// current template; a global helper; the name of a template;                                                          // 77
// or a property of the data context.  Called on the View of                                                           // 78
// a template (i.e. a View with a `.template` property,                                                                // 79
// where the helpers are).  Used for the first name in a                                                               // 80
// "path" in a template tag, like "foo" in `{{foo.bar}}` or                                                            // 81
// ".." in `{{frobulate ../blah}}`.                                                                                    // 82
//                                                                                                                     // 83
// Returns a function, a non-function value, or null.  If                                                              // 84
// a function is found, it is bound appropriately.                                                                     // 85
//                                                                                                                     // 86
// NOTE: This function must not establish any reactive                                                                 // 87
// dependencies itself.  If there is any reactivity in the                                                             // 88
// value, lookup should return a function.                                                                             // 89
Blaze.View.prototype.lookup = function (name, _options) {                                                              // 90
  var template = this.template;                                                                                        // 91
  var lookupTemplate = _options && _options.template;                                                                  // 92
  var helper;                                                                                                          // 93
  var boundTmplInstance;                                                                                               // 94
                                                                                                                       // 95
  if (this.templateInstance) {                                                                                         // 96
    boundTmplInstance = _.bind(this.templateInstance, this);                                                           // 97
  }                                                                                                                    // 98
                                                                                                                       // 99
  if (/^\./.test(name)) {                                                                                              // 100
    // starts with a dot. must be a series of dots which maps to an                                                    // 101
    // ancestor of the appropriate height.                                                                             // 102
    if (!/^(\.)+$/.test(name))                                                                                         // 103
      throw new Error("id starting with dot must be a series of dots");                                                // 104
                                                                                                                       // 105
    return Blaze._parentData(name.length - 1, true /*_functionWrapped*/);                                              // 106
                                                                                                                       // 107
  } else if (template &&                                                                                               // 108
             ((helper = getTemplateHelper(template, name)) != null)) {                                                 // 109
    return wrapHelper(bindDataContext(helper), boundTmplInstance);                                                     // 110
  } else if (lookupTemplate && (name in Blaze.Template) &&                                                             // 111
             (Blaze.Template[name] instanceof Blaze.Template)) {                                                       // 112
    return Blaze.Template[name];                                                                                       // 113
  } else if (Blaze._globalHelpers[name] != null) {                                                                     // 114
    return wrapHelper(bindDataContext(Blaze._globalHelpers[name]),                                                     // 115
      boundTmplInstance);                                                                                              // 116
  } else {                                                                                                             // 117
    return function () {                                                                                               // 118
      var isCalledAsFunction = (arguments.length > 0);                                                                 // 119
      var data = Blaze.getData();                                                                                      // 120
      if (lookupTemplate && ! (data && data[name])) {                                                                  // 121
        throw new Error("No such template: " + name);                                                                  // 122
      }                                                                                                                // 123
      if (isCalledAsFunction && ! (data && data[name])) {                                                              // 124
        throw new Error("No such function: " + name);                                                                  // 125
      }                                                                                                                // 126
      if (! data)                                                                                                      // 127
        return null;                                                                                                   // 128
      var x = data[name];                                                                                              // 129
      if (typeof x !== 'function') {                                                                                   // 130
        if (isCalledAsFunction) {                                                                                      // 131
          throw new Error("Can't call non-function: " + x);                                                            // 132
        }                                                                                                              // 133
        return x;                                                                                                      // 134
      }                                                                                                                // 135
      return x.apply(data, arguments);                                                                                 // 136
    };                                                                                                                 // 137
  }                                                                                                                    // 138
  return null;                                                                                                         // 139
};                                                                                                                     // 140
                                                                                                                       // 141
// Implement Spacebars' {{../..}}.                                                                                     // 142
// @param height {Number} The number of '..'s                                                                          // 143
Blaze._parentData = function (height, _functionWrapped) {                                                              // 144
  // If height is null or undefined, we default to 1, the first parent.                                                // 145
  if (height == null) {                                                                                                // 146
    height = 1;                                                                                                        // 147
  }                                                                                                                    // 148
  var theWith = Blaze.getView('with');                                                                                 // 149
  for (var i = 0; (i < height) && theWith; i++) {                                                                      // 150
    theWith = Blaze.getView(theWith, 'with');                                                                          // 151
  }                                                                                                                    // 152
                                                                                                                       // 153
  if (! theWith)                                                                                                       // 154
    return null;                                                                                                       // 155
  if (_functionWrapped)                                                                                                // 156
    return function () { return theWith.dataVar.get(); };                                                              // 157
  return theWith.dataVar.get();                                                                                        // 158
};                                                                                                                     // 159
                                                                                                                       // 160
                                                                                                                       // 161
Blaze.View.prototype.lookupTemplate = function (name) {                                                                // 162
  return this.lookup(name, {template:true});                                                                           // 163
};                                                                                                                     // 164
                                                                                                                       // 165
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function () {

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/blaze/template.js                                                                                          //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
// [new] Blaze.Template([viewName], renderFunction)                                                                    // 1
//                                                                                                                     // 2
// `Blaze.Template` is the class of templates, like `Template.foo` in                                                  // 3
// Meteor, which is `instanceof Template`.                                                                             // 4
//                                                                                                                     // 5
// `viewKind` is a string that looks like "Template.foo" for templates                                                 // 6
// defined by the compiler.                                                                                            // 7
                                                                                                                       // 8
/**                                                                                                                    // 9
 * @class                                                                                                              // 10
 * @summary Constructor for a Template, which is used to construct Views with particular name and content.             // 11
 * @locus Client                                                                                                       // 12
 * @param {String} [viewName] Optional.  A name for Views constructed by this Template.  See [`view.name`](#view_name).
 * @param {Function} renderFunction A function that returns [*renderable content*](#renderable_content).  This function is used as the `renderFunction` for Views constructed by this Template.
 */                                                                                                                    // 15
Blaze.Template = function (viewName, renderFunction) {                                                                 // 16
  if (! (this instanceof Blaze.Template))                                                                              // 17
    // called without `new`                                                                                            // 18
    return new Blaze.Template(viewName, renderFunction);                                                               // 19
                                                                                                                       // 20
  if (typeof viewName === 'function') {                                                                                // 21
    // omitted "viewName" argument                                                                                     // 22
    renderFunction = viewName;                                                                                         // 23
    viewName = '';                                                                                                     // 24
  }                                                                                                                    // 25
  if (typeof viewName !== 'string')                                                                                    // 26
    throw new Error("viewName must be a String (or omitted)");                                                         // 27
  if (typeof renderFunction !== 'function')                                                                            // 28
    throw new Error("renderFunction must be a function");                                                              // 29
                                                                                                                       // 30
  this.viewName = viewName;                                                                                            // 31
  this.renderFunction = renderFunction;                                                                                // 32
                                                                                                                       // 33
  this.__helpers = new HelperMap;                                                                                      // 34
  this.__eventMaps = [];                                                                                               // 35
                                                                                                                       // 36
  this._callbacks = {                                                                                                  // 37
    created: [],                                                                                                       // 38
    rendered: [],                                                                                                      // 39
    destroyed: []                                                                                                      // 40
  };                                                                                                                   // 41
};                                                                                                                     // 42
var Template = Blaze.Template;                                                                                         // 43
                                                                                                                       // 44
var HelperMap = function () {};                                                                                        // 45
HelperMap.prototype.get = function (name) {                                                                            // 46
  return this[' '+name];                                                                                               // 47
};                                                                                                                     // 48
HelperMap.prototype.set = function (name, helper) {                                                                    // 49
  this[' '+name] = helper;                                                                                             // 50
};                                                                                                                     // 51
HelperMap.prototype.has = function (name) {                                                                            // 52
  return (' '+name) in this;                                                                                           // 53
};                                                                                                                     // 54
                                                                                                                       // 55
/**                                                                                                                    // 56
 * @summary Returns true if `value` is a template object like `Template.myTemplate`.                                   // 57
 * @locus Client                                                                                                       // 58
 * @param {Any} value The value to test.                                                                               // 59
 */                                                                                                                    // 60
Blaze.isTemplate = function (t) {                                                                                      // 61
  return (t instanceof Blaze.Template);                                                                                // 62
};                                                                                                                     // 63
                                                                                                                       // 64
/**                                                                                                                    // 65
 * @name  onCreated                                                                                                    // 66
 * @instance                                                                                                           // 67
 * @memberOf Template                                                                                                  // 68
 * @summary Register a function to be called when an instance of this template is created.                             // 69
 * @param {Function} callback A function to be added as a callback.                                                    // 70
 * @locus Client                                                                                                       // 71
 */                                                                                                                    // 72
Template.prototype.onCreated = function (cb) {                                                                         // 73
  this._callbacks.created.push(cb);                                                                                    // 74
};                                                                                                                     // 75
                                                                                                                       // 76
/**                                                                                                                    // 77
 * @name  onRendered                                                                                                   // 78
 * @instance                                                                                                           // 79
 * @memberOf Template                                                                                                  // 80
 * @summary Register a function to be called when an instance of this template is inserted into the DOM.               // 81
 * @param {Function} callback A function to be added as a callback.                                                    // 82
 * @locus Client                                                                                                       // 83
 */                                                                                                                    // 84
Template.prototype.onRendered = function (cb) {                                                                        // 85
  this._callbacks.rendered.push(cb);                                                                                   // 86
};                                                                                                                     // 87
                                                                                                                       // 88
/**                                                                                                                    // 89
 * @name  onDestroyed                                                                                                  // 90
 * @instance                                                                                                           // 91
 * @memberOf Template                                                                                                  // 92
 * @summary Register a function to be called when an instance of this template is removed from the DOM and destroyed.  // 93
 * @param {Function} callback A function to be added as a callback.                                                    // 94
 * @locus Client                                                                                                       // 95
 */                                                                                                                    // 96
Template.prototype.onDestroyed = function (cb) {                                                                       // 97
  this._callbacks.destroyed.push(cb);                                                                                  // 98
};                                                                                                                     // 99
                                                                                                                       // 100
Template.prototype._getCallbacks = function (which) {                                                                  // 101
  var self = this;                                                                                                     // 102
  var callbacks = self[which] ? [self[which]] : [];                                                                    // 103
  // Fire all callbacks added with the new API (Template.onRendered())                                                 // 104
  // as well as the old-style callback (e.g. Template.rendered) for                                                    // 105
  // backwards-compatibility.                                                                                          // 106
  callbacks = callbacks.concat(self._callbacks[which]);                                                                // 107
  return callbacks;                                                                                                    // 108
};                                                                                                                     // 109
                                                                                                                       // 110
var fireCallbacks = function (callbacks, template) {                                                                   // 111
  Template._withTemplateInstanceFunc(                                                                                  // 112
    function () { return template; },                                                                                  // 113
    function () {                                                                                                      // 114
      for (var i = 0, N = callbacks.length; i < N; i++) {                                                              // 115
        callbacks[i].call(template);                                                                                   // 116
      }                                                                                                                // 117
    });                                                                                                                // 118
};                                                                                                                     // 119
                                                                                                                       // 120
Template.prototype.constructView = function (contentFunc, elseFunc) {                                                  // 121
  var self = this;                                                                                                     // 122
  var view = Blaze.View(self.viewName, self.renderFunction);                                                           // 123
  view.template = self;                                                                                                // 124
                                                                                                                       // 125
  view.templateContentBlock = (                                                                                        // 126
    contentFunc ? new Template('(contentBlock)', contentFunc) : null);                                                 // 127
  view.templateElseBlock = (                                                                                           // 128
    elseFunc ? new Template('(elseBlock)', elseFunc) : null);                                                          // 129
                                                                                                                       // 130
  if (self.__eventMaps || typeof self.events === 'object') {                                                           // 131
    view._onViewRendered(function () {                                                                                 // 132
      if (view.renderCount !== 1)                                                                                      // 133
        return;                                                                                                        // 134
                                                                                                                       // 135
      if (! self.__eventMaps.length && typeof self.events === "object") {                                              // 136
        // Provide limited back-compat support for `.events = {...}`                                                   // 137
        // syntax.  Pass `template.events` to the original `.events(...)`                                              // 138
        // function.  This code must run only once per template, in                                                    // 139
        // order to not bind the handlers more than once, which is                                                     // 140
        // ensured by the fact that we only do this when `__eventMaps`                                                 // 141
        // is falsy, and we cause it to be set now.                                                                    // 142
        Template.prototype.events.call(self, self.events);                                                             // 143
      }                                                                                                                // 144
                                                                                                                       // 145
      _.each(self.__eventMaps, function (m) {                                                                          // 146
        Blaze._addEventMap(view, m, view);                                                                             // 147
      });                                                                                                              // 148
    });                                                                                                                // 149
  }                                                                                                                    // 150
                                                                                                                       // 151
  view._templateInstance = new Blaze.TemplateInstance(view);                                                           // 152
  view.templateInstance = function () {                                                                                // 153
    // Update data, firstNode, and lastNode, and return the TemplateInstance                                           // 154
    // object.                                                                                                         // 155
    var inst = view._templateInstance;                                                                                 // 156
                                                                                                                       // 157
    /**                                                                                                                // 158
     * @instance                                                                                                       // 159
     * @memberOf Blaze.TemplateInstance                                                                                // 160
     * @name  data                                                                                                     // 161
     * @summary The data context of this instance's latest invocation.                                                 // 162
     * @locus Client                                                                                                   // 163
     */                                                                                                                // 164
    inst.data = Blaze.getData(view);                                                                                   // 165
                                                                                                                       // 166
    if (view._domrange && !view.isDestroyed) {                                                                         // 167
      inst.firstNode = view._domrange.firstNode();                                                                     // 168
      inst.lastNode = view._domrange.lastNode();                                                                       // 169
    } else {                                                                                                           // 170
      // on 'created' or 'destroyed' callbacks we don't have a DomRange                                                // 171
      inst.firstNode = null;                                                                                           // 172
      inst.lastNode = null;                                                                                            // 173
    }                                                                                                                  // 174
                                                                                                                       // 175
    return inst;                                                                                                       // 176
  };                                                                                                                   // 177
                                                                                                                       // 178
  /**                                                                                                                  // 179
   * @name  created                                                                                                    // 180
   * @instance                                                                                                         // 181
   * @memberOf Template                                                                                                // 182
   * @summary Provide a callback when an instance of a template is created.                                            // 183
   * @locus Client                                                                                                     // 184
   * @deprecated in 1.1                                                                                                // 185
   */                                                                                                                  // 186
  // To avoid situations when new callbacks are added in between view                                                  // 187
  // instantiation and event being fired, decide on all callbacks to fire                                              // 188
  // immediately and then fire them on the event.                                                                      // 189
  var createdCallbacks = self._getCallbacks('created');                                                                // 190
  view.onViewCreated(function () {                                                                                     // 191
    fireCallbacks(createdCallbacks, view.templateInstance());                                                          // 192
  });                                                                                                                  // 193
                                                                                                                       // 194
  /**                                                                                                                  // 195
   * @name  rendered                                                                                                   // 196
   * @instance                                                                                                         // 197
   * @memberOf Template                                                                                                // 198
   * @summary Provide a callback when an instance of a template is rendered.                                           // 199
   * @locus Client                                                                                                     // 200
   * @deprecated in 1.1                                                                                                // 201
   */                                                                                                                  // 202
  var renderedCallbacks = self._getCallbacks('rendered');                                                              // 203
  view.onViewReady(function () {                                                                                       // 204
    fireCallbacks(renderedCallbacks, view.templateInstance());                                                         // 205
  });                                                                                                                  // 206
                                                                                                                       // 207
  /**                                                                                                                  // 208
   * @name  destroyed                                                                                                  // 209
   * @instance                                                                                                         // 210
   * @memberOf Template                                                                                                // 211
   * @summary Provide a callback when an instance of a template is destroyed.                                          // 212
   * @locus Client                                                                                                     // 213
   * @deprecated in 1.1                                                                                                // 214
   */                                                                                                                  // 215
  var destroyedCallbacks = self._getCallbacks('destroyed');                                                            // 216
  view.onViewDestroyed(function () {                                                                                   // 217
    fireCallbacks(destroyedCallbacks, view.templateInstance());                                                        // 218
  });                                                                                                                  // 219
                                                                                                                       // 220
  return view;                                                                                                         // 221
};                                                                                                                     // 222
                                                                                                                       // 223
/**                                                                                                                    // 224
 * @class                                                                                                              // 225
 * @summary The class for template instances                                                                           // 226
 * @param {Blaze.View} view                                                                                            // 227
 * @instanceName template                                                                                              // 228
 */                                                                                                                    // 229
Blaze.TemplateInstance = function (view) {                                                                             // 230
  if (! (this instanceof Blaze.TemplateInstance))                                                                      // 231
    // called without `new`                                                                                            // 232
    return new Blaze.TemplateInstance(view);                                                                           // 233
                                                                                                                       // 234
  if (! (view instanceof Blaze.View))                                                                                  // 235
    throw new Error("View required");                                                                                  // 236
                                                                                                                       // 237
  view._templateInstance = this;                                                                                       // 238
                                                                                                                       // 239
  /**                                                                                                                  // 240
   * @name view                                                                                                        // 241
   * @memberOf Blaze.TemplateInstance                                                                                  // 242
   * @instance                                                                                                         // 243
   * @summary The [View](#blaze_view) object for this invocation of the template.                                      // 244
   * @locus Client                                                                                                     // 245
   * @type {Blaze.View}                                                                                                // 246
   */                                                                                                                  // 247
  this.view = view;                                                                                                    // 248
  this.data = null;                                                                                                    // 249
                                                                                                                       // 250
  /**                                                                                                                  // 251
   * @name firstNode                                                                                                   // 252
   * @memberOf Blaze.TemplateInstance                                                                                  // 253
   * @instance                                                                                                         // 254
   * @summary The first top-level DOM node in this template instance.                                                  // 255
   * @locus Client                                                                                                     // 256
   * @type {DOMNode}                                                                                                   // 257
   */                                                                                                                  // 258
  this.firstNode = null;                                                                                               // 259
                                                                                                                       // 260
  /**                                                                                                                  // 261
   * @name lastNode                                                                                                    // 262
   * @memberOf Blaze.TemplateInstance                                                                                  // 263
   * @instance                                                                                                         // 264
   * @summary The last top-level DOM node in this template instance.                                                   // 265
   * @locus Client                                                                                                     // 266
   * @type {DOMNode}                                                                                                   // 267
   */                                                                                                                  // 268
  this.lastNode = null;                                                                                                // 269
                                                                                                                       // 270
  // This dependency is used to identify state transitions in                                                          // 271
  // _subscriptionHandles which could cause the result of                                                              // 272
  // TemplateInstance#subscriptionsReady to change. Basically this is triggered                                        // 273
  // whenever a new subscription handle is added or when a subscription handle                                         // 274
  // is removed and they are not ready.                                                                                // 275
  this._allSubsReadyDep = new Tracker.Dependency();                                                                    // 276
  this._allSubsReady = false;                                                                                          // 277
                                                                                                                       // 278
  this._subscriptionHandles = {};                                                                                      // 279
};                                                                                                                     // 280
                                                                                                                       // 281
/**                                                                                                                    // 282
 * @summary Find all elements matching `selector` in this template instance, and return them as a JQuery object.       // 283
 * @locus Client                                                                                                       // 284
 * @param {String} selector The CSS selector to match, scoped to the template contents.                                // 285
 * @returns {DOMNode[]}                                                                                                // 286
 */                                                                                                                    // 287
Blaze.TemplateInstance.prototype.$ = function (selector) {                                                             // 288
  var view = this.view;                                                                                                // 289
  if (! view._domrange)                                                                                                // 290
    throw new Error("Can't use $ on template instance with no DOM");                                                   // 291
  return view._domrange.$(selector);                                                                                   // 292
};                                                                                                                     // 293
                                                                                                                       // 294
/**                                                                                                                    // 295
 * @summary Find all elements matching `selector` in this template instance.                                           // 296
 * @locus Client                                                                                                       // 297
 * @param {String} selector The CSS selector to match, scoped to the template contents.                                // 298
 * @returns {DOMElement[]}                                                                                             // 299
 */                                                                                                                    // 300
Blaze.TemplateInstance.prototype.findAll = function (selector) {                                                       // 301
  return Array.prototype.slice.call(this.$(selector));                                                                 // 302
};                                                                                                                     // 303
                                                                                                                       // 304
/**                                                                                                                    // 305
 * @summary Find one element matching `selector` in this template instance.                                            // 306
 * @locus Client                                                                                                       // 307
 * @param {String} selector The CSS selector to match, scoped to the template contents.                                // 308
 * @returns {DOMElement}                                                                                               // 309
 */                                                                                                                    // 310
Blaze.TemplateInstance.prototype.find = function (selector) {                                                          // 311
  var result = this.$(selector);                                                                                       // 312
  return result[0] || null;                                                                                            // 313
};                                                                                                                     // 314
                                                                                                                       // 315
/**                                                                                                                    // 316
 * @summary A version of [Tracker.autorun](#tracker_autorun) that is stopped when the template is destroyed.           // 317
 * @locus Client                                                                                                       // 318
 * @param {Function} runFunc The function to run. It receives one argument: a Tracker.Computation object.              // 319
 */                                                                                                                    // 320
Blaze.TemplateInstance.prototype.autorun = function (f) {                                                              // 321
  return this.view.autorun(f);                                                                                         // 322
};                                                                                                                     // 323
                                                                                                                       // 324
/**                                                                                                                    // 325
 * @summary A version of [Meteor.subscribe](#meteor_subscribe) that is stopped                                         // 326
 * when the template is destroyed.                                                                                     // 327
 * @return {SubscriptionHandle} The subscription handle to the newly made                                              // 328
 * subscription. Call `handle.stop()` to manually stop the subscription, or                                            // 329
 * `handle.ready()` to find out if this particular subscription has loaded all                                         // 330
 * of its inital data.                                                                                                 // 331
 * @locus Client                                                                                                       // 332
 * @param {String} name Name of the subscription.  Matches the name of the                                             // 333
 * server's `publish()` call.                                                                                          // 334
 * @param {Any} [arg1,arg2...] Optional arguments passed to publisher function                                         // 335
 * on server.                                                                                                          // 336
 * @param {Function|Object} [callbacks] Optional. May include `onStop` and                                             // 337
 * `onReady` callbacks. If a function is passed instead of an object, it is                                            // 338
 * interpreted as an `onReady` callback.                                                                               // 339
 */                                                                                                                    // 340
Blaze.TemplateInstance.prototype.subscribe = function (/* arguments */) {                                              // 341
  var self = this;                                                                                                     // 342
                                                                                                                       // 343
  var subHandles = self._subscriptionHandles;                                                                          // 344
  var args = _.toArray(arguments);                                                                                     // 345
                                                                                                                       // 346
  // Duplicate logic from Meteor.subscribe                                                                             // 347
  var callbacks = {};                                                                                                  // 348
  if (args.length) {                                                                                                   // 349
    var lastParam = _.last(args);                                                                                      // 350
    if (_.isFunction(lastParam)) {                                                                                     // 351
      callbacks.onReady = args.pop();                                                                                  // 352
    } else if (lastParam &&                                                                                            // 353
      // XXX COMPAT WITH 1.0.3.1 onError used to exist, but now we use                                                 // 354
      // onStop with an error callback instead.                                                                        // 355
      _.any([lastParam.onReady, lastParam.onError, lastParam.onStop],                                                  // 356
        _.isFunction)) {                                                                                               // 357
      callbacks = args.pop();                                                                                          // 358
    }                                                                                                                  // 359
  }                                                                                                                    // 360
                                                                                                                       // 361
  var subHandle;                                                                                                       // 362
  var oldStopped = callbacks.onStop;                                                                                   // 363
  callbacks.onStop = function (error) {                                                                                // 364
    // When the subscription is stopped, remove it from the set of tracked                                             // 365
    // subscriptions to avoid this list growing without bound                                                          // 366
    delete subHandles[subHandle.subscriptionId];                                                                       // 367
                                                                                                                       // 368
    // Removing a subscription can only change the result of subscriptionsReady                                        // 369
    // if we are not ready (that subscription could be the one blocking us being                                       // 370
    // ready).                                                                                                         // 371
    if (! self._allSubsReady) {                                                                                        // 372
      self._allSubsReadyDep.changed();                                                                                 // 373
    }                                                                                                                  // 374
                                                                                                                       // 375
    if (oldStopped) {                                                                                                  // 376
      oldStopped(error);                                                                                               // 377
    }                                                                                                                  // 378
  };                                                                                                                   // 379
  args.push(callbacks);                                                                                                // 380
                                                                                                                       // 381
  subHandle = self.view.subscribe.call(self.view, args);                                                               // 382
                                                                                                                       // 383
  if (! _.has(subHandles, subHandle.subscriptionId)) {                                                                 // 384
    subHandles[subHandle.subscriptionId] = subHandle;                                                                  // 385
                                                                                                                       // 386
    // Adding a new subscription will always cause us to transition from ready                                         // 387
    // to not ready, but if we are already not ready then this can't make us                                           // 388
    // ready.                                                                                                          // 389
    if (self._allSubsReady) {                                                                                          // 390
      self._allSubsReadyDep.changed();                                                                                 // 391
    }                                                                                                                  // 392
  }                                                                                                                    // 393
                                                                                                                       // 394
  return subHandle;                                                                                                    // 395
};                                                                                                                     // 396
                                                                                                                       // 397
/**                                                                                                                    // 398
 * @summary A reactive function that returns true when all of the subscriptions                                        // 399
 * called with [this.subscribe](#TemplateInstance-subscribe) are ready.                                                // 400
 * @return {Boolean} True if all subscriptions on this template instance are                                           // 401
 * ready.                                                                                                              // 402
 */                                                                                                                    // 403
Blaze.TemplateInstance.prototype.subscriptionsReady = function () {                                                    // 404
  this._allSubsReadyDep.depend();                                                                                      // 405
                                                                                                                       // 406
  this._allSubsReady = _.all(this._subscriptionHandles, function (handle) {                                            // 407
    return handle.ready();                                                                                             // 408
  });                                                                                                                  // 409
                                                                                                                       // 410
  return this._allSubsReady;                                                                                           // 411
};                                                                                                                     // 412
                                                                                                                       // 413
/**                                                                                                                    // 414
 * @summary Specify template helpers available to this template.                                                       // 415
 * @locus Client                                                                                                       // 416
 * @param {Object} helpers Dictionary of helper functions by name.                                                     // 417
 */                                                                                                                    // 418
Template.prototype.helpers = function (dict) {                                                                         // 419
  for (var k in dict)                                                                                                  // 420
    this.__helpers.set(k, dict[k]);                                                                                    // 421
};                                                                                                                     // 422
                                                                                                                       // 423
// Kind of like Blaze.currentView but for the template instance.                                                       // 424
// This is a function, not a value -- so that not all helpers                                                          // 425
// are implicitly dependent on the current template instance's `data` property,                                        // 426
// which would make them dependenct on the data context of the template                                                // 427
// inclusion.                                                                                                          // 428
Template._currentTemplateInstanceFunc = null;                                                                          // 429
                                                                                                                       // 430
Template._withTemplateInstanceFunc = function (templateInstanceFunc, func) {                                           // 431
  if (typeof func !== 'function')                                                                                      // 432
    throw new Error("Expected function, got: " + func);                                                                // 433
  var oldTmplInstanceFunc = Template._currentTemplateInstanceFunc;                                                     // 434
  try {                                                                                                                // 435
    Template._currentTemplateInstanceFunc = templateInstanceFunc;                                                      // 436
    return func();                                                                                                     // 437
  } finally {                                                                                                          // 438
    Template._currentTemplateInstanceFunc = oldTmplInstanceFunc;                                                       // 439
  }                                                                                                                    // 440
};                                                                                                                     // 441
                                                                                                                       // 442
/**                                                                                                                    // 443
 * @summary Specify event handlers for this template.                                                                  // 444
 * @locus Client                                                                                                       // 445
 * @param {EventMap} eventMap Event handlers to associate with this template.                                          // 446
 */                                                                                                                    // 447
Template.prototype.events = function (eventMap) {                                                                      // 448
  var template = this;                                                                                                 // 449
  var eventMap2 = {};                                                                                                  // 450
  for (var k in eventMap) {                                                                                            // 451
    eventMap2[k] = (function (k, v) {                                                                                  // 452
      return function (event/*, ...*/) {                                                                               // 453
        var view = this; // passed by EventAugmenter                                                                   // 454
        var data = Blaze.getData(event.currentTarget);                                                                 // 455
        if (data == null)                                                                                              // 456
          data = {};                                                                                                   // 457
        var args = Array.prototype.slice.call(arguments);                                                              // 458
        var tmplInstanceFunc = _.bind(view.templateInstance, view);                                                    // 459
        args.splice(1, 0, tmplInstanceFunc());                                                                         // 460
                                                                                                                       // 461
        return Template._withTemplateInstanceFunc(tmplInstanceFunc, function () {                                      // 462
          return v.apply(data, args);                                                                                  // 463
        });                                                                                                            // 464
      };                                                                                                               // 465
    })(k, eventMap[k]);                                                                                                // 466
  }                                                                                                                    // 467
                                                                                                                       // 468
  template.__eventMaps.push(eventMap2);                                                                                // 469
};                                                                                                                     // 470
                                                                                                                       // 471
/**                                                                                                                    // 472
 * @function                                                                                                           // 473
 * @name instance                                                                                                      // 474
 * @memberOf Template                                                                                                  // 475
 * @summary The [template instance](#template_inst) corresponding to the current template helper, event handler, callback, or autorun.  If there isn't one, `null`.
 * @locus Client                                                                                                       // 477
 * @returns {Blaze.TemplateInstance}                                                                                   // 478
 */                                                                                                                    // 479
Template.instance = function () {                                                                                      // 480
  return Template._currentTemplateInstanceFunc                                                                         // 481
    && Template._currentTemplateInstanceFunc();                                                                        // 482
};                                                                                                                     // 483
                                                                                                                       // 484
// Note: Template.currentData() is documented to take zero arguments,                                                  // 485
// while Blaze.getData takes up to one.                                                                                // 486
                                                                                                                       // 487
/**                                                                                                                    // 488
 * @summary                                                                                                            // 489
 *                                                                                                                     // 490
 * - Inside an `onCreated`, `onRendered`, or `onDestroyed` callback, returns                                           // 491
 * the data context of the template.                                                                                   // 492
 * - Inside an event handler, returns the data context of the template on which                                        // 493
 * this event handler was defined.                                                                                     // 494
 * - Inside a helper, returns the data context of the DOM node where the helper                                        // 495
 * was used.                                                                                                           // 496
 *                                                                                                                     // 497
 * Establishes a reactive dependency on the result.                                                                    // 498
 * @locus Client                                                                                                       // 499
 * @function                                                                                                           // 500
 */                                                                                                                    // 501
Template.currentData = Blaze.getData;                                                                                  // 502
                                                                                                                       // 503
/**                                                                                                                    // 504
 * @summary Accesses other data contexts that enclose the current data context.                                        // 505
 * @locus Client                                                                                                       // 506
 * @function                                                                                                           // 507
 * @param {Integer} [numLevels] The number of levels beyond the current data context to look. Defaults to 1.           // 508
 */                                                                                                                    // 509
Template.parentData = Blaze._parentData;                                                                               // 510
                                                                                                                       // 511
/**                                                                                                                    // 512
 * @summary Defines a [helper function](#template_helpers) which can be used from all templates.                       // 513
 * @locus Client                                                                                                       // 514
 * @function                                                                                                           // 515
 * @param {String} name The name of the helper function you are defining.                                              // 516
 * @param {Function} function The helper function itself.                                                              // 517
 */                                                                                                                    // 518
Template.registerHelper = Blaze.registerHelper;                                                                        // 519
                                                                                                                       // 520
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function () {

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/blaze/backcompat.js                                                                                        //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
UI = Blaze;                                                                                                            // 1
                                                                                                                       // 2
Blaze.ReactiveVar = ReactiveVar;                                                                                       // 3
UI._templateInstance = Blaze.Template.instance;                                                                        // 4
                                                                                                                       // 5
Handlebars = {};                                                                                                       // 6
Handlebars.registerHelper = Blaze.registerHelper;                                                                      // 7
                                                                                                                       // 8
Handlebars._escape = Blaze._escape;                                                                                    // 9
                                                                                                                       // 10
// Return these from {{...}} helpers to achieve the same as returning                                                  // 11
// strings from {{{...}}} helpers                                                                                      // 12
Handlebars.SafeString = function(string) {                                                                             // 13
  this.string = string;                                                                                                // 14
};                                                                                                                     // 15
Handlebars.SafeString.prototype.toString = function() {                                                                // 16
  return this.string.toString();                                                                                       // 17
};                                                                                                                     // 18
                                                                                                                       // 19
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);


/* Exports */
if (typeof Package === 'undefined') Package = {};
Package.blaze = {
  Blaze: Blaze,
  UI: UI,
  Handlebars: Handlebars
};

})();

//# sourceMappingURL=blaze.js.map
