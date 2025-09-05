import { DialogConfigurationClassic } from '@aurelia/dialog';
import { ConsoleSink, LoggerConfiguration, LogLevel } from '@aurelia/kernel';
import { RouterConfiguration } from '@aurelia/router';
import { Aurelia, CustomElement, StandardConfiguration } from '@aurelia/runtime-html';
import { DataGrid, DataGridConfiguration, GridContent, GridHeader, GridHeaders } from '@sparser/au2-data-grid';
import { AppRoot as component } from './app-root';
import { NormalText } from './custom-elements/normal-text/normal-text';
import { ValueText } from './custom-elements/value-text/value-text';
import headerTemplate from './custom-grid-header.html';
import gridTemplate from './custom-data-grid.html';
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
      RouterConfiguration,
      DialogConfigurationClassic,

      DataGridConfiguration.customize(opt => {
        opt.grid = CustomElement.define(
          {
            name: 'data-grid',
            template: gridTemplate,
            dependencies: [
              // TCs
              GridHeaders,
              GridContent,
              //CEs
              CustomElement.define({ name: 'grid-header', template: headerTemplate }, GridHeader),
            ]
          },
          DataGrid, // <- this is the place to plug your custom implementation
        );
      }),

      NormalText,
      ValueText,
      PersonCard,
    );
  au.app({ host, component });

  await au.start();
})().catch(console.error);
