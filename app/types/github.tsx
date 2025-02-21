// app/types/github.ts
export interface Repository {
    id: number;
    name: string;
    description?: string | null;  // Allow null
    language?: string;
    full_name?: string;
    html_url?: string;
    stargazers_count?: number;
    forks_count?: number;
    [key: string]: any; // Optional: Allow additional fields
  }
  