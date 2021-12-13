import {
  DI, IContainer,
} from '@aurelia/kernel';
import {
  CustomElementDefinition, ViewFactory,
} from '@aurelia/runtime-html';
import {
  SortDirection,
  SortOption,
} from './sorting-options.js';

type GridStateChangeSubscriber = {
  handleGridStateChange(type: ChangeType.Sort, newValue: SortOption<Record<string, unknown>> | null, oldValue: SortOption<Record<string, unknown>> | null): void;
  handleGridStateChange(type: ChangeType, newValue: SortOption<Record<string, unknown>> | null, oldValue: SortOption<Record<string, unknown>> | null): void;
}
export interface ExportableGridState {
  columns: ExportableColumnState[];
}
export interface IGridState {
  export(): ExportableGridState;
}
export interface IGridStateModel extends GridStateModel { }
export const IGridStateModel = DI.createInterface<IGridStateModel>('IGridStateModel');
export class GridStateModel implements IGridState {
  // TODO: support multiple sort options later;.
  private activeSortOptions: SortOption<Record<string, unknown>> | null = null!;
  // TODO: remove the elaborate subscriber infra later if not needed.
  /**
   * First change subscriber slot.
   * @internal
   */
  private subscriber1: GridStateChangeSubscriber | null = null;
  /**
   * Second change subscriber slot.
   * @internal
   */
  private subscriber2: GridStateChangeSubscriber | null = null;
  /**
   * Rest of the subscribers.
   * @internal
   */
  private subscribers: GridStateChangeSubscriber[] = [];

  /** @internal */
  private stateApplied: boolean = false;

  public constructor(
    public readonly columns: Column[],
  ) {
    if (columns.length === 0) return;
    this.initializeActiveSortOptions();
  }

  public export(): ExportableGridState {
    return {
      columns: this.columns.map((c) => c.export())
    }
  }

  /** @internal */
  public applyState(state: ExportableGridState): void {
    // invocation is expected once during binding phase
    if (this.stateApplied) throw new Error('State has already been applied.');

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
    this.stateApplied = true;
  }

  public createViewFactories(container: IContainer) {
    const columns = this.columns;
    const len = columns.length;
    for (let i = 0; i < len; i++) {
      columns[i].createViewFactories(container);
    }
  }

  private initializeActiveSortOptions(): void {
    const column = this.columns.find(c => c.direction !== null);
    if (column == null) return;
    this.activeSortOptions = {
      property: column.property!,
      direction: column.direction!,
    };
  }

  public addSubscriber(subscriber: GridStateChangeSubscriber) {
    if (this.subscriber1 === null) {
      this.subscriber1 = subscriber;
      return;
    }
    if (this.subscriber2 === null) {
      this.subscriber2 = subscriber;
      return;
    }
    this.subscribers.push(subscriber);
  }

  public removeSubscriber(subscriber: GridStateChangeSubscriber) {
    if (this.subscriber1 === null) {
      this.subscriber1 = null;
      return;
    }

    if (this.subscriber2 === null) {
      this.subscriber2 = null;
      return;
    }

    const subscribers = this.subscribers;
    const idx = subscribers.findIndex(s => s === subscriber);
    if (idx === -1) return;
    subscribers.splice(idx, 1);
  }

  private notifySubscribers(
    type: ChangeType.Sort,
    newValue: SortOption<Record<string, unknown>> | null,
    oldValue: SortOption<Record<string, unknown>> | null,
  ): void;
  private notifySubscribers(
    type: ChangeType,
    newValue: SortOption<Record<string, unknown>> | null,
    oldValue: SortOption<Record<string, unknown>> | null,
  ): void {
    let subscriber = this.subscriber1;
    if (subscriber !== null) {
      subscriber.handleGridStateChange(type, newValue, oldValue);
      return;
    }
    subscriber = this.subscriber2;
    if (subscriber !== null) {
      subscriber.handleGridStateChange(type, newValue, oldValue);
      return;
    }
    const subscribers = this.subscribers;
    const len = subscribers.length;
    for (let i = 0; i < len; i++) {
      subscriber = subscribers[i];
      subscriber.handleGridStateChange(type, newValue, oldValue);
    }
  }

  /** @internal */
  public handleChange(type: ChangeType.Width, column: Column): void;
  public handleChange(type: ChangeType.Sort, column: Column): void;
  public handleChange(type: ChangeType, column: Column): void {
    switch (type) {
      case ChangeType.Sort: {
        const oldSortOptions = this.activeSortOptions;
        const oldProperty = oldSortOptions?.property;
        const newProperty = column.property!;
        if (oldProperty !== newProperty) {
          // this is needed so that change to the old sort column can be propagated to the view.
          this.columns
            .find(c => c.property === oldProperty)
            ?.setDirection(null, false);
        }
        const newSortOptions = this.activeSortOptions = { property: newProperty, direction: column.direction! };
        this.notifySubscribers(type, newSortOptions, oldSortOptions);
        return;
      }
      case ChangeType.Width:
        // TODO
        return;
      default:
        throw new Error(`Unsupported change type: ${type}.`);
    }
  }
}

export interface ExportableColumnState {
  readonly id: string;
  readonly property: string | null;
  widthPx: number | null;
  direction: SortDirection | null;
}
export interface ColumnState extends ExportableColumnState {
  setDirection(direction: SortDirection | null, notifyParent: boolean): void;
  export(): ExportableColumnState;
}
export class Column implements ColumnState {

  private static id = 0;
  public static generateId() { return `unnamed-column-${++this.id}`; }

  /** @internal */
  private stateApplied: boolean = false;
  /** @internal */
  private readonly _sortable: boolean = false;
  /** @internal */
  private _direction: SortDirection | null = null;
  /** @internal */
  private _headerViewFactory: ViewFactory | null = null;
  /** @internal */
  private _contentViewFactory: ViewFactory | null = null;

  public constructor(
    public readonly parent: GridStateModel,
    public readonly id: string,
    public readonly property: string | null,
    private readonly exportable: boolean,
    direction: SortDirection | null,
    public widthPx: number | null,
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

  public get direction() { return this._direction; }
  public get sortable() { return this._sortable; }
  public get headerViewFactory() { return this._headerViewFactory; }
  public get contentViewFactory() { return this._contentViewFactory; }

  /** @internal */
  public setDirection(direction: SortDirection | null, notifyParent: boolean) {
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
      widthPx: this.widthPx,
    }
  }

  /** @internal */
  public tryApplyState(state: ExportableColumnState): boolean {
    // invocation is expected once during binding stage
    if (this.stateApplied) throw new Error('State has already been applied.');
    if (this.id !== state.id || this.property !== state.property) return false;
    this._direction = state.direction;
    this.widthPx = state.widthPx;
    this.stateApplied = true;
    return true;
  }

  public createViewFactories(container: IContainer) {
    // invocation is expected once during pre-binding stage
    if (this._headerViewFactory !== null && this._contentViewFactory !== null) throw new Error('Invalid operation; the view factories are already created.');
    this._headerViewFactory = new ViewFactory(container, this.header);
    this._contentViewFactory = new ViewFactory(container, this.content);
  }
}

export enum ChangeType {
  Sort,
  Width,
  Order,
}
