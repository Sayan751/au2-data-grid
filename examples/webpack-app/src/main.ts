import { Aurelia, StandardConfiguration } from '@aurelia/runtime-html';
import { DataGridConfiguration } from 'au2-data-grid';
import { AppRootCustomElement as component } from './app-root';

(async function () {
  const host = document.querySelector<HTMLElement>('app')!;

  const au = new Aurelia()
    .register(
      StandardConfiguration,
      DataGridConfiguration,
    );
  au.app({ host, component });

  await au.start();
})().catch(console.error);
