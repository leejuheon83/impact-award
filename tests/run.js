import registerRecommendationTests from "./recommendation.test.js";

const tests = [];
const test = (name, fn) => tests.push({ name, fn });

registerRecommendationTests(test);

let failed = 0;

for (const { name, fn } of tests) {
  try {
    fn();
    console.log(`✓ ${name}`);
  } catch (error) {
    failed += 1;
    console.error(`✗ ${name}`);
    console.error(error);
  }
}

if (failed > 0) {
  process.exitCode = 1;
}
