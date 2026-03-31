import { Stack } from "expo-router";
import React from "react";
import Colors from "@/constants/colors";

export default function SettingsTabLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: Colors.background },
      }}
    >
      <Stack.Screen name="index" options={{ title: "Settings" }} />
      <Stack.Screen name="printer" options={{ title: "Printer Setup" }} />
    </Stack>
  );
}
