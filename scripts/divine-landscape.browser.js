(() => {
  const field = text => Array.from(document.querySelectorAll('label')).find(l => l.textContent.startsWith(text));
  const monitor = document.querySelector('.timeline-monitor');
  const toolbar = Array.from(document.querySelectorAll('.toolbar')).find(t => t.textContent.includes('Timeline editor'));
  const buttons = Array.from(toolbar.querySelectorAll('button'));
  const result = {
    aspect: monitor.className,
    variant: toolbar.querySelector('select').value,
    narration: field('Variant narration')?.querySelector('textarea')?.value,
    audioStart: field('Recording start timestamp')?.querySelector('input')?.value,
    voiceId: field('Voice ID for this scene')?.querySelector('input')?.value,
    hasPromptPack: buttons.some(b => b.textContent.includes('Download timed prompts')),
    hasOutro: buttons.some(b => b.textContent.includes('Add subscribe')),
    toolbarWrap: getComputedStyle(toolbar).flexWrap,
    browserPosition: JSON.parse(localStorage.getItem('studio-position-a39b4823-f4d4-436b-be68-7d6694418d36')),
  };
  if (!result.aspect.includes('landscape') || result.variant !== 'gita-1-1-te-landscape-v2' || !result.hasPromptPack || !result.hasOutro || result.toolbarWrap !== 'wrap') throw Error('Landscape UI check failed');
  return result;
})()
