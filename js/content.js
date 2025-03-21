/**
 * Chat With Cat Content Script
 * 
 * This script is injected into web pages and handles:
 * - Creating and styling the floating response UI
 * - Making the response container draggable
 * - Handling messages from the background script
 * - Rendering AI responses with formatting
 * - Supporting light/dark mode themes
 */

// Reference to the floating response container
let responseContainer = null;

/**
 * Creates and initializes the floating response container
 * Sets up styling, header, content area, and controls
 * @returns {HTMLElement} The created container
 */
function createResponseContainer() {
  // Clean up existing container if present
  if (responseContainer) {
    document.body.removeChild(responseContainer);
  }

  // Create new container element
  responseContainer = document.createElement('div');
  responseContainer.id = 'gemini-response-container';
  
  // ===== STYLE DEFINITIONS =====
  
  // Add CSS variables and styles for theming
  const style = document.createElement('style');
  style.textContent = `
    :root {
      --gemini-primary: #4285F4;
      --gemini-primary-light: #82b1ff;
      --gemini-primary-dark: #3367d6;
      --gemini-bg: #ffffff;
      --gemini-bg-secondary: #f8f9fa;
      --gemini-text: #202124;
      --gemini-text-secondary: #5f6368;
      --gemini-border: #dadce0;
      --gemini-border-light: #f1f3f4;
      --gemini-shadow: rgba(60, 64, 67, 0.15);
      --gemini-card-shadow: 0 2px 6px 2px rgba(60, 64, 67, 0.15);
      --gemini-hover: rgba(66, 133, 244, 0.08);
      --gemini-code-bg: rgba(241, 243, 244, 0.8);
    }

    @media (prefers-color-scheme: dark) {
      :root {
        --gemini-primary: #8ab4f8;
        --gemini-primary-light: #aecbfa;
        --gemini-primary-dark: #669df6;
        --gemini-bg: #202124;
        --gemini-bg-secondary: #292a2d;
        --gemini-text: #e8eaed;
        --gemini-text-secondary: #9aa0a6;
        --gemini-border: #3c4043;
        --gemini-border-light: #484a4c;
        --gemini-shadow: rgba(0, 0, 0, 0.3);
        --gemini-card-shadow: 0 2px 6px 2px rgba(0, 0, 0, 0.3);
        --gemini-hover: rgba(138, 180, 248, 0.12);
        --gemini-code-bg: rgba(60, 64, 67, 0.8);
      }
    }

    /* Animation keyframes */
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(8px); }
      to { opacity: 1; transform: translateY(0); }
    }

    @keyframes pulseGlow {
      0% { box-shadow: 0 0 0 0 rgba(var(--gemini-primary-rgb), 0.4); }
      70% { box-shadow: 0 0 0 10px rgba(var(--gemini-primary-rgb), 0); }
      100% { box-shadow: 0 0 0 0 rgba(var(--gemini-primary-rgb), 0); }
    }
    
    @keyframes shimmer {
      0% { background-position: -200% 0; }
      100% { background-position: 200% 0; }
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    @keyframes wave {
      0%, 100% { transform: translateY(0); }
      25% { transform: translateY(-5px); }
      75% { transform: translateY(5px); }
    }

    /* Loading animation styles */
    .loading-dots {
      display: flex;
      justify-content: center;
      gap: 8px;
      margin: 16px 0;
    }

    .loading-dots .dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background-color: var(--gemini-primary);
      opacity: 0.8;
    }

    .loading-dots .dot:nth-child(1) {
      animation: wave 1.2s ease-in-out infinite;
      animation-delay: -0.2s;
    }

    .loading-dots .dot:nth-child(2) {
      animation: wave 1.2s ease-in-out infinite;
      animation-delay: 0s;
    }

    .loading-dots .dot:nth-child(3) {
      animation: wave 1.2s ease-in-out infinite;
      animation-delay: 0.2s;
    }

    .loading-pulse {
      width: 45px;
      height: 45px;
      border-radius: 50%;
      margin: 16px auto;
      position: relative;
      background: linear-gradient(90deg, var(--gemini-primary-light), var(--gemini-primary-dark));
      background-size: 400% 100%;
      animation: shimmer 1.5s ease-in-out infinite, pulseGlow 2s infinite;
      opacity: 0.85;
      display: flex;
      justify-content: center;
      align-items: center;
    }

    .loading-pulse::after {
      content: "";
      position: absolute;
      width: 70%;
      height: 70%;
      border-radius: 50%;
      background-color: var(--gemini-bg);
    }
  `;
  document.head.appendChild(style);

  // ===== CONTAINER STYLING =====
  
  // Apply main container styles
  responseContainer.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    width: 400px;
    max-height: 500px;
    background-color: var(--gemini-bg);
    color: var(--gemini-text);
    border: 1px solid var(--gemini-border);
    border-radius: 16px;
    box-shadow: var(--gemini-card-shadow);
    z-index: 9999;
    overflow: hidden;
    display: none;
    font-family: 'Google Sans', system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
    transform-origin: bottom right;
    transition: transform 0.3s cubic-bezier(0.22, 1, 0.36, 1), 
                opacity 0.3s cubic-bezier(0.22, 1, 0.36, 1),
                box-shadow 0.3s ease;
    opacity: 0;
    transform: scale(0.95);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
  `;

  // ===== CONTAINER HEADER =====
  
  // Create header with gradient background
  const header = document.createElement('div');
  header.style.cssText = `
    padding: 14px 18px;
    background: linear-gradient(90deg, var(--gemini-primary), var(--gemini-primary-dark));
    color: white;
    font-weight: 500;
    display: flex;
    justify-content: space-between;
    align-items: center;
    cursor: move;
    user-select: none;
    border-bottom: 1px solid var(--gemini-border);
  `;

  // Create title area with icon and text
  const titleContainer = document.createElement('div');
  titleContainer.style.cssText = `
    display: flex;
    align-items: center;
    gap: 10px;
  `;

  // Add AI assistant icon
  const icon = document.createElement('div');
  icon.innerHTML = `<svg width="22" height="22" viewBox="0 0 24 24" fill="white">
    <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 4c1.86 0 3.41 1.28 3.86 3H8.14c.45-1.72 2-3 3.86-3zm0 14c-3.03 0-5.78-1.44-7.5-3.69C6.24 13.5 8.97 12.5 12 12.5s5.76 1 7.5 2.81C17.78 17.56 15.03 19 12 19z"/>
  </svg>`;
  titleContainer.appendChild(icon);

  // Create title text with model info
  const titleText = document.createElement('div');
  titleText.style.cssText = `
    display: flex;
    flex-direction: column;
  `;
  
  const mainTitle = document.createElement('div');
  mainTitle.textContent = 'AI Assistant';
  
  // Add model info display
  const modelInfo = document.createElement('div');
  modelInfo.id = 'model-info';
  modelInfo.style.cssText = `
    font-size: 11px;
    opacity: 0.9;
    font-weight: 400;
  `;
  
  // Get active provider and model info from storage
  chrome.storage.local.get(['apiConfig', 'activeProvider'], function(data) {
    if (data.activeProvider && data.apiConfig?.[data.activeProvider]?.selectedModel) {
      modelInfo.textContent = data.apiConfig[data.activeProvider].selectedModel;
    } else {
      modelInfo.textContent = 'No model selected';
    }
  });
  
  titleText.appendChild(mainTitle);
  titleText.appendChild(modelInfo);
  titleContainer.appendChild(titleText);
  header.appendChild(titleContainer);

  // ===== CONTROL BUTTONS =====
  
  // Add control buttons container
  const controls = document.createElement('div');
  controls.style.cssText = `
    display: flex;
    gap: 10px;
    align-items: center;
  `;

  // Add minimize button
  const minimizeButton = createControlButton('−', toggleMinimize);
  controls.appendChild(minimizeButton);

  // Add close button
  const closeButton = createControlButton('×', closeContainer);
  closeButton.style.fontSize = '24px'; // Larger X
  controls.appendChild(closeButton);
  
  header.appendChild(controls);
  responseContainer.appendChild(header);
  
  // ===== CONTENT AREA =====
  
  // Create scrollable content area
  const content = document.createElement('div');
  content.id = 'gemini-response-content';
  content.style.cssText = `
    padding: 18px;
    overflow-y: auto;
    max-height: 400px;
    line-height: 1.6;
    font-size: 14px;
    color: var(--gemini-text);
    scroll-behavior: smooth;
    background-color: var(--gemini-bg);
    position: relative;

    /* Scrollbar styling */
    scrollbar-width: thin;
    scrollbar-color: var(--gemini-primary) transparent;
    
    &::-webkit-scrollbar {
      width: 6px;
    }
    
    &::-webkit-scrollbar-track {
      background: transparent;
    }
    
    &::-webkit-scrollbar-thumb {
      background-color: var(--gemini-text-secondary);
      border-radius: 10px;
      opacity: 0.6;
    }

    &::-webkit-scrollbar-thumb:hover {
      background-color: var(--gemini-primary);
    }

    /* Content styling */
    & p {
      margin: 0 0 14px 0;
    }

    & code {
      background: var(--gemini-code-bg);
      padding: 2px 6px;
      border-radius: 4px;
      font-family: 'SFMono-Regular', 'Consolas', 'Monaco', monospace;
      font-size: 0.9em;
      color: var(--gemini-primary);
    }

    & pre {
      background: var(--gemini-bg-secondary);
      padding: 14px;
      border-radius: 8px;
      overflow-x: auto;
      margin: 14px 0;
      border: 1px solid var(--gemini-border-light);
    }

    & strong {
      color: var(--gemini-primary);
      font-weight: 600;
    }
    
    & ul, & ol {
      padding-left: 20px;
      margin: 10px 0;
    }
    
    & li {
      margin-bottom: 6px;
    }
  `;
  responseContainer.appendChild(content);
  
  // Add container to page
  document.body.appendChild(responseContainer);
  
  // Make container draggable
  makeDraggable(responseContainer, header);
  
  return responseContainer;
}

/**
 * Creates a control button with hover effects
 * @param {string} text - Button text
 * @param {Function} clickHandler - Click event handler
 * @returns {HTMLElement} - Button element
 */
function createControlButton(text, clickHandler) {
  const button = document.createElement('button');
  button.innerHTML = text;
  button.style.cssText = `
    background: rgba(255, 255, 255, 0.1);
    border: none;
    color: white;
    font-size: 20px;
    cursor: pointer;
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    transition: all 0.2s ease;
    padding: 0;
  `;
  
  // Add hover effects
  button.onmouseover = () => {
    button.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
    button.style.transform = 'scale(1.05)';
  };
  
  button.onmouseout = () => {
    button.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
    button.style.transform = 'scale(1)';
  };
  
  button.onclick = clickHandler;
  return button;
}

/**
 * Toggles content visibility when minimize button is clicked
 */
function toggleMinimize() {
  const content = document.getElementById('gemini-response-content');
  const minimizeButton = this;
  
  if (content.style.display === 'none') {
    content.style.display = 'block';
    content.style.animation = 'fadeIn 0.3s cubic-bezier(0.22, 1, 0.36, 1)';
    minimizeButton.innerHTML = '−';
  } else {
    content.style.animation = 'fadeIn 0.3s cubic-bezier(0.22, 1, 0.36, 1) reverse';
    setTimeout(() => {
      content.style.display = 'none';
    }, 200);
    minimizeButton.innerHTML = '+';
  }
}

/**
 * Closes the response container with animation
 */
function closeContainer() {
  responseContainer.style.opacity = '0';
  responseContainer.style.transform = 'scale(0.95)';
  setTimeout(() => {
    responseContainer.style.display = 'none';
  }, 300);
}

/**
 * Makes an element draggable by dragging its handle
 * @param {HTMLElement} element - Element to make draggable
 * @param {HTMLElement} dragHandle - Element to use as drag handle
 */
function makeDraggable(element, dragHandle) {
  let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
  
  dragHandle.onmousedown = dragMouseDown;

  /**
   * Start dragging on mouse down
   * @param {MouseEvent} e - Mouse event
   */
  function dragMouseDown(e) {
    e = e || window.event;
    e.preventDefault();
    // Get mouse cursor position at startup
    pos3 = e.clientX;
    pos4 = e.clientY;
    document.onmouseup = closeDragElement;
    // Call function whenever cursor moves
    document.onmousemove = elementDrag;
    // Add active state
    element.style.boxShadow = '0 10px 25px rgba(0, 0, 0, 0.3)';
  }

  /**
   * Handle dragging movement
   * @param {MouseEvent} e - Mouse event
   */
  function elementDrag(e) {
    e = e || window.event;
    e.preventDefault();
    // Calculate new cursor position
    pos1 = pos3 - e.clientX;
    pos2 = pos4 - e.clientY;
    pos3 = e.clientX;
    pos4 = e.clientY;
    // Set element's new position
    element.style.top = (element.offsetTop - pos2) + "px";
    element.style.left = (element.offsetLeft - pos1) + "px";
    // Ensure it stays on screen
    element.style.top = Math.max(0, Math.min(window.innerHeight - 100, element.offsetTop)) + "px";
    element.style.left = Math.max(0, Math.min(window.innerWidth - 100, element.offsetLeft)) + "px";
  }

  /**
   * Stop dragging on mouse up
   */
  function closeDragElement() {
    // Stop moving when mouse button is released
    document.onmouseup = null;
    document.onmousemove = null;
    // Remove active state
    element.style.boxShadow = 'var(--gemini-card-shadow)';
  }
}

/**
 * Process markdown-like formatting in AI responses
 * @param {string} text - Raw response text
 * @returns {string} - HTML-formatted response
 */
function formatResponseText(text) {
  return text
    .replace(/\n\n/g, '</p><p>')  // Proper paragraph breaks
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')  // Bold text
    .replace(/\*(.*?)\*/g, '<em>$1</em>')  // Italic text
    .replace(/`([^`]+)`/g, '<code>$1</code>')  // Inline code
    .replace(/```([^`]+)```/g, '<pre><code>$1</code></pre>')  // Code blocks
    .replace(/(?:^|\n)- (.*?)(?=\n|$)/g, '\n<li>$1</li>')  // List items
    .replace(/<li>.*?<\/li>/gs, match => `<ul>${match}</ul>`)  // Wrap list items
    .replace(/(?:^|\n)(\d+)\. (.*?)(?=\n|$)/g, '\n<li>$2</li>')  // Numbered list items
    .replace(/<li>.*?<\/li>/gs, match => match.includes('<ul>') ? match : `<ol>${match}</ol>`);  // Wrap numbered list items
}

// ===== MESSAGE HANDLING =====

// Queue for storing messages received before container initialization
const messageQueue = [];

/**
 * Listen for messages from background script
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Content script received message:', message);
  
  // Set up a response to let background script know message was received
  sendResponse({ received: true });
  
  // Ensure container exists and create it if it doesn't
  if (!responseContainer || !document.body.contains(responseContainer)) {
    console.log('Container not ready, creating now...');
    responseContainer = createResponseContainer();
    
    // If document isn't ready yet, wait for DOM to be ready
    if (!document.body) {
      console.log('DOM not ready, queuing message for later processing');
      messageQueue.push(message);
      document.addEventListener('DOMContentLoaded', processQueuedMessages);
      return true;
    }
  }
  
  // Process the message
  processMessage(message);
  return true; // Important: indicates async response
});

/**
 * Process queued messages when DOM is ready
 */
function processQueuedMessages() {
  console.log(`Processing ${messageQueue.length} queued messages`);
  while (messageQueue.length > 0) {
    const message = messageQueue.shift();
    processMessage(message);
  }
}

/**
 * Process a message from the background script
 * @param {Object} message - Message object from background script
 */
function processMessage(message) {
  // Handle processing selection - show loading state
  if (message.action === "processSelection") {
    showContainerWithLoading();
  }
  
  // Handle displaying response from AI
  if (message.action === "displayResponse") {
    displayResponse(message.response);
  }
}

/**
 * Show container with loading animation
 */
function showContainerWithLoading() {
  // Ensure container exists
  if (!responseContainer || !document.body.contains(responseContainer)) {
    responseContainer = createResponseContainer();
  }

  // Show container with animation
  responseContainer.style.display = 'block';
  setTimeout(() => {
    responseContainer.style.opacity = '1';
    responseContainer.style.transform = 'scale(1)';
  }, 10);

  // Update model info with loading animation
  const modelInfo = document.getElementById('model-info');
  if (modelInfo) {
    const originalText = modelInfo.textContent;
    let dots = 0;
    modelInfo.dataset.originalText = originalText;
    
    // Animate the model info text
    const modelLoadingAnimation = setInterval(() => {
      dots = (dots + 1) % 4;
      modelInfo.textContent = 'Processing' + '.'.repeat(dots);
    }, 300);
    
    // Store the interval ID to clear it later
    modelInfo.dataset.animationId = modelLoadingAnimation;
  }

  // Show modern loading animation
  const contentDiv = document.getElementById('gemini-response-content');
  if (contentDiv) {
    contentDiv.innerHTML = `
      <div style="animation: fadeIn 0.5s cubic-bezier(0.22, 1, 0.36, 1)">
        <p style="color: var(--gemini-text); margin: 10px 0 20px; font-size: 15px; text-align: center;">
          Processing your request
        </p>
        
        <!-- Modern pulse loader -->
        <div class="loading-pulse"></div>
        
        <!-- Bouncing dots loader -->
        <div class="loading-dots">
          <div class="dot"></div>
          <div class="dot"></div>
          <div class="dot"></div>
        </div>
      </div>`;
  }
}

/**
 * Display formatted AI response in the container
 * @param {string} response - Raw response text
 */
function displayResponse(response) {
  // Ensure container exists
  if (!responseContainer || !document.body.contains(responseContainer)) {
    responseContainer = createResponseContainer();
  }

  // Reset the model info text if it was animating
  const modelInfo = document.getElementById('model-info');
  if (modelInfo && modelInfo.dataset.originalText) {
    clearInterval(modelInfo.dataset.animationId);
    modelInfo.textContent = modelInfo.dataset.originalText;
  }
  
  // Format response with markdown processing
  const formattedResponse = formatResponseText(response);
  
  const contentDiv = document.getElementById('gemini-response-content');
  if (!contentDiv) {
    console.error('Content div not found, recreating container');
    responseContainer = createResponseContainer();
    setTimeout(() => displayResponse(response), 100);
    return;
  }
  
  // Show container if not visible
  if (responseContainer.style.display !== 'block') {
    responseContainer.style.display = 'block';
    setTimeout(() => {
      responseContainer.style.opacity = '1';
      responseContainer.style.transform = 'scale(1)';
    }, 10);
  }
  
  // Add response with animation
  contentDiv.innerHTML = `
    <div style="animation: fadeIn 0.5s cubic-bezier(0.22, 1, 0.36, 1)">
      <p>${formattedResponse}</p>
    </div>`;
  
  // Scroll to top smoothly
  contentDiv.scrollTo({ top: 0, behavior: 'smooth' });
}

// ===== INITIALIZATION =====

// Create container immediately when script runs
createResponseContainer();

// Also create on DOMContentLoaded (as a backup)
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    if (!responseContainer) {
      createResponseContainer();
    }
  });
}

// Listen for system color scheme changes to update UI
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
  if (responseContainer) {
    document.body.removeChild(responseContainer);
    responseContainer = null;
    createResponseContainer();
  }
});

// Log initialization
console.log('Chat With Cat content script loaded');