import { bindable, customElement } from '@aurelia/runtime-html';
import template from './value-text.html';

@customElement({ name: 'value-text', template })
export class ValueText {
  @bindable public value!: string;
}