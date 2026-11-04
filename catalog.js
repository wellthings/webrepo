// Homepage catalog. Images live in the public Supabase bucket "site_images":
//   partner/<category id>/<module id>.jpg   and   supplier/<category id>/<item id>.jpg
// Each entry is [id, label, image search query].
window.CATALOG = {
  base: 'https://lguwrsnjkrsbsmijbviu.supabase.co/storage/v1/object/public/site_images/',
  partner: [
    { id: 'carpentry', name: 'Carpentry', icon: '🔨', modules: [
      ['modular-kitchen', 'Modular Kitchen', 'modular kitchen interior'],
      ['wardrobe', 'Wardrobe', 'bedroom wardrobe built-in'],
      ['tv-unit', 'TV Unit', 'tv unit wooden living room'],
      ['bed-headboard', 'Bed & Headboard', 'wooden bed headboard bedroom'],
      ['study-table', 'Study Table', 'study desk wooden home office'],
      ['shoe-rack', 'Shoe Rack', 'shoe rack cabinet entryway'],
      ['pooja-unit', 'Pooja Unit', 'wooden temple home mandir'],
      ['crockery-unit', 'Crockery Unit', 'crockery cabinet dining room']
    ] },
    { id: 'sofa', name: 'Sofa & Upholstery', icon: '🛋️', modules: [
      ['sofa-set', 'Sofa Set', 'sofa living room'],
      ['l-shaped-sofa', 'L-Shaped Sofa', 'l shaped sofa living room'],
      ['recliner-chair', 'Recliner Chair', 'recliner armchair'],
      ['upholstered-headboard', 'Upholstered Headboard', 'upholstered headboard bed'],
      ['dining-chairs', 'Dining Chairs', 'upholstered dining chairs']
    ] },
    { id: 'welding', name: 'Welding & MS', icon: '🛠️', modules: [
      ['main-gate', 'Main Gate', 'iron main gate house'],
      ['window-grill', 'Window Grill', 'window grill iron design'],
      ['staircase-railing', 'Staircase Railing', 'staircase metal railing'],
      ['balcony-grill', 'Balcony Grill', 'balcony railing metal'],
      ['steel-furniture', 'Steel Furniture', 'metal furniture welded']
    ] },
    { id: 'upvc', name: 'UPVC & Windows', icon: '🚪', modules: [
      ['upvc-window', 'UPVC Window', 'upvc window white house'],
      ['sliding-window', 'Sliding Window', 'sliding window aluminium'],
      ['upvc-door', 'UPVC Door', 'upvc door'],
      ['balcony-door', 'Balcony Door', 'balcony sliding glass door'],
      ['mosquito-net', 'Mosquito Net', 'window mosquito screen']
    ] },
    { id: 'civil', name: 'Civil & Masonry', icon: '🧱', modules: [
      ['brick-wall', 'Brick Wall', 'brick wall construction mason'],
      ['plastering', 'Plastering', 'wall plastering worker'],
      ['waterproofing', 'Waterproofing', 'terrace waterproofing coating'],
      ['room-renovation', 'Room Renovation', 'home renovation construction']
    ] },
    { id: 'tiles', name: 'Tiles & Stone', icon: '🏛️', modules: [
      ['floor-tiles', 'Floor Tiles', 'floor tiles living room'],
      ['wall-tiles', 'Wall Tiles', 'bathroom wall tiles'],
      ['marble-flooring', 'Marble Flooring', 'marble floor interior'],
      ['granite-counter', 'Granite Counter', 'granite kitchen countertop'],
      ['kitchen-backsplash', 'Kitchen Backsplash', 'kitchen backsplash tiles']
    ] },
    { id: 'plumbing', name: 'Plumbing', icon: '🚿', modules: [
      ['kitchen-sink', 'Kitchen Sink', 'kitchen sink faucet'],
      ['wash-basin', 'Wash Basin', 'bathroom wash basin'],
      ['bathroom-seat', 'Bathroom Seat', 'toilet bathroom modern'],
      ['shower-fitting', 'Shower Fitting', 'shower head bathroom'],
      ['water-pipes', 'Water Pipes', 'plumbing pipes fitting']
    ] },
    { id: 'electrical', name: 'Electrical', icon: '⚡', modules: [
      ['house-wiring', 'House Wiring', 'electrician wiring house'],
      ['switch-board', 'Switch Board', 'electrical switch board socket'],
      ['ceiling-fan', 'Ceiling Fan', 'ceiling fan room'],
      ['db-panel', 'DB Panel', 'electrical distribution board'],
      ['geyser', 'Geyser', 'water heater bathroom']
    ] },
    { id: 'lighting', name: 'Lighting', icon: '💡', modules: [
      ['chandelier', 'Chandelier', 'chandelier living room'],
      ['led-strip', 'LED Strip Light', 'led strip lighting interior'],
      ['spotlights', 'Spotlights', 'recessed ceiling spotlights'],
      ['wall-lamp', 'Wall Lamp', 'wall lamp bedroom'],
      ['pendant-light', 'Pendant Light', 'pendant lights kitchen']
    ] },
    { id: 'ceiling', name: 'Ceiling & POP', icon: '🏠', modules: [
      ['false-ceiling', 'False Ceiling', 'false ceiling living room'],
      ['pop-design', 'POP Design', 'ceiling design pop plaster'],
      ['wooden-ceiling', 'Wooden Ceiling', 'wooden ceiling interior'],
      ['cove-lighting', 'Cove Lighting', 'cove lighting ceiling']
    ] },
    { id: 'paint', name: 'Paint & Polish', icon: '🎨', modules: [
      ['wall-painting', 'Wall Painting', 'painting interior wall roller'],
      ['texture-paint', 'Texture Paint', 'wall texture paint design'],
      ['wood-polish', 'Wood Polish', 'wood polishing furniture'],
      ['exterior-paint', 'Exterior Paint', 'house exterior painting']
    ] },
    { id: 'glass', name: 'Glass & Shower', icon: '🪞', modules: [
      ['shower-cabin', 'Shower Cabin', 'glass shower enclosure'],
      ['glass-partition', 'Glass Partition', 'glass partition office'],
      ['glass-railing', 'Glass Railing', 'glass balustrade railing'],
      ['wall-mirror', 'Wall Mirror', 'large wall mirror interior'],
      ['glass-door', 'Glass Door', 'glass door interior']
    ] },
    { id: 'ac', name: 'AC & HVAC', icon: '❄️', modules: [
      ['split-ac', 'Split AC', 'split air conditioner bedroom'],
      ['ac-installation', 'AC Installation', 'air conditioner installation technician'],
      ['ac-service', 'AC Service', 'air conditioner repair technician']
    ] },
    { id: 'security', name: 'Home Security', icon: '📹', modules: [
      ['cctv-camera', 'CCTV Camera', 'cctv security camera'],
      ['video-door-phone', 'Video Door Phone', 'video doorbell intercom'],
      ['smart-lock', 'Smart Door Lock', 'smart door lock'],
      ['alarm-system', 'Alarm System', 'home alarm system keypad']
    ] },
    { id: 'wallpaper', name: 'Wallpaper', icon: '🖼️', modules: [
      ['floral-wallpaper', 'Floral Wallpaper', 'floral wallpaper bedroom'],
      ['3d-wallpaper', '3D Wallpaper', 'textured wallpaper wall'],
      ['kids-wallpaper', 'Kids Room Wallpaper', 'kids room wallpaper'],
      ['accent-wall', 'Accent Wall', 'accent wall living room']
    ] },
    { id: 'chimney', name: 'Chimney & TV', icon: '📺', modules: [
      ['kitchen-chimney', 'Kitchen Chimney', 'kitchen chimney hood'],
      ['tv-wall-mount', 'TV Wall Mount', 'tv mounted on wall'],
      ['home-theatre', 'Home Theatre', 'home theater room speakers'],
      ['kitchen-hob', 'Hob & Cooktop', 'gas hob kitchen']
    ] },
    { id: 'blinds', name: 'Blinds & Curtains', icon: '🧵', modules: [
      ['roller-blinds', 'Roller Blinds', 'roller blinds window'],
      ['curtains', 'Curtains', 'living room curtains'],
      ['zebra-blinds', 'Zebra Blinds', 'zebra blinds window'],
      ['curtain-rod', 'Curtain Track & Rod', 'curtain rod window']
    ] }
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
