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
    'rightClickLinks',
    'forceCustomIcon'
  ]);
  
  const localResult = await chrome.storage.local.get(['customIcon']);
  
  document.getElementById('leftClickUrl').value = 
    result.leftClickUrl || DEFAULTS.url;
  rightClickLinks = result.rightClickLinks || [];
  
  // Load custom icon settings
  document.getElementById('forceCustomIcon').checked = result.forceCustomIcon || false;
  if (localResult.customIcon) {
    showIconPreview(localResult.customIcon);
  }
  renderLinks();
};

// Save configuration to storage
const saveConfig = async () => {
  const leftClickUrl = document.getElementById('leftClickUrl').value;
  const forceCustomIcon = document.getElementById('forceCustomIcon').checked;
  
  await chrome.storage.sync.set({
    leftClickUrl,
    rightClickLinks,
    forceCustomIcon
  });
  
  showStatus('Settings saved successfully!');
};

// Show icon preview
const showIconPreview = (dataUrl) => {
  const preview = document.getElementById('iconPreview');
  const placeholder = document.getElementById('iconPlaceholder');
  const previewImg = document.getElementById('previewImg');
  
  previewImg.src = dataUrl;
  previewImg.style.display = 'block';
  placeholder.style.display = 'none';
  preview.classList.add('has-icon');
};

// Clear icon preview
const clearIconPreview = () => {
  const preview = document.getElementById('iconPreview');
  const placeholder = document.getElementById('iconPlaceholder');
  const previewImg = document.getElementById('previewImg');
  
  previewImg.src = '';
  previewImg.style.display = 'none';
  placeholder.style.display = 'block';
  preview.classList.remove('has-icon');
};

// Handle icon file import
const handleIconImport = (event) => {
  const file = event.target.files[0];
  if (!file) return;
  // Validate file type
  if (!file.type.startsWith('image/')) {
    showStatus('Please select a valid image file', true);
    // Reset input to allow re-selecting the same file
    event.target.value = '';
    return;
  }
  // Validate file size (max 100KB)
  if (file.size > 100 * 1024) {
    showStatus('Icon file size must be less than 100KB', true);
    // Reset input to allow re-selecting the same file
    event.target.value = '';
    return;
  }
  const reader = new FileReader();
  reader.onload = async (e) => {
    const dataUrl = e.target.result;
    // Save to local storage
    await chrome.storage.local.set({ customIcon: dataUrl });
    // Show preview
    showIconPreview(dataUrl);
    showStatus('Icon imported successfully!');
  };
  reader.onerror = () => {
    showStatus('Failed to read icon file', true);
  };
  reader.readAsDataURL(file);
  // Reset input value to allow re-selecting the same file
  event.target.value = '';
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

// Export configuration as links.json
const exportAsJson = () => {
  const leftClickUrl = document.getElementById('leftClickUrl').value;
  
  const data = {
    url: leftClickUrl || DEFAULTS.url,
    links: rightClickLinks
  };
  
  // Create blob and download
  const jsonString = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'links.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  
  showStatus('links.json exported successfully!');
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
  
  // Bind export button
  document.getElementById('export').onclick = exportAsJson;
  
  // Bind add link button
  document.getElementById('addLink').onclick = addLink;
  // Bind icon import button
  document.getElementById('importIcon').onclick = () => {
    document.getElementById('iconInput').click();
  };
  // Bind icon file input change
  document.getElementById('iconInput').onchange = handleIconImport;

  
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
