import clipboard from 'clipboardy';

/**
 * Read current clipboard contents (text only)
 */
export async function getClipboard(): Promise<{ text: string }> {
  try {
    const text = await clipboard.read();
    return { text };
  } catch (error) {
    throw new Error(`Failed to read clipboard: ${(error as Error).message}`);
  }
}

/**
 * Copy text to clipboard
 */
export async function setClipboard(text: string): Promise<{ success: boolean; length: number }> {
  if (!text) {
    throw new Error('Text is required');
  }

  try {
    await clipboard.write(text);
    return {
      success: true,
      length: text.length,
    };
  } catch (error) {
    throw new Error(`Failed to write to clipboard: ${(error as Error).message}`);
  }
}
