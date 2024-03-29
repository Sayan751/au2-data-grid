# @sparser/au2-data-grid

This is a data-grid that can be used in [Aurelia2](https://github.com/aurelia/aurelia) applications.
The grids can be defined completely in markup which gives you the freedom of using your own awesome Aurelia2 custom elements, instead of writing a tons of configuration code.

Moreover, the following features are also supported:

- Configurable item selection: single as well as multiple or none.
- Static content or content backed with backend services (does not provide any HTTP pipeline; thus, giving freedom of reusing your own HTTP pipeline).
- Page-able content/data.
- Data can be sorted via callback.
- Columns can be reordered, without essentially rerendering the grid completely.
- Columns can be resized (also without rerendering the grid).

## Examples

To explore the features of the data-grid on your own, you can check out this [collection of examples](https://stackblitz.com/@Sayan751/collections/sparser-au2-data-grid).
Note that these examples are used in this documentations as well.

## Installation

```shell
npm install @sparser/au2-data-grid
```

## Getting Started

In order to use the data-grid, we need to first create a `ContentModel`.
For start it is enough to know that a [`ContentModel`](#content-model-api) holds the data that needs to be displayed in the grid.

```typescript
import { ILogger, resolve } from '@aurelia/kernel';
import { ContentModel } from '@sparser/au2-data-grid';

class Person {
  public constructor(
    public fname: string,
    public lname: string,
    public age: number
  ) {}
}

export class MyApp {
  private readonly logger: ILogger = resolve(ILogger).scopeTo('my-app');
  private readonly people: ContentModel<Person> = new ContentModel<Person>(
    /** allItems */ [
      new Person('Bruce', 'Wayne', 42),
      new Person('Clark', 'Kent', 43),
      new Person('Diana', 'Prince', 44),
      new Person('Billy', 'Batson', 24),
    ],
    /** pagingOptions    */ null,
    /** selectionOptions */ null,
    /** onSorting        */ null,
    /** logger           */ this.logger
  );
}
```

Note that in this example, we have used a static list of `Person` objects for the content model.

> For other options, like sorting, paging, etc. please refer to the [`ContentModel`](#content-model-api) documentation.

Next, define the grid in markup.

```html
<data-grid model.bind="people">

  <grid-column>
    <header>
      <strong>First name</strong>
    </header>
    <span>${item.fname}</span>
  </grid-column>

  <grid-column>
    <header>
      <strong>Last name</strong>
    </header>
    <span>${item.lname}</span>
  </grid-column>

  <grid-column>
    <header>
      <strong>Age</strong>
    </header>
    <span>${item.age}</span>
  </grid-column>

</data-grid>
```

This example, demonstrates that a grid can be used by using the `data-grid` custom element and binding the `model` property to the `ContentModel` instance.
To define the columns, we use the `grid-column` element.
Note that the templates for both the header and the content of the column can be defined as the children of the `grid-column` element.
For header, a `header` element is used.
Anything apart from the `header` element is considered as the content of the column.

This package ships a minimal CSS; if you are not overriding the CSS and/or the OOTB custom element templates, then you need to import the CSS in your application.

```css
/* app.css */
@import '@sparser/au2-data-grid/dist/styles.css';
```

Complete everything, by registering the `DataGridConfiguration` to the Aurelia2 DI container, and importing the CSS in your application.

```typescript
import { Aurelia, StandardConfiguration } from '@aurelia/runtime-html';
import { DataGridConfiguration } from '@sparser/au2-data-grid';
import { MyApp as component } from './my-app';
import './app.css'; // <-- import the CSS

(async function () {
  const host = document.querySelector<HTMLElement>('app');
  const au = new Aurelia();
  au.register(StandardConfiguration, DataGridConfiguration);
  au.app({ host, component });
  await au.start();
})().catch(console.error);
```

See this example in action in this [StackBlitz demo](https://stackblitz.com/edit/au2-data-grid-getting-started?file=src%2Fmy-app.ts).

## Integrate with backend service

The previous example dealt with a static list of objects.
However, it is often the case, that the data, shown in the grid, is fetched from a backend service.
The integration with a backend service is supported by configuring the paging options for the content model.
Note that it is possible to integrate with a backend service with and without paging.

### With paging

Let us first see how to integrate with a backend service with paging, as it is probably the most common scenario.
To this end, we can modify the previous example, as follows:

```typescript
this.people = new ContentModel<Person>(
  /** allItems */ null,
  /** pagingOptions    */ {
    pageSize: 5,
    async fetchPage(
      currentPage: number,
      pageSize: number,
      model: ContentModel<Person>
    ) {
      const res = await fetch(
        `/people?skip=${(currentPage - 1) * pageSize}&top=${pageSize}`
      );
      return await res.json();
    },
    async fetchCount() {
      const response = await fetch(`/people/count`);
      return response.json();
    },
  },
  /** selectionOptions */ null,
  /** onSorting        */ null,
  /** logger           */ logger
);
```

Note that this example does no-longer uses a static list of `Person` objects.
Instead, it uses the `fetchPage` callback to fetch the data from the backend service.
The `pageSize` and the `currentPage` are passed to the `fetchPage` callback, which can be used to fetch a chunk/page of data from the backend service (depending on your backend service implementation you need to change how the `pageSize` and `currentPage` information needs to be used).

Additionally note that there is also a `fetchCount` callback.
This can be used to fetch the total number of items from the backend service.
This information is used to calculate the total number of pages.

These callbacks are useful when dealing with paged data-grids.

See this example in action in this [StackBlitz demo](https://stackblitz.com/edit/au2-data-grid-with-backend-service-and-paging?file=src%2Fmy-app.ts).

> If you are wondering about the backend service in the example, the data is fetched from a JSON file, via webpack-dev-server middleware.

### Without paging

If you do not want use paging, then you can set the `pageSize` to `null` in the paging options of the content model.
In this case as well, the `fetchPage` callback is used to fetch the data from the backend service.

An example looks as follows.

```typescript
this.people = new ContentModel<Person>(
  /** allItems */ null,
  /** pagingOptions    */ {
    pageSize: null, // <-- no paging
    async fetchPage(
      _currentPage: number,
      _pageSize: number,
      _model: ContentModel<Person>
    ) {
      const res = await fetch(`/people`);
      return await res.json();
    },
    async fetchCount() {
      const response = await fetch(`/people/count`);
      return response.json();
    },
  },
  /** selectionOptions */ null,
  /** onSorting        */ null,
  /** logger           */ logger
);
```

See this example in action in this [StackBlitz demo](https://stackblitz.com/edit/au2-data-grid-with-backend-service-without-paging?file=src%2Fmy-app.ts).

## Page a static list

The [getting started example](#getting-started), showed how to use a static list of objects.
However, the example did not show how to page the static list.
This can be done by setting the `pageSize` in the paging options of the content model.

An example looks as follows.

```typescript
this.people = new ContentModel<Person>(
  /** allItems */ data,
  /** pagingOptions    */ {
    pageSize: 5, // <-- page size
  },
  /** selectionOptions */ null,
  /** onSorting        */ null,
  /** logger           */ logger
);
```

See this example in action in this [StackBlitz demo](https://stackblitz.com/edit/au2-data-grid-with-static-list-and-paging?file=src%2Fmy-app.ts).

## Selection

The selection options of the content model can be configured to support selection of items.

An example looks as follows.

```typescript
import { ContentModel, ItemSelectionMode } from '@sparser/au2-data-grid';

// code omitted for brevity

this.people = new ContentModel<Person>(
  /** allItems */ data,
  /** pagingOptions    */ null,
  /** selectionOptions */ {
    mode: ItemSelectionMode.single,
    onSelectionChange(
      selectedPeople: Person[],
      isOneSelected: boolean,
      isAnySelected: boolean
    ) {
      console.log(
        `isOneSelected: ${isOneSelected} | isAnySelected: ${isAnySelected}`
      );
      for (const person of selectedPeople) {
        console.log(person.toString());
      }
    },
  },
  /** onSorting        */ null,
  /** logger           */ logger
);
```

Note that you need to configure the `mode` of the selection options to either `ItemSelectionMode.single` or `ItemSelectionMode.multiple`, as per your need.
The `onSelectionChange` callback is invoked whenever the selection changes.

The items can be selected by clicking on the row.
When the `mode` is set to `ItemSelectionMode.multiple`, then multiple items can be selected by <kbd>Ctrl + Click</kbd> (individual items) or <kbd>Shift + Click</kbd> (range of items).

If the mode is configured to `ItemSelectionMode.none`, then the selection of items is disabled.

See this example in action in this [StackBlitz demo](https://stackblitz.com/edit/au2-data-grid-selection?file=src%2Fmy-app.ts).

## Sorting

To sort data, one need to firstly mark the columns as sortable.
To that end, the `property` attribute of the `grid-column` element needs to be set.
This marks the columns as sortable; that is column header can be clicked to sort the data.

```html
<data-grid model.bind="people">
  <grid-column property="fname"> <!-- the grid is configured to be sorted by first name -->
    <header>
      <strong>First name</strong>
    </header>
    <span>\${item.fname}</span>
  </grid-column>
  <grid-column>                  <!-- the grid is configured not to be sorted bz the last name -->
    <header>
      <strong>Last name</strong>
    </header>
    <span>\${item.lname}</span>
  </grid-column>
  <grid-column property="age">    <!-- the grid is configured to be sorted by age -->
    <header>
      <strong>Age</strong>
    </header>
    <span>\${item.age}</span>
  </grid-column>
</data-grid>
```

Secondly, the `onSorting` option of the content model needs to be configured.
It takes a callback that is invoked whenever the sorting changes.
The method signature is as follows.

```typescript
function (
  newValue: SortOption<T>[],
  oldValue: SortOption<T>[],
  allItems: T[] | null,
  model: ContentModel<T>
):void;
```

The `newValue` and `oldValue` are the new and old sort options respectively.
A `SortOption` is consists of a `property` and a `direction`.
The `property` comes from the `property` attribute of the `grid-column` element.
The `direction` can be either `Ascending` or `Descending`.

The `allItems` is the list of all items in the content model, when the content model is backed by a static list.
In that case, the `allItems` can be directly sorted.
When the content model is backed by a backend service, then the `allItems` is `null`, and appropriate action needs to be taken to sort the data.

The `model` is the content model itself.

Note that the data-grid does not provide any way to sort the data out-of-the-box.
Rather, the responsibility is delegated to the consumer of the data-grid.
One must leverage the `onSorting` callback to sort the data, depending on whether the data is static or backed by a backend service.

### Examples
Here is couple of concrete examples related to sorting.

- [Grid backed by static list](https://stackblitz.com/edit/au2-data-grid-with-static-list-and-sorting?file=src%2Fmy-app.ts)
- [Grid backed by backend service](https://stackblitz.com/edit/au2-data-grid-with-backend-service-and-sorting?file=src%2Fmy-app.ts)

### Default sorting

If you have visited the preceding examples, you might have noticed that the grid is not sorted by default.
To load sorted data in the grid, one must use the `sort-direction` attribute of the `grid-column` element.
There are two possible values for the `sort-direction` attribute: `Ascending` and `Descending`.
An example looks as follows.

```html
<data-grid model.bind="people">
  <grid-column property="fname" sort-direction="Descending">
    <header>
      <strong>First name</strong>
    </header>
    <span>\${item.fname}</span>
  </grid-column>
  <grid-column>
    <header>
      <strong>Last name</strong>
    </header>
    <span>\${item.lname}</span>
  </grid-column>
  <grid-column property="age"  sort-direction="Ascending">
    <header>
      <strong>Age</strong>
    </header>
    <span>\${item.age}</span>
  </grid-column>
</data-grid>
```

In this example, the grid is configured to be sorted by the first name in descending order, and by age in ascending order, by default.
e are assuming here that a capable `onSorting` callback is configured for the content model.

**Examples:**

- [Grid backed by static list](https://stackblitz.com/edit/au2-data-grid-with-static-list-and-default-sorting?file=src%2Fmy-app.ts)
- [Grid backed by backend service](https://stackblitz.com/edit/au2-data-grid-with-backend-service-and-default-sorting?file=src%2Fmy-app.ts)

## Column reordering

The columns of the grid can be reordered by dragging the column headers and dropping them at the desired position (left/right of other columns).
For this to work, you don't need to configure anything else.

You can try to reorder the columns in this [StackBlitz demo](https://stackblitz.com/edit/au2-data-grid-getting-started?file=src%2Fmy-app.ts) from the [getting started section](#getting-started).

Note that the column reordering happens without re-rendering the grid completely.
Thus, when the list is backed by a backend service, the reordering of columns does not trigger a new request to the backend service.

## Invoke action on row click

The grid supports invoking an action when a row is clicked.
To this end, bind the `item-clicked` delegate of the `data-grid` custom element to a method in your view-model.
The method signature is as follows.

```typescript
function (data: { item: unknown, index: number }): void;
```

The `item` is the item that was clicked, and the `index` is the index of the item in the list.

When the `item-clicked` delegate is bound, the delegate is invoked whenever a row is clicked when the selection mode is set to `ItemSelectionMode.None`, or a row is double clicked when the selection mode is set to `ItemSelectionMode.Single` or `ItemSelectionMode.Multiple`.

An example looks as follows.

```html
<data-grid model.bind item-clicked.bind>
  <!-- code omitted for brevity -->
</data-grid>
```

```typescript
import { bound } from '@aurelia/kernel';

export class MyApp {
  // code omitted for brevity
  @bound
  private itemClicked({ item, index }: { item: Person; index: number }): void {
    console.log(`#${index + 1} item clicked: ${item.toString()}`);
  }
}
```

See the example in action in this [StackBlitz demo](https://stackblitz.com/edit/au2-data-grid-item-clicked-delegate?file=src%2Fmy-app.ts).

## Hidden columns

The columns of a data-grid can be hidden by binding the `hidden-columns` property of the `data-grid` custom element to an array of column names.
An example looks as follows.

```html
<data-grid model.bind="people" hidden-columns.bind="['age', 'hidden']">
  <grid-column>
    <header>
      <strong>First name</strong>
    </header>
    <span>\${item.fname}</span>
  </grid-column>
  <grid-column>
    <header>
      <strong>Last name</strong>
    </header>
    <span>\${item.lname}</span>
  </grid-column>
  <grid-column property="age">
    <header>
      <strong>Age</strong>
    </header>
    <span>\${item.age}</span>
  </grid-column>
  <grid-column id="hidden">
    <header>
      <strong>Hidden</strong>
    </header>
    <span>This should not be visible</span>
  </grid-column>
</data-grid>
```

In this example, the `age` and `hidden` columns are hidden.
The values in the `hidden-columns` array are the `id` or `property` values of the `grid-column` elements.

> For more information on the `id` and `property` attributes refer the [state documentation](#grid-state).

See this example in action in this [StackBlitz demo](https://stackblitz.com/edit/au2-data-grid-hidden-columns?file=src%2Fmy-app.ts).

## Grid state

The grid has a bindable `state` property.
It can be used to persist and apply the state of the grid.
The state of the grid consists of the following information.

- The order of the columns in the grid.
- The name of the property for the column that is used to sort the data, and the direction of the sort.
- If the column is re-sizeable.
- The width of the column.

The contract of the `state` property is as follows.

```typescript
interface ExportableGridState {
  columns: ExportableColumnState[];
}

interface ExportableColumnState {
  readonly id: string;
  readonly property: string | null;
  readonly isResizable: boolean;
  widthPx: string | null;
  direction: SortDirection | null;
}
```

When the `state` property is not bound, these information are collected from markup (how the `data-grid` is used).
Any changes done to the grid by the end user are persisted in the `state` property.

Note that the column state includes an `id` property.
The usage of `id` attribute for a `grid-column` element is optional.
If the `id` attribute is not specified, then the `property` attribute is used as the `id`.
If none of the `id` and `property` attributes are specified, then the grid state is considered to be non exportable.
In other words, the grid state can only be exported when the `id` or `property` attribute is specified for all the `grid-column` elements.

Persisting and applying the grid state is useful when one wants to persist the preferences (order of the column, default sorting etc.) of the end user for a grid.

A simplistic example can look as follows.

```html
<data-grid model.bind state.two-way>
  <!-- code omitted for brevity -->
</data-grid>
```

```typescript
export class MyApp {
  private static readonly storageKey = 'fe95a996-e588-4c3d-ac77-d73d478c4c19';

  @observable
  private state: ExportableGridState;

  public constructor() {
    // restore the state from the persistance store
    this.state = JSON.parse(localStorage.getItem(MyApp.storageKey));
  }

  private stateChanged() {
    // persist the state in the persistance store
    localStorage.setItem(MyApp.storageKey, JSON.stringify(this.state));
  }
}
```

This example can be seen in action in this [StackBlitz demo](https://stackblitz.com/edit/au2-data-grid-state?file=src%2Fmy-app.ts).

## Customization

This package provides a minimal CSS to style the grid.
In a real application, such minimal CSS might not be sufficient or may not match the existing styles and/or theme of the application.
To support such cases, this package provides a way to register custom implementations.

There are two custom elements provided by this package out of the box, namely `data-grid` and `grid-header`.
It is possible to register custom implementations and/or markup for these custom elements.

> If you want to customize the out of the box custom elements, it is assumed that you are familiar with Aurelia 2 custom elements.

To this end, you can use the `customize` method of the `DataGridConfiguration`.
An example looks as follows.

```typescript
import {
  Aurelia,
  CustomElement,
  StandardConfiguration,
} from '@aurelia/runtime-html';
import { DataGridConfiguration, GridHeader, DataGrid } from '@sparser/au2-data-grid';

const au = new Aurelia();
au.register(
  StandardConfiguration,
  DataGridConfiguration.customize((opt) => {
    opt.header = CustomElement.define(
      { name: 'grid-header', template: `CUSTOM_TEMPLATE` },
      GridHeader // <- this is the place to plug your custom implementation
    );
    opt.grid = // <-- register custom definition for the data-grid custom element
  })
);
```

**Examples**

- [Custom grid header](https://stackblitz.com/edit/au2-data-grid-custom-header?file=src%2Fmain.ts): Customization of sort marker icon in the grid header.
- [Custom data grid](https://stackblitz.com/edit/au2-data-grid-custom-grid?file=src%2Fmain.ts): Customization of the data grid with a row separator.

## Content model API

This section describes the useful methods and properties of the `ContentModel` class.

### Constructor

The constructor of the `ContentModel` class takes the following arguments.

```typescript
constructor(
  allItems: T[] | null,
  pagingOptions: PagingOptions<T> | null,
  selectionOptions: SelectionOptions<T> | null,
  onSorting: OnSorting<T> | null,
  logger: ILogger
)
```

The `allItems` is the list of all items in the content model, when the content model is backed by a static list.
To back the content model, and thereby the grid, with a backend service, the `allItems` can be set to `null`.
In that case, the `fetchPage` callback of the `pagingOptions` is used to fetch the data from the backend service.
Note that either one of those two options must be set.
If both are set, then the `allItems` is used; that is the grid is considered to be backed by a static list.

### Paging

The following properties provides paging related information.

- `currentPage`: The collection of items in the current page of the grid.
- `totalCount`: The total number of items in the grid. When the grid is backed by a backend service, this information is fetched using the `fetchCount` callback of the `pagingOptions`. Otherwise, this is the length of the `allItems` array.
- `pageCount`: The total number of pages in the grid.
- `currentPageNumber`: The current page number.

To navigate to the next page, use `goToNextPage()` method.

```typescript
model.goToNextPage();
```

To navigate to the previous page, use `goToPreviousPage()` method.

```typescript
model.goToPreviousPage();
```

To navigate to a specific page, use `goToPage()` method.

```typescript
model.goToPage(3);
```

To see example of navigating between pages, see this [StackBlitz demo](https://stackblitz.com/edit/au2-data-grid-with-backend-service-and-paging?file=src%2Fmy-app.ts).

### Waiting for backend service

When the grid is backed by a backend service, the `fetchPage` and `fetchCount` callback is expected to be asynchronous.
The content model exposes a `wait` method to wait for the promises returned by these callbacks to settle.
An example looks as follows.

```typescript
await model.wait();
```

Based on your error handling strategy, you can use `await model.wait(true)` to throw an error when any of those promises are rejected.

### Refreshing data

To refresh the data in the grid, use the `refresh()` method.

```typescript
await model.refresh();
```

This sets the page number to `1` and causes the grid to display the first page of data.
When backed by a backend service, this method causes the `fetchPage` and `fetchCount` callbacks to be invoked.

### Selection

The following readonly properties provides selection related information.

- `selectedItems`: The list of selected items in the grid.
- `isOneSelected`: `true` if exactly one item is selected; `false` otherwise.
- `isAnySelected`: `true` if at least one item is selected; `false` otherwise.
- `selectionCount`: The number of selected items in the grid.
- `selectionMode`: The selection mode of the grid (`ItemSelectionMode.None`, `ItemSelectionMode.Single`, or `ItemSelectionMode.Multiple`)

To select a single item in the grid, use the `selectItem()` method.

```typescript
model.selectItem(item);
```

To select a range of items in the grid, use the `selectRange()` method.

```typescript
// selects the first 5 items in the current page of the grid
model.selectRange(0, 4);
```

To toggle the selection of an item in the grid, use the `toggleSelection()` method.

```typescript
model.toggleSelection(item);
```

To clear all of the selected items in the grid, use the `clearSelections()` method.

```typescript
model.clearSelections();
```

To detect if an item is selected, use the `isSelected()` method.

```typescript
model.isSelected(item);
```

### Sorting

To apply sorting, use the `applySorting()` method.

```typescript
model.applySorting(
  { property: 'fname', direction: SortDirection.Ascending },
  { property: 'age', direction: SortDirection.Descending }
);
```

This method invokes the `onSorting` callback with the new and old sort options, and sets the page number to 1.
Note that the content model does not provide any way to sort the data out-of-the-box.
It needs to be done by the consumer of the content model using the `onSorting` callback and/or the `fetchPage` callback.

## CSS variables used

This section lists the CSS variables used while styling the grid.
If you are overriding the CSS, then these information might be useful.

| CSS variable name | Description |Default value|
|-------------------|-------------|-------------|
|`--resize-handle-width`|The width of the resize handle, the `svg` element used to mark the end of a column, and can be dragged to resize the column.|`7px`|
|`--resize-handle-height`|The height of the resize handle.|`15px`|
|`--handle-color`|The color of the resize handle.|`#333`|
|`--col-gap`|The gap between columns in the grid.|`1rem`|
|`--row-gap`|The gap between rows in the grid.|The half of the `col-gap`|
|`--selected-row-bg`|The background color of the selected rows.|`#999`|
|`--num-columns`|The number of columns in the grid; used to determine the column templates in the grid. |set programmatically on runtime|
