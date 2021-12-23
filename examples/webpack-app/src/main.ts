import { ConsoleSink, LoggerConfiguration, LogLevel } from '@aurelia/kernel';
import { Aurelia, StandardConfiguration } from '@aurelia/runtime-html';
import { RouterConfiguration } from '@aurelia/router';
import { DataGridConfiguration } from 'au2-data-grid';
import { AppRoot as component } from './app-root';
import { NormalText } from './custom-elements/normal-text/normal-text';
import { ValueText } from './custom-elements/value-text/value-text';
import { StaticList } from './views/static-list/static-list';

import './styles.css';

(async function () {
  const host = document.querySelector<HTMLElement>('app')!;

  const au = new Aurelia()
    .register(
      LoggerConfiguration.create({
        $console: console,
        level: LogLevel.info,
        sinks: [ConsoleSink]
      }),
      StandardConfiguration,
      RouterConfiguration.customize({ useUrlFragmentHash: false }),

      DataGridConfiguration,

      StaticList,

      NormalText,
      ValueText,
    );
  au.app({ host, component });

  await au.start();
})().catch(console.error);
