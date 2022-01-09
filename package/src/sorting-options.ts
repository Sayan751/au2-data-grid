export enum SortDirection {
  Ascending = 'Ascending',
  Descending = 'Descending',
}

export interface SortOption<T> {
  /**
   * Name of the property on which to sort
   */
  property: keyof T;

  /**
   * Direction of sorting
   */
  direction: SortDirection;
}
