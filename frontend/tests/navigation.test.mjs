import test from 'node:test';
import assert from 'node:assert/strict';
import { navGroups } from '../lib/navigation.js';

test('navigation contains all app-shell sections with unique routes', () => {
  const items = navGroups.flatMap((group) => group.items);
  const ids = items.map((item) => item.id);
  const hrefs = items.map((item) => item.href);

  assert.deepEqual(ids, [
    'dashboard',
    'inbox',
    'chatbots',
    'knowledge',
    'workflows',
    'integrations',
    'analytics',
    'settings',
  ]);
  assert.equal(new Set(hrefs).size, hrefs.length);
  assert.equal(items[0].href, '/');
});
