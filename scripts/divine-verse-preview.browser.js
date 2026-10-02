(async () => {
  const slider = document.querySelector('input[aria-label="Timeline playhead"]');
  if (!slider) throw Error('Timeline slider missing');
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
  const inspect = async seconds => {
    setter.call(slider, String(seconds));
    slider.dispatchEvent(new Event('input', {bubbles:true}));
    slider.dispatchEvent(new Event('change', {bubbles:true}));
    await new Promise(resolve => setTimeout(resolve, 200));
    const cue = document.querySelector('.browser-caption');
    return {seconds, actual: slider.value, text: cue?.textContent || '', whiteSpace: cue ? getComputedStyle(cue).whiteSpace : null};
  };
  const verse = await inspect(78), after = await inspect(85.2);
  if (!verse.text.includes('ధర్మక్షేత్రే') || after.text.trim()) throw Error('Verse timing or captions-off preview mismatch');
  return {verse,after};
})()
