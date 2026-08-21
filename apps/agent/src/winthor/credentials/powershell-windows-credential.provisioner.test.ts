import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  windowsCredentialTarget,
  winThorApplicationCredentialReference,
} from './powershell-windows-credential.provisioner.js';

describe('windowsCredentialTarget', () => {
  it('extracts the Generic Credential target', () => {
    assert.equal(
      windowsCredentialTarget(
        'windows-credential:Orquestra/WinThor/instance-id/GO_GLOBAL',
      ),
      'Orquestra/WinThor/instance-id/GO_GLOBAL',
    );
  });

  it('rejects unsupported or empty references', () => {
    assert.throws(
      () => windowsCredentialTarget('vault://secret'),
      /windows-credential:<target>/,
    );
    assert.throws(
      () => windowsCredentialTarget('windows-credential:   '),
      /windows-credential:<target>/,
    );
  });
});

describe('winThorApplicationCredentialReference', () => {
  it('derives a separate WinThor credential from the GO-Global target', () => {
    assert.equal(
      winThorApplicationCredentialReference(
        'windows-credential:Orquestra/WinThor/TesteAgente/GO_GLOBAL',
      ),
      'windows-credential:Orquestra/WinThor/TesteAgente/WINTHOR',
    );
  });
});
