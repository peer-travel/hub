const odhElement = document.getElementById('mySkiInfo');
let tabActionCompleted = false;
let stylesInjected = false;
let mainObserver = null;

async function injectCustomStyles() {
  if (stylesInjected || !odhElement || !odhElement.shadowRoot) {
    return stylesInjected;
  }
  const cssUrl = 'https://cdn.jsdelivr.net/gh/peer-travel/hub@main/skiinfo/full.css'; // Assicurati che questo URL sia corretto
  try {
    const response = await fetch(cssUrl);
    if (!response.ok) {
      // console.error(`CSS Fetch Error: ${response.status} for ${cssUrl}`);
      return false;
    }
    const cssText = await response.text();
    const styleSheet = document.createElement('style');
    styleSheet.textContent = cssText;
    odhElement.shadowRoot.appendChild(styleSheet);
    stylesInjected = true;
    // console.log(`SUCCESS: Custom CSS from ${cssUrl} injected.`);
    return true;
  } catch (error) {
    // console.error(`Error fetching/applying CSS from ${cssUrl}:`, error);
    return false;
  }
}

function hideSpecificInfoRows() {
  if (!odhElement || !odhElement.shadowRoot) return;

  const shadow = odhElement.shadowRoot;
  // Selettore per i div "riga informativa". Verifica e adatta se necessario.
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
      'it': 'Web:', // Verifica l'etichetta corretta per l'italiano
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
      let targetTab = 'Info'; // Imposta "Info" come prima scelta

      // Se "Info" non è disponibile (es. escluso tramite exclude-menus),
      // allora cerca un'alternativa
      if (!availableMenus.includes(targetTab)) {
        if (availableMenus.includes('Lifts')) { // Seconda scelta
          targetTab = 'Lifts';
        } else if (availableMenus.includes('Slopes')) { // Terza scelta
          targetTab = 'Slopes';
        } else if (availableMenus.length > 0) { // Altrimenti il primo disponibile
          targetTab = availableMenus[0];
        } else {
          // console.warn('No available menus to select.');
          return true; // Nessun tab da selezionare, azione considerata completata
        }
      }

      if (itemDetailInstance.selectedMenu !== targetTab) {
        itemDetailInstance.selectedMenu = targetTab;
        itemDetailInstance.$forceUpdate();
        // console.log(`SUCCESS: Set selectedMenu to "${targetTab}".`);
      }

      // Esegui hideSpecificInfoRows se il tab selezionato (o target) è "Info"
      // Questa logica rimane valida perché vuoi nascondere elementi *nel* tab Info
      if (itemDetailInstance.selectedMenu === 'Info') {
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

  // Chiamata aggiuntiva per assicurarsi che gli elementi vengano nascosti
  // se il tab Info è stato selezionato o era già attivo.
  if (tabActionCompleted) {
    const mainVueInstance = odhElement.vueComponent;
    if (mainVueInstance && mainVueInstance.$children) {
        const itemDetailInstance = mainVueInstance.$children.find(
            child => child && typeof child.selectedMenu === 'string'
        );
        if (itemDetailInstance && itemDetailInstance.selectedMenu === 'Info') {
            hideSpecificInfoRows();
        }
    }
  }

  if (tabActionCompleted && mainObserver) {
    mainObserver.disconnect();
    // console.log('Tab action and initial SVG hide completed, observer disconnected.');
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
    } else {
      // console.warn('ShadowRoot not found for odh-tourism-skiinfo.');
    }
  };

  customElements.whenDefined('odh-tourism-skiinfo').then(() => {
    setTimeout(initializeComponentModifications, 150);
  }).catch(error => { /* console.error('Error waiting for odh-tourism-skiinfo definition:', error); */ });
} else {
  /* console.error('Element with ID "mySkiInfo" not found. Script will not run.'); */
}
