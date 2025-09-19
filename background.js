const DEFAULT_URL = "https://www.bing.com";
const DEFAULT_LINKS = [
  { title: "Google", url: "https://www.google.com" }
];

// Initialize extension
chrome.runtime.onInstalled.addListener(async () => {
  const result = await chrome.storage.sync.get(['leftClickUrl', 'rightClickLinks']);
  await chrome.storage.sync.set({
    leftClickUrl: result.leftClickUrl || DEFAULT_URL,
    rightClickLinks: result.rightClickLinks || DEFAULT_LINKS
  });
  createContextMenus();
});

// Handle left click
chrome.action.onClicked.addListener(async () => {
  const { leftClickUrl } = await chrome.storage.sync.get('leftClickUrl');
  chrome.tabs.create({ url: leftClickUrl || DEFAULT_URL });
});

// Create context menus
const createContextMenus = async () => {
  await chrome.contextMenus.removeAll();
  const { rightClickLinks } = await chrome.storage.sync.get('rightClickLinks');
  const links = rightClickLinks || DEFAULT_LINKS;
  
  links.forEach((link, index) => {
    chrome.contextMenus.create({
      id: `link-${index}`,
      title: link.title,
      contexts: ["action"]
    });
  });
  
  if (links.length) {
    chrome.contextMenus.create({ id: "sep", type: "separator", contexts: ["action"] });
  }
  
  chrome.contextMenus.create({
    id: "settings",
    title: "Settings",
    contexts: ["action"]
  });
};

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(async (info) => {
  if (info.menuItemId === "settings") {
    chrome.runtime.openOptionsPage();
  } else if (info.menuItemId.startsWith("link-")) {
    const index = parseInt(info.menuItemId.replace("link-", ""));
    const { rightClickLinks } = await chrome.storage.sync.get('rightClickLinks');
    const links = rightClickLinks || DEFAULT_LINKS;
    if (links[index]) chrome.tabs.create({ url: links[index].url });
  }
});

// Update menus when storage changes
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'sync' && changes.rightClickLinks) {
    createContextMenus();
  }
});
