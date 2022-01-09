import {
  Constructable,
  IContainer,
  ILogger,
} from '@aurelia/kernel';
import {
  bindable,
  CustomElement,
  CustomElementDefinition,
  CustomElementType,
  ICustomElementController,
  ICustomElementViewModel,
  IDryCustomElementController,
  IHydrationContext,
  INode,
  IPlatform,
  ISignaler,
  BindingMode,
} from '@aurelia/runtime-html';
import {
  ContentModel,
  SelectionMode,
} from './content-model.js';
import template from './data-grid.html';
import {
  DefaultGridHeader,
  GridHeader,
} from './grid-header.js';
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
  SortDirection,
  SortOption,
} from './sorting-options.js';
import {
  GridContent,
  GridHeaders,
} from './template-controllers.js';

const ascPattern = /^asc$|^ascending$/i;
const descPattern = /^desc$|^descending$/i;
// TODO: support adding bindables directly from processContent
const stateLookup: Map<number, GridStateModel> = new Map<number, GridStateModel>();

export class DataGrid implements ICustomElementViewModel, GridStateChangeSubscriber {
  private static id: number = 0;

  /**
   * The content model (data).
   */
  @bindable
  public model!: ContentModel<Record<string, unknown>>;

  /**
   * Any bound state is read only once in the binding stage.
   * Any 'incoming' changes from the consumer side thereafter is disregarded.
   * Post-binding phase this property is treated as a write-only property to provide the consumer side with any changes in the exportable grid state.
   */
  @bindable
  public state?: ExportableGridState = void 0;

  /**
   * Callback when a item is
   * - clicked with the 'None' selection mode, or
   * - double-clicked with 'Single' or 'Multiple' selection mode.
   */
  @bindable
  public itemClicked?: (data: { item: unknown, index: number }) => void;

  /**
   * This is a one-time bindable array of string columnIds that needs to be hidden from the current instance of the grid.
   */
  @bindable({ mode: BindingMode.oneTime })
  public hiddenColumns: string[] = [];

  private stateModel!: IGridStateModel;
  public readonly $controller?: ICustomElementController<this>; // This is set by the controller after this instance is constructed
  private readonly containerEl!: HTMLElement;
  private readonly logger: ILogger;
  private lastClickedRow: number | null = null;
  private selectionUpdateSignal: string = '';

  public constructor(
    @INode private readonly node: HTMLElement,
    @IContainer private readonly container: IContainer,
    @ISignaler private readonly signaler: ISignaler,
    @ILogger logger: ILogger,
  ) {
    this.logger = logger.scopeTo('DataGrid');
  }

  public define(_controller: IDryCustomElementController, hydrationContext: IHydrationContext | null, _definition: CustomElementDefinition) {
    const instanceIdStr = this.node.dataset.instanceId;
    const instanceId = Number(instanceIdStr);
    if (!Number.isInteger(instanceId)) throw new Error(`Invalid data grid instanceId: ${instanceIdStr}; expected integer.`);
    this.selectionUpdateSignal = `update-selection-${instanceIdStr}`;

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
    stateModel.hideColumns(this.hiddenColumns);
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
      case ChangeType.Order:
        this.adjustColumnWidth();
        break;
    }
    try {
      this.state = this.stateModel.export();
    } catch (e) {
      this.logger.warn((e as Error).message);
    }
  }

  protected adjustColumnWidth() {
    const columns = this.stateModel.columns;
    const fallback = columns.some(c => c.widthPx != null) ? 'auto' : '1fr';
    this.containerEl.style.gridTemplateColumns = columns.map(c => `minmax(max-content, ${c.widthPx ?? fallback})`).join(' ');
  }

  protected handleDblClick(item: Record<string, unknown>, index: number) {
    getSelection()?.empty();
    this.itemClicked?.({ item, index });
    this.lastClickedRow = index;
  }

  protected handleClick(event: MouseEvent, item: Record<string, unknown>, index: number) {
    getSelection()?.empty();
    const model = this.model;
    switch (model.selectionMode) {
      case SelectionMode.None:
        this.itemClicked?.({ item, index });
        break;
      case SelectionMode.Single:
        model.selectItem(item);
        break;
      case SelectionMode.Multiple:
        if (event.shiftKey) {
          const lastClickedRow = this.lastClickedRow;
          if (lastClickedRow !== null) {
            model.selectRange(lastClickedRow, index);
          } else {
            model.selectItem(item);
          }
        } else if (event.ctrlKey) {
          model.toggleSelection(item);
        } else {
          model.clearSelections();
          model.selectItem(item);
        }
        break;
    }
    this.lastClickedRow = index;
    this.signaler.dispatchSignal(this.selectionUpdateSignal);
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
      width = width === null || Number.isNaN(width) ? null : `${width}px`;

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

export const DefaultDataGrid = defineDataGridCustomElement(DefaultGridHeader);
export function defineDataGridCustomElement<
  THeader extends Constructable<GridHeader>,
  >(
    header: CustomElementType<THeader>,
) {
  return CustomElement.define(
    {
      name: 'data-grid',
      template,
      dependencies: [
        // TCs
        GridHeaders,
        GridContent,
        //CEs
        header,
      ]
    },
    DataGrid,
  );
}