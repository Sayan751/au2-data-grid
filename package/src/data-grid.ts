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
  ListModel,
} from './list-model.js';

// TODO: support adding bindables directly from processContent
const definitionLookup: Map<number, [headers: CustomElementDefinition[], cells: CustomElementDefinition[]]> = new Map<number, [CustomElementDefinition[], CustomElementDefinition[]]>();

@customElement({ name: 'data-grid', template })
export class DataGrid implements ICustomElementViewModel {
  private static id: number = 0;
  @bindable public model!: ListModel;
  @bindable private headers!: CustomElementDefinition[];
  @bindable private cells!: CustomElementDefinition[];
  public readonly $controller?: ICustomElementController<this>;


  public constructor(@INode private node: HTMLElement) { }

  public define(_controller: IDryCustomElementController, hydrationContext: IHydrationContext | null, _definition: CustomElementDefinition) {
    // console.log('define', definition);
    const instanceIdStr = this.node.dataset.instanceId;
    const instanceId = Number(instanceIdStr);
    if (!Number.isInteger(instanceId)) throw new Error(`Invalid data grid instanceId: ${instanceIdStr}; expected integer.`);

    const definitions = definitionLookup.get(Number(instanceId));
    if (definitions === undefined) throw new Error(`Cannot find definition for the instance #${instanceIdStr}`);

    const oc = hydrationContext!.controller.scope.overrideContext;
    oc.headers = definitions[0];
    oc.cells = definitions[1];
  }

  public binding() {
    console.log('binding');
    console.log('headers', this.headers);
    console.log('cells', this.cells);
  }

  public static processContent(content: HTMLElement, platform: IPlatform) {
    const columns = content.querySelectorAll('grid-column');
    const numColumns = columns.length;

    const headers: CustomElementDefinition[] = new Array(numColumns);
    const cells: CustomElementDefinition[] = new Array(numColumns);

    const doc = platform.document;
    for (let i = 0; i < numColumns; i++) {
      const col = columns[i];
      let template = doc.createElement('template');

      // extract header
      const header = col.querySelector('header');
      const headerContent = header?.childNodes;
      template.content.append(...(headerContent !== undefined
        ? Array.from(headerContent!)
        : [doc.createTextNode(`Column ${i + 1}`)]
      ));
      headers[i] = CustomElementDefinition.create({ name: CustomElement.generateName(), template });
      header?.remove();

      // extract content
      template = doc.createElement('template');
      template.content.append(...Array.from(col.childNodes));
      cells[i] = CustomElementDefinition.create({ name: CustomElement.generateName(), template });

      col.remove();
    }

    const id = ++this.id;
    definitionLookup.set(id, [headers, cells]);
    content.setAttribute('data-instance-id', id.toString());
    content.setAttribute('headers.bind', '');
    content.setAttribute('cells.bind', '');
  }
}
