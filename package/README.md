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