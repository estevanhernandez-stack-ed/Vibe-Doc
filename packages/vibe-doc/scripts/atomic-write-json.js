#!/usr/bin/env node
/**
 * atomic-write-json.js
 *
 * Reads a JSON object from stdin and writes it atomically to <target-path>.
 *
 * Usage:
 *   node scripts/atomic-write-json.js <target-path>
 *
 * Behavior:
 *   1. Read all of stdin.
 *   2. Parse as JSON. Exit 1 with "invalid JSON: <reason>" on parse failure.
 *   3. Ensure parent directory exists (mkdirSync recursive).
 *   4. Write to <target-path>.tmp.
 *   5. fsync the temp file's fd.
 *   6. Atomic rename <target-path>.tmp -> <target-path>.
 *   7. Exit 0.
 *
 * Exit codes:
 *   0 — success
 *   1 — failure (error written to stderr)
 *
 * Zero dependencies. Node 18+.
 */

'use strict';

const fs = require('fs');
const path = require('path');

function fail(msg) {
  process.stderr.write(msg + '\n');
  process.exit(1);
}

function readStdin() {
  return new Promise((resolve, reject) => {
    const chunks = [];
    process.stdin.on('data', (chunk) => chunks.push(chunk));
    process.stdin.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    process.stdin.on('error', reject);
  });
}

async function main() {
  const target = process.argv[2];
  if (!target) {
    fail('usage: atomic-write-json.js <target-path>');
  }

  const raw = await readStdin();

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    fail('invalid JSON: ' + err.message);
  }

  const serialized = JSON.stringify(parsed, null, 2);
  const tmpPath = target + '.tmp';
  const dir = path.dirname(target);

  try {
    fs.mkdirSync(dir, { recursive: true });
  } catch (err) {
    fail('could not create parent directory: ' + err.message);
  }

  let fd;
  try {
    fd = fs.openSync(tmpPath, 'w');
    fs.writeSync(fd, serialized);
    fs.fsyncSync(fd);
  } catch (err) {
    if (fd !== undefined) {
      try { fs.closeSync(fd); } catch (_) { /* ignore */ }
    }
    fail('could not write temp file: ' + err.message);
  } finally {
    if (fd !== undefined) {
      try { fs.closeSync(fd); } catch (_) { /* ignore */ }
    }
  }

  try {
    fs.renameSync(tmpPath, target);
  } catch (err) {
    fail('could not atomic-rename: ' + err.message);
  }

  process.exit(0);
}

main().catch((err) => {
  fail('unexpected error: ' + (err && err.message ? err.message : String(err)));
});
