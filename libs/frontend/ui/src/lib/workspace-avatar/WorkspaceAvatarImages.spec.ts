// @vitest-environment jsdom

// #region Imports

import { IconRegistry } from '@pixel-brewery/mosaik-elements-angular';
import { reiconStar } from '@pixel-brewery/mosaik-icons/reicon';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WorkspaceAvatarImages } from './WorkspaceAvatarImages';
import type { WorkspaceAvatarSource } from './WorkspaceAvatarSource';

// #endregion

describe('WorkspaceAvatarImages', () => {
  const workspace: WorkspaceAvatarSource = { shortCode: 'fxproject', color: '#f97316' };
  const context = {
    fillStyle: '',
    globalAlpha: 1,
    font: '',
    textAlign: 'start',
    textBaseline: 'alphabetic',
    fillRect: vi.fn(),
    fillText: vi.fn(),
    save: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    drawImage: vi.fn(),
    restore: vi.fn(),
  };
  let images: WorkspaceAvatarImages;
  let icons: IconRegistry;
  let decode: ReturnType<typeof vi.fn<() => Promise<void>>>;

  beforeEach(() => {
    icons = new IconRegistry();
    vi.spyOn(icons, 'resolve').mockReturnValue(null);
    images = new WorkspaceAvatarImages(document, icons);
    decode = vi.fn<() => Promise<void>>().mockResolvedValue(undefined);
    const createElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tagName) => {
      const element = createElement(tagName);
      if (element instanceof HTMLImageElement) element.decode = decode;
      return element;
    });
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
      context as unknown as CanvasRenderingContext2D,
    );
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue(
      'data:image/png;base64,workspace',
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  it('preserves the existing short-code monogram for workspaces without an appearance', async () => {
    // arrange
    const legacyWorkspace = { ...workspace };

    // act
    const source = await images.render(legacyWorkspace);

    // assert
    expect(source).toBe('data:image/png;base64,workspace');
    expect(context.fillText).toHaveBeenCalledWith('FX', 128, 136, 220);
  });

  it('keeps a workspace identifiable when its saved icon is no longer registered', async () => {
    // arrange
    const unavailableIcon: WorkspaceAvatarSource = {
      ...workspace,
      avatar: { kind: 'icon', value: 'removed-icon' },
    };

    // act
    const source = await images.render(unavailableIcon);

    // assert
    expect(source).not.toBeNull();
    expect(context.fillText).toHaveBeenCalledWith('FX', 128, 136, 220);
    expect(decode).not.toHaveBeenCalled();
  });

  it('retains joined emoji sequences as one selected glyph', async () => {
    // arrange
    const emoji: WorkspaceAvatarSource = {
      ...workspace,
      avatar: { kind: 'emoji', value: '👩🏽‍💻' },
    };

    // act
    await images.render(emoji);

    // assert
    expect(context.fillText).toHaveBeenCalledWith('👩🏽‍💻', 128, 136, 220);
  });

  it('returns the text fallback after a decode failure and allows a later retry', async () => {
    // arrange
    vi.mocked(icons.resolve).mockReturnValue(reiconStar);
    decode.mockRejectedValueOnce(new Error('Image decode failed'));
    const icon: WorkspaceAvatarSource = {
      ...workspace,
      avatar: { kind: 'icon', value: 'star' },
    };

    // act
    const failedSource = await images.render(icon);
    const recoveredSource = await images.render(icon);

    // assert
    expect(failedSource).toBeNull();
    expect(recoveredSource).toBe('data:image/png;base64,workspace');
    expect(decode).toHaveBeenCalledTimes(2);
  });

  it('leaves blank drafts and unavailable drawing contexts to the avatar fallback', async () => {
    // arrange
    vi.mocked(HTMLCanvasElement.prototype.getContext).mockReturnValue(null);

    // act
    const missingContext = await images.render(workspace);
    const blankDraft = await images.render({ shortCode: '', color: '' });

    // assert
    expect(missingContext).toBeNull();
    expect(blankDraft).toBeNull();
    expect(context.fillText).not.toHaveBeenCalled();
  });

  it('shares concurrent previews and evicts older identities after the cache bound', async () => {
    // arrange
    const oldest = images.render(workspace);
    const concurrent = images.render({ ...workspace });
    await oldest;

    // act
    for (let index = 0; index < 128; index++) {
      await images.render({ ...workspace, shortCode: `W${index}` });
    }
    const retried = images.render(workspace);
    await retried;

    // assert
    expect(concurrent).toBe(oldest);
    expect(retried).not.toBe(oldest);
    expect(HTMLCanvasElement.prototype.toDataURL).toHaveBeenCalledTimes(130);
  });
});
