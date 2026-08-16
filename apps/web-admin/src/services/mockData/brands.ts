export interface Brand {
  id: string;
  name: string;
  countryOfOrigin: string;
  categoryIds: string[];
  skuCount: number;
}

export const brands: Brand[] = [
  { id: 'brand-amul', name: 'Amul', countryOfOrigin: 'India', categoryIds: ['cat-dairy'], skuCount: 38 },
  { id: 'brand-cadbury', name: 'Cadbury', countryOfOrigin: 'United Kingdom', categoryIds: ['cat-confectionery'], skuCount: 24 },
  { id: 'brand-nestle', name: 'Nestle', countryOfOrigin: 'Switzerland', categoryIds: ['cat-confectionery', 'cat-beverages'], skuCount: 31 },
  { id: 'brand-britannia', name: 'Britannia', countryOfOrigin: 'India', categoryIds: ['cat-bakery', 'cat-confectionery'], skuCount: 27 },
  { id: 'brand-cocacola', name: 'Coca-Cola', countryOfOrigin: 'United States', categoryIds: ['cat-beverages'], skuCount: 19 },
  { id: 'brand-haldirams', name: "Haldiram's", countryOfOrigin: 'India', categoryIds: ['cat-gourmet', 'cat-confectionery'], skuCount: 22 },
];

export const brandOptions = brands.map((b) => ({ value: b.id, label: b.name }));
