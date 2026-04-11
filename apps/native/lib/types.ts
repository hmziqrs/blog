export interface PostSummary {
  id: string;
  title: string;
  description: string;
  date: string;
  updated: string | null;
  category: string;
  tags: string[];
  cover: string | null;
  cover_alt: string | null;
}

export interface PostDetail extends PostSummary {
  body: string;
}

export interface PostsResponse {
  posts: PostSummary[];
}

export interface TagEntry {
  tag: string;
  count: number;
}

export interface TagsResponse {
  tags: TagEntry[];
}

export interface TagPostsResponse {
  tag: string;
  posts: PostSummary[];
}

export interface CategoryEntry {
  category: string;
  count: number;
}

export interface CategoriesResponse {
  categories: CategoryEntry[];
}

export interface CategoryPostsResponse {
  category: string;
  posts: PostSummary[];
}

export interface ContentSection {
  title: string;
  body: string;
}

export interface ContactMethod {
  label: string;
  value: string;
  href: string;
}

export interface AboutPageConfig {
  title: string;
  description: string;
  paragraphs: string[];
  focusAreas: ContentSection[];
  principles: string[];
}

export interface ContactPageConfig {
  title: string;
  description?: string;
  paragraphs: string[];
  methods: ContactMethod[];
}

export interface LegalPageConfig {
  title: string;
  description: string;
  badgeLabel: string;
  effectiveDate: string;
  preamble: string[];
  sections: ContentSection[];
}

export interface PageConfigResponse {
  page: "about" | "contact" | "privacy" | "terms";
  config: AboutPageConfig | ContactPageConfig | LegalPageConfig;
}
