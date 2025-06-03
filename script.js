  const odhElement = document.getElementById('mySkiInfo');
  let tabActionCompleted = false;
  let stylesInjected = false;
  let mainObserver = null;

  async function injectCustomStyles() { // La funzione ora è asincrona
    if (stylesInjected || !odhElement || !odhElement.shadowRoot) {
      return stylesInjected;
    }

    const cssUrl = 'https://raw.githubusercontent.com/peer-travel/hub/refs/heads/main/style.css';

    try {
      const response = await fetch(cssUrl);
      if (!response.ok) {
        console.error(`Failed to fetch custom styles from ${cssUrl}. Status: ${response.status}`);
        return false;
      }
      const cssText = await response.text();

      const styleSheet = document.createElement('style');
      styleSheet.textContent = cssText; // Applica gli stili caricati dal file estern

      odhElement.shadowRoot.appendChild(styleSheet);
      stylesInjected = true;
      console.log(`SUCCESS: Custom CSS from ${cssUrl} injected.`);
      return true;
    } catch (error) {
      console.error(`Error fetching or applying custom styles from ${cssUrl}:`, error);
      return false; // Indica che l'iniezione è fallita
    }
  }

  function selectLiftsTabInternal() {
    if (!odhElement || !odhElement.vueComponent) return false;

    const mainVueInstance = odhElement.vueComponent;
    const currentItem = mainVueInstance.displayedItem && mainVueInstance.displayedItem[0];

    if (mainVueInstance.mode === 'display' && currentItem && mainVueInstance.$children) {
      const itemDetailInstance = mainVueInstance.$children.find(
        child => child && typeof child.selectedMenu === 'string' && Array.isArray(child.menus)
      );

      if (itemDetailInstance) {
        const availableMenus = itemDetailInstance.menus || [];
        // Data l'attuale exclude-menus="Weather,Webcam", i tab possibili sono Info, Lifts, Slopes.
        // Se Info viene escluso in futuro, questa logica dovrà essere più flessibile
        // o l'utente dovrà garantire che 'Lifts' (o il tab desiderato) sia sempre disponibile.
        let targetTab = 'Lifts'; 
        
        // Verifica se il targetTab è effettivamente nella lista dei menu disponibili
        // dopo l'applicazione di exclude-menus
        if (!availableMenus.includes(targetTab)) {
            // Se Lifts non è disponibile, prova Info (che è il default del componente)
            if (availableMenus.includes('Info')) {
                targetTab = 'Info';
                console.warn(`"Lifts" tab not in available menus (${availableMenus.join(', ')}). Attempting "Info".`);
            } else if (availableMenus.length > 0) { // Se Info non c'è, prendi il primo disponibile
                targetTab = availableMenus[0];
                console.warn(`"Lifts" and "Info" tabs not in available menus. Attempting first available: "${targetTab}".`);
            } else {
                console.warn('No menus available to select after exclusions.');
                return true; // Considera l'azione completata perché non c'è nulla da fare
            }
        }
        
        if (itemDetailInstance.selectedMenu !== targetTab) {
          itemDetailInstance.selectedMenu = targetTab;
          itemDetailInstance.$forceUpdate();
          // console.log(`SUCCESS: Set selectedMenu to "${targetTab}".`);
        }
        return true;
      }
    }
    return false;
  }

  async function runPostRenderModifications() { // resa async per coerenza, anche se non strettamente necessario qui
    if (!tabActionCompleted) {
      tabActionCompleted = selectLiftsTabInternal();
    }

    // L'observer si disconnette una volta che l'azione sul tab è completata.
    // L'iniezione dello stile è un'azione una-tantum gestita all'inizio.
    if (tabActionCompleted && mainObserver) {
      mainObserver.disconnect();
      // console.log('Tab action completed, observer disconnected.');
    }
  }

  if (odhElement) {
    mainObserver = new MutationObserver(runPostRenderModifications);

    const initializeComponentModifications = async () => {
      if (odhElement.shadowRoot) {
        await injectCustomStyles(); // Attendi il tentativo di iniezione degli stili

        // Solo dopo che gli stili sono stati (tentati di essere) iniettati,
        // attacca l'observer e fai il primo run per i tab.
        mainObserver.observe(odhElement.shadowRoot, { childList: true, subtree: true });
        runPostRenderModifications(); 
      } else {
        // console.warn('ShadowRoot not found for odh-tourism-skiinfo.');
      }
    };

    customElements.whenDefined('odh-tourism-skiinfo').then(() => {
      setTimeout(initializeComponentModifications, 100); // Leggermente più lungo per fetch
    }).catch(error => {
      console.error('Error waiting for odh-tourism-skiinfo definition:', error);
    });
  } else {
    console.error('Element with ID "mySkiInfo" not found. Script will not run.');
  }
