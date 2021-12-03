import {
  IContainer,
} from '@aurelia/kernel';
import {
  DataGrid,
  DataGridHeaders,
  DataGridContent,
} from './data-grid.js';

export const DataGridConfiguration = {
  register(container: IContainer) {
    container
      .register(
        DataGrid,
        DataGridHeaders,
        DataGridContent,
      );
  }
};