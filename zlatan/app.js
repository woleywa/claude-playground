const QUOTES = [
  "I am Zlatan.",
  "I came like a king, left like a legend.",
  "An injury is nothing compared to playing for Zlatan.",
  "I don't need to practice. I'm already good.",
  "When you buy me, you are buying a Ferrari. If you drive a Ferrari you put premium petrol in the tank. You don't go to IKEA for servicing.",
  "I am like fine wine. I get better with age. I'm gonna keep getting better and better — and when I think I'm done, I'll get even better.",
  "I'm not a normal person. I'm Zlatan.",
  "One Zlatan Ibrahimović is worth more than 1,000 ordinary players.",
  "If I had played in England, there would have been no room for anyone else. Only for Zlatan.",
  "Football was invented for Zlatan Ibrahimović.",
  "Everywhere I have been, I have been the best. And I will continue that way.",
  "I don't do well being told what to do. I do well doing what I want.",
  "A World Cup without me is not worth watching.",
  "I was born to play football, just as Picasso was born to paint.",
];

const FACTS = [
  '"zlatan" cannot be used as a password. It is too strong.',
  "Zlatan doesn't use Google Maps. Google Maps asks Zlatan for directions.",
  "Zlatan once parallel-parked a bus. On the first try.",
  "Zlatan counted to infinity. Twice. Then he got bored.",
  "Zlatan doesn't read books. He stares them down until they give him the information he wants.",
  "When Zlatan enters a room, he doesn't turn on the lights. The lights turn themselves on out of respect.",
  "Zlatan's tears can cure injuries. Too bad Zlatan never cries.",
  "Zlatan once kicked a ball so hard it went back in time. That's how they invented football.",
  "Zlatan doesn't age. Time simply gets older in his presence.",
  'Zlatan was asked to fill in a form: Name, Address, Occupation. He wrote: "Zlatan. Everywhere. The best."',
  "Scientists have confirmed that a Zlatan bicycle kick generates more energy than a small nuclear reactor.",
  "Chuck Norris has a poster of Zlatan on his wall.",
  "Zlatan can speak all languages, including body language. And silence.",
  "When Zlatan arrived late at school, the teacher scolded the whole class for arriving early.",
  "When Zlatan goes on Google, Google accepts his terms and conditions.",
  "Zlatan once came off the bench at 38 years old and scored twice in six minutes to win a match. This actually happened.",
];

// ── Votes ────────────────────────────────────────────────────────────────────

function loadVotes() {
  try { return JSON.parse(localStorage.getItem('zlatan_votes') || '{}'); }
  catch { return {}; }
}

function saveVotes(votes) {
  localStorage.setItem('zlatan_votes', JSON.stringify(votes));
}

function vote(type, idx, dir) {
  const votes = loadVotes();
  const key = `${type}-${idx}`;
  const current = votes[key];
  votes[key] = current === dir ? null : dir;
  saveVotes(votes);
  renderAll();
}

// ── Rendering ─────────────────────────────────────────────────────────────────

function makeItem(text, type, idx, tag) {
  const votes = loadVotes();
  const myVote = votes[`${type}-${idx}`] || null;

  const wrap = document.createElement('div');
  wrap.className = 'item';

  const content = document.createElement(tag);
  content.textContent = text;
  wrap.appendChild(content);

  const row = document.createElement('div');
  row.className = 'vote-row';

  const up = document.createElement('button');
  up.className = 'vote-btn up' + (myVote === 'up' ? ' active' : '');
  up.textContent = '👍';
  up.title = 'Love it';
  up.addEventListener('click', () => vote(type, idx, 'up'));

  const down = document.createElement('button');
  down.className = 'vote-btn down' + (myVote === 'down' ? ' active' : '');
  down.textContent = '👎';
  down.title = 'Meh';
  down.addEventListener('click', () => vote(type, idx, 'down'));

  row.appendChild(up);
  row.appendChild(down);
  wrap.appendChild(row);

  return wrap;
}

function renderSection(items, type, tag, containerId) {
  const el = document.getElementById(containerId);
  el.innerHTML = '';
  items.forEach((text, idx) => el.appendChild(makeItem(text, type, idx, tag)));
}

function renderFeatured() {
  const qEl = document.getElementById('featured-quote');
  const fEl = document.getElementById('featured-fact');
  if (qEl._rendered) return;
  qEl._rendered = true;

  const q = QUOTES[Math.floor(Math.random() * QUOTES.length)];
  const f = FACTS[Math.floor(Math.random() * FACTS.length)];

  qEl.textContent = q;
  fEl.textContent = f;
}

function renderAll() {
  renderSection(QUOTES, 'q', 'blockquote', 'quotes');
  renderSection(FACTS, 'f', 'p', 'facts');
}

renderFeatured();
renderAll();
