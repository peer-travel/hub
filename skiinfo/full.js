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
      let targetTab = 'Info';

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
      // La chiamata a hideSpecificInfoRows è ora gestita in runPostRenderModifications
      // per assicurare che venga eseguita anche sui ri-render.
      return true;
    }
  }
  return false;
}

// Questa funzione è la callback del MutationObserver
async function runPostRenderModifications() {
  // Imposta il tab target solo la prima volta (o se non ancora completato)
  if (!tabActionCompleted) {
    tabActionCompleted = selectTargetTab();
  }

  // Controlla sempre se il tab "Info" è attivo e, in caso, applica la logica di nascondiglio.
  // Questo gestirà sia il caricamento iniziale sia i ritorni al tab "Info".
  if (odhElement && odhElement.vueComponent) {
    const mainVueInstance = odhElement.vueComponent;
    // Assicurati che i figli siano accessibili e che itemDetailInstance esista
    const itemDetailInstance = mainVueInstance.$children && mainVueInstance.$children.find(
        child => child && typeof child.selectedMenu === 'string'
    );
    
    if (itemDetailInstance && itemDetailInstance.selectedMenu === 'Info') {
      hideSpecificInfoRows();
    }
  }

  // NON disconnettere l'observer qui, per permettere alla funzione di essere richiamata
  // quando l'utente naviga tra i tab e il contenuto del tab "Info" viene ri-renderizzato.
  // if (tabActionCompleted && mainObserver) {
  //   mainObserver.disconnect();
  // }
}

if (odhElement) {
  mainObserver = new MutationObserver(runPostRenderModifications);

  const initializeComponentModifications = async () => {
    if (odhElement.shadowRoot) {
      await injectCustomStyles();
      mainObserver.observe(odhElement.shadowRoot, {
        childList: true,  // Osserva aggiunte/rimozioni di figli
        subtree: true     // Osserva anche i discendenti
        // Non è strettamente necessario osservare gli 'attributes' per questo caso,
        // a meno che il cambio di tab non modifichi solo attributi senza cambiare i figli.
        // Ma childList e subtree dovrebbero coprire il rendering del contenuto del tab.
      });
      runPostRenderModifications(); // Esegui una prima volta all'inizializzazione
    }
  };

  customElements.whenDefined('odh-tourism-skiinfo').then(() => {
    setTimeout(initializeComponentModifications, 150);
  }).catch(error => { /* Gestione errore silenziata */ });
} else {
  /* Gestione errore silenziata */
}
