import {
  DI,
  IContainer,
} from '@aurelia/kernel';
import {
  CustomElementDefinition,
  ViewFactory,
} from '@aurelia/runtime-html';
import {
  SortDirection,
  SortOption,
} from './sorting-options.js';

export interface ExportableGridState {
  columns: ExportableColumnState[];
}
export interface IGridState {
  export(): ExportableGridState;
}
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface IGridStateModel extends GridStateModel { }
// eslint-disable-next-line @typescript-eslint/naming-convention
export const IGridStateModel = DI.createInterface<IGridStateModel>('IGridStateModel');

/**
 * This aggregates the structural metadata for the grid.
 * This is meant for internal use.
 *
 * @internal
 */
export class GridStateModel implements IGridState {
  private _activeSortOptions: SortOption<Record<string, unknown>> | null = null;
  /**
   * @internal
   */
  private subscribers: GridStateChangeSubscriber[] = [];

  /** @internal */
  private viewFactoriesCreated: boolean = false;
  public readonly columns: Column[] = [];

  public get activeSortOptions(): SortOption<Record<string, unknown>> | null {
    return this._activeSortOptions;
  }

  /**
   * Exports the grid state.
   */
  public export(): ExportableGridState {
    return {
      columns: this.columns.map((c) => c.export())
    };
  }

  /**
   * Applies a previously exported state.
   *
   * @param {ExportableGridState} state The state to apply.
   */
  public applyState(state: ExportableGridState): void {
    const columns = this.columns;
    const stateColumns = state.columns;
    const len = stateColumns.length;

    for (let i = 0; i < len; i++) {
      const stateColumn = stateColumns[i];
      const colIndex = columns.findIndex(c => c.id === stateColumn.id);
      if (colIndex === -1) continue;
      const column = columns[colIndex];
      if (!column.tryApplyState(stateColumn) || colIndex === i) continue;
      // move column
      columns.splice(colIndex, 1);
      columns.splice(i, 0, column);
    }
  }

  /**
   * Marks the hidden columns as per the given column ids.
   * Note that in absence of a `id` attribute in `grid-column`, the `property` is used as the `id`.
   *
   * @param {string[]} columnIds The collection of ids of the columns to hide.
   */
  public hideColumns(columnIds: string[]): void {
    const len = columnIds?.length ?? 0;
    if (len === 0) return;
    const columns = this.columns;
    for (let i = 0; i < len; i++) {
      const id = columnIds[i];
      const col = columns.find(c => c.id === id);
      if (col === undefined) continue;
      col.hidden = true;
    }
  }

  /**
   * Creates the view factories for every column using the given `container`.
   */
  public createViewFactories(container: IContainer): void {
    if (this.viewFactoriesCreated) return;
    const columns = this.columns;
    const len = columns.length;
    for (let i = 0; i < len; i++) {
      columns[i].createViewFactories(container);
    }
    this.viewFactoriesCreated = true;
  }

  /**
   * Initializes the sort options.
   * To this end the first column with non-null direction is used .
   */
  public initializeActiveSortOptions(): SortOption<Record<string, unknown>> | null {
    const column = this.columns.find(c => c.direction !== null);
    if (column == null) return null;
    return this._activeSortOptions = {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      property: column.property!,
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      direction: column.direction!,
    };
  }

  /**
   * Adds the given `subscriber` to the collection of subscribers.
   * The subscribers will be notified for state changes.
   */
  public addSubscriber(subscriber: GridStateChangeSubscriber): void {
    this.subscribers.push(subscriber);
  }

  /**
   * Removes the given `subscriber` from the collection of subscribers.
   * The subscriber won't be notified for any further state changes.
   */
  public removeSubscriber(subscriber: GridStateChangeSubscriber): void {
    const subscribers = this.subscribers;
    const idx = subscribers.findIndex(s => s === subscriber);
    if (idx === -1) return;
    subscribers.splice(idx, 1);
  }

  private notifySubscribers(
    type: ChangeType.Width,
  ): void;
  private notifySubscribers(
    type: ChangeType.Sort,
    newValue: SortOption<Record<string, unknown>>,
    oldValue: SortOption<Record<string, unknown>> | null,
  ): void;
  private notifySubscribers(
    type: ChangeType.Order,
    newValue: OrderChangeData,
    oldValue: null,
  ): void;
  private notifySubscribers(
    type: ChangeType,
    newValue?: SortOption<Record<string, unknown>> | OrderChangeData,
    oldValue?: SortOption<Record<string, unknown>> | null,
  ): void {
    const subscribers = this.subscribers;
    const len = subscribers.length;
    for (let i = 0; i < len; i++) {
      subscribers[i].handleGridStateChange(type, newValue, oldValue);
    }
  }

  /** @internal */
  public handleChange(type: ChangeType.Width): void;
  public handleChange(type: ChangeType.Sort, column: Column): void;
  public handleChange(type: ChangeType.Order, sourceId: string, destination: Column, location: OrderChangeDropLocation): void;
  public handleChange(type: ChangeType, columnOrId?: string | Column, destination?: Column, location?: OrderChangeDropLocation): void {
    switch (type) {
      case ChangeType.Sort: {
        const oldSortOptions = this._activeSortOptions;
        const oldProperty = oldSortOptions?.property;
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const newProperty = (columnOrId as Column).property!;
        if (oldProperty !== newProperty) {
          // this is needed so that change to the old sort column can be propagated to the view.
          this.columns
            .find(c => c.property === oldProperty)
            ?.setDirection(null, false);
        }
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const newSortOptions = this._activeSortOptions = { property: newProperty, direction: (columnOrId as Column).direction! };
        this.notifySubscribers(type, newSortOptions, oldSortOptions);
        return;
      }
      case ChangeType.Order: {
        const columns = this.columns;
        const sourceIndex = columns.findIndex(c => c.id === columnOrId);
        const destinationIndex = columns.findIndex(c => c === destination);
        const diff = destinationIndex - sourceIndex;
        if (diff === 1 && location === OrderChangeDropLocation.Before
          || diff === -1 && location === OrderChangeDropLocation.After
        ) return;
        let $destinationIndex = destinationIndex;
        if (sourceIndex < destinationIndex && location === OrderChangeDropLocation.Before) {
          $destinationIndex--;
        } else if(sourceIndex > destinationIndex && location === OrderChangeDropLocation.After) {
          $destinationIndex++;
        }
        columns.splice($destinationIndex, 0, columns.splice(sourceIndex, 1)[0]);
        this.notifySubscribers(type, { fromIndex: sourceIndex, toIndex: destinationIndex, location } as OrderChangeData, null);
        return;
      }
      case ChangeType.Width:
        this.notifySubscribers(type);
        return;
      default:
        throw new Error(`Unsupported change type: ${String(type)}.`);
    }
  }
}

export interface ExportableColumnState {
  readonly id: string;
  readonly property: string | null;
  readonly isResizable: boolean;
  widthPx: string | null;
  direction: SortDirection | null;
}
export interface ColumnState extends ExportableColumnState {
  setDirection(direction: SortDirection | null, notifyParent: boolean): void;
  export(): ExportableColumnState;
}
/**
 * This describes the structural metadata of a column.
 * This is meant for internal use.
 *
 * @internal
 */
export class Column implements ColumnState {

  private static id = 0;
  public static generateId(): string { return `unnamed-column-${++this.id}`; }

  /** @internal */
  private readonly _sortable: boolean = false;
  /** @internal */
  private _direction: SortDirection | null = null;
  /** @internal */
  private _headerViewFactory: ViewFactory | null = null;
  /** @internal */
  private _contentViewFactory: ViewFactory | null = null;
  /**
   * This is registered from inside the grid-header CE during `binding`.
   *
   * @internal
   */
  public headerElement?: HTMLElement;
  public hidden: boolean = false;

  public constructor(
    public readonly parent: GridStateModel,
    public readonly id: string,
    public readonly property: string | null,
    private readonly exportable: boolean,
    direction: SortDirection | null,
    public readonly isResizable: boolean,
    public widthPx: string | null,
    private readonly header: CustomElementDefinition,
    private readonly content: CustomElementDefinition,
  ) {
    if (!id) throw new Error('Cannot instantiate ColumnState; expected non-null, non-undefined, non-empty string for id.');
    if (property !== null) {
      if (property.length === 0) throw new Error('Cannot instantiate ColumnState; expected non-empty property.');
      this._sortable = true;
    } else {
      direction = null;
    }
    this._direction = direction;
    parent.columns.push(this);
  }

  public get direction(): SortDirection | null { return this._direction; }
  public get sortable(): boolean { return this._sortable; }
  public get headerViewFactory(): ViewFactory | null { return this._headerViewFactory; }
  public get contentViewFactory(): ViewFactory | null { return this._contentViewFactory; }

  /** @internal */
  public setDirection(direction: SortDirection | null, notifyParent: boolean): void {
    if (!this._sortable) throw new Error(`The column '${this.id}' is not sortable.`);
    this._direction = direction;
    if (notifyParent) {
      this.parent.handleChange(ChangeType.Sort, this);
    }
  }

  public export(): ExportableColumnState {
    if (!this.exportable) throw new Error(`The column '${this.id}' is not exportable.`);
    return {
      id: this.id,
      property: this.property,
      direction: this._direction,
      isResizable: this.isResizable,
      widthPx: this.widthPx,
    };
  }

  /** @internal */
  public tryApplyState(state: ExportableColumnState): boolean {
    if (this.id !== state.id || this.property !== state.property) return false;
    this._direction = state.direction;
    this.widthPx = state.widthPx;
    return true;
  }

  public createViewFactories(container: IContainer): void {
    // invocation is expected once during pre-binding stage
    if (this._headerViewFactory !== null && this._contentViewFactory !== null) return;
    this._headerViewFactory = new ViewFactory(container, this.header);
    this._contentViewFactory = new ViewFactory(container, this.content);
  }
}

export const enum ChangeType {
  /** Content sorting is changed. */
  Sort = 1,
  /** Column is reordered. */
  Order = 2,
  /** Width of a column is changed. */
  Width = 3,
}

export const enum OrderChangeDropLocation {
  Before = 1,
  After = 2,
}

export interface OrderChangeData {
  fromIndex: number;
  toIndex: number;
  location: OrderChangeDropLocation;
}

export type GridStateChangeSubscriber = {
  handleGridStateChange(type: ChangeType.Width): void;
  handleGridStateChange(type: ChangeType.Order, value: OrderChangeData): void;
  handleGridStateChange(type: ChangeType.Sort, newValue: SortOption<Record<string, unknown>>, oldValue: SortOption<Record<string, unknown>> | null): void;
  handleGridStateChange(type: ChangeType, newValue?: SortOption<Record<string, unknown>> | OrderChangeData, oldValue?: SortOption<Record<string, unknown>> | null): void;
};