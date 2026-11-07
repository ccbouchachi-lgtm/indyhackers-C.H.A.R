export const SITES = [
  { id: 'youtube', name: 'YouTube', domains: ['youtube.com', 'youtu.be'] },
  { id: 'instagram', name: 'Instagram', domains: ['instagram.com'] },
  { id: 'tiktok', name: 'TikTok', domains: ['tiktok.com'] },
  { id: 'reddit', name: 'Reddit', domains: ['reddit.com'] },
  { id: 'x', name: 'X / Twitter', domains: ['x.com', 'twitter.com'] },
  { id: 'facebook', name: 'Facebook', domains: ['facebook.com'] }
];
export function normalizeSelection(ids) {
  if (!Array.isArray(ids) || ids.some(id => !SITES.some(site => site.id === id))) {
    throw new Error('Choose websites from the available list.');
  }
  return [...new Set(ids)];
}
export function buildRules(ids) {
  return normalizeSelection(ids).map(id => {
    const index = SITES.findIndex(site => site.id === id);
    return { id: index + 1, priority: 1, action: { type: 'redirect', redirect: { extensionPath: '/blocked.html' } },
      condition: { requestDomains: SITES[index].domains, resourceTypes: ['main_frame', 'sub_frame'] } };
  });
}
