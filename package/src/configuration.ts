import {
  Constructable,
  IContainer,
  noop,
} from '@aurelia/kernel';
import {
  CustomElementType,
} from '@aurelia/runtime-html';
import {
  DataGrid,
  DefaultDataGrid,
  defineDataGridCustomElement,
} from './data-grid.js';
import {
  GridHeader,
} from './grid-header.js';

export type ConfigurationProvider<
  TGrid extends Constructable<DataGrid>,
  THeader extends Constructable<GridHeader>,
  > = (options: CustomizationOptions<TGrid, THeader>) => void;

interface DataGridRegistration<TGrid extends Constructable<DataGrid>, THeader extends Constructable<GridHeader>> {
  optionsProvider: ConfigurationProvider<TGrid, THeader>;
  register(container: IContainer): void;
  customize(cb?: ConfigurationProvider<TGrid, THeader>): DataGridRegistration<TGrid, THeader>;
}

function createConfiguration<
  TGrid extends Constructable<DataGrid>,
  THeader extends Constructable<GridHeader>,
  >(
    optionsProvider: ConfigurationProvider<TGrid, THeader>
  ): DataGridRegistration<TGrid, THeader> {
  return {
    optionsProvider,
    register(container: IContainer): void {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const options: CustomizationOptions<TGrid, THeader> = Object.create(null);
      optionsProvider(options);
      const grid = options.grid;
      if (grid != null) {
        container.register(grid);
        return;
      }
      const header = options.header;
      if (header != null) {
        container.register(defineDataGridCustomElement(header));
        return;
      }
      container.register(DefaultDataGrid);
    },
    customize(cb?: ConfigurationProvider<TGrid, THeader>): DataGridRegistration<TGrid, THeader> {
      return createConfiguration(cb ?? optionsProvider);
    }
  };
}

// eslint-disable-next-line @typescript-eslint/naming-convention
export const DataGridConfiguration = createConfiguration(noop);
export interface CustomizationOptions<
  TGrid extends Constructable<DataGrid>,
  THeader extends Constructable<GridHeader>,
  > {
  grid?: CustomElementType<TGrid>;
  header?: CustomElementType<THeader>;
}