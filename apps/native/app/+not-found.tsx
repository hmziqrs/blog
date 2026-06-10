import { Link, Stack } from "expo-router";
import { Button, Surface } from "heroui-native";
import { Text, View } from "react-native";

import { Container } from "@/components/container";
import { PageKicker } from "@/components/page-kicker";

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "Not Found" }} />
      <Container>
        <View className="flex-1 items-center justify-center p-4">
          <Surface
            variant="secondary"
            className="max-w-sm items-center rounded-2xl border border-base-300/80 p-8"
          >
            <PageKicker className="mb-2">404</PageKicker>
            <Text className="mb-1 text-lg font-semibold text-foreground">Page Not Found</Text>
            <Text className="mb-6 text-center text-sm text-soft">
              The page you're looking for doesn't exist.
            </Text>
            <Link href="/" asChild>
              <Button size="sm" variant="primary">
                Go Home
              </Button>
            </Link>
          </Surface>
        </View>
      </Container>
    </>
  );
}
