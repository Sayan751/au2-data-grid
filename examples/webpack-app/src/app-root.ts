import { customElement, ICustomElementViewModel } from '@aurelia/runtime-html';
import template from './app-root.html';

@customElement({ name: 'app-root', template })
export class AppRootCustomElement implements ICustomElementViewModel { }

