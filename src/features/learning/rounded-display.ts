// Ignore floating-point noise, but distinguish rounded display values from exact ones.
export function isRoundedDisplay(value: number, precision = 3) {
  return Math.abs(value - Number(value.toFixed(precision))) > 1e-12;
}
