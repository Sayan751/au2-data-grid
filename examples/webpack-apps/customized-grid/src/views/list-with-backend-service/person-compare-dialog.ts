import { DialogDomClassic, IDialogController, IDialogDom } from '@aurelia/dialog';
import { customElement } from '@aurelia/runtime-html';
import { FakePerson } from './data-contracts';
import template from './person-compare-dialog.html';
import { resolve } from '@aurelia/kernel';

@customElement({
  name: 'person-compare-dialog',
  template,
})
export class PersonCompareDialog {
  public people!: FakePerson[];
  private readonly controller: IDialogController = resolve(IDialogController);

  public constructor() {
    const dialogDom: DialogDomClassic = resolve(IDialogDom) as DialogDomClassic;
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