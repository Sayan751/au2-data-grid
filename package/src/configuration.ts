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

function createConfiguration<
  TGrid extends Constructable<DataGrid>,
  THeader extends Constructable<GridHeader>,
  >(optionsProvider: ConfigurationProvider<TGrid, THeader>) {
  return {
    optionsProvider,
    register(container: IContainer) {
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
    customize(cb?: ConfigurationProvider<TGrid, THeader>) {
      return createConfiguration(cb ?? optionsProvider);
    }
  }
}

export const DataGridConfiguration = createConfiguration(noop);
export interface CustomizationOptions<
  TGrid extends Constructable<DataGrid>,
  THeader extends Constructable<GridHeader>,
  > {
  grid?: CustomElementType<TGrid>;
  header?: CustomElementType<THeader>;
}