// Contenuto per https://raw.githubusercontent.com/peer-travel/hub/main/script.js

const odhElement = document.getElementById('mySkiInfo');
let tabActionCompleted = false;
let stylesInjected = false;
let infoRowsProcessed = false; // Nuovo flag per tracciare se le righe info sono state elaborate
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
    
    // Inserisci qui SOLO gli stili che NON dipendono dal contenuto specifico dei figli,
    // come quelli per l'header, layout colonne, opendatahubid, ecc.
    // Le regole per nascondere i div basati su :nth-child() vanno rimosse da qui.
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
  
  // Selettore per i div "riga informativa" nel tab Info.
  // Basato sull'HTML fornito: <div class="col-12 col-lg-4 d-flex align-items-center gap-2">
  // Questo selettore deve essere abbastanza specifico per il contesto del tab Info.
  // Assumiamo che questi div siano figli diretti di un .row dentro il contenitore del tab Info.
  // Il contenitore del contenuto del tab "Info" è: .flex-grow-1[class*="p-"] > .d-flex.flex-column.gap-4
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
  // Non impostiamo un flag globale "completato" qui, perché l'observer potrebbe
  // chiamare questa funzione più volte mentre il DOM si assesta.
  // Il fatto che non nasconda più nulla nelle passate successive è sufficiente.
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
      // Con exclude-menus="Weather,Webcam", i tab rimanenti dovrebbero essere Info, Lifts, Slopes
      let targetTab = 'Lifts'; 

      if (!availableMenus.includes(targetTab)) {
        if (availableMenus.includes('Info')) {
            targetTab = 'Info';
        } else if (availableMenus.includes('Slopes')) { // Altra opzione valida
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
      // Nascondi gli elementi specifici *dopo* che il tab è stato selezionato e potenzialmente renderizzato
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
    tabActionCompleted = selectTargetTab(); // Questo ora chiama anche hideDivsContainingSpecificSVGs internamente se il tab è Info
  }
  
  // Se la selezione del tab è andata a buon fine, potremmo voler chiamare di nuovo hideDivs
  // nel caso il contenuto del tab sia stato appena renderizzato.
  // L'observer si occuperà di ulteriori chiamate se il DOM cambia ancora.
  if(tabActionCompleted) {
    hideDivsContainingSpecificSVGs(); // Chiamata aggiuntiva per sicurezza dopo il cambio tab
  }

  // Per ora, disconnettiamo l'observer solo dopo che il tab è stato gestito la prima volta.
  // Il nascondiglio degli SVG avverrà più volte se necessario, ma non dovrebbe causare problemi.
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
      mainObserver.observe(odhElement.shadowRoot, { childList: true, subtree: true, attributes: true }); // Aggiunto attributes per più trigger
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
