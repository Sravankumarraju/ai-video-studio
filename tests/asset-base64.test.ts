import { describe, expect, it } from 'vitest';
import { decodeAssetBase64 } from '../lib/asset-base64';
describe('connector media import', () => {
  it('decodes a real-sized narration payload without overflowing the regex stack', () => {
    const audio = Buffer.alloc(3 * 1024 * 1024 + 1, 137);
    expect(decodeAssetBase64(audio.toString('base64')).equals(audio)).toBe(true);
  });
  it('retains invalid encoding and upload-size rejection', () => {
    for (const value of ['A', 'A===', '=AAA', 'AA A', 'AA\nA', 'AAAA='])
      expect(() => decodeAssetBase64(value)).toThrow('Invalid base64');
    expect(() => decodeAssetBase64('')).toThrow('Media size');
    expect(() => decodeAssetBase64(Buffer.alloc(8 * 1024 * 1024 + 1).toString('base64'))).toThrow('8 MiB');
    for (const text of ['a', 'ab', 'abc']) expect(decodeAssetBase64(Buffer.from(text).toString('base64')).toString()).toBe(text);
  });
});
