// @vitest-environment jsdom

// #region Imports

import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import type { IAgentActivity, IAgentWork } from '@symphony/domain-team';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { AgentFigureComponent } from './AgentFigureComponent';
import { AgentFigurePointer } from './AgentFigurePointer';
import { AgentSpriteAssets } from './AgentSpriteAssets';

// #endregion

describe('AgentFigureComponent', () => {
  const target = signal<Readonly<{ x: number; y: number }> | null>(null);
  let reduced = false;
  const listeners = new Set<() => void>();

  beforeAll(() => TestBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting()));
  afterAll(() => TestBed.resetTestEnvironment());
  beforeEach(() => {
    vi.useFakeTimers();
    reduced = false;
    target.set(null);
    listeners.clear();
    vi.stubGlobal('matchMedia', () => ({
      get matches() {
        return reduced;
      },
      addEventListener: (_event: string, listener: () => void) => listeners.add(listener),
      removeEventListener: (_event: string, listener: () => void) => listeners.delete(listener),
    }));
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        {
          provide: AgentSpriteAssets,
          useValue: { load: () => Promise.resolve('figures/blue-v2.png') },
        },
        { provide: AgentFigurePointer, useValue: { target } },
      ],
    });
    TestBed.overrideComponent(AgentFigureComponent, {
      set: { template: '', templateUrl: undefined, styles: [], styleUrl: undefined },
    });
  });
  afterEach(() => {
    TestBed.resetTestingModule();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('loops the actual phase, freezes stale data and releases timers on destruction', async () => {
    // arrange
    const fixture = TestBed.createComponent(AgentFigureComponent);
    const state = signal<'working' | 'stale'>('working');
    // Vitest's JIT lacks the Angular build's signal-input transform. Keep its
    // readers reactive; Electron exercises the real compiled input bindings.
    vi.spyOn(fixture.componentInstance, 'agentId').mockImplementation(() => 'blue');
    vi.spyOn(fixture.componentInstance, 'state').mockImplementation(() => state());
    vi.spyOn(fixture.componentInstance, 'activeRole').mockImplementation(() => 'solution');
    fixture.detectChanges();
    await Promise.resolve();
    fixture.detectChanges();
    const employee = fixture.componentInstance;
    // act
    vi.advanceTimersByTime(240);
    fixture.detectChanges();
    // assert
    expect(employee.frame().rowIndex).toBe(7);
    expect(employee.frame().columnIndex).toBe(2);
    state.set('stale');
    fixture.detectChanges();
    expect(employee.frame().rowIndex).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
    target.set({ x: 300, y: 20 });
    fixture.detectChanges();
    expect(employee.look()).toBeNull();
    state.set('working');
    fixture.detectChanges();
    expect(vi.getTimerCount()).toBe(1);
    fixture.destroy();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('stops offscreen playback and applies a live reduced-motion preference without changing work', async () => {
    // arrange
    const fixture = TestBed.createComponent(AgentFigureComponent);
    vi.spyOn(fixture.componentInstance, 'agentId').mockImplementation(() => 'blue');
    vi.spyOn(fixture.componentInstance, 'state').mockImplementation(() => 'working');
    vi.spyOn(fixture.componentInstance, 'activeRole').mockImplementation(() => 'analysis');
    fixture.detectChanges();
    await Promise.resolve();
    fixture.detectChanges();
    const employee = fixture.componentInstance;
    // act
    employee.visible.set(false);
    fixture.detectChanges();
    // assert
    expect(vi.getTimerCount()).toBe(0);
    employee.visible.set(true);
    fixture.detectChanges();
    expect(vi.getTimerCount()).toBe(1);
    const hidden = vi.spyOn(document, 'hidden', 'get').mockReturnValue(true);
    document.dispatchEvent(new Event('visibilitychange'));
    fixture.detectChanges();
    expect(vi.getTimerCount()).toBe(0);
    hidden.mockReturnValue(false);
    document.dispatchEvent(new Event('visibilitychange'));
    fixture.detectChanges();
    expect(vi.getTimerCount()).toBe(1);
    reduced = true;
    listeners.forEach((listener) => listener());
    fixture.detectChanges();
    expect(employee.state()).toBe('working');
    expect(employee.frame().rowIndex).toBe(8);
    expect(vi.getTimerCount()).toBe(0);
    employee.greet();
    fixture.detectChanges();
    expect(employee.pose()).toBe('review');
    fixture.destroy();
    expect(listeners.size).toBe(0);
  });

  it('finishes greetings and celebrates each completed execution once across snapshot refreshes', async () => {
    // arrange
    const fixture = TestBed.createComponent(AgentFigureComponent);
    const state = signal<IAgentActivity['state']>('idle');
    const work = signal<readonly IAgentWork[]>([]);
    vi.spyOn(fixture.componentInstance, 'agentId').mockImplementation(() => 'blue');
    vi.spyOn(fixture.componentInstance, 'state').mockImplementation(() => state());
    vi.spyOn(fixture.componentInstance, 'work').mockImplementation(() => work());
    fixture.detectChanges();
    await Promise.resolve();
    fixture.detectChanges();
    const employee = fixture.componentInstance;
    // act
    employee.greet();
    fixture.detectChanges();
    // assert
    expect(employee.pose()).toBe('waving');
    expect(employee.state()).toBe('idle');
    vi.advanceTimersByTime(2150);
    fixture.detectChanges();
    expect(employee.pose()).toBe('idle');

    const completed: IAgentWork = {
      workItemId: 'ticket-1',
      executionId: 'execution-1',
      state: 'completed',
      updatedAt: '2026-10-09T10:00:00Z',
    };
    work.set([completed]);
    state.set('completed');
    fixture.detectChanges();
    expect(employee.pose()).toBe('jumping');
    vi.advanceTimersByTime(2550);
    fixture.detectChanges();
    expect(employee.pose()).toBe('idle');
    work.set([{ ...completed }]);
    fixture.detectChanges();
    expect(employee.pose()).toBe('idle');
    employee.greet();
    fixture.detectChanges();
    expect(employee.pose()).toBe('waving');
    expect(employee.state()).toBe('completed');
    vi.advanceTimersByTime(2150);
    fixture.detectChanges();
    expect(employee.pose()).toBe('idle');
    work.set([{ ...completed, executionId: 'execution-2', updatedAt: '2026-10-09T10:01:00Z' }]);
    fixture.detectChanges();
    expect(employee.pose()).toBe('jumping');
    fixture.destroy();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('finishes a custom PNG greeting without loading an atlas or leaving a gesture timer', () => {
    // arrange
    const fixture = TestBed.createComponent(AgentFigureComponent);
    vi.spyOn(fixture.componentInstance, 'agentId').mockImplementation(() => 'custom');
    vi.spyOn(fixture.componentInstance, 'appearance').mockImplementation(() => ({
      figure: 'dot',
      color: 'blue',
      accessories: [],
      image: 'data:image/png;base64,custom-image',
    }));
    fixture.detectChanges();
    const employee = fixture.componentInstance;
    // act
    employee.greet();
    fixture.detectChanges();
    // assert
    expect(employee.sprite()).toBeNull();
    expect(employee.pose()).toBe('waving');
    expect(employee.state()).toBe('idle');
    vi.advanceTimersByTime(2150);
    fixture.detectChanges();
    expect(employee.pose()).toBe('idle');
    expect(vi.getTimerCount()).toBe(0);
    employee.greet();
    fixture.detectChanges();
    expect(employee.pose()).toBe('waving');
    fixture.destroy();
    expect(vi.getTimerCount()).toBe(0);
  });
});
