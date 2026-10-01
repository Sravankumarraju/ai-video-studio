(() => {
  const field = text => Array.from(document.querySelectorAll('label')).find(l => l.textContent.startsWith(text));
  const caption = document.querySelector('.browser-caption');
  return {
    narration: field('Variant narration')?.querySelector('textarea')?.value,
    title: field('Title overlay')?.querySelector('input')?.value,
    font: field('Caption font')?.querySelector('select')?.value,
    captionText: caption?.textContent,
    captionWhiteSpace: caption ? getComputedStyle(caption).whiteSpace : null,
    monitorImage: document.querySelector('.timeline-monitor img')?.getAttribute('src'),
    playhead: document.querySelector('input[aria-label="Timeline playhead"]')?.value,
  };
})()
