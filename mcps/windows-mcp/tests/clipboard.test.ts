import { jest, describe, it, expect } from '@jest/globals';
import { getClipboard, setClipboard } from '../src/tools/clipboard.js';

// Clipboard tests require a display environment on Linux
// These tests are primarily for Windows but may work on Linux with xsel/xclip installed
const isWindows = process.platform === 'win32';
const hasDisplay = process.env.DISPLAY !== undefined || isWindows;

describe('Clipboard Tools', () => {
  describe('setClipboard', () => {
    (hasDisplay ? it : it.skip)('should copy text to clipboard', async () => {
      const result = await setClipboard('Test clipboard content');
      expect(result.success).toBe(true);
      expect(result.length).toBe('Test clipboard content'.length);
    });

    it('should throw error for empty text', async () => {
      await expect(setClipboard('')).rejects.toThrow('Text is required');
    });
  });

  describe('getClipboard', () => {
    (hasDisplay ? it : it.skip)('should read text from clipboard', async () => {
      // First set something
      await setClipboard('Read this back');

      const result = await getClipboard();
      expect(result.text).toBe('Read this back');
    });

    (hasDisplay ? it : it.skip)('should handle multiline text', async () => {
      const multiline = 'Line 1\nLine 2\nLine 3';
      await setClipboard(multiline);

      const result = await getClipboard();
      expect(result.text).toBe(multiline);
    });

    (hasDisplay ? it : it.skip)('should handle special characters', async () => {
      const special = 'Special: !@#$%^&*()_+-={}[]|\\:";\'<>?,./';
      await setClipboard(special);

      const result = await getClipboard();
      expect(result.text).toBe(special);
    });
  });
});
