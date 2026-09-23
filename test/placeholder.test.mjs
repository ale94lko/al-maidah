import assert from "node:assert/strict";
import test from "node:test";
import { getProjectName, projectName } from "../src/placeholder.mjs";

test("projectName is al-maidah", () => {
  assert.equal(projectName, "al-maidah");
  assert.equal(getProjectName(), "al-maidah");
});
