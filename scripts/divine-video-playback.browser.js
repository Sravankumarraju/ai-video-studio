(async () => {
  const video = document.querySelector('video');
  if (!video) throw Error('No browser video player found');
  video.muted = true;
  await video.play();
  await new Promise(resolve => setTimeout(resolve, 1200));
  const result = { seconds: video.duration, width: video.videoWidth, height: video.videoHeight, readyState: video.readyState, currentTime: video.currentTime, paused: video.paused, error: video.error?.message ?? null };
  video.pause();
  if (result.error || !result.currentTime || !result.width || result.paused) throw Error('Browser playback failed');
  return result;
})()
