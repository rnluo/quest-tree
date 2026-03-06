export const DEFAULT_SYSTEM_PROMPT =
  `You are a helpful assistant for a personal goal and task management app called Quest Tree. ` +
  `The user maintains a flowchart of goals connected by dependencies.\n\n` +
  `Each goal has:\n` +
  `- title and optional description\n` +
  `- tasks with: text, completion status, energy (1–5, where 5 = highest cognitive cost), ` +
  `relevance (compulsory/high/medium/low/none), recurrence, deadline, and notes\n` +
  `- optional progress counter\n\n` +
  `When a current task graph is provided, use it as the full context for your answers. ` +
  `Be concise and actionable when presenting information and offering advice about goals and tasks.` +
  'Important: Do not output Markdown or HTML. Do not output Emojis.';

export function buildGraphContext(nodes, edges, { focusOnly = false, ratedOnly = false } = {}) {
  const activeNodes = focusOnly ? nodes.filter(n => !n.data?.isDimmed) : nodes;

  const childrenMap = {};
  const parentMap = {};
  edges.forEach(e => {
    if (!parentMap[e.target]) parentMap[e.target] = [];
    parentMap[e.target].push(e.source);
    if (!childrenMap[e.source]) childrenMap[e.source] = [];
    childrenMap[e.source].push(e.target);
  });

  // For ratedOnly: exclude goal nodes whose tasks are ALL 'none', plus their descendant subtrees
  const excludedNodes = new Set();
  if (ratedOnly) {
    const allNoneIds = new Set();
    activeNodes.forEach(node => {
      const quests = node.data?.quests || [];
      if (quests.length > 0 && quests.every(q => q.relevance === 'none')) {
        allNoneIds.add(node.id);
      }
    });
    const queue = [...allNoneIds];
    allNoneIds.forEach(id => excludedNodes.add(id));
    while (queue.length > 0) {
      const nodeId = queue.shift();
      (childrenMap[nodeId] || []).forEach(childId => {
        if (!excludedNodes.has(childId)) {
          excludedNodes.add(childId);
          queue.push(childId);
        }
      });
    }
  }

  const includedNodes = ratedOnly ? activeNodes.filter(n => !excludedNodes.has(n.id)) : activeNodes;
  const idToTitle = {};
  activeNodes.forEach(n => { idToTitle[n.id] = n.data?.title || '(untitled)'; });

  const goals = includedNodes.map(node => {
    const d = node.data || {};
    const parents = (parentMap[node.id] || []).map(pid => idToTitle[pid]).filter(Boolean);

    let rawTasks = d.quests || [];
    if (ratedOnly) rawTasks = rawTasks.filter(q => q.relevance !== 'none');
    const tasks = rawTasks.map(q => {
      const t = { text: q.text || '' };
      if (q.completed) t.completed = true;
      if (q.energy) t.energy = `${q.energy}/5`;
      if (q.relevance) t.relevance = q.relevance;
      if (q.recurrence) t.recurrence = q.recurrence;
      if (q.deadline?.year) {
        t.deadline = [q.deadline.year, q.deadline.month, q.deadline.day].filter(Boolean).join('/');
      }
      if (q.taskDescription) t.notes = q.taskDescription;
      if (q.counter) t.counter = `${q.counter.current}/${q.counter.max}`;
      return t;
    });

    const goal = { title: d.title || '(untitled)' };
    if (parents.length > 0) goal.requires = parents;
    if (d.description) goal.description = d.description;
    if (tasks.length > 0) goal.tasks = tasks;
    return goal;
  });

  return JSON.stringify({ goals }, null, 2);
}

export async function callLLM({ apiKey, model, baseUrl, systemPrompt, messages }) {
  const url = (baseUrl || 'https://api.openai.com/v1').replace(/\/$/, '') + '/chat/completions';
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-CA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const body = {
    model: model || 'gpt-4o-mini',
    messages: [
      { role: 'system', content: `Today is ${dateStr}.\n\n${systemPrompt}` },
      ...messages,
    ],
  };
  console.log('[LLM] POST', url);
  console.log('[LLM] model:', body.model);
  console.log('[LLM] messages:', body.messages);

  let response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });
  } catch (networkErr) {
    console.error('[LLM] Network error (fetch failed):', networkErr);
    throw new Error(`Network error: ${networkErr.message}`);
  }

  console.log('[LLM] Response status:', response.status, response.statusText);

  if (!response.ok) {
    const errBody = await response.json().catch(() => ({}));
    console.error('[LLM] Error body:', errBody);
    throw new Error(errBody.error?.message || `HTTP ${response.status}`);
  }

  const data = await response.json();
  console.log('[LLM] Response data:', data);
  console.log('[LLM] choices[0]:', data.choices?.[0]);
  const content = data.choices?.[0]?.message?.content
    ?? data.choices?.[0]?.message?.reasoning_content
    ?? null;
  if (content === null || content === undefined) {
    console.error('[LLM] No content in response. Full choices:', data.choices);
    throw new Error('Model returned an empty response. Check the model name and API plan.');
  }
  return content;
}

const CONV_KEY = 'qt-llm-conversations';
const CONFIG_KEY = 'qt-llm-config';

export function loadConversations() {
  try { return JSON.parse(localStorage.getItem(CONV_KEY)) || []; }
  catch { return []; }
}

export function saveConversations(convs) {
  localStorage.setItem(CONV_KEY, JSON.stringify(convs));
}

export function loadApiConfig() {
  try { return JSON.parse(localStorage.getItem(CONFIG_KEY)) || {}; }
  catch { return {}; }
}

export function saveApiConfig(config) {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
}
