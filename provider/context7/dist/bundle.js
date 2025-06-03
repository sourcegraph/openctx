"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// index.ts
var context7_exports = {};
__export(context7_exports, {
  default: () => context7_default
});
module.exports = __toCommonJS(context7_exports);

// ../../node_modules/.pnpm/quick-lru@7.0.1/node_modules/quick-lru/index.js
var QuickLRU = class extends Map {
  #size = 0;
  #cache = /* @__PURE__ */ new Map();
  #oldCache = /* @__PURE__ */ new Map();
  #maxSize;
  #maxAge;
  #onEviction;
  constructor(options = {}) {
    super();
    if (!(options.maxSize && options.maxSize > 0)) {
      throw new TypeError("`maxSize` must be a number greater than 0");
    }
    if (typeof options.maxAge === "number" && options.maxAge === 0) {
      throw new TypeError("`maxAge` must be a number greater than 0");
    }
    this.#maxSize = options.maxSize;
    this.#maxAge = options.maxAge || Number.POSITIVE_INFINITY;
    this.#onEviction = options.onEviction;
  }
  // For tests.
  get __oldCache() {
    return this.#oldCache;
  }
  #emitEvictions(cache) {
    if (typeof this.#onEviction !== "function") {
      return;
    }
    for (const [key, item] of cache) {
      this.#onEviction(key, item.value);
    }
  }
  #deleteIfExpired(key, item) {
    if (typeof item.expiry === "number" && item.expiry <= Date.now()) {
      if (typeof this.#onEviction === "function") {
        this.#onEviction(key, item.value);
      }
      return this.delete(key);
    }
    return false;
  }
  #getOrDeleteIfExpired(key, item) {
    const deleted = this.#deleteIfExpired(key, item);
    if (deleted === false) {
      return item.value;
    }
  }
  #getItemValue(key, item) {
    return item.expiry ? this.#getOrDeleteIfExpired(key, item) : item.value;
  }
  #peek(key, cache) {
    const item = cache.get(key);
    return this.#getItemValue(key, item);
  }
  #set(key, value) {
    this.#cache.set(key, value);
    this.#size++;
    if (this.#size >= this.#maxSize) {
      this.#size = 0;
      this.#emitEvictions(this.#oldCache);
      this.#oldCache = this.#cache;
      this.#cache = /* @__PURE__ */ new Map();
    }
  }
  #moveToRecent(key, item) {
    this.#oldCache.delete(key);
    this.#set(key, item);
  }
  *#entriesAscending() {
    for (const item of this.#oldCache) {
      const [key, value] = item;
      if (!this.#cache.has(key)) {
        const deleted = this.#deleteIfExpired(key, value);
        if (deleted === false) {
          yield item;
        }
      }
    }
    for (const item of this.#cache) {
      const [key, value] = item;
      const deleted = this.#deleteIfExpired(key, value);
      if (deleted === false) {
        yield item;
      }
    }
  }
  get(key) {
    if (this.#cache.has(key)) {
      const item = this.#cache.get(key);
      return this.#getItemValue(key, item);
    }
    if (this.#oldCache.has(key)) {
      const item = this.#oldCache.get(key);
      if (this.#deleteIfExpired(key, item) === false) {
        this.#moveToRecent(key, item);
        return item.value;
      }
    }
  }
  set(key, value, { maxAge = this.#maxAge } = {}) {
    const expiry = typeof maxAge === "number" && maxAge !== Number.POSITIVE_INFINITY ? Date.now() + maxAge : void 0;
    if (this.#cache.has(key)) {
      this.#cache.set(key, {
        value,
        expiry
      });
    } else {
      this.#set(key, { value, expiry });
    }
    return this;
  }
  has(key) {
    if (this.#cache.has(key)) {
      return !this.#deleteIfExpired(key, this.#cache.get(key));
    }
    if (this.#oldCache.has(key)) {
      return !this.#deleteIfExpired(key, this.#oldCache.get(key));
    }
    return false;
  }
  peek(key) {
    if (this.#cache.has(key)) {
      return this.#peek(key, this.#cache);
    }
    if (this.#oldCache.has(key)) {
      return this.#peek(key, this.#oldCache);
    }
  }
  delete(key) {
    const deleted = this.#cache.delete(key);
    if (deleted) {
      this.#size--;
    }
    return this.#oldCache.delete(key) || deleted;
  }
  clear() {
    this.#cache.clear();
    this.#oldCache.clear();
    this.#size = 0;
  }
  resize(newSize) {
    if (!(newSize && newSize > 0)) {
      throw new TypeError("`maxSize` must be a number greater than 0");
    }
    const items = [...this.#entriesAscending()];
    const removeCount = items.length - newSize;
    if (removeCount < 0) {
      this.#cache = new Map(items);
      this.#oldCache = /* @__PURE__ */ new Map();
      this.#size = items.length;
    } else {
      if (removeCount > 0) {
        this.#emitEvictions(items.slice(0, removeCount));
      }
      this.#oldCache = new Map(items.slice(removeCount));
      this.#cache = /* @__PURE__ */ new Map();
      this.#size = 0;
    }
    this.#maxSize = newSize;
  }
  *keys() {
    for (const [key] of this) {
      yield key;
    }
  }
  *values() {
    for (const [, value] of this) {
      yield value;
    }
  }
  *[Symbol.iterator]() {
    for (const item of this.#cache) {
      const [key, value] = item;
      const deleted = this.#deleteIfExpired(key, value);
      if (deleted === false) {
        yield [key, value.value];
      }
    }
    for (const item of this.#oldCache) {
      const [key, value] = item;
      if (!this.#cache.has(key)) {
        const deleted = this.#deleteIfExpired(key, value);
        if (deleted === false) {
          yield [key, value.value];
        }
      }
    }
  }
  *entriesDescending() {
    let items = [...this.#cache];
    for (let i = items.length - 1; i >= 0; --i) {
      const item = items[i];
      const [key, value] = item;
      const deleted = this.#deleteIfExpired(key, value);
      if (deleted === false) {
        yield [key, value.value];
      }
    }
    items = [...this.#oldCache];
    for (let i = items.length - 1; i >= 0; --i) {
      const item = items[i];
      const [key, value] = item;
      if (!this.#cache.has(key)) {
        const deleted = this.#deleteIfExpired(key, value);
        if (deleted === false) {
          yield [key, value.value];
        }
      }
    }
  }
  *entriesAscending() {
    for (const [key, value] of this.#entriesAscending()) {
      yield [key, value.value];
    }
  }
  get size() {
    if (!this.#size) {
      return this.#oldCache.size;
    }
    let oldCacheSize = 0;
    for (const key of this.#oldCache.keys()) {
      if (!this.#cache.has(key)) {
        oldCacheSize++;
      }
    }
    return Math.min(this.#size + oldCacheSize, this.#maxSize);
  }
  get maxSize() {
    return this.#maxSize;
  }
  entries() {
    return this.entriesAscending();
  }
  forEach(callbackFunction, thisArgument = this) {
    for (const [key, value] of this.entriesAscending()) {
      callbackFunction.call(thisArgument, value, key, this);
    }
  }
  get [Symbol.toStringTag]() {
    return "QuickLRU";
  }
  toString() {
    return `QuickLRU(${this.size}/${this.maxSize})`;
  }
  [Symbol.for("nodejs.util.inspect.custom")]() {
    return this.toString();
  }
};

// api.ts
var CONTEXT7_API_BASE_URL = "https://context7.com/api";
var searchCache = new QuickLRU({
  maxSize: 500,
  maxAge: 1e3 * 60 * 30
});
function debounce(fn, timeout, cancelledReturn) {
  let controller = new AbortController();
  let timeoutId;
  return (...args) => {
    return new Promise((resolve) => {
      controller.abort();
      controller = new AbortController();
      const { signal } = controller;
      timeoutId = setTimeout(async () => {
        const result = await fn(...args);
        resolve(result);
      }, timeout);
      signal.addEventListener("abort", () => {
        clearTimeout(timeoutId);
        resolve(cancelledReturn);
      });
    });
  };
}
var searchLibraries = debounce(_searchLibraries, 300, { results: [] });
async function _searchLibraries(query) {
  const cacheKey = `search-${query}`;
  if (searchCache.has(cacheKey)) {
    return searchCache.get(cacheKey);
  }
  try {
    const url = new URL(`${CONTEXT7_API_BASE_URL}/v1/search`);
    url.searchParams.set("query", query);
    const response = await fetch(url);
    if (!response.ok) {
      console.error(`Failed to search libraries: ${response.status}`);
      return null;
    }
    const data = await response.json();
    if (data.results.length > 0) {
      searchCache.set(cacheKey, data);
    }
    return data;
  } catch (error) {
    console.error("Error searching libraries:", error);
    return null;
  }
}
async function fetchLibraryDocumentation(libraryId, tokens, options = {}) {
  try {
    if (libraryId.startsWith("/")) {
      libraryId = libraryId.slice(1);
    }
    const url = new URL(`${CONTEXT7_API_BASE_URL}/v1/${libraryId}`);
    url.searchParams.set("tokens", tokens.toString());
    url.searchParams.set("type", "txt");
    if (options.topic) url.searchParams.set("topic", options.topic);
    const response = await fetch(url, {
      headers: {
        "X-Context7-Source": "mcp-server"
      }
    });
    if (!response.ok) {
      console.error(`Failed to fetch documentation: ${response.status}`);
      return null;
    }
    const text = await response.text();
    if (!text || text === "No content available" || text === "No context data available") {
      return null;
    }
    return text;
  } catch (error) {
    console.error("Error fetching library documentation:", error);
    return null;
  }
}

// types.ts
var DEFAULT_SETTINGS = {
  mentionLimit: 5
};
var SETTINGS_LIMITS = {
  mentionLimit: { min: 1, max: 20 }
};
var PATTERNS = {
  PAGE_NUMBERS: /^\d+(?:\/\d+)*$/
};

// core.ts
function parseInputQuery(query) {
  const trimmed = query.trim();
  if (!trimmed) {
    throw new Error("Repository query is required");
  }
  const parts = trimmed.split(/\s+/);
  const repositoryQuery = parts[0].toLowerCase();
  const remainingParts = parts.slice(1).join(" ");
  let topicKeyword = void 0;
  let pageNumbers = void 0;
  if (remainingParts) {
    const words = remainingParts.split(/\s+/);
    const firstWord = words[0];
    if (PATTERNS.PAGE_NUMBERS.test(firstWord)) {
      const numbers = firstWord.split("/").map((num) => Number.parseInt(num, 10));
      if (numbers.every((num) => Number.isInteger(num) && num > 0)) {
        pageNumbers = numbers;
        if (words.length > 1) {
          topicKeyword = words.slice(1).join(" ");
        }
      } else {
        topicKeyword = remainingParts;
      }
    } else {
      topicKeyword = remainingParts;
    }
  }
  return { repositoryQuery, topicKeyword, pageNumbers };
}
function generateNavigation(libraries, repositoryQuery, maxMentionItems) {
  if (libraries.length === 0) {
    return `No libraries found for "${repositoryQuery}".`;
  }
  const libraryList = libraries.map((lib, index) => {
    return `### ${index + 1}. ${lib.title}
- **ID**: ${lib.id}
- **Description**: ${lib.description || "No description"}
- **Tokens**: ${lib.totalTokens.toLocaleString()}
- **Trust Score**: ${lib.trustScore}
- **Stars**: ${lib.stars}
- **Last Update**: ${lib.lastUpdate}`;
  }).join("\n\n");
  return `Context7 library search results for "${repositoryQuery}".

## How to Access Specific Libraries
- Multiple libraries: @context7 ${repositoryQuery} 1/3/5 (maximum ${maxMentionItems} libraries per request)
- Single library: @context7 ${repositoryQuery} 2
- With topic filter: @context7 ${repositoryQuery} 1/3 authentication

## Selection Method
Based on your needs, choose up to ${maxMentionItems} most relevant libraries from the list below.

## Available Libraries

${libraryList}`;
}
function filterLibrariesByPageNumbers(libraries, pageNumbers) {
  const result = [];
  for (const pageNum of pageNumbers) {
    const index = pageNum - 1;
    if (index >= 0 && index < libraries.length) {
      result.push(libraries[index]);
    }
  }
  return result;
}
function validateSettings(settings) {
  if (!settings || typeof settings !== "object") {
    throw new Error("Settings must be an object");
  }
  const settingsObj = settings;
  const missingKeys = ["tokens"].filter((key) => !(key in settingsObj));
  if (missingKeys.length > 0) {
    throw new Error(`Missing settings: ${JSON.stringify(missingKeys)}`);
  }
}

// index.ts
var CONTEXT7_BASE_URL = "https://context7.com";
var Context7Provider = {
  meta(_params, _settings) {
    return {
      name: "Context7",
      mentions: { label: "type <library query> [page numbers] [topic]" }
    };
  },
  async mentions(params, settings) {
    validateSettings(settings);
    if (!params.query || params.query.trim().length === 0) {
      return [];
    }
    try {
      const { repositoryQuery, topicKeyword, pageNumbers } = parseInputQuery(params.query);
      const response = await searchLibraries(repositoryQuery);
      if (!response || response.results.length === 0) {
        return [{
          title: `No results found`,
          uri: "",
          description: `No libraries found for "${repositoryQuery}"`,
          data: {
            isError: true,
            content: `No libraries found for "${repositoryQuery}". Please check your search query.`
          }
        }];
      }
      const mentionLimit = typeof settings.mentionLimit === "number" ? Math.min(Math.max(settings.mentionLimit, 1), SETTINGS_LIMITS.mentionLimit.max) : DEFAULT_SETTINGS.mentionLimit;
      const libraries = response.results;
      if (pageNumbers) {
        const selectedLibraries = filterLibrariesByPageNumbers(libraries, pageNumbers);
        const limitedLibraries = selectedLibraries.slice(0, mentionLimit);
        return limitedLibraries.map((lib) => ({
          title: `${lib.title} [${lib.totalTokens.toLocaleString()}]`,
          uri: `${CONTEXT7_BASE_URL}/${lib.id}`,
          description: lib.description || "No description",
          data: {
            id: lib.id,
            topicKeyword,
            isNavigation: false
          }
        }));
      }
      const navigationContent = generateNavigation(libraries, repositoryQuery, mentionLimit);
      return [{
        title: `Context7 Navigation: ${repositoryQuery}`,
        uri: `${CONTEXT7_BASE_URL}/search?q=${encodeURIComponent(repositoryQuery)}`,
        description: `${libraries.length} libraries found`,
        data: {
          content: navigationContent,
          isNavigation: true,
          libraries,
          // Store all libraries, not limited
          topicKeyword
        }
      }];
    } catch (error) {
      return [{
        title: "Error",
        uri: "",
        description: error instanceof Error ? error.message : "Unknown error",
        data: {
          isError: true,
          content: `Error: ${error instanceof Error ? error.message : "Unknown error"}`
        }
      }];
    }
  },
  async items(params, settings) {
    validateSettings(settings);
    const mentionData = params.mention?.data;
    if (!mentionData) {
      return [];
    }
    if (mentionData.isError) {
      return [{
        title: params.mention?.title || "Error",
        ui: { hover: { text: "Error occurred" } },
        ai: { content: mentionData.content || "An error occurred" }
      }];
    }
    if (mentionData.isNavigation) {
      return [{
        title: params.mention?.title || "Context7 Navigation",
        url: params.mention?.uri,
        ui: { hover: { text: "Library navigation" } },
        ai: { content: mentionData.content || "" }
      }];
    }
    if (mentionData.id) {
      const response = await fetchLibraryDocumentation(mentionData.id, settings.tokens, {
        topic: mentionData.topicKeyword
      });
      if (!response) {
        return [{
          title: `Failed to fetch documentation`,
          ui: { hover: { text: "Failed to fetch" } },
          ai: { content: `Failed to fetch documentation for ${mentionData.id}` }
        }];
      }
      const topicPart = mentionData.topicKeyword ? ` / topic: ${mentionData.topicKeyword}` : "";
      return [{
        title: `Context7: ${mentionData.id}${topicPart}`,
        url: `${CONTEXT7_BASE_URL}/${mentionData.id}/llms.txt?topic=${mentionData.topicKeyword || ""}&tokens=${settings.tokens}`,
        ui: { hover: { text: `${mentionData.id}${mentionData.topicKeyword ? `#${mentionData.topicKeyword}` : ""}` } },
        ai: { content: response }
      }];
    }
    return [];
  }
};
var context7_default = Context7Provider;
