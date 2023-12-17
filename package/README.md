# @sparser/au2-data-grid

> This documentation is still a work in progress.

This is a data-grid that can be used in [Aurelia2](https://github.com/aurelia/aurelia) applications.
The grids can be defined completely in markup which gives you the freedom of using your own awesome Aurelia2 custom elements, instead of writing a tons of configuration code.

Moreover, the following features are also supported:

- Configurable item selection: single as well as multiple or none.
- Static content or content backed with backend services (does not provide any HTTP pipeline; thus, giving freedom of reusing your own HTTP pipeline).
- Page-able content/data.
- Data can be sorted via callback.
- Columns can be reordered, without essentially rerendering the grid completely.
- Columns can be resized (also without rerendering the grid).

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

## Content model API

### Navigate between pages

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