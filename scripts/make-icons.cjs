// Generates icon-192.png and icon-512.png with a Greek β on a deep-blue background
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const OUT = path.join(__dirname, '../public');
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT);

function makePNG(size) {
  const buf = Buffer.alloc(size * size * 4);

  // Background: deep blue #1a3a5c
  for (let i = 0; i < size * size; i++) {
    buf[i*4]   = 26;
    buf[i*4+1] = 58;
    buf[i*4+2] = 92;
    buf[i*4+3] = 255;
  }

  // Rounded rectangle mask: soften corners
  const r = size * 0.22;
  const cx = size / 2, cy = size / 2;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = Math.max(0, Math.abs(x - cx) - (size/2 - r));
      const dy = Math.max(0, Math.abs(y - cy) - (size/2 - r));
      if (dx*dx + dy*dy > r*r) {
        buf[(y*size+x)*4+3] = 0; // transparent corners
      }
    }
  }

  // Draw β glyph in gold #f0d98a using scaled bezier-like shapes
  // β is built from:
  //  - a vertical stem on the left
  //  - an upper bump (semicircle facing right)
  //  - a lower bump (larger semicircle facing right)
  const gold = [240, 217, 138];
  const s = size;

  function setPixel(x, y, alpha) {
    x = Math.round(x); y = Math.round(y);
    if (x < 0 || x >= s || y < 0 || y >= s) return;
    const i = (y * s + x) * 4;
    if (buf[i+3] === 0) return; // skip transparent corners
    const a = alpha / 255;
    buf[i]   = Math.round(buf[i]   * (1-a) + gold[0] * a);
    buf[i+1] = Math.round(buf[i+1] * (1-a) + gold[1] * a);
    buf[i+2] = Math.round(buf[i+2] * (1-a) + gold[2] * a);
  }

  function fillRect(x, y, w, h) {
    for (let py = y; py < y + h; py++)
      for (let px = x; px < x + w; px++)
        setPixel(px, py, 255);
  }

  function fillCircleArc(cx, cy, r, startDeg, endDeg, thickness) {
    const steps = Math.ceil(r * 2 * Math.PI * Math.abs(endDeg - startDeg) / 360);
    for (let i = 0; i <= steps; i++) {
      const ang = (startDeg + (endDeg - startDeg) * i / steps) * Math.PI / 180;
      for (let t = -thickness/2; t <= thickness/2; t += 0.5) {
        const rr = r + t;
        setPixel(cx + Math.cos(ang) * rr, cy + Math.sin(ang) * rr, 255);
      }
    }
  }

  // Scale relative to icon size
  const u = s / 100; // 1 unit = 1% of size

  // Stem: left vertical bar from top to bottom
  const stemX = 28 * u;
  const stemTop = 12 * u;
  const stemBot = 92 * u;
  const strokeW = 9 * u;

  fillRect(stemX, stemTop, strokeW, stemBot - stemTop);

  // Upper bump: center ~37% down, right side
  const upCY = 38 * u;
  const upR  = 18 * u;
  fillCircleArc(stemX + strokeW/2, upCY, upR, -90, 90, strokeW);

  // Cap on top of upper bump
  fillRect(stemX, stemTop, upR * 0.7, strokeW);

  // Mid bar connecting stem to lower bump
  const midY = 56 * u;
  fillRect(stemX, midY - strokeW/2, upR * 0.8, strokeW);

  // Lower bump: slightly larger, center ~70% down
  const loCY = 71 * u;
  const loR  = 23 * u;
  fillCircleArc(stemX + strokeW/2, loCY, loR, -90, 90, strokeW);

  // Base cap (small horizontal at bottom)
  fillRect(stemX - 4*u, stemBot - strokeW, strokeW + 4*u, strokeW * 0.8);

  return toPNG(buf, size);
}

function toPNG(pixels, size) {
  function crc32(buf) {
    let c = 0xFFFFFFFF;
    const t = [];
    for (let i = 0; i < 256; i++) { let v = i; for (let j = 0; j < 8; j++) v = (v&1)?(0xEDB88320^(v>>>1)):(v>>>1); t[i]=v; }
    for (let i = 0; i < buf.length; i++) c = t[(c^buf[i])&0xFF]^(c>>>8);
    return (c^0xFFFFFFFF)>>>0;
  }
  function chunk(type, data) {
    const tb = Buffer.from(type);
    const lb = Buffer.alloc(4); lb.writeUInt32BE(data.length);
    const cb = Buffer.alloc(4); cb.writeUInt32BE(crc32(Buffer.concat([tb, data])));
    return Buffer.concat([lb, tb, data, cb]);
  }

  const raw = Buffer.alloc(size * (1 + size * 4));
  for (let y = 0; y < size; y++) {
    raw[y*(1+size*4)] = 0;
    pixels.copy(raw, y*(1+size*4)+1, y*size*4, (y+1)*size*4);
  }
  const idat = zlib.deflateSync(raw, {level:9});
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8]=8; ihdr[9]=6; // RGBA
  return Buffer.concat([
    Buffer.from([137,80,78,71,13,10,26,10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

const png192 = makePNG(192);
const png512 = makePNG(512);
fs.writeFileSync(path.join(OUT, 'icon-192.png'), png192);
fs.writeFileSync(path.join(OUT, 'icon-512.png'), png512);
console.log('Icons written to public/');
