import { ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CategoryBadge } from "@/components/category-badge";
import { Container } from "@/components/container";
import { PageHeader } from "@/components/page-header";
import { TagBadge } from "@/components/tag-badge";
import { ActivityIndicator } from "react-native";
import { getCategories, getTags } from "@/lib/api";
import { useApi } from "@/lib/hooks";

export default function ExploreScreen() {
  const tags = useApi(() => getTags());
  const categories = useApi(() => getCategories());
  const insets = useSafeAreaInsets();

  const isLoading = tags.loading || categories.loading;

  return (
    <Container isScrollable={false}>
      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingTop: 24,
            paddingBottom: insets.bottom + 24,
            gap: 28,
          }}
          keyboardShouldPersistTaps="handled"
        >
          <PageHeader title="Explore" />

          <View>
            <Text className="mb-3 text-lg font-semibold text-foreground">Tags</Text>
            {tags.error && <Text className="text-sm text-red-500">{tags.error}</Text>}
            {tags.data && tags.data.tags.length === 0 && (
              <Text className="text-sm text-base-content/40">No tags yet.</Text>
            )}
            <View className="flex-row flex-wrap gap-2">
              {tags.data?.tags.map((t) => (
                <TagBadge key={t.tag} tag={t.tag} count={t.count} />
              ))}
            </View>
          </View>

          <View>
            <Text className="mb-3 text-lg font-semibold text-foreground">Categories</Text>
            {categories.error && <Text className="text-sm text-red-500">{categories.error}</Text>}
            {categories.data && categories.data.categories.length === 0 && (
              <Text className="text-sm text-base-content/40">No categories yet.</Text>
            )}
            <View className="flex-row flex-wrap gap-2">
              {categories.data?.categories.map((c) => (
                <CategoryBadge key={c.category} category={c.category} count={c.count} />
              ))}
            </View>
          </View>
        </ScrollView>
      )}
    </Container>
  );
}
