import { DI } from '@aurelia/kernel';
import { CustomElement, CustomElementDefinition, ViewFactory } from '@aurelia/runtime-html';
import { createSpy } from '@netatwork/spy';
import { assert } from 'chai';
import { GridStateModel, Column, ChangeType } from '../src/grid-state';
import { SortDirection } from '../src/sorting-options';

describe('grid state', function () {
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

});