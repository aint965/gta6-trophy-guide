export const storyRoute = [[2,3], [8,4], [9,5], [10,11,12,6], [13,7]];

const targets = [
  ['Field collections', '3 card sets · 100 WAiNK locations · 100 vehicles · all 18 meditations', 'For 100%: 15 card sets, 200 base vehicles, 33 underwater finds, 100 flamingos, 30 reads, 5 Kenton sets and 100 animal studies.'],
  ['Activities & medals', '42 range golds · 14 drone venues · 20 race wins · 250 stunts · 50 challenges', 'For 100%: 42 drone trials, 30 unique wins, 300 stunts, 70 challenges and all 15 Bret decks.'],
  ['Jobs & cleanup', '5 vault escapes · 9 gangs · 8 stranger strands', 'For 100%: all 8 vaults, 39 gang operations and 100 optional tasks. After credits, check Progress → Stats → 100% Completion; stranger strand trophies are separate.']
];

export function drawRoadmap(root, ui) {
  const { node, trophies, isMasked, maskedName, earned, sourcePill, openTrophy } = ui;
  const find = id => trophies.find(trophy => trophy.id === id);
  const jump = (id, label) => {
    const trophy = find(id);
    const button = node('button', 'route-link', `${earned.has(id) ? '✓ ' : ''}${isMasked(trophy) ? maskedName(trophy) : label || trophy.name}`);
    button.addEventListener('click', () => openTrophy(id));
    return button;
  };
  root.replaceChildren();
  const warning = node('section', 'route-warning');
  const warningCopy = node('div');
  warningCopy.append(node('span', 'eyebrow', '01 / BEFORE LEAVING CHAPTER 1'), node('h2', '', 'Protect the balcony meditation'), node('p', '', 'After Down to Earth, follow Lucia to the balcony the next morning. The prompt expires at the chapter break. Its necessity for the trophy is unconfirmed; keep a manual save.'));
  const warningAction = node('div', 'warning-action');
  warningAction.append(node('span', 'risk caution', 'Possible missable'), jump(28));
  warning.append(warningCopy, warningAction);
  root.append(warning);

  const columns = node('div', 'roadmap-grid');
  const campaign = node('section', 'route-panel');
  campaign.append(node('p', 'eyebrow', '02 / CAMPAIGN'), node('h2', '', 'Five chapters, one run'));
  const chapters = node('ol', 'chapters');
  storyRoute.forEach((ids, i) => {
    const row = node('li', 'chapter');
    const links = node('div', 'route-links');
    for (const id of ids) links.append(jump(id, find(id).route));
    row.append(node('span', 'chapter-number', String(i + 1).padStart(2, '0')), links);
    chapters.append(row);
  });
  campaign.append(chapters, node('p', 'route-note', 'No mission replay. Keep chapter saves and take optional jobs when offered. Free roam continues after the finale.'), sourcePill('story'));

  const cleanup = node('section', 'route-panel');
  cleanup.append(node('p', 'eyebrow', '03 / ALONG THE WAY → AFTER CREDITS'), node('h2', '', 'Finish at 100%'));
  for (const [name, threshold, extra] of targets) {
    const item = node('div', 'target');
    item.append(node('h3', '', name), node('strong', '', threshold), node('p', '', extra));
    cleanup.append(item);
  }
  const refs = node('div', 'sources');
  refs.append(sourcePill('base'), sourcePill('full'));
  cleanup.append(refs);
  columns.append(campaign, cleanup);
  root.append(columns);

  const final = node('section', 'route-finish');
  final.append(node('span', 'eyebrow', '04 / FINAL CHECK'), node('p', '', 'Finish any remaining side chains and one-off trophies. Take Yago’s timed race when offered as one route toward eight strands; a platinum lockout isn’t established. All 54 other trophies unlock the platinum.'), jump(25), jump(1));
  root.append(final);
}
