import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";

export type ProjectType = {
  id: string;
  name: string;
  slug: string;
  color: string;
  orderIndex: number;
  isDefault: boolean;
  isArchived: boolean;
  photographerId: string;
};

export function useProjectTypes(includeArchived: boolean = false) {
  const { user } = useAuth();
  
  const query = useQuery<ProjectType[]>({
    queryKey: ["/api/project-types", { includeArchived }],
    queryFn: async () => {
      const url = includeArchived 
        ? "/api/project-types?includeArchived=true" 
        : "/api/project-types";
      const response = await fetch(url, { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch project types');
      return response.json();
    },
    enabled: !!user
  });

  return {
    projectTypes: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    getProjectTypeName: (slug: string) => {
      const type = query.data?.find(t => t.slug === slug);
      return type?.name || slug;
    },
    getProjectTypeColor: (slug: string) => {
      const type = query.data?.find(t => t.slug === slug);
      return type?.color || '#64748b';
    }
  };
}
