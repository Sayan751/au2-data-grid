/**
 * @returns {HTMLElement[]} All grid-header elements when the default template is used.
 */
export function getHeaders(grid: HTMLElement): HTMLElement[] {
  return Array.from(grid.querySelectorAll('.row:first-of-type grid-header'));
}

/**
 * @returns {string[]} textContents from all the grid-header elements when the default template is used.
 */
export function getHeaderTextContent(grid: HTMLElement): (string | null)[] {
  return getHeaders(grid)
    .map(header => getText(header.querySelector('div>span')));
}

/**
 * @returns {HTMLElement[]} All grid-header elements when the default template is used.
 */
export function getContentRows(grid: HTMLElement): HTMLElement[] {
  return Array.from(grid.querySelectorAll('.row:not(:first-of-type)'));
}

/**
 * @returns {(string | null)[][]} All content-row text when the default template is used.
 */
export function getContentTextContent(grid: HTMLElement): (string | null)[][] {
  return Array.from(grid.querySelectorAll('.row:not(:first-of-type)'))
    .map(row => Array.from(row.children).map(el => getText(el)));
}

/**
 * @returns {string | null} returns the trimmed text content of the given `el`.
 */
export function getText(el: Node | null): string | null {
  return el?.textContent?.trim() ?? null;
}