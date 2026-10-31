// #region Imports
import { Injector, runInInjectionContext, signal } from '@angular/core';
import { describe, expect, it, vi } from 'vitest';
import type { IViewPresenter } from './IViewPresenter';
import { View } from './View';
import { VIEW_PRESENTER } from './ViewPresenterToken';
// #endregion

class TestView extends View<IViewPresenter> {}

describe('View', () => {
  it('forwards the Angular lifecycle to its injected presenter', () => {
    // arrange
    const presenter: IViewPresenter = {
      initialized: signal(false),
      disposed: signal(false),
      isLoading: signal(false),
      initialize: vi.fn(),
      dispose: vi.fn(),
    };
    const injector = Injector.create({
      providers: [{ provide: VIEW_PRESENTER, useValue: presenter }],
    });
    const view = runInInjectionContext(injector, () => new TestView());

    // act
    view.ngOnInit();
    view.ngOnDestroy();

    // assert
    expect(view.presenter).toBe(presenter);
    expect(presenter.initialize).toHaveBeenCalledOnce();
    expect(presenter.dispose).toHaveBeenCalledOnce();
  });
});
