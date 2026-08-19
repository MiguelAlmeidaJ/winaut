import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import {
  acquireAgentSingleInstanceLock,
  AgentAlreadyRunningError,
} from './agent-single-instance-lock.js';

describe('Agent single instance lock', () => {
  it('prevents a second Agent process from acquiring the same live lock', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'orquestra-agent-lock-'));
    const filePath = join(directory, 'agent.lock');
    const release = await acquireAgentSingleInstanceLock({
      filePath,
      isProcessRunning: () => true,
    });

    try {
      await assert.rejects(
        () =>
          acquireAgentSingleInstanceLock({
            filePath,
            isProcessRunning: () => true,
          }),
        AgentAlreadyRunningError,
      );
    } finally {
      await release();
      await rm(directory, { recursive: true, force: true });
    }
  });

  it('reclaims a stale lock left by a dead process', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'orquestra-agent-lock-'));
    const filePath = join(directory, 'agent.lock');
    await writeFile(filePath, '999999\n', 'utf8');

    const release = await acquireAgentSingleInstanceLock({
      filePath,
      isProcessRunning: () => false,
    });

    await release();
    await rm(directory, { recursive: true, force: true });
  });
});
