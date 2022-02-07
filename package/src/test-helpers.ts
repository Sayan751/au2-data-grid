/* eslint-disable @typescript-eslint/no-non-null-assertion */
/**
 * @returns {HTMLElement[]} All grid-header elements when the default template is used.
 */
export function getHeaders(grid: HTMLElement): HTMLElement[] {
  return Array.from(grid.querySelectorAll('.row:first-of-type grid-header'));
}

/**
 * @returns {string[]} textContents from all the grid-header elements when the default template is used.
 */
export function getHeaderTextContent(grid: HTMLElement): string[] {
  return getHeaders(grid)
    .map(header => header.querySelector('div>span')!.textContent!);
}

/**
 * @returns {HTMLElement[]} All grid-header elements when the default template is used.
 */
export function getContentRows(grid: HTMLElement): HTMLElement[] {
  return Array.from(grid.querySelectorAll('.row:not(:first-of-type)'));
}

export function getText(el: Node | null): string | null {
  return el?.textContent?.trim() ?? null;
}