import { ILogger } from '@aurelia/kernel';
import { customElement, ICustomElementViewModel } from '@aurelia/runtime-html';
import { ListModel, SelectionMode, SortDirection, SortOption } from 'au2-data-grid';
import template from './static-list.html';
import { Person } from '../../common/Person';

@customElement({ name: 'static-list', template })
export class StaticList implements ICustomElementViewModel {
  private logger: ILogger;
  private people: ListModel<Person>;
  private static readonly ds1 = [
    new Person('Bruce', 'Wayne'),
    new Person('Clark', 'Kent'),
    new Person('Diana', 'Prince'),
    new Person('Billy', 'Batson'),
  ];
  private static readonly ds2 = [
    new Person('Tony', 'Stark'),
    new Person('Peter', 'Parker'),
    new Person('Bruce', 'Banner'),
  ];

  public constructor(
    @ILogger logger: ILogger,
  ) {
    logger = this.logger = logger.scopeTo('static-list');

    this.people = new ListModel<Person>(
      StaticList.ds1,
      null,
      { mode: SelectionMode.Single },
      (options: SortOption<Person>[], _: SortOption<Person>[], allItems: Person[] | null, _listModel: ListModel<Person>) => {
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

  public sortByFname() {
    this.people.applySorting({ property: 'fname', direction: SortDirection.Ascending });
  }

  public sortByFnameDsc() {
    this.people.applySorting({ property: 'fname', direction: SortDirection.Descending });
  }

  public sortByLname() {
    this.people.applySorting({ property: 'lname', direction: SortDirection.Ascending });
  }

  public sortByLnameDsc() {
    this.people.applySorting({ property: 'lname', direction: SortDirection.Descending });
  }
}

