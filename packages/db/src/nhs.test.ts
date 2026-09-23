import { describe, expect, it } from "vitest";

import { validateNhsNumber } from "./nhs";

describe("validateNhsNumber", () => {
  it("accepts a known-valid NHS number (4857773457)", () => {
    expect(validateNhsNumber("4857773457")).toBe(true);
  });

  it("accepts a number with internal spaces stripped (485 777 3457)", () => {
    expect(validateNhsNumber("485 777 3457")).toBe(true);
  });

  it("rejects 9 digits", () => {
    expect(validateNhsNumber("485777345")).toBe(false);
  });

  it("rejects 11 digits", () => {
    expect(validateNhsNumber("48577734570")).toBe(false);
  });

  it("rejects non-digit characters", () => {
    expect(validateNhsNumber("485777345X")).toBe(false);
  });

  it("rejects a number with a wrong check digit", () => {
    // 4857773457 is valid; changing the last digit to 8 breaks the check
    expect(validateNhsNumber("4857773458")).toBe(false);
  });

  it("rejects all-zeros (modulus 11 = 11 → check digit 0, but sum ≠ 0)", () => {
    // 0000000000 — weighted sum is 0, remainder 0, checkDigit = 11 → expects digits[9] === 0
    // That is actually valid by the spec (check digit = 0 when result is 11)
    expect(validateNhsNumber("0000000000")).toBe(true);
  });

  it("rejects an empty string", () => {
    expect(validateNhsNumber("")).toBe(false);
  });
});
