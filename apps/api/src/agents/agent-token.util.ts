import {
  createHash,
  randomBytes,
} from 'node:crypto';

const AGENT_TOKEN_PREFIX = 'winaut_agent_';

export function generateAgentToken(): string {
  const secret = randomBytes(32).toString(
    'base64url',
  );

  return `${AGENT_TOKEN_PREFIX}${secret}`;
}

export function hashAgentToken(
  token: string,
): string {
  return createHash('sha256')
    .update(token)
    .digest('hex');
}