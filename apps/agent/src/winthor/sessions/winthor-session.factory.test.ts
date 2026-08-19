import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  WinThorExecutionMode,
  WinThorHostingType,
  type AgentConfig,
} from '@winaut/contracts';

import { GoGlobalWinThorSession } from './go-global-winthor.session.js';
import { LocalWinThorSession } from './local-winthor.session.js';
import { UnsupportedWinThorExecutionModeError } from './winthor-session.errors.js';
import { WinThorSessionFactory } from './winthor-session.factory.js';

const logger = { info: (_message: string) => undefined };

function config(
  executionMode: AgentConfig['winthorInstance']['executionMode'],
): AgentConfig {
  return {
    agent: { id: 'agent', name: 'Agent', hostname: 'worker', version: null },
    winthorInstance: {
      id: 'instance',
      name: 'Produção',
      hostingType: WinThorHostingType.ON_PREMISE,
      executionMode,
      timeZone: 'America/Sao_Paulo',
    },
    accessProfile: null,
  };
}

describe('WinThorSessionFactory', () => {
  const factory = new WinThorSessionFactory(logger);

  it('selects LocalWinThorSession for LOCAL_WINDOWS', () => {
    assert.ok(
      factory.create(config(WinThorExecutionMode.LOCAL_WINDOWS)) instanceof
        LocalWinThorSession,
    );
  });

  it('selects GoGlobalWinThorSession for GO_GLOBAL', () => {
    assert.ok(
      factory.create(config(WinThorExecutionMode.GO_GLOBAL)) instanceof
        GoGlobalWinThorSession,
    );
  });

  it('rejects an unknown execution mode explicitly', () => {
    const invalid = config(WinThorExecutionMode.LOCAL_WINDOWS);
    invalid.winthorInstance.executionMode = 'UNKNOWN' as WinThorExecutionMode;

    assert.throws(
      () => factory.create(invalid),
      UnsupportedWinThorExecutionModeError,
    );
  });
});
