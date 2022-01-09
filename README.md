# au2-data-grid

> The development for this project is still in progress. Thus the following documentation can change in future.

This repository contains a data-grid implementation based on Aurelia2 and CSS grid. The highlight of this implementation is that the grid can be defined completely in markup which gives you the freedom of using your own awesome Aurelia2 custom elements. An example usage looks something like below.

```html
<data-grid model.bind="people">

  <!-- column #1 -->
  <grid-column>
    <header>
      <value-text value="First name"></value-text>        <!-- custom element -->
    </header>
    <normal-text value.bind="item.fname"></normal-text>   <!-- custom element -->
  </grid-column>

  <!-- column #2 -->
  <grid-column>
    <header>
      <value-text value="Last name"></value-text>
    </header>
    <normal-text value.bind="item.lname"></normal-text>
  </grid-column>

  <!-- column #3 -->
  <grid-column>
    <header>
      <value-text value="Age"></value-text>
    </header>
    <normal-text value.bind="item.age"></normal-text>
  </grid-column>
</data-grid>
```
In the example above a custom element named `value-text` is used for the header and for the content another custom element named `normal-text` is used.

Moreover, the following features are also supported:

- Configurable item selection: single as well as multiple or none.
- Static content or content backed with backend services (does not provide any HTTP pipeline; thus, giving freedom of reusing your own HTTP pipeline).
- Page-able content/data.
- Data can be sorted via callback.
- Columns can be reordered, without essentially rerendering the grid completely.
- Columns can be resized (also without rerendering the grid).

## Examples

Examples can be found in the `./examples/webpack-apps` directory.

| Name           | Description                                                                                                                                                        |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| non-customized | This is a non-customized example of the data-grid. The app contains two examples: one static list, and another one is with backed with a backend resource service (located at `./examples/fake-service`). |
| customized-header | This example shows how to customized the header template. |
| customized-grid | This example shows how to customized the header as well as the grid template. |


## Development

This is a npm7 workspace.
Thus, after cloning the repo you just need to do a `npm ci` at the root to download all the dependencies.

The core package is located at the `./package` directory.
You can start a watch with `npm run watch`. This is useful when you want to test you changes quickly in one of the example webpack-apps.

The webpack-apps as well as the fake-service can be started with `npm start`.