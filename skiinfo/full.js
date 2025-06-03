const odhElement = document.getElementById('mySkiInfo');
let tabActionCompleted = false;
let stylesInjected = false;
let infoRowsProcessed = false;
let mainObserver = null;

async function injectCustomStyles() {
  if (stylesInjected || !odhElement || !odhElement.shadowRoot) {
    return stylesInjected;
  }

  const cssUrl = 'https://cdn.jsdelivr.net/gh/peer-travel/hub@main/skiinfo/full.css'; // O il tuo URL CSS corretto

  try {
    const response = await fetch(cssUrl);
    if (!response.ok) {
      /* console.error(`CSS Fetch Error: ${response.status} for ${cssUrl}`); */
      return false;
    }
    const cssText = await response.text();
    const styleSheet = document.createElement('style');
    
    styleSheet.textContent = cssText; // Il cssText caricato dall'URL

    odhElement.shadowRoot.appendChild(styleSheet);
    stylesInjected = true;
    /* console.log(`SUCCESS: Custom CSS from ${cssUrl} injected.`); */
    return true;
  } catch (error) {
    /* console.error(`Error fetching/applying CSS from ${cssUrl}:`, error); */
    return false;
  }
}

function hideDivsContainingSpecificSVGs() {
  if (!odhElement || !odhElement.shadowRoot) return;

  const shadow = odhElement.shadowRoot;
  const infoRowSelector = '.flex-grow-1[class*="p-"] > .d-flex.flex-column.gap-4 > .row > div[class*="col-"]';
  const infoRows = shadow.querySelectorAll(infoRowSelector);

  let itemsHiddenThisRun = 0;

  infoRows.forEach(rowDiv => {
    const hasMapIcon = rowDiv.querySelector('svg.map-icon.icon');
    const hasPhoneIcon = rowDiv.querySelector('svg.phone.icon');

    if ((hasMapIcon || hasPhoneIcon) && rowDiv.style.display !== 'none') {
      rowDiv.style.display = 'none';
      itemsHiddenThisRun++;
      /* console.log('Hiding info row containing specific SVG:', rowDiv); */
    }
  });
  if(itemsHiddenThisRun > 0){
    /* console.log(`${itemsHiddenThisRun} info rows with specific SVGs hidden in this pass.`); */
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

      let targetTab = 'Info'; 

      if (!availableMenus.includes(targetTab)) {
        if (availableMenus.includes('Info')) {
            targetTab = 'Info';
        } else if (availableMenus.includes('Slopes')) {
            targetTab = 'Slopes';
        } else if (availableMenus.length > 0) {
            targetTab = availableMenus[0];
        } else {
            /* console.warn('No available menus to select.'); */
            return true; 
        }
      }
      
      if (itemDetailInstance.selectedMenu !== targetTab) {
        itemDetailInstance.selectedMenu = targetTab;
        itemDetailInstance.$forceUpdate();
        /* console.log(`SUCCESS: Set selectedMenu to "${targetTab}".`); */
      }

      if (itemDetailInstance.selectedMenu === 'Info' || targetTab === 'Info') { // O se vuoi farlo sempre
          hideDivsContainingSpecificSVGs();
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
  
  if(tabActionCompleted) {
    hideDivsContainingSpecificSVGs();
  }

  if (tabActionCompleted && mainObserver) {
    mainObserver.disconnect();
    /* console.log('Tab action and initial SVG hide completed, observer disconnected.'); */
  }

}

if (odhElement) {
  mainObserver = new MutationObserver(runPostRenderModifications);

  const initializeComponentModifications = async () => {
    if (odhElement.shadowRoot) {
      await injectCustomStyles(); 
      mainObserver.observe(odhElement.shadowRoot, { childList: true, subtree: true, attributes: true });
      runPostRenderModifications(); 
    } else {
      /* console.warn('ShadowRoot not found for odh-tourism-skiinfo.'); */
    }
  };

  customElements.whenDefined('odh-tourism-skiinfo').then(() => {
    setTimeout(initializeComponentModifications, 150); // Leggermente aumentato per fetch CSS e init
  }).catch(error => {
    /* console.error('Error waiting for odh-tourism-skiinfo definition:', error); */
  });
} else {
  /* console.error('Element with ID "mySkiInfo" not found. Script will not run.'); */
}
