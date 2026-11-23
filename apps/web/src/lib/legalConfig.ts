import { resolveLegalParameters } from '@valiva/core';
import { todayLocal } from './format';
import type {
  DepotKey,
  IncomeTaxKey,
  LegalConfig,
  LegalResolution,
  OtherIncomeKey,
  PensionKey,
  SocialKey,
} from '@valiva/core';
import pensionRaw from '../../../../config/pension-de.json';
import socialRaw from '../../../../config/social-de.json';
import depotRaw from '../../../../config/altersvorsorge-de.json';
import incomeTaxRaw from '../../../../config/income-tax-de.json';
import otherIncomeRaw from '../../../../config/other-income-de.json';

export const pensionConfig = pensionRaw as unknown as LegalConfig<PensionKey>;
export const socialConfig = socialRaw as unknown as LegalConfig<SocialKey>;
export const depotConfig = depotRaw as unknown as LegalConfig<DepotKey>;
export const incomeTaxConfig = incomeTaxRaw as unknown as LegalConfig<IncomeTaxKey>;
/** Rule assumptions of the other-income block (all unverified). */
export const otherIncomeConfig = otherIncomeRaw as unknown as LegalConfig<OtherIncomeKey>;

/** Legal values valid today. The core does not read files, so the app resolves and passes them in. */
export function currentLegal(): LegalResolution {
  return resolveLegalParameters(
    pensionConfig,
    socialConfig,
    depotConfig,
    incomeTaxConfig,
    todayLocal(),
    otherIncomeConfig,
  );
}
