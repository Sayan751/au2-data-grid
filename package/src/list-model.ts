export class ListModel<T extends unknown> {
  public constructor(
    public items: T[],
  ) { }

  public get currentPage() {
    return this.items;
  }
}