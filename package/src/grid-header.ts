import { resolve } from '@aurelia/kernel';
import {
  bindable,
  BindingMode,
  CustomElement,
  ICustomElementViewModel,
  INode,
  IPlatform,
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

const columnPaddingPx = 30;

/**
 * Custom element that wraps the header content.
 */
export class GridHeader implements ICustomElementViewModel {
  @bindable({ mode: BindingMode.oneTime })
  public readonly state!: Column;
  private readonly content!: HTMLElement;
  private readonly sortingMarker?: HTMLElement;

  private readonly node: HTMLElement = resolve(INode) as HTMLElement;
  private readonly platform: IPlatform = resolve(IPlatform);

  public get isSortable(): boolean {
    return this.state.sortable;
  }

  public get direction(): SortDirection | null {
    return this.state.direction;
  }

  public get isResizable(): boolean {
    return this.state.isResizable;
  }

  public binding(): void {
    this.state.headerElement = this.node;
  }

  public attached(): void {
    // it is essential to queue to queue so that all child get rendered first.
    this.platform.taskQueue.queueTask(() => {
      const state = this.state;
      const parent = state.parent;
      const widthPx = state.widthPx;
      if (!widthPx?.endsWith('px') ?? false) return;

      const configuredWidth = Number(widthPx.substring(0, widthPx.length - 2));
      if (Number.isNaN(configuredWidth)) return;

      const minWidth = this.minColumnWidth;
      if (configuredWidth >= minWidth) return;

      this.state.widthPx = `${minWidth}px`;
      parent.handleChange(ChangeType.Width);
    });
  }

  private handleClick(): void {
    // non-sortable column; nothing to do.
    if (!this.isSortable) { return; }
    const state = this.state;
    const oldDirection = state.direction;
    const newDirection = oldDirection === null || oldDirection === SortDirection.Descending
      ? SortDirection.Ascending
      : SortDirection.Descending;
    state.setDirection(newDirection, true);
  }

  private handleDragStart(event: DragEvent): boolean {
    const id = this.state.id;
    const dt = event.dataTransfer!;
    dt.setData('text/plain', id);
    dt.setDragImage(this.content, 10, 10);
    dt.dropEffect = 'move';
    return true;
  }

  private handleDragover(event: DragEvent): boolean | undefined {
    // TODO: account for visual drop marker
    event.preventDefault();
    return event.dataTransfer?.types.includes('text/plain');
  }

  private handleDrop(event: DragEvent): void {
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

  private handleMouseDown(event: MouseEvent): void {
    event.preventDefault();

    // Handle column resizing if the user starts dragging a resize handle:
    const resize = ($event: MouseEvent): void => {
      $event.stopImmediatePropagation();
      $event.preventDefault();
      const state = this.state;
      state.widthPx = `${Math.max(this.minColumnWidth, $event.clientX - this.node.getBoundingClientRect().x)}px`;
      const columns = state.parent.columns;
      const len = columns.length;
      for (let i = 0; i < len; i++) {
        const column = columns[i];
        if (column.hidden || column.widthPx !== null) continue;
        column.widthPx = `${column.headerElement!.getBoundingClientRect().width}px`;
      }
      this.state.parent.handleChange(ChangeType.Width);
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

  private get minColumnWidth(): number {
    return this.content.getBoundingClientRect().width
      + (this.sortingMarker?.getBoundingClientRect().width ?? 0)
      + columnPaddingPx;
  }

  private static computeDropLocation(rect: DOMRect, x: number): OrderChangeDropLocation {
    const mid = rect.left + (rect.right - rect.left) / 2;
    const location = x <= mid
      ? OrderChangeDropLocation.Before
      : OrderChangeDropLocation.After;
    return location;
  }
}

// eslint-disable-next-line @typescript-eslint/naming-convention
export const DefaultGridHeader = CustomElement.define({ name: 'grid-header', template }, GridHeader);
