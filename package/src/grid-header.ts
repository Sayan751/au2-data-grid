import {
  bindable,
  BindingMode,
  customElement,
  ICustomElementViewModel,
  INode,
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

const listMinColumnWidth = 30;
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

  public constructor(
    @INode private readonly node: HTMLElement,
  ) { }

  public get isSortable() {
    return this.state.sortable;
  }

  public get direction() {
    return this.state.direction;
  }

  public get isResizable() {
    return true; // TODO: get it from Column (state)  <- processContent <- list markup
  }

  public binding() {
    this.state.headerElement = this.node;
  }

  private handleClick() {
    console.log('click event');
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

  private handleMouseDown(event: MouseEvent) {
    event.preventDefault();

    // Handle column resizing if the user starts dragging a resize handle:
    const resize = ($event: MouseEvent): void => {
      $event.stopImmediatePropagation();
      $event.preventDefault();

      const state = this.state;
      state.widthPx = Math.max(listMinColumnWidth, $event.clientX - this.node.getBoundingClientRect().x);
      const columns = state.parent.columns;
      const len = columns.length;
      for (let i = 0; i < len; i++) {
        const column = columns[i];
        if (column.widthPx !== null) continue;
        column.widthPx = column.headerElement!.getBoundingClientRect().width;
      }

      state.parent.handleChange(ChangeType.Width);
    };
    const stop = ($event: MouseEvent): void => {
      $event.stopImmediatePropagation();
      $event.preventDefault();
      window.removeEventListener('mousemove', resize, { capture: true });
      window.removeEventListener('mouseup', stop, { capture: true });
    };
    window.addEventListener('mousemove', resize, { capture: true });
    window.addEventListener('mouseup', stop, { capture: true });
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