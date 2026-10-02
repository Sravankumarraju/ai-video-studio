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
    const style = cue && getComputedStyle(cue);
    return {seconds, text:cue?.textContent || '', whiteSpace:style?.whiteSpace, background:style?.backgroundColor, fontSize:style?.fontSize};
  };
  const before = await inspect(74.3), verse = await inspect(78), after = await inspect(85.2);
  if (before.text.includes('ధర్మక్షేత్రే') || !verse.text.includes('ధర్మక్షేత్రే') || after.text.includes('ధర్మక్షేత్రే')) throw Error('Complete-verse timing mismatch');
  if (verse.whiteSpace !== 'pre-line' || verse.background !== 'rgba(0, 0, 0, 0)') throw Error('Verse format mismatch');
  return {before,verse,after};
})()
