(() => {
  const select=[...document.querySelectorAll('select')].find(s=>[...s.options].some(o=>o.textContent.includes('Allow unknown cost')));
  if(!select)throw Error('Setup policy control missing');
  const choice=[...select.options].find(o=>o.textContent.includes('Allow unknown cost'));
  if(!choice)throw Error('Requested policy option missing');
  const setter=Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set;
  setter.call(select,choice.value);select.dispatchEvent(new Event('change',{bubbles:true}));
  return {selected:select.value};
})()
