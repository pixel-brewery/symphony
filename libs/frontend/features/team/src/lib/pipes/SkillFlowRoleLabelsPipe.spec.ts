// @vitest-environment jsdom

// #region Imports

import {
  ChangeDetectionStrategy,
  Component,
  destroyPlatform,
  provideZonelessChangeDetection,
  type ApplicationRef,
} from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { ApplicationLocalization, provideApplicationLocalization } from '@symphony/frontend-intl';
import { describe, expect, it } from 'vitest';
import { SkillFlowRoleLabelsPipe } from './SkillFlowRoleLabelsPipe';

// #endregion

@Component({
  selector: 'symphony-test-skill-flow-role-labels',
  imports: [SkillFlowRoleLabelsPipe],
  template: '{{ roles | skillFlowRoleLabels }}',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class SkillFlowRoleLabelsHost {
  // #region Fields

  /**
   * The same roles array across both language renders.
   * @public
   * @readonly
   */
  public readonly roles: readonly string[] = ['analysis', 'solution'];

  // #endregion
}

describe('SkillFlowRoleLabelsPipe', () => {
  it('updates joined responsibility labels without replacing the roles array', async () => {
    // arrange
    const host = document.createElement('symphony-test-skill-flow-role-labels');
    document.body.append(host);
    let app: ApplicationRef | undefined;
    try {
      app = await bootstrapApplication(SkillFlowRoleLabelsHost, {
        providers: [provideZonelessChangeDetection(), provideApplicationLocalization()],
      });
      app.tick();
      expect(host.textContent?.trim()).toBe('Plan work, Implement changes');

      // act
      app.injector.get(ApplicationLocalization).setLanguage('de');
      app.tick();

      // assert
      expect(host.textContent?.trim()).toBe('Arbeit planen, Änderungen umsetzen');
    } finally {
      app?.destroy();
      host.remove();
      destroyPlatform();
    }
  });
});
