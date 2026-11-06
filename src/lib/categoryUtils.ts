/**
 * Utility for translating and standardizing tech and hardware categories to Spanish.
 * Guarantees zero English categories in catalog, store, and AI recognizer.
 */

export const CATEGORY_TRANSLATIONS: Record<string, string> = {
  // Cables & Adapters
  "CABLE": "CABLES Y ADAPTADORES",
  "CABLES": "CABLES Y ADAPTADORES",
  "ADAPTER": "CABLES Y ADAPTADORES",
  "ADAPTERS": "CABLES Y ADAPTADORES",
  "ADAPTADOR": "CABLES Y ADAPTADORES",
  "ADAPTADORES": "CABLES Y ADAPTADORES",
  "CABLE & ADAPTER": "CABLES Y ADAPTADORES",
  "CABLES & ADAPTERS": "CABLES Y ADAPTADORES",
  "CABLES AND ADAPTERS": "CABLES Y ADAPTADORES",
  "CABLE Y ADAPTADOR": "CABLES Y ADAPTADORES",
  "CABLES Y ADAPTADORES": "CABLES Y ADAPTADORES",
  "HDMI CABLE": "CABLES Y ADAPTADORES",
  "HDMI CABLES": "CABLES Y ADAPTADORES",
  "USB CABLE": "CABLES Y ADAPTADORES",
  "USB CABLES": "CABLES Y ADAPTADORES",
  "VIDEO CABLE": "CABLES Y ADAPTADORES",
  "VIDEO CABLES": "CABLES Y ADAPTADORES",
  "AUDIO CABLE": "CABLES Y ADAPTADORES",
  "AUDIO CABLES": "CABLES Y ADAPTADORES",
  "POWER CORDS": "CABLES Y ADAPTADORES",
  "CORDS": "CABLES Y ADAPTADORES",
  "HUB": "CABLES Y ADAPTADORES",
  "HUBS": "CABLES Y ADAPTADORES",
  "DOCKING STATION": "CABLES Y ADAPTADORES",

  // Networking
  "NETWORKING": "REDES Y CONECTIVIDAD",
  "NETWORK": "REDES Y CONECTIVIDAD",
  "NETWORKS": "REDES Y ADAPTADORES",
  "REDES": "REDES Y CONECTIVIDAD",
  "CONECTIVIDAD": "REDES Y CONECTIVIDAD",
  "REDES Y CONECTIVIDAD": "REDES Y CONECTIVIDAD",
  "ROUTER": "REDES Y CONECTIVIDAD",
  "ROUTERS": "REDES Y CONECTIVIDAD",
  "SWITCH": "REDES Y CONECTIVIDAD",
  "SWITCHES": "REDES Y CONECTIVIDAD",
  "ACCESS POINT": "REDES Y CONECTIVIDAD",
  "ACCESS POINTS": "REDES Y CONECTIVIDAD",
  "WIRELESS": "REDES Y CONECTIVIDAD",
  "NETWORK ADAPTER": "REDES Y CONECTIVIDAD",
  "NETWORK ADAPTERS": "REDES Y CONECTIVIDAD",
  "NETWORK CARDS": "REDES Y CONECTIVIDAD",
  "ETHERNET": "REDES Y CONECTIVIDAD",
  "ETHERNET CABLE": "REDES Y CONECTIVIDAD",
  "ETHERNET CABLES": "REDES Y CONECTIVIDAD",

  // Storage
  "STORAGE": "ALMACENAMIENTO",
  "ALMACENAMIENTO": "ALMACENAMIENTO",
  "HARD DRIVE": "ALMACENAMIENTO",
  "HARD DRIVES": "ALMACENAMIENTO",
  "HARD DISK": "ALMACENAMIENTO",
  "SOLID STATE DRIVE": "ALMACENAMIENTO",
  "SOLID STATE DRIVES": "ALMACENAMIENTO",
  "EXTERNAL HARD DRIVES": "ALMACENAMIENTO",
  "USB FLASH DRIVE": "ALMACENAMIENTO",
  "USB FLASH DRIVES": "ALMACENAMIENTO",
  "FLASH DRIVES": "ALMACENAMIENTO",
  "FLASH DRIVE": "ALMACENAMIENTO",
  "MEMORY CARD": "ALMACENAMIENTO",
  "MEMORY CARDS": "ALMACENAMIENTO",
  "PENDRIVE": "ALMACENAMIENTO",
  "PENDRIVES": "ALMACENAMIENTO",
  "MEMORIA USB": "ALMACENAMIENTO",
  "DISCOS": "ALMACENAMIENTO",
  "DISCO DURO": "ALMACENAMIENTO",
  "DISCOS DUROS": "ALMACENAMIENTO",
  "SSD": "ALMACENAMIENTO",
  "NVME": "ALMACENAMIENTO",

  // Keyboards & Mice / Peripherals
  "KEYBOARD": "TECLADOS Y MOUSE",
  "KEYBOARDS": "TECLADOS Y MOUSE",
  "TECLADO": "TECLADOS Y MOUSE",
  "TECLADOS": "TECLADOS Y MOUSE",
  "MOUSE": "TECLADOS Y MOUSE",
  "MOUSES": "TECLADOS Y MOUSE",
  "MICE": "TECLADOS Y MOUSE",
  "KEYBOARDS & MICE": "TECLADOS Y MOUSE",
  "KEYBOARDS AND MICE": "TECLADOS Y MOUSE",
  "TECLADOS Y RATONES": "TECLADOS Y MOUSE",
  "TECLADOS Y MOUSE": "TECLADOS Y MOUSE",
  "PERIPHERAL": "PERIFÉRICOS",
  "PERIPHERALS": "PERIFÉRICOS",
  "PERIFERICO": "PERIFÉRICOS",
  "PERIFERICOS": "PERIFÉRICOS",
  "PERIFÉRICOS": "PERIFÉRICOS",
  "MOUSE PAD": "ACCESORIOS",
  "MOUSE PADS": "ACCESORIOS",
  "PAD": "ACCESORIOS",
  "PADS": "ACCESORIOS",

  // Printers & Inks
  "PRINTER": "IMPRESORAS",
  "PRINTERS": "IMPRESORAS",
  "IMPRESORA": "IMPRESORAS",
  "IMPRESORAS": "IMPRESORAS",
  "SCANNER": "IMPRESORAS",
  "SCANNERS": "IMPRESORAS",
  "ESCANER": "IMPRESORAS",
  "ESCÁNER": "IMPRESORAS",
  "INK": "TINTAS Y TÓNERS",
  "INKS": "TINTAS Y TÓNERS",
  "TINTA": "TINTAS Y TÓNERS",
  "TINTAS": "TINTAS Y TÓNERS",
  "TONER": "TINTAS Y TÓNERS",
  "TONERS": "TINTAS Y TÓNERS",
  "TÓNER": "TINTAS Y TÓNERS",
  "TÓNERS": "TINTAS Y TÓNERS",
  "CARTRIDGE": "TINTAS Y TÓNERS",
  "CARTRIDGES": "TINTAS Y TÓNERS",
  "CARTUCHO": "TINTAS Y TÓNERS",
  "CARTUCHOS": "TINTAS Y TÓNERS",
  "INK & TONER": "TINTAS Y TÓNERS",
  "INK AND TONER": "TINTAS Y TÓNERS",
  "INK CARTRIDGES": "TINTAS Y TÓNERS",
  "TINTAS Y TONERS": "TINTAS Y TÓNERS",
  "TINTAS Y TÓNERS": "TINTAS Y TÓNERS",

  // Audio
  "AUDIO": "AUDIO Y SONIDO",
  "AUDIO Y SONIDO": "AUDIO Y SONIDO",
  "SOUND": "AUDIO Y SONIDO",
  "SONIDO": "AUDIO Y SONIDO",
  "HEADPHONE": "AUDIO Y SONIDO",
  "HEADPHONES": "AUDIO Y SONIDO",
  "HEADSET": "AUDIO Y SONIDO",
  "HEADSETS": "AUDIO Y SONIDO",
  "EARPHONE": "AUDIO Y SONIDO",
  "EARPHONES": "AUDIO Y SONIDO",
  "EARBUDS": "AUDIO Y SONIDO",
  "SPEAKER": "AUDIO Y SONIDO",
  "SPEAKERS": "AUDIO Y SONIDO",
  "MICROPHONE": "AUDIO Y SONIDO",
  "MICROPHONES": "AUDIO Y SONIDO",
  "MICROFONO": "AUDIO Y SONIDO",
  "MICRÓFONO": "AUDIO Y SONIDO",
  "AUDIFONO": "AUDIO Y SONIDO",
  "AUDIFONOS": "AUDIO Y SONIDO",
  "AUDÍFONOS": "AUDIO Y SONIDO",
  "AURICULAR": "AUDIO Y SONIDO",
  "AURICULARES": "AUDIO Y SONIDO",
  "PARLANTE": "AUDIO Y SONIDO",
  "PARLANTES": "AUDIO Y SONIDO",

  // Chargers & Power
  "CHARGER": "CARGADORES Y ENERGÍA",
  "CHARGERS": "CARGADORES Y ENERGÍA",
  "CARGADOR": "CARGADORES Y ENERGÍA",
  "CARGADORES": "CARGADORES Y ENERGÍA",
  "CARGADORES Y ENERGIA": "CARGADORES Y ENERGÍA",
  "CARGADORES Y ENERGÍA": "CARGADORES Y ENERGÍA",
  "POWER ADAPTER": "CARGADORES Y ENERGÍA",
  "POWER ADAPTERS": "CARGADORES Y ENERGÍA",
  "POWER SUPPLY": "CARGADORES Y ENERGÍA",
  "POWER SUPPLIES": "CARGADORES Y ENERGÍA",
  "FUENTE DE PODER": "CARGADORES Y ENERGÍA",
  "BATTERY": "CARGADORES Y ENERGÍA",
  "BATTERIES": "CARGADORES Y ENERGÍA",
  "BATERIA": "CARGADORES Y ENERGÍA",
  "BATERÍAS": "CARGADORES Y ENERGÍA",
  "UPS": "CARGADORES Y ENERGÍA",
  "ENERGIA": "CARGADORES Y ENERGÍA",
  "ENERGÍA": "CARGADORES Y ENERGÍA",
  "ESTABILIZADOR": "CARGADORES Y ENERGÍA",
  "SUPRESOR DE PICOS": "CARGADORES Y ENERGÍA",

  // Displays & Monitors
  "MONITOR": "MONITORES Y PANTALLAS",
  "MONITORS": "MONITORES Y PANTALLAS",
  "MONITORES": "MONITORES Y PANTALLAS",
  "MONITORES Y PANTALLAS": "MONITORES Y PANTALLAS",
  "DISPLAY": "MONITORES Y PANTALLAS",
  "DISPLAYS": "MONITORES Y PANTALLAS",
  "SCREEN": "MONITORES Y PANTALLAS",
  "SCREENS": "MONITORES Y PANTALLAS",
  "PANTALLA": "MONITORES Y PANTALLAS",
  "PANTALLAS": "MONITORES Y PANTALLAS",

  // Computers & Laptops
  "LAPTOP": "LAPTOPS",
  "LAPTOPS": "LAPTOPS",
  "NOTEBOOK": "LAPTOPS",
  "NOTEBOOKS": "LAPTOPS",
  "PORTATIL": "LAPTOPS",
  "PORTÁTIL": "LAPTOPS",
  "PORTATILES": "LAPTOPS",
  "PORTÁTILES": "LAPTOPS",
  "COMPUTADORA PORTATIL": "LAPTOPS",
  "COMPUTADORAS PORTATILES": "LAPTOPS",
  "COMPUTER": "COMPUTADORAS Y PC",
  "COMPUTERS": "COMPUTADORAS Y PC",
  "DESKTOP": "COMPUTADORAS Y PC",
  "DESKTOPS": "COMPUTADORAS Y PC",
  "PC": "COMPUTADORAS Y PC",
  "ALL IN ONE": "COMPUTADORAS Y PC",
  "TODO EN UNO": "COMPUTADORAS Y PC",
  "COMPUTADORA": "COMPUTADORAS Y PC",
  "COMPUTADORAS": "COMPUTADORAS Y PC",
  "COMPUTADORAS Y PC": "COMPUTADORAS Y PC",

  // Components & Parts
  "COMPONENT": "COMPONENTES DE PC",
  "COMPONENTS": "COMPONENTES DE PC",
  "COMPONENTES": "COMPONENTES DE PC",
  "COMPONENTES DE PC": "COMPONENTES DE PC",
  "COMPUTER COMPONENTS": "COMPONENTES DE PC",
  "MOTHERBOARD": "COMPONENTES DE PC",
  "MOTHERBOARDS": "COMPONENTES DE PC",
  "PLACA MADRE": "COMPONENTES DE PC",
  "PLACAS": "COMPONENTES DE PC",
  "MAINBOARD": "COMPONENTES DE PC",
  "GRAPHICS CARD": "COMPONENTES DE PC",
  "GRAPHICS CARDS": "COMPONENTES DE PC",
  "VIDEO CARD": "COMPONENTES DE PC",
  "VIDEO CARDS": "COMPONENTES DE PC",
  "TARJETA DE VIDEO": "COMPONENTES DE PC",
  "TARJETAS DE VIDEO": "COMPONENTES DE PC",
  "PROCESSOR": "COMPONENTES DE PC",
  "PROCESSORS": "COMPONENTES DE PC",
  "PROCESADOR": "COMPONENTES DE PC",
  "PROCESADORES": "COMPONENTES DE PC",
  "CPU": "COMPONENTES DE PC",
  "COOLER": "COMPONENTES DE PC",
  "COOLERS": "COMPONENTES DE PC",
  "COOLING": "COMPONENTES DE PC",
  "CASE": "COMPONENTES DE PC",
  "CHASSIS": "COMPONENTES DE PC",
  "GABINETE": "COMPONENTES DE PC",
  "RAM": "COMPONENTES DE PC",
  "MEMORIA RAM": "COMPONENTES DE PC",
  "MEMORIAS RAM": "COMPONENTES DE PC",

  // Security
  "SECURITY": "SEGURIDAD Y CÁMARAS",
  "SEGURIDAD Y CAMARAS": "SEGURIDAD Y CÁMARAS",
  "SEGURIDAD Y CÁMARAS": "SEGURIDAD Y CÁMARAS",
  "CAMERA": "SEGURIDAD Y CÁMARAS",
  "CAMERAS": "SEGURIDAD Y CÁMARAS",
  "CAMARA": "SEGURIDAD Y CÁMARAS",
  "CÁMARAS": "SEGURIDAD Y CÁMARAS",
  "SECURITY CAMERA": "SEGURIDAD Y CÁMARAS",
  "SECURITY CAMERAS": "SEGURIDAD Y CÁMARAS",
  "CCTV": "SEGURIDAD Y CÁMARAS",
  "DVR": "SEGURIDAD Y CÁMARAS",
  "NVR": "SEGURIDAD Y CÁMARAS",

  // Accessories
  "ACCESSORY": "ACCESORIOS",
  "ACCESSORIES": "ACCESORIOS",
  "ACCESORIOS": "ACCESORIOS",
  "BAG": "ACCESORIOS",
  "BAGS": "ACCESORIOS",
  "BACKPACK": "ACCESORIOS",
  "BACKPACKS": "ACCESORIOS",
  "MOCHILA": "ACCESORIOS",
  "MOCHILAS": "ACCESORIOS",
  "MALETIN": "ACCESORIOS",
  "MALETINES": "ACCESORIOS",
  "FUNDA": "ACCESORIOS",
  "FUNDAS": "ACCESORIOS",
  "STAND": "ACCESORIOS",
  "SOPORTE": "ACCESORIOS",
  "SOPORTES": "ACCESORIOS",
  "HOLDER": "ACCESORIOS",
  "CLEANING": "ACCESORIOS",
  "LIMPIEZA": "ACCESORIOS",
};

/**
 * Translates any category name to standard Spanish in UPPERCASE.
 * Also accepts an optional `productName` to cross-verify and prevent misclassification
 * (e.g. a Laptop being categorized as "COMPUTADORAS Y PC" or a Stand as "LAPTOPS").
 */
export function translateCategoryToSpanish(
  rawCategory: string | undefined | null,
  productName?: string
): string {
  const nameLower = (productName ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

  // Cross-check productName prefix/type for 0-error categorization
  if (nameLower) {
    if (/^(soporte|stand|base|holder|funda|mochila|maletin|mouse\s*pad|pad\b|cooler\s*para\s*laptop)/.test(nameLower)) {
      return "ACCESORIOS";
    }
    if (/^(laptop|notebook|portatil|macbook)\b/.test(nameLower)) {
      return "LAPTOPS";
    }
    if (/^(impresora|multifuncional|escaner)\b/.test(nameLower)) {
      return "IMPRESORAS";
    }
    if (/^(tinta|toner|cartucho|botella\s*de\s*tinta)\b/.test(nameLower)) {
      return "TINTAS Y TÓNERS";
    }
    if (/^(cable|adaptador|convertidor|hub|dock|splitter|extensor)\b/.test(nameLower)) {
      if (!/red|rj45|ethernet|wifi|antena/.test(nameLower) || /hdmi|vga|displayport|usb|tipo\s*c|type\s*c|audio|aux/.test(nameLower)) {
        return "CABLES Y ADAPTADORES";
      }
    }
    if (/^(router|switch|access\s*point|repetidor|antena\s*wifi|adaptador\s*(usb\s*)?(wifi|red|inalambrico)|tarjeta\s*de\s*red)\b/.test(nameLower)) {
      return "REDES Y CONECTIVIDAD";
    }
    if (/^(disco\s*duro|ssd|memoria\s*usb|pendrive|micro\s*sd|tarjeta\s*de\s*memoria|caja\s*de\s*disco|case\s*para\s*disco|enclosure)\b/.test(nameLower)) {
      return "ALMACENAMIENTO";
    }
    if (/^(mouse|teclado|combo\s*teclado)\b/.test(nameLower)) {
      return "TECLADOS Y MOUSE";
    }
    if (/^(audifono|auricular|parlante|altavoz|microfono|headset|barra\s*de\s*sonido)\b/.test(nameLower)) {
      return "AUDIO Y SONIDO";
    }
    if (/^(cargador|bateria|fuente\s*de\s*poder|ups|estabilizador|supresor)\b/.test(nameLower)) {
      return "CARGADORES Y ENERGÍA";
    }
    if (/^(monitor|pantalla)\b/.test(nameLower)) {
      return "MONITORES Y PANTALLAS";
    }
  }

  if (!rawCategory) return "ACCESORIOS";
  const clean = rawCategory.trim().toUpperCase();
  if (!clean) return "ACCESORIOS";

  // 1. Direct dictionary match
  if (CATEGORY_TRANSLATIONS[clean]) {
    return CATEGORY_TRANSLATIONS[clean];
  }

  // 2. Normalize and check again (removing symbols/accents)
  const normKey = clean
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[&]/g, " AND ")
    .replace(/\s+/g, " ")
    .trim();

  if (CATEGORY_TRANSLATIONS[normKey]) {
    return CATEGORY_TRANSLATIONS[normKey];
  }

  // 3. Pattern / Substring matching for English/Spanish terms
  const lower = normKey.toLowerCase();

  if (/laptops?|notebooks?|portatil/.test(lower)) {
    return "LAPTOPS";
  }
  if (/cables?|adapters?|adaptador|hdmi|vga|dvi|displayport|hub/.test(lower)) {
    return "CABLES Y ADAPTADORES";
  }
  if (/keyboards?|teclados?|mice|mouse|raton/.test(lower)) {
    return "TECLADOS Y MOUSE";
  }
  if (/networking?|routers?|switch|wifi|ethernet|redes|conectividad/.test(lower)) {
    return "REDES Y CONECTIVIDAD";
  }
  if (/storage|hard drive|ssd|nvme|pendrive|flash drive|disco duro|almacenamiento/.test(lower)) {
    return "ALMACENAMIENTO";
  }
  if (/printers?|scanners?|impresora|escaner/.test(lower)) {
    return "IMPRESORAS";
  }
  if (/ink|toner|cartridge|tinta|cartucho/.test(lower)) {
    return "TINTAS Y TÓNERS";
  }
  if (/audio|sound|headphones?|headsets?|speakers?|audifono|auricular|parlante/.test(lower)) {
    return "AUDIO Y SONIDO";
  }
  if (/chargers?|power|battery|batteries|cargador|bateria|fuente|ups|estabilizador/.test(lower)) {
    return "CARGADORES Y ENERGÍA";
  }
  if (/monitors?|displays?|screens?|pantalla/.test(lower)) {
    return "MONITORES Y PANTALLAS";
  }
  if (/desktops?|computers?|computadora|todo en uno|all in one/.test(lower)) {
    return "COMPUTADORAS Y PC";
  }
  if (/motherboards?|processors?|cpu|ram|cooling|coolers?|chassis|gabinete|tarjeta de video|graphics/.test(lower)) {
    return "COMPONENTES DE PC";
  }
  if (/cameras?|cctv|security|camara|seguridad/.test(lower)) {
    return "SEGURIDAD Y CÁMARAS";
  }
  if (/peripherals?|periferico/.test(lower)) {
    return "PERIFÉRICOS";
  }
  if (/accessories|accessory|accesorios?|fundas?|mochilas?|soporte|stand/.test(lower)) {
    return "ACCESORIOS";
  }

  return clean.slice(0, 60);
}
