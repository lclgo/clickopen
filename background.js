const DEFAULTS = {
  url: "https://www.bing.com",
  links: [{ title: "Google", url: "https://www.google.com" }]
};

// Initialize extension on install
chrome.runtime.onInstalled.addListener(async () => {
  const result = await chrome.storage.sync.get([
    'leftClickUrl', 
    'rightClickLinks'
  ]);
  
  const url = result.leftClickUrl || DEFAULTS.url;
  
  await chrome.storage.sync.set({
    leftClickUrl: url,
    rightClickLinks: result.rightClickLinks || DEFAULTS.links
  });
  
  createContextMenus();
  updateIcon(url);
});

// Handle left click on extension icon
chrome.action.onClicked.addListener(async () => {
  const { leftClickUrl } = await chrome.storage.sync.get('leftClickUrl');
  const url = leftClickUrl || DEFAULTS.url;
  
  chrome.tabs.create({ url });
  updateIcon(url);
});

// Create right-click context menus
const createContextMenus = async () => {
  await chrome.contextMenus.removeAll();
  
  const { rightClickLinks } = await chrome.storage.sync.get('rightClickLinks');
  const links = rightClickLinks || DEFAULTS.links;
  
  // Add each link as a menu item
  links.forEach((link, index) => {
    chrome.contextMenus.create({
      id: `link-${index}`,
      title: link.title,
      contexts: ["action"]
    });
  });
  
  // Add separator and settings menu
  if (links.length > 0) {
    chrome.contextMenus.create({
      id: "separator",
      type: "separator",
      contexts: ["action"]
    });
  }
  
  chrome.contextMenus.create({
    id: "settings",
    title: "Settings",
    contexts: ["action"]
  });
};

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(async ({ menuItemId }) => {
  if (menuItemId === "settings") {
    return chrome.runtime.openOptionsPage();
  }
  
  if (!menuItemId.startsWith("link-")) {
    return;
  }
  
  const index = parseInt(menuItemId.replace("link-", ""));
  const { rightClickLinks } = await chrome.storage.sync.get('rightClickLinks');
  const links = rightClickLinks || DEFAULTS.links;
  
  if (links[index]) {
    chrome.tabs.create({ url: links[index].url });
  }
});

// Update extension icon based on URL
const updateIcon = async (url) => {
  try {
    const domain = new URL(url).hostname;
    const { iconCache = {} } = await chrome.storage.local.get('iconCache');
    
    // Use cached icon if available
    if (iconCache[domain]) {
      return chrome.action.setIcon({ path: iconCache[domain] });
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
          // Cache successful favicon URL
          iconCache[domain] = faviconUrl;
          await chrome.storage.local.set({ iconCache });
          return chrome.action.setIcon({ path: faviconUrl });
        }
      } catch (error) {
        // Continue to next URL on error
        continue;
      }
    }
    
    // Fallback to default icon
    chrome.action.setIcon({ path: "icons/favicon-32x32.png" });
    
  } catch (error) {
    // Fallback to default icon on any error
    chrome.action.setIcon({ path: "icons/favicon-32x32.png" });
  }
};

// Update icon on startup
chrome.runtime.onStartup.addListener(async () => {
  const { leftClickUrl } = await chrome.storage.sync.get('leftClickUrl');
  if (leftClickUrl) {
    updateIcon(leftClickUrl);
  }
});

// Listen for storage changes and update accordingly
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace !== 'sync') {
    return;
  }
  
  if (changes.rightClickLinks) {
    createContextMenus();
  }
  
  if (changes.leftClickUrl) {
    const newUrl = changes.leftClickUrl.newValue || DEFAULTS.url;
    updateIcon(newUrl);
  }
});
