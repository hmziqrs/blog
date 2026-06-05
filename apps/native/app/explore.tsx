import { RefreshControl, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppHeader } from "@/components/app-header";
import { CategoryBadge } from "@/components/category-badge";
import { PageHeader } from "@/components/page-header";
import { ErrorState, LoadingState } from "@/components/screen-state";
import { TagBadge } from "@/components/tag-badge";
import { getCategories, getTags } from "@/lib/api";
import { useApi } from "@/lib/hooks";

export default function ExploreScreen() {
  const tags = useApi(() => getTags());
  const categories = useApi(() => getCategories());
  const insets = useSafeAreaInsets();

  const isLoading = (tags.loading && !tags.data) || (categories.loading && !categories.data);
  const isRefreshing = tags.refreshing || categories.refreshing;

  const handleRefresh = () => {
    tags.refetch();
    categories.refetch();
  };

  if (isLoading) {
    return (
      <View className="flex-1 bg-base-100">
        <AppHeader />
        <LoadingState />
      </View>
    );
  }

  const hasError = (tags.error && !tags.data) || (categories.error && !categories.data);

  if (hasError) {
    return (
      <View className="flex-1 bg-base-100">
        <AppHeader />
        <ErrorState
          message={tags.error ?? categories.error ?? "Failed to load explore data"}
          onRetry={handleRefresh}
        />
      </View>
    );
  }

  const tagCount = tags.data?.tags.length ?? 0;
  const categoryCount = categories.data?.categories.length ?? 0;

  return (
    <View className="flex-1 bg-base-100">
      <AppHeader />
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingBottom: insets.bottom + 24,
        }}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        <View className="gap-10 pt-4">
          <View>
            <PageHeader
              title="Tags"
              description={
                tagCount > 0
                  ? `${tagCount} tag${tagCount === 1 ? "" : "s"} across published posts`
                  : undefined
              }
            />
            {tags.error && <Text className="mb-2 text-sm text-red-500">{tags.error}</Text>}
            {tagCount === 0 && <Text className="text-sm text-muted">No tags yet.</Text>}
            <View className="flex-row flex-wrap gap-3">
              {tags.data?.tags.map((t) => (
                <TagBadge key={t.tag} tag={t.tag} count={t.count} size="lg" />
              ))}
            </View>
          </View>

          <View>
            <PageHeader
              title="Categories"
              description={
                categoryCount > 0
                  ? `${categoryCount} categor${categoryCount === 1 ? "y" : "ies"} in the archive`
                  : undefined
              }
            />
            {categories.error && (
              <Text className="mb-2 text-sm text-red-500">{categories.error}</Text>
            )}
            {categoryCount === 0 && <Text className="text-sm text-muted">No categories yet.</Text>}
            <View className="flex-row flex-wrap gap-3">
              {categories.data?.categories.map((c) => (
                <CategoryBadge key={c.category} category={c.category} count={c.count} size="lg" />
              ))}
            </View>
          </View>

          <View style={{ height: 40 }} />
        </View>
      </ScrollView>
    </View>
  );
}
