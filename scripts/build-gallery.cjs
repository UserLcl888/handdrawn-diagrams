#!/usr/bin/env node
'use strict';
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const examples = [
  ['assets/example.scene.json', 'docs/images/cache-flow.png'],
  ['examples/api-flow.scene.json', 'docs/images/api-flow.png'],
  ['examples/context-handoff.scene.json', 'assets/style-reference.png'],
];
for (const [scene, output] of examples) {
  const result = spawnSync(process.execPath, [
    path.join(__dirname, 'render.cjs'), path.join(root, scene),
    '--output', path.join(root, output), '--overwrite',
  ], { stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
