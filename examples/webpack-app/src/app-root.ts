import { customElement, ICustomElementViewModel } from '@aurelia/runtime-html';
import { ListModel, SelectionMode } from 'au2-data-grid';
import template from './app-root.html';

@customElement({ name: 'app-root', template })
export class AppRootCustomElement implements ICustomElementViewModel {
  public people: ListModel<Person> = new ListModel<Person>(
    [
      new Person('john', 'doe'),
      new Person('foo', 'bar'),
    ],
    { mode: SelectionMode.Single },
  );
}

class Person {
  public constructor(
    public fname: string,
    public lname: string,
  ) { }
}