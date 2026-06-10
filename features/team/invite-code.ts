/**
 * Invite-code generation (UI_WORKFLOWS.md §2.4).
 *
 * 6 characters, uppercase letters + digits, excluding ambiguous glyphs
 * (0, O, 1, I, L) so codes are easy to read aloud and type.
 */

export const INVITE_CODE_LENGTH = 6;

// A–Z and 2–9, minus the ambiguous characters O, I, L (0 and 1 are already out).
export const INVITE_CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export function generateInviteCode(
  randomInt: (maxExclusive: number) => number = defaultRandomInt,
): string {
  let code = "";
  for (let i = 0; i < INVITE_CODE_LENGTH; i++) {
    code += INVITE_CODE_ALPHABET[randomInt(INVITE_CODE_ALPHABET.length)];
  }
  return code;
}

export function isValidInviteCode(code: string): boolean {
  if (code.length !== INVITE_CODE_LENGTH) return false;
  for (const char of code) {
    if (!INVITE_CODE_ALPHABET.includes(char)) return false;
  }
  return true;
}

function defaultRandomInt(maxExclusive: number): number {
  return Math.floor(Math.random() * maxExclusive);
}
