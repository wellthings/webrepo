// Homepage catalog. Images live in the public Supabase bucket "site_images":
//   partner/<folder>/<module id>.jpg   and   supplier/<category id>/<item id>.jpg
// Module entry: [id, label, searchQuery, optionalExplicitPathUnderPartner].
window.CATALOG = {
  base: 'https://lguwrsnjkrsbsmijbviu.supabase.co/storage/v1/object/public/site_images/',
  partner: [
    {
      id: 'carpenter',
      dbId: 1,
      name: 'Carpenter (Woodwork & Furniture)',
      hindi_name: 'कारपेंटर (लकड़ी व फर्नीचर का काम)',
      icon_name: 'hammer',
      icon: '🔨',
      keywords: ['carpenter', 'carpentry', 'wood', 'furniture', 'kitchen', 'wardrobe', 'door', 'cabinet', 'bed', 'mesh', 'jali', 'shelf'],
      repairing_services: [
        'Door lock, handle, tower bolt & stopper installation/repair',
        'Door alignment, hinges & hydraulic door closer fixing',
        'Drawer channel, slider & wardrobe shutter adjustment',
        'Modular kitchen soft-close hinge & basket channel repair',
        'Wooden bed, sofa, chair & dining table joint/leg repair',
        'Mosquito mesh (jali) door hinge & net replacement',
        'Wall shelf, TV bracket & curtain rod installation'
      ],
      modules: [
        ['modular-kitchen', 'Modular Kitchen', 'modular kitchen interior', 'carpentry/modular-kitchen'],
        ['wardrobe', 'Wardrobe', 'bedroom wardrobe built-in', 'carpentry/wardrobe'],
        ['tv-unit', 'TV Unit', 'tv unit wooden living room', 'carpentry/tv-unit'],
        ['bed-headboard', 'Bed & Headboard', 'wooden bed headboard bedroom', 'carpentry/bed-headboard'],
        ['study-table', 'Study Table', 'study desk wooden home office', 'carpentry/study-table'],
        ['shoe-rack', 'Shoe Rack', 'shoe rack cabinet entryway', 'carpentry/shoe-rack'],
        ['pooja-unit', 'Pooja Unit', 'wooden temple home mandir', 'carpentry/pooja-unit'],
        ['crockery-unit', 'Crockery Unit', 'crockery cabinet dining room', 'carpentry/crockery-unit']
      ]
    },
    {
      id: 'electrician',
      dbId: 2,
      name: 'Electrician (Electrical & Lighting)',
      hindi_name: 'इलेक्ट्रीशियन (इलेक्ट्रिकल व लाइटिंग)',
      icon_name: 'zap',
      icon: '⚡',
      keywords: ['electric', 'electrical', 'lighting', 'switch', 'socket', 'fan', 'chandelier', 'mcb', 'inverter', 'cctv', 'doorbell'],
      repairing_services: [
        'Switch, socket, dimmer & fan regulator replacement',
        'Ceiling fan, wall fan & exhaust fan installation/repair',
        'Tube light, LED panel, COB light & chandelier fitting',
        'MCB, fuse & main distribution box trip/short-circuit repair',
        'Inverter & battery wiring connection/check',
        'Doorbell, smart lock power & CCTV camera installation',
        'Geyser, AC & heavy appliance power point repair'
      ],
      modules: [
        ['house-wiring', 'House Wiring', 'electrician wiring house', 'electrical/house-wiring'],
        ['switch-board', 'Switch & Socket Board', 'electrical switch board socket', 'electrical/switch-board'],
        ['ceiling-fan', 'Ceiling Fan', 'ceiling fan room', 'electrical/ceiling-fan'],
        ['db-panel', 'MCB & DB Panel', 'electrical distribution board', 'electrical/db-panel'],
        ['chandelier', 'Chandelier', 'chandelier living room', 'lighting/chandelier'],
        ['led-strip', 'LED Panel & Strip', 'led strip lighting interior', 'lighting/led-strip'],
        ['spotlights', 'COB & Spotlights', 'recessed ceiling spotlights', 'lighting/spotlights'],
        ['cctv-camera', 'CCTV & Smart Lock Power', 'cctv security camera', 'security/cctv-camera']
      ]
    },
    {
      id: 'plumber',
      dbId: 3,
      name: 'Plumber (Sanitary & Water Fitting)',
      hindi_name: 'प्लम्बर (सैनिटरी व वाटर फिटिंग)',
      icon_name: 'droplet',
      icon: '🚿',
      keywords: ['plumb', 'sanitary', 'water', 'tap', 'mixer', 'sink', 'washbasin', 'toilet', 'flush', 'shower', 'tank', 'drain'],
      repairing_services: [
        'Leaking tap, wall mixer, diverter & valve repair/replacement',
        'Washbasin, kitchen sink & bathroom drain blockage clearing',
        'Toilet flush tank, jet spray (health faucet) & seat cover repair',
        'Overhead water tank float valve, ball cock & overflow fixing',
        'Shower head, soap dish & towel rod installation',
        'Washing machine, dishwasher & RO inlet/outlet pipe fitting',
        'Angle cock & flexible connection pipe replacement'
      ],
      modules: [
        ['kitchen-sink', 'Kitchen Sink & Mixer', 'kitchen sink faucet', 'plumbing/kitchen-sink'],
        ['wash-basin', 'Wash Basin', 'bathroom wash basin', 'plumbing/wash-basin'],
        ['bathroom-seat', 'Toilet & Flush Tank', 'toilet bathroom modern', 'plumbing/bathroom-seat'],
        ['shower-fitting', 'Shower & Bathroom Fitting', 'shower head bathroom', 'plumbing/shower-fitting'],
        ['water-pipes', 'Water Pipes & Tank Fitting', 'plumbing pipes fitting', 'plumbing/water-pipes']
      ]
    },
    {
      id: 'painter',
      dbId: 4,
      name: 'Painter & Polisher (Paint, Putty & Polish)',
      hindi_name: 'पेंटर व पॉलिशर (पेंट, पुट्टी व पॉलिश)',
      icon_name: 'paint-brush',
      icon: '🎨',
      keywords: ['paint', 'polish', 'putty', 'seelan', 'dampness', 'varnish', 'enamel', 'texture'],
      repairing_services: [
        'Wall dampness (seelan) & crack putty touch-up',
        'Single wall or single room repainting',
        'Peeling, bubbling & flaking paint repair',
        'Main door & wooden furniture polish/varnish touch-up',
        'Iron gate & window grill enamel paint touch-up'
      ],
      modules: [
        ['wall-painting', 'Wall Painting & Putty', 'painting interior wall roller', 'paint/wall-painting'],
        ['texture-paint', 'Texture Paint', 'wall texture paint design', 'paint/texture-paint'],
        ['wood-polish', 'Wood Polish & Varnish', 'wood polishing furniture', 'paint/wood-polish'],
        ['exterior-paint', 'Exterior & Gate Paint', 'house exterior painting', 'paint/exterior-paint']
      ]
    },
    {
      id: 'ceiling',
      dbId: 5,
      name: 'False Ceiling & POP',
      hindi_name: 'फॉल्स सीलिंग व पीओपी',
      icon_name: 'layers',
      icon: '🏠',
      keywords: ['ceiling', 'pop', 'gypsum', 'cornice', 'cove', 'grid'],
      repairing_services: [
        'Cracked, sagging or water-damaged POP/gypsum patch repair',
        'Ceiling light / fan cutout modification & resizing',
        'POP cornice & wall molding repair',
        'Loose ceiling grid/channel tightening'
      ],
      modules: [
        ['false-ceiling', 'Gypsum False Ceiling', 'false ceiling living room', 'ceiling/false-ceiling'],
        ['pop-design', 'POP Design & Cornice', 'ceiling design pop plaster', 'ceiling/pop-design'],
        ['wooden-ceiling', 'Wooden Ceiling', 'wooden ceiling interior', 'ceiling/wooden-ceiling'],
        ['cove-lighting', 'Cove Lighting Ceiling', 'cove lighting ceiling', 'ceiling/cove-lighting']
      ]
    },
    {
      id: 'tiles',
      dbId: 6,
      name: 'Tile, Marble & Granite Work',
      hindi_name: 'टाइल, मार्बल व ग्रेनाइट का काम',
      icon_name: 'grid',
      icon: '🏛️',
      keywords: ['tile', 'marble', 'granite', 'stone', 'grout', 'epoxy', 'skirting', 'countertop'],
      repairing_services: [
        'Broken, cracked or hollow floor/wall tile replacement',
        'Tile grouting, gap filling & white cement/epoxy work',
        'Bathroom floor slope & water logging correction',
        'Loose skirting tile re-fixing',
        'Kitchen granite countertop crack filling & edge polishing',
        'Kitchen sink / gas hob cutout modification'
      ],
      modules: [
        ['floor-tiles', 'Floor Tiles & Epoxy', 'floor tiles living room', 'tiles/floor-tiles'],
        ['wall-tiles', 'Wall Tiles', 'bathroom wall tiles', 'tiles/wall-tiles'],
        ['marble-flooring', 'Marble Flooring', 'marble floor interior', 'tiles/marble-flooring'],
        ['granite-counter', 'Granite Countertop', 'granite kitchen countertop', 'tiles/granite-counter'],
        ['kitchen-backsplash', 'Kitchen Backsplash', 'kitchen backsplash tiles', 'tiles/kitchen-backsplash']
      ]
    },
    {
      id: 'wooden-flooring',
      dbId: 7,
      name: 'Wooden Flooring',
      hindi_name: 'वुडन फ्लोरिंग',
      icon_name: 'layout-grid',
      icon: '🪵',
      keywords: ['wooden floor', 'flooring', 'plank', 'laminate', 'engineered wood', 'skirting', 't-molding'],
      repairing_services: [
        'Scratched, swollen or damaged wooden plank replacement',
        'Loose or squeaking floor plank locking/fixing',
        'Wooden floor skirting & transition strip (T-molding) repair',
        'Laminate/engineered wood gap filling & polishing'
      ],
      modules: [
        ['laminate-flooring', 'Laminate Wooden Flooring', 'wooden floor interior', 'carpentry/bed-headboard'],
        ['plank-flooring', 'Engineered Wood Planks', 'wooden floor living room', 'tiles/floor-tiles'],
        ['floor-skirting', 'Floor Skirting & Polishing', 'wooden flooring finish', 'paint/wood-polish']
      ]
    },
    {
      id: 'aluminium-upvc',
      dbId: 8,
      name: 'Aluminium & UPVC Work (Doors & Windows)',
      hindi_name: 'एल्युमिनियम व यूपीवीसी वर्क (दरवाजे व खिड़कियां)',
      icon_name: 'maximize',
      icon: '🪟',
      keywords: ['aluminium', 'upvc', 'sliding', 'window', 'door', 'roller', 'gasket', 'mosquito', 'mesh', 'jali'],
      repairing_services: [
        'Sliding window roller / wheel replacement',
        'Aluminium/UPVC door lock, handle & multi-point latch repair',
        'Window rubber gasket & wool pile replacement (sound/dust seal)',
        'Sliding track cleaning, straightening & alignment',
        'Mosquito mesh (jali) sliding shutter repair'
      ],
      modules: [
        ['upvc-window', 'UPVC Window', 'upvc window white house', 'upvc/upvc-window'],
        ['sliding-window', 'Sliding Aluminium Window', 'sliding window aluminium', 'upvc/sliding-window'],
        ['upvc-door', 'UPVC / Aluminium Door', 'upvc door', 'upvc/upvc-door'],
        ['balcony-door', 'Balcony Sliding Door', 'balcony sliding glass door', 'upvc/balcony-door'],
        ['mosquito-net', 'Mosquito Mesh Shutter', 'window mosquito screen', 'upvc/mosquito-net']
      ]
    },
    {
      id: 'glass',
      dbId: 9,
      name: 'Glass & Mirror Work',
      hindi_name: 'ग्लास व मिरर वर्क',
      icon_name: 'square',
      icon: '🪞',
      keywords: ['glass', 'mirror', 'toughened', 'partition', 'shower cabin', 'frosted', 'film', 'railing'],
      repairing_services: [
        'Broken window, door or partition glass replacement',
        'Bathroom LED / normal mirror installation',
        'Glass shelf & dining table top fitting',
        'Toughened glass door hydraulic floor spring & patch fitting repair',
        'Frosted / privacy & decorative glass film pasting'
      ],
      modules: [
        ['shower-cabin', 'Glass Shower Cabin', 'glass shower enclosure', 'glass/shower-cabin'],
        ['glass-partition', 'Glass Partition', 'glass partition office', 'glass/glass-partition'],
        ['glass-railing', 'Glass Railing', 'glass balustrade railing', 'glass/glass-railing'],
        ['wall-mirror', 'LED & Wall Mirror', 'large wall mirror interior', 'glass/wall-mirror'],
        ['glass-door', 'Toughened Glass Door', 'glass door interior', 'glass/glass-door']
      ]
    },
    {
      id: 'fabrication',
      dbId: 10,
      name: 'Iron & Steel Fabrication (Welding, Gate & Grill)',
      hindi_name: 'आयरन व स्टील फैब्रिकेशन (वेल्डिंग, गेट व ग्रिल)',
      icon_name: 'flame',
      icon: '🛠️',
      keywords: ['iron', 'steel', 'fabricat', 'weld', 'gate', 'grill', 'railing', 'ss', 'shed', 'tin', 'polycarbonate'],
      repairing_services: [
        'Main gate hinge, wheel, latch & lock welding repair',
        'Window safety grill & balcony railing joint welding',
        'Stainless steel (SS) stair railing tightening & buffing',
        'Tin / polycarbonate shade sheet patch & screw fixing'
      ],
      modules: [
        ['main-gate', 'Main Gate Fabrication', 'iron main gate house', 'welding/main-gate'],
        ['window-grill', 'Window Safety Grill', 'window grill iron design', 'welding/window-grill'],
        ['staircase-railing', 'SS Staircase Railing', 'staircase metal railing', 'welding/staircase-railing'],
        ['balcony-grill', 'Balcony Grill & Railing', 'balcony railing metal', 'welding/balcony-grill'],
        ['steel-furniture', 'Shade & Steel Work', 'metal furniture welded', 'welding/steel-furniture']
      ]
    },
    {
      id: 'upholstery',
      dbId: 11,
      name: 'Sofa, Curtain & Upholstery',
      hindi_name: 'सोफा, कर्टेन व अपहोल्स्ट्री',
      icon_name: 'home',
      icon: '🛋️',
      keywords: ['sofa', 'curtain', 'upholstery', 'cushion', 'foam', 'fabric', 'blinds', 'roller', 'zebra', 'chair'],
      repairing_services: [
        'Sofa cushion foam sagging & spring refilling',
        'Torn sofa fabric / leatherette patch or cover replacement',
        'Dining chair & office chair seat re-cushioning',
        'Curtain rod, channel track & bracket installation',
        'Roller / zebra blinds cord & mechanism repair'
      ],
      modules: [
        ['sofa-set', 'Sofa Set & Cushioning', 'sofa living room', 'sofa/sofa-set'],
        ['l-shaped-sofa', 'L-Shaped Sofa', 'l shaped sofa living room', 'sofa/l-shaped-sofa'],
        ['dining-chairs', 'Dining & Office Chairs', 'upholstered dining chairs', 'sofa/dining-chairs'],
        ['curtains', 'Curtains & Track', 'living room curtains', 'blinds/curtains'],
        ['roller-blinds', 'Roller & Zebra Blinds', 'roller blinds window', 'blinds/roller-blinds'],
        ['curtain-rod', 'Curtain Rod & Channel', 'curtain rod window', 'blinds/curtain-rod']
      ]
    },
    {
      id: 'wallpaper',
      dbId: 12,
      name: 'Wallpaper & Wall Paneling',
      hindi_name: 'वॉलपेपर व वॉल पैनलिंग',
      icon_name: 'palette',
      icon: '🖼️',
      keywords: ['wallpaper', 'panel', 'pvc', 'wpc', 'louver', 'molding', 'beading', 'accent'],
      repairing_services: [
        'Peeling wallpaper corner/joint pasting & patch repair',
        'Single accent wall wallpaper installation',
        'Damaged or loose PVC / WPC louver wall panel replacement',
        'Decorative wall molding / beading re-fixing'
      ],
      modules: [
        ['3d-wallpaper', '3D Wallpaper & Panels', 'textured wallpaper wall', 'wallpaper/3d-wallpaper'],
        ['accent-wall', 'Accent Wall Panelling', 'accent wall living room', 'wallpaper/accent-wall'],
        ['floral-wallpaper', 'Designer Wallpaper', 'floral wallpaper bedroom', 'wallpaper/floral-wallpaper'],
        ['kids-wallpaper', 'Kids Room Wallpaper', 'kids room wallpaper', 'wallpaper/kids-wallpaper']
      ]
    },
    {
      id: 'appliances',
      dbId: 13,
      name: 'AC & Appliances Installation/Repair',
      hindi_name: 'एसी व अप्लायंसेस इंस्टॉलेशन/रिपेयर',
      icon_name: 'wind',
      icon: '❄️',
      keywords: ['ac', 'appliance', 'split', 'window ac', 'geyser', 'chimney', 'ro', 'purifier', 'gas', 'service'],
      repairing_services: [
        'Split & window AC installation / uninstallation',
        'AC jet-pump foam service, filter cleaning & water leakage fix',
        'AC gas refilling & copper pipe leakage repair',
        'Geyser (water heater) installation, thermostat & coil repair',
        'Kitchen chimney installation, duct pipe & filter service',
        'RO water purifier installation & filter change'
      ],
      modules: [
        ['split-ac', 'Split AC Install & Service', 'split air conditioner bedroom', 'ac/split-ac'],
        ['ac-installation', 'Window & Split AC Setup', 'air conditioner installation technician', 'ac/ac-installation'],
        ['ac-service', 'AC Gas & Foam Service', 'air conditioner repair technician', 'ac/ac-service'],
        ['geyser', 'Geyser Install & Repair', 'water heater bathroom', 'electrical/geyser'],
        ['kitchen-chimney', 'Kitchen Chimney Service', 'kitchen chimney hood', 'chimney/kitchen-chimney'],
        ['tv-wall-mount', 'Appliance & TV Mounting', 'tv mounted on wall', 'chimney/tv-wall-mount']
      ]
    }
  ],
  supplier: [
    { id: 'plywood', name: 'Plywood & Timber', icon: '🌲', items: [
      ['plywood-sheets', 'Plywood Sheets', 'plywood sheets stack'],
      ['timber', 'Timber', 'timber planks stack wood']
    ] },
    { id: 'laminates', name: 'Laminates & Panels', icon: '🗂️', items: [
      ['laminate-sheets', 'Laminate Sheets', 'laminate sheets samples'],
      ['wall-panels', 'Wall Panels', 'wood wall panels']
    ] },
    { id: 'hardware', name: 'Hardware', icon: '🔩', items: [
      ['door-handles', 'Handles & Knobs', 'cabinet handles hardware'],
      ['hinges', 'Hinges & Channels', 'hinges hardware tools']
    ] },
    { id: 'electrical-supply', name: 'Electrical', icon: '🔌', items: [
      ['cables', 'Cables & Wires', 'electrical cables wire coil'],
      ['switches', 'Switches & Sockets', 'light switches sockets']
    ] },
    { id: 'lighting-supply', name: 'Lighting & LED', icon: '💡', items: [
      ['led-bulbs', 'LED Bulbs', 'led bulbs lighting'],
      ['decor-lights', 'Decorative Lights', 'decorative lights lamps']
    ] },
    { id: 'plumbing-supply', name: 'Plumbing', icon: '🚰', items: [
      ['pipes', 'Pipes & Fittings', 'pvc pipes fittings'],
      ['taps', 'Taps & Faucets', 'faucet tap chrome']
    ] },
    { id: 'bath-fittings', name: 'Bath Fittings', icon: '🛁', items: [
      ['sanitaryware', 'Sanitaryware', 'sanitaryware toilet basin'],
      ['shower-sets', 'Shower Sets', 'shower set rain head']
    ] },
    { id: 'cement', name: 'Cement & Bricks', icon: '🏗️', items: [
      ['cement', 'Cement', 'cement bags construction'],
      ['bricks', 'Bricks', 'red bricks stack']
    ] },
    { id: 'tiles-supply', name: 'Tiles & Stone', icon: '⬜', items: [
      ['tile-stack', 'Tiles', 'ceramic tiles stack showroom'],
      ['stone-slabs', 'Marble & Granite', 'marble granite slabs']
    ] },
    { id: 'paint-supply', name: 'Paint & Chemicals', icon: '🖌️', items: [
      ['paint-buckets', 'Paint Buckets', 'paint cans buckets'],
      ['paint-shades', 'Colour Shades', 'paint color swatches']
    ] },
    { id: 'glass-supply', name: 'Glass & Mirrors', icon: '🪞', items: [
      ['glass-sheets', 'Glass Sheets', 'glass sheets stack'],
      ['mirrors', 'Mirrors', 'decorative mirrors wall']
    ] },
    { id: 'aluminium', name: 'Aluminium & UPVC', icon: '🚪', items: [
      ['aluminium-profiles', 'Aluminium Profiles', 'aluminium profiles extrusion'],
      ['upvc-profiles', 'UPVC Profiles', 'upvc window frame profile']
    ] },
    { id: 'steel', name: 'Steel & Fabrication', icon: '⚙️', items: [
      ['steel-bars', 'Steel Bars', 'steel rebar bars'],
      ['steel-pipes', 'Steel Pipes', 'steel pipes tubes stack']
    ] },
    { id: 'foam', name: 'Foam & Fabric', icon: '🧶', items: [
      ['foam', 'Foam Sheets', 'foam sheets upholstery'],
      ['fabric-rolls', 'Fabric Rolls', 'upholstery fabric rolls']
    ] },
    { id: 'gypsum', name: 'Gypsum & POP', icon: '🏛️', items: [
      ['gypsum-boards', 'Gypsum Boards', 'gypsum board drywall'],
      ['pop-bags', 'POP & Putty', 'plaster of paris putty']
    ] },
    { id: 'appliances', name: 'Kitchen Appliances', icon: '🍳', items: [
      ['chimney-hob', 'Chimney & Hob', 'kitchen chimney hob appliances'],
      ['kitchen-appliances', 'Appliances', 'modern kitchen appliances']
    ] },
    { id: 'wallpaper-supply', name: 'Wallpaper & Panels', icon: '🖼️', items: [
      ['wallpaper-rolls', 'Wallpaper Rolls', 'wallpaper rolls samples'],
      ['pvc-panels', 'PVC Panels', 'pvc wall panels']
    ] },
    { id: 'blinds-supply', name: 'Blinds & Curtains', icon: '🧵', items: [
      ['curtain-fabric', 'Curtain Fabric', 'curtain fabric samples'],
      ['blind-samples', 'Blind Samples', 'window blinds samples']
    ] }
  ]
};
