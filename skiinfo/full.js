const odhElement = document.getElementById('mySkiInfo');
let tabActionCompleted = false;
let stylesInjected = false;
let mainObserver = null;

async function injectCustomStyles() {
  if (stylesInjected || !odhElement || !odhElement.shadowRoot) {
    return stylesInjected;
  }

  const cssUrl = 'https://cdn.jsdelivr.net/gh/peer-travel/hub@main/skiinfo/full.min.css';

  try {
    const response = await fetch(cssUrl);
    if (!response.ok) {
      /* console.error(`Failed to fetch custom styles from ${cssUrl}. Status: ${response.status}`); */
      return false;
    }
    const cssText = await response.text();

    const styleSheet = document.createElement('style');
    styleSheet.textContent = cssText; 

    odhElement.shadowRoot.appendChild(styleSheet);
    stylesInjected = true;
    /* console.log(`SUCCESS: Custom CSS from ${cssUrl} injected.`); */
    return true;
  } catch (error) {
    /* console.error(`Error fetching or applying custom styles from ${cssUrl}:`, error); */
    return false;
  }
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
      let targetTab = 'Lifts'; // Tab di default desiderato

      // Fallback se 'Lifts' non è disponibile (es. a causa di exclude-menus)
      if (!availableMenus.includes(targetTab)) {
        if (availableMenus.includes('Info')) { 
            targetTab = 'Info';
            /* console.warn(`"Lifts" tab not in available menus (${availableMenus.join(', ')}). Attempting "Info".`); */
        } else if (availableMenus.length > 0) {
            targetTab = availableMenus[0];
            /* console.warn(`"Lifts" and "Info" tabs not in available menus. Attempting first available: "${targetTab}".`); */
        } else {
            /* console.warn('No available menus to select.'); */
            return true; // Nessun tab da selezionare, azione considerata completata.
        }
      }
      
      if (itemDetailInstance.selectedMenu !== targetTab) {
        itemDetailInstance.selectedMenu = targetTab;
        itemDetailInstance.$forceUpdate();
        /* console.log(`SUCCESS: Set selectedMenu to "${targetTab}".`); */
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

  if (tabActionCompleted && mainObserver) {
    mainObserver.disconnect();
    /* console.log('Tab action completed, observer disconnected.'); */
  }
}

if (odhElement) {
  mainObserver = new MutationObserver(runPostRenderModifications);

  const initializeComponentModifications = async () => {
    if (odhElement.shadowRoot) {
      await injectCustomStyles(); 
      mainObserver.observe(odhElement.shadowRoot, { childList: true, subtree: true });
      runPostRenderModifications(); 
    } else {
      /* console.warn('ShadowRoot not found for odh-tourism-skiinfo.'); */
    }
  };

  customElements.whenDefined('odh-tourism-skiinfo').then(() => {
    setTimeout(initializeComponentModifications, 100); 
  }).catch(error => {
    /* console.error('Error waiting for odh-tourism-skiinfo definition:', error); */
  });
} else {
  /* console.error('Element with ID "mySkiInfo" not found. Script will not run.'); */
}
