// content.js
(function() {
  // Configuration
  const BACKEND_URL = 'https://0c45-66-129-246-4.ngrok-free.app/api/check-fake-news';
  const SUMMARIZE_URL = 'http://127.0.0.1:4000/api/summarize';
  
  // News site configuration for main headline selectors
  const NEWS_SITE_SELECTORS = {
    'nytimes.com': {
      mainHeadlines: 'h1.headline, main h1, article.css-1vxca1d h1, header h1',
      article: 'article, div.story-body'
    },
    'cnn.com': {
      mainHeadlines: 'h1.pg-headline, .banner-text h1, .Article__title, .article__title',
      article: '.article, .article__content'
    },
    'washingtonpost.com': {
      mainHeadlines: 'h1.font--headline, .topper-headline h1, article header h1',
      article: 'article, .article-body'
    },
    'foxnews.com': {
      mainHeadlines: 'h1.headline, .article-header h1, header.article-header-caption h1',
      article: 'article, .article-body'
    },
    'bbc.com': {
      mainHeadlines: 'h1.story-body__h1, main h1, article h1',
      article: 'article, .story-body'
    },
    // Generic selectors as fallback for other news sites
    'default': {
      mainHeadlines: 'h1.main-headline, main h1, article h1, header h1, .headline-main, .article-title h1',
      article: 'article, .article, .story, .post, main'
    }
  };
  
  // Observer to detect new content being loaded (for sites with lazy loading)
  const contentObserver = new MutationObserver(mutations => {
    let newNodesAdded = false;
    
    // Check if any new nodes were added
    mutations.forEach(mutation => {
      if (mutation.addedNodes && mutation.addedNodes.length > 0) {
        newNodesAdded = true;
      }
    });
    
    // Only process headlines if new nodes were added
    if (newNodesAdded) {
      // Use a small delay to allow DOM to settle
      setTimeout(processMainHeadlines, 300);
    }
  });
  
  // Start observing the page for new content
  function initObserver() {
    const mainContent = document.querySelector('body');
    if (mainContent) {
      contentObserver.observe(mainContent, { childList: true, subtree: true });
      processMainHeadlines(); // Process existing headlines on page load
    } else {
      // setTimeout(initObserver, 1000);
    }
  }
  
  // Get the appropriate selectors for the current website
  function getSelectorsForSite() {
    const hostname = window.location.hostname;
    
    for (const domain in NEWS_SITE_SELECTORS) {
      if (hostname.includes(domain)) {
        return NEWS_SITE_SELECTORS[domain];
      }
    }
    
    // Return default selectors if no specific match
    return NEWS_SITE_SELECTORS.default;
  }
  
  // Function to determine if a headline is a main headline
  function isMainHeadline(element) {
    // Check if element is h1
    const isH1 = element.tagName.toLowerCase() === 'h1';
    
    // Check if the element has a large font size compared to regular text
    const fontSize = parseInt(window.getComputedStyle(element).fontSize);
    const isLargeFontSize = fontSize >= 22; // Typical main headline size
    
    // Check position (main headlines are often at the top of the article or page)
    const rect = element.getBoundingClientRect();
    const isVisibleInFirstScreen = rect.top < window.innerHeight;
    
    // Check if inside main article container or header
    const isInMainContent = 
      !!element.closest('main') || 
      !!element.closest('header') || 
      !!element.closest('article');
    
    // For h1 elements, be more lenient
    if (isH1) {
      return isVisibleInFirstScreen && isInMainContent;
    }
    
    // For other elements, require more conditions to be met
    return isLargeFontSize && isVisibleInFirstScreen && isInMainContent;
  }
  
  // Process main headlines on the page
  function processMainHeadlines() {
    const selectors = getSelectorsForSite();
    const potentialHeadlines = document.querySelectorAll(selectors.mainHeadlines);
    
    // Filter to only include main headlines
    const mainHeadlines = Array.from(potentialHeadlines).filter(isMainHeadline);
    
    // Limit to at most 2 main headlines per page to avoid checking too many
    const limitedMainHeadlines = mainHeadlines.slice(0, 2);
    
    limitedMainHeadlines.forEach(headline => {
      // Skip already processed headlines
      if (headline.getAttribute('data-fact-checked') === 'true') {
        return;
      }
      
      // Check if headline already has a badge
      if (headline.querySelector('.fact-check-badge')) {
        // Mark as processed to prevent further badge additions
        headline.setAttribute('data-fact-checked', 'true');
        return;
      }
      
      // Mark as being processed to prevent multiple simultaneous analyses
      headline.setAttribute('data-fact-checked', 'processing');
      
      // Get the headline text
      const headlineText = headline.textContent.trim();
      
      // Only process if it's a substantial headline (not just a few words)
      if (headlineText.length > 15) {
        analyzeHeadline(headlineText, headline);
      } else {
        // Mark short headlines as processed but don't analyze them
        headline.setAttribute('data-fact-checked', 'true');
      }
    });
    
    // Find and process article content for summarization
    processArticleContent();
  }
  
  // Send the headline to the backend for analysis
  function analyzeHeadline(headlineText, headlineElement) {
    console.log(`Analyzing headline: ${headlineText}`);
    
    // In a real extension, this would be an actual API call
    // For this example, we'll simulate a response
    simulateBackendAnalysis(headlineText)
      .then(result => {
        // Check if badge already exists or if headline was already processed while waiting
        if (headlineElement.querySelector('.fact-check-badge') || 
            headlineElement.getAttribute('data-fact-checked') === 'true') {
          return;
        }
        displayFactCheckResult(result, headlineElement);
        // Mark as fully processed
        headlineElement.setAttribute('data-fact-checked', 'true');
      })
      .catch(error => {
        console.error('Error analyzing headline:', error);
        // Reset processing state on error to allow retry
        headlineElement.setAttribute('data-fact-checked', 'false');
      });
  }
  
  // Send headline to Flask API for model inference
  async function simulateBackendAnalysis(headlineText) {
    try {
      console.log(`Sending headline to API: ${headlineText}`);
      
      const response = await fetch(BACKEND_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ headline: headlineText })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Network response was not ok: ${response.status} - ${errorText}`);
      }
      
      const result = await response.json();
      console.log('API response:', result);
      
      const isRealNews = result.prediction === "Real News";
      
      return {
        confidence: result.confidence,
        headline: result.headline,
        prediction: isRealNews ? "Real News" : "Fake News",
        // Add additional analysis properties for display purposes
        analysis: isRealNews ? 
          "This headline appears to be factually accurate based on our model analysis." : 
          "This headline may contain misleading or false information according to our model.",
        details: isRealNews ?
          `The model is ${(result.confidence * 100).toFixed(1)}% confident that this is real news.` :
          `The model is ${(result.confidence * 100).toFixed(1)}% confident that this is fake news.`,
        fake_probability: result.fake_probability,
        real_probability: result.real_probability
      };
      
    } catch (error) {
      console.error('Error analyzing headline:', error);
      throw error; // Re-throw to be handled by the caller
    }
  }
  
  // Display the fact-check result next to the headline
  function displayFactCheckResult(result, headlineElement) {
    // First, check if a badge already exists (double-check to prevent race conditions)
    if (headlineElement.querySelector('.fact-check-badge')) {
      return;
    }
    
    // Create the badge element
    const badge = document.createElement('div');
    badge.className = 'fact-check-badge';
    badge.style.display = 'inline-flex';
    badge.style.alignItems = 'center';
    badge.style.marginLeft = '10px';
    badge.style.padding = '3px 8px';
    badge.style.borderRadius = '4px';
    badge.style.fontSize = '12px';
    badge.style.fontWeight = 'bold';
    badge.style.cursor = 'pointer';
    badge.style.zIndex = '9999';
    badge.style.gap = '4px';
    badge.style.transition = 'all 0.2s ease';
    badge.style.boxShadow = '0 1px 3px rgba(0,0,0,0.12)';
    badge.dataset.headlineId = `headline-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    
    // Store the analysis result as a data attribute
    badge.dataset.analysis = JSON.stringify(result);
    // Set colors based on result
    const isRealNews = result.prediction === "Real News";
    if (!isRealNews) {
      badge.style.backgroundColor = 'rgba(255, 87, 87, 0.1)';
      badge.style.border = '1px solid #ff5757';
      badge.style.color = '#ff5757';
    } else {
      badge.style.backgroundColor = 'rgba(57, 181, 74, 0.1)';
      badge.style.border = '1px solid #39b54a';
      badge.style.color = '#39b54a';
    }
    
    // Create icon
    const icon = document.createElement('span');
    icon.textContent = isRealNews ? '✓' : '⚠️';
    icon.style.fontSize = '12px';
    
    // Create text content
    const text = document.createElement('span');
    text.textContent = isRealNews ? 'Real News' : 'Potentially Fake';
    
    // Assemble the badge
    badge.appendChild(icon);
    badge.appendChild(text);
    
    // Create tooltip for more details
    const confidencePercent = Math.round(result.confidence * 100);
    badge.title = `Click for detailed analysis: ${result.prediction} (${confidencePercent}% confidence)`;
    
    // Setup click event to show/hide modal
    badge.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      
      // Get the stored analysis data
      const analysisData = JSON.parse(badge.dataset.analysis);
      
      // Check if modal is already visible for this badge
      const existingModal = document.querySelector('.fact-check-modal-overlay');
      const badgeId = badge.dataset.headlineId;
      
      if (existingModal && existingModal.dataset.badgeId === badgeId) {
        // If modal exists for this badge, close it
        existingModal.classList.remove('fact-check-modal-visible');
        setTimeout(() => {
          existingModal.remove();
        }, 300);
      } else {
        // If no modal or different badge's modal, show new one
        if (existingModal) {
          existingModal.remove();
        }
        showModalAnalysis(analysisData, badge);
      }
    });
    
    // Save the original display style of the headline
    const originalDisplay = window.getComputedStyle(headlineElement).display;
    
    // Only modify the headline display if needed (not already flex)
    if (originalDisplay !== 'flex') {
      // Only preserve the original display if it's not 'block' to avoid display issues
      if (originalDisplay !== 'block') {
        headlineElement.dataset.originalDisplay = originalDisplay;
      }
      headlineElement.style.display = 'flex';
    }
    
    headlineElement.style.flexWrap = 'wrap';
    headlineElement.style.alignItems = 'center';
    
    // Add the badge to the headline
    headlineElement.appendChild(badge);
  }
  
  // Create and show modal overlay
  function showModalAnalysis(result, badgeElement) {
    // Remove any existing modal
    const existingModal = document.querySelector('.fact-check-modal-overlay');
    if (existingModal) {
      existingModal.remove();
    }
    
    // Create modal overlay
    const modalOverlay = document.createElement('div');
    modalOverlay.className = 'fact-check-modal-overlay';
    
    // Store the badge ID to track which badge this modal belongs to
    modalOverlay.dataset.badgeId = badgeElement.dataset.headlineId;
    
    // Create modal container
    const modal = document.createElement('div');
    modal.className = 'fact-check-modal';
    
    // Position the modal near the badge, but centered if possible
    const badgeRect = badgeElement.getBoundingClientRect();
    
    // Create header with close button
    const header = document.createElement('div');
    header.className = 'fact-check-modal-header';
    
    const title = document.createElement('h3');
    title.textContent = 'Headline Analysis';
    
    const closeButton = document.createElement('button');
    closeButton.textContent = '×';
    closeButton.className = 'fact-check-modal-close';
    closeButton.addEventListener('click', () => {
      modalOverlay.classList.remove('fact-check-modal-visible');
      setTimeout(() => {
        modalOverlay.remove();
      }, 300);
    });
    
    header.appendChild(title);
    header.appendChild(closeButton);
    modal.appendChild(header);
    
    // Headline
    const headline = document.createElement('div');
    headline.className = 'fact-check-modal-headline';
    headline.textContent = `"${result.headline}"`;
    modal.appendChild(headline);
    
    // Verdict
    const verdict = document.createElement('div');
    verdict.className = 'fact-check-modal-verdict';
    
    const isRealNews = result.prediction === "Real News";
    if (!isRealNews) {
      verdict.classList.add('fact-check-modal-misleading');
      verdict.textContent = 'Fake News';
    } else {
      verdict.classList.add('fact-check-modal-factual');
      verdict.textContent = 'Real News';
    }
    
    modal.appendChild(verdict);
    
    // Analysis
    if (result.analysis) {
      const analysisContainer = document.createElement('div');
      analysisContainer.className = 'fact-check-modal-section';
      
      const analysisTitle = document.createElement('h4');
      analysisTitle.textContent = 'Analysis';
      
      const analysisContent = document.createElement('p');
      analysisContent.textContent = result.analysis;
      
      analysisContainer.appendChild(analysisTitle);
      analysisContainer.appendChild(analysisContent);
      modal.appendChild(analysisContainer);
    }
    
    // Details
    if (result.details) {
      const detailsContainer = document.createElement('div');
      detailsContainer.className = 'fact-check-modal-section';
      
      const detailsTitle = document.createElement('h4');
      detailsTitle.textContent = 'Details';
      
      const detailsContent = document.createElement('p');
      detailsContent.textContent = result.details;
      
      detailsContainer.appendChild(detailsTitle);
      detailsContainer.appendChild(detailsContent);
      modal.appendChild(detailsContainer);
    }
    
    // Confidence and Probability Section
    const probabilityContainer = document.createElement('div');
    probabilityContainer.className = 'fact-check-modal-section';
    
    const probabilityTitle = document.createElement('h4');
    probabilityTitle.textContent = 'Model Confidence';
    probabilityContainer.appendChild(probabilityTitle);
    
    // Real news probability
    const realProbContainer = document.createElement('div');
    realProbContainer.className = 'fact-check-modal-confidence';
    const realProbPercent = Math.round((result.real_probability || 0) * 100);
    realProbContainer.textContent = `Real News: ${realProbPercent}%`;
    probabilityContainer.appendChild(realProbContainer);
    
    // Real news confidence bar
    const realBarContainer = document.createElement('div');
    realBarContainer.className = 'fact-check-modal-confidence-bar-container';
    
    const realBar = document.createElement('div');
    realBar.className = 'fact-check-modal-confidence-bar confidence-real';
    realBar.style.width = `${realProbPercent}%`;
    
    realBarContainer.appendChild(realBar);
    probabilityContainer.appendChild(realBarContainer);
    
    // Fake news probability
    const fakeProbContainer = document.createElement('div');
    fakeProbContainer.className = 'fact-check-modal-confidence';
    fakeProbContainer.style.marginTop = '10px';
    const fakeProbPercent = Math.round((result.fake_probability || 0) * 100);
    fakeProbContainer.textContent = `Fake News: ${fakeProbPercent}%`;
    probabilityContainer.appendChild(fakeProbContainer);
    
    // Fake news confidence bar
    const fakeBarContainer = document.createElement('div');
    fakeBarContainer.className = 'fact-check-modal-confidence-bar-container';
    
    const fakeBar = document.createElement('div');
    fakeBar.className = 'fact-check-modal-confidence-bar confidence-fake';
    fakeBar.style.width = `${fakeProbPercent}%`;
    
    fakeBarContainer.appendChild(fakeBar);
    probabilityContainer.appendChild(fakeBarContainer);
    
    modal.appendChild(probabilityContainer);
    
    // Disclaimer
    const disclaimer = document.createElement('div');
    disclaimer.className = 'fact-check-modal-disclaimer';
    disclaimer.textContent = 'This is an automated analysis and may not be 100% accurate. Use critical thinking when consuming news.';
    modal.appendChild(disclaimer);
    
    // Add the modal to the overlay
    modalOverlay.appendChild(modal);
    
    // Add modal interaction events
    modalOverlay.addEventListener('click', (e) => {
      // Close if clicking outside the modal
      if (e.target === modalOverlay) {
        modalOverlay.classList.remove('fact-check-modal-visible');
        setTimeout(() => {
          modalOverlay.remove();
        }, 300);
      }
    });
    
    // Prevent clicks inside the modal from closing it
    modal.addEventListener('click', (e) => {
      e.stopPropagation();
    });
    
    // Add the overlay to the document
    document.body.appendChild(modalOverlay);
    
    // Trigger the animation after a small delay
    setTimeout(() => {
      modalOverlay.classList.add('fact-check-modal-visible');
    }, 10);
    
    return modalOverlay;
  }
  
  // Add CSS styles
  function addStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .fact-check-badge {
        font-family: Arial, sans-serif;
      }
      
      .fact-check-badge:hover {
        filter: brightness(1.1);
      }
      
      .fact-check-modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10000;
        opacity: 0;
        visibility: hidden;
        transition: opacity 0.3s ease, visibility 0.3s ease;
      }
      
      .fact-check-modal-visible {
        opacity: 1;
        visibility: visible;
      }
      
      .fact-check-modal {
        background-color: #fff;
        border-radius: 8px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
        width: 90%;
        max-width: 500px;
        max-height: 80vh;
        overflow-y: auto;
        padding: 0;
        font-family: Arial, sans-serif;
        position: relative;
        animation: modalAppear 0.3s ease;
      }
      
      @keyframes modalAppear {
        from {
          transform: translateY(20px);
          opacity: 0;
        }
        to {
          transform: translateY(0);
          opacity: 1;
        }
      }
      
      .fact-check-modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 16px 20px;
        border-bottom: 1px solid #eee;
      }
      
      .fact-check-modal-header h3 {
        margin: 0;
        font-size: 18px;
        color: #333;
      }
      
      .fact-check-modal-close {
        background: none;
        border: none;
        font-size: 24px;
        cursor: pointer;
        color: #999;
        padding: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 30px;
        height: 30px;
        border-radius: 50%;
      }
      
      .fact-check-modal-close:hover {
        background-color: rgba(0, 0, 0, 0.05);
        color: #333;
      }
      
      .fact-check-modal-headline {
        padding: 16px 20px;
        font-weight: bold;
        border-bottom: 1px solid #eee;
        font-size: 16px;
      }
      
      .fact-check-modal-verdict {
        margin: 16px 20px;
        padding: 12px;
        border-radius: 4px;
        font-weight: bold;
        text-align: center;
        font-size: 16px;
      }
      
      .fact-check-modal-misleading {
        background-color: rgba(255, 87, 87, 0.1);
        color: #ff5757;
        border: 1px solid #ff5757;
      }
      
      .fact-check-modal-factual {
        background-color: rgba(57, 181, 74, 0.1);
        color: #39b54a;
        border: 1px solid #39b54a;
      }
      
      .fact-check-modal-section {
        padding: 0 20px 16px;
      }
      
      .fact-check-modal-section h4 {
        margin: 0 0 8px;
        font-size: 15px;
        color: #555;
      }
      
      .fact-check-modal-section p {
        margin: 0;
        line-height: 1.5;
        color: #333;
      }
      
      .fact-check-modal-confidence {
        padding: 0 20px 8px;
        color: #666;
        font-weight: 500;
      }
      
      .fact-check-modal-confidence-bar-container {
        height: 8px;
        background-color: #eee;
        border-radius: 4px;
        margin: 0 20px 16px;
        overflow: hidden;
      }
      
      .fact-check-modal-confidence-bar {
        height: 100%;
        border-radius: 4px;
        transition: width 0.6s ease;
      }
      
      .confidence-real {
        background-color: #39b54a;
      }
      
      .confidence-fake {
        background-color: #ff5757;
      }
      
      .fact-check-modal-disclaimer {
        padding: 12px 20px;
        background-color: #f5f5f5;
        color: #999;
        font-size: 12px;
        line-height: 1.4;
        border-top: 1px solid #eee;
        border-radius: 0 0 8px 8px;
      }
    `;
    document.head.appendChild(style);
  }
  
  // Find and process article content for summarization
  function processArticleContent() {
    const selectors = getSelectorsForSite();
    const articleElements = document.querySelectorAll(selectors.article);
    
    if (!articleElements || articleElements.length === 0) {
      return;
    }
    
    // Find the main article element (usually the first one or the longest one)
    let mainArticle = articleElements[0];
    let maxLength = mainArticle.textContent.length;
    
    // Find the longest article content if there are multiple candidates
    for (let i = 1; i < articleElements.length; i++) {
      const length = articleElements[i].textContent.length;
      if (length > maxLength) {
        maxLength = length;
        mainArticle = articleElements[i];
      }
    }
    
    // Skip if article is too short or already has a summarize button
    if (maxLength < 500 || mainArticle.querySelector('.article-summarize-button')) {
      return;
    }
    
    // Create summarize button
    addSummarizeButton(mainArticle);
  }
  
  // Add a summarize button to the article
  function addSummarizeButton(articleElement) {
    // Create button container
    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'article-summarize-container';
    buttonContainer.style.margin = '20px 0';
    buttonContainer.style.textAlign = 'center';
    
    // Create the button
    const summarizeButton = document.createElement('button');
    summarizeButton.className = 'article-summarize-button';
    summarizeButton.textContent = 'Summarize Article';
    summarizeButton.style.padding = '10px 15px';
    summarizeButton.style.backgroundColor = '#4285f4';
    summarizeButton.style.color = 'white';
    summarizeButton.style.border = 'none';
    summarizeButton.style.borderRadius = '4px';
    summarizeButton.style.cursor = 'pointer';
    summarizeButton.style.fontWeight = 'bold';
    summarizeButton.style.fontSize = '14px';
    summarizeButton.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
    summarizeButton.style.transition = 'all 0.2s ease';
    
    // Add hover effect
    summarizeButton.addEventListener('mouseover', () => {
      summarizeButton.style.backgroundColor = '#3367d6';
    });
    
    summarizeButton.addEventListener('mouseout', () => {
      summarizeButton.style.backgroundColor = '#4285f4';
    });
    
    // Add click event
    summarizeButton.addEventListener('click', () => {
      // Change button state to loading
      summarizeButton.disabled = true;
      summarizeButton.textContent = 'Summarizing...';
      summarizeButton.style.backgroundColor = '#cccccc';
      
      // Get article text
      const articleText = articleElement.textContent.trim();
      
      // Call API to summarize
      summarizeArticle(articleText, articleElement, summarizeButton);
    });
    
    // Add button to container
    buttonContainer.appendChild(summarizeButton);
    
    // Add container to beginning of article
    articleElement.insertBefore(buttonContainer, articleElement.firstChild);
  }
  
  // Extract clean article text (removing navigation, scripts, etc.)
  function extractCleanArticleText(articleElement) {
    // Create a deep clone of the article element to avoid modifying the original
    const clone = articleElement.cloneNode(true);
    
    // Remove common non-article elements
    const elementsToRemove = clone.querySelectorAll(
      'nav, header, footer, aside, script, style, iframe, ' +
      '.nav, .navigation, .menu, .social, .share, .related, ' +
      '.comments, .ad, .advertisement, .sidebar, .promo, ' +
      '.newsletter, .subscribe, .subscription, .copyright'
    );
    
    elementsToRemove.forEach(el => {
      if (el && el.parentNode) {
        el.parentNode.removeChild(el);
      }
    });
    
    // Get paragraphs which are more likely to be article content
    const paragraphs = Array.from(clone.querySelectorAll('p'));
    
    // Filter out very short paragraphs (likely not part of the main content)
    const contentParagraphs = paragraphs.filter(p => {
      const text = p.textContent.trim();
      return text.length > 40 && text.split(' ').length > 8;
    });
    
    // If we have enough paragraphs, use only those
    if (contentParagraphs.length >= 3) {
      return contentParagraphs.map(p => p.textContent.trim()).join(' ');
    }
    
    // Fallback: use the cleaned clone's text content
    return clone.textContent.trim();
  }
  
  // Send article to API for summarization
  async function summarizeArticle(articleText, articleElement, button) {
    try {
      // Extract clean article text
      const cleanArticleText = extractCleanArticleText(articleElement);
      console.log(`Sending article to summarize API: ${cleanArticleText.substring(0, 100)}...`);
      
      const response = await fetch(SUMMARIZE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          article: cleanArticleText,
          num_sentences: 5  // Request 5 sentences for the summary
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Network response was not ok: ${response.status} - ${errorText}`);
      }
      
      const result = await response.json();
      console.log('API summary response:', result);
      
      // Display the summary
      displaySummary(result.summary, articleElement, button);
      
    } catch (error) {
      console.error('Error summarizing article:', error);
      
      // Reset button
      button.disabled = false;
      button.textContent = 'Summarize Article';
      button.style.backgroundColor = '#4285f4';
      
      // Show error
      alert('Error summarizing article. Please try again.');
    }
  }
  
  // Display the summary in the page
  function displaySummary(summaryText, articleElement, button) {
    // Create summary container
    const summaryContainer = document.createElement('div');
    summaryContainer.className = 'article-summary-container';
    summaryContainer.style.margin = '20px 0';
    summaryContainer.style.padding = '15px';
    summaryContainer.style.backgroundColor = '#f8f9fa';
    summaryContainer.style.border = '1px solid #dadce0';
    summaryContainer.style.borderRadius = '8px';
    summaryContainer.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
    
    // Create header
    const summaryHeader = document.createElement('div');
    summaryHeader.style.fontWeight = 'bold';
    summaryHeader.style.fontSize = '16px';
    summaryHeader.style.marginBottom = '10px';
    summaryHeader.style.color = '#202124';
    summaryHeader.textContent = 'Article Summary';
    
    // Create summary text
    const summaryContent = document.createElement('div');
    summaryContent.style.lineHeight = '1.5';
    summaryContent.style.color = '#202124';
    summaryContent.textContent = summaryText;
    
    // Assemble the summary
    summaryContainer.appendChild(summaryHeader);
    summaryContainer.appendChild(summaryContent);
    
    // Get the button container
    const buttonContainer = button.parentElement;
    
    // Replace button with "Show Full Article" button
    button.textContent = 'Show Full Article';
    button.style.backgroundColor = '#4285f4';
    button.disabled = false;
    
    // Toggle between summary and full article
    let showingSummary = true;
    button.addEventListener('click', () => {
      if (showingSummary) {
        // Hide summary, show full article
        summaryContainer.style.display = 'none';
        button.textContent = 'Show Summary';
        showingSummary = false;
      } else {
        // Show summary, hide full article
        summaryContainer.style.display = 'block';
        button.textContent = 'Show Full Article';
        showingSummary = true;
      }
    });
    
    // Insert summary after the button container
    buttonContainer.parentNode.insertBefore(summaryContainer, buttonContainer.nextSibling);
  }
  
  // Initialize
  function init() {
    console.log('News Headline Fact Checker extension initialized');
    addStyles();
    initObserver();
    
    // Debug log to show which selectors we're using
    const selectors = getSelectorsForSite();
    console.log('Using selectors for main headlines:', selectors.mainHeadlines);
  }
  
  // Start the extension
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();