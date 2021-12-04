import { noop } from '@aurelia/kernel';

export class ListModel<T extends unknown> {
  private selectedItems: T[] = [];
  public isAnySelected: boolean = false;
  public isOneSelected: boolean = false;
  public readonly selectionMode: SelectionMode;
  public readonly onSelectionChange: SelectionChangeHandler<T>;

  public constructor(
    public items: T[],
    options: Partial<SelectionOptions<T>> | null,
  ) {
    this.selectionMode = options?.mode ?? SelectionMode.None;
    this.onSelectionChange = options?.onSelectionChange ?? noop as SelectionChangeHandler<T>;
  }

  public get currentPage() {
    return this.items;
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
    this.isAnySelected = len > 0;
    this.isOneSelected = len === 1;
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