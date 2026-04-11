import { ActivityIndicator, ScrollView, Text, View } from "react-native";

import { CategoryBadge } from "@/components/category-badge";
import { Container } from "@/components/container";
import { PageHeader } from "@/components/page-header";
import { TagBadge } from "@/components/tag-badge";
import { getCategories, getTags } from "@/lib/api";
import { useApi } from "@/lib/hooks";

export default function ExploreScreen() {
  const tags = useApi(() => getTags());
  const categories = useApi(() => getCategories());

  const isLoading = tags.loading || categories.loading;

  return (
    <Container className="px-4 pb-4">
      <PageHeader title="Explore" />
      {isLoading ? (
        <View className="flex-1 items-center justify-center py-12">
          <ActivityIndicator size="large" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ gap: 32 }}
          scrollEnabled={false}
        >
          <View>
            <Text className="mb-3 text-lg font-semibold text-foreground">
              Tags
            </Text>
            {tags.error && (
              <Text className="text-sm text-red-500">{tags.error}</Text>
            )}
            {tags.data && tags.data.tags.length === 0 && (
              <Text className="text-sm text-base-content/40">No tags yet.</Text>
            )}
            <View className="flex-row flex-wrap gap-3">
              {tags.data?.tags.map((t) => (
                <TagBadge key={t.tag} tag={t.tag} count={t.count} />
              ))}
            </View>
          </View>

          <View>
            <Text className="mb-3 text-lg font-semibold text-foreground">
              Categories
            </Text>
            {categories.error && (
              <Text className="text-sm text-red-500">
                {categories.error}
              </Text>
            )}
            {categories.data && categories.data.categories.length === 0 && (
              <Text className="text-sm text-base-content/40">
                No categories yet.
              </Text>
            )}
            <View className="flex-row flex-wrap gap-3">
              {categories.data?.categories.map((c) => (
                <CategoryBadge
                  key={c.category}
                  category={c.category}
                  count={c.count}
                />
              ))}
            </View>
          </View>
        </ScrollView>
      )}
    </Container>
  );
}
