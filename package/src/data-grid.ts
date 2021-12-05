import {
  DI,
  IContainer,
  onResolve,
  Registration,
  resolveAll,
} from '@aurelia/kernel';
import {
  bindable,
  BindingContext,
  CustomElement,
  customElement,
  CustomElementDefinition,
  ICustomAttributeController,
  ICustomAttributeViewModel,
  ICustomElementController,
  ICustomElementViewModel,
  IDryCustomElementController,
  IHydratedController,
  IHydratedParentController,
  IHydrationContext,
  INode,
  IPlatform,
  IRenderLocation,
  ISyntheticView,
  IViewFactory,
  LifecycleFlags,
  Scope,
  templateController,
  ViewFactory,
} from '@aurelia/runtime-html';
import template from './data-grid.html';
import {
  ListModel,
} from './list-model.js';

// TODO: support adding bindables directly from processContent
const definitionLookup: Map<number, [headers: CustomElementDefinition[], cells: CustomElementDefinition[]]> = new Map<number, [CustomElementDefinition[], CustomElementDefinition[]]>();

@customElement({ name: 'data-grid', template })
export class DataGrid implements ICustomElementViewModel {
  private static id: number = 0;
  @bindable public model!: ListModel<unknown>;
  public readonly $controller?: ICustomElementController<this>; // This is set by the controller after this instance is constructed

  public constructor(
    @INode private readonly node: HTMLElement,
    @IContainer private readonly container: IContainer,
  ) { }

  public define(_controller: IDryCustomElementController, hydrationContext: IHydrationContext | null, _definition: CustomElementDefinition) {
    const instanceIdStr = this.node.dataset.instanceId;
    const instanceId = Number(instanceIdStr);
    if (!Number.isInteger(instanceId)) throw new Error(`Invalid data grid instanceId: ${instanceIdStr}; expected integer.`);

    const definitions = definitionLookup.get(Number(instanceId));
    if (definitions === undefined) throw new Error(`Cannot find definition for the instance #${instanceIdStr}`);

    const container = this.container;
    const headers = definitions[0];
    this.node.style.setProperty('--num-columns', headers.length.toString());
    container.register(Registration.instance(IHeaderViewFactories, headers.map((item) => new ViewFactory(container, item))));
    container.register(Registration.instance(IContentViewFactories, definitions[1].map((item) => new ViewFactory(container, item))));
  }

  public static processContent(content: HTMLElement, platform: IPlatform) {
    const columns = content.querySelectorAll('grid-column');
    const numColumns = columns.length;

    const headers: CustomElementDefinition[] = new Array(numColumns);
    const cells: CustomElementDefinition[] = new Array(numColumns);

    const doc = platform.document;
    for (let i = 0; i < numColumns; i++) {
      const col = columns[i];
      let container = doc.createElement('div');

      // extract header
      const header = col.querySelector('header');
      const headerContent = header?.childNodes;
      container.append(...(headerContent !== undefined
        ? Array.from(headerContent!)
        : [doc.createTextNode(`Column ${i + 1}`)]
      ));
      headers[i] = CustomElementDefinition.create({ name: CustomElement.generateName(), template: container });
      header?.remove();

      // extract content
      container = doc.createElement('div');
      container.append(...Array.from(col.childNodes));
      cells[i] = CustomElementDefinition.create({ name: CustomElement.generateName(), template: container });

      col.remove();
    }

    const id = ++this.id;
    definitionLookup.set(id, [headers, cells]);
    content.setAttribute('data-instance-id', id.toString());
    content.setAttribute('headers.bind', '');
    content.setAttribute('cells.bind', '');
  }
}

const IHeaderViewFactories = DI.createInterface<ViewFactory[]>('IHeaderViewFactories');
/**
 * @internal
 */
@templateController('grid-headers')
export class DataGridHeaders implements ICustomAttributeViewModel {
  public readonly $controller!: ICustomAttributeController<this>; // This is set by the controller after this instance is constructed
  private headers!: ISyntheticView[];
  private promise: Promise<void> | void = void 0;

  public constructor(
    @IRenderLocation private readonly location: IRenderLocation,
    @IHeaderViewFactories private readonly factories: ViewFactory[],
  ) { }

  public attaching(
    initiator: IHydratedController,
    parent: IHydratedParentController,
    flags: LifecycleFlags,
  ) {
    const location = this.location;
    const factories = this.factories;
    const len = factories.length;
    const headers = this.headers = new Array(len);
    const activationPromises = new Array(len);
    for (let i = 0; i < len; i++) {
      const header = headers[i] = factories[i].create(initiator).setLocation(location);
      activationPromises[i] = header.activate(initiator, parent, flags, Scope.create(BindingContext.create()));
    }
    this.queue(() => resolveAll(...activationPromises));
    return this.promise;
  }

  public detaching(initiator: IHydratedController, parent: IHydratedParentController, flags: LifecycleFlags): void | Promise<void> {
    this.queue(() => resolveAll(...this.headers.map((header)=> header.deactivate(initiator, parent, flags))));
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

const IContentViewFactories = DI.createInterface<ViewFactory[]>('IContentViewFactories');
/**
 * @internal
 */
@templateController('grid-content')
export class DataGridContent implements ICustomAttributeViewModel {
  @bindable({ primary: true }) public item: unknown;
  public readonly $controller!: ICustomAttributeController<this>; // This is set by the controller after this instance is constructed
  private cells!: ISyntheticView[];
  private promise: Promise<void> | void = void 0;

  public constructor(
    @IRenderLocation private readonly location: IRenderLocation,
    @IContentViewFactories private readonly factories: ViewFactory[],
  ) { }

  public attaching(
    initiator: IHydratedController,
    parent: IHydratedParentController,
    flags: LifecycleFlags,
  ) {
    const item = this.item;
    const location = this.location;
    const factories = this.factories;
    const len = factories.length;
    const cells = this.cells = new Array(len);
    const activationPromises = new Array(len);
    for (let i = 0; i < len; i++) {
      const cell = cells[i] = factories[i].create(initiator).setLocation(location);
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
