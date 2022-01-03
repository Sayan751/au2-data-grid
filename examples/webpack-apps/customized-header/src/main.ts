import { ConsoleSink, LoggerConfiguration, LogLevel } from '@aurelia/kernel';
import { RouterConfiguration } from '@aurelia/router';
import { Aurelia, CustomElement, DialogDefaultConfiguration, StandardConfiguration } from '@aurelia/runtime-html';
import { DataGridConfiguration, GridHeader } from 'au2-data-grid';
import { AppRoot as component } from './app-root';
import { NormalText } from './custom-elements/normal-text/normal-text';
import { ValueText } from './custom-elements/value-text/value-text';
import template from './custom-grid-header.html';
import './styles.css';
import { PersonCard } from './views/list-with-backend-service/person-card';

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
      DialogDefaultConfiguration,

      DataGridConfiguration.customize(opt => {
        opt.header = CustomElement.define(
          { name: 'grid-header', template },
          GridHeader // <- this is the place to plug your custom implementation
        );
      }),

      NormalText,
      ValueText,
      PersonCard,
    );
  au.app({ host, component });

  await au.start();
})().catch(console.error);
