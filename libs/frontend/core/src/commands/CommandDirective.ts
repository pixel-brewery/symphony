// #region Imports

import { DestroyRef, Directive, effect, ElementRef, inject, input, model } from '@angular/core';
import type { Command } from './Command';

// #endregion

/**
 * Binds view events to presenter commands, so a template states which action an event triggers
 * instead of calling a presenter method.
 *
 * @public
 */
@Directive({
  selector: '[command],[commandName]',
  standalone: true,
})
export class CommandDirective {
  // #region Fields

  private readonly _elementRef: ElementRef<HTMLElement>;
  private readonly _destroyRef: DestroyRef;
  private readonly _listeners = new Map<string, EventListener>();

  // #endregion

  // #region Ctor

  /**
   * Constructs an event-to-command binding for its host element.
   *
   * @public
   */
  public constructor(
    elementRef: ElementRef<HTMLElement> = inject(ElementRef),
    destroyRef: DestroyRef = inject(DestroyRef),
  ) {
    this._elementRef = elementRef;
    this._destroyRef = destroyRef;
    effect(() => {
      const bindings = this.command();
      this.validateBindings(bindings);
      this.detachAll();
      this.attachAll(bindings);
    });
    this._destroyRef.onDestroy(() => this.detachAll());
  }

  // #endregion

  // #region Properties

  /**
   * Event-to-command bindings, for example `{ click: presenter.refreshCommand }`.
   *
   * @public
   * @readonly
   */
  public readonly command = model<Readonly<Record<string, Command<never>>>>({});

  /**
   * Fixed parameter passed to the command instead of the event.
   *
   * @public
   * @readonly
   */
  public readonly commandParameter = input<unknown>();

  /**
   * Optional mapper deriving the command parameter from the event.
   *
   * @public
   * @readonly
   */
  public readonly commandParameterFromEvent = input<(event: unknown) => unknown>();

  /**
   * Whether the directive prevents the event's default browser behavior.
   *
   * @public
   * @readonly
   */
  public readonly preventDefault = input(true);

  /**
   * Whether the directive stops the event from propagating beyond the command target.
   *
   * @public
   * @readonly
   */
  public readonly stopPropagation = input(true);

  // #endregion

  // #region Methods

  private attachAll(bindings: Readonly<Record<string, Command<never>>>): void {
    const element = this._elementRef.nativeElement;
    for (const [eventName, boundCommand] of Object.entries(bindings)) {
      const handler: EventListener = (event) => this.handleEvent(event, boundCommand);
      element.addEventListener(eventName, handler);
      this._listeners.set(eventName, handler);
    }
  }

  private detachAll(): void {
    const element = this._elementRef.nativeElement;
    for (const [eventName, handler] of this._listeners)
      element.removeEventListener(eventName, handler);
    this._listeners.clear();
  }

  private handleEvent(event: Event, boundCommand: Command<never>): void {
    if (this.preventDefault()) event.preventDefault();
    if (this.stopPropagation()) event.stopPropagation();
    if (!boundCommand.canExecute()) return;
    boundCommand.execute(this.resolveParameter(event) as never);
  }

  private resolveParameter(event: Event): unknown {
    const fixed = this.commandParameter();
    if (fixed !== undefined) return fixed;
    const mapper = this.commandParameterFromEvent();
    if (mapper) return mapper(event);
    return event instanceof CustomEvent ? event.detail : event;
  }

  /** A modifier event or a duplicate binding would silently drop an action, so both are refused. */
  private validateBindings(bindings: Readonly<Record<string, Command<never>>>): void {
    for (const eventName of Object.keys(bindings))
      if (eventName.includes('.'))
        throw new Error(
          `Modifier events are not supported by the command binding: "${eventName}".`,
        );
  }

  // #endregion
}
