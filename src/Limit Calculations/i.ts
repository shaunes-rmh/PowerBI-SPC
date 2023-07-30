import { mean } from "../D3 Plotting Functions/D3 Modules";
import { abs, diff, divide } from "../Functions";
import { controlLimitsClass, type dataClass, type defaultSettingsType } from "../Classes";

export default function iLimits(inputData: dataClass, inputSettings: defaultSettingsType): controlLimitsClass {
  const useRatio: boolean = (inputData.denominators && inputData.denominators.length > 0);
  const ratio: number[] = useRatio
    ? divide(inputData.numerators, inputData.denominators)
    : inputData.numerators;

  const cl: number = mean(ratio);

  const consec_diff: number[] = abs(diff(ratio));
  const consec_diff_ulim: number = mean(consec_diff) * 3.267;
  const outliers_in_limits: boolean = inputSettings.spc.outliers_in_limits;
  const consec_diff_valid: number[] = outliers_in_limits ? consec_diff : consec_diff.filter(d => d < consec_diff_ulim);

  const sigma: number = mean(consec_diff_valid) / 1.128;

  return new controlLimitsClass({
    inputSettings: inputSettings,
    keys: inputData.keys,
    values: ratio.map(d => isNaN(d) ? 0 : d),
    numerators: useRatio ? inputData.numerators : undefined,
    denominators: useRatio ? inputData.denominators : undefined,
    targets: cl,
    ll99: cl - 3 * sigma,
    ll95: cl - 2 * sigma,
    ul95: cl + 2 * sigma,
    ul99: cl + 3 * sigma
  });
}
