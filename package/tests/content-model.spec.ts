import { DI, ILogger, LoggerConfiguration } from '@aurelia/kernel';
import { AssertionFactory, createSpy, Spy } from '@netatwork/spy';
import { assert } from 'chai';
import { ContentModel, ItemSelectionMode, SelectionOptions } from '../src/content-model';
import { SortDirection, SortOption } from '../src/sorting-options';

// eslint-disable-next-line mocha/no-hooks
before(async function () {
  await AssertionFactory.configureDefault();
});

describe('content-model', function () {

  function getLogger(): [Spy<ILogger>, ILogger] {
    const container = DI.createContainer();
    container.register(LoggerConfiguration);
    const spy: Spy<ILogger> = createSpy(container.get(ILogger), true, {
      scopeTo(_: string) { return spy.proxy; }
    });
    return [spy, spy.proxy];
  }

  it('cannot be instantiated without either all-items or paging', function () {
    assert.throws(() =>
      new ContentModel(
        null,
        null,
        null,
        null,
        getLogger()[1],
      ),
      'Either allItems or pagingOptions is required.'
    );
  });

  for (const allItems of [
    [],
    [{ p: 1 }, { p: 2 }]
  ]) {
    it(`can be instantiated with all-items and without paging - all-items length ${allItems.length}`, function () {
      const sut = new ContentModel(
        allItems,
        null,
        null,
        null,
        getLogger()[1],
      );
      assert.strictEqual(sut.allItems, allItems);
      assert.strictEqual(sut.currentPage, allItems);
      assert.strictEqual(sut.totalCount, allItems.length);
      assert.strictEqual(sut.currentPageNumber, 0);
      assert.strictEqual(sut.selectionMode, ItemSelectionMode.None);
      assert.isUndefined(sut.pageCount);
    });
  }

  for (const pageSize of [undefined, 20]) {
    it(`can be instantiated without all-items and with synchronous paging options - pageSize: ${String(pageSize)}`, async function () {
      // const page: unknown[] = [{ a: 1 }];
      const totalCount = 100;
      const spy = createSpy({
        fetchPage(currentPage: number, $pageSize: number, _model: ContentModel<unknown>): unknown[] {
          return [{ a: currentPage, b: $pageSize }];
        },
        fetchCount(_: ContentModel<unknown>): number {
          return totalCount;
        },
        pageSize
      }, true);
      const sut = new ContentModel(
        null,
        spy.proxy,
        null,
        null,
        getLogger()[1],
      );
      assert.isNull(sut.allItems);
      await sut.refresh();
      assert.deepStrictEqual(sut.currentPage, [{ a: 1, b: pageSize ?? 50 }], 'currentPage');
      assert.strictEqual(sut.totalCount, totalCount, 'totalCount');
      assert.strictEqual(sut.currentPageNumber, 1, 'currentPageNumber');
      assert.strictEqual(sut.selectionMode, ItemSelectionMode.None, 'selectionMode');
      assert.strictEqual(sut.pageCount, totalCount / (pageSize ?? 50), 'pageCount'); // default page size is 50
      spy.isCalledWith('fetchPage', [[1, pageSize ?? 50, sut]]);
      spy.isCalledWith('fetchCount', [[sut]]);

      sut.setCurrentPageNumber(3);
      assert.deepStrictEqual(sut.currentPage, [{ a: 3, b: pageSize ?? 50 }], 'currentPage');
      spy.isCalled('fetchPage', 2);
      spy.isCalled('fetchCount', 2);

      sut.goToNextPage();
      assert.deepStrictEqual(sut.currentPage, [{ a: 4, b: pageSize ?? 50 }], 'currentPage');
      spy.isCalled('fetchPage', 3);
      spy.isCalled('fetchCount', 3);

      sut.goToPreviousPage();
      assert.deepStrictEqual(sut.currentPage, [{ a: 3, b: pageSize ?? 50 }], 'currentPage');
      spy.isCalled('fetchPage', 4);
      spy.isCalled('fetchCount', 4);
    });

    it(`can be instantiated without all-items and with asynchronous paging options - pageSize: ${String(pageSize)}`, async function () {
      const totalCount = 100;
      const spy = createSpy({
        async fetchPage(currentPage: number, _pageSize: number, _model: ContentModel<unknown>): Promise<unknown[]> {
          return new Promise((res) => {
            setTimeout(() => { res([{ a: currentPage }]); }, 15);
          });
        },
        async fetchCount(_: ContentModel<unknown>): Promise<number> {
          return new Promise((res) => {
            setTimeout(() => { res(totalCount); }, 10);
          });
        },
        pageSize
      }, true);
      const sut = new ContentModel(
        null,
        spy.proxy,
        null,
        null,
        getLogger()[1],
      );
      assert.isNull(sut.allItems);
      await sut.refresh();
      assert.deepStrictEqual(sut.currentPage, [{ a: 1 }], 'currentPage');
      assert.strictEqual(sut.totalCount, totalCount, 'totalCount');
      assert.strictEqual(sut.currentPageNumber, 1, 'currentPageNumber');
      assert.strictEqual(sut.selectionMode, ItemSelectionMode.None, 'selectionMode');
      assert.strictEqual(sut.pageCount, totalCount / (pageSize ?? 50), 'pageCount'); // default page size is 50
      spy.isCalledWith('fetchPage', [[1, pageSize ?? 50, sut]]);
      spy.isCalledWith('fetchCount', [[sut]]);

      sut.setCurrentPageNumber(3);
      await sut.wait();
      assert.strictEqual(sut.currentPageNumber, 3, 'currentPageNumber');
      assert.deepStrictEqual(sut.currentPage, [{ a: 3 }], 'currentPage');
      spy.isCalled('fetchPage', 2);
      spy.isCalled('fetchCount', 2);

      sut.goToNextPage();
      await sut.wait();
      assert.strictEqual(sut.currentPageNumber, 4, 'currentPageNumber');
      assert.deepStrictEqual(sut.currentPage, [{ a: 4 }], 'currentPage');
      spy.isCalled('fetchPage', 3);
      spy.isCalled('fetchCount', 3);

      sut.goToPreviousPage();
      await sut.wait();
      assert.strictEqual(sut.currentPageNumber, 3, 'currentPageNumber');
      assert.deepStrictEqual(sut.currentPage, [{ a: 3 }], 'currentPage');
      spy.isCalled('fetchPage', 4);
      spy.isCalled('fetchCount', 4);
    });
  }

  for (const [pageSize, length] of [[2, 10], [20, 100]]) {
    it(`paging options works for all-items - pageSize: ${pageSize} - length: ${length}`, function () {
      const allItems = Array.from({ length }, (_, i) => ({ i }));
      const sut = new ContentModel(
        allItems,
        { pageSize },
        null,
        null,
        getLogger()[1],
      );
      void sut.refresh();
      assert.deepStrictEqual(sut.currentPage, allItems.slice(0, pageSize));
      assert.strictEqual(sut.totalCount, length);
      assert.strictEqual(sut.currentPageNumber, 1);
      assert.strictEqual(sut.pageCount, length / pageSize);

      sut.setCurrentPageNumber(2);
      assert.strictEqual(sut.currentPageNumber, 2, 'currentPageNumber');
      assert.deepStrictEqual(sut.currentPage, allItems.slice(pageSize, pageSize * 2));
      assert.strictEqual(sut.currentPageNumber, 2);

      sut.goToPreviousPage();
      assert.strictEqual(sut.currentPageNumber, 1, 'currentPageNumber');
      assert.deepStrictEqual(sut.currentPage, allItems.slice(0, pageSize));
      assert.strictEqual(sut.currentPageNumber, 1);

      sut.goToNextPage();
      assert.strictEqual(sut.currentPageNumber, 2, 'currentPageNumber');
      assert.deepStrictEqual(sut.currentPage, allItems.slice(pageSize, pageSize * 2));
      assert.strictEqual(sut.currentPageNumber, 2);
    });
  }

  it('paging can be disabled by setting pageSize to null - all-items', function () {
    let length = 10;
    let allItems = Array.from({ length }, (_, i) => ({ i }));
    const sut = new ContentModel(
      allItems,
      { pageSize: null },
      null,
      null,
      getLogger()[1],
    );
    void sut.refresh();
    assert.deepStrictEqual(sut.currentPage, allItems);
    assert.strictEqual(sut.totalCount, length);
    assert.strictEqual(sut.currentPageNumber, 1);
    assert.isUndefined(sut.pageCount);

    length = 100;
    sut.allItems = allItems = Array.from({ length }, (_, i) => ({ i: i + 100 }));
    assert.deepStrictEqual(sut.currentPage, allItems);
    assert.strictEqual(sut.totalCount, length);
    assert.strictEqual(sut.currentPageNumber, 1);
    assert.isUndefined(sut.pageCount);
  });

  it('paging can be disabled by setting pageSize to null - non-all-items', async function () {
    const page: unknown[] = [{ a: 1 }];
    const totalCount = 100;
    const spy = createSpy({
      async fetchPage(_currentPage: number, _pageSize: number, _model: ContentModel<unknown>): Promise<unknown[]> {
        return new Promise((res) => {
          setTimeout(() => { res(page); }, 15);
        });
      },
      async fetchCount(_: ContentModel<unknown>): Promise<number> {
        return new Promise((res) => {
          setTimeout(() => { res(totalCount); }, 10);
        });
      },
      pageSize: null
    }, true);
    const sut = new ContentModel(
      null,
      spy.proxy,
      null,
      null,
      getLogger()[1],
    );
    await sut.refresh();
    assert.strictEqual(sut.currentPageNumber, 1, 'currentPageNumber');
    spy.isCalledWith('fetchPage', [[1, null!, sut]]);
    spy.isCalledWith('fetchCount', [[sut]]);
    assert.isUndefined(sut.pageCount);

    sut.setCurrentPageNumber(3);
    await sut.wait();
    assert.strictEqual(sut.currentPageNumber, 3, 'currentPageNumber');
    spy.isCalled('fetchPage', 2);
    spy.isCalled('fetchCount', 2);
    assert.isUndefined(sut.pageCount);

    sut.goToNextPage();
    await sut.wait();
    assert.strictEqual(sut.currentPageNumber, 4, 'currentPageNumber');
    spy.isCalled('fetchPage', 3);
    spy.isCalled('fetchCount', 3);
    assert.isUndefined(sut.pageCount);

    sut.goToPreviousPage();
    await sut.wait();
    assert.strictEqual(sut.currentPageNumber, 3, 'currentPageNumber');
    spy.isCalled('fetchPage', 4);
    spy.isCalled('fetchCount', 4);
    assert.isUndefined(sut.pageCount);
  });

  it('selection mode can be disabled by setting the selectionOptions to null - all-items', function () {
    const item1 = { p: 1 };
    const item2 = { p: 2 };
    const allItems = [item1, item2];
    const sut = new ContentModel(
      allItems,
      null,
      null,
      null,
      getLogger()[1],
    );
    assert.strictEqual(sut.selectionMode, ItemSelectionMode.None);

    sut.selectItem(item1);
    assert.isFalse(sut.isOneSelected);
    assert.isFalse(sut.isAnySelected);
    assert.strictEqual(sut.selectionCount, 0);
    assert.deepStrictEqual(sut.selectedItems, []);

    sut.selectRange(0, 1);
    assert.isFalse(sut.isOneSelected);
    assert.isFalse(sut.isAnySelected);
    assert.strictEqual(sut.selectionCount, 0);
    assert.deepStrictEqual(sut.selectedItems, []);
  });

  it('selection mode can be disabled by setting the selectionMode explicitly to None - all-items', function () {
    const item1 = { p: 1 };
    const item2 = { p: 2 };
    const allItems = [item1, item2];
    const spy = createSpy<SelectionOptions<unknown>>({ mode: ItemSelectionMode.None, onSelectionChange: undefined! }, true);
    const sut = new ContentModel(
      allItems,
      null,
      spy.proxy,
      null,
      getLogger()[1],
    );
    assert.strictEqual(sut.selectionMode, ItemSelectionMode.None);

    sut.selectItem(item1);
    assert.isFalse(sut.isOneSelected);
    assert.isFalse(sut.isAnySelected);
    assert.strictEqual(sut.selectionCount, 0);
    assert.deepStrictEqual(sut.selectedItems, []);

    sut.selectRange(0, 1);
    assert.isFalse(sut.isOneSelected);
    assert.isFalse(sut.isAnySelected);
    assert.strictEqual(sut.selectionCount, 0);
    assert.deepStrictEqual(sut.selectedItems, []);

    spy.isCalled('onSelectionChange', 0);
  });

  it('selection mode can be disabled by setting the selectionOptions to null - non-all-items', function () {
    const item1 = { a: 1 };
    const page: unknown[] = [item1];
    const totalCount = 100;
    const spy = createSpy({
      async fetchPage(_currentPage: number, _pageSize: number, _model: ContentModel<unknown>): Promise<unknown[]> {
        return new Promise((res) => {
          setTimeout(() => { res(page); }, 15);
        });
      },
      async fetchCount(_: ContentModel<unknown>): Promise<number> {
        return new Promise((res) => {
          setTimeout(() => { res(totalCount); }, 10);
        });
      },
      pageSize: null
    }, true);
    const sut = new ContentModel(
      null,
      spy.proxy,
      null,
      null,
      getLogger()[1],
    );
    assert.strictEqual(sut.selectionMode, ItemSelectionMode.None);
    void sut.refresh();

    sut.selectItem(item1);
    assert.isFalse(sut.isOneSelected);
    assert.isFalse(sut.isAnySelected);
    assert.strictEqual(sut.selectionCount, 0);
    assert.deepStrictEqual(sut.selectedItems, []);

    sut.selectRange(0, 1);
    assert.isFalse(sut.isOneSelected);
    assert.isFalse(sut.isAnySelected);
    assert.strictEqual(sut.selectionCount, 0);
    assert.deepStrictEqual(sut.selectedItems, []);
  });

  it('selection mode can be disabled by setting the selectionMode explicitly to None - non-all-items', function () {
    const item1 = { a: 1 };
    const page: unknown[] = [item1];
    const totalCount = 100;
    const spy = createSpy({
      async fetchPage(_currentPage: number, _pageSize: number, _model: ContentModel<unknown>): Promise<unknown[]> {
        return new Promise((res) => {
          setTimeout(() => { res(page); }, 15);
        });
      },
      async fetchCount(_: ContentModel<unknown>): Promise<number> {
        return new Promise((res) => {
          setTimeout(() => { res(totalCount); }, 10);
        });
      },
      pageSize: null
    }, true);
    const selectionOptionSpy = createSpy<SelectionOptions<unknown>>({ mode: ItemSelectionMode.None, onSelectionChange: undefined! }, true);
    const sut = new ContentModel(
      null,
      spy.proxy,
      selectionOptionSpy.proxy,
      null,
      getLogger()[1],
    );
    assert.strictEqual(sut.selectionMode, ItemSelectionMode.None);
    void sut.refresh();

    sut.selectItem(item1);
    assert.isFalse(sut.isOneSelected);
    assert.isFalse(sut.isAnySelected);
    assert.strictEqual(sut.selectionCount, 0);
    assert.deepStrictEqual(sut.selectedItems, []);

    sut.selectRange(0, 1);
    assert.isFalse(sut.isOneSelected);
    assert.isFalse(sut.isAnySelected);
    assert.strictEqual(sut.selectionCount, 0);
    assert.deepStrictEqual(sut.selectedItems, []);

    selectionOptionSpy.isCalled('onSelectionChange', 0);
  });

  it('single selection mode is supported - all-items', function () {
    const item1 = { p: 1 };
    const item2 = { p: 2 };
    const allItems = [item1, item2];
    const spy = createSpy<SelectionOptions<unknown>>({
      mode: ItemSelectionMode.Single,
      onSelectionChange() { /* noop */ }
    }, true);
    const sut = new ContentModel(
      allItems,
      null,
      spy.proxy,
      null,
      getLogger()[1],
    );
    assert.strictEqual(sut.selectionMode, ItemSelectionMode.Single);

    sut.selectItem(item2);
    assert.isTrue(sut.isOneSelected);
    assert.isTrue(sut.isAnySelected);
    assert.strictEqual(sut.selectionCount, 1);
    assert.deepStrictEqual(sut.selectedItems, [item2]);

    sut.selectItem(item1);
    assert.isTrue(sut.isOneSelected);
    assert.isTrue(sut.isAnySelected);
    assert.strictEqual(sut.selectionCount, 1);
    assert.deepStrictEqual(sut.selectedItems, [item1]);

    sut.selectRange(0, 1);
    assert.isTrue(sut.isOneSelected);
    assert.isTrue(sut.isAnySelected);
    assert.strictEqual(sut.selectionCount, 1);
    assert.deepStrictEqual(sut.selectedItems, [item1]);

    spy.isCalled('onSelectionChange', 2);
    spy.isCalledWith('onSelectionChange', [[[item2], true, true], [[item1], true, true]]);

    spy.clearCallRecords();
    sut.toggleSelection(item1);
    spy.isCalled('onSelectionChange', 0); // toggle selection is only supported in multi-selection mode

    spy.clearCallRecords();
    sut.selectItem(item1);
    spy.isCalled('onSelectionChange', 0); // selection has not changed
  });

  it('single selection mode is supported - non-all-items', async function () {
    const item1 = { p: 1 };
    const item2 = { p: 2 };
    const page = [item1, item2];
    const totalCount = 10;
    const spy = createSpy<SelectionOptions<unknown>>({
      mode: ItemSelectionMode.Single,
      onSelectionChange() { /* noop */ }
    }, true);
    const sut = new ContentModel(
      null,
      {
        async fetchPage(_currentPage: number, _pageSize: number, _model: ContentModel<unknown>): Promise<unknown[]> {
          return new Promise((res) => {
            setTimeout(() => { res(page); }, 1);
          });
        },
        async fetchCount(_: ContentModel<unknown>): Promise<number> {
          return new Promise((res) => {
            setTimeout(() => { res(totalCount); }, 1);
          });
        },
      },
      spy.proxy,
      null,
      getLogger()[1],
    );
    await sut.refresh();
    assert.strictEqual(sut.selectionMode, ItemSelectionMode.Single);

    sut.selectItem(item2);
    assert.isTrue(sut.isOneSelected);
    assert.isTrue(sut.isAnySelected);
    assert.strictEqual(sut.selectionCount, 1);
    assert.deepStrictEqual(sut.selectedItems, [item2]);

    sut.selectItem(item1);
    assert.isTrue(sut.isOneSelected);
    assert.isTrue(sut.isAnySelected);
    assert.strictEqual(sut.selectionCount, 1);
    assert.deepStrictEqual(sut.selectedItems, [item1]);

    sut.selectRange(0, 1);
    assert.isTrue(sut.isOneSelected);
    assert.isTrue(sut.isAnySelected);
    assert.strictEqual(sut.selectionCount, 1);
    assert.deepStrictEqual(sut.selectedItems, [item1]);

    spy.isCalled('onSelectionChange', 2);
    spy.isCalledWith('onSelectionChange', [[[item2], true, true], [[item1], true, true]]);

    spy.clearCallRecords();
    sut.toggleSelection(item1);
    spy.isCalled('onSelectionChange', 0); // toggle selection is only supported in multi-selection mode

    spy.clearCallRecords();
    sut.selectItem(item1);
    spy.isCalled('onSelectionChange', 0); // selection has not changed
  });

  it('multiple selection mode is supported - all-items', function () {
    const item1 = { p: 1 };
    const item2 = { p: 2 };
    const item3 = { p: 3 };
    const item4 = { p: 4 };
    const item5 = { p: 5 };
    const allItems = [item1, item2, item3, item4, item5];
    const spy = createSpy<SelectionOptions<unknown>>({
      mode: ItemSelectionMode.Multiple,
      onSelectionChange() { /* noop */ }
    }, true);
    const sut = new ContentModel(
      allItems,
      null,
      spy.proxy,
      null,
      getLogger()[1],
    );
    assert.strictEqual(sut.selectionMode, ItemSelectionMode.Multiple);

    sut.selectItem(item2);
    assert.isTrue(sut.isOneSelected);
    assert.isTrue(sut.isAnySelected);
    assert.strictEqual(sut.selectionCount, 1);
    assert.deepStrictEqual(sut.selectedItems, [item2]);
    assert.isFalse(sut.isSelected(item1));
    assert.isTrue(sut.isSelected(item2));
    assert.isFalse(sut.isSelected(item3));
    assert.isFalse(sut.isSelected(item4));
    assert.isFalse(sut.isSelected(item5));

    sut.selectItem(item1);
    assert.isFalse(sut.isOneSelected);
    assert.isTrue(sut.isAnySelected);
    assert.strictEqual(sut.selectionCount, 2);
    assert.deepStrictEqual(sut.selectedItems, [item2, item1]);
    assert.isTrue(sut.isSelected(item1));
    assert.isTrue(sut.isSelected(item2));
    assert.isFalse(sut.isSelected(item3));
    assert.isFalse(sut.isSelected(item4));
    assert.isFalse(sut.isSelected(item5));

    spy.isCalled('onSelectionChange', 2);
    spy.isCalledWith('onSelectionChange', [[[item2], true, true], [[item2, item1], false, true]]);

    spy.clearCallRecords();
    sut.selectRange(3, 4);
    assert.isFalse(sut.isOneSelected);
    assert.isTrue(sut.isAnySelected);
    assert.strictEqual(sut.selectionCount, 4);
    assert.deepStrictEqual(sut.selectedItems, [item2, item1, item4, item5]);
    assert.isTrue(sut.isSelected(item1));
    assert.isTrue(sut.isSelected(item2));
    assert.isFalse(sut.isSelected(item3));
    assert.isTrue(sut.isSelected(item4));
    assert.isTrue(sut.isSelected(item5));

    spy.isCalled('onSelectionChange', 1);
    spy.isCalledWith('onSelectionChange', [[[item2, item1, item4, item5], false, true]]);

    spy.clearCallRecords();
    sut.toggleSelection(item3);
    assert.isFalse(sut.isOneSelected);
    assert.isTrue(sut.isAnySelected);
    assert.strictEqual(sut.selectionCount, 5);
    assert.deepStrictEqual(sut.selectedItems, [item2, item1, item4, item5, item3]);
    assert.isTrue(sut.isSelected(item1));
    assert.isTrue(sut.isSelected(item2));
    assert.isTrue(sut.isSelected(item3));
    assert.isTrue(sut.isSelected(item4));
    assert.isTrue(sut.isSelected(item5));
    spy.isCalled('onSelectionChange', 1);
    spy.isCalledWith('onSelectionChange', [[[item2, item1, item4, item5, item3], false, true]]);

    spy.clearCallRecords();
    sut.toggleSelection(item3);
    assert.isFalse(sut.isOneSelected);
    assert.isTrue(sut.isAnySelected);
    assert.strictEqual(sut.selectionCount, 4);
    assert.deepStrictEqual(sut.selectedItems, [item2, item1, item4, item5]);
    assert.isTrue(sut.isSelected(item1));
    assert.isTrue(sut.isSelected(item2));
    assert.isFalse(sut.isSelected(item3));
    assert.isTrue(sut.isSelected(item4));
    assert.isTrue(sut.isSelected(item5));
    spy.isCalled('onSelectionChange', 1);
    spy.isCalledWith('onSelectionChange', [[[item2, item1, item4, item5], false, true]]);

    spy.clearCallRecords();
    sut.selectItem(item1);
    spy.isCalled('onSelectionChange', 0); // selection has not changed

    sut.selectRange(3, 4);
    spy.isCalled('onSelectionChange', 0); // selection has not changed
  });

  it('multiple selection mode is supported - non-all-items', async function () {
    const item1 = { p: 1 };
    const item2 = { p: 2 };
    const item3 = { p: 3 };
    const item4 = { p: 4 };
    const item5 = { p: 5 };
    const page = [item1, item2, item3, item4, item5];
    const totalCount = 5;
    const spy = createSpy<SelectionOptions<unknown>>({
      mode: ItemSelectionMode.Multiple,
      onSelectionChange() { /* noop */ }
    }, true);
    const sut = new ContentModel(
      null,
      {
        async fetchPage(_currentPage: number, _pageSize: number, _model: ContentModel<unknown>): Promise<unknown[]> {
          return new Promise((res) => {
            setTimeout(() => { res(page); }, 1);
          });
        },
        async fetchCount(_: ContentModel<unknown>): Promise<number> {
          return new Promise((res) => {
            setTimeout(() => { res(totalCount); }, 1);
          });
        },
        pageSize: null,
      },
      spy.proxy,
      null,
      getLogger()[1],
    );
    assert.strictEqual(sut.selectionMode, ItemSelectionMode.Multiple);
    await sut.refresh();

    sut.selectItem(item2);
    assert.isTrue(sut.isOneSelected);
    assert.isTrue(sut.isAnySelected);
    assert.strictEqual(sut.selectionCount, 1);
    assert.deepStrictEqual(sut.selectedItems, [item2]);
    assert.isFalse(sut.isSelected(item1));
    assert.isTrue(sut.isSelected(item2));
    assert.isFalse(sut.isSelected(item3));
    assert.isFalse(sut.isSelected(item4));
    assert.isFalse(sut.isSelected(item5));

    sut.selectItem(item1);
    assert.isFalse(sut.isOneSelected);
    assert.isTrue(sut.isAnySelected);
    assert.strictEqual(sut.selectionCount, 2);
    assert.deepStrictEqual(sut.selectedItems, [item2, item1]);
    assert.isTrue(sut.isSelected(item1));
    assert.isTrue(sut.isSelected(item2));
    assert.isFalse(sut.isSelected(item3));
    assert.isFalse(sut.isSelected(item4));
    assert.isFalse(sut.isSelected(item5));

    spy.isCalled('onSelectionChange', 2);
    spy.isCalledWith('onSelectionChange', [[[item2], true, true], [[item2, item1], false, true]]);

    spy.clearCallRecords();
    sut.selectRange(3, 4);
    assert.isFalse(sut.isOneSelected);
    assert.isTrue(sut.isAnySelected);
    assert.strictEqual(sut.selectionCount, 4);
    assert.deepStrictEqual(sut.selectedItems, [item2, item1, item4, item5]);
    assert.isTrue(sut.isSelected(item1));
    assert.isTrue(sut.isSelected(item2));
    assert.isFalse(sut.isSelected(item3));
    assert.isTrue(sut.isSelected(item4));
    assert.isTrue(sut.isSelected(item5));

    spy.isCalled('onSelectionChange', 1);
    spy.isCalledWith('onSelectionChange', [[[item2, item1, item4, item5], false, true]]);

    spy.clearCallRecords();
    sut.toggleSelection(item3);
    assert.isFalse(sut.isOneSelected);
    assert.isTrue(sut.isAnySelected);
    assert.strictEqual(sut.selectionCount, 5);
    assert.deepStrictEqual(sut.selectedItems, [item2, item1, item4, item5, item3]);
    assert.isTrue(sut.isSelected(item1));
    assert.isTrue(sut.isSelected(item2));
    assert.isTrue(sut.isSelected(item3));
    assert.isTrue(sut.isSelected(item4));
    assert.isTrue(sut.isSelected(item5));
    spy.isCalled('onSelectionChange', 1);
    spy.isCalledWith('onSelectionChange', [[[item2, item1, item4, item5, item3], false, true]]);

    spy.clearCallRecords();
    sut.toggleSelection(item3);
    assert.isFalse(sut.isOneSelected);
    assert.isTrue(sut.isAnySelected);
    assert.strictEqual(sut.selectionCount, 4);
    assert.deepStrictEqual(sut.selectedItems, [item2, item1, item4, item5]);
    assert.isTrue(sut.isSelected(item1));
    assert.isTrue(sut.isSelected(item2));
    assert.isFalse(sut.isSelected(item3));
    assert.isTrue(sut.isSelected(item4));
    assert.isTrue(sut.isSelected(item5));
    spy.isCalled('onSelectionChange', 1);
    spy.isCalledWith('onSelectionChange', [[[item2, item1, item4, item5], false, true]]);

    spy.clearCallRecords();
    sut.selectItem(item1);
    spy.isCalled('onSelectionChange', 0); // selection has not changed

    sut.selectRange(3, 4);
    spy.isCalled('onSelectionChange', 0); // selection has not changed
  });

  for (const mode of [ItemSelectionMode.Single, ItemSelectionMode.Multiple]) {
    it(`with paging enabled selection works only for the currentPage - ${mode === ItemSelectionMode.Single ? 'single' : 'multiple'}-selection mode - all-items`, function () {
      const allItems = Array.from({ length: 10 }, (_, i) => ({ i }));
      const spy = createSpy<SelectionOptions<unknown>>({
        mode,
        onSelectionChange() { /* noop */ }
      }, true);
      const sut = new ContentModel(
        allItems,
        { pageSize: 2 },
        spy.proxy,
        null,
        getLogger()[1],
      );

      void sut.refresh();
      const item = allItems[2];
      sut.selectItem(item);
      assert.strictEqual(sut.selectionCount, 0);
      spy.isCalled('onSelectionChange', 0);

      sut.setCurrentPageNumber(2);
      sut.selectItem(item);
      assert.strictEqual(sut.selectionCount, 1);
      spy.isCalledWith('onSelectionChange', [[[item], true, true]]);
    });

    it(`with paging enabled selection works only for the currentPage - ${mode === ItemSelectionMode.Single ? 'single' : 'multiple'}-selection mode - non-all-items`, function () {
      const length = 10;
      const allItems: unknown[] = Array.from({ length }, (_, i) => ({ i }));
      const spy = createSpy<SelectionOptions<unknown>>({
        mode,
        onSelectionChange() { /* noop */ }
      }, true);
      const sut = new ContentModel(
        null,
        {
          fetchPage(currentPage, pageSize, _): unknown[] { return allItems.slice((currentPage - 1) * pageSize, currentPage * pageSize); },
          fetchCount(): number { return length; },
          pageSize: 2
        },
        spy.proxy,
        null,
        getLogger()[1],
      );

      void sut.refresh();
      const item = allItems[2];
      sut.selectItem(item);
      assert.isFalse(sut.isAnySelected);
      spy.isCalled('onSelectionChange', 0);

      sut.setCurrentPageNumber(2);
      sut.selectItem(item);
      assert.strictEqual(sut.selectionCount, 1);
      spy.isCalledWith('onSelectionChange', [[[item], true, true]]);
    });
  }

  it('applySorting invokes the onSorting callback - all-items', function () {
    interface Foo {
      foo: number;
      bar: string;
    }

    const length = 10;
    const allItems: Foo[] = Array.from({ length }, (_, i) => ({ foo: i, bar: i.toString() }));
    const options: SortOption<Foo>[][] = [];
    const sut = new ContentModel(
      allItems,
      { pageSize: 2 },
      null,
      (nv) => options.push(nv),
      getLogger()[1],
    );
    void sut.refresh();
    assert.strictEqual(sut.currentPageNumber, 1);
    sut.setCurrentPageNumber(3);
    assert.strictEqual(sut.currentPageNumber, 3);

    sut.applySorting({ property: 'foo', direction: SortDirection.Ascending });
    assert.strictEqual(sut.currentPageNumber, 1);
    sut.setCurrentPageNumber(3);
    assert.strictEqual(sut.currentPageNumber, 3);

    sut.applySorting({ property: 'foo', direction: SortDirection.Descending });
    assert.strictEqual(sut.currentPageNumber, 1);

    sut.setCurrentPageNumber(3);
    assert.strictEqual(sut.currentPageNumber, 3);

    sut.applySorting({ property: 'bar', direction: SortDirection.Descending });
    assert.strictEqual(sut.currentPageNumber, 1);

    assert.deepStrictEqual(
      options,
      [
        [{ property: 'foo', direction: SortDirection.Ascending }],
        [{ property: 'foo', direction: SortDirection.Descending }],
        [{ property: 'bar', direction: SortDirection.Descending }],
      ]
    );
  });

  it('applySorting invokes the onSorting callback - non-all-items', function () {
    interface Foo {
      foo: number;
      bar: string;
    }

    const length = 10;
    const allItems: Foo[] = Array.from({ length }, (_, i) => ({ foo: i, bar: i.toString() }));
    const options: SortOption<Foo>[][] = [];
    const sut = new ContentModel<Foo>(
      null,
      {
        fetchPage(currentPage, pageSize, _): Foo[] { return allItems.slice((currentPage - 1) * pageSize, currentPage * pageSize); },
        fetchCount(): number { return length; },
        pageSize: 2
      },
      null,
      (nv) => options.push(nv),
      getLogger()[1],
    );
    void sut.refresh();
    assert.strictEqual(sut.currentPageNumber, 1);
    sut.setCurrentPageNumber(3);
    assert.strictEqual(sut.currentPageNumber, 3);

    sut.applySorting({ property: 'foo', direction: SortDirection.Ascending });
    assert.strictEqual(sut.currentPageNumber, 1);
    sut.setCurrentPageNumber(3);
    assert.strictEqual(sut.currentPageNumber, 3);

    sut.applySorting({ property: 'foo', direction: SortDirection.Descending });
    assert.strictEqual(sut.currentPageNumber, 1);

    sut.setCurrentPageNumber(3);
    assert.strictEqual(sut.currentPageNumber, 3);

    sut.applySorting({ property: 'bar', direction: SortDirection.Descending });
    assert.strictEqual(sut.currentPageNumber, 1);

    assert.deepStrictEqual(
      options,
      [
        [{ property: 'foo', direction: SortDirection.Ascending }],
        [{ property: 'foo', direction: SortDirection.Descending }],
        [{ property: 'bar', direction: SortDirection.Descending }],
      ]
    );
  });

  it('applySorting does not throw error without onSortingCallback - all-items', function () {
    interface Foo {
      foo: number;
      bar: string;
    }

    const length = 10;
    const allItems: Foo[] = Array.from({ length }, (_, i) => ({ foo: i, bar: i.toString() }));
    const sut = new ContentModel(
      allItems,
      { pageSize: 2 },
      null,
      null,
      getLogger()[1],
    );
    void sut.refresh();
    assert.strictEqual(sut.currentPageNumber, 1);
    sut.setCurrentPageNumber(3);
    assert.strictEqual(sut.currentPageNumber, 3);

    sut.applySorting({ property: 'foo', direction: SortDirection.Ascending });
    assert.strictEqual(sut.currentPageNumber, 1);

    sut.setCurrentPageNumber(3);
    assert.strictEqual(sut.currentPageNumber, 3);

    sut.applySorting({ property: 'bar', direction: SortDirection.Descending });
    assert.strictEqual(sut.currentPageNumber, 1);
  });

  it('applySorting does not throw error without onSortingCallback - non-all-items', function () {
    interface Foo {
      foo: number;
      bar: string;
    }

    const length = 10;
    const allItems: Foo[] = Array.from({ length }, (_, i) => ({ foo: i, bar: i.toString() }));
    const sut = new ContentModel<Foo>(
      null,
      {
        fetchPage(currentPage, pageSize, _): Foo[] { return allItems.slice((currentPage - 1) * pageSize, currentPage * pageSize); },
        fetchCount(): number { return length; },
        pageSize: 2
      },
      null,
      null,
      getLogger()[1],
    );
    void sut.refresh();
    assert.strictEqual(sut.currentPageNumber, 1);
    sut.setCurrentPageNumber(3);
    assert.strictEqual(sut.currentPageNumber, 3);

    sut.applySorting({ property: 'foo', direction: SortDirection.Ascending });
    assert.strictEqual(sut.currentPageNumber, 1);

    sut.setCurrentPageNumber(3);
    assert.strictEqual(sut.currentPageNumber, 3);

    sut.applySorting({ property: 'bar', direction: SortDirection.Descending });
    assert.strictEqual(sut.currentPageNumber, 1);
  });

  it('ignores subsequent setCurrentPageNumber requests for the same page number when either the page or the count promise is pending', async function () {
    let resolvePage: (_: unknown[]) => void = undefined!;
    let resolveCount: (_: number) => void = undefined!;
    let pageNumber: number = 0;
    const spy = createSpy({
      async fetchPage(currentPage: number, _pageSize: number, _model: ContentModel<unknown>): Promise<unknown[]> {
        pageNumber = currentPage;
        return new Promise<unknown[]>((res) => {
          resolvePage = res;
        });
      },
      async fetchCount(_: ContentModel<unknown>): Promise<number> {
        return new Promise((res) => {
          resolveCount = res;
        });
      },
    }, true);
    const sut = new ContentModel(
      null,
      spy.proxy,
      null,
      null,
      getLogger()[1],
    );
    assert.isNull(sut.allItems);
    void sut.refresh();
    assert.strictEqual(sut.currentPageNumber, 1);
    assert.isUndefined(sut.currentPage);
    assert.isUndefined(sut.totalCount);
    spy.isCalled('fetchCount', 1);
    spy.isCalled('fetchPage', 1);

    spy.clearCallRecords();
    sut.setCurrentPageNumber(1);
    assert.isUndefined(sut.currentPage);
    assert.isUndefined(sut.totalCount);
    spy.isCalled('fetchCount', 0);
    spy.isCalled('fetchPage', 0);

    let page = [{ a: pageNumber }];
    resolvePage(page);
    await sut['pagePromise'];
    assert.strictEqual(sut.currentPage, page);
    assert.isUndefined(sut.totalCount);

    sut.setCurrentPageNumber(1);
    assert.isDefined(sut.currentPage);
    assert.isUndefined(sut.totalCount);
    spy.isCalled('fetchCount', 0);
    spy.isCalled('fetchPage', 0);

    let count = 100;
    resolveCount(count);
    await sut['countPromise'];
    assert.strictEqual(sut.totalCount, count);

    sut.setCurrentPageNumber(3);
    assert.strictEqual(sut.currentPageNumber, 3);
    assert.strictEqual(sut.currentPage, page);
    assert.strictEqual(sut.totalCount, count);

    sut.setCurrentPageNumber(4);
    assert.strictEqual(sut.currentPageNumber, 4);
    assert.strictEqual(sut.currentPage, page);
    assert.strictEqual(sut.totalCount, count);

    page = [{ a: pageNumber }];
    resolvePage(page);
    count = 200;
    resolveCount(count);
    await sut.wait();
    assert.strictEqual(sut.currentPage, page);
    assert.strictEqual(sut.totalCount, count);
  });

  it('goToPreviousPage logs warning when on first page - all-items', function () {
    const [spy, logger] = getLogger();
    const allItems = Array.from({ length: 10 }, (_, i) => ({ i }));
    const sut = new ContentModel(
      allItems,
      {
        pageSize: 2,
      },
      null,
      null,
      logger
    );
    void sut.refresh();
    assert.strictEqual(sut.currentPageNumber, 1);
    spy.isCalled('warn', 0);

    sut.goToPreviousPage();
    spy.isCalledWith('warn', [['Cannot go to previous page; already on the first page.']]);
  });

  it('goToPreviousPage logs warning when on first page - non-all-items', function () {
    const [spy, logger] = getLogger();
    const length = 10;
    const items = Array.from({ length }, (_, i) => ({ i }));
    const sut = new ContentModel(
      null,
      {
        fetchPage(): unknown[] { return items; },
        fetchCount(): number { return length; },
        pageSize: 2,
      },
      null,
      null,
      logger
    );
    void sut.refresh();
    assert.strictEqual(sut.currentPageNumber, 1);
    spy.isCalled('warn', 0);

    sut.goToPreviousPage();
    spy.isCalledWith('warn', [['Cannot go to previous page; already on the first page.']]);
  });

  it('goToNextPage logs warning when on last page - all-items', function () {
    const [spy, logger] = getLogger();
    const allItems = Array.from({ length: 10 }, (_, i) => ({ i }));
    const sut = new ContentModel(
      allItems,
      {
        pageSize: 2,
      },
      null,
      null,
      logger
    );
    void sut.refresh();
    assert.strictEqual(sut.currentPageNumber, 1);
    spy.isCalled('warn', 0);

    sut.setCurrentPageNumber(5);
    assert.strictEqual(sut.currentPageNumber, 5);

    sut.goToNextPage();
    spy.isCalledWith('warn', [['Cannot go to next page; already on the last page.']]);
  });

  it('goToNextPage logs warning when on last page - non-all-items', function () {
    const [spy, logger] = getLogger();
    const length = 10;
    const items = Array.from({ length }, (_, i) => ({ i }));
    const sut = new ContentModel(
      null,
      {
        fetchPage(): unknown[] { return items; },
        fetchCount(): number { return length; },
        pageSize: 2,
      },
      null,
      null,
      logger
    );
    void sut.refresh();
    assert.strictEqual(sut.currentPageNumber, 1);
    spy.isCalled('warn', 0);

    sut.setCurrentPageNumber(5);
    assert.strictEqual(sut.currentPageNumber, 5);

    sut.goToNextPage();
    spy.isCalledWith('warn', [['Cannot go to next page; already on the last page.']]);
  });
});