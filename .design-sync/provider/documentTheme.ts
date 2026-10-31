// Marks the document as Symphony's theme BEFORE any Mosaik module loads.
//
// This file deliberately imports nothing. Mosaik elements resolve their themed
// stylesheet in Lit's static finalizeStyles(), which reads
// document.documentElement's `theme` attribute and caches the result the first
// time the class is finalized -- which happens as the element modules evaluate.
// Anything that imports Mosaik in order to set the attribute is therefore
// already too late: the classes are finalized without their Soho stylesheet and
// every component renders as a bare shadow-DOM element in the browser default
// font. Importing this module first in the bundle entry is what makes the
// theme stick.
//
// Symphony's own index.html carries the same two attributes on <html>. The
// Design System page and Design canvases switch their theme through
// data-theme, whose "dark" theme is Symphony's dark mode.

if (typeof document !== 'undefined') {
  const root = document.documentElement;
  root.setAttribute('theme', 'soho');
  root.setAttribute('theme-mode', root.getAttribute('data-theme') === 'dark' ? 'dark' : 'light');
}
