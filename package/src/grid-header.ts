import {
  bindable,
  BindingMode,
  customElement,
  ICustomElementViewModel,
} from '@aurelia/runtime-html';
import template from './grid-header.html';
import {
  ChangeType,
  Column,
  OrderChangeDropLocation,
} from './grid-state.js';
import {
  SortDirection,
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
  private readonly content!: HTMLElement;

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

  private handleDragStart(event: DragEvent) {
    const id = this.state.id;
    const dt = event.dataTransfer!;
    dt.setData('text/plain', id);
    dt.setDragImage(this.content, 10, 10);
    dt.dropEffect = 'move';
  }

  private handleDragover(event: DragEvent) {
    // TODO: account for visual drop marker
    event.preventDefault();
    return event.dataTransfer?.types.includes('text/plain');
  }

  private handleDrop(event: DragEvent) {
    event.preventDefault();
    const id = this.state.id;
    const sourceId = event.dataTransfer?.getData('text/plain');
    if (!sourceId || id === sourceId) return;
    this.state.parent.handleChange(
      ChangeType.Order,
      sourceId,
      this.state,
      GridHeader.computeDropLocation(this.content.getBoundingClientRect(), event.x)
    );
  }

  /** @internal */
  private static computeDropLocation(rect: DOMRect, x: number): OrderChangeDropLocation {
    const mid = rect.left + (rect.right - rect.left) / 2;
    const location = x <= mid
      ? OrderChangeDropLocation.Before
      : OrderChangeDropLocation.After;
    return location;
  }
}
