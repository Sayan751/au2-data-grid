import { ILogger, resolve } from '@aurelia/kernel';
import { bindable, customElement, valueConverter } from '@aurelia/runtime-html';
import { ContentModel } from '@sparser/au2-data-grid';
import { FakePerson } from './data-contracts';
import template from './person-card.html';

@valueConverter('formatName')
class FormatName {
  public toView(person: FakePerson) {
    let name = person.firstName;
    const lastName = person.lastName;
    if (lastName) {
      name += ' ' + lastName;
    }
    return name;
  }
}

@customElement({
  name: 'person-card',
  template,
  dependencies: [
    FormatName
  ]
})
export class PersonCard {
  private readonly logger: ILogger = resolve(ILogger).scopeTo('person-card');
  @bindable public person!: FakePerson;
  public pets!: ContentModel<string>;

  public bound() {
    this.pets = new ContentModel(this.person.pets, null, null, null, this.logger);
  }
}
