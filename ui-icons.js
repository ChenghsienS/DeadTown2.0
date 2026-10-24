// Small, code-native pixel glyphs: sharp at every UI scale, with no extra requests.
const UIIcons=(()=>{
  const person=(x,y)=>`<path d="M${x+2} ${y}h4v4h-4zm-2 5h8v6h-2v5h-2v-5h-2v5h-2z"/>`;
  const glyphs={
    solo:person(8,4),
    squad:`<g opacity=".65">${person(1,2)}${person(15,2)}</g><path fill="var(--icon-cutout,#a84437)" d="M7 7h10v17H7z"/>${person(8,8)}`,
    shirt:'<path d="M7 3h3v2h4V3h3l6 5-4 5-2-2v10H7V11l-2 2-4-5z"/><path fill="var(--icon-cutout,#17231b)" d="M10 3h4v3h-4z"/>',
    shop:'<path d="M4 3h16v3H4zM3 7h18l2 6h-4v-2h-3v2h-4v-2H9v2H5v-2H2zm1 7h3v6h4v-6h9v8H4zm10 2v4h4v-4z"/>',
    coin:'<path fill="#8f6330" d="M7 2h10v2h3v3h2v10h-2v3h-3v2H7v-2H4v-3H2V7h2V4h3z"/><path fill="#e1b95f" d="M7 4h10v2h3v11h-3v3H7v-3H4V7h3z"/><path fill="#ffdf8e" d="M7 5h9v2H8v8H6V7h1z"/><path fill="#8f6330" d="M11 8h3v8h-3zM9 10h2v4H9z"/>',
    tools:'<path d="M3 2h3v4h4V2h3v7l-3 3v9H6v-9L3 9zm14 0h3l1 6-2 3v5h2v6h-6v-6h2v-5l-2-3z"/>'
  };
  function markup(name){return `<svg class="uiIcon icon-${name}" viewBox="0 0 24 24" fill="currentColor" shape-rendering="crispEdges" aria-hidden="true" focusable="false">${glyphs[name]||''}</svg>`;}
  return {markup};
})();
