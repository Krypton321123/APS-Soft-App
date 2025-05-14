import { Stack } from 'expo-router';
import 'react-native-reanimated';
import '../global.css'
import { useFonts } from 'expo-font'


const RootLayout = () => {

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
      <Stack screenOptions={{ headerShown: false }}/>

  );
}

export default RootLayout;