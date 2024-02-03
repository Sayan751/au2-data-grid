import { IDialogController, IDialogDom } from '@aurelia/dialog';
import { customElement } from '@aurelia/runtime-html';
import { FakePerson } from './data-contracts';
import template from './person-card-dialog.html';
import { resolve } from '@aurelia/kernel';

@customElement({
  name: 'person-card-dialog',
  template,
})
export class PersonCardDialog {
  public person!: FakePerson;

  private readonly controller: IDialogController = resolve(IDialogController);
  public constructor() {
    const dialogDom: IDialogDom = resolve(IDialogDom);
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