import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useDebounce } from "./use-debounce";

export interface SearchContact {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
}

export interface SearchProject {
  id: string;
  title: string;
  projectType: string | null;
  eventDate: string | null;
  clientFirstName: string | null;
  clientLastName: string | null;
}

export interface SearchSmartFile {
  id: string;
  name: string;
  status: string;
}

export interface SearchResults {
  contacts: SearchContact[];
  projects: SearchProject[];
  smartFiles: SearchSmartFile[];
}

async function fetchSearch(query: string): Promise<SearchResults> {
  const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`, {
    credentials: "include",
  });
  if (!response.ok) {
    throw new Error("Search failed");
  }
  return response.json();
}

export function useGlobalSearch(enabled: boolean = true) {
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 300);

  const searchQuery = useQuery<SearchResults>({
    queryKey: ["/api/search", debouncedQuery],
    queryFn: () => fetchSearch(debouncedQuery),
    enabled: enabled && debouncedQuery.length >= 2,
    staleTime: 30000,
  });

  const hasResults =
    searchQuery.data &&
    (searchQuery.data.contacts.length > 0 ||
      searchQuery.data.projects.length > 0 ||
      searchQuery.data.smartFiles.length > 0);

  return {
    query,
    setQuery,
    results: searchQuery.data ?? { contacts: [], projects: [], smartFiles: [] },
    isLoading: searchQuery.isLoading && debouncedQuery.length >= 2,
    error: searchQuery.error,
    hasResults,
    isSearching: debouncedQuery.length >= 2,
  };
}

// Hook to fetch recent items for the placeholder state
export function useRecentItems(enabled: boolean = true) {
  // Fetch recent contacts
  const contactsQuery = useQuery<SearchContact[]>({
    queryKey: ["/api/contacts/recent"],
    queryFn: async () => {
      const response = await fetch("/api/contacts/recent", {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch recent contacts");
      return response.json();
    },
    enabled,
    staleTime: 60000,
    retry: 1,
  });

  // Fetch recent projects
  const projectsQuery = useQuery<SearchProject[]>({
    queryKey: ["/api/projects/recent"],
    queryFn: async () => {
      const response = await fetch("/api/projects/recent", {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch recent projects");
      return response.json();
    },
    enabled,
    staleTime: 60000,
    retry: 1,
  });

  return {
    recentContacts: contactsQuery.data ?? [],
    recentProjects: projectsQuery.data ?? [],
    isLoading: contactsQuery.isLoading || projectsQuery.isLoading,
    isError: contactsQuery.isError || projectsQuery.isError,
  };
}
