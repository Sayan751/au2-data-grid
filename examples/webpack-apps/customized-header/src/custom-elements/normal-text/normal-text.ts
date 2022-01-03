import { bindable, customElement } from '@aurelia/runtime-html';
import template from './normal-text.html';

@customElement({ name: 'normal-text', template })
export class NormalText {
  @bindable public value!: string;
}