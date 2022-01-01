import { IHttpClient } from '@aurelia/fetch-client';
import { ILogger } from '@aurelia/kernel';
import { customElement, valueConverter } from '@aurelia/runtime-html';
import { ContentModel } from 'au2-data-grid';
import template from './list-with-backend-service.html';

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

  private readonly people: ContentModel<FakePerson>;
  private readonly logger: ILogger;
  private fetchFailed: boolean = false;

  public constructor(
    @IHttpClient private readonly httpClient: IHttpClient,
    @ILogger logger: ILogger,
  ) {
    logger = this.logger = logger.scopeTo('list-with-backend-service');
    const self = this;
    this.people = new ContentModel(
      null,
      {
        pageSize: 50,
        async fetchCount() {
          return httpClient.get(`${endpoint}?$count=true`, { mode: 'cors' })
            .then(res => res.json() as Promise<{ count: number }>)
            .then(data => data.count);
        },
        async fetchPage(currentPage, pageSize) {
          return httpClient.get(`${endpoint}?$top=${pageSize}&$skip=${(currentPage - 1) * pageSize}`, { mode: 'cors' })
            .then(res => res.json() as Promise<FakePerson[]>)
            .catch((e) => {
              self.fetchFailed = true;
              throw e;
            });
        }
      },
      null,
      null,
      logger,
    );
    void this.people.refresh();
  }
  public bind() {
  }
}

interface FakePerson {
  firstName: string;
  lastName: string;
  age: number;
  gender: string;
  pets: string[];
}