import type { LabeledTransaction } from '../types/domain';
import { EARLY_NOVEMBER_SPECS } from './earlyNovemberFixtures';
import { MID_NOVEMBER_SPECS } from './midNovemberFixtures';
import { SCENARIO_SPECS } from './scenarioFixtures';
import { toLabeled } from './transactionBuilder';

export const INITIAL_MOCK_TRANSACTIONS: LabeledTransaction[] = [
  ...SCENARIO_SPECS,
  ...MID_NOVEMBER_SPECS,
  ...EARLY_NOVEMBER_SPECS,
].map(toLabeled);
