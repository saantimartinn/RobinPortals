'use strict';

// Gives every app of the shared site its own environment, as if it were still
// its own Netlify project. The site environment holds each app's variables
// under a prefix (PORTAL__SUPABASE_URL, ROBINJR__SUPABASE_URL, …); while one
// app's function runs, process.env shows that app's variables under their
// plain names, hides the other apps' ones, and falls back to the site
// variables (URL, CONTEXT, PATH, …) for everything else. AsyncLocalStorage
// keeps concurrent invocations of different apps apart, which matters in
// `netlify dev`, where every function shares one process.
const { AsyncLocalStorage } = require('node:async_hooks');

const SEPARATOR = '__';
// Must list every app id in site/apps.mjs (site/env.mjs checks it).
const APP_IDS = ['portal', 'robinjr', 'community', 'admin'];
const storage = new AsyncLocalStorage();
const siteEnv = process.env;
const scopes = new Map();

function prefix(appId) {
  return `${appId.toUpperCase()}${SEPARATOR}`;
}

function isScopedKey(key) {
  return typeof key === 'string' && APP_IDS.some((appId) => key.startsWith(prefix(appId)));
}

function scopeFor(appId) {
  if (!scopes.has(appId)) {
    const own = prefix(appId);
    const values = {};
    for (const [key, value] of Object.entries(siteEnv)) {
      if (key.startsWith(own)) values[key.slice(own.length)] = value;
    }
    scopes.set(appId, values);
  }
  return scopes.get(appId);
}

function visibleKeys(scope) {
  const keys = new Set(Object.keys(scope));
  for (const key of Object.keys(siteEnv)) if (!isScopedKey(key)) keys.add(key);
  return [...keys];
}

const scopedEnv = new Proxy(siteEnv, {
  get(target, key) {
    const scope = storage.getStore();
    if (!scope || typeof key !== 'string') return Reflect.get(target, key);
    if (Object.prototype.hasOwnProperty.call(scope, key)) return scope[key];
    return isScopedKey(key) ? undefined : Reflect.get(target, key);
  },
  set(target, key, value) {
    const scope = storage.getStore();
    if (!scope || typeof key !== 'string') return Reflect.set(target, key, value);
    scope[key] = String(value);
    return true;
  },
  deleteProperty(target, key) {
    const scope = storage.getStore();
    if (!scope) return Reflect.deleteProperty(target, key);
    delete scope[key];
    return true;
  },
  has(target, key) {
    const scope = storage.getStore();
    if (!scope || typeof key !== 'string') return Reflect.has(target, key);
    return Object.prototype.hasOwnProperty.call(scope, key) || (!isScopedKey(key) && Reflect.has(target, key));
  },
  ownKeys(target) {
    const scope = storage.getStore();
    return scope ? visibleKeys(scope) : Reflect.ownKeys(target);
  },
  getOwnPropertyDescriptor(target, key) {
    const scope = storage.getStore();
    if (!scope || typeof key !== 'string') return Reflect.getOwnPropertyDescriptor(target, key);
    if (Object.prototype.hasOwnProperty.call(scope, key)) return { value: scope[key], writable: true, enumerable: true, configurable: true };
    return isScopedKey(key) ? undefined : Reflect.getOwnPropertyDescriptor(target, key);
  },
});

if (process.env !== scopedEnv) process.env = scopedEnv;

/** Loads an app's function module inside that app's environment and runs each
 * of its exports there too. `load` must require the function lazily. */
function wrapFunction(appId, load) {
  const scope = scopeFor(appId);
  const mod = storage.run(scope, load);
  const wrapped = {};
  for (const [name, value] of Object.entries(mod)) {
    wrapped[name] = typeof value === 'function' ? (...args) => storage.run(scope, () => value(...args)) : value;
  }
  return wrapped;
}

module.exports = { wrapFunction, prefix, APP_IDS };
