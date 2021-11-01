- Custom element that shows a collection of data in grid or tabular format
- The syntax loosely looks like as follows

```html
<data-grid model.bind="model">
    <grid-column sort-property="prop1">
        <header> Header1 </header>
        Whatever goes here is the content
    </grid-column>
    <grid-column sort-properties="prop2,prop3">
        <header>
            <custom-element-header-content></custom-element-header-content>
        </header>
        <custom-element-cell-content></custom-element-cell-content>
    </grid-column>
</data-grid>
```
- The items must be page-able

- Supports sorting
- Supports item selection
- Supports column reordering
- Supports column resizing
