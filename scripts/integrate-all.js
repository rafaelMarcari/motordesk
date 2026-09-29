// Script de integração e validação do MotorDesk
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

try {
  require('./apply-all-fixes.cjs');
} catch (e) {
  console.warn('Notice running apply-all-fixes.cjs:', e.message);
}

try {
  require('./update-segments-and-sync.cjs');
} catch (e) {
  console.warn('Notice running update-segments-and-sync.cjs:', e.message);
}

