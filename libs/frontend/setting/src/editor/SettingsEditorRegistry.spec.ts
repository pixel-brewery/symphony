// #region Imports

import type { Type } from '@angular/core';
import { describe, expect, it, vi } from 'vitest';
import type { ISettingsEditorDefinition } from './ISettingsEditorDefinition';
import { SettingsEditorRegistry } from './SettingsEditorRegistry';

// #endregion

class EditorView {}
function editor(id = 'workspace-editor', kind = 'workspace'): ISettingsEditorDefinition {
  const component: Type<unknown> = EditorView;
  return {
    id,
    kind,
    isRequest: (request) => request.workspaceId === 'workspace-a',
    loadComponent: vi.fn(async () => component),
  };
}

describe('SettingsEditorRegistry', () => {
  it('rejects missing and invalid editor requests before loading a component', () => {
    // arrange
    const contribution = editor();
    const registry = new SettingsEditorRegistry([contribution]);

    // act / assert
    expect(() => registry.resolve({ kind: 'workspace', workspaceId: 'outside' })).toThrow(
      'Invalid settings editor request',
    );
    expect(() => registry.resolve({ kind: 'omitted' })).toThrow('No settings editor is registered');
    expect(contribution.loadComponent).not.toHaveBeenCalled();
  });

  it('rejects duplicate contribution identities and conflicting handlers for one kind', () => {
    // arrange
    const original = editor();

    // act / assert
    expect(() => new SettingsEditorRegistry([original, editor(original.id, 'other')])).toThrow(
      'Duplicate settings editor',
    );
    expect(
      () => new SettingsEditorRegistry([original, editor('second-id', original.kind)]),
    ).toThrow('Multiple settings editors');
  });

  it('resolves the owning definition only after its feature request guard accepts the input', () => {
    // arrange
    const contribution = editor();
    const registry = new SettingsEditorRegistry([contribution]);

    // act
    const resolved = registry.resolve({ kind: 'workspace', workspaceId: 'workspace-a' });

    // assert
    expect(resolved).toBe(contribution);
  });
});
