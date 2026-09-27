// Runs the solver off the main thread so long searches don't freeze the page.
importScripts('engine.js?v=17');
onmessage = e => {
  let last = 0;
  const res = Engine.solve(e.data.level, e.data.timeMs, n => {
    const now = Date.now();
    if (now - last > 400) { last = now; postMessage({ progress: n }); }
  });
  postMessage({ done: res });
};
