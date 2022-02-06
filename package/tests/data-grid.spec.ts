import { ILogger, Registration } from '@aurelia/kernel';
import { Aurelia, BrowserPlatform, CustomElement, customElement, IPlatform, StandardConfiguration } from '@aurelia/runtime-html';
import { TestContext } from '@aurelia/testing';
import { assert } from 'chai';
import { DataGridConfiguration } from '../src/configuration';
import { ContentModel } from '../src/content-model';
import { DataGrid } from '../src/data-grid';
import { getContent, getHeaders } from '../src/test-helpers';
import { $It, createSpecFunction, Person, TestFunction, TestSetupContext, WrapperFunction } from './shared';


describe('data-grid', function () {
  async function runTest<TApp>(
    testFunction: TestFunction<TApp>,
    {
      component,
    }: Partial<TestSetupContext<TApp>> = {}
  ): Promise<void> {
    const platform = new BrowserPlatform(window);
    const ctx = TestContext.create();
    const container = ctx.container;
    container.register(
      Registration.instance(IPlatform, platform),
      StandardConfiguration,
      DataGridConfiguration,
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

  const $it = createSpecFunction(runTest as WrapperFunction<any>);
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

        const content = getContent(grid);
        assert.strictEqual(content.length, 2);
        assert.deepStrictEqual(
          content.map(c => Array.from(c.querySelectorAll('span')).map(el => el.textContent!)),
          app.people.map(p => [p.firstName, p.lastName])
        );
      },
      { component: App });
  }
});