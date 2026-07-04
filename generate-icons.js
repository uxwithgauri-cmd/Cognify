// Pure Node.js PNG icon generator — no npm dependencies required
const zlib = require('zlib');
const fs = require('fs');

if (!fs.existsSync('icons')) fs.mkdirSync('icons');

// CRC32 table
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
  crcTable[n] = c;
}
function crc32(buf) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) crc = (crc >>> 8) ^ crcTable[(crc ^ buf[i]) & 0xFF];
  return (crc ^ 0xFFFFFFFF) >>> 0;
}
function pngChunk(type, data) {
  const t = Buffer.from(type, 'ascii');
  const len = Buffer.allocUnsafe(4); len.writeUInt32BE(data.length, 0);
  const crcVal = Buffer.allocUnsafe(4); crcVal.writeUInt32BE(crc32(Buffer.concat([t, data])), 0);
  return Buffer.concat([len, t, data, crcVal]);
}

[16, 48, 128].forEach(size => {
  const r = size * 0.15; // corner radius
  // RGBA pixel buffer
  const pixels = Buffer.alloc(size * size * 4, 0);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      // Rounded rect: clamp to nearest corner center
      const cx = Math.max(r, Math.min(size - r, x));
      const cy = Math.max(r, Math.min(size - r, y));
      const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
      if (dist > r) continue; // transparent (outside rounded corners)

      // Background: #1E3A8A
      pixels[idx] = 0x1E; pixels[idx+1] = 0x3A; pixels[idx+2] = 0x8A; pixels[idx+3] = 255;

      // Draw 'C' as a circle arc (white)
      const cx2 = size / 2, cy2 = size / 2 + size * 0.03;
      const outerR = size * 0.27;
      const innerR = outerR * 0.60;
      const dx = x - cx2, dy = y - cy2;
      const distC = Math.sqrt(dx * dx + dy * dy);
      if (distC >= innerR && distC <= outerR) {
        const angle = Math.atan2(dy, dx) * 180 / Math.PI;
        // Opening on the right: exclude -50 to +50 degrees
        if (angle < -50 || angle > 50) {
          pixels[idx] = 0xFF; pixels[idx+1] = 0xFF; pixels[idx+2] = 0xFF; pixels[idx+3] = 255;
        }
      }
    }
  }

  // Build scanlines: PNG row filter byte (0 = None) + RGBA pixels
  const rows = [];
  for (let y = 0; y < size; y++) {
    const row = Buffer.alloc(1 + size * 4);
    row[0] = 0;
    pixels.copy(row, 1, y * size * 4, (y + 1) * size * 4);
    rows.push(row);
  }
  const compressed = zlib.deflateSync(Buffer.concat(rows), { level: 9 });

  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.allocUnsafe(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0; // 8-bit RGBA

  const png = Buffer.concat([sig, pngChunk('IHDR', ihdr), pngChunk('IDAT', compressed), pngChunk('IEND', Buffer.alloc(0))]);
  fs.writeFileSync('icons/icon' + size + '.png', png);
  console.log('Created icon' + size + '.png (' + size + 'x' + size + ')');
});
