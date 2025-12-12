const DEFAULTS = {
  url: "https://www.bing.com",
  links: [{ title: "Google", url: "https://www.google.com" }]
};

// Flag to prevent concurrent menu creation
let isCreatingMenus = false;

// Load links from any links*.json file if it exists
const loadLinksFromJson = async () => {
  // List of possible links json files to try (links.json and links(1).json to links(12).json)
  const possibleFiles = [
    'links (12).json',
    'links (11).json',
    'links (10).json',
    'links (9).json',
    'links (8).json',
    'links (7).json',
    'links (6).json',
    'links (5).json',
    'links (4).json',
    'links (3).json',
    'links (2).json',
    'links (1).json',
    'links.json',
  ];

  for (const filename of possibleFiles) {
    try {
      const response = await fetch(chrome.runtime.getURL(filename));
      if (response.ok) {
        const data = await response.json();
        return {
          url: data.url || DEFAULTS.url,
          links: data.links || DEFAULTS.links
        };
      }
    } catch (error) {
      continue;
    }
  }
  return null;
};

// Initialize extension on install
chrome.runtime.onInstalled.addListener(async () => {
  try {
    const linksData = await loadLinksFromJson();
    const url = linksData?.url || DEFAULTS.url;
    const links = linksData?.links || DEFAULTS.links;
    
    const result = await chrome.storage.sync.get([
      'leftClickUrl', 
      'rightClickLinks'
    ]);
    
    await chrome.storage.sync.set({
      leftClickUrl: result.leftClickUrl || url,
      rightClickLinks: result.rightClickLinks || links
    });
    
    // Wait a bit to ensure storage is set before creating menus
    setTimeout(() => createContextMenus(), 100);
    updateIcon(result.leftClickUrl || url);
  } catch (error) {
    console.error('Failed to initialize extension:', error);
  }
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
  // Prevent concurrent menu creation
  if (isCreatingMenus) {
    return;
  }
  
  isCreatingMenus = true;
  
  try {
    // Ensure all existing menus are removed first
    await chrome.contextMenus.removeAll();
    
    const { rightClickLinks } = await chrome.storage.sync.get('rightClickLinks');
    const links = rightClickLinks || DEFAULTS.links;
    
    // Add each link as a menu item
    for (let index = 0; index < links.length; index++) {
      const link = links[index];
      chrome.contextMenus.create({
        id: `link-${index}`,
        title: link.title || `Link ${index + 1}`,
        contexts: ["action"]
      });
    }
    
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
    
  } catch (error) {
    console.error('Failed to create context menus:', error);
  } finally {
    isCreatingMenus = false;
  }
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
    // Check if force custom icon is enabled
    const { forceCustomIcon } = await chrome.storage.sync.get('forceCustomIcon');
    const { customIcon } = await chrome.storage.local.get('customIcon');
    
    // Use custom icon if force mode is enabled and custom icon exists
    if (forceCustomIcon && customIcon) {
      return chrome.action.setIcon({ path: customIcon });
    }
    
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
    
    // Fallback to custom icon if available, otherwise default icon
    if (customIcon) {
      return chrome.action.setIcon({ path: customIcon });
    }
    chrome.action.setIcon({ path: "icon.png" });
    
  } catch (error) {
    // Fallback to custom icon or default icon on any error
    try {
      const { customIcon } = await chrome.storage.local.get('customIcon');
      if (customIcon) {
        return chrome.action.setIcon({ path: customIcon });
      }
    } catch (e) {}
    chrome.action.setIcon({ path: "icon.png" });
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
  if (namespace === 'sync') {
    if (changes.rightClickLinks) {
      // Add small delay to ensure previous operations complete
      setTimeout(() => createContextMenus(), 50);
    }
    
    if (changes.leftClickUrl) {
      const newUrl = changes.leftClickUrl.newValue || DEFAULTS.url;
      updateIcon(newUrl);
    }
    
    // Update icon when forceCustomIcon setting changes
    if (changes.forceCustomIcon) {
      chrome.storage.sync.get('leftClickUrl').then(({ leftClickUrl }) => {
        updateIcon(leftClickUrl || DEFAULTS.url);
      });
    }
  }
  
  // Update icon when customIcon changes in local storage
  if (namespace === 'local' && changes.customIcon) {
    chrome.storage.sync.get(['leftClickUrl', 'forceCustomIcon']).then(({ leftClickUrl, forceCustomIcon }) => {
      if (forceCustomIcon) {
        updateIcon(leftClickUrl || DEFAULTS.url);
      }
    });
  }
});
