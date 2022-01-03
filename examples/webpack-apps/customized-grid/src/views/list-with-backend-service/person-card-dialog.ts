import { customElement, IDialogController, IDialogDom } from '@aurelia/runtime-html';
import { FakePerson } from './data-contracts';
import template from './person-card-dialog.html';

@customElement({
  name: 'person-card-dialog',
  template,
})
export class PersonCardDialog {
  public person!: FakePerson;

  public constructor(
    @IDialogController private readonly controller: IDialogController,
    @IDialogDom dialogDom: IDialogDom,
  ) {
    dialogDom.overlay.classList.add('dialog-overlay');
    dialogDom.contentHost.classList.add('dialog');
  }

  public activate(person: FakePerson) {
    this.person = person;
  }

  private close() {
    this.controller.cancel();
  }
}