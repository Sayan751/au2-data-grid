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
  GridStateModel,
} from './grid-state.js';

/**
 * Template controller to render the content cells.
 * @internal
 */
@templateController('grid-content')
export class GridContent implements ICustomAttributeViewModel {

  @bindable
  public item: unknown;

  @bindable
  public state!: GridStateModel;

  public readonly $controller!: ICustomAttributeController<this>; // This is set by the controller after this instance is constructed
  private cells!: ISyntheticView[];
  private promise: Promise<void> | void = void 0;

  public constructor(
    @IRenderLocation private readonly location: IRenderLocation,
  ) { }

  public attaching(
    initiator: IHydratedController,
    parent: IHydratedParentController,
    flags: LifecycleFlags
  ) {
    const item = this.item;
    const location = this.location;
    const columns = this.state.columns;
    const len = columns.length;
    const cells = this.cells = new Array(len);
    const activationPromises = new Array(len);
    for (let i = 0; i < len; i++) {
      const cell = cells[i] = columns[i].contentViewFactory!.create(initiator).setLocation(location);
      activationPromises[i] = cell.activate(initiator, parent, flags, Scope.create(BindingContext.create({ item })));
    }
    this.queue(() => resolveAll(...activationPromises));
    return this.promise;
  }

  public detaching(initiator: IHydratedController, parent: IHydratedParentController, flags: LifecycleFlags): void | Promise<void> {
    this.queue(() => resolveAll(...this.cells.map((cell) => cell.deactivate(initiator, parent, flags))));
    return this.promise;
  }

  public dispose(): void {
    let cells = this.cells;
    let len = cells.length;
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
}
