import * as d3 from "d3";
import diff from "../Functions/diff"
import rep from "../Functions/rep";
import { abs } from "../Function Broadcasting/UnaryFunctions"
import {  divide } from "../Function Broadcasting/BinaryFunctions";
import { ControlLimits } from "../Interfaces";

function mr_limits(key: string[], value: number[], denominator?: number[]): ControlLimits {
  let ratio: number[];
  if (denominator == null) {
    ratio = value;
  } else {
    ratio = divide(value,denominator);
  }

  let consec_diff: number[] = abs(diff(ratio));
  let cl: number = d3.mean(consec_diff);

  let limits: ControlLimits = {
    key: key,
    value: [null].concat(consec_diff),
    centerline: rep(cl, key.length),
    lowerLimit99: rep(0, key.length),
    lowerLimit95: rep(0, key.length),
    upperLimit95: rep((3.267 / 3) * 2 *cl, key.length),
    upperLimit99: rep(3.267*cl, key.length),
    count: null
  }
  return limits;
}

export default mr_limits;
