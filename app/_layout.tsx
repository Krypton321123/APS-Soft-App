import 'react-native-reanimated';
import { Stack } from 'expo-router';
import { StatusBar } from 'react-native';
import '../global.css'
import '@/tasks/locationTask'
import { useFonts } from 'expo-font'
import { MenuProvider } from 'react-native-popup-menu'
import { useForceUpdate } from '@/hooks/useForceUpdate';
import ForceUpdateModal from '@/components/ForceUpdateModal';

export default function RootLayout() {
  const [loaded, error] = useFonts({
    'Geist-Regular': require('@/assets/fonts/Geist-Regular.ttf'),
    'Geist-Bold': require('@/assets/fonts/Geist-Bold.ttf'),
    'Geist-Light': require('@/assets/fonts/Geist-Light.ttf'),
    'Geist-SemiBold': require('@/assets/fonts/Geist-SemiBold.ttf')
  })

  const { updateRequired, goToStore } = useForceUpdate();

  if (!loaded && !error) {
    return null;
  }

  return (
    <MenuProvider>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="transparent"
        translucent={true}
      />
      <Stack screenOptions={{ headerShown: false }} />

      {/* Sits on top of everything, including the Stack navigator */}
      <ForceUpdateModal visible={updateRequired} onUpdate={goToStore} />
    </MenuProvider>
  );
}