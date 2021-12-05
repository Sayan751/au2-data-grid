import {
  ILogger,
  noop,
} from '@aurelia/kernel';

const defaultPageSize = 50;
export class ListModel<T extends unknown> {
  public isAnySelected: boolean = false;
  public isOneSelected: boolean = false;
  private selectedItems: T[] = [];
  private readonly selectionMode: SelectionMode;
  private readonly onSelectionChange: SelectionChangeHandler<T>;
  private readonly pageSize: number | null;
  private readonly fetchPage: FetchPage<T> | null;
  private readonly fetchCount: FetchCount<T> | null;
  private readonly logger: ILogger;
  private _currentPage!: T[];
  private _currentPageNumber: number = 0;
  private allItems: T[] | null;
  private pagePromise: Promise<void> | null = null;
  private countPromise: Promise<void> | null = null;
  private _totalCount: number = undefined!;

  public constructor(
    allItems: T[] | null,
    pagingOptions: Partial<PagingOptions<T>> | null,
    selectionOptions: Partial<SelectionOptions<T>> | null,
    logger: ILogger,
  ) {
    this.logger = logger.scopeTo('ListModel');
    this.allItems = allItems;
    const fetchPage = this.fetchPage = pagingOptions?.fetchPage ?? null;
    this.fetchCount = pagingOptions?.fetchCount ?? null;

    const hasAllItems = allItems !== null;
    if (!hasAllItems && fetchPage === null) throw new Error('Either allItems or pagingOptions is required.');

    const pageSize = pagingOptions?.pageSize;
    const isPagingDisabled = pageSize === null;
    this.pageSize = isPagingDisabled ? null : (pageSize ?? defaultPageSize);

    if (isPagingDisabled && hasAllItems) {
      this._currentPage = this.allItems!;
    }

    this.selectionMode = selectionOptions?.mode ?? SelectionMode.None;
    this.onSelectionChange = selectionOptions?.onSelectionChange ?? noop as SelectionChangeHandler<T>;
  }

  public get currentPage() {
    return this._currentPage;
  }

  public get totalCount() {
    return this._totalCount;
  }

  // TODO: need @computed deco or extend the @watch deco to support normal class as well.
  // public get isAnySelected(): boolean {
  //   return this.selectedItems.length > 0;
  // }
  // public get isOneSelected(): boolean {
  //   return this.selectedItems.length === 1;
  // }

  private selectionChanged() {
    const len = this.selectedItems.length;
    const isAnySelected = this.isAnySelected = len > 0;
    const isOneSelected = this.isOneSelected = len === 1;
    this.onSelectionChange(this.selectedItems, isOneSelected, isAnySelected);
  }

  public selectItem(item: T): void {
    switch (this.selectionMode) {
      case SelectionMode.None:
        return;
      case SelectionMode.Single:
        this.selectedItems[0] = item;
        break;
      case SelectionMode.Multiple:
        this.selectedItems.push(item);
        break;
    }
    this.selectionChanged();
  }

  public clearSelections() {
    this.selectedItems.length = 0;
  }

  public setCurrentPageNumber(pageNumber: number, force: boolean = false): void {
    if (this.pageSize === null) {
      this.logger.warn('Paging is disabled; setCurrentPage has no effect.');
      return;
    }
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

  /** @internal */
  public async setTotalCount(): Promise<void> {
    const allItems = this.allItems;
    if (allItems !== null) {
      this._totalCount = allItems.length;
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
      this.countPromise = countPromise.then((count) => { this._totalCount = count; });
      return;
    }
    this._totalCount = countPromise;
    this.countPromise = null;
  }

  /** @internal */
  public async setPage(): Promise<void> {
    const allItems = this.allItems;
    const pageSize = this.pageSize;
    const pageNumber = this._currentPageNumber;
    this.selectedItems = [];

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
}

export enum SelectionMode {
  None,
  Single,
  Multiple,
}
type SelectionChangeHandler<T extends unknown> = (selectedItems: T[], isOneSelected: boolean, isAnySelected: boolean) => void;
export interface SelectionOptions<T extends unknown> {
  mode: SelectionMode;
  onSelectionChange: SelectionChangeHandler<T>
}

type FetchCount<T extends unknown> = (listModel: ListModel<T>) => number | Promise<number>;
type FetchPage<T extends unknown> = (currentPage: number, pageSize: number, listModel: ListModel<T>) => T[] | Promise<T[]>;
export interface PagingOptions<T extends unknown> {
  pageSize: number | null;
  fetchPage: FetchPage<T>;
  fetchCount: FetchCount<T>;
}