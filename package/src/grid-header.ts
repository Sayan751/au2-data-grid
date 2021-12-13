import {
  bindable,
  BindingMode,
  customElement,
  ICustomElementViewModel
} from '@aurelia/runtime-html';
import template from './grid-header.html';
import {
  Column
} from './grid-state.js';
import {
  SortDirection
} from './sorting-options.js';

/*
TODO: customization of template
  To this end, export a default definition with a default template.
  However, to support that we need to extend the TS transform function.
*/

/**
 * Custom element that wraps the header content.
 */
@customElement({ name: 'grid-header', template })
export class GridHeader implements ICustomElementViewModel {
  @bindable({ mode: BindingMode.oneTime })
  public readonly state!: Column;

  public get isSortable() {
    return this.state.sortable;
  }

  public get direction() {
    return this.state.direction;
  }

  private handleClick() {
    // non-sortable column; nothing to do.
    if (!this.isSortable) { return; }
    const state = this.state;
    const oldDirection = state.direction;
    const newDirection = oldDirection === null || oldDirection === SortDirection.Descending
      ? SortDirection.Ascending
      : SortDirection.Descending;
    state.setDirection(newDirection, true);
  }
}
