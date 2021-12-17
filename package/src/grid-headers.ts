import {
  onResolve,
  resolveAll,
} from '@aurelia/kernel';
import {
  bindable,
  BindingContext,
  ICustomAttributeController,
  ICustomAttributeViewModel,
  IHydratedController,
  IHydratedParentController,
  IRenderLocation,
  ISyntheticView,
  LifecycleFlags,
  Scope,
  templateController,
} from '@aurelia/runtime-html';
import {
  ChangeType,
  GridStateChangeSubscriber,
  GridStateModel,
  OrderChangeData,
  OrderChangeDropLocation,
} from './grid-state.js';
import { SortOption } from './sorting-options.js';

/**
 * Template controller to render the headers.
 * @internal
 */
@templateController('grid-headers')
export class GridHeaders implements ICustomAttributeViewModel, GridStateChangeSubscriber {
  public readonly $controller!: ICustomAttributeController<this>; // This is set by the controller after this instance is constructed

  @bindable
  public state!: GridStateModel;

  private headers!: ISyntheticView[];
  private promise: Promise<void> | void = void 0;

  public constructor(
    @IRenderLocation private readonly location: IRenderLocation,
  ) { }

  public attaching(
    initiator: IHydratedController,
    parent: IHydratedParentController,
    flags: LifecycleFlags
  ) {
    const location = this.location;
    const state = this.state;
    const columns = state.columns;
    const len = columns.length;
    const headers = this.headers = Array.from(
      { length: len },
      (_, i) => columns[i].headerViewFactory!.create(initiator).setLocation(location)
    );
    const activationPromises = new Array(len);
    for (let i = 0; i < len; i++) {
      const header = headers[i]
      header.nodes.link(headers[i + 1]?.nodes ?? location)
      activationPromises[i] = header.activate(initiator, parent, flags, Scope.create(BindingContext.create({ state: columns[i] })));
    }
    this.queue(() => resolveAll(...activationPromises));
    state.addSubscriber(this);
    return this.promise;
  }

  public detaching(initiator: IHydratedController, parent: IHydratedParentController, flags: LifecycleFlags): void | Promise<void> {
    this.state.removeSubscriber(this);
    this.queue(() => resolveAll(...this.headers.map((header) => header.deactivate(initiator, parent, flags))));
    return this.promise;
  }

  public dispose(): void {
    let headers = this.headers;
    let len = headers.length;
    for (let i = 0; i < len; i++) {
      headers[i].dispose();
    }
    this.headers.length = 0;
  }

  public handleGridStateChange(type: ChangeType.Order, value: OrderChangeData, oldValue: null): void;
  public handleGridStateChange(type: ChangeType.Sort, newValue: SortOption<Record<string, unknown>>, oldValue: SortOption<Record<string, unknown>> | null): void;
  public handleGridStateChange(type: ChangeType, value: SortOption<Record<string, unknown>> | OrderChangeData, _oldValue: SortOption<Record<string, unknown>> | null): void {
    if (type !== ChangeType.Order) return;
    const fromIdx = (value as OrderChangeData).fromIndex;
    const toIdx = (value as OrderChangeData).toIndex;
    const headers = this.headers;
    const fromNodes = headers[fromIdx].nodes;
    const toNodes = headers[toIdx].nodes;

    const location = this.location;
    // link the next node with the previous node
    headers[fromIdx - 1]?.nodes.link(headers[fromIdx + 1]?.nodes ?? location);
    switch ((value as OrderChangeData).location) {
      case OrderChangeDropLocation.Before:
        headers[toIdx - 1]?.nodes.link(fromNodes);
        fromNodes.link(toNodes);
        break;
      case OrderChangeDropLocation.After:
        fromNodes.link(headers[toIdx + 1]?.nodes ?? location);
        toNodes.link(fromNodes);
        break;
    }
    fromNodes.addToLinked();

    headers.splice(
      toIdx,
      0,
      headers.splice(fromIdx, 1)[0]
    );
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
