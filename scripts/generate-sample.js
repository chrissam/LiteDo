/**
 * Node script to generate a large sample JSON for LiteDo.
 * Usage: node scripts/generate-sample.js 5000 > large-sample.json
 */

function pad(n) { return String(n).padStart(2, '0'); }
function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function choice(arr) { return arr[randInt(0, arr.length - 1)]; }

const count = parseInt(process.argv[2] || '2000', 10);
const priorities = ['Low', 'Med', 'High'];
const tagPool = ['work','home','personal','study','health','project','review','write','plan','chris','sam','team','urgent','low-touch','weekly','monthly'];

function randomDateWithin(daysBack = 120) {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  d.setDate(d.getDate() - randInt(0, daysBack));
  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  return `${yyyy}-${mm}-${dd}`;
}

const tasks = [];
for (let i = 0; i < count; i++) {
  const numTags = randInt(0, 5);
  const tags = Array.from({ length: numTags }).map(() => choice(tagPool));
  const uniqTags = Array.from(new Set(tags));

  const numSubs = randInt(0, 4);
  const subs = Array.from({ length: numSubs }).map((_, j) => `Subtask ${j+1} for task ${i+1}`);
  const subsDone = subs.map(() => Math.random() < 0.4);

  const createdDate = randomDateWithin(180);
  const createdTime = `${pad(randInt(8, 20))}:${pad(randInt(0, 59))}`;
  const dueDate = Math.random() < 0.6 ? randomDateWithin(60) : '';
  const completed = subs.length > 0 ? subsDone.every(Boolean) || Math.random() < 0.3 : Math.random() < 0.3;

  tasks.push({
    id: `${Date.now()}_${i}_${Math.random().toString(36).slice(2,8)}`,
    title: `Task #${i+1}: ${choice(['Refactor','Write','Plan','Review','Fix','Design','Test'])} ${choice(['module','feature','doc','plan','UI'])}`,
    description: `Auto-generated sample task ${i+1}.`,
    completed,
    priority: choice(priorities),
    dueDate,
    tags: uniqTags,
    createdDate,
    createdTime,
    subtasks: subs,
    subtasksDone: subsDone
  });
}

const payload = { exportDate: new Date().toISOString(), tasks };
process.stdout.write(JSON.stringify(payload, null, 2));
