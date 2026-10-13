export interface User {
  email: string;
  first_name: string;
  last_name: string;
}

export interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface MediaFile {
  id: number;
  owner: number;
  file: string;
  url: string | null;
  thumbnail_url: string | null;
  album: number | null;
  original_name: string;
  content_type: string;
  size: number;
  created_at: string;
}

export interface Album {
  id: number;
  owner: number;
  title: string;
  description: string | null;
  is_public: boolean;
  media_count: number;
  cover_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface ShareLink {
  id: number;
  media_file: number;
  token: string;
  created_at: string;
  expires_at: string;
  views_count: number;
  is_expired: boolean;
}

export interface PublicShare {
  download_url: string;
  original_name: string;
  content_type: string;
  size: number;
  expires_at: string;
  views_count: number;
}
