export type Book = {
  id: string;
  user_id: string;
  title: string;
  author: string | null;
  file_path: string;
  file_size_bytes: number | null;
  page_count: number | null;
  cover_source: "page" | "upload";
  cover_page: number | null;
  cover_path: string | null;
  cover_url: string | null;
  has_outline: boolean;
  extraction_status: "pending" | "processing" | "completed" | "failed";
  last_opened_page: number | null;
  last_opened_at: string | null;
  created_at: string;
  updated_at: string;
  tags: Tag[];
};

export type Tag = {
  id: string;
  name: string;
  color: string | null;
};

export type Bookmark = {
  id: string;
  page_number: number;
  label: string | null;
  created_at: string;
};

export type Note = {
  id: string;
  page_number: number;
  body: string;
  created_at: string;
  updated_at: string;
};

export type OutlineEntry = {
  id: string;
  title: string;
  page_number: number | null;
  children: OutlineEntry[];
};

export type UserPreferences = {
  theme: "system" | "light" | "dark";
  default_page_mode: "horizontal" | "vertical";
};
