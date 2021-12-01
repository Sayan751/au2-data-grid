export class ListModel {
  public constructor(
    public items: unknown[],
  ) { }

  public get currentPage() {
    return this.items;
  }
}