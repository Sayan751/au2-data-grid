import {
  onResolve,
  onResolveAll,
  resolve,
} from '@aurelia/kernel';
import {
  bindable,
  ICustomAttributeController,
  ICustomAttributeViewModel,
  IHydratedController,
  IHydratedParentController,
  IRenderLocation,
  ISyntheticView,
  templateController,
  BindingContext,
  Scope,
} from '@aurelia/runtime-html';
import {
  ChangeType,
  GridStateChangeSubscriber,
  GridStateModel,
  OrderChangeData,
  OrderChangeDropLocation,
} from './grid-state.js';
import {
  SortOption,
} from './sorting-options.js';

/**
 * Template controller to render the headers.
 * @internal
 */
@templateController('grid-headers')
export class GridHeaders implements ICustomAttributeViewModel, GridStateChangeSubscriber {
  private readonly location: IRenderLocation = resolve(IRenderLocation);
  public readonly $controller!: ICustomAttributeController<this>; // This is set by the controller after this instance is constructed

  @bindable
  public state!: GridStateModel;

  private headers!: ISyntheticView[];
  private promise: Promise<void> | void = void 0;

  /**
   * Key: original column-index; Value: view-index
   */
  private _indexMap: Map<number, number> = new Map<number, number>();

  public get indexMap(): Map<number, number> { return this._indexMap; }

  public attaching(
    initiator: IHydratedController,
    parent: IHydratedParentController,
  ): void | Promise<void> {
    const indexMap = this._indexMap;
    indexMap.clear();
    const location = this.location;
    const state = this.state;
    const columns = state.columns;
    let len = 0;
    const headers = this.headers = columns.reduce((acc, column, i) => {
      if (column.hidden) return acc;
      acc.push(column.headerViewFactory!.create(initiator).setLocation(location));
      indexMap.set(i, len++);
      return acc;
    }, [] as ISyntheticView[]);
    const activationPromises = new Array<void | Promise<void>>(len);
    for (let i = 0; i < len; i++) {
      const header = headers[i];
      header.nodes.link(headers[i + 1]?.nodes ?? location);
      activationPromises[i] = header.activate(initiator, parent, Scope.create(new BindingContext('state', columns[i])));
    }
    this.queue(() => onResolveAll(...activationPromises));
    state.addSubscriber(this);
    return this.promise;
  }

  public detaching(initiator: IHydratedController, parent: IHydratedParentController): void | Promise<void> {
    this.state.removeSubscriber(this);
    this.queue(() => onResolveAll(...this.headers.map((header) => header.deactivate(initiator, parent))));
    return this.promise;
  }

  public dispose(): void {
    const headers = this.headers;
    const len = headers.length;
    for (let i = 0; i < len; i++) {
      headers[i].dispose();
    }
    this.headers.length = 0;
  }

  public handleGridStateChange(type: ChangeType.Width): void;
  public handleGridStateChange(type: ChangeType.Order, value: OrderChangeData): void;
  public handleGridStateChange(type: ChangeType.Sort, newValue: SortOption<Record<string, unknown>>, oldValue: SortOption<Record<string, unknown>> | null): void;
  public handleGridStateChange(type: ChangeType, value?: SortOption<Record<string, unknown>> | OrderChangeData, _oldValue?: SortOption<Record<string, unknown>> | null): void {
    if (type !== ChangeType.Order) return;
    handleReordering(this.headers, value as OrderChangeData, this.location, this._indexMap);
  }

  private queue(action: () => void | Promise<void>): void {
    const previousPromise = this.promise;
    let promise: void | Promise<void> = void 0;
    promise = this.promise = onResolve(
      onResolve(previousPromise, action),
      () => {
        if (this.promise === promise) {
          this.promise = void 0;
        }
      }
    );
  }
}

/**
 * Template controller to render the content cells.
 * @internal
 */
@templateController('grid-content')
export class GridContent implements ICustomAttributeViewModel {
  private readonly location: IRenderLocation = resolve(IRenderLocation);

  @bindable
  public item: unknown;

  @bindable
  public state!: GridStateModel;

  public readonly $controller!: ICustomAttributeController<this>; // This is set by the controller after this instance is constructed
  private cells!: ISyntheticView[];
  private promise: Promise<void> | void = void 0;

  /**
   * Key: original column-index; Value: view-index
   */
  private _indexMap: Map<number, number> = new Map<number, number>();

  public attaching(
    initiator: IHydratedController,
    parent: IHydratedParentController,
  ): void | Promise<void> {
    const headersTc: GridHeaders = this.$controller
      .parent   // synthetic
      ?.parent  // repeater
      ?.parent  // grid
      ?.children
      ?.find(c => c.viewModel instanceof GridHeaders)
      ?.viewModel as GridHeaders;
    if (headersTc == null) throw new Error('The grid-headers is not found.');
    const indexMap = this._indexMap = headersTc.indexMap;

    const item = this.item;
    const location = this.location;
    const state = this.state;
    const columns = state.columns;
    const len = indexMap.size;
    const cells = this.cells = new Array<ISyntheticView>(len);
    const activationPromises = new Array<void | Promise<void>>(len);
    let i = 0;
    for (const [key,] of indexMap) {
      const cell = cells[i++] = columns[key].contentViewFactory!.create(initiator).setLocation(location);
      activationPromises[i] = cell.activate(initiator, parent, Scope.create(new BindingContext('item', item)));
    }
    this.queue(() => onResolveAll(...activationPromises));
    state.addSubscriber(this);
    return this.promise;
  }

  public detaching(initiator: IHydratedController, parent: IHydratedParentController): void | Promise<void> {
    this.state.removeSubscriber(this);
    this.queue(() => onResolveAll(...this.cells.map((cell) => cell.deactivate(initiator, parent))));
    return this.promise;
  }

  public dispose(): void {
    const cells = this.cells;
    const len = cells.length;
    for (let i = 0; i < len; i++) {
      cells[i].dispose();
    }
    this.cells.length = 0;
  }

  private queue(action: () => void | Promise<void>): void {
    const previousPromise = this.promise;
    let promise: void | Promise<void> = void 0;
    promise = this.promise = onResolve(
      onResolve(previousPromise, action),
      () => {
        if (this.promise === promise) {
          this.promise = void 0;
        }
      }
    );
  }

  public handleGridStateChange(type: ChangeType.Width): void;
  public handleGridStateChange(type: ChangeType.Order, value: OrderChangeData): void;
  public handleGridStateChange(type: ChangeType.Sort, newValue: SortOption<Record<string, unknown>>, oldValue: SortOption<Record<string, unknown>> | null): void;
  public handleGridStateChange(type: ChangeType, value?: SortOption<Record<string, unknown>> | OrderChangeData, _oldValue?: SortOption<Record<string, unknown>> | null): void {
    if (type !== ChangeType.Order) return;
    handleReordering(this.cells, value as OrderChangeData, this.location, this._indexMap);
  }
}

function handleReordering(
  views: ISyntheticView[],
  changeData: OrderChangeData,
  location: IRenderLocation,
  indexMap: Map<number, number>,
): void {
  const fromIdx = changeData.fromIndex;
  let toIdx = changeData.toIndex;
  const dropLocation = changeData.location;
  const fromNodes = views[indexMap.get(fromIdx)!].nodes;
  const toNodes = views[indexMap.get(toIdx)!].nodes;

  // link the next node with the previous node
  views[fromIdx - 1]?.nodes.link(views[fromIdx + 1]?.nodes ?? location);
  switch (dropLocation) {
    case OrderChangeDropLocation.Before:
      views[toIdx - 1]?.nodes.link(fromNodes);
      fromNodes.link(toNodes);
      if (fromIdx < toIdx) {
        toIdx--;
      }
      break;
    case OrderChangeDropLocation.After:
      fromNodes.link(views[toIdx + 1]?.nodes ?? location);
      toNodes.link(fromNodes);
      if (fromIdx > toIdx) {
        toIdx++;
      }
      break;
  }
  fromNodes.addToLinked();

  views.splice(
    toIdx,
    0,
    views.splice(fromIdx, 1)[0]
  );
}
