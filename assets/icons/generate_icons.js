/**
 * Minimal pure-Node script to generate valid RGBA PNG icons
 * Uses Node built-in zlib and crypto/crc
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function crc32(buf) {
  let table = [];
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c >>> 0;
  }
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function createPng(size, r, g, b) {
  // Raw scanlines: each scanline starts with filter byte 0x00, followed by size * 4 RGBA bytes
  const rowSize = 1 + size * 4;
  const rawData = Buffer.alloc(rowSize * size);

  for (let y = 0; y < size; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0; // Filter None

    for (let x = 0; x < size; x++) {
      const pixelOffset = rowOffset + 1 + x * 4;
      // Rounded corner box with an inner glyph
      const distFromCenter = Math.sqrt(Math.pow(x - size / 2, 2) + Math.pow(y - size / 2, 2));
      const inIcon = distFromCenter < (size * 0.45);
      const isInner = distFromCenter < (size * 0.25);

      if (inIcon) {
        if (isInner) {
          // Bright cyan accent in center
          rawData[pixelOffset] = 99;      // R
          rawData[pixelOffset + 1] = 230;  // G
          rawData[pixelOffset + 2] = 255;  // B
          rawData[pixelOffset + 3] = 255;  // A
        } else {
          // Vibrant indigo body
          rawData[pixelOffset] = r;
          rawData[pixelOffset + 1] = g;
          rawData[pixelOffset + 2] = b;
          rawData[pixelOffset + 3] = 255;
        }
      } else {
        // Transparent background
        rawData[pixelOffset] = 0;
        rawData[pixelOffset + 1] = 0;
        rawData[pixelOffset + 2] = 0;
        rawData[pixelOffset + 3] = 0;
      }
    }
  }

  const deflated = zlib.deflateSync(rawData);

  // PNG Signature
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  // IHDR
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(size, 0);
  ihdrData.writeUInt32BE(size, 4);
  ihdrData[8] = 8; // Bit depth: 8
  ihdrData[9] = 6; // Color type: 6 (RGBA)
  ihdrData[10] = 0; // Compression
  ihdrData[11] = 0; // Filter
  ihdrData[12] = 0; // Interlace

  const ihdr = createChunk('IHDR', ihdrData);
  const idat = createChunk('IDAT', deflated);
  const iend = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdr, idat, iend]);
}

function createChunk(type, data) {
  const len = data.length;
  const buf = Buffer.alloc(4 + 4 + len + 4);
  buf.writeUInt32BE(len, 0);
  buf.write(type, 4, 4, 'ascii');
  data.copy(buf, 8);

  const crcTarget = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const c = crc32(crcTarget);
  buf.writeUInt32BE(c, 8 + len);
  return buf;
}

const iconsDir = __dirname;
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

[16, 32, 48, 128].forEach(size => {
  const pngBuf = createPng(size, 99, 102, 241);
  const target = path.join(iconsDir, `icon${size}.png`);
  fs.writeFileSync(target, pngBuf);
  console.log(`Generated: ${target} (${pngBuf.length} bytes)`);
});
