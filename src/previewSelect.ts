/** Enhance native selects where rich options are supported; retain native controls elsewhere. */
export function enhancePreviewSelects(root: HTMLElement) {
  if (!CSS.supports('appearance', 'base-select')) return;
  root.querySelectorAll<HTMLSelectElement>('select[data-field]').forEach((select) => {
    if (select.dataset.field === 'device') return;
    select.classList.add('preview-select');
    const button = document.createElement('button');
    button.type = 'button';
    button.append(document.createElement('selectedcontent'));
    select.prepend(button);
  });
}

export function previewOption(value: number, selected: boolean, text: string, portrait: string) {
  // Unsupported browsers keep the original plain-text options rather than exposing SVG markup.
  const rich = CSS.supports('appearance', 'base-select');
  return `<option value="${value}" ${selected ? 'selected' : ''}>${rich ? `<span class="option-preview" aria-hidden="true">${portrait}</span><span class="option-name">${text}</span>` : text}</option>`;
}
