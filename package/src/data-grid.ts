import {
  IContainer
} from '@aurelia/kernel';
import {
  bindable,
  BindingMode,
  CustomElement,
  customElement,
  CustomElementDefinition,
  ICustomElementController,
  ICustomElementViewModel,
  IDryCustomElementController,
  IHydrationContext,
  INode,
  IPlatform
} from '@aurelia/runtime-html';
import template from './data-grid.html';
import {
  GridContent,
} from './grid-content.js';
import {
  GridHeader,
} from './grid-header.js';
import {
  GridHeaders,
} from './grid-headers.js';
import {
  Column,
  ExportableGridState,
  GridStateModel,
  IGridStateModel,
} from './grid-state.js';
import {
  GridModel,
} from './list-model.js';
import {
  SortDirection,
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
export class DataGrid implements ICustomElementViewModel {
  private static id: number = 0;

  @bindable
  public model!: GridModel<Record<string, unknown>>;

  @bindable({ mode: BindingMode.oneTime })
  public state?: ExportableGridState = void 0;

  private stateModel!: IGridStateModel;
  public readonly $controller?: ICustomElementController<this>; // This is set by the controller after this instance is constructed

  public constructor(
    @INode private readonly node: HTMLElement,
    @IContainer private readonly container: IContainer,
  ) { }

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
    const state = this.state;
    if (state == null) return;
    this.stateModel.applyState(state);
  }

  public exportState(): ExportableGridState {
    return this.stateModel.export();
  }

  // TODO: supply a logger to the processContent
  public static processContent(content: HTMLElement, platform: IPlatform) {
    const columns = content.querySelectorAll('grid-column');
    const numColumns = columns.length;

    const state = new GridStateModel([]);
    const doc = platform.document;
    for (let i = 0; i < numColumns; i++) {
      const col = columns[i];
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

      let container = doc.createElement('div');

      // extract header
      const header = col.querySelector('header');
      const headerContent = header?.childNodes;
      container.append(...(headerContent !== undefined
        ? Array.from(headerContent!)
        : [doc.createTextNode(`Column ${i + 1}`)]
      ));
      const headerDfn = CustomElementDefinition.create({ name: CustomElement.generateName(), template: container });
      header?.remove();

      // extract content
      container = doc.createElement('div');
      container.append(...Array.from(col.childNodes));
      const contentDfn = CustomElementDefinition.create({ name: CustomElement.generateName(), template: container });

      void new Column(
        state,
        id ?? property,
        property,
        exportable,
        direction,
        null, // TODO,
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
