import {
  Constructable,
  ILogger,
  Registration,
} from '@aurelia/kernel';
import {
  TaskQueue,
} from '@aurelia/platform';
import {
  BrowserPlatform,
} from '@aurelia/platform-browser';
import {
  Aurelia,
  bindable,
  CustomElement,
  customElement,
  CustomElementType,
  ICustomElementViewModel,
  IPlatform,
  StandardConfiguration,
} from '@aurelia/runtime-html';
import {
  TestContext,
} from '@aurelia/testing';
import {
  assert,
} from 'chai';
import {
  DataGridConfiguration,
} from '../src/configuration';
import {
  ContentModel, ItemSelectionMode,
} from '../src/content-model';
import {
  DataGrid,
} from '../src/data-grid';
import {
  ChangeType,
  GridStateChangeSubscriber,
  OrderChangeDropLocation,
  ExportableGridState,
} from '../src/grid-state';
import {
  SortDirection,
  SortOption,
} from '../src/sorting-options';
import {
  getContentRows,
  getContentTextContent,
  getHeaders,
  getHeaderTextContent,
  getText,
} from '../src/test-helpers';
import {
  $It,
  createSpecFunction,
  Person,
  TestFunction,
  TestSetupContext as $TestSetupContext,
  WrapperFunction,
  $TestContext,
} from './shared';

describe('data-grid', function () {
  interface TestSetupContext<TApp extends ICustomElementViewModel> extends $TestSetupContext<TApp> {
    registrations: any[];
  }
  async function runTest<TApp extends ICustomElementViewModel>(
    testFunction: TestFunction<TApp>,
    {
      component,
      registrations = [],
    }: Partial<TestSetupContext<TApp>> = {}
  ): Promise<void> {
    const platform = new BrowserPlatform(window);
    const ctx = TestContext.create();
    const container = ctx.container;
    container.register(
      Registration.instance(IPlatform, platform),
      StandardConfiguration,
      DataGridConfiguration,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      ...registrations,
    );
    const doc = ctx.doc;
    const host = doc.createElement('div');
    doc.body.appendChild(host);
    const au = new Aurelia(container);
    await au
      .app({ component, host })
      .start();
    await platform.taskQueue.yield();

    await testFunction({
      ctx,
      container,
      host,
      app: au.root.controller.viewModel as TApp,
      platform,
    });

    await au.stop();
    ctx.doc.body.removeChild(host);
    au.dispose();
  }

  @customElement({ name: 'normal-text', template: '<span>${value}</span>' })
  class NormalText {
    @bindable public value: unknown;
  }

  @customElement({ name: 'value-text', template: '<strong>${value}</strong>' })
  class ValueText {
    @bindable public value: unknown;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const $it = createSpecFunction(runTest as WrapperFunction<any, $TestContext<any>, TestSetupContext<any>>);
  type $$It<TApp extends ICustomElementViewModel> = $It<TApp, $TestContext<TApp>, TestSetupContext<TApp>>;

  {
    @customElement({
      name: 'my-app',
      template: `<data-grid model.bind="content">
        <grid-column>
          <header><strong>First name</strong></header>
          <span>\${item.firstName}</span>
        </grid-column>
        <grid-column>
          <header><strong>Last name</strong></header>
          <span>\${item.lastName}</span>
        </grid-column>
      </data-grid>`
    })
    class App implements ICustomElementViewModel {
      public readonly people: Person[];
      public readonly content: ContentModel<Person>;

      public constructor(
        @ILogger logger: ILogger,
      ) {
        logger = logger.scopeTo('App');
        this.content = new ContentModel(
          this.people = [
            new Person('Byomkesh', 'Bakshi'),
            new Person('Pradosh C.', 'Mitra'),
          ],
          null,
          null,
          null,
          logger,
        );
      }
    }

    ($it as $It<App>)('renders the content as per given template - native HTML element',
      function ({ app, host }) {
        const grid = host.querySelector<HTMLElement>('data-grid')!;
        assert.isNotNull(grid);

        const gridVm = CustomElement.for(grid).viewModel as DataGrid;
        assert.instanceOf(gridVm, DataGrid);

        const headers = getHeaders(grid);
        assert.strictEqual(headers.length, 2);
        assert.deepStrictEqual(
          headers.map(header => header.querySelector('div>span>strong')!.textContent!),
          ['First name', 'Last name']
        );

        const content = getContentRows(grid);
        assert.strictEqual(content.length, 2);
        assert.deepStrictEqual(
          content.map(c => Array.from(c.querySelectorAll('span')).map(el => el.textContent!)),
          app.people.map(p => [p.firstName, p.lastName])
        );
        gridVm.exportState();
        assert.isUndefined(gridVm.state);
      },
      { component: App as CustomElementType<Constructable<App>> });
  }

  {
    @customElement({
      name: 'my-app',
      template: `<data-grid model.bind="content">
        <grid-column>
          <header>First name</header>
          \${item.firstName}
        </grid-column>
        <grid-column>
          <header>Last name</header>
          \${item.lastName}
        </grid-column>
      </data-grid>`
    })
    class App implements ICustomElementViewModel {
      public readonly people: Person[];
      public readonly content: ContentModel<Person>;

      public constructor(
        @ILogger logger: ILogger,
      ) {
        logger = logger.scopeTo('App');
        this.content = new ContentModel(
          this.people = [
            new Person('Byomkesh', 'Bakshi'),
            new Person('Pradosh C.', 'Mitra'),
          ],
          null,
          null,
          null,
          logger,
        );
      }
    }

    ($it as $It<App>)('renders the content as per given template - text content',
      function ({ app, host }) {
        const grid = host.querySelector<HTMLElement>('data-grid')!;
        assert.isNotNull(grid);

        const gridVm = CustomElement.for(grid).viewModel as DataGrid;

        const headers = getHeaders(grid);
        assert.strictEqual(headers.length, 2);
        assert.deepStrictEqual(
          headers.map(header => getText(header.querySelector('div>span'))),
          ['First name', 'Last name']
        );

        const content = getContentRows(grid);
        assert.strictEqual(content.length, 2);
        assert.deepStrictEqual(
          content.map(c => Array.from(c.children).map((el) => getText(el))),
          app.people.map(p => [p.firstName, p.lastName])
        );
        gridVm.exportState();
        assert.isUndefined(gridVm.state);
      },
      { component: App as CustomElementType<Constructable<App>> });
  }

  {
    @customElement({
      name: 'my-app',
      template: `<data-grid model.bind="content">
        <grid-column>
          <header><value-text value="First name"></value-text></header>
          <normal-text value.bind="item.firstName"></normal-text>
        </grid-column>
        <grid-column>
          <header><value-text value="Last name"></value-text></header>
          <normal-text value.bind="item.lastName"></normal-text>
        </grid-column>
      </data-grid>`
    })
    class App implements ICustomElementViewModel {
      public readonly people: Person[];
      public readonly content: ContentModel<Person>;

      public constructor(
        @ILogger logger: ILogger,
      ) {
        logger = logger.scopeTo('App');
        this.content = new ContentModel(
          this.people = [
            new Person('Byomkesh', 'Bakshi'),
            new Person('Pradosh C.', 'Mitra'),
          ],
          null,
          null,
          null,
          logger,
        );
      }
    }

    ($it as $$It<App>)('renders the content as per given template - custom element',
      function ({ app, host }) {
        const grid = host.querySelector<HTMLElement>('data-grid')!;
        assert.isNotNull(grid);

        const gridVm = CustomElement.for(grid).viewModel as DataGrid;

        const headers = getHeaders(grid);
        assert.strictEqual(headers.length, 2);
        assert.deepStrictEqual(
          headers.map(header => getText(header.querySelector('div>span>value-text'))),
          ['First name', 'Last name']
        );

        const content = getContentRows(grid);
        assert.strictEqual(content.length, 2);
        assert.deepStrictEqual(
          content.map(c => Array.from(c.querySelectorAll('normal-text')).map((el) => getText(el))),
          app.people.map(p => [p.firstName, p.lastName])
        );
        gridVm.exportState();
        assert.isUndefined(gridVm.state);
      },
      { component: App as CustomElementType<Constructable<App>>, registrations: [NormalText, ValueText] });
  }

  {
    @customElement({
      name: 'my-app',
      template: `<data-grid model.bind="content">
        <grid-column property="firstName">
          \${item.firstName}
        </grid-column>
        <grid-column property="lastName">
          \${item.lastName}
        </grid-column>
        <grid-column property="age">
          \${item.age}
        </grid-column>
      </data-grid>`
    })
    class App implements ICustomElementViewModel {
      public readonly content: ContentModel<Person>;

      public constructor(
        @ILogger logger: ILogger,
      ) {
        logger = logger.scopeTo('App');
        this.content = new ContentModel(
          [
            new Person('Byomkesh', 'Bakshi', 42),
            new Person('Pradosh C.', 'Mitra', 30),
          ],
          null,
          null,
          null,
          logger,
        );
      }
    }

    ($it as $It<App>)('supports change of data - all-items',
      async function ({ host, app, platform }) {
        const grid = host.querySelector<HTMLElement>('data-grid')!;
        assert.deepStrictEqual(
          getContentTextContent(grid),
          [
            ['Byomkesh', 'Bakshi', '42'],
            ['Pradosh C.', 'Mitra', '30'],
          ],
          'initial'
        );

        const queue = platform.domWriteQueue;
        // replace collection
        app.content.allItems = [
          new Person('Ghanyasham', 'Das', 45),
          new Person('Bhajahari', 'Mukhujjee', 25),
        ];
        await queue.yield();
        assert.deepStrictEqual(
          getContentTextContent(grid),
          [
            ['Ghanyasham', 'Das', '45'],
            ['Bhajahari', 'Mukhujjee', '25'],
          ],
          'replace'
        );

        // collection mutation
        app.content.allItems.push(new Person('Tarini Charan', 'Bandopadhyay', 65));
        await queue.yield();
        assert.deepStrictEqual(
          getContentTextContent(grid),
          [
            ['Ghanyasham', 'Das', '45'],
            ['Bhajahari', 'Mukhujjee', '25'],
            ['Tarini Charan', 'Bandopadhyay', '65'],
          ],
          'mutation'
        );
      },
      { component: App as CustomElementType<Constructable<App>> });
  }

  {
    @customElement({
      name: 'my-app',
      template: `<data-grid model.bind="content">
        <grid-column property="firstName">
          \${item.firstName}
        </grid-column>
        <grid-column property="lastName">
          \${item.lastName}
        </grid-column>
      </data-grid>`
    })
    class App implements ICustomElementViewModel {
      public readonly content: ContentModel<Person>;

      public constructor(
        @ILogger logger: ILogger,
      ) {
        logger = logger.scopeTo('App');
        const content = this.content = new ContentModel(
          null,
          {
            pageSize: 2,
            fetchCount(): Promise<number> { return Promise.resolve(50); },
            fetchPage(currentPage: number, pageSize: number, _model: ContentModel<Person>): Promise<Person[]> {
              return Promise.resolve(Array.from({ length: pageSize }, (_, i) => new Person(`fn${currentPage}${i + 1}`, `ln${currentPage}${i + 1}`)));
            }
          },
          null,
          null,
          logger,
        );
        void content.refresh();
      }
    }

    ($it as $It<App>)('supports change of data - paged items',
      async function ({ host, app, platform }) {
        const grid = host.querySelector<HTMLElement>('data-grid')!;
        assert.deepStrictEqual(
          getContentTextContent(grid),
          [
            ['fn11', 'ln11'],
            ['fn12', 'ln12'],
          ],
          'initial'
        );

        const queue = platform.domWriteQueue;
        const content = app.content;
        content.goToNextPage();
        await content.wait();
        await queue.yield();
        assert.deepStrictEqual(
          getContentTextContent(grid),
          [
            ['fn21', 'ln21'],
            ['fn22', 'ln22'],
          ],
          'change1'
        );

        content.goToNextPage();
        await content.wait();
        await queue.yield();
        assert.deepStrictEqual(
          getContentTextContent(grid),
          [
            ['fn31', 'ln31'],
            ['fn32', 'ln32'],
          ],
          'change2'
        );

        content.setCurrentPageNumber(10);
        await content.wait();
        await queue.yield();
        assert.deepStrictEqual(
          getContentTextContent(grid),
          [
            ['fn101', 'ln101'],
            ['fn102', 'ln102'],
          ],
          'change1'
        );
      },
      { component: App as CustomElementType<Constructable<App>> });
  }

  {
    @customElement({
      name: 'my-app',
      template: `<data-grid model.bind="content">
        <grid-column property='firstName'>
          <header>First name</header>
          \${item.firstName}
        </grid-column>
        <grid-column property='lastName'>
          <header>Last name</header>
          \${item.lastName}
        </grid-column>
      </data-grid>`
    })
    class App implements ICustomElementViewModel {
      public readonly people: Person[];
      public readonly content: ContentModel<Person>;

      public constructor(
        @ILogger logger: ILogger,
      ) {
        logger = logger.scopeTo('App');
        this.content = new ContentModel(
          this.people = [
            new Person('Byomkesh', 'Bakshi'),
            new Person('Pradosh C.', 'Mitra'),
          ],
          null,
          null,
          null,
          logger,
        );
      }
    }

    ($it as $It<App>)('defining property attribute for every column makes the list state exportable',
      function ({ host }) {
        const grid = host.querySelector<HTMLElement>('data-grid')!;
        const gridVm = CustomElement.for(grid).viewModel as DataGrid;
        gridVm.exportState();
        assert.deepStrictEqual(
          gridVm.state,
          {
            columns: [
              { id: 'firstName', property: 'firstName', direction: null, isResizable: true, widthPx: null },
              { id: 'lastName', property: 'lastName', direction: null, isResizable: true, widthPx: null },
            ]
          });
      },
      { component: App as CustomElementType<Constructable<App>> });
  }

  {
    @customElement({
      name: 'my-app',
      template: `<data-grid model.bind="content">
        <grid-column id='firstName'>
          <header>First name</header>
          \${item.firstName}
        </grid-column>
        <grid-column id='lastName'>
          <header>Last name</header>
          \${item.lastName}
        </grid-column>
      </data-grid>`
    })
    class App implements ICustomElementViewModel {
      public readonly people: Person[];
      public readonly content: ContentModel<Person>;

      public constructor(
        @ILogger logger: ILogger,
      ) {
        logger = logger.scopeTo('App');
        this.content = new ContentModel(
          this.people = [
            new Person('Byomkesh', 'Bakshi'),
            new Person('Pradosh C.', 'Mitra'),
          ],
          null,
          null,
          null,
          logger,
        );
      }
    }

    ($it as $It<App>)('defining id attribute for every column makes the list state exportable',
      function ({ host }) {
        const grid = host.querySelector<HTMLElement>('data-grid')!;
        const gridVm = CustomElement.for(grid).viewModel as DataGrid;
        gridVm.exportState();
        assert.deepStrictEqual(
          gridVm.state,
          {
            columns: [
              { id: 'firstName', property: null, direction: null, isResizable: true, widthPx: null },
              { id: 'lastName', property: null, direction: null, isResizable: true, widthPx: null },
            ]
          });
      },
      { component: App as CustomElementType<Constructable<App>> });
  }

  {
    @customElement({
      name: 'my-app',
      template: `<data-grid model.bind="content">
        <grid-column id='firstName'>
          \${item.firstName}
        </grid-column>
        <grid-column id='lastName'>
          \${item.lastName}
        </grid-column>
      </data-grid>`
    })
    class App implements ICustomElementViewModel {
      public readonly people: Person[];
      public readonly content: ContentModel<Person>;

      public constructor(
        @ILogger logger: ILogger,
      ) {
        logger = logger.scopeTo('App');
        this.content = new ContentModel(
          this.people = [
            new Person('Byomkesh', 'Bakshi'),
            new Person('Pradosh C.', 'Mitra'),
          ],
          null,
          null,
          null,
          logger,
        );
      }
    }

    ($it as $It<App>)('auto-generates column header if not provided',
      function ({ app, host }) {
        const grid = host.querySelector<HTMLElement>('data-grid')!;

        const headers = getHeaders(grid);
        assert.strictEqual(headers.length, 2);
        assert.deepStrictEqual(
          headers.map(header => getText(header.querySelector('div>span'))),
          ['Column 1', 'Column 2']
        );

        const content = getContentRows(grid);
        assert.strictEqual(content.length, 2);
        assert.deepStrictEqual(
          content.map(c => Array.from(c.children).map((el) => getText(el))),
          app.people.map(p => [p.firstName, p.lastName])
        );
      },
      { component: App as CustomElementType<Constructable<App>> });
  }

  for (const selectionOptions of [null, { mode: ItemSelectionMode.None }, { mode: ItemSelectionMode.None, onSelectionChange(): void { throw new Error('unexpected callback'); } }]) {
    @customElement({
      name: 'my-app',
      template: `<data-grid model.bind="content" item-clicked.bind="x => logItemClick(x.item, x.index)" >
        <grid-column id='firstName'>
          \${item.firstName}
        </grid-column>
        <grid-column id='lastName'>
          \${item.lastName}
        </grid-column>
      </data-grid>`
    })
    class App implements ICustomElementViewModel {
      public readonly people: Person[];
      public readonly content: ContentModel<Person>;
      public readonly clickLog: [Person, number][] = [];

      public constructor(
        @ILogger logger: ILogger,
      ) {
        logger = logger.scopeTo('App');
        this.content = new ContentModel(
          this.people = [
            new Person('Byomkesh', 'Bakshi'),
            new Person('Pradosh C.', 'Mitra'),
          ],
          null,
          selectionOptions,
          null,
          logger,
        );
      }

      private logItemClick(item: Person, index: number): void {
        this.clickLog.push([item, index]);
      }
    }

    ($it as $It<App>)(`calls back the bound item-clicked when a row is clicked - selectionOptions: ${JSON.stringify(selectionOptions)}`,
      function ({ app, host }) {
        const grid = host.querySelector<HTMLElement>('data-grid')!;

        const content = getContentRows(grid);
        content[0].click();

        const log = app.clickLog;
        assert.strictEqual(log.length, 1);
        const people = app.people;
        assert.strictEqual(log[0][0], people[0]);
        assert.strictEqual(log[0][1], 0);

        content[0].click();
        assert.strictEqual(log[1][0], people[0]);
        assert.strictEqual(log[1][1], 0);

        content[1].click();
        assert.strictEqual(log[2][0], people[1]);
        assert.strictEqual(log[2][1], 1);
      },
      { component: App as CustomElementType<Constructable<App>> });
  }

  {
    @customElement({
      name: 'my-app',
      template: `<data-grid model.bind="content">
          <grid-column id='firstName'>
            \${item.firstName}
          </grid-column>
          <grid-column id='lastName'>
            \${item.lastName}
          </grid-column>
        </data-grid>`
    })
    class App implements ICustomElementViewModel {
      public readonly people: Person[];
      public readonly content: ContentModel<Person>;

      public constructor(
        @ILogger logger: ILogger,
      ) {
        logger = logger.scopeTo('App');
        this.content = new ContentModel(
          this.people = [
            new Person('Byomkesh', 'Bakshi'),
            new Person('Pradosh C.', 'Mitra'),
          ],
          null,
          null,
          null,
          logger,
        );
      }
    }

    ($it as $It<App>)('clicking a row should not raise error when the item-clicked callback is not bound',
      function ({ host }) {
        const grid = host.querySelector<HTMLElement>('data-grid')!;

        const content = getContentRows(grid);
        try {
          content[0].click();
          content[1].click();
        } catch (e) {
          assert.fail((e as Error).message);
        }
      },
      { component: App as CustomElementType<Constructable<App>> });
  }

  {
    @customElement({
      name: 'my-app',
      template: `<data-grid model.bind="content" item-clicked.bind="x => logItemClick(x.item, x.index)" >
        <grid-column id='firstName'>
          \${item.firstName}
        </grid-column>
        <grid-column id='lastName'>
          \${item.lastName}
        </grid-column>
      </data-grid>`
    })
    class App implements ICustomElementViewModel {
      public readonly people: Person[];
      public readonly content: ContentModel<Person>;
      public readonly clickLog: [Person, number][] = [];
      public readonly selectionLog: [items: Person[], isOneSelected: boolean, isAnySelected: boolean][] = [];

      public constructor(
        @ILogger logger: ILogger,
      ) {
        logger = logger.scopeTo('App');
        this.content = new ContentModel(
          this.people = [
            new Person('Byomkesh', 'Bakshi'),
            new Person('Pradosh C.', 'Mitra'),
          ],
          null,
          {
            mode: ItemSelectionMode.Single,
            onSelectionChange: (selectedItems, isOneSelected, isAnySelected): void => {
              this.selectionLog.push([selectedItems, isOneSelected, isAnySelected]);
            }
          },
          null,
          logger,
        );
      }

      private logItemClick(item: Person, index: number): void {
        this.clickLog.push([item, index]);
      }
    }

    ($it as $It<App>)('selects single items on click with single-selection mode',
      async function ({ app, host, platform }) {
        const grid = host.querySelector<HTMLElement>('data-grid')!;

        const content = getContentRows(grid);
        assert.strictEqual(content[0].classList.contains('selected-row'), false, 'content[0].selected-row false 1');
        content[0].click();
        const queue = platform.domWriteQueue;
        await queue.yield();

        const clickLog = app.clickLog;
        const selectionLog = app.selectionLog;
        assert.strictEqual(clickLog.length, 0);
        assert.strictEqual(selectionLog.length, 1);
        const people = app.people;
        assert.deepStrictEqual(selectionLog[0], [[people[0]], true, true]);
        assert.strictEqual(content[0].classList.contains('selected-row'), true, 'content[0].selected-row true');

        content[0].click();
        assert.strictEqual(clickLog.length, 0);
        assert.strictEqual(selectionLog.length, 1);

        assert.strictEqual(content[1].classList.contains('selected-row'), false, 'content[1].selected-row false');
        content[1].click();
        await queue.yield();
        assert.strictEqual(clickLog.length, 0);
        assert.strictEqual(selectionLog.length, 2);
        assert.deepStrictEqual(selectionLog[1], [[people[1]], true, true]);
        assert.strictEqual(content[1].classList.contains('selected-row'), true, 'content[1].selected-row true');
        assert.strictEqual(content[0].classList.contains('selected-row'), false, 'content[0].selected-row false 2');
      },
      { component: App as CustomElementType<Constructable<App>> });

    ($it as $It<App>)('calls back the bound item-clicked on dblclick with single-selection mode',
      function ({ app, host }) {
        const grid = host.querySelector<HTMLElement>('data-grid')!;

        const content = getContentRows(grid);
        content[0].dispatchEvent(new Event('dblclick', { bubbles: true, cancelable: true }));

        const clickLog = app.clickLog;
        const selectionLog = app.selectionLog;
        assert.strictEqual(clickLog.length, 1, 'clickLog');
        assert.strictEqual(selectionLog.length, 0, 'selectionLog');
        const people = app.people;
        assert.deepStrictEqual(clickLog[0], [people[0], 0]);

        content[0].dispatchEvent(new Event('dblclick', { bubbles: true, cancelable: true }));
        assert.strictEqual(clickLog.length, 2, 'clickLog');
        assert.strictEqual(selectionLog.length, 0, 'selectionLog');
        assert.deepStrictEqual(clickLog[1], [people[0], 0]);

        content[1].dispatchEvent(new Event('dblclick', { bubbles: true, cancelable: true }));
        assert.strictEqual(clickLog.length, 3, 'clickLog');
        assert.strictEqual(selectionLog.length, 0, 'selectionLog');
        assert.deepStrictEqual(clickLog[2], [people[1], 1]);
      },
      { component: App as CustomElementType<Constructable<App>> });

    ($it as $It<App>)('removes text selection on click with single-selection mode',
      function ({ host }) {
        const grid = host.querySelector<HTMLElement>('data-grid')!;

        const content = getContentRows(grid);
        const selection = getSelection();
        const range = document.createRange();
        range.selectNodeContents(content[0].querySelector('div')!);
        selection?.addRange(range);
        assert.notEqual(selection?.toString() ?? '', '');
        content[0].click();
        assert.equal(selection?.toString() ?? '', '');
      },
      { component: App as CustomElementType<Constructable<App>> });

    ($it as $It<App>)('removes text selection on dblclick with single-selection mode',
      function ({ host }) {
        const grid = host.querySelector<HTMLElement>('data-grid')!;

        const content = getContentRows(grid);
        const selection = getSelection();
        const range = document.createRange();
        range.selectNodeContents(content[0].querySelector('div')!);
        selection?.addRange(range);
        assert.notEqual(selection?.toString() ?? '', '');
        content[0].dispatchEvent(new Event('dblclick', { bubbles: true, cancelable: true }));
        assert.equal(selection?.toString() ?? '', '');
      },
      { component: App as CustomElementType<Constructable<App>> });
  }

  {
    @customElement({
      name: 'my-app',
      template: `<data-grid model.bind="content" item-clicked.bind="x => logItemClick(x.item, x.index)" >
        <grid-column id='firstName'>
          \${item.firstName}
        </grid-column>
        <grid-column id='lastName'>
          \${item.lastName}
        </grid-column>
      </data-grid>`
    })
    class App implements ICustomElementViewModel {
      public readonly people: Person[];
      public readonly content: ContentModel<Person>;
      public readonly clickLog: [Person, number][] = [];
      public readonly selectionLog: [items: Person[], isOneSelected: boolean, isAnySelected: boolean][] = [];

      public constructor(
        @ILogger logger: ILogger,
      ) {
        logger = logger.scopeTo('App');
        this.content = new ContentModel(
          this.people = [
            new Person('Byomkesh', 'Bakshi'),
            new Person('Pradosh C.', 'Mitra'),
            new Person('Ghanyasham', 'Das'),
            new Person('Bhajahari', 'Mukhujjee'),
            new Person('Tarini Charan', 'Bandopadhyay'),
          ],
          null,
          {
            mode: ItemSelectionMode.Multiple,
            onSelectionChange: (selectedItems, isOneSelected, isAnySelected): void => {
              this.selectionLog.push([selectedItems, isOneSelected, isAnySelected]);
            }
          },
          null,
          logger,
        );
      }

      private logItemClick(item: Person, index: number): void {
        this.clickLog.push([item, index]);
      }
    }

    ($it as $It<App>)('selects a range of items on click followed by shift+click with multiple-selection mode - 1',
      async function ({ app, host, platform }) {
        const grid = host.querySelector<HTMLElement>('data-grid')!;

        const content = getContentRows(grid);
        assert.deepStrictEqual(
          content.map(el => el.classList.contains('selected-row')),
          new Array(5).fill(false),
          'content.selected-row 1');
        content[0].click();
        const queue = platform.domWriteQueue;
        await queue.yield();

        const clickLog = app.clickLog;
        const selectionLog = app.selectionLog;
        assert.strictEqual(clickLog.length, 0);
        assert.strictEqual(selectionLog.length, 1);
        const people = app.people;
        assert.deepStrictEqual(selectionLog[0], [[people[0]], true, true]);
        assert.deepStrictEqual(
          content.map(el => el.classList.contains('selected-row')),
          [true, false, false, false, false],
          'content.selected-row 2');

        content[3].dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, shiftKey: true }));
        await queue.yield();
        assert.strictEqual(clickLog.length, 0);
        assert.strictEqual(selectionLog.length, 2);
        assert.deepStrictEqual(selectionLog[1], [people.slice(0, 4), false, true]);
        assert.deepStrictEqual(
          content.map(el => el.classList.contains('selected-row')),
          [true, true, true, true, false],
          'content.selected-row 3');
      },
      { component: App as CustomElementType<Constructable<App>> });

    ($it as $It<App>)('selects a range of items on click followed by shift+click with multiple-selection mode - 2',
      async function ({ app, host, platform }) {
        const grid = host.querySelector<HTMLElement>('data-grid')!;

        const content = getContentRows(grid);
        assert.deepStrictEqual(
          content.map(el => el.classList.contains('selected-row')),
          new Array(5).fill(false),
          'content.selected-row 1');

        const clickLog = app.clickLog;
        const selectionLog = app.selectionLog;
        const people = app.people;

        content[4].click();
        const queue = platform.domWriteQueue;
        await queue.yield();
        assert.strictEqual(clickLog.length, 0);
        assert.strictEqual(selectionLog.length, 1);
        assert.deepStrictEqual(selectionLog[0], [[people[4]], true, true]);
        assert.deepStrictEqual(
          content.map(el => el.classList.contains('selected-row')),
          [false, false, false, false, true],
          'content.selected-row 2');

        content[3].click();
        await queue.yield();
        assert.strictEqual(clickLog.length, 0);
        assert.strictEqual(selectionLog.length, 2);
        assert.deepStrictEqual(selectionLog[1], [[people[3]], true, true]);
        assert.deepStrictEqual(
          content.map(el => el.classList.contains('selected-row')),
          [false, false, false, true, false],
          'content.selected-row 3');

        content[0].dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, shiftKey: true }));
        await queue.yield();
        assert.strictEqual(clickLog.length, 0);
        assert.strictEqual(selectionLog.length, 3);
        assert.deepStrictEqual(selectionLog[2], [[people[3], people[0], people[1], people[2]], false, true]);
        assert.deepStrictEqual(
          content.map(el => el.classList.contains('selected-row')),
          [true, true, true, true, false],
          'content.selected-row 4');
      },
      { component: App as CustomElementType<Constructable<App>> });

    ($it as $It<App>)('selects a range of items on click followed by shift+click with multiple-selection mode - 3',
      async function ({ app, host, platform }) {
        const grid = host.querySelector<HTMLElement>('data-grid')!;

        const content = getContentRows(grid);
        assert.deepStrictEqual(
          content.map(el => el.classList.contains('selected-row')),
          new Array(5).fill(false),
          'content.selected-row 1');

        const clickLog = app.clickLog;
        const selectionLog = app.selectionLog;
        const people = app.people;

        content[2].click();
        const queue = platform.domWriteQueue;
        await queue.yield();
        assert.strictEqual(clickLog.length, 0);
        assert.strictEqual(selectionLog.length, 1);
        assert.deepStrictEqual(selectionLog[0], [[people[2]], true, true]);
        assert.deepStrictEqual(
          content.map(el => el.classList.contains('selected-row')),
          [false, false, true, false, false],
          'content.selected-row 2');

        content[4].dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, shiftKey: true }));
        await queue.yield();
        assert.strictEqual(clickLog.length, 0);
        assert.strictEqual(selectionLog.length, 2);
        assert.deepStrictEqual(selectionLog[1], [[people[2], people[3], people[4]], false, true]);
        assert.deepStrictEqual(
          content.map(el => el.classList.contains('selected-row')),
          [false, false, true, true, true],
          'content.selected-row 3');

        content[1].dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, shiftKey: true }));
        await queue.yield();
        assert.strictEqual(clickLog.length, 0);
        assert.strictEqual(selectionLog.length, 3);
        assert.deepStrictEqual(selectionLog[2], [[people[2], people[3], people[4], people[1]], false, true]);
        assert.deepStrictEqual(
          content.map(el => el.classList.contains('selected-row')),
          [false, true, true, true, true],
          'content.selected-row 4');
      },
      { component: App as CustomElementType<Constructable<App>> });

    ($it as $It<App>)('selects multiple individual items on ctrl+click with multiple-selection mode',
      async function ({ app, host, platform }) {
        const grid = host.querySelector<HTMLElement>('data-grid')!;

        const content = getContentRows(grid);
        assert.deepStrictEqual(
          content.map(el => el.classList.contains('selected-row')),
          new Array(5).fill(false),
          'content.selected-row 1');
        content[0].click();
        const queue = platform.domWriteQueue;
        await queue.yield();

        const clickLog = app.clickLog;
        const selectionLog = app.selectionLog;
        assert.strictEqual(clickLog.length, 0);
        assert.strictEqual(selectionLog.length, 1);
        const people = app.people;
        assert.deepStrictEqual(selectionLog[0], [[people[0]], true, true]);
        assert.deepStrictEqual(
          content.map(el => el.classList.contains('selected-row')),
          [true, false, false, false, false],
          'content.selected-row 2');

        content[2].dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, ctrlKey: true }));
        await queue.yield();
        assert.strictEqual(clickLog.length, 0);
        assert.strictEqual(selectionLog.length, 2);
        assert.deepStrictEqual(selectionLog[1], [[people[0], people[2]], false, true]);
        assert.deepStrictEqual(
          content.map(el => el.classList.contains('selected-row')),
          [true, false, true, false, false],
          'content.selected-row 3');

        content[4].dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, ctrlKey: true }));
        await queue.yield();
        assert.strictEqual(clickLog.length, 0);
        assert.strictEqual(selectionLog.length, 3);
        assert.deepStrictEqual(selectionLog[2], [[people[0], people[2], people[4]], false, true]);
        assert.deepStrictEqual(
          content.map(el => el.classList.contains('selected-row')),
          [true, false, true, false, true],
          'content.selected-row 4');
      },
      { component: App as CustomElementType<Constructable<App>> });

    ($it as $It<App>)('selects a range of items on shift+click followed by shift+click with multiple-selection mode',
      async function ({ app, host, platform }) {
        const grid = host.querySelector<HTMLElement>('data-grid')!;

        const content = getContentRows(grid);
        assert.deepStrictEqual(
          content.map(el => el.classList.contains('selected-row')),
          new Array(5).fill(false),
          'content.selected-row 1');
        content[0].dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, shiftKey: true }));
        const queue = platform.domWriteQueue;
        await queue.yield();

        const clickLog = app.clickLog;
        const selectionLog = app.selectionLog;
        assert.strictEqual(clickLog.length, 0);
        assert.strictEqual(selectionLog.length, 1);
        const people = app.people;
        assert.deepStrictEqual(selectionLog[0], [[people[0]], true, true]);
        assert.deepStrictEqual(
          content.map(el => el.classList.contains('selected-row')),
          [true, false, false, false, false],
          'content.selected-row 2');

        content[3].dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, shiftKey: true }));
        await queue.yield();
        assert.strictEqual(clickLog.length, 0);
        assert.strictEqual(selectionLog.length, 2);
        assert.deepStrictEqual(selectionLog[1], [people.slice(0, 4), false, true]);
        assert.deepStrictEqual(
          content.map(el => el.classList.contains('selected-row')),
          [true, true, true, true, false],
          'content.selected-row 3');
      },
      { component: App as CustomElementType<Constructable<App>> });

    ($it as $It<App>)('selects multiple items with shift+click combined with ctrl+click with multiple-selection mode',
      async function ({ app, host, platform }) {
        const grid = host.querySelector<HTMLElement>('data-grid')!;

        const content = getContentRows(grid);
        assert.deepStrictEqual(
          content.map(el => el.classList.contains('selected-row')),
          new Array(5).fill(false),
          'content.selected-row 1');
        content[0].click();
        const queue = platform.domWriteQueue;
        await queue.yield();

        const clickLog = app.clickLog;
        const selectionLog = app.selectionLog;
        assert.strictEqual(clickLog.length, 0);
        assert.strictEqual(selectionLog.length, 1);
        const people = app.people;
        assert.deepStrictEqual(selectionLog[0], [[people[0]], true, true]);
        assert.deepStrictEqual(
          content.map(el => el.classList.contains('selected-row')),
          [true, false, false, false, false],
          'content.selected-row 2');

        content[2].dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, shiftKey: true }));
        await queue.yield();
        assert.strictEqual(clickLog.length, 0);
        assert.strictEqual(selectionLog.length, 2);
        assert.deepStrictEqual(selectionLog[1], [people.slice(0, 3), false, true]);
        assert.deepStrictEqual(
          content.map(el => el.classList.contains('selected-row')),
          [true, true, true, false, false],
          'content.selected-row 3');

        content[4].dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, ctrlKey: true }));
        await queue.yield();
        assert.strictEqual(clickLog.length, 0);
        assert.strictEqual(selectionLog.length, 3);
        assert.deepStrictEqual(selectionLog[2], [[...people.slice(0, 3), people[4]], false, true]);
        assert.deepStrictEqual(
          content.map(el => el.classList.contains('selected-row')),
          [true, true, true, false, true],
          'content.selected-row 4');
      },
      { component: App as CustomElementType<Constructable<App>> });

    ($it as $It<App>)('toggles selection with ctrl+click with multiple-selection mode',
      async function ({ app, host, platform }) {
        const grid = host.querySelector<HTMLElement>('data-grid')!;

        const content = getContentRows(grid);
        assert.deepStrictEqual(
          content.map(el => el.classList.contains('selected-row')),
          new Array(5).fill(false),
          'content.selected-row 1');
        content[0].click();
        const queue = platform.domWriteQueue;
        await queue.yield();

        const clickLog = app.clickLog;
        const selectionLog = app.selectionLog;
        assert.strictEqual(clickLog.length, 0);
        assert.strictEqual(selectionLog.length, 1);
        const people = app.people;
        assert.deepStrictEqual(selectionLog[0], [[people[0]], true, true]);
        assert.deepStrictEqual(
          content.map(el => el.classList.contains('selected-row')),
          [true, false, false, false, false],
          'content.selected-row 2');

        content[0].dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, ctrlKey: true }));
        await queue.yield();
        assert.strictEqual(clickLog.length, 0);
        assert.strictEqual(selectionLog.length, 2);
        assert.deepStrictEqual(selectionLog[1], [[], false, false]);
        assert.deepStrictEqual(
          content.map(el => el.classList.contains('selected-row')),
          new Array(5).fill(false),
          'content.selected-row 3');
      },
      { component: App as CustomElementType<Constructable<App>> });

    // eslint-disable-next-line @typescript-eslint/naming-convention
    for (const [ctrlKey, shiftKey] of [[true, false], [false, true], [true, true]]) {
      ($it as $It<App>)(`removes text selection on click with multi-selection mode - ctrlKey: ${ctrlKey} - shiftKey: ${shiftKey}`,
        function ({ host }) {
          const grid = host.querySelector<HTMLElement>('data-grid')!;

          const content = getContentRows(grid);
          content[0].click();

          const selection = getSelection();
          const range = document.createRange();
          range.selectNodeContents(content[0].querySelector('div')!);
          selection?.addRange(range);
          assert.notEqual(selection?.toString() ?? '', '');

          content[1].dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, ctrlKey, shiftKey }));
          assert.equal(selection?.toString() ?? '', '');
        },
        { component: App as CustomElementType<Constructable<App>> });

      ($it as $It<App>)(`removes text selection on dblclick with multi-selection mode - ctrlKey: ${ctrlKey} - shiftKey: ${shiftKey}`,
        function ({ host }) {
          const grid = host.querySelector<HTMLElement>('data-grid')!;

          const content = getContentRows(grid);
          content[0].click();

          const selection = getSelection();
          const range = document.createRange();
          range.selectNodeContents(content[0].querySelector('div')!);
          selection?.addRange(range);
          assert.notEqual(selection?.toString() ?? '', '');

          content[1].dispatchEvent(new MouseEvent('dblclick', { bubbles: true, cancelable: true, ctrlKey, shiftKey }));
          assert.equal(selection?.toString() ?? '', '');
        },
        { component: App as CustomElementType<Constructable<App>> });
    }
  }

  for (const mode of [ItemSelectionMode.Single, ItemSelectionMode.Multiple]) {
    @customElement({
      name: 'my-app',
      template: `<data-grid model.bind="content">
          <grid-column id='firstName'>
            \${item.firstName}
          </grid-column>
          <grid-column id='lastName'>
            \${item.lastName}
          </grid-column>
        </data-grid>`
    })
    class App implements ICustomElementViewModel {
      public readonly people: Person[];
      public readonly content: ContentModel<Person>;
      public readonly clickLog: [Person, number][] = [];
      public readonly selectionLog: [items: Person[], isOneSelected: boolean, isAnySelected: boolean][] = [];

      public constructor(
        @ILogger logger: ILogger,
      ) {
        logger = logger.scopeTo('App');
        this.content = new ContentModel(
          this.people = [
            new Person('Byomkesh', 'Bakshi'),
            new Person('Pradosh C.', 'Mitra'),
          ],
          null,
          {
            mode,
            onSelectionChange: (selectedItems, isOneSelected, isAnySelected): void => {
              this.selectionLog.push([selectedItems, isOneSelected, isAnySelected]);
            }
          },
          null,
          logger,
        );
      }

      private logItemClick(item: Person, index: number): void {
        this.clickLog.push([item, index]);
      }
    }
    ($it as $It<App>)(`does not throw error on double-clicking item on ${mode === ItemSelectionMode.Single ? 'single' : 'multiple'}-selection mode if the item-clicked is not bound`,
      function ({ app, host }) {
        const grid = host.querySelector<HTMLElement>('data-grid')!;

        const content = getContentRows(grid);
        try {
          content[0].dispatchEvent(new Event('dblclick', { bubbles: true, cancelable: true }));
          const selectionLog = app.selectionLog;
          assert.strictEqual(selectionLog.length, 0, 'selectionLog');
        } catch (e) {
          assert.fail((e as Error).message);
        }
      },
      { component: App as CustomElementType<Constructable<App>> });
  }

  {
    @customElement({
      name: 'my-app',
      template: `<data-grid model.bind="content">
        <grid-column property='firstName'>
          \${item.firstName}
        </grid-column>
        <grid-column>
          \${item.lastName}
        </grid-column>
        <grid-column property="age">
          \${item.age}
        </grid-column>
      </data-grid>`
    })
    class App implements ICustomElementViewModel {
      public readonly people: Person[];
      public readonly content: ContentModel<Person>;
      public readonly sortOptions: [newOptions: SortOption<Person>[], oldOptions: SortOption<Person>[]][] = [];

      public constructor(
        @ILogger logger: ILogger,
      ) {
        logger = logger.scopeTo('App');
        this.content = new ContentModel(
          this.people = [
            new Person('Byomkesh', 'Bakshi', 42),
            new Person('Pradosh C.', 'Mitra', 30),
            new Person('Ghanyasham', 'Das', 45),
            new Person('Bhajahari', 'Mukhujjee', 25),
            new Person('Tarini Charan', 'Bandopadhyay', 65),
          ],
          null,
          null,
          (options, oldOptions, allItems) => {
            this.sortOptions.push([options, oldOptions]);
            if ((allItems?.length ?? 0) === 0) return;
            for (const option of options) {
              const prop = option.property;
              const isAsc = option.direction === SortDirection.Ascending;
              allItems!.sort((pa, pb) => {
                const aProp = pa[prop]!;
                const bProp = pb[prop]!;
                if (aProp > bProp) {
                  return isAsc ? 1 : -1;
                }
                if (aProp < bProp) {
                  return isAsc ? -1 : 1;
                }
                return 0;
              });
            }
          },
          logger,
        );
      }
    }

    ($it as $It<App>)('calls the onSorting callback when a sortable header is clicked',
      async function ({ app, host, platform }) {
        const grid = host.querySelector<HTMLElement>('data-grid')!;

        assert.deepStrictEqual(
          getContentTextContent(grid),
          [
            ['Byomkesh', 'Bakshi', '42'],
            ['Pradosh C.', 'Mitra', '30'],
            ['Ghanyasham', 'Das', '45'],
            ['Bhajahari', 'Mukhujjee', '25'],
            ['Tarini Charan', 'Bandopadhyay', '65'],
          ]
        );

        const queue = platform.domWriteQueue;
        const headers = getHeaders(grid);
        const headerContainer = headers[0].querySelector('div')!;
        assert.isNotNull(headerContainer);
        assert.isNull(headerContainer.querySelector('span:nth-of-type(2)'));
        headerContainer.click();
        await queue.yield();
        assert.deepStrictEqual(
          getContentTextContent(grid),
          [
            ['Bhajahari', 'Mukhujjee', '25'],
            ['Byomkesh', 'Bakshi', '42'],
            ['Ghanyasham', 'Das', '45'],
            ['Pradosh C.', 'Mitra', '30'],
            ['Tarini Charan', 'Bandopadhyay', '65'],
          ]
        );
        assert.deepStrictEqual(
          headers.map(el => el.querySelector('div')?.querySelector('span:nth-of-type(2)')?.textContent ?? null),
          ['\u25B4', null, null]
        );
        assert.deepStrictEqual(
          app.sortOptions,
          [[[{ property: 'firstName', direction: SortDirection.Ascending }], []]]
        );

        headerContainer.click();
        await queue.yield();
        assert.deepStrictEqual(
          getContentTextContent(grid),
          [
            ['Tarini Charan', 'Bandopadhyay', '65'],
            ['Pradosh C.', 'Mitra', '30'],
            ['Ghanyasham', 'Das', '45'],
            ['Byomkesh', 'Bakshi', '42'],
            ['Bhajahari', 'Mukhujjee', '25'],
          ]
        );
        assert.deepStrictEqual(
          headers.map(el => el.querySelector('div')?.querySelector('span:nth-of-type(2)')?.textContent ?? null),
          ['\u25BE', null, null]
        );
        assert.deepStrictEqual(
          app.sortOptions,
          [
            [[{ property: 'firstName', direction: SortDirection.Ascending }], []],
            [[{ property: 'firstName', direction: SortDirection.Descending }], [{ property: 'firstName', direction: SortDirection.Ascending }]]
          ]
        );

        // un-sortable column ->  no-change
        headers[1].querySelector('div')!.click();
        await queue.yield();
        assert.deepStrictEqual(
          getContentTextContent(grid),
          [
            ['Tarini Charan', 'Bandopadhyay', '65'],
            ['Pradosh C.', 'Mitra', '30'],
            ['Ghanyasham', 'Das', '45'],
            ['Byomkesh', 'Bakshi', '42'],
            ['Bhajahari', 'Mukhujjee', '25'],
          ]
        );
        assert.deepStrictEqual(
          headers.map(el => el.querySelector('div')?.querySelector('span:nth-of-type(2)')?.textContent ?? null),
          ['\u25BE', null, null]
        );
        assert.deepStrictEqual(
          app.sortOptions,
          [
            [[{ property: 'firstName', direction: SortDirection.Ascending }], []],
            [[{ property: 'firstName', direction: SortDirection.Descending }], [{ property: 'firstName', direction: SortDirection.Ascending }]],
          ]
        );

        headers[2].querySelector('div')!.click();
        await queue.yield();
        assert.deepStrictEqual(
          getContentTextContent(grid),
          [
            ['Bhajahari', 'Mukhujjee', '25'],
            ['Pradosh C.', 'Mitra', '30'],
            ['Byomkesh', 'Bakshi', '42'],
            ['Ghanyasham', 'Das', '45'],
            ['Tarini Charan', 'Bandopadhyay', '65'],
          ]
        );
        assert.deepStrictEqual(
          headers.map(el => el.querySelector('div')?.querySelector('span:nth-of-type(2)')?.textContent ?? null),
          [null, null, '\u25B4']
        );
        assert.deepStrictEqual(
          app.sortOptions,
          [
            [[{ property: 'firstName', direction: SortDirection.Ascending }], []],
            [[{ property: 'firstName', direction: SortDirection.Descending }], [{ property: 'firstName', direction: SortDirection.Ascending }]],
            [[{ property: 'age', direction: SortDirection.Ascending }], [{ property: 'firstName', direction: SortDirection.Descending }]],
          ]
        );
      },
      { component: App as CustomElementType<Constructable<App>> });
  }

  function* getSortDirectionData(): Generator<{ direction: string; textContent: string[][] }> {
    let textContent = [
      ['Bhajahari', 'Mukhujjee', '25'],
      ['Pradosh C.', 'Mitra', '30'],
      ['Ghanyasham', 'Das', '45'],
      ['Tarini Charan', 'Bandopadhyay', '65'],
      ['Byomkesh', 'Bakshi', '42'],
    ];
    yield { direction: 'desc', textContent };
    yield { direction: 'descending', textContent };

    textContent = [
      ['Byomkesh', 'Bakshi', '42'],
      ['Tarini Charan', 'Bandopadhyay', '65'],
      ['Ghanyasham', 'Das', '45'],
      ['Pradosh C.', 'Mitra', '30'],
      ['Bhajahari', 'Mukhujjee', '25'],
    ];
    yield { direction: 'asc', textContent };
    yield { direction: 'ascending', textContent };
  }
  for (const { direction, textContent } of getSortDirectionData()) {
    @customElement({
      name: 'my-app',
      template: `<data-grid model.bind="content">
        <grid-column property="firstName">
          \${item.firstName}
        </grid-column>
        <grid-column property="lastName" sort-direction="${direction}">
          \${item.lastName}
        </grid-column>
        <grid-column property="age">
          \${item.age}
        </grid-column>
      </data-grid>`
    })
    class App implements ICustomElementViewModel {
      public readonly people: Person[];
      public readonly content: ContentModel<Person>;
      public readonly sortOptions: [newOptions: SortOption<Person>[], oldOptions: SortOption<Person>[]][] = [];

      public constructor(
        @ILogger logger: ILogger,
      ) {
        logger = logger.scopeTo('App');
        this.content = new ContentModel(
          this.people = [
            new Person('Byomkesh', 'Bakshi', 42),
            new Person('Pradosh C.', 'Mitra', 30),
            new Person('Ghanyasham', 'Das', 45),
            new Person('Bhajahari', 'Mukhujjee', 25),
            new Person('Tarini Charan', 'Bandopadhyay', 65),
          ],
          null,
          null,
          (options, oldOptions, allItems) => {
            this.sortOptions.push([options, oldOptions]);
            if ((allItems?.length ?? 0) === 0) return;
            for (const option of options) {
              const prop = option.property;
              const isAsc = option.direction === SortDirection.Ascending;
              allItems!.sort((pa, pb) => {
                const aProp = pa[prop]!;
                const bProp = pb[prop]!;
                if (aProp > bProp) {
                  return isAsc ? 1 : -1;
                }
                if (aProp < bProp) {
                  return isAsc ? -1 : 1;
                }
                return 0;
              });
            }
          },
          logger,
        );
      }
    }

    ($it as $It<App>)(`respects the sort-direction set from the template - direction: ${direction}`,
      function ({ app, host }) {
        const grid = host.querySelector<HTMLElement>('data-grid')!;

        assert.deepStrictEqual(getContentTextContent(grid), textContent);

        const isDesc = /desc/.test(direction);
        const headers = getHeaders(grid);
        assert.deepStrictEqual(
          headers.map(el => el.querySelector('div')?.querySelector('span:nth-of-type(2)')?.textContent ?? null),
          [null, isDesc ? '\u25BE' : '\u25B4', null]
        );
        assert.deepStrictEqual(
          app.sortOptions,
          [[[{ property: 'lastName', direction: isDesc ? SortDirection.Descending : SortDirection.Ascending }], []]]
        );
      },
      { component: App as CustomElementType<Constructable<App>> });
  }

  function getMidPoint(col: Element): number {
    const rect = col.getBoundingClientRect();
    return rect.left + (rect.right - rect.left) / 2;
  }
  async function dragAnDropColumn(srcCol: HTMLElement, destCol: HTMLElement, dropLocation: OrderChangeDropLocation, queue: TaskQueue): Promise<void> {
    const dataTransfer = new DataTransfer();
    const eventInit: DragEventInit = { bubbles: true, cancelable: true, dataTransfer };
    srcCol.dispatchEvent(new DragEvent('dragstart', eventInit));
    srcCol.dispatchEvent(new DragEvent('dragover', eventInit));
    destCol.dispatchEvent(new DragEvent('drop', { ...eventInit, clientX: getMidPoint(destCol) + (dropLocation === OrderChangeDropLocation.Before ? - 1 : 1) }));
    await queue.yield();
  }
  {
    class Data {
      public constructor(
        public readonly p1: unknown,
        public readonly p2: unknown,
        public readonly p3: unknown,
        public readonly p4: unknown,
        public readonly p5: unknown,
      ) { }
    }
    @customElement({
      name: 'my-app',
      template: `<data-grid model.bind="content">
        <grid-column><header>P1</header>\${item.p1}</grid-column>
        <grid-column><header>P2</header>\${item.p2}</grid-column>
        <grid-column><header>P3</header>\${item.p3}</grid-column>
        <grid-column><header>P4</header>\${item.p4}</grid-column>
        <grid-column><header>P5</header>\${item.p5}</grid-column>
      </data-grid>`
    })
    class App implements ICustomElementViewModel {
      public readonly content: ContentModel<Data>;

      public constructor(
        @ILogger logger: ILogger,
      ) {
        logger = logger.scopeTo('App');
        this.content = new ContentModel<Data>(
          [
            new Data(11, 12, 13, 14, 15),
            new Data(21, 22, 23, 24, 25),
            new Data(31, 32, 33, 34, 35),
          ],
          null,
          null,
          null,
          logger,
        );
      }
    }

    ($it as $It<App>)('supports column reordering',
      async function ({ host, platform }) {
        const grid = host.querySelector<HTMLElement>('data-grid')!;
        const [col1, col2, col3, col4, col5] = getHeaders(grid).map(header => header.querySelector<HTMLSpanElement>('div>span')!);
        const queue = platform.domWriteQueue;
        const subscriber: GridStateChangeSubscriber & { log: ChangeType[] } = {
          log: [],
          handleGridStateChange(type) {
            this.log.push(type);
          }
        };
        const gridVm = CustomElement.for(grid).viewModel as DataGrid;
        gridVm['stateModel'].addSubscriber(subscriber);

        // act-1 drag p5 before p1
        await dragAnDropColumn(col5, col1, OrderChangeDropLocation.Before, queue);
        assert.deepStrictEqual(getHeaderTextContent(grid), ['P5', 'P1', 'P2', 'P3', 'P4',], 'act1 header');
        assert.deepStrictEqual(
          getContentTextContent(grid),
          [
            ['15', '11', '12', '13', '14',],
            ['25', '21', '22', '23', '24',],
            ['35', '31', '32', '33', '34',],
          ],
          'act1 content'
        );
        assert.deepStrictEqual(subscriber.log, [ChangeType.Order]);

        // act-2 drag p1 after p5 - no change
        await dragAnDropColumn(col1, col5, OrderChangeDropLocation.After, queue);
        assert.deepStrictEqual(getHeaderTextContent(grid), ['P5', 'P1', 'P2', 'P3', 'P4',], 'act2 header');
        assert.deepStrictEqual(
          getContentTextContent(grid),
          [
            ['15', '11', '12', '13', '14',],
            ['25', '21', '22', '23', '24',],
            ['35', '31', '32', '33', '34',],
          ],
          'act2 content'
        );
        assert.deepStrictEqual(subscriber.log, [ChangeType.Order]);

        // act-3 drag p5 before p1 - no change
        await dragAnDropColumn(col5, col1, OrderChangeDropLocation.Before, queue);
        assert.deepStrictEqual(getHeaderTextContent(grid), ['P5', 'P1', 'P2', 'P3', 'P4',], 'act3 header');
        assert.deepStrictEqual(
          getContentTextContent(grid),
          [
            ['15', '11', '12', '13', '14',],
            ['25', '21', '22', '23', '24',],
            ['35', '31', '32', '33', '34',],
          ],
          'act3 content'
        );
        assert.deepStrictEqual(subscriber.log, [ChangeType.Order]);

        // act-4 drag p5 after p1
        await dragAnDropColumn(col5, col1, OrderChangeDropLocation.After, queue);
        assert.deepStrictEqual(getHeaderTextContent(grid), ['P1', 'P5', 'P2', 'P3', 'P4',], 'act4 header');
        assert.deepStrictEqual(
          getContentTextContent(grid),
          [
            ['11', '15', '12', '13', '14',],
            ['21', '25', '22', '23', '24',],
            ['31', '35', '32', '33', '34',],
          ],
          'act4 content');
        assert.deepStrictEqual(subscriber.log, new Array(2).fill(ChangeType.Order));

        // act-5 drag p1 before p2
        await dragAnDropColumn(col1, col2, OrderChangeDropLocation.Before, queue);
        assert.deepStrictEqual(getHeaderTextContent(grid), ['P5', 'P1', 'P2', 'P3', 'P4',], 'act5 header');
        assert.deepStrictEqual(
          getContentTextContent(grid),
          [
            ['15', '11', '12', '13', '14',],
            ['25', '21', '22', '23', '24',],
            ['35', '31', '32', '33', '34',],
          ],
          'act5 content');
        assert.deepStrictEqual(subscriber.log, new Array(3).fill(ChangeType.Order));

        // act-6 drag p4 after p2
        await dragAnDropColumn(col4, col2, OrderChangeDropLocation.After, queue);
        assert.deepStrictEqual(getHeaderTextContent(grid), ['P5', 'P1', 'P2', 'P4', 'P3',], 'act6 header');
        assert.deepStrictEqual(
          getContentTextContent(grid),
          [
            ['15', '11', '12', '14', '13',],
            ['25', '21', '22', '24', '23',],
            ['35', '31', '32', '34', '33',],
          ],
          'act6 content');
        assert.deepStrictEqual(subscriber.log, new Array(4).fill(ChangeType.Order));

        // act-7 drag p2 before p5
        await dragAnDropColumn(col2, col5, OrderChangeDropLocation.Before, queue);
        assert.deepStrictEqual(getHeaderTextContent(grid), ['P2', 'P5', 'P1', 'P4', 'P3',], 'act7 header');
        assert.deepStrictEqual(
          getContentTextContent(grid),
          [
            ['12', '15', '11', '14', '13',],
            ['22', '25', '21', '24', '23',],
            ['32', '35', '31', '34', '33',],
          ],
          'act7 content');
        assert.deepStrictEqual(subscriber.log, new Array(5).fill(ChangeType.Order));

        // act-8 drag p1 after p3
        await dragAnDropColumn(col1, col3, OrderChangeDropLocation.After, queue);
        assert.deepStrictEqual(getHeaderTextContent(grid), ['P2', 'P5', 'P4', 'P3', 'P1',], 'act8 header');
        assert.deepStrictEqual(
          getContentTextContent(grid),
          [
            ['12', '15', '14', '13', '11',],
            ['22', '25', '24', '23', '21',],
            ['32', '35', '34', '33', '31',],
          ],
          'act8 content');
        assert.deepStrictEqual(subscriber.log, new Array(6).fill(ChangeType.Order));

        // act-9 drag p1 before p2
        await dragAnDropColumn(col1, col2, OrderChangeDropLocation.Before, queue);
        assert.deepStrictEqual(getHeaderTextContent(grid), ['P1', 'P2', 'P5', 'P4', 'P3',], 'act9 header');
        assert.deepStrictEqual(
          getContentTextContent(grid),
          [
            ['11', '12', '15', '14', '13',],
            ['21', '22', '25', '24', '23',],
            ['31', '32', '35', '34', '33',],
          ],
          'act9 content');
        assert.deepStrictEqual(subscriber.log, new Array(7).fill(ChangeType.Order));

        // act-10 drag p3 before p5
        await dragAnDropColumn(col3, col5, OrderChangeDropLocation.Before, queue);
        assert.deepStrictEqual(getHeaderTextContent(grid), ['P1', 'P2', 'P3', 'P5', 'P4',], 'act10 header');
        assert.deepStrictEqual(
          getContentTextContent(grid),
          [
            ['11', '12', '13', '15', '14',],
            ['21', '22', '23', '25', '24',],
            ['31', '32', '33', '35', '34',],
          ],
          'act10 content');
        assert.deepStrictEqual(subscriber.log, new Array(8).fill(ChangeType.Order));

        // act-11 drag p4 before p5
        await dragAnDropColumn(col4, col5, OrderChangeDropLocation.Before, queue);
        assert.deepStrictEqual(getHeaderTextContent(grid), ['P1', 'P2', 'P3', 'P4', 'P5',], 'act11 header');
        assert.deepStrictEqual(
          getContentTextContent(grid),
          [
            ['11', '12', '13', '14', '15',],
            ['21', '22', '23', '24', '25',],
            ['31', '32', '33', '34', '35',],
          ],
          'act11 content');
        assert.deepStrictEqual(subscriber.log, new Array(9).fill(ChangeType.Order));
      },
      { component: App as CustomElementType<Constructable<App>> });

    ($it as $It<App>)('column reordering holds after data change',
      async function ({ host, platform, app }) {
        const grid = host.querySelector<HTMLElement>('data-grid')!;
        const [, col2, , col4,] = getHeaders(grid).map(header => header.querySelector<HTMLSpanElement>('div>span')!);
        const queue = platform.domWriteQueue;
        const subscriber: GridStateChangeSubscriber & { log: ChangeType[] } = {
          log: [],
          handleGridStateChange(type) {
            this.log.push(type);
          }
        };
        const gridVm = CustomElement.for(grid).viewModel as DataGrid;
        gridVm['stateModel'].addSubscriber(subscriber);

        // act-1 drag p4 before p2
        await dragAnDropColumn(col4, col2, OrderChangeDropLocation.Before, queue);
        assert.deepStrictEqual(getHeaderTextContent(grid), ['P1', 'P4', 'P2', 'P3', 'P5',], 'act1 header');
        assert.deepStrictEqual(
          getContentTextContent(grid),
          [
            ['11', '14', '12', '13', '15',],
            ['21', '24', '22', '23', '25',],
            ['31', '34', '32', '33', '35',],
          ],
          'act1 content'
        );

        // act-2 change data
        app.content.allItems = [
          new Data(41, 42, 43, 44, 45),
          new Data(51, 52, 53, 54, 55),
          new Data(61, 62, 63, 64, 65),
        ];
        await queue.yield();
        assert.deepStrictEqual(getHeaderTextContent(grid), ['P1', 'P4', 'P2', 'P3', 'P5',], 'act2 header');
        assert.deepStrictEqual(
          getContentTextContent(grid),
          [
            ['41', '44', '42', '43', '45',],
            ['51', '54', '52', '53', '55',],
            ['61', '64', '62', '63', '65',],
          ],
          'act2 content'
        );
      },
      { component: App as CustomElementType<Constructable<App>> });
  }

  const widthPattern = /minmax\(0px, (\d+\.?\d*)px\)/g;
  function extractWidths(templateColumns: string): number[] {
    return Array.from(templateColumns.matchAll(widthPattern))
      .map((match) => Number(match[1]));
  }
  {
    @customElement({
      name: 'my-app',
      template: `<data-grid model.bind="content">
        <grid-column property="firstName">
          \${item.firstName}
        </grid-column>
        <grid-column property="lastName">
          \${item.lastName}
        </grid-column>
        <grid-column property="age">
          \${item.age}
        </grid-column>
      </data-grid>`
    })
    class App implements ICustomElementViewModel {
      public readonly people: Person[];
      public readonly content: ContentModel<Person>;

      public constructor(
        @ILogger logger: ILogger,
      ) {
        logger = logger.scopeTo('App');
        this.content = new ContentModel(
          this.people = [
            new Person('Byomkesh', 'Bakshi', 42),
            new Person('Pradosh C.', 'Mitra', 30),
            new Person('Ghanyasham', 'Das', 45),
            new Person('Bhajahari', 'Mukhujjee', 25),
            new Person('Tarini Charan', 'Bandopadhyay', 65),
          ],
          null,
          null,
          null,
          logger,
        );
      }
    }

    ($it as $It<App>)('supports column resizing',
      async function ({ host, platform }) {
        const queue = platform.domWriteQueue;
        const grid = host.querySelector<HTMLElement>('data-grid')!;
        const container = grid.querySelector<HTMLElement>('.container');
        assert.strictEqual(
          container?.style.gridTemplateColumns,
          'minmax(0px, 1fr) minmax(0px, 1fr) minmax(0px, 1fr)'
        );

        const headers = getHeaders(grid);
        const col1 = headers[0];
        const handle1 = col1.querySelector('svg.resize-handle')!;
        assert.isNotNull(handle1);

        const baseEventData = { bubbles: true, cancelable: true };

        // act1 - increase width
        handle1.dispatchEvent(new MouseEvent('mousedown', { ...baseEventData }));
        let rightX = col1.getBoundingClientRect().right;
        handle1.dispatchEvent(new MouseEvent('mousemove', { ...baseEventData, clientX: rightX + 50 }));
        await queue.yield();
        handle1.dispatchEvent(new MouseEvent('mouseup', { ...baseEventData }));
        await queue.yield();

        const widths1 = extractWidths(container!.style.gridTemplateColumns);
        assert.strictEqual(widths1.every(x => !Number.isNaN(x)), true, 'width1');

        // act2 - decrease width
        handle1.dispatchEvent(new MouseEvent('mousedown', { ...baseEventData }));
        rightX = col1.getBoundingClientRect().right;
        handle1.dispatchEvent(new MouseEvent('mousemove', { ...baseEventData, clientX: rightX - 20 }));
        await queue.yield();
        handle1.dispatchEvent(new MouseEvent('mouseup', { ...baseEventData }));
        await queue.yield();

        const widths2 = extractWidths(container!.style.gridTemplateColumns);
        assert.strictEqual(widths2.every(x => !Number.isNaN(x)), true, 'width2');
        assert.isBelow(widths2[0], widths1[0]);

        // act3 - attempt to decrease the width to 0
        handle1.dispatchEvent(new MouseEvent('mousedown', { ...baseEventData }));
        rightX = col1.getBoundingClientRect().right;
        handle1.dispatchEvent(new MouseEvent('mousemove', { ...baseEventData, clientX: 0 }));
        await queue.yield();
        handle1.dispatchEvent(new MouseEvent('mouseup', { ...baseEventData }));
        await queue.yield();

        const widths3 = extractWidths(container!.style.gridTemplateColumns);
        assert.strictEqual(widths3.every(x => !Number.isNaN(x)), true, 'width3');
        assert.isAbove(widths3[0], 0);
      },
      { component: App as CustomElementType<Constructable<App>> });
  }
  {
    @customElement({
      name: 'my-app',
      template: `<data-grid model.bind="content">
        <grid-column property="firstName" width="300">
          \${item.firstName}
        </grid-column>
        <grid-column property="lastName" width="400">
          \${item.lastName}
        </grid-column>
        <grid-column property="age" width="120">
          \${item.age}
        </grid-column>
      </data-grid>`
    })
    class App implements ICustomElementViewModel {
      public readonly people: Person[];
      public readonly content: ContentModel<Person>;

      public constructor(
        @ILogger logger: ILogger,
      ) {
        logger = logger.scopeTo('App');
        this.content = new ContentModel(
          this.people = [
            new Person('Byomkesh', 'Bakshi', 42),
            new Person('Pradosh C.', 'Mitra', 30),
            new Person('Ghanyasham', 'Das', 45),
            new Person('Bhajahari', 'Mukhujjee', 25),
            new Person('Tarini Charan', 'Bandopadhyay', 65),
          ],
          null,
          null,
          null,
          logger,
        );
      }
    }

    ($it as $It<App>)('supports statically defined column widths and resizing thereafter',
      async function ({ host, platform }) {
        const queue = platform.domWriteQueue;
        const grid = host.querySelector<HTMLElement>('data-grid')!;
        const container = grid.querySelector<HTMLElement>('.container');
        assert.deepStrictEqual(
          extractWidths(container!.style.gridTemplateColumns),
          [300, 400, 120]
        );

        const headers = getHeaders(grid);
        const col1 = headers[0];
        const handle1 = col1.querySelector('svg.resize-handle')!;
        assert.isNotNull(handle1);

        const baseEventData = { bubbles: true, cancelable: true };

        // act1 - increase width
        handle1.dispatchEvent(new MouseEvent('mousedown', { ...baseEventData }));
        let rightX = col1.getBoundingClientRect().right;
        handle1.dispatchEvent(new MouseEvent('mousemove', { ...baseEventData, clientX: rightX + 50 }));
        await queue.yield();
        handle1.dispatchEvent(new MouseEvent('mouseup', { ...baseEventData }));
        await queue.yield();

        const widths1 = extractWidths(container!.style.gridTemplateColumns);
        assert.strictEqual(widths1.every(x => !Number.isNaN(x)), true, 'width1');
        assert.isAbove(widths1[0], 300);

        // act2 - decrease width
        handle1.dispatchEvent(new MouseEvent('mousedown', { ...baseEventData }));
        rightX = col1.getBoundingClientRect().right;
        handle1.dispatchEvent(new MouseEvent('mousemove', { ...baseEventData, clientX: rightX - 20 }));
        await queue.yield();
        handle1.dispatchEvent(new MouseEvent('mouseup', { ...baseEventData }));
        await queue.yield();

        const widths2 = extractWidths(container!.style.gridTemplateColumns);
        assert.strictEqual(widths2.every(x => !Number.isNaN(x)), true, 'width2');
        assert.isBelow(widths2[0], widths1[0]);

        // act3 - attempt to decrease the width to 0
        handle1.dispatchEvent(new MouseEvent('mousedown', { ...baseEventData }));
        rightX = col1.getBoundingClientRect().right;
        handle1.dispatchEvent(new MouseEvent('mousemove', { ...baseEventData, clientX: 0 }));
        await queue.yield();
        handle1.dispatchEvent(new MouseEvent('mouseup', { ...baseEventData }));
        await queue.yield();

        const widths3 = extractWidths(container!.style.gridTemplateColumns);
        assert.strictEqual(widths3.every(x => !Number.isNaN(x)), true, 'width3');
        assert.isAbove(widths3[0], 0);
      },
      { component: App as CustomElementType<Constructable<App>> });
  }
  {
    @customElement({
      name: 'my-app',
      template: `<data-grid model.bind="content">
        <grid-column property="firstName" width="0">
          \${item.firstName}
        </grid-column>
        <grid-column property="lastName" width="1">
          \${item.lastName}
        </grid-column>
        <grid-column property="age" width="2">
          \${item.age}
        </grid-column>
      </data-grid>`
    })
    class App implements ICustomElementViewModel {
      public readonly people: Person[];
      public readonly content: ContentModel<Person>;

      public constructor(
        @ILogger logger: ILogger,
      ) {
        logger = logger.scopeTo('App');
        this.content = new ContentModel(
          this.people = [
            new Person('Byomkesh', 'Bakshi', 42),
            new Person('Pradosh C.', 'Mitra', 30),
            new Person('Ghanyasham', 'Das', 45),
            new Person('Bhajahari', 'Mukhujjee', 25),
            new Person('Tarini Charan', 'Bandopadhyay', 65),
          ],
          null,
          null,
          null,
          logger,
        );
      }
    }

    ($it as $It<App>)('maintains a minimum width',
      function ({ host }) {
        const grid = host.querySelector<HTMLElement>('data-grid')!;
        const container = grid.querySelector<HTMLElement>('.container');
        const widths = extractWidths(container!.style.gridTemplateColumns);
        assert.strictEqual(widths.every(x => !Number.isNaN(x)), true);
        assert.isAbove(widths[0], 0);
        assert.isAbove(widths[1], 1);
        assert.isAbove(widths[2], 2);
      },
      { component: App as CustomElementType<Constructable<App>> });
  }
  {
    @customElement({
      name: 'my-app',
      template: `<data-grid model.bind="content">
        <grid-column property="firstName">
          \${item.firstName}
        </grid-column>
        <grid-column property="lastName" non-resizable>
          \${item.lastName}
        </grid-column>
        <grid-column property="age" non-resizable width="100">
          \${item.age}
        </grid-column>
      </data-grid>`
    })
    class App implements ICustomElementViewModel {
      public readonly people: Person[];
      public readonly content: ContentModel<Person>;

      public constructor(
        @ILogger logger: ILogger,
      ) {
        logger = logger.scopeTo('App');
        this.content = new ContentModel(
          this.people = [
            new Person('Byomkesh', 'Bakshi', 42),
            new Person('Pradosh C.', 'Mitra', 30),
            new Person('Ghanyasham', 'Das', 45),
            new Person('Bhajahari', 'Mukhujjee', 25),
            new Person('Tarini Charan', 'Bandopadhyay', 65),
          ],
          null,
          null,
          null,
          logger,
        );
      }
    }

    ($it as $It<App>)('supports non-resizable column',
      function ({ host }) {
        const grid = host.querySelector<HTMLElement>('data-grid')!;
        const container = grid.querySelector<HTMLElement>('.container');
        assert.strictEqual(
          container?.style.gridTemplateColumns,
          'minmax(0px, 1fr) minmax(0px, 1fr) minmax(0px, 1fr)'
        );

        assert.deepStrictEqual(
          getHeaders(grid)
            .map(el => !!el.querySelector('svg.resize-handle')),
          [true, false, false]);
      },
      { component: App as CustomElementType<Constructable<App>> });
  }

  {
    @customElement({
      name: 'my-app',
      template: `<data-grid model.bind="content" state.two-way>
        <grid-column property="firstName" width="400">
          <header>First name</header>
          \${item.firstName}
        </grid-column>
        <grid-column property="lastName" width="300">
          <header>Last name</header>
          \${item.lastName}
        </grid-column>
        <grid-column property="age" width="150">
          <header>Age</header>
          \${item.age}
        </grid-column>
      </data-grid>`
    })
    class App implements ICustomElementViewModel {
      public readonly people: Person[];
      public readonly content: ContentModel<Person>;
      public state: ExportableGridState;

      public constructor(
        @ILogger logger: ILogger,
      ) {
        logger = logger.scopeTo('App');
        this.content = new ContentModel(
          this.people = [
            new Person('Byomkesh', 'Bakshi', 42),
            new Person('Pradosh C.', 'Mitra', 30),
            new Person('Ghanyasham', 'Das', 45),
          ],
          null,
          null,
          () => { /** noop */ },
          logger,
        );
        this.state = {
          columns: [
            { id: 'lastName', property: 'lastName', isResizable: true, direction: null, widthPx: '450px' },
            { id: 'firstName', property: 'firstName', isResizable: true, direction: null, widthPx: '500px' },
            { id: 'age', property: 'age', isResizable: true, direction: null, widthPx: '200px' },
          ]
        };
      }
    }

    ($it as $It<App>)('respects the bound state during binding and writes the changes back to the bound state',
      async function ({ host, platform, app }) {
        const queue = platform.domWriteQueue;
        const grid = host.querySelector<HTMLElement>('data-grid')!;
        const container = grid.querySelector<HTMLElement>('.container');
        assert.strictEqual(
          container?.style.gridTemplateColumns,
          'minmax(0px, 450px) minmax(0px, 500px) minmax(0px, 200px)'
        );
        assert.deepStrictEqual(
          getHeaderTextContent(grid),
          ['Last name', 'First name', 'Age']
        );
        assert.deepStrictEqual(
          getContentTextContent(grid),
          [
            ['Bakshi', 'Byomkesh', '42'],
            ['Mitra', 'Pradosh C.', '30'],
            ['Das', 'Ghanyasham', '45'],
          ]
        );

        // changing state is no-op
        app.state = {
          columns: [
            { id: 'age', property: 'age', isResizable: true, direction: null, widthPx: '200px' },
            { id: 'lastName', property: 'lastName', isResizable: true, direction: null, widthPx: '450px' },
            { id: 'firstName', property: 'firstName', isResizable: true, direction: null, widthPx: '500px' },
          ]
        };
        await queue.yield();
        assert.strictEqual(
          container?.style.gridTemplateColumns,
          'minmax(0px, 450px) minmax(0px, 500px) minmax(0px, 200px)'
        );
        assert.deepStrictEqual(
          getHeaderTextContent(grid),
          ['Last name', 'First name', 'Age']
        );
        assert.deepStrictEqual(
          getContentTextContent(grid),
          [
            ['Bakshi', 'Byomkesh', '42'],
            ['Mitra', 'Pradosh C.', '30'],
            ['Das', 'Ghanyasham', '45'],
          ]
        );

        const headers = getHeaders(grid);
        // reordering reflects the change back to the state
        const [colLn, , colAge] = headers.map(header => header.querySelector<HTMLSpanElement>('div>span')!);
        await dragAnDropColumn(colAge, colLn, OrderChangeDropLocation.After, queue);
        assert.strictEqual(
          container?.style.gridTemplateColumns,
          'minmax(0px, 450px) minmax(0px, 200px) minmax(0px, 500px)'
        );
        assert.deepStrictEqual(
          getHeaderTextContent(grid),
          ['Last name', 'Age', 'First name',]
        );
        assert.deepStrictEqual(
          getContentTextContent(grid),
          [
            ['Bakshi', '42', 'Byomkesh',],
            ['Mitra', '30', 'Pradosh C.',],
            ['Das', '45', 'Ghanyasham',],
          ]
        );
        assert.deepStrictEqual(
          app.state,
          {
            columns: [
              { id: 'lastName', property: 'lastName', isResizable: true, direction: null, widthPx: '450px' },
              { id: 'age', property: 'age', isResizable: true, direction: null, widthPx: '200px' },
              { id: 'firstName', property: 'firstName', isResizable: true, direction: null, widthPx: '500px' },
            ]
          }
        );

        // resizing the columns reflects the change back to the state
        const ageCol = headers[2];
        const handle1 = ageCol.querySelector('svg.resize-handle')!;
        assert.isNotNull(handle1);
        const baseEventData = { bubbles: true, cancelable: true };
        handle1.dispatchEvent(new MouseEvent('mousedown', { ...baseEventData }));
        handle1.dispatchEvent(new MouseEvent('mousemove', { ...baseEventData, clientX: ageCol.getBoundingClientRect().right + 50 }));
        await queue.yield();
        handle1.dispatchEvent(new MouseEvent('mouseup', { ...baseEventData }));
        await queue.yield();
        const widths = extractWidths(container!.style.gridTemplateColumns);
        assert.deepStrictEqual(
          app.state,
          {
            columns: [
              { id: 'lastName', property: 'lastName', isResizable: true, direction: null, widthPx: '450px' },
              { id: 'age', property: 'age', isResizable: true, direction: null, widthPx: `${widths[1]}px` },
              { id: 'firstName', property: 'firstName', isResizable: true, direction: null, widthPx: '500px' },
            ]
          }
        );

        // sorting reflects the change back to the state
        const headerContainer = headers[0].querySelector('div')!; // lname
        headerContainer.click();
        await queue.yield();
        assert.deepStrictEqual(
          headers.map(el => el.querySelector('div')?.querySelector('span:nth-of-type(2)')?.textContent ?? null),
          ['\u25B4', null, null]
        );
        assert.deepStrictEqual(
          app.state,
          {
            columns: [
              { id: 'lastName', property: 'lastName', isResizable: true, direction: SortDirection.Ascending, widthPx: '450px' },
              { id: 'age', property: 'age', isResizable: true, direction: null, widthPx: `${widths[1]}px` },
              { id: 'firstName', property: 'firstName', isResizable: true, direction: null, widthPx: '500px' },
            ]
          }
        );
      },
      { component: App as CustomElementType<Constructable<App>> });
  }

  {
    @customElement({
      name: 'my-app',
      template: `<data-grid model.bind="content" hidden-columns.bind="['age']">
        <grid-column property="firstName">
          <header>First name</header>
          \${item.firstName}
        </grid-column>
        <grid-column property="lastName">
          <header>Last name</header>
          \${item.lastName}
        </grid-column>
        <grid-column property="age">
          <header>Age</header>
          \${item.age}
        </grid-column>
      </data-grid>`
    })
    class App implements ICustomElementViewModel {
      public readonly content: ContentModel<Person>;

      public constructor(
        @ILogger logger: ILogger,
      ) {
        logger = logger.scopeTo('App');
        this.content = new ContentModel(
          [
            new Person('Byomkesh', 'Bakshi', 42),
            new Person('Pradosh C.', 'Mitra', 30),
            new Person('Ghanyasham', 'Das', 45),
          ],
          null,
          null,
          () => { /** noop */ },
          logger,
        );
      }
    }

    ($it as $It<App>)('columns can be hidden',
      function ({ host }) {
        const grid = host.querySelector<HTMLElement>('data-grid')!;
        assert.deepStrictEqual(
          getHeaderTextContent(grid),
          ['First name', 'Last name']
        );
        assert.deepStrictEqual(
          getContentTextContent(grid),
          [
            ['Byomkesh', 'Bakshi'],
            ['Pradosh C.', 'Mitra'],
            ['Ghanyasham', 'Das'],
          ]
        );
      },
      { component: App as CustomElementType<Constructable<App>> });
  }

  {
    @customElement({
      name: 'my-app',
      template: `<data-grid model.bind="content">
        <grid-column>
          <header><value-text value="First name"></value-text></header>
          <normal-text value.bind="item.firstName"></normal-text>
        </grid-column>
        <grid-column>
          <header><value-text value="Last name"></value-text></header>
          <normal-text value.bind="item.lastName"></normal-text>
        </grid-column>
      </data-grid>`,
      dependencies: [NormalText, ValueText]
    })
    class App implements ICustomElementViewModel {
      public readonly people: Person[];
      public readonly content: ContentModel<Person>;

      public constructor(
        @ILogger logger: ILogger,
      ) {
        logger = logger.scopeTo('App');
        this.content = new ContentModel(
          this.people = [
            new Person('Byomkesh', 'Bakshi'),
            new Person('Pradosh C.', 'Mitra'),
          ],
          null,
          null,
          null,
          logger,
        );
      }
    }

    ($it as $$It<App>)('respects the locally registered dependencies of parent components',
      function ({ app, host }) {
        const grid = host.querySelector<HTMLElement>('data-grid')!;
        assert.isNotNull(grid);

        const gridVm = CustomElement.for(grid).viewModel as DataGrid;

        const headers = getHeaders(grid);
        assert.strictEqual(headers.length, 2);
        assert.deepStrictEqual(
          headers.map(header => getText(header.querySelector('div>span>value-text'))),
          ['First name', 'Last name']
        );

        const content = getContentRows(grid);
        assert.strictEqual(content.length, 2);
        assert.deepStrictEqual(
          content.map(c => Array.from(c.querySelectorAll('normal-text')).map((el) => getText(el))),
          app.people.map(p => [p.firstName, p.lastName])
        );
        gridVm.exportState();
        assert.isUndefined(gridVm.state);
      },
      { component: App as CustomElementType<Constructable<App>> });
  }
});