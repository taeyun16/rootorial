import assert from "node:assert/strict";
import test from "node:test";
import { binarySample, cosineExample, finiteDifference, layerNormExample, positionExample } from "../src/components/formula-explorers/formula-model.ts";
const near = (a, b, tolerance = 1e-9) => assert.ok(Math.abs(a - b) < tolerance, `${a} ≠ ${b}`);

test("quartic central differences approach the tangent, including negative and zero slopes", () => {
  for (const x of [-1, -.6, 0, .6, 1]) {
    const wide = finiteDifference(x, .5); const narrow = finiteDifference(x, .05);
    near(wide.numeric - wide.analytic, x * .5 ** 2);
    assert.ok(Math.abs(narrow.numeric - narrow.analytic) <= Math.abs(wide.numeric - wide.analytic));
  }
});
test("BCE remains finite for extreme logits and its numerical derivative is p-y", () => {
  for (const y of [0, 1]) for (const z of [-1000, -6, 0, 6, 1000]) {
    const value = binarySample(z,y);
    assert.ok(Number.isFinite(value.loss) && value.loss >= 0);
    near((binarySample(z + .0001,y).loss - binarySample(z - .0001,y).loss) / .0002, value.gradient, 1e-7);
  }
  near(binarySample(0,1).loss, Math.log(2));
});
test("cosine keeps direction under positive scale and represents the zero boundary", () => {
  for (const angle of [0, 60, 90, 180]) near(cosineExample(angle,.1).cosine,cosineExample(angle,3).cosine);
  assert.equal(cosineExample(60,0).cosine,null);
  near(cosineExample(180,2).dot,-2);
});
test("position pairs share unit amplitude and increasing periods", () => {
  for (let pair=0;pair<4;pair++) {
    const result=positionExample(17,pair);
    near(result.sin ** 2 + result.cos ** 2,1);
    near(positionExample(17 + result.wavelength,pair).sin,result.sin);
    near(result.denominator,10**pair);
  }
});
test("LayerNorm separates centering, epsilon normalization and affine stages", () => {
  const result=layerNormExample([1,2,3,5],-2,1);
  near(result.centered.reduce((s,v)=>s+v,0),0);
  near(result.normalized.reduce((s,v)=>s+v*v,0)/4,result.variance/(result.variance+.00001));
  result.output.forEach((value,i)=>near(value,-2*result.normalized[i]+1));
  assert.deepEqual(layerNormExample([3,3,3,3],2,-1).output,[-1,-1,-1,-1]);
});
