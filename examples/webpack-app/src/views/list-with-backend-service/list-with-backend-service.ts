import { IHttpClient } from '@aurelia/fetch-client';
import { ILogger } from '@aurelia/kernel';
import { customElement, IDialogService, observable, valueConverter } from '@aurelia/runtime-html';
import { ContentModel, SelectionMode } from 'au2-data-grid';
import { FakePerson } from './data-contracts';
import template from './list-with-backend-service.html';
import { PersonCardDialog } from './person-card-dialog';
import { PersonCompareDialog } from './person-compare-dialog';

const endpoint = 'http://localhost:9000/people';

@valueConverter('formatList')
class FormatList {
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
    this.selectionMode = SelectionMode.Multiple; // SelectionMode.Single;
    this.createContentModel();
  }
  private createContentModel() {
    const httpClient = this.httpClient;
    const handleError = (e: Error): never => { this.fetchFailed = true; throw e; }
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
          return httpClient.get(`${endpoint}?$top=${pageSize}&$skip=${(currentPage - 1) * pageSize}`, { mode: 'cors' })
            .then(res => res.json() as Promise<FakePerson[]>)
            .catch(handleError);
        }
      },
      { mode: this.selectionMode },
      null,
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