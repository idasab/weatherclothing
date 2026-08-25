/**
 * Namnen på plaggikonerna. Ligger i kärnan så klädlogiken kan namnge en ikon
 * utan att bero på komponenten som ritar den, och så att kompilatorn fångar
 * felstavningar. Formerna finns i components/garment-icon.component.ts.
 */
export type GarmentIconName =
  | 't-shirt'
  | 'long-sleeve'
  | 'tank-top'
  | 'knit'
  | 'hoodie'
  | 'cardigan'
  | 'jacket'
  | 'winter-jacket'
  | 'hooded-jacket'
  | 'base-layer'
  | 'trousers'
  | 'shorts'
  | 'socks'
  | 'shoes'
  | 'boots'
  | 'sandals'
  | 'beanie'
  | 'mittens'
  | 'scarf'
  | 'sun-hat'
  | 'sunglasses'
  | 'sunscreen'
  | 'bottle'
  | 'umbrella';
