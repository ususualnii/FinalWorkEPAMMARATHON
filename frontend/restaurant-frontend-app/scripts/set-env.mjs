/**
 * Generates src/environments/environment.production.ts from the BACKEND_URL and
 * DEMO_MODE environment variables.
 * Runs automatically before `npm run build` (npm "prebuild" hook).
 *
 * Usage:
 *   BACKEND_URL=https://xxxx.execute-api.eu-west-1.amazonaws.com/develop npm run build
 *   DEMO_MODE=true npm run build          # static demo build, no backend required
 *
 * The generated file is git-ignored on purpose: the API URL is environment
 * configuration, not source code.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const OUT_FILE = resolve('src/environments/environment.production.ts');
const demoMode = process.env.DEMO_MODE?.trim().toLowerCase() === 'true';
const backendUrl = process.env.BACKEND_URL?.trim();

if (!backendUrl && !demoMode) {
  console.error(
    [
      '',
      'BACKEND_URL is not set - refusing to build a production bundle.',
      '',
      'Without it the bundle would ship the literal BACKEND_URL_PLACEHOLDER',
      'and every API call would fail at runtime.',
      '',
      'Examples:',
      '  BACKEND_URL=https://xxxx.execute-api.eu-west-1.amazonaws.com/develop npm run build',
      '  DEMO_MODE=true npm run build  # self-contained demo, no backend needed',
      '  npm start                     # local dev, no BACKEND_URL needed',
      '',
    ].join('\n')
  );
  process.exit(1);
}

// The demo build never performs real HTTP calls, but the app still needs a
// syntactically valid base URL. A reserved TLD keeps the intent obvious.
const resolvedBackendUrl = backendUrl || 'https://demo.invalid/api';

if (!/^https?:\/\//.test(resolvedBackendUrl)) {
  console.error(`BACKEND_URL must start with http:// or https:// (got: ${resolvedBackendUrl})`);
  process.exit(1);
}

const contents = `// GENERATED FILE - do not edit, do not commit.
// Produced by scripts/set-env.mjs from the BACKEND_URL and DEMO_MODE environment variables.
export const environment = {
  backendUrl: '${resolvedBackendUrl.replace(/\/$/, '')}',
  demoMode: ${demoMode},
};
`;

mkdirSync(dirname(OUT_FILE), { recursive: true });
writeFileSync(OUT_FILE, contents, 'utf8');
console.log(
  `environment.production.ts generated with backendUrl = ${resolvedBackendUrl}, demoMode = ${demoMode}`
);
