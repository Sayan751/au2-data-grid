import {
  ILogger,
  Registration,
} from '@aurelia/kernel';
import {
  Aurelia,
  bindable,
  BrowserPlatform,
  CustomElement,
  customElement,
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
  getContentRows,
  getHeaders,
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
  interface TestSetupContext<TApp> extends $TestSetupContext<TApp> {
    registrations: any[];
  }
  async function runTest<TApp>(
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
  type $$It<TApp> = $It<TApp, $TestContext<TApp>, TestSetupContext<TApp>>;

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
    class App {
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
      { component: App });
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
    class App {
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
        assert.instanceOf(gridVm, DataGrid);

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
      { component: App });
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
    class App {
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
        assert.instanceOf(gridVm, DataGrid);

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
      { component: App, registrations: [NormalText, ValueText] });
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
    class App {
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
      { component: App });
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
    class App {
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
      { component: App });
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
    class App {
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
        const gridVm = CustomElement.for(grid).viewModel as DataGrid;
        assert.instanceOf(gridVm, DataGrid);

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
      { component: App });
  }

  for (const selectionOptions of [null, { mode: ItemSelectionMode.None }, { mode: ItemSelectionMode.None, onSelectionChange(): void { throw new Error('unexpected callback'); } }]) {
    @customElement({
      name: 'my-app',
      template: `<data-grid model.bind="content" item-clicked.call="logItemClick($event.item, $event.index)" >
        <grid-column id='firstName'>
          \${item.firstName}
        </grid-column>
        <grid-column id='lastName'>
          \${item.lastName}
        </grid-column>
      </data-grid>`
    })
    class App {
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
        const gridVm = CustomElement.for(grid).viewModel as DataGrid;
        assert.instanceOf(gridVm, DataGrid);

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
      { component: App });
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
    class App {
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
        const gridVm = CustomElement.for(grid).viewModel as DataGrid;
        assert.instanceOf(gridVm, DataGrid);

        const content = getContentRows(grid);
        try {
          content[0].click();
          content[1].click();
        } catch (e) {
          assert.fail((e as Error).message);
        }
      },
      { component: App });
  }

  {
    @customElement({
      name: 'my-app',
      template: `<data-grid model.bind="content" item-clicked.call="logItemClick($event.item, $event.index)" >
        <grid-column id='firstName'>
          \${item.firstName}
        </grid-column>
        <grid-column id='lastName'>
          \${item.lastName}
        </grid-column>
      </data-grid>`
    })
    class App {
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
        const gridVm = CustomElement.for(grid).viewModel as DataGrid;
        assert.instanceOf(gridVm, DataGrid);

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
      { component: App });

    ($it as $It<App>)('calls back the bound item-clicked on dblclick with single-selection mode',
      function ({ app, host }) {
        const grid = host.querySelector<HTMLElement>('data-grid')!;
        const gridVm = CustomElement.for(grid).viewModel as DataGrid;
        assert.instanceOf(gridVm, DataGrid);

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
      { component: App });

    ($it as $It<App>)('removes text selection on click with single-selection mode',
      function ({ host }) {
        const grid = host.querySelector<HTMLElement>('data-grid')!;
        const gridVm = CustomElement.for(grid).viewModel as DataGrid;
        assert.instanceOf(gridVm, DataGrid);

        const content = getContentRows(grid);
        const selection = getSelection();
        const range = document.createRange();
        range.selectNodeContents(content[0].querySelector('div')!);
        selection?.addRange(range);
        assert.notEqual(selection?.toString() ?? '', '');
        content[0].click();
        assert.equal(selection?.toString() ?? '', '');
      },
      { component: App });

    ($it as $It<App>)('removes text selection on dblclick with single-selection mode',
      function ({ host }) {
        const grid = host.querySelector<HTMLElement>('data-grid')!;
        const gridVm = CustomElement.for(grid).viewModel as DataGrid;
        assert.instanceOf(gridVm, DataGrid);

        const content = getContentRows(grid);
        const selection = getSelection();
        const range = document.createRange();
        range.selectNodeContents(content[0].querySelector('div')!);
        selection?.addRange(range);
        assert.notEqual(selection?.toString() ?? '', '');
        content[0].dispatchEvent(new Event('dblclick', { bubbles: true, cancelable: true }));
        assert.equal(selection?.toString() ?? '', '');
      },
      { component: App });
  }

  {
    @customElement({
      name: 'my-app',
      template: `<data-grid model.bind="content" item-clicked.call="logItemClick($event.item, $event.index)" >
        <grid-column id='firstName'>
          \${item.firstName}
        </grid-column>
        <grid-column id='lastName'>
          \${item.lastName}
        </grid-column>
      </data-grid>`
    })
    class App {
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
        const gridVm = CustomElement.for(grid).viewModel as DataGrid;
        assert.instanceOf(gridVm, DataGrid);

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
      { component: App });

    ($it as $It<App>)('selects a range of items on click followed by shift+click with multiple-selection mode - 2',
      async function ({ app, host, platform }) {
        const grid = host.querySelector<HTMLElement>('data-grid')!;
        const gridVm = CustomElement.for(grid).viewModel as DataGrid;
        assert.instanceOf(gridVm, DataGrid);

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
      { component: App });

    ($it as $It<App>)('selects a range of items on click followed by shift+click with multiple-selection mode - 3',
      async function ({ app, host, platform }) {
        const grid = host.querySelector<HTMLElement>('data-grid')!;
        const gridVm = CustomElement.for(grid).viewModel as DataGrid;
        assert.instanceOf(gridVm, DataGrid);

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
      { component: App });

    ($it as $It<App>)('selects multiple individual items on ctrl+click with multiple-selection mode',
      async function ({ app, host, platform }) {
        const grid = host.querySelector<HTMLElement>('data-grid')!;
        const gridVm = CustomElement.for(grid).viewModel as DataGrid;
        assert.instanceOf(gridVm, DataGrid);

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
      { component: App });

    ($it as $It<App>)('selects a range of items on shift+click followed by shift+click with multiple-selection mode',
      async function ({ app, host, platform }) {
        const grid = host.querySelector<HTMLElement>('data-grid')!;
        const gridVm = CustomElement.for(grid).viewModel as DataGrid;
        assert.instanceOf(gridVm, DataGrid);

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
      { component: App });

    ($it as $It<App>)('selects multiple items with shift+click combined with ctrl+click with multiple-selection mode',
      async function ({ app, host, platform }) {
        const grid = host.querySelector<HTMLElement>('data-grid')!;
        const gridVm = CustomElement.for(grid).viewModel as DataGrid;
        assert.instanceOf(gridVm, DataGrid);

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
      { component: App });

    ($it as $It<App>)('toggles selection with ctrl+click with multiple-selection mode',
      async function ({ app, host, platform }) {
        const grid = host.querySelector<HTMLElement>('data-grid')!;
        const gridVm = CustomElement.for(grid).viewModel as DataGrid;
        assert.instanceOf(gridVm, DataGrid);

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
      { component: App });

    // eslint-disable-next-line @typescript-eslint/naming-convention
    for (const [ctrlKey, shiftKey] of [[true, false], [false, true], [true, true]]) {
      ($it as $It<App>)(`removes text selection on click with multi-selection mode - ctrlKey: ${ctrlKey} - shiftKey: ${shiftKey}`,
        function ({ host }) {
          const grid = host.querySelector<HTMLElement>('data-grid')!;
          const gridVm = CustomElement.for(grid).viewModel as DataGrid;
          assert.instanceOf(gridVm, DataGrid);

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
        { component: App });

      ($it as $It<App>)(`removes text selection on dblclick with multi-selection mode - ctrlKey: ${ctrlKey} - shiftKey: ${shiftKey}`,
        function ({ host }) {
          const grid = host.querySelector<HTMLElement>('data-grid')!;
          const gridVm = CustomElement.for(grid).viewModel as DataGrid;
          assert.instanceOf(gridVm, DataGrid);

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
        { component: App });
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
    class App {
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
        const gridVm = CustomElement.for(grid).viewModel as DataGrid;
        assert.instanceOf(gridVm, DataGrid);

        const content = getContentRows(grid);
        try {
          content[0].dispatchEvent(new Event('dblclick', { bubbles: true, cancelable: true }));
          const selectionLog = app.selectionLog;
          assert.strictEqual(selectionLog.length, 0, 'selectionLog');
        } catch (e) {
          assert.fail((e as Error).message);
        }
      },
      { component: App });
  }
});