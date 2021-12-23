- Custom element that shows a collection of data in grid or tabular format
- The syntax loosely looks like as follows

```html
<data-grid model.bind="model">
    <grid-column width="100">
        <header> Un-sortable column </header>
        Whatever goes here is the content
    </grid-column>
    <grid-column property="prop1" non-resizable>
        <header> Header1 </header>
        Whatever goes here is the content
    </grid-column>
    <grid-column property="prop2" sort-direction="desc">
        <header>
            <custom-element-header-content></custom-element-header-content>
        </header>
        <custom-element-cell-content></custom-element-cell-content>
    </grid-column>
</data-grid>
```
- [] Supports item selection
  - [x] single selection
  - [] multiple selection
- [x] The items must be page-able
- [x] Supports sorting
- [x] Supports column reordering
- [x] Supports column resizing
