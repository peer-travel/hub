const odhElement = document.getElementById('mySkiInfo');
let tabActionCompleted = false;
let stylesInjected = false;
let mainObserver = null;

async function injectCustomStyles() {
  if (stylesInjected || !odhElement || !odhElement.shadowRoot) {
    return stylesInjected;
  }
  const cssUrl = 'https://cdn.jsdelivr.net/gh/peer-travel/hub@main/skiinfo/full.css';
  try {
    const response = await fetch(cssUrl);
    if (!response.ok) {
      return false;
    }
    const cssText = await response.text();
    const styleSheet = document.createElement('style');
    styleSheet.textContent = cssText;
    odhElement.shadowRoot.appendChild(styleSheet);
    stylesInjected = true;
    return true;
  } catch (error) {
    return false;
  }
}

function hideSpecificInfoRows() {
  if (!odhElement || !odhElement.shadowRoot) return;

  const shadow = odhElement.shadowRoot;
  const infoRowSelector = 'div[class*="col-"]';
  const infoRows = shadow.querySelectorAll(infoRowSelector);

  infoRows.forEach(rowDiv => {
    const hasMapIcon = rowDiv.querySelector('svg.map-icon.icon');
    if (hasMapIcon && rowDiv.style.display !== 'none') {
      rowDiv.style.setProperty('display', 'none', 'important');
      return;
    }

    const hasPhoneIcon = rowDiv.querySelector('svg.phone.icon');
    if (hasPhoneIcon && rowDiv.style.display !== 'none') {
      rowDiv.style.setProperty('display', 'none', 'important');
      return;
    }

    const currentLanguage = odhElement.getAttribute('language') || 'en';
    const webLabels = {
      'de': 'Web:',
      'it': 'Web:',
      'en': 'Web:'
    };
    const expectedWebLabelText = webLabels[currentLanguage] || webLabels['en'];

    const webLabelSpan = Array.from(rowDiv.querySelectorAll('span')).find(
      span => span.textContent.trim().toLowerCase() === expectedWebLabelText.toLowerCase()
    );

    if (webLabelSpan && rowDiv.style.display !== 'none') {
      const hasWebLink = rowDiv.querySelector('a[href^="http"]');
      if (hasWebLink) {
        rowDiv.style.setProperty('display', 'none', 'important');
      }
    }
  });
}

function selectTargetTab() {
  if (!odhElement || !odhElement.vueComponent) return false;

  const mainVueInstance = odhElement.vueComponent;
  const currentItem = mainVueInstance.displayedItem && mainVueInstance.displayedItem[0];

  if (mainVueInstance.mode === 'display' && currentItem && mainVueInstance.$children) {
    const itemDetailInstance = mainVueInstance.$children.find(
      child => child && typeof child.selectedMenu === 'string' && Array.isArray(child.menus)
    );

    if (itemDetailInstance) {
      const availableMenus = itemDetailInstance.menus || [];
      let targetTab = 'Info';

      if (availableMenus.includes('Lifts')) {
        targetTab = 'Lifts';
      } else if (availableMenus.includes('Slopes')) {
        targetTab = 'Slopes';
      } else if (!availableMenus.includes('Info') && availableMenus.length > 0) {
        targetTab = availableMenus[0];
      } else if (!availableMenus.includes('Info') && availableMenus.length === 0) {
        return true;
      }

      if (itemDetailInstance.selectedMenu !== targetTab) {
        itemDetailInstance.selectedMenu = targetTab;
        itemDetailInstance.$forceUpdate();
      }

      if (itemDetailInstance.selectedMenu === 'Info' || targetTab === 'Info') {
        hideSpecificInfoRows();
      }
      return true;
    }
  }
  return false;
}

async function runPostRenderModifications() {
  if (!tabActionCompleted) {
    tabActionCompleted = selectTargetTab();
  }

  if (tabActionCompleted) {
    hideSpecificInfoRows();
  }

  if (tabActionCompleted && mainObserver) {
    mainObserver.disconnect();
  }
}

if (odhElement) {
  mainObserver = new MutationObserver(runPostRenderModifications);

  const initializeComponentModifications = async () => {
    if (odhElement.shadowRoot) {
      await injectCustomStyles();
      mainObserver.observe(odhElement.shadowRoot, {
        childList: true,
        subtree: true,
        attributes: true
      });
      runPostRenderModifications();
    }
  };

  customElements.whenDefined('odh-tourism-skiinfo').then(() => {
    setTimeout(initializeComponentModifications, 150);
  }).catch(error => {});
} else {}
