import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Put,
} from '@nestjs/common';

import { CompanyAutomationsService } from './company-automations.service';
import { UpdateCompanyAutomationDto } from './dto/update-company-automation.dto';

@Controller('company-automations')
export class CompanyAutomationsController {
  constructor(
    private readonly companyAutomations: CompanyAutomationsService,
  ) {}

  @Get(':companyId')
  findForCompany(
    @Param('companyId', new ParseUUIDPipe()) companyId: string,
  ) {
    return this.companyAutomations.findForCompany(companyId);
  }

  @Put(':companyId/:automationCode')
  update(
    @Param('companyId', new ParseUUIDPipe()) companyId: string,
    @Param('automationCode') automationCode: string,
    @Body() dto: UpdateCompanyAutomationDto,
  ) {
    return this.companyAutomations.update(
      companyId,
      automationCode,
      dto,
    );
  }
}
