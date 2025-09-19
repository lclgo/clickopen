const DEFAULTS = { 
  url: "https://www.bing.com" 
};

let rightClickLinks = [];

// Show status message with success/error styling
const showStatus = (message, isError = false) => {
  const status = document.getElementById('status');
  status.textContent = message;
  status.className = `status ${isError ? 'error' : 'success'}`;
  status.style.display = 'block';
  
  // Hide after 3 seconds
  setTimeout(() => {
    status.style.display = 'none';
  }, 3000);
};

// Load configuration from storage
const loadConfig = async () => {
  const result = await chrome.storage.sync.get([
    'leftClickUrl', 
    'rightClickLinks'
  ]);
  
  document.getElementById('leftClickUrl').value = 
    result.leftClickUrl || DEFAULTS.url;
  rightClickLinks = result.rightClickLinks || [];
  renderLinks();
};

// Save configuration to storage
const saveConfig = async () => {
  const leftClickUrl = document.getElementById('leftClickUrl').value;
  
  await chrome.storage.sync.set({
    leftClickUrl,
    rightClickLinks
  });
  
  showStatus('Settings saved successfully!');
};

// Add new link to the list
const addLink = () => {
  rightClickLinks.push({ title: '', url: '' });
  renderLinks();
};

// Remove link by index
const removeLink = (index) => {
  rightClickLinks.splice(index, 1);
  renderLinks();
};

// Render all right-click links
const renderLinks = () => {
  const container = document.getElementById('rightClickLinks');
  
  container.innerHTML = rightClickLinks
    .map((link, index) => `
      <div class="link-item" data-index="${index}">
        <input type="text" 
               placeholder="Link Name" 
               class="title-input" 
               value="${link.title || ''}">
        <input type="url" 
               placeholder="URL" 
               class="url-input" 
               value="${link.url || ''}">
        <button class="remove-btn">Remove</button>
      </div>
    `).join('');
};

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  loadConfig();
  
  // Bind save button
  document.getElementById('save').onclick = saveConfig;
  
  // Bind add link button
  document.getElementById('addLink').onclick = addLink;
  
  // Handle remove button clicks and input changes
  const linksContainer = document.getElementById('rightClickLinks');
  
  linksContainer.addEventListener('click', (e) => {
    if (e.target.classList.contains('remove-btn')) {
      const index = parseInt(
        e.target.closest('.link-item').dataset.index
      );
      removeLink(index);
    }
  });
  
  linksContainer.addEventListener('input', (e) => {
    const linkItem = e.target.closest('.link-item');
    const index = parseInt(linkItem.dataset.index);
    const isTitle = e.target.classList.contains('title-input');
    const field = isTitle ? 'title' : 'url';
    
    rightClickLinks[index][field] = e.target.value;
  });
});
