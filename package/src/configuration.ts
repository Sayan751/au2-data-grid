import { IContainer } from '@aurelia/kernel';
import { DataGrid } from './data-grid.js';

export const DataGridConfiguration = {
  register(container: IContainer) {
    container.register(DataGrid);
  }
};