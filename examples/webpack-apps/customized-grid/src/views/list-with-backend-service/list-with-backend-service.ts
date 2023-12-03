import { IDialogService } from '@aurelia/dialog';
import { IHttpClient } from '@aurelia/fetch-client';
import { ILogger } from '@aurelia/kernel';
import { observable } from '@aurelia/runtime';
import { customElement, valueConverter } from '@aurelia/runtime-html';
import { ContentModel, SelectionMode, SortDirection } from '@sparser/au2-data-grid';
import { FakePerson } from './data-contracts';
import template from './list-with-backend-service.html';
import { PersonCardDialog } from './person-card-dialog';
import { PersonCompareDialog } from './person-compare-dialog';

const endpoint = 'http://localhost:9000/people';

@valueConverter('formatList')
export class FormatList {
  public toView(value: string[]) {
    const len = value.length;
    switch (len) {
      case 0:
        return '';
      case 1:
        return value[0];
      default:
        return `${value[0]} (${len - 1} more)`
    }
  }
}

const directionMap = {
  [SortDirection.Ascending]: 'asc',
  [SortDirection.Descending]: 'desc',
}
@customElement({
  name: 'list-with-backend-service',
  template,
  dependencies: [
    FormatList
  ]
})
export class ListWithBackendService {

  private people!: ContentModel<FakePerson>;
  private readonly logger: ILogger;
  private fetchFailed: boolean = false;
  @observable({ callback: 'createContentModel' })
  private selectionMode: SelectionMode;

  public constructor(
    @IHttpClient private readonly httpClient: IHttpClient,
    @IDialogService private readonly dialogService: IDialogService,
    @ILogger logger: ILogger,
  ) {
    this.logger = logger.scopeTo('list-with-backend-service');
    this.selectionMode = SelectionMode.Single;
  }
  private createContentModel() {
    const httpClient = this.httpClient;
    const handleError = (e: Error): never => { this.fetchFailed = true; throw e; }
    let $orderby: string | null = null;
    const people = this.people = new ContentModel(
      null,
      {
        pageSize: 50,
        async fetchCount() {
          return httpClient.get(`${endpoint}?$count=true`, { mode: 'cors' })
            .then(res => res.json() as Promise<{ count: number; }>)
            .then(data => data.count);
        },
        async fetchPage(currentPage, pageSize) {
          const url = new URL(endpoint);
          const query = url.searchParams;
          if ($orderby) {
            query.set('$orderby', $orderby);
          }
          query.set('$top', pageSize.toString());
          query.set('$skip', ((currentPage - 1) * pageSize).toString());
          return httpClient.get(url.toString(), { mode: 'cors' })
            .then(res => res.json() as Promise<FakePerson[]>)
            .catch(handleError);
        }
      },
      { mode: this.selectionMode },
      (options) => {
        $orderby = options
          .map(opt => {
            const dir = directionMap[opt.direction];
            return dir ? `${opt.property} ${dir}` : opt.property;
          })
          .join(',');
        void people.refresh();
      },
      this.logger
    );
    void people.refresh();
  }

  public viewDetails(person: FakePerson) {
    void this.dialogService.open({
      component: () => PersonCardDialog,
      model: person,
      lock: false,
      overlayDismiss: false,
    });
  }

  public compare() {
    void this.dialogService.open({
      component: () => PersonCompareDialog,
      model: this.people.selectedItems,
      lock: false,
      overlayDismiss: false,
    });
  }
}