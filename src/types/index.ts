export interface User {
  id: string;
  email: string;
  display_name: string | null;
  avatar_id: string;
  avatar_image_key: string | null;
  default_servings: number;
  is_public: boolean;
  country: string | null;
  gender: string | null;
  age_bracket: string | null;
  unit_system: 'metric' | 'imperial';
  created_at: number;
}

export interface Ingredient {
  amount: string;
  unit: string;
  name: string;
}

export interface Recipe {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  servings: number | null;
  prep_time: number | null;
  cook_time: number | null;
  ingredients: Ingredient[];
  steps: string[];
  tags: string[];
  source_guess: string | null;
  hero_image_key: string | null;
  screenshot_keys: string[];
  is_favourite: boolean;
  is_deleted: boolean;
  needs_attention: boolean;
  share_token: string | null;
  calories_per_serving: number | null;
  cost_per_serving: number | null;
  cost_currency: string;
  created_at: number;
  updated_at: number;
  // Populated on public/search views
  author_name?: string | null;
  author_avatar?: string;
  author_avatar_key?: string | null;
  avg_rating?: number;
  rating_count?: number;
  my_rating?: number | null;
}

export interface Collection {
  id: string;
  user_id: string;
  name: string;
  created_at: number;
}

export interface ExtractedRecipe {
  title: string;
  description: string;
  servings: number | null;
  prep_time: number | null;
  cook_time: number | null;
  ingredients: Ingredient[];
  steps: string[];
  tags: string[];
  source_guess: string | null;
  source_image_url?: string | null;
  calories_per_serving?: number | null;
  cost_per_serving?: number | null;
  cost_currency?: string;
}

export interface LeaderboardRecipe {
  id: string;
  title: string;
  hero_image_key: string | null;
  tags: string[];
  prep_time: number | null;
  cook_time: number | null;
  user_id: string;
  author_name: string | null;
  author_avatar: string;
  author_avatar_key?: string | null;
  avg_rating: number;
  rating_count: number;
}

export interface LeaderboardChef {
  id: string;
  display_name: string | null;
  avatar_id: string;
  avatar_image_key?: string | null;
  country: string | null;
  recipe_count: number;
  avg_rating: number;
  total_ratings: number;
}

export type FilterMode = 'all' | 'favourites' | 'needs-attention';

export interface PublicProfileRecipe {
  id: string;
  title: string;
  hero_image_key: string | null;
  prep_time: number | null;
  cook_time: number | null;
  tags: string[];
  avg_rating: number | null;
  rating_count: number;
}

export interface PublicProfile {
  id: string;
  display_name: string | null;
  avatar_id: string;
  avatar_image_key: string | null;
  country: string | null;
  created_at: number;
  recipe_count: number;
  avg_rating: number | null;
  total_ratings: number;
  recipes: PublicProfileRecipe[];
}

export interface FeedTip {
  date: string;
  category: string;
  tip: string;
  emoji: string;
}

export interface FeedRecipe {
  id: string;
  title: string;
  hero_image_key: string | null;
  created_at: number;
  user_id?: string;
  author_name: string | null;
  share_token?: string | null;
  avatar_id?: string;
  author_avatar_key?: string | null;
  prep_time?: number | null;
  cook_time?: number | null;
  avg_rating?: number;
  rating_count?: number;
}

export interface FeedData {
  tip: FeedTip;
  recentShared: FeedRecipe[];
  topThisWeek: FeedRecipe[];
}
