/**
 * Configuration UI Manager for Chat With Cat
 * 
 * This script handles the setup page functionality including:
 * - Provider selection and UI updates
 * - API key and model configuration
 * - Storage of user preferences
 * - Status message display
 */

document.addEventListener('DOMContentLoaded', function() {
  // ===== DOM ELEMENTS =====
  const providerSelect = document.getElementById('provider-select');
  const modelInput = document.getElementById('model-input');
  const saveBtn = document.getElementById('save-btn');
  const apiKeyInput = document.getElementById('api-key');
  const statusMessage = document.getElementById('status-message');
  const apiKeySection = document.querySelector('.api-key-section');
  const modelInputSection = document.querySelector('.model-input-section');

  /**
   * Updates the UI based on selected provider
   * Shows relevant setup instructions and model suggestions
   */
  providerSelect.addEventListener('change', function() {
    const provider = providerSelect.value;
    
    // Hide all provider setup instructions
    document.querySelectorAll('.provider-setup').forEach(el => {
      el.style.display = 'none';
    });
    
    // Show only the selected provider's instructions
    document.getElementById(`${provider}-setup`).style.display = 'block';
    
    // Ensure input sections are visible
    apiKeySection.classList.remove('hidden');
    modelInputSection.style.display = 'block';
    
    // Set provider-specific model suggestions in placeholder
    updateModelPlaceholder(provider);
    
    // Load existing configuration for selected provider
    loadProviderConfig(provider);
  });

  /**
   * Updates the model input placeholder with provider-specific suggestions
   * @param {string} provider - Selected AI provider
   */
  function updateModelPlaceholder(provider) {
    switch (provider) {
      case 'gemini':
        modelInput.placeholder = 'e.g., gemini-1.5-flash, gemini-2.0-flash';
        break;
      case 'openrouter':
        modelInput.placeholder = 'e.g., google/gemma-3-27b-it:free, qwen/qwq-32b:free';
        break;
      case 'groq':
        modelInput.placeholder = 'e.g., mistral-saba-24b, llama3-70b-8192';
        break;
    }
  }

  /**
   * Loads saved configuration for the selected provider
   * @param {string} provider - Selected AI provider
   */
  function loadProviderConfig(provider) {
    chrome.storage.local.get(['apiConfig'], function(data) {
      if (data.apiConfig && data.apiConfig[provider]) {
        apiKeyInput.value = data.apiConfig[provider].apiKey;
        modelInput.value = data.apiConfig[provider].selectedModel;
      } else {
        // Clear inputs if no configuration exists
        apiKeyInput.value = '';
        modelInput.value = '';
      }
    });
  }

  /**
   * Saves the user's configuration to Chrome storage
   * Validates inputs and shows appropriate status message
   */
  saveBtn.addEventListener('click', function() {
    const provider = providerSelect.value;
    const apiKey = apiKeyInput.value.trim();
    const selectedModel = modelInput.value.trim();
    
    // Input validation
    if (!provider) {
      showStatus('Please select a provider', 'error');
      return;
    }

    if (!apiKey) {
      showStatus('Please enter an API key', 'error');
      return;
    }

    if (!selectedModel) {
      showStatus('Please enter a model name', 'error');
      return;
    }

    // Save configuration to Chrome storage
    chrome.storage.local.get(['apiConfig'], function(data) {
      const apiConfig = data.apiConfig || {};
      apiConfig[provider] = {
        apiKey: apiKey,
        selectedModel: selectedModel
      };
      
      chrome.storage.local.set({ 
        apiConfig: apiConfig,
        activeProvider: provider  // Set as active provider
      }, function() {
        showStatus('Configuration saved successfully!', 'success');
      });
    });
  });

  /**
   * Displays a status message to the user
   * @param {string} message - Message text to display
   * @param {string} type - Message type ('success' or 'error')
   */
  function showStatus(message, type) {
    statusMessage.textContent = message;
    statusMessage.className = 'status ' + type;
    statusMessage.style.display = 'block';
    
    // Auto-hide status message after 5 seconds
    setTimeout(function() {
      statusMessage.style.display = 'none';
    }, 5000);
  }

  // ===== INITIALIZATION =====
  
  /**
   * Load existing configuration when page is loaded
   * Sets up the UI based on the active provider
   */
  chrome.storage.local.get(['apiConfig', 'activeProvider'], function(data) {
    if (data.activeProvider) {
      providerSelect.value = data.activeProvider;
      // Trigger change event to load proper UI
      providerSelect.dispatchEvent(new Event('change'));
    }
  });
});