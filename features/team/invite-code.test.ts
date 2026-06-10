import { describe, expect, it } from "vitest";

import {
  generateInviteCode,
  INVITE_CODE_ALPHABET,
  INVITE_CODE_LENGTH,
  isValidInviteCode,
} from "./invite-code";

describe("generateInviteCode", () => {
  it("produces a code of the configured length", () => {
    expect(generateInviteCode()).toHaveLength(INVITE_CODE_LENGTH);
  });

  it("only uses characters from the alphabet", () => {
    for (let i = 0; i < 200; i++) {
      for (const char of generateInviteCode()) {
        expect(INVITE_CODE_ALPHABET).toContain(char);
      }
    }
  });

  it("never includes ambiguous characters", () => {
    const ambiguous = ["0", "O", "1", "I", "L"];
    for (let i = 0; i < 200; i++) {
      const code = generateInviteCode();
      for (const bad of ambiguous) {
        expect(code).not.toContain(bad);
      }
    }
  });

  it("is deterministic given a seeded random source", () => {
    const seeded = () => 0; // always pick the first alphabet character
    const firstChar = INVITE_CODE_ALPHABET.charAt(0);
    expect(generateInviteCode(seeded)).toBe(firstChar.repeat(INVITE_CODE_LENGTH));
  });
});

describe("isValidInviteCode", () => {
  it("accepts a freshly generated code", () => {
    expect(isValidInviteCode(generateInviteCode())).toBe(true);
  });

  it("rejects wrong length", () => {
    expect(isValidInviteCode("ABC")).toBe(false);
    expect(isValidInviteCode("ABCDEFG")).toBe(false);
  });

  it("rejects codes with ambiguous or lowercase characters", () => {
    expect(isValidInviteCode("ABCDE0")).toBe(false);
    expect(isValidInviteCode("abcdef")).toBe(false);
  });
});
