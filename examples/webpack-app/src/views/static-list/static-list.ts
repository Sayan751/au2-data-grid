import { ILogger } from '@aurelia/kernel';
import { customElement, ICustomElementViewModel } from '@aurelia/runtime-html';
import { GridModel, SelectionMode, SortDirection, SortOption } from 'au2-data-grid';
import template from './static-list.html';
import { Person } from '../../common/Person';

@customElement({ name: 'static-list', template })
export class StaticList implements ICustomElementViewModel {
  private logger: ILogger;
  private people: GridModel<Person>;
  private static readonly ds1 = [
    new Person('Bruce', 'Wayne', 42),
    new Person('Clark', 'Kent',  43),
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
    logger = this.logger = logger.scopeTo('static-list');

    this.people = new GridModel<Person>(
      StaticList.ds1,
      null,
      { mode: SelectionMode.Single },
      (options: SortOption<Person>[], _: SortOption<Person>[], allItems: Person[] | null, _model: GridModel<Person>) => {
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
      logger,
    );
  }

  public useDataset1() {
    this.people.allItems = StaticList.ds1;
  }

  public useDataset2() {
    this.people.allItems = StaticList.ds2;
  }
}

