import { DI } from '@aurelia/kernel';
import { CustomElement, CustomElementDefinition, ViewFactory } from '@aurelia/runtime-html';
import { createSpy, Spy } from '@netatwork/spy';
import { assert } from 'chai';
import { GridStateModel, Column, ChangeType, GridStateChangeSubscriber } from '../src/grid-state';
import { SortDirection } from '../src/sorting-options';

describe('grid state', function () {
  function createSubscriberSpy(): Spy<GridStateChangeSubscriber> {
    return createSpy({
      handleGridStateChange(..._args: unknown[]) { /* noop */ }
    }, true);
  }

  it('instantiation of column adds it to the parent grid state', function () {
    const state = new GridStateModel();
    const col1 = new Column(
      state,
      'id1',
      null,
      false,
      null,
      false,
      null,
      CustomElementDefinition.create({ name: CustomElement.generateName(), template: '<span>foo1</span>' }),
      CustomElementDefinition.create({ name: CustomElement.generateName(), template: '<span>bar1</span>' }),
    );
    const col2 = new Column(
      state,
      'id2',
      null,
      false,
      null,
      false,
      null,
      CustomElementDefinition.create({ name: CustomElement.generateName(), template: '<span>foo2</span>' }),
      CustomElementDefinition.create({ name: CustomElement.generateName(), template: '<span>bar2</span>' }),
    );
    const columns = state.columns;
    assert.strictEqual(columns.length, 2);
    assert.strictEqual(columns[0], col1);
    assert.strictEqual(columns[1], col2);
  });

  for (const id of [null, undefined, '']) {
    it(`column state cannot be instantiated without id - '${String(id)}'`, function () {
      const state = new GridStateModel();
      assert.throws(
        () => {
          new Column(
            state,
            id!,
            null,
            false,
            null,
            false,
            null,
            CustomElementDefinition.create({ name: CustomElement.generateName(), template: '<span>foo1</span>' }),
            CustomElementDefinition.create({ name: CustomElement.generateName(), template: '<span>bar1</span>' }),
          );
        },
        'Cannot instantiate ColumnState; expected non-null, non-undefined, non-empty string for id.');
    });
  }

  it('column state cannot be instantiated with empty property name', function () {
    const state = new GridStateModel();
    assert.throws(
      () => {
        new Column(
          state,
          'id1',
          '',
          false,
          null,
          false,
          null,
          CustomElementDefinition.create({ name: CustomElement.generateName(), template: '<span>foo1</span>' }),
          CustomElementDefinition.create({ name: CustomElement.generateName(), template: '<span>bar1</span>' }),
        );
      },
      'Cannot instantiate ColumnState; expected non-empty property.');
  });

  it('null property name sets the direction as null', function () {
    const state = new GridStateModel();
    const col = new Column(
      state,
      'id1',
      null,
      false,
      SortDirection.Ascending,
      false,
      null,
      CustomElementDefinition.create({ name: CustomElement.generateName(), template: '<span>foo1</span>' }),
      CustomElementDefinition.create({ name: CustomElement.generateName(), template: '<span>bar1</span>' }),
    );
    assert.strictEqual(col.sortable, false);
    assert.strictEqual(col.direction, null);
  });

  it('non-null property name makes the column sortable', function () {
    const state = new GridStateModel();
    const col = new Column(
      state,
      'id1',
      'prop1',
      false,
      SortDirection.Ascending,
      false,
      null,
      CustomElementDefinition.create({ name: CustomElement.generateName(), template: '<span>foo1</span>' }),
      CustomElementDefinition.create({ name: CustomElement.generateName(), template: '<span>bar1</span>' }),
    );
    assert.strictEqual(col.sortable, true);
    assert.strictEqual(col.direction, SortDirection.Ascending);
  });

  it('createViewFactories creates view factories once', function () {
    const state = new GridStateModel();
    const header = CustomElementDefinition.create({ name: CustomElement.generateName(), template: '<span>foo1</span>' });
    const content = CustomElementDefinition.create({ name: CustomElement.generateName(), template: '<span>bar1</span>' });
    const col = new Column(
      state,
      'id1',
      'prop1',
      false,
      SortDirection.Ascending,
      false,
      null,
      header,
      content,
    );
    assert.isNull(col.headerViewFactory);
    assert.isNull(col.contentViewFactory);

    const container = DI.createContainer();
    col.createViewFactories(container);
    const headerVf = col.headerViewFactory;
    const contentVf = col.contentViewFactory;
    assert.instanceOf(headerVf, ViewFactory);
    assert.instanceOf(contentVf, ViewFactory);
    assert.strictEqual(headerVf?.def, header);
    assert.strictEqual(contentVf?.def, content);
    assert.strictEqual(headerVf?.container, container);
    assert.strictEqual(contentVf?.container, container);

    const child = container.createChild();
    col.createViewFactories(child);
    assert.strictEqual(col.headerViewFactory, headerVf, 'no change was expected - header view-factory');
    assert.strictEqual(col.contentViewFactory, contentVf, 'no change was expected - content view-factory');
  });

  it('tryApplyState applies state when both id and property matches', function () {
    const state = new GridStateModel();
    const col = new Column(
      state,
      'id1',
      'prop1',
      false,
      SortDirection.Ascending,
      false,
      null,
      CustomElementDefinition.create({ name: CustomElement.generateName(), template: '<span>foo1</span>' }),
      CustomElementDefinition.create({ name: CustomElement.generateName(), template: '<span>bar1</span>' }),
    );
    assert.strictEqual(col.direction, SortDirection.Ascending);
    assert.strictEqual(col.widthPx, null);
    assert.strictEqual(col.isResizable, false);

    assert.isTrue(col.tryApplyState({
      id: 'id1',
      property: 'prop1',
      direction: SortDirection.Descending,
      isResizable: true,
      widthPx: '100px'
    }));
    assert.strictEqual(col.direction, SortDirection.Descending);
    assert.strictEqual(col.widthPx, '100px');
    assert.strictEqual(col.isResizable, false);
  });

  it('tryApplyState does not apply state when if id does not match', function () {
    const state = new GridStateModel();
    const col = new Column(
      state,
      'id1',
      'prop1',
      false,
      SortDirection.Ascending,
      false,
      null,
      CustomElementDefinition.create({ name: CustomElement.generateName(), template: '<span>foo1</span>' }),
      CustomElementDefinition.create({ name: CustomElement.generateName(), template: '<span>bar1</span>' }),
    );
    assert.strictEqual(col.direction, SortDirection.Ascending);
    assert.strictEqual(col.widthPx, null);
    assert.strictEqual(col.isResizable, false);

    assert.isFalse(col.tryApplyState({
      id: 'id2',
      property: 'prop1',
      direction: SortDirection.Descending,
      isResizable: true,
      widthPx: '100px'
    }));
    assert.strictEqual(col.direction, SortDirection.Ascending);
    assert.strictEqual(col.widthPx, null);
    assert.strictEqual(col.isResizable, false);
  });

  it('tryApplyState does not apply state when if property does not match', function () {
    const state = new GridStateModel();
    const col = new Column(
      state,
      'id1',
      'prop1',
      false,
      SortDirection.Ascending,
      false,
      null,
      CustomElementDefinition.create({ name: CustomElement.generateName(), template: '<span>foo1</span>' }),
      CustomElementDefinition.create({ name: CustomElement.generateName(), template: '<span>bar1</span>' }),
    );
    assert.strictEqual(col.direction, SortDirection.Ascending);
    assert.strictEqual(col.widthPx, null);
    assert.strictEqual(col.isResizable, false);

    assert.isFalse(col.tryApplyState({
      id: 'id1',
      property: 'prop2',
      direction: SortDirection.Descending,
      isResizable: true,
      widthPx: '100px'
    }));
    assert.strictEqual(col.direction, SortDirection.Ascending);
    assert.strictEqual(col.widthPx, null);
    assert.strictEqual(col.isResizable, false);
  });

  it('exportable column state can be exported', function () {
    const state = new GridStateModel();
    const col = new Column(
      state,
      'id1',
      'prop1',
      true,
      SortDirection.Ascending,
      false,
      null,
      CustomElementDefinition.create({ name: CustomElement.generateName(), template: '<span>foo1</span>' }),
      CustomElementDefinition.create({ name: CustomElement.generateName(), template: '<span>bar1</span>' }),
    );
    assert.strictEqual(col.direction, SortDirection.Ascending);
    assert.strictEqual(col.widthPx, null);
    assert.strictEqual(col.isResizable, false);

    assert.deepStrictEqual(col.export(), {
      id: 'id1',
      property: 'prop1',
      direction: SortDirection.Ascending,
      isResizable: false,
      widthPx: null
    });

    assert.isTrue(col.tryApplyState({
      id: 'id1',
      property: 'prop1',
      direction: SortDirection.Descending,
      isResizable: true,
      widthPx: '100px'
    }));

    assert.deepStrictEqual(col.export(), {
      id: 'id1',
      property: 'prop1',
      direction: SortDirection.Descending,
      isResizable: false,
      widthPx: '100px'
    });
  });

  it('non-exportable column state cannot be exported', function () {
    const state = new GridStateModel();
    const col = new Column(
      state,
      'id1',
      'prop1',
      false,
      SortDirection.Ascending,
      false,
      null,
      CustomElementDefinition.create({ name: CustomElement.generateName(), template: '<span>foo1</span>' }),
      CustomElementDefinition.create({ name: CustomElement.generateName(), template: '<span>bar1</span>' }),
    );
    assert.throws(() => col.export(), 'The column \'id1\' is not exportable.');
  });

  it('column direction can be set using setDirection for sortable column', function () {
    const spy = createSpy(new GridStateModel(), true);
    const col = new Column(
      spy.proxy,
      'id1',
      'prop1',
      false,
      null,
      false,
      null,
      CustomElementDefinition.create({ name: CustomElement.generateName(), template: '<span>foo1</span>' }),
      CustomElementDefinition.create({ name: CustomElement.generateName(), template: '<span>bar1</span>' }),
    );
    assert.isNull(col.direction);

    col.setDirection(SortDirection.Ascending, false);
    assert.strictEqual(col.direction, SortDirection.Ascending);
    spy.isCalled('handleChange', 0);

    col.setDirection(SortDirection.Descending, true);
    assert.strictEqual(col.direction, SortDirection.Descending);
    spy.isCalledWith('handleChange', [[ChangeType.Sort, col] as unknown as Parameters<GridStateModel['handleChange']>]);
  });

  it('column direction cannot be set for un-sortable column', function () {
    const spy = createSpy(new GridStateModel(), true);
    const col = new Column(
      spy.proxy,
      'id1',
      null,
      false,
      null,
      false,
      null,
      CustomElementDefinition.create({ name: CustomElement.generateName(), template: '<span>foo1</span>' }),
      CustomElementDefinition.create({ name: CustomElement.generateName(), template: '<span>bar1</span>' }),
    );
    assert.isNull(col.direction);

    assert.throws(() =>
      col.setDirection(SortDirection.Ascending, false),
      'The column \'id1\' is not sortable.'
    );
    assert.isNull(col.direction);

    assert.throws(() =>
      col.setDirection(SortDirection.Descending, true),
      'The column \'id1\' is not sortable.'
    );
    assert.isNull(col.direction);
  });

  it('state can be applied on the parent GridStateModel as a whole', function () {
    const sut = new GridStateModel();
    new Column(
      sut,
      'id1',
      'prop1',
      true,
      SortDirection.Ascending,
      true,
      null,
      CustomElementDefinition.create({ name: CustomElement.generateName(), template: '<span>foo1</span>' }),
      CustomElementDefinition.create({ name: CustomElement.generateName(), template: '<span>bar1</span>' }),
    );
    new Column(
      sut,
      'id2',
      'prop2',
      true,
      SortDirection.Descending,
      true,
      '100px',
      CustomElementDefinition.create({ name: CustomElement.generateName(), template: '<span>foo2</span>' }),
      CustomElementDefinition.create({ name: CustomElement.generateName(), template: '<span>bar2</span>' }),
    );

    sut.applyState({
      columns: [
        {
          id: 'id1',
          property: 'prop1',
          direction: SortDirection.Descending,
          isResizable: false,
          widthPx: '100px'
        },
        {
          id: 'id2',
          property: 'prop2',
          direction: SortDirection.Ascending,
          isResizable: false,
          widthPx: '200px'
        },
      ]
    });

    assert.deepStrictEqual(sut.export(), {
      columns: [
        {
          id: 'id1',
          property: 'prop1',
          direction: SortDirection.Descending,
          isResizable: true,
          widthPx: '100px'
        },
        {
          id: 'id2',
          property: 'prop2',
          direction: SortDirection.Ascending,
          isResizable: true,
          widthPx: '200px'
        },
      ]
    });
  });

  it('GridStateModel#applyState ignores unknown columns', function () {
    const sut = new GridStateModel();
    new Column(
      sut,
      'id1',
      'prop1',
      true,
      SortDirection.Ascending,
      true,
      null,
      CustomElementDefinition.create({ name: CustomElement.generateName(), template: '<span>foo1</span>' }),
      CustomElementDefinition.create({ name: CustomElement.generateName(), template: '<span>bar1</span>' }),
    );
    new Column(
      sut,
      'id2',
      'prop2',
      true,
      SortDirection.Descending,
      true,
      '100px',
      CustomElementDefinition.create({ name: CustomElement.generateName(), template: '<span>foo2</span>' }),
      CustomElementDefinition.create({ name: CustomElement.generateName(), template: '<span>bar2</span>' }),
    );

    sut.applyState({
      columns: [
        {
          id: 'id1',
          property: 'prop1',
          direction: SortDirection.Descending,
          isResizable: false,
          widthPx: '100px'
        },
        {
          id: 'unknown',
          property: 'prop2',
          direction: SortDirection.Ascending,
          isResizable: false,
          widthPx: '200px'
        },
      ]
    });

    assert.deepStrictEqual(sut.export(), {
      columns: [
        {
          id: 'id1',
          property: 'prop1',
          direction: SortDirection.Descending,
          isResizable: true,
          widthPx: '100px'
        },
        {
          id: 'id2',
          property: 'prop2',
          direction: SortDirection.Descending,
          isResizable: true,
          widthPx: '100px'
        },
      ]
    });
  });

  it('GridStateModel#applyState rearranges columns as per the given state - #1', function () {
    const sut = new GridStateModel();
    new Column(
      sut,
      'id1',
      'prop1',
      true,
      SortDirection.Ascending,
      true,
      null,
      CustomElementDefinition.create({ name: CustomElement.generateName(), template: '<span>foo1</span>' }),
      CustomElementDefinition.create({ name: CustomElement.generateName(), template: '<span>bar1</span>' }),
    );
    new Column(
      sut,
      'id2',
      'prop2',
      true,
      SortDirection.Descending,
      true,
      '100px',
      CustomElementDefinition.create({ name: CustomElement.generateName(), template: '<span>foo2</span>' }),
      CustomElementDefinition.create({ name: CustomElement.generateName(), template: '<span>bar2</span>' }),
    );

    sut.applyState({
      columns: [
        {
          id: 'id2',
          property: 'prop2',
          direction: SortDirection.Ascending,
          isResizable: false,
          widthPx: '200px'
        },
        {
          id: 'id1',
          property: 'prop1',
          direction: SortDirection.Descending,
          isResizable: false,
          widthPx: '100px'
        },
      ]
    });

    assert.deepStrictEqual(sut.export(), {
      columns: [
        {
          id: 'id2',
          property: 'prop2',
          direction: SortDirection.Ascending,
          isResizable: true,
          widthPx: '200px'
        },
        {
          id: 'id1',
          property: 'prop1',
          direction: SortDirection.Descending,
          isResizable: true,
          widthPx: '100px'
        },
      ]
    });

    assert.deepStrictEqual(sut.columns.map(c => c.id), ['id2', 'id1']);
  });

  it('GridStateModel#applyState rearranges columns as per the given state - #2', function () {
    const sut = new GridStateModel();
    new Column(
      sut,
      'id1',
      'prop1',
      true,
      SortDirection.Ascending,
      true,
      null,
      CustomElementDefinition.create({ name: CustomElement.generateName(), template: '<span>foo1</span>' }),
      CustomElementDefinition.create({ name: CustomElement.generateName(), template: '<span>bar1</span>' }),
    );
    new Column(
      sut,
      'id2',
      'prop2',
      true,
      SortDirection.Descending,
      true,
      '100px',
      CustomElementDefinition.create({ name: CustomElement.generateName(), template: '<span>foo2</span>' }),
      CustomElementDefinition.create({ name: CustomElement.generateName(), template: '<span>bar2</span>' }),
    );
    new Column(
      sut,
      'id3',
      'prop3',
      true,
      SortDirection.Descending,
      true,
      '150px',
      CustomElementDefinition.create({ name: CustomElement.generateName(), template: '<span>foo2</span>' }),
      CustomElementDefinition.create({ name: CustomElement.generateName(), template: '<span>bar2</span>' }),
    );

    sut.applyState({
      columns: [
        {
          id: 'id2',
          property: 'prop2',
          direction: SortDirection.Ascending,
          isResizable: false,
          widthPx: '200px'
        },
        {
          id: 'id3',
          property: 'prop3',
          direction: SortDirection.Ascending,
          isResizable: false,
          widthPx: '250px'
        },
        {
          id: 'id1',
          property: 'prop1',
          direction: SortDirection.Descending,
          isResizable: false,
          widthPx: '100px'
        },
      ]
    });

    assert.deepStrictEqual(sut.export(), {
      columns: [
        {
          id: 'id2',
          property: 'prop2',
          direction: SortDirection.Ascending,
          isResizable: true,
          widthPx: '200px'
        },
        {
          id: 'id3',
          property: 'prop3',
          direction: SortDirection.Ascending,
          isResizable: true,
          widthPx: '250px'
        },
        {
          id: 'id1',
          property: 'prop1',
          direction: SortDirection.Descending,
          isResizable: true,
          widthPx: '100px'
        },
      ]
    });

    assert.deepStrictEqual(sut.columns.map(c => c.id), ['id2', 'id3', 'id1']);
  });

  it('GridStateModel#applyState can work with columns not provided in the state', function () {
    const sut = new GridStateModel();
    new Column(
      sut,
      'id1',
      'prop1',
      true,
      SortDirection.Ascending,
      true,
      null,
      CustomElementDefinition.create({ name: CustomElement.generateName(), template: '<span>foo1</span>' }),
      CustomElementDefinition.create({ name: CustomElement.generateName(), template: '<span>bar1</span>' }),
    );
    new Column(
      sut,
      'id2',
      'prop2',
      true,
      SortDirection.Descending,
      true,
      '100px',
      CustomElementDefinition.create({ name: CustomElement.generateName(), template: '<span>foo2</span>' }),
      CustomElementDefinition.create({ name: CustomElement.generateName(), template: '<span>bar2</span>' }),
    );
    new Column(
      sut,
      'id3',
      'prop3',
      true,
      SortDirection.Descending,
      true,
      '150px',
      CustomElementDefinition.create({ name: CustomElement.generateName(), template: '<span>foo2</span>' }),
      CustomElementDefinition.create({ name: CustomElement.generateName(), template: '<span>bar2</span>' }),
    );

    sut.applyState({
      columns: [
        {
          id: 'id2',
          property: 'prop2',
          direction: SortDirection.Ascending,
          isResizable: false,
          widthPx: '200px'
        },
        {
          id: 'id1',
          property: 'prop1',
          direction: SortDirection.Descending,
          isResizable: false,
          widthPx: '100px'
        },
      ]
    });

    assert.deepStrictEqual(sut.export(), {
      columns: [
        {
          id: 'id2',
          property: 'prop2',
          direction: SortDirection.Ascending,
          isResizable: true,
          widthPx: '200px'
        },
        {
          id: 'id1',
          property: 'prop1',
          direction: SortDirection.Descending,
          isResizable: true,
          widthPx: '100px'
        },
        {
          id: 'id3',
          property: 'prop3',
          direction: SortDirection.Descending,
          isResizable: true,
          widthPx: '150px'
        },
      ]
    });

    assert.deepStrictEqual(sut.columns.map(c => c.id), ['id2', 'id1', 'id3']);
  });

  it('GridStateModel#createViewFactories creates view factories for all columns', function () {
    const sut = new GridStateModel();
    new Column(
      sut,
      'id1',
      'prop1',
      true,
      SortDirection.Ascending,
      true,
      null,
      CustomElementDefinition.create({ name: CustomElement.generateName(), template: '<span>foo1</span>' }),
      CustomElementDefinition.create({ name: CustomElement.generateName(), template: '<span>bar1</span>' }),
    );
    new Column(
      sut,
      'id2',
      'prop2',
      true,
      SortDirection.Descending,
      true,
      '100px',
      CustomElementDefinition.create({ name: CustomElement.generateName(), template: '<span>foo2</span>' }),
      CustomElementDefinition.create({ name: CustomElement.generateName(), template: '<span>bar2</span>' }),
    );

    const container = DI.createContainer();
    sut.createViewFactories(container);
    const factories = sut.columns.flatMap(c => [c.headerViewFactory, c.contentViewFactory]);
    assert.strictEqual(factories.length, 4);
    assert.isTrue(factories.every(f => f instanceof ViewFactory));

    const child = container.createChild();
    sut.createViewFactories(child);
    const factories1 = sut.columns.flatMap(c => [c.headerViewFactory, c.contentViewFactory]);
    assert.isTrue(factories1.every((f, i) => Object.is(f, factories[i])));
  });

  it('GridStateModel#hideColumns marks columns as hidden', function () {
    const sut = new GridStateModel();
    new Column(
      sut,
      'id1',
      'prop1',
      true,
      SortDirection.Ascending,
      true,
      null,
      CustomElementDefinition.create({ name: CustomElement.generateName(), template: '<span>foo1</span>' }),
      CustomElementDefinition.create({ name: CustomElement.generateName(), template: '<span>bar1</span>' }),
    );
    new Column(
      sut,
      'id2',
      'prop2',
      true,
      SortDirection.Descending,
      true,
      '100px',
      CustomElementDefinition.create({ name: CustomElement.generateName(), template: '<span>foo2</span>' }),
      CustomElementDefinition.create({ name: CustomElement.generateName(), template: '<span>bar2</span>' }),
    );
    new Column(
      sut,
      'id3',
      'prop3',
      true,
      SortDirection.Ascending,
      true,
      '150px',
      CustomElementDefinition.create({ name: CustomElement.generateName(), template: '<span>foo2</span>' }),
      CustomElementDefinition.create({ name: CustomElement.generateName(), template: '<span>bar2</span>' }),
    );

    assert.deepStrictEqual(sut.columns.map(c => c.hidden), [false, false, false]);

    sut.hideColumns(null!);
    assert.deepStrictEqual(sut.columns.map(c => c.hidden), [false, false, false]);

    sut.hideColumns(undefined!);
    assert.deepStrictEqual(sut.columns.map(c => c.hidden), [false, false, false]);

    sut.hideColumns([]);
    assert.deepStrictEqual(sut.columns.map(c => c.hidden), [false, false, false]);

    sut.hideColumns(['id2', 'id4']);
    assert.deepStrictEqual(sut.columns.map(c => c.hidden), [false, true, false]);
  });

  it('GridStateModel#initializeActiveSortOptions sets the active sort options from the first column with sort direction set', function () {
    const sut = new GridStateModel();
    new Column(
      sut,
      'id1',
      'prop1',
      true,
      null,
      true,
      null,
      CustomElementDefinition.create({ name: CustomElement.generateName(), template: '<span>foo1</span>' }),
      CustomElementDefinition.create({ name: CustomElement.generateName(), template: '<span>bar1</span>' }),
    );
    new Column(
      sut,
      'id2',
      'prop2',
      true,
      SortDirection.Descending,
      true,
      '100px',
      CustomElementDefinition.create({ name: CustomElement.generateName(), template: '<span>foo2</span>' }),
      CustomElementDefinition.create({ name: CustomElement.generateName(), template: '<span>bar2</span>' }),
    );
    new Column(
      sut,
      'id3',
      'prop3',
      true,
      SortDirection.Ascending,
      true,
      '150px',
      CustomElementDefinition.create({ name: CustomElement.generateName(), template: '<span>foo2</span>' }),
      CustomElementDefinition.create({ name: CustomElement.generateName(), template: '<span>bar2</span>' }),
    );

    const options = sut.initializeActiveSortOptions();
    assert.strictEqual(options, sut.activeSortOptions);
    assert.deepStrictEqual(sut.activeSortOptions, { property: 'prop2', direction: SortDirection.Descending });
  });

  it('GridStateModel#initializeActiveSortOptions cannot set the active sort options if sort direction set is not set for any column', function () {
    const sut = new GridStateModel();
    new Column(
      sut,
      'id1',
      'prop1',
      true,
      null,
      true,
      null,
      CustomElementDefinition.create({ name: CustomElement.generateName(), template: '<span>foo1</span>' }),
      CustomElementDefinition.create({ name: CustomElement.generateName(), template: '<span>bar1</span>' }),
    );
    new Column(
      sut,
      'id2',
      'prop2',
      true,
      null,
      true,
      '100px',
      CustomElementDefinition.create({ name: CustomElement.generateName(), template: '<span>foo2</span>' }),
      CustomElementDefinition.create({ name: CustomElement.generateName(), template: '<span>bar2</span>' }),
    );
    new Column(
      sut,
      'id3',
      'prop3',
      true,
      null,
      true,
      '150px',
      CustomElementDefinition.create({ name: CustomElement.generateName(), template: '<span>foo2</span>' }),
      CustomElementDefinition.create({ name: CustomElement.generateName(), template: '<span>bar2</span>' }),
    );

    assert.isNull(sut.initializeActiveSortOptions());
    assert.isNull(sut.activeSortOptions);
  });

  it('subscribers are notified correctly for width change', function () {
    const spy1 = createSubscriberSpy();
    const spy2 = createSubscriberSpy();

    const sut = new GridStateModel();
    new Column(
      sut,
      'id1',
      'prop1',
      true,
      null,
      true,
      null,
      CustomElementDefinition.create({ name: CustomElement.generateName(), template: '<span>foo1</span>' }),
      CustomElementDefinition.create({ name: CustomElement.generateName(), template: '<span>bar1</span>' }),
    );
    new Column(
      sut,
      'id2',
      'prop2',
      true,
      null,
      true,
      '100px',
      CustomElementDefinition.create({ name: CustomElement.generateName(), template: '<span>foo2</span>' }),
      CustomElementDefinition.create({ name: CustomElement.generateName(), template: '<span>bar2</span>' }),
    );

    spy1.isCalled('handleGridStateChange', 0);
    spy2.isCalled('handleGridStateChange', 0);

    const subscriber1 = spy1.proxy;
    const subscriber2 = spy2.proxy;
    sut.addSubscriber(subscriber1);
    sut.addSubscriber(subscriber2);

    sut.handleChange(ChangeType.Width);

    spy1.isCalledWith('handleGridStateChange', [[ChangeType.Width, undefined, undefined]]);
    spy2.isCalledWith('handleGridStateChange', [[ChangeType.Width, undefined, undefined]]);

    sut.removeSubscriber(subscriber1);

    spy1.clearCallRecords();
    spy2.clearCallRecords();
    sut.handleChange(ChangeType.Width);

    spy1.isCalled('handleGridStateChange', 0);
    spy2.isCalledWith('handleGridStateChange', [[ChangeType.Width, undefined, undefined]]);

    sut.removeSubscriber(subscriber1); // <-- works as well
    sut.removeSubscriber(subscriber2);

    spy2.clearCallRecords();
    sut.handleChange(ChangeType.Width);

    spy1.isCalled('handleGridStateChange', 0);
    spy2.isCalled('handleGridStateChange', 0);
  });

  it('subscribers are notified correctly for sorting options change - with initialized sorting options', function () {
    const spy1 = createSubscriberSpy();
    const spy2 = createSubscriberSpy();

    const sut = new GridStateModel();
    const col1 = new Column(
      sut,
      'id1',
      'prop1',
      true,
      null,
      true,
      null,
      CustomElementDefinition.create({ name: CustomElement.generateName(), template: '<span>foo1</span>' }),
      CustomElementDefinition.create({ name: CustomElement.generateName(), template: '<span>bar1</span>' }),
    );
    const col2 = new Column(
      sut,
      'id2',
      'prop2',
      true,
      SortDirection.Ascending,
      true,
      '100px',
      CustomElementDefinition.create({ name: CustomElement.generateName(), template: '<span>foo2</span>' }),
      CustomElementDefinition.create({ name: CustomElement.generateName(), template: '<span>bar2</span>' }),
    );

    sut.initializeActiveSortOptions();

    const subscriber1 = spy1.proxy;
    const subscriber2 = spy2.proxy;
    sut.addSubscriber(subscriber1);
    sut.addSubscriber(subscriber2);

    // act - 1
    col1.setDirection(SortDirection.Ascending, true);

    spy1.isCalledWith(
      'handleGridStateChange',
      [[
        ChangeType.Sort,
        { property: 'prop1', direction: SortDirection.Ascending },
        { property: 'prop2', direction: SortDirection.Ascending },
      ]]
    );
    spy2.isCalledWith(
      'handleGridStateChange',
      [[
        ChangeType.Sort,
        { property: 'prop1', direction: SortDirection.Ascending },
        { property: 'prop2', direction: SortDirection.Ascending },
      ]]
    );
    assert.isNull(col2.direction);

    // act - 2
    spy1.clearCallRecords();
    spy2.clearCallRecords();
    col1.setDirection(SortDirection.Descending, true);

    spy1.isCalledWith(
      'handleGridStateChange',
      [[
        ChangeType.Sort,
        { property: 'prop1', direction: SortDirection.Descending },
        { property: 'prop1', direction: SortDirection.Ascending },
      ]]
    );
    spy2.isCalledWith(
      'handleGridStateChange',
      [[
        ChangeType.Sort,
        { property: 'prop1', direction: SortDirection.Descending },
        { property: 'prop1', direction: SortDirection.Ascending },
      ]]
    );

    // act - 3 with one subscriber
    sut.removeSubscriber(subscriber1);

    spy1.clearCallRecords();
    spy2.clearCallRecords();
    col2.setDirection(SortDirection.Descending, true);

    spy1.isCalled('handleGridStateChange', 0);
    spy2.isCalledWith(
      'handleGridStateChange',
      [[
        ChangeType.Sort,
        { property: 'prop2', direction: SortDirection.Descending },
        { property: 'prop1', direction: SortDirection.Descending },
      ]]
    );
    assert.isNull(col1.direction);

    // act - 4 no subscribers
    sut.removeSubscriber(subscriber1); // <-- works
    sut.removeSubscriber(subscriber2);

    spy2.clearCallRecords();
    col2.setDirection(SortDirection.Ascending, true);

    spy1.isCalled('handleGridStateChange', 0);
    spy2.isCalled('handleGridStateChange', 0);
  });

  it('subscribers are notified correctly for sorting options change - without initialized sorting options', function () {
    const spy1 = createSubscriberSpy();
    const spy2 = createSubscriberSpy();

    const sut = new GridStateModel();
    const col1 = new Column(
      sut,
      'id1',
      'prop1',
      true,
      null,
      true,
      null,
      CustomElementDefinition.create({ name: CustomElement.generateName(), template: '<span>foo1</span>' }),
      CustomElementDefinition.create({ name: CustomElement.generateName(), template: '<span>bar1</span>' }),
    );
    new Column(
      sut,
      'id2',
      'prop2',
      true,
      null,
      true,
      '100px',
      CustomElementDefinition.create({ name: CustomElement.generateName(), template: '<span>foo2</span>' }),
      CustomElementDefinition.create({ name: CustomElement.generateName(), template: '<span>bar2</span>' }),
    );

    const subscriber1 = spy1.proxy;
    const subscriber2 = spy2.proxy;
    sut.addSubscriber(subscriber1);
    sut.addSubscriber(subscriber2);

    // act - 1
    col1.setDirection(SortDirection.Ascending, true);

    spy1.isCalledWith(
      'handleGridStateChange',
      [[
        ChangeType.Sort,
        { property: 'prop1', direction: SortDirection.Ascending },
        null,
      ]]
    );
    spy2.isCalledWith(
      'handleGridStateChange',
      [[
        ChangeType.Sort,
        { property: 'prop1', direction: SortDirection.Ascending },
        null,
      ]]
    );
  });
});