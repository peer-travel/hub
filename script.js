  const odhElement = document.getElementById('mySkiInfo');
  let tabActionCompleted = false;
  let bannerStyleInjected = false;
  let mainObserver = null;

  function injectHideBannerStyle() {
    if (bannerStyleInjected || !odhElement || !odhElement.shadowRoot) {
      return bannerStyleInjected;
    }

    const styleSheet = document.createElement('style');
    styleSheet.textContent = `
      body, html, .fs-5, .fw-bold {font-size: .95rem !important;}
      div.d-flex.flex-column.shadow-sm > div[style*="background-image"].flex-shrink-0.d-flex {
        background-image: none !important;
        height: 80px !important;
      }
      span.p-1 { display: none !important; }
      .opendatahubid { display: none !important; }
      h1.mb-0 { display: none !important; }
      div.flex-grow-1 { padding: 0 !important; }
      div.shadow-sm { box-shadow: none !important; min-height: auto !important; }
      div.mx-2 { margin-left: 0 !important; margin-right: 0 !important; }
      div.px-2, div.p-2 { padding-left: 0 !important; padding-right: 0 !important; }
      .h-100 > div:nth-child(1) > div:nth-child(3), div.mb-0  { display: none !important; }
      .flex-grow-1.p-4 .row > div[class*="col-"] {
        flex: 0 0 100% !important;
        max-width: 100% !important;
        width: 100% !important;
      }
      @media (min-width: 768px) {
        .flex-grow-1.p-4 .row > div[class*="col-"] {
          flex: 0 0 50% !important;
          max-width: 50% !important;
          width: 50% !important;
        }
      }
      @media (min-width: 992px) {
        .flex-grow-1.p-4 .row > div[class*="col-"] {
          flex: 0 0 100% !important;
          max-width: 100% !important;
          width: 100% !important;
        }
      }
    `;
    odhElement.shadowRoot.appendChild(styleSheet);
    bannerStyleInjected = true;
    /*console.log('SUCCESS: CSS rule to hide banner (based on parent and background-image) has been injected.');*/
    return true;
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
        if (!availableMenus.includes('Lifts')) {
          /*console.warn('"Lifts" tab is not available.');*/
          return true; 
        }

        if (itemDetailInstance.selectedMenu !== 'Lifts') {
          itemDetailInstance.selectedMenu = 'Lifts';
          itemDetailInstance.$forceUpdate();
          /*console.log('SUCCESS: Set selectedMenu to "Lifts".');*/
        }
        return true;
      }
    }
    return false;
  }

  function runPostRenderModifications() {
    if (!tabActionCompleted) {
      tabActionCompleted = selectLiftsTabInternal();
    }

    if (tabActionCompleted && mainObserver) {
      mainObserver.disconnect();
      /*console.log('Tab action completed, observer disconnected.');*/
    }
  }

  if (odhElement) {
    mainObserver = new MutationObserver(runPostRenderModifications);

    const initializeComponentModifications = () => {
      if (odhElement.shadowRoot) {
        injectHideBannerStyle();
        mainObserver.observe(odhElement.shadowRoot, { childList: true, subtree: true });
        runPostRenderModifications();
      } else {
        /*console.warn('ShadowRoot not found for odh-tourism-skiinfo.');*/
      }
    };

    customElements.whenDefined('odh-tourism-skiinfo').then(() => {
      setTimeout(initializeComponentModifications, 50); 
    }).catch(error => {
      console.error('Error waiting for odh-tourism-skiinfo definition:', error);
    });
  } else {
    console.error('Element with ID "mySkiInfo" not found. Script will not run.');
  }
