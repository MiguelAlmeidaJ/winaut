import { WinThorExecutionMode, WinThorHostingType } from '@winaut/contracts';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { CreateWinThorInstanceDto } from './create-winthor-instance.dto';

const base = {
  companyId: '11111111-1111-4111-8111-111111111111',
  name: 'WinThor Produção',
  timeZone: 'America/Sao_Paulo',
};

describe('CreateWinThorInstanceDto', () => {
  it('accepts an on-premise local Windows environment', async () => {
    const dto = plainToInstance(CreateWinThorInstanceDto, {
      ...base,
      hostingType: WinThorHostingType.ON_PREMISE,
      executionMode: WinThorExecutionMode.LOCAL_WINDOWS,
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it('accepts a TOTVS Cloud environment accessed through Go-Global', async () => {
    const dto = plainToInstance(CreateWinThorInstanceDto, {
      ...base,
      hostingType: WinThorHostingType.TOTVS_CLOUD,
      executionMode: WinThorExecutionMode.GO_GLOBAL,
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
  });
});
