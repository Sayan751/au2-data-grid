import { customElement, ICustomElementViewModel } from '@aurelia/runtime-html';
import template from './app-root.html';
import { ListWithBackendService } from './views/list-with-backend-service/list-with-backend-service';
import { StaticList } from './views/static-list/static-list';

@customElement({ name: 'app-root', template })
export class AppRoot implements ICustomElementViewModel {
  public static routes = [
    {
      path: ['', 'static-list'],
      component: StaticList,
    },
    {
      path: ['list-with-backend-service'],
      component: ListWithBackendService,
    },
  ]
}
