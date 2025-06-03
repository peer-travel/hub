
const odhElement = document.getElementById('mySkiInfo');
let initialTabSet = false; // Modificato da tabActionCompleted per maggiore chiarezza
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
  // Selettore per i div "riga informativa". Deve essere preciso.
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
      'it': 'Web:', // Verifica questa etichetta per l'italiano
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

function setInitialTargetTab() { // Rinominata per chiarezza del suo scopo
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
      return true;
    }
  }
  return false;
}

// Callback per il MutationObserver
async function handleDOMChanges() {
  // Imposta il tab di default solo la prima volta che questa callback viene eseguita con successo
  if (!initialTabSet) {
    initialTabSet = setInitialTargetTab();
  }

  // Controlla sempre se il tab "Info" è quello attualmente attivo nel componente
  // e applica la logica di nascondiglio se necessario.
  if (odhElement && odhElement.vueComponent) {
    const mainVueInstance = odhElement.vueComponent;
    if (mainVueInstance.$children) {
      const itemDetailInstance = mainVueInstance.$children.find(
        child => child && typeof child.selectedMenu === 'string'
      );
      // Se itemDetailInstance esiste E il suo tab selezionato è "Info"
      if (itemDetailInstance && itemDetailInstance.selectedMenu === 'Info') {
        hideSpecificInfoRows();
      }
    }
  }
  // L'observer non viene disconnesso, così questa funzione viene chiamata
  // ad ogni mutazione rilevante (es. cambio di tab che ri-renderizza il contenuto).
}

if (odhElement) {
  mainObserver = new MutationObserver(handleDOMChanges);

  const initializeComponentAndObserver = async () => {
    if (odhElement.shadowRoot) {
      await injectCustomStyles(); // Inietta gli stili generali una volta
      
      mainObserver.observe(odhElement.shadowRoot, {
        childList: true,  // Osserva aggiunte/rimozioni di nodi figli
        subtree: true     // Osserva anche i discendenti
        // attributes: true // Potrebbe essere utile se il cambio tab modifica solo attributi
                           // ma per ora childList e subtree dovrebbero bastare
      });
      handleDOMChanges(); // Esegui una prima volta per l'impostazione iniziale del tab e il nascondiglio
    }
  };

  customElements.whenDefined('odh-tourism-skiinfo').then(() => {
    setTimeout(initializeComponentAndObserver, 200); // Timeout leggermente aumentato per il fetch CSS
  }).catch(error => { /* Gestione errore silenziata */ });
} else {
  /* Gestione errore silenziata */
}
