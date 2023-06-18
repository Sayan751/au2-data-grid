import { IDialogController, IDialogDom } from '@aurelia/dialog';
import { customElement } from '@aurelia/runtime-html';
import { FakePerson } from './data-contracts';
import template from './person-compare-dialog.html';

@customElement({
  name: 'person-compare-dialog',
  template,
})
export class PersonCompareDialog {
  public people!: FakePerson[];

  public constructor(
    @IDialogController private readonly controller: IDialogController,
    @IDialogDom dialogDom: IDialogDom,
  ) {
    dialogDom.overlay.classList.add('dialog-overlay');
    dialogDom.contentHost.classList.add('dialog');
  }

  public activate(people: FakePerson[]) {
    console.log('activate', people);
    this.people = people;
  }

  private close() {
    this.controller.cancel();
  }
}