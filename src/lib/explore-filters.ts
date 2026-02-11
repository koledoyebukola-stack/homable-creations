/** Room type filter for Explore. Values match explore_scenes.room_type. */
export type ExploreRoomTypeFilter = 'all' | 'living_room' | 'bedroom' | 'dining' | 'office';

export const EXPLORE_CATEGORY_PILLS: { value: ExploreRoomTypeFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'living_room', label: 'Living Room' },
  { value: 'bedroom', label: 'Bedroom' },
  { value: 'dining', label: 'Dining' },
  { value: 'office', label: 'Home Office' },
];

/** Price filter by catalog_budget_ngn (Nigerian Naira). */
export type ExplorePriceFilter =
  | 'all'
  | 'under_300'
  | '300_500'
  | '500_1000'
  | '1000_plus';

export const EXPLORE_PRICE_PILLS: { value: ExplorePriceFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'under_300', label: 'Under ₦300k' },
  { value: '300_500', label: '₦300k – ₦500k' },
  { value: '500_1000', label: '₦500k – ₦1M' },
  { value: '1000_plus', label: '₦1M+' },
];

export function matchesExplorePriceFilter(catalogBudgetNgn: number, filter: ExplorePriceFilter): boolean {
  const n = Number(catalogBudgetNgn) || 0;
  switch (filter) {
    case 'all':
      return true;
    case 'under_300':
      return n < 300_000;
    case '300_500':
      return n >= 300_000 && n <= 500_000;
    case '500_1000':
      return n > 500_000 && n <= 1_000_000;
    case '1000_plus':
      return n > 1_000_000;
    default:
      return true;
  }
}
