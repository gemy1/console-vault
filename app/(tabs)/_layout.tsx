import { Tabs } from 'expo-router';
import { CurvedBottomTabBar } from '../../components/navigation/CurvedBottomTabBar';

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <CurvedBottomTabBar {...(props as any)} />}
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          borderTopWidth: 0,
          elevation: 0,
          backgroundColor: 'transparent',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
        }}
      />
      <Tabs.Screen
        name="vault"
        options={{
          title: 'Game Vault',
        }}
      />
      <Tabs.Screen
        name="sellers"
        options={{
          title: 'Sellers',
        }}
      />
    </Tabs>
  );
}
