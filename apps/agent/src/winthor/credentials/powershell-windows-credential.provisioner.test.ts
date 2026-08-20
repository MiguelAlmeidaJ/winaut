import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { windowsCredentialTarget } from './powershell-windows-credential.provisioner.js';

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
