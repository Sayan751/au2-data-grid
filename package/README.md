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

## Installation

```shell
npm install @sparser/au2-data-grid
```

## Getting Started

In order to use the data-grid, we need to first create a `ContentModel`.
For start it is enough to know that a [`ContentModel`](#content-model) holds the data that needs to be displayed in the grid.

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

> For other options, like sorting, paging, etc. please refer to the [`ContentModel`](#content-model) documentation.

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
import './app.css';

(async function () {
  const host = document.querySelector<HTMLElement>('app');
  const au = new Aurelia();
  au.register(StandardConfiguration, DataGridConfiguration);
  au.app({ host, component });
  await au.start();
})().catch(console.error);
```

See this example in action below.

<iframe src="https://stackblitz.com/edit/au2-data-grid-getting-started?embed=1&file=src%2Fmy-app.ts"></iframe>

## Content model