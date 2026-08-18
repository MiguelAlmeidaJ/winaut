import { Injectable } from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';

@Injectable()
export class AgentTokenService {
  generate(): string {
    return `winaut_agent_${randomBytes(32).toString('base64url')}`;
  }

  hash(token: string): string {
    return createHash('sha256').update(token, 'utf8').digest('hex');
  }
}
