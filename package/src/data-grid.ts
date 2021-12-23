import {
  IContainer,
  ILogger,
} from '@aurelia/kernel';
import {
  bindable,
  CustomElement,
  customElement,
  CustomElementDefinition,
  ICustomElementController,
  ICustomElementViewModel,
  IDryCustomElementController,
  IHydrationContext,
  INode,
  IPlatform,
} from '@aurelia/runtime-html';
import template from './data-grid.html';
import {
  GridHeader,
} from './grid-header.js';
import {
  GridHeaders,
  GridContent,
} from './template-controllers.js';
import {
  ChangeType,
  Column,
  ExportableGridState,
  GridStateChangeSubscriber,
  GridStateModel,
  IGridStateModel,
  OrderChangeData,
} from './grid-state.js';
import {
  ContentModel,
} from './content-model.js';
import {
  SortDirection,
  SortOption,
} from './sorting-options.js';

const ascPattern = /^asc$|^ascending$/i;
const descPattern = /^desc$|^descending$/i;
// TODO: support adding bindables directly from processContent
const stateLookup: Map<number, GridStateModel> = new Map<number, GridStateModel>();

@customElement({
  name: 'data-grid',
  template,
  dependencies: [
    // TCs
    GridHeaders,
    GridContent,
    //CEs
    GridHeader,
  ]
})
export class DataGrid implements ICustomElementViewModel, GridStateChangeSubscriber {
  private static id: number = 0;

  @bindable
  public model!: ContentModel<Record<string, unknown>>;

  /**
   * Any bound state is read only once in the binding stage.
   * Any 'incoming' changes from the consumer side thereafter is disregarded.
   * Post-binding phase this property is treated as a write-only property to provide the consumer side with any changes in the exportable grid state.
   */
  @bindable
  public state?: ExportableGridState = void 0;

  private stateModel!: IGridStateModel;
  public readonly $controller?: ICustomElementController<this>; // This is set by the controller after this instance is constructed
  private readonly containerEl!: HTMLElement;
  private readonly logger: ILogger;

  public constructor(
    @INode private readonly node: HTMLElement,
    @IContainer private readonly container: IContainer,
    @ILogger logger: ILogger,
  ) {
    this.logger = logger.scopeTo('DataGrid');
  }

  public define(_controller: IDryCustomElementController, hydrationContext: IHydrationContext | null, _definition: CustomElementDefinition) {
    const instanceIdStr = this.node.dataset.instanceId;
    const instanceId = Number(instanceIdStr);
    if (!Number.isInteger(instanceId)) throw new Error(`Invalid data grid instanceId: ${instanceIdStr}; expected integer.`);

    const state = stateLookup.get(Number(instanceId));
    if (state === undefined) throw new Error(`Cannot find the model for the instance #${instanceIdStr}`);

    this.stateModel = state;
    state.createViewFactories(this.container);
    this.node.style.setProperty('--num-columns', state.columns.length.toString());
  }

  public binding() {
    const stateModel = this.stateModel;
    const state = this.state;
    if (state != null) {
      stateModel.applyState(state);
    }
    const sortingOptions = stateModel.initializeActiveSortOptions();
    if (sortingOptions !== null) {
      this.model.applySorting(sortingOptions);
    }
    stateModel.addSubscriber(this);
  }

  public attaching() {
    this.adjustColumnWidth();
  }

  public unbinding() {
    this.stateModel.removeSubscriber(this);
  }

  public exportState(): ExportableGridState {
    return this.stateModel.export();
  }


  public handleGridStateChange(type: ChangeType.Width): void;
  public handleGridStateChange(type: ChangeType.Order, value: OrderChangeData): void;
  public handleGridStateChange(type: ChangeType.Sort, newValue: SortOption<Record<string, unknown>>, oldValue: SortOption<Record<string, unknown>> | null): void;
  public handleGridStateChange(type: ChangeType, newValue?: SortOption<Record<string, unknown>> | OrderChangeData, _oldValue?: SortOption<Record<string, unknown>> | null): void {
    switch (type) {
      case ChangeType.Sort:
        this.model.applySorting(newValue as SortOption<Record<string, unknown>>);
        break;
      case ChangeType.Width:
        this.adjustColumnWidth();
        break;
    }
    try {
      this.state = this.stateModel.export();
    } catch (e) {
      this.logger.warn((e as Error).message);
    }
  }

  private adjustColumnWidth() {
    this.containerEl.style.gridTemplateColumns = this.stateModel.columns.map(c => `minmax(min-content, ${c.widthPx ?? 'auto'})`).join(' ');
  }

  // TODO: supply a logger to the processContent
  public static processContent(content: HTMLElement, platform: IPlatform) {
    const columns = content.querySelectorAll('grid-column');
    const numColumns = columns.length;

    const state = new GridStateModel([]);
    const doc = platform.document;
    for (let i = 0; i < numColumns; i++) {
      const col = columns[i];

      // extract metadata
      let exportable = true;
      const property = col.getAttribute('property');
      const id = col.getAttribute('id') ?? property ?? (exportable = false, Column.generateId());
      const directionRaw = col.getAttribute('sort-direction');
      let direction: SortDirection | null = null;
      if (directionRaw !== null) {
        if (ascPattern.test(directionRaw)) {
          direction = SortDirection.Ascending;
        } else if (descPattern.test(directionRaw)) {
          direction = SortDirection.Descending;
        }
      }
      const isResizable = !col.hasAttribute('non-resizable');
      let width: string | null = col.getAttribute('width');
      width = width === null || Number.isNaN(width) ? 'auto' : `${width}px`;

      // extract header
      let container = doc.createElement('grid-header');
      container.setAttribute('state.bind', '');
      const header = col.querySelector('header');
      const headerContent = header?.childNodes;
      const projection = doc.createElement('template');
      projection.setAttribute('au-slot', 'default');
      projection.content.append(...(headerContent !== undefined
        ? Array.from(headerContent!)
        : [doc.createTextNode(`Column ${i + 1}`)]
      ));
      container.append(projection);
      const headerDfn = CustomElementDefinition.create({ name: CustomElement.generateName(), template: container });
      header?.remove();

      // extract content
      container = doc.createElement('div');
      container.setAttribute('role', 'cell');
      container.append(...Array.from(col.childNodes));
      const contentDfn = CustomElementDefinition.create({ name: CustomElement.generateName(), template: container });

      void new Column(
        state,
        id ?? property,
        property,
        exportable,
        direction,
        isResizable,
        width,
        headerDfn,
        contentDfn,
      );

      col.remove();
    }

    const id = ++this.id;
    stateLookup.set(id, state);
    content.setAttribute('data-instance-id', id.toString());
  }
}
