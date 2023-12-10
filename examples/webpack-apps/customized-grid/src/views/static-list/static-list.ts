import { ILogger } from '@aurelia/kernel';
import { observable } from '@aurelia/runtime';
import { customElement, ICustomElementViewModel } from '@aurelia/runtime-html';
import { ContentModel, ItemSelectionMode, SortDirection, SortOption } from '@sparser/au2-data-grid';
import { Person } from '../../common/Person';
import template from './static-list.html';

@customElement({ name: 'static-list', template })
export class StaticList implements ICustomElementViewModel {
  private logger: ILogger;
  private people!: ContentModel<Person>;
  @observable({ callback: 'createContentModel' })
  private selectionMode: ItemSelectionMode;

  private static readonly ds1 = [
    new Person('Bruce', 'Wayne', 42),
    new Person('Clark', 'Kent', 43),
    new Person('Diana', 'Prince', 44),
    new Person('Billy', 'Batson', 24),
  ];
  private static readonly ds2 = [
    new Person('Tony', 'Stark', 42),
    new Person('Peter', 'Parker', 14),
    new Person('Bruce', 'Banner', 43),
  ];

  public constructor(
    @ILogger logger: ILogger,
  ) {
    this.logger = logger.scopeTo('static-list');
    this.selectionMode = ItemSelectionMode.Single;
    this.createContentModel();
  }

  public useDataset1() {
    this.people.allItems = StaticList.ds1;
  }

  public useDataset2() {
    this.people.allItems = StaticList.ds2;
  }

  private createContentModel() {
    this.people = new ContentModel<Person>(
      this.people?.allItems ?? StaticList.ds1,
      null,
      { mode: this.selectionMode },
      (options: SortOption<Person>[], _: SortOption<Person>[], allItems: Person[] | null, _model: ContentModel<Person>) => {
        if ((allItems?.length ?? 0) === 0) return;
        for (const option of options) {
          const prop = option.property;
          const isAsc = option.direction === SortDirection.Ascending;
          allItems!.sort((pa, pb) => {
            if (pa[prop] > pb[prop]) {
              return isAsc ? 1 : -1;
            }
            if (pa[prop] < pb[prop]) {
              return isAsc ? -1 : 1;
            }
            return 0;
          });
        }
      },
      this.logger,
    );
  }
}

