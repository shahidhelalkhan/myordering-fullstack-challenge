"use strict";

const fs = require("fs");
const path = require("path");
const zlib = require("zlib");
const readline = require("readline");

const FILE_COUNT = 3;
const MIN_FILES_REQUIRED = 2;
const MIN_CODE_LENGTH = 8;
const MAX_CODE_LENGTH = 10;

const BITS_PER_FILTER = 2 ** 28;
const HASH_COUNT = 7;

class BloomFilter {
  constructor(bitCount, hashCount) {
    this.bitCount = bitCount;
    this.hashCount = hashCount;
    this.bits = Buffer.alloc(bitCount / 8);
  }

  add(text) {
    for (const position of this.bitPositions(text)) {
      this.bits[position >>> 3] |= 1 << (position & 7);
    }
  }

  mightContain(text) {
    for (const position of this.bitPositions(text)) {
      if ((this.bits[position >>> 3] & (1 << (position & 7))) === 0) return false;
    }
    return true;
  }

  bitPositions(text) {
    const first = fnv1a(text, 0x811c9dc5);
    const second = fnv1a(text, 0x01000193) | 1;
    const positions = [];
    for (let i = 0; i < this.hashCount; i++) {
      positions.push(((first + i * second) >>> 0) % this.bitCount);
    }
    return positions;
  }
}

function fnv1a(text, seed) {
  let hash = seed;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function hasValidLength(code) {
  return code.length >= MIN_CODE_LENGTH && code.length <= MAX_CODE_LENGTH;
}

class CouponValidator {
  constructor({ dir }) {
    this.dir = dir;
    this.filters = [];
    this.ready = null;
  }

  init() {
    if (!this.ready) this.ready = this.loadAllFiles();
    return this.ready;
  }

  async loadAllFiles() {
    const filters = [];
    for (let n = 1; n <= FILE_COUNT; n++) {
      filters.push(await this.loadFile(path.join(this.dir, `couponbase${n}.gz`)));
    }
    this.filters = filters;
  }

  async loadFile(filePath) {
    const filter = new BloomFilter(BITS_PER_FILTER, HASH_COUNT);
    const lines = readline.createInterface({
      input: fs.createReadStream(filePath).pipe(zlib.createGunzip()),
      crlfDelay: Infinity,
    });
    for await (const line of lines) {
      if (hasValidLength(line)) filter.add(line);
    }
    return filter;
  }

  async isValid(code) {
    if (typeof code !== "string" || !hasValidLength(code)) return false;
    await this.init();
    const filesMatched = this.filters.filter((f) => f.mightContain(code)).length;
    return filesMatched >= MIN_FILES_REQUIRED;
  }
}

module.exports = { CouponValidator };
 