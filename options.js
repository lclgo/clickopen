const DEFAULT_URL = "https://www.bing.com";
let rightClickLinks = [];

// Show status message
const showStatus = (message, isError = false) => {
  const status = document.getElementById('status');
  status.textContent = message;
  status.className = `status ${isError ? 'error' : 'success'}`;
  status.style.display = 'block';
  setTimeout(() => status.style.display = 'none', 3000);
};

// Load and save configuration
const loadConfig = async () => {
  const result = await chrome.storage.sync.get(['leftClickUrl', 'rightClickLinks']);
  document.getElementById('leftClickUrl').value = result.leftClickUrl || DEFAULT_URL;
  rightClickLinks = result.rightClickLinks || [];
  renderLinks();
};

const saveConfig = async () => {
  await chrome.storage.sync.set({ 
    leftClickUrl: document.getElementById('leftClickUrl').value,
    rightClickLinks 
  });
  showStatus('Settings saved!');
};

// Link management
const addLink = () => {
  rightClickLinks.push({ title: '', url: '' });
  renderLinks();
};

const removeLink = (index) => {
  rightClickLinks.splice(index, 1);
  renderLinks();
};

const renderLinks = () => {
  const container = document.getElementById('rightClickLinks');
  container.innerHTML = rightClickLinks.map((link, index) => `
    <div class="link-item" data-index="${index}">
      <input type="text" placeholder="Link Name" class="title-input" value="${link.title || ''}">
      <input type="url" placeholder="URL" class="url-input" value="${link.url || ''}">
      <button class="remove-btn">Remove</button>
    </div>
  `).join('');
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  loadConfig();
  
  document.getElementById('addLink').onclick = addLink;
  document.getElementById('save').onclick = saveConfig;
  
  // Event delegation for dynamic elements
  document.getElementById('rightClickLinks').addEventListener('click', (e) => {
    if (e.target.classList.contains('remove-btn')) {
      removeLink(parseInt(e.target.closest('.link-item').dataset.index));
    }
  });
  
  document.getElementById('rightClickLinks').addEventListener('input', (e) => {
    const index = parseInt(e.target.closest('.link-item').dataset.index);
    const field = e.target.classList.contains('title-input') ? 'title' : 'url';
    rightClickLinks[index][field] = e.target.value;
  });
});
