#!/usr/bin/env node
// @ts-check

// Utility script to create PNG and JPEG images for testing.
// Call:
//   NODE_PATH=../../../../../Build/node_modules ./createImage.js

const { createCanvas } = require('canvas');
const fs = require('fs');

const canvas = createCanvas(200, 200);
const ctx = canvas.getContext('2d');

ctx.fillStyle = 'white';
ctx.fillRect(0, 0, canvas.width, canvas.height);

ctx.font = '30px Arial';
ctx.fillStyle = 'black';
ctx.textBaseline = 'top';

for (const [i, text] of ['Test Image', '1', '2'].entries()) {
  ctx.fillText(text, 10, 10 + i * 50);
}

fs.writeFileSync('image.png', canvas.toBuffer('image/png'), { flag: "wx" });
fs.writeFileSync('image.jpg', canvas.toBuffer('image/jpeg'), { flag: "wx" });
