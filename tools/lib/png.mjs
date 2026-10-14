// Minimal PNG reading and writing for tools/ekspor-halaman.mjs: 8-bit RGB, RGBA,
// grey or grey-alpha (and 2- or 4-bit grey, to check an export) in, non-interlaced;
// greyscale out at 8, 4 or 2 bits per pixel.
// Pure Node (zlib), so the export needs nothing installed.

import { deflateSync, inflateSync } from "node:zlib";

const SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const CHANNELS = { 0: 1, 2: 3, 4: 2, 6: 4 };

/** @returns {{width: number, height: number, pixel: (x: number, y: number) => [number, number, number, number]}} */
export function readPng(buffer) {
  if (!buffer.subarray(0, 8).equals(SIGNATURE)) throw new Error("Bukan berkas PNG.");
  let p = 8;
  let width, height, depth, type, interlace;
  const idat = [];
  while (p < buffer.length) {
    const length = buffer.readUInt32BE(p);
    const kind = buffer.toString("ascii", p + 4, p + 8);
    const data = buffer.subarray(p + 8, p + 8 + length);
    if (kind === "IHDR") [width, height, depth, type, interlace] = [data.readUInt32BE(0), data.readUInt32BE(4), data[8], data[9], data[12]];
    if (kind === "IDAT") idat.push(data);
    p += 12 + length;
  }
  const channels = CHANNELS[type];
  const subByteGrey = type === 0 && (depth === 2 || depth === 4);
  if ((depth !== 8 && !subByteGrey) || !channels || interlace) throw new Error("PNG harus 8 bit per kanal (RGB, RGBA, abu-abu), tanpa palet dan tanpa interlace.");
  const raw = inflateSync(Buffer.concat(idat));
  if (subByteGrey) return readSubByteGrey(raw, width, height, depth);
  const stride = width * channels;
  const out = Buffer.alloc(height * stride);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    const src = y * (stride + 1) + 1;
    for (let x = 0; x < stride; x++) {
      const a = x >= channels ? out[y * stride + x - channels] : 0;
      const b = y ? out[(y - 1) * stride + x] : 0;
      const c = y && x >= channels ? out[(y - 1) * stride + x - channels] : 0;
      out[y * stride + x] = (raw[src + x] + predict(filter, a, b, c)) & 255;
    }
  }
  const pixel = (x, y) => {
    const i = (y * width + x) * channels;
    if (channels === 4) return [out[i], out[i + 1], out[i + 2], out[i + 3]];
    if (channels === 3) return [out[i], out[i + 1], out[i + 2], 255];
    if (channels === 2) return [out[i], out[i], out[i], out[i + 1]];
    return [out[i], out[i], out[i], 255];
  };
  return { width, height, pixel };
}

function readSubByteGrey(raw, width, height, depth) {
  const stride = Math.ceil((width * depth) / 8);
  const out = Buffer.alloc(height * stride);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    for (let x = 0; x < stride; x++) {
      const a = x ? out[y * stride + x - 1] : 0;
      const b = y ? out[(y - 1) * stride + x] : 0;
      const c = y && x ? out[(y - 1) * stride + x - 1] : 0;
      out[y * stride + x] = (raw[y * (stride + 1) + 1 + x] + predict(filter, a, b, c)) & 255;
    }
  }
  const levels = (1 << depth) - 1;
  const pixel = (x, y) => {
    const byte = out[y * stride + ((x * depth) >> 3)];
    const v = Math.round(((byte >> (8 - depth - ((x * depth) % 8))) & levels) * (255 / levels));
    return [v, v, v, 255];
  };
  return { width, height, depth, pixel };
}

function predict(filter, a, b, c) {
  if (filter === 1) return a;
  if (filter === 2) return b;
  if (filter === 3) return (a + b) >> 1;
  if (filter === 4) {
    const p = a + b - c;
    const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
    return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
  }
  return 0;
}

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc = (buf) => {
  let c = 0xffffffff;
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 255] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (kind, data) => {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(kind, "ascii"), data]);
  const sum = Buffer.alloc(4);
  sum.writeUInt32BE(crc(body));
  return Buffer.concat([length, body, sum]);
};

/**
 * A greyscale PNG. `grey(x, y)` gives 0–255; it is rounded to 2^bits levels.
 * Each row gets the PNG filter with the smallest output, then everything is deflated at level 9.
 */
export function writeGreyPng(width, height, grey, bits = 4) {
  if (![2, 4, 8].includes(bits)) throw new Error("bits harus 2, 4, atau 8.");
  const levels = (1 << bits) - 1;
  const stride = Math.ceil((width * bits) / 8);
  const rows = [];
  let previous = Buffer.alloc(stride);
  for (let y = 0; y < height; y++) {
    const line = Buffer.alloc(stride);
    for (let x = 0; x < width; x++) {
      const q = Math.round((Math.min(255, Math.max(0, grey(x, y))) / 255) * levels);
      if (bits === 8) line[x] = q;
      else line[(x * bits) >> 3] |= q << (8 - bits - ((x * bits) % 8));
    }
    let best = null;
    let bestSum = Infinity;
    for (let filter = 0; filter < 5; filter++) {
      const row = Buffer.alloc(stride + 1);
      row[0] = filter;
      let sum = 0;
      for (let i = 0; i < stride; i++) {
        const v = (line[i] - predict(filter, i ? line[i - 1] : 0, previous[i], i ? previous[i - 1] : 0)) & 255;
        row[i + 1] = v;
        sum += v < 128 ? v : 256 - v;
      }
      if (sum < bestSum) [best, bestSum] = [row, sum];
    }
    rows.push(best);
    previous = line;
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = bits; // colour type 0 (grey), no interlace
  return Buffer.concat([SIGNATURE, chunk("IHDR", header), chunk("IDAT", deflateSync(Buffer.concat(rows), { level: 9 })), chunk("IEND", Buffer.alloc(0))]);
}
