const odhElement = document.getElementById('mySkiInfo');
let initialTabSet = false;
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


function setInitialTargetTab() {
  if (!odhElement || !odhElement.vueComponent) return false;

  const mainVueInstance = odhElement.vueComponent;
  const currentItem = mainVueInstance.displayedItem && mainVueInstance.displayedItem[0];

  if (mainVueInstance.mode === 'display' && currentItem && mainVueInstance.$children) {
    const itemDetailInstance = mainVueInstance.$children.find(
      child => child && typeof child.selectedMenu === 'string' && Array.isArray(child.menus)
    );

    if (itemDetailInstance) {
      const availableMenus = itemDetailInstance.menus || [];
      let targetTab = 'Lifts';

      if (!availableMenus.includes(targetTab)) {
        if (availableMenus.includes('Lifts')) {
          targetTab = 'Lifts';
        } else if (availableMenus.includes('Slopes')) {
          targetTab = 'Slopes';
        } else if (availableMenus.length > 0) {
          targetTab = availableMenus[0];
        } else {
          return true;
        }
      }

      if (itemDetailInstance.selectedMenu !== targetTab) {
        itemDetailInstance.selectedMenu = targetTab;
        itemDetailInstance.$forceUpdate();
      }
      return true;
    }
  }
  return false;
}

async function handleDOMChanges() {
  if (!initialTabSet) {
    initialTabSet = setInitialTargetTab();
  }

  if (odhElement && odhElement.vueComponent) {
    const mainVueInstance = odhElement.vueComponent;
    if (mainVueInstance.$children) {
      const itemDetailInstance = mainVueInstance.$children.find(
        child => child && typeof child.selectedMenu === 'string'
      );
    }
  }
}

if (odhElement) {
  mainObserver = new MutationObserver(handleDOMChanges);

  const initializeComponentAndObserver = async () => {
    if (odhElement.shadowRoot) {
      await injectCustomStyles();
      
      mainObserver.observe(odhElement.shadowRoot, {
        childList: true,
        subtree: true
        // attributes: true
      });
      handleDOMChanges();
    }
  };

  customElements.whenDefined('odh-tourism-skiinfo').then(() => {
    setTimeout(initializeComponentAndObserver, 200);
  }).catch(error => {});
} else {}
