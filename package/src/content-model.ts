import {
  ILogger,
  noop,
} from '@aurelia/kernel';
import {
  observable,
} from '@aurelia/runtime';
import {
  SortOption,
} from './sorting-options.js';
import {
  Writable
} from './util.js';

const defaultPageSize = 50;

/**
 * Handles the data part of the grid.
 * This has very little to do with the presentation of the data.
 */
export class ContentModel<T extends unknown> {
  public readonly isAnySelected: boolean = false;
  public readonly isOneSelected: boolean = false;
  public readonly selectionCount: number = 0;

  @observable
  public allItems: T[] | null;

  public readonly selectedItems: T[] = [];
  public readonly selectionMode: SelectionMode;
  private readonly onSelectionChange: SelectionChangeHandler<T>;
  private readonly pageSize: number | null;
  private readonly fetchPage: FetchPage<T> | null;
  private readonly fetchCount: FetchCount<T> | null;
  private readonly logger: ILogger;
  private _currentPage!: T[];
  private _currentPageNumber: number = 0;
  private pagePromise: Promise<void> | null = null;
  private countPromise: Promise<void> | null = null;
  private _totalCount: number = undefined!;
  private _sortOptions: SortOption<T>[] = [];
  private _pageCount: number = undefined!;
  private initialized: boolean = false;

  public constructor(
    allItems: T[] | null,
    pagingOptions: Partial<PagingOptions<T>> | null,
    selectionOptions: Partial<SelectionOptions<T>> | null,
    public readonly onSorting: ApplySorting<T> | null,
    logger: ILogger,
  ) {
    this.logger = logger.scopeTo('GridModel');
    this.allItems = allItems;
    const fetchPage = this.fetchPage = pagingOptions?.fetchPage ?? null;
    this.fetchCount = pagingOptions?.fetchCount ?? null;

    const hasAllItems = allItems !== null;
    if (!hasAllItems && fetchPage === null) throw new Error('Either allItems or pagingOptions is required.');

    const pageSize = pagingOptions?.pageSize ?? null;
    const isPagingDisabled = pageSize === null;
    this.pageSize = isPagingDisabled ? null : (pageSize ?? defaultPageSize);

    if (isPagingDisabled && hasAllItems) {
      this._currentPage = allItems!;
      this._totalCount = allItems.length;
    }

    this.selectionMode = selectionOptions?.mode ?? SelectionMode.None;
    this.onSelectionChange = selectionOptions?.onSelectionChange ?? noop as SelectionChangeHandler<T>;
    this.initialized = true;
  }

  public get currentPage() { return this._currentPage; }

  public get totalCount() { return this._totalCount; }

  public get pageCount() { return this._pageCount; }

  public get currentPageNumber() { return this._currentPageNumber; }

  public selectItem(item: T): void {
    switch (this.selectionMode) {
      case SelectionMode.None:
        return;
      case SelectionMode.Single:
        this.selectedItems[0] = item;
        break;
      case SelectionMode.Multiple:
        const selectedItems = this.selectedItems;
        if (!selectedItems.includes(item)) {
          selectedItems.push(item);
        }
        break;
    }
    this.handleSelectionChange();
  }

  public selectRange(startIndex: number, endIndex: number) {
    if (this.selectionMode !== SelectionMode.Multiple) return;
    const start = Math.min(startIndex, endIndex);
    const end = Math.max(startIndex, endIndex);
    const items = this._currentPage;
    const selectedItems = this.selectedItems;
    for (let i = start; i <= end; i++) {
      const item = items[i];
      if (!selectedItems.includes(item)) {
        selectedItems.push(item);
      }
    }
    this.handleSelectionChange();
  }

  public toggleSelection(item: T) {
    if (this.selectionMode !== SelectionMode.Multiple) return;
    const selectedItems = this.selectedItems;
    const idx = selectedItems.findIndex(x => item === x);
    if (idx === -1) {
      selectedItems.push(item);
    } else {
      selectedItems.splice(idx, 1);
    }
    this.handleSelectionChange();
  }

  private handleSelectionChange() {
    const selectedItems = this.selectedItems;
    const len = (this as Writable<ContentModel<T>>).selectionCount = selectedItems.length;
    const isAnySelected = (this as Writable<ContentModel<T>>).isAnySelected = len > 0;
    const isOneSelected = (this as Writable<ContentModel<T>>).isOneSelected = len === 1;
    this.onSelectionChange(selectedItems, isOneSelected, isAnySelected);
  }

  public clearSelections() {
    (this as Writable<ContentModel<T>>).isAnySelected = (this as Writable<ContentModel<T>>).isOneSelected = false;
    (this as Writable<ContentModel<T>>).selectionCount = 0;
    this.selectedItems.length = 0;
  }

  public isSelected(item: T) {
    return this.selectedItems.includes(item);
  }

  public applySorting(...sortOptions: SortOption<T>[]) {
    const oldValue = this._sortOptions;
    const newValue = this._sortOptions = sortOptions;
    this.onSorting?.(newValue, oldValue, this.allItems, this);
    this.setCurrentPageNumber(1, true);
  }

  public setCurrentPageNumber(pageNumber: number, force: boolean = false): void {
    if (!this.initialized) return;
    const oldNumber = this._currentPageNumber;
    if (oldNumber === pageNumber
      && this.pagePromise !== null
      && this.countPromise !== null
    ) {
      return;
    }
    this._currentPageNumber = pageNumber;
    if (oldNumber !== pageNumber || force) {
      const pagePromise = this.setPage();
      const countPromise = this.setTotalCount();
      if (!this.allItems) {
        this.pagePromise = pagePromise;
        this.countPromise = countPromise;
      }
    }
  }

  public goToPreviousPage() {
    const pageNumber = this._currentPageNumber;
    if (pageNumber === 1) {
      this.logger.warn('Cannot go to previous page; already on the first page.');
      return;
    }
    this.setCurrentPageNumber(pageNumber - 1);
  }

  public goToNextPage() {
    const pageNumber = this._currentPageNumber;
    if (pageNumber === this._pageCount) {
      this.logger.warn('Cannot go to next page; already on the last page.');
      return;
    }
    this.setCurrentPageNumber(pageNumber + 1);
  }

  /** @internal */
  public async setTotalCount(): Promise<void> {
    const pageSize = this.pageSize;
    const allItems = this.allItems;
    if (allItems !== null) {
      const totalCount = this._totalCount = allItems.length;
      if (pageSize !== null) {
        this._pageCount = Math.ceil(totalCount / pageSize)
      }
      this.countPromise = null;
      return;
    }
    const fetchCount = this.fetchCount;
    if (fetchCount === null) {
      this.logger.warn('fetchCount is not set.');
      return;
    }
    const countPromise = fetchCount(this);
    if (countPromise instanceof Promise) {
      this.countPromise = countPromise.then((count) => {
        this._totalCount = count;
        if (pageSize !== null) {
          this._pageCount = Math.ceil(count / pageSize)
        }
      });
      return;
    }
    this._totalCount = countPromise;
    if (pageSize !== null) {
      this._pageCount = Math.ceil(countPromise / pageSize)
    }
    this.countPromise = null;
  }

  /** @internal */
  public async setPage(): Promise<void> {
    const allItems = this.allItems;
    const pageSize = this.pageSize;
    const pageNumber = this._currentPageNumber;
    this.clearSelections();

    if (allItems !== null) {
      this._currentPage = pageSize !== null
        ? allItems.slice(pageSize * (pageNumber - 1), pageSize * pageNumber)
        : allItems;
      this.pagePromise = null;
      return;
    }

    // one of fetchPage or allItems should always be there.
    const fetchPage = this.fetchPage!;
    let pagePromise = fetchPage(pageNumber, pageSize!, this);
    if (pagePromise instanceof Promise) {
      this.pagePromise = pagePromise.then((data) => { this._currentPage = data; });
      return;
    }
    this._currentPage = pagePromise;
    this.pagePromise = null;
  }

  public async wait(rethrowError: boolean = false): Promise<void> {
    try {
      await Promise.all([this.pagePromise, this.countPromise]);
    } catch (e) {
      if (rethrowError) {
        throw e;
      }
    }
  }

  public async refresh(rethrowError: boolean = false): Promise<void> {
    this.setCurrentPageNumber(1, true);
    return this.wait(rethrowError);
  }

  private allItemsChanged() {
    this.setCurrentPageNumber(1, true);
  }
}

export enum SelectionMode {
  None = 0,
  Single = 1,
  Multiple = 2,
}
type SelectionChangeHandler<T extends unknown> = (selectedItems: T[], isOneSelected: boolean, isAnySelected: boolean) => void;
export interface SelectionOptions<T extends unknown> {
  mode: SelectionMode;
  onSelectionChange: SelectionChangeHandler<T>
}

export type FetchCount<T extends unknown> = (model: ContentModel<T>) => number | Promise<number>;
export type FetchPage<T extends unknown> = (currentPage: number, pageSize: number, model: ContentModel<T>) => T[] | Promise<T[]>;
export interface PagingOptions<T extends unknown> {
  pageSize: number | null;
  fetchPage: FetchPage<T>;
  fetchCount: FetchCount<T>;
}
export type ApplySorting<T extends unknown> = (newValue: SortOption<T>[], oldValue: SortOption<T>[], allItems: T[] | null, model: ContentModel<T>) => void;