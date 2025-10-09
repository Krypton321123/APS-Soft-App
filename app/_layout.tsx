import 'react-native-reanimated';
import { Stack } from 'expo-router';
import { StatusBar} from 'react-native';
import '../global.css'
import '@/tasks/locationTask'
import { useFonts } from 'expo-font'

export default function RootLayout() {
  const [loaded, error] = useFonts({
    'Geist-Regular': require('@/assets/fonts/Geist-Regular.ttf'), 
    'Geist-Bold': require('@/assets/fonts/Geist-Bold.ttf'), 
    'Geist-Light': require('@/assets/fonts/Geist-Light.ttf'), 
    'Geist-SemiBold': require('@/assets/fonts/Geist-SemiBold.ttf')
  })

  if (!loaded && !error) {
    return null;
  }

  return ( 
    <>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="transparent"
        translucent={true}
      />
      <Stack screenOptions={{ headerShown: false }} />
    </>
  );
}

