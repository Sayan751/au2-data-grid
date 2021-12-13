export enum SortDirection {
  Ascending = 'Ascending',
  Descending = 'Descending',
}

export interface SortOption<T extends unknown> {
  /**
   * Name of the property on which to sort
   * @type {keyof T}
   * @memberof SortInfo
   */
  property: keyof T;

  /**
   * Direction of sorting
   * @type {SortDirection}
   * @memberof SortInfo
   */
  direction: SortDirection;
}
