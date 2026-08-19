import { Injectable } from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';

@Injectable()
export class AgentTokenService {
  generate(): string {
    return `winaut_agent_${randomBytes(32).toString('base64url')}`;
  }

  generateEnrollmentCode(): string {
    const groups = randomBytes(16)
      .toString('hex')
      .toUpperCase()
      .match(/.{1,4}/g);

    if (!groups) {
      throw new Error('Unable to generate Agent activation code.');
    }

    return `ORQ-${groups.join('-')}`;
  }

  hash(token: string): string {
    return createHash('sha256').update(token, 'utf8').digest('hex');
  }

  hashEnrollmentCode(code: string): string {
    return this.hash(
      `orquestra-agent-enrollment:${code.trim().toUpperCase()}`,
    );
  }
}
