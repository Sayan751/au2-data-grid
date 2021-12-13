import {
  onResolve,
  resolveAll
} from '@aurelia/kernel';
import {
  bindable,
  BindingContext, ICustomAttributeController,
  ICustomAttributeViewModel, IHydratedController,
  IHydratedParentController, IRenderLocation,
  ISyntheticView,
  LifecycleFlags,
  Scope,
  templateController
} from '@aurelia/runtime-html';
import {
  GridStateModel,
} from './grid-state.js';

/**
 * Template controller to render the headers.
 * @internal
 */
@templateController('grid-headers')
export class GridHeaders implements ICustomAttributeViewModel {
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
    // const factories = this.factories;
    const columns = this.state.columns;
    const len = columns.length;
    const headers = this.headers = new Array(len);
    const activationPromises = new Array(len);
    for (let i = 0; i < len; i++) {
      const header = headers[i] = columns[i].headerViewFactory!.create(initiator).setLocation(location);
      activationPromises[i] = header.activate(initiator, parent, flags, Scope.create(BindingContext.create()));
    }
    this.queue(() => resolveAll(...activationPromises));
    return this.promise;
  }

  public detaching(initiator: IHydratedController, parent: IHydratedParentController, flags: LifecycleFlags): void | Promise<void> {
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
