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
});