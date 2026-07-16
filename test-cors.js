fetch("https://corsproxy.io/?https://pixabay.com/sound-effects/search/rain/")
  .then(r => r.text())
  .then(t => console.log(t.substring(0, 500)))
  .catch(e => console.error(e));
