import { describe, expect, test } from 'bun:test';
import {
  hashParentPinSha256,
  hashParentPinSimple,
  pinMatchesStoredHash,
} from './hash-parent-pin';

describe('hashParentPin / verifyPin hashing', () => {
  test('correct PIN matches SHA-256 stored hash', () => {
    const stored = hashParentPinSha256('1234');
    expect(pinMatchesStoredHash('1234', stored)).toBe(true);
  });

  test('wrong PIN fails against SHA-256 stored hash', () => {
    const stored = hashParentPinSha256('1234');
    expect(pinMatchesStoredHash('9999', stored)).toBe(false);
  });

  test('correct PIN matches simple fallback hash', () => {
    const stored = hashParentPinSimple('4321');
    expect(pinMatchesStoredHash('4321', stored)).toBe(true);
    expect(pinMatchesStoredHash('0000', stored)).toBe(false);
  });

  test('does not accept raw PIN compared to hash (regression)', () => {
    const stored = hashParentPinSha256('1234');
    expect(stored === '1234').toBe(false);
    expect(pinMatchesStoredHash('1234', '1234')).toBe(false);
  });
});
