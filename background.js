const DEFAULT_URL = "https://www.bing.com";
const DEFAULT_LINKS = [{ title: "Google", url: "https://www.google.com" }];

// Initialize extension
chrome.runtime.onInstalled.addListener(async () => {
  const result = await chrome.storage.sync.get(['leftClickUrl', 'rightClickLinks']);
  const leftClickUrl = result.leftClickUrl || DEFAULT_URL;
  await chrome.storage.sync.set({
    leftClickUrl,
    rightClickLinks: result.rightClickLinks || DEFAULT_LINKS
  });
  createContextMenus();
  updateIcon(leftClickUrl);
});

// Handle left click
chrome.action.onClicked.addListener(async () => {
  const { leftClickUrl } = await chrome.storage.sync.get('leftClickUrl');
  const url = leftClickUrl || DEFAULT_URL;
  chrome.tabs.create({ url });
  updateIcon(url);
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

// Simplified icon update using direct favicon URL
const updateIcon = async (url) => {
  try {
    const domain = new URL(url).hostname;
    
    // Check cache first
    const { iconCache = {} } = await chrome.storage.local.get('iconCache');
    if (iconCache[domain]) {
      chrome.action.setIcon({ path: iconCache[domain] });
      return;
    }
    
    // Try multiple favicon sources
    const faviconUrls = [
      `https://www.google.com/s2/favicons?domain=${domain}&sz=32`,
      `https://${domain}/favicon.ico`,
      `https://icons.duckduckgo.com/ip3/${domain}.ico`
    ];
    
    for (const faviconUrl of faviconUrls) {
      try {
        const response = await fetch(faviconUrl);
        if (response.ok) {
          // Cache the working URL
          iconCache[domain] = faviconUrl;
          await chrome.storage.local.set({ iconCache });
          
          // Set icon using URL
          chrome.action.setIcon({ path: faviconUrl });
          return;
        }
      } catch (e) {
        continue;
      }
    }
    
    // Fallback to default
    chrome.action.setIcon({ path: "icons/favicon-32x32.png" });
    
  } catch (error) {
    chrome.action.setIcon({ path: "icons/favicon-32x32.png" });
  }
};

// Initialize icon on startup
chrome.runtime.onStartup.addListener(async () => {
  const { leftClickUrl } = await chrome.storage.sync.get('leftClickUrl');
  if (leftClickUrl) updateIcon(leftClickUrl);
});

// Update menus and icon when storage changes
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'sync') {
    if (changes.rightClickLinks) createContextMenus();
    if (changes.leftClickUrl) updateIcon(changes.leftClickUrl.newValue || DEFAULT_URL);
  }
});
