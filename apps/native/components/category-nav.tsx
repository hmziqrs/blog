import { router } from "expo-router";
import { ScrollView, View } from "react-native";

import { ButtonLink } from "./button-link";

interface CategoryNavProps {
  categories: string[];
  active?: string;
}

export function CategoryNav({ categories, active }: CategoryNavProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ flexDirection: "row", gap: 8, paddingBottom: 4 }}
    >
      <ButtonLink
        variant={!active ? "primary" : "ghost"}
        onPress={() => router.push("/(tabs)")}
        className="tracking-[0.12em] uppercase"
      >
        All
      </ButtonLink>
      {categories.map((category) => (
        <ButtonLink
          key={category}
          variant={active === category ? "primary" : "ghost"}
          onPress={() => router.push(`/category/${encodeURIComponent(category)}`)}
          className="capitalize"
        >
          {category}
        </ButtonLink>
      ))}
    </ScrollView>
  );
}
