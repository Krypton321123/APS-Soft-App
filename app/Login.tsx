import { View, Image, Text, KeyboardAvoidingView, Platform, TouchableOpacity,
  ScrollView, Alert, ActivityIndicator, Modal } from 'react-native';
import React, { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import InputComponent from '@/components/login/InputComponent';
import AntDesign from 'react-native-vector-icons/AntDesign';
import ky from 'ky';
import { API_URL } from '../constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useUserId } from '@/store/userIdStore';
import { startTracking } from '@/utils/locations';
import { startLoginChecking } from '@/utils/checkLogin';

const Login = () => {
  const [username1, setUsername1] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showDisclosure, setShowDisclosure] = useState(false);
  const [pendingUserData, setPendingUserData] = useState<any>(null);
  const { setUsername } = useUserId();
  const router = useRouter();

  const handleSubmit = async () => {
    if (!username1.trim() || !password.trim()) {
      return Alert.alert('Username or password is empty');
    }
    try {
      setIsLoading(true);
      const data: any = await ky
        .post(`${API_URL}/user/login`, { json: { username: username1, password } })
        .json();

      if (data.statusCode === 200 || data.statusCode === 201) {
        await AsyncStorage.setItem('userId', username1);
        await AsyncStorage.setItem('username', data.data.user.usrnm);
        await AsyncStorage.setItem('userType', data.data.user.usrtyp);
        await AsyncStorage.setItem('userAreaCode', data.data.user.untshnm);
        setUsername(data.data.user.usrnm, username1);

        // Check if disclosure was already accepted
        const alreadyAccepted = await AsyncStorage.getItem('locationDisclosureAccepted');
        if (alreadyAccepted) {
          await proceedAfterDisclosure(data.data.user.usrtyp);
        } else {
          // Show disclosure before starting tracking
          setPendingUserData(data.data.user);
          setShowDisclosure(true);
        }
      }
    } catch (err: any) {
      return Alert.alert('Login error', 'Username or password is wrong');
    } finally {
      setIsLoading(false);
    }
  };

  const proceedAfterDisclosure = async (userType: string) => {
    await startTracking();
    await startLoginChecking();
    if (userType === 'Salesman') {
      router.replace({ pathname: '/Attendance', params: { userType: 'Salesman' } });
    } else {
      router.replace({ pathname: '/Attendance', params: { userType: 'Delivery' } });
    }
  };

  const handleDisclosureAllow = async () => {
    await AsyncStorage.setItem('locationDisclosureAccepted', 'true');
    setShowDisclosure(false);
    await proceedAfterDisclosure(pendingUserData.usrtyp);
  };

  const handleDisclosureDeny = async () => {
    setShowDisclosure(false);
    // Clear stored credentials since they denied tracking (required for the app to function)
    await AsyncStorage.multiRemove(['userId', 'username', 'userType', 'userAreaCode']);
    Alert.alert(
      'Location required',
      'Background location is required for attendance and field tracking. Please allow it to use the app.',
    );
  };

  return (
    <>
      {/* Location Disclosure Modal */}
      <Modal visible={showDisclosure} transparent animationType="fade">
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <View style={{ backgroundColor: '#fff', borderRadius: 12, width: '85%', overflow: 'hidden' }}>
            <View style={{ backgroundColor: '#1d4ed8', padding: 16 }}>
              <Text style={{ color: '#fff', fontSize: 18, fontWeight: '600' }}>
                Location access required
              </Text>
              <Text style={{ color: '#bfdbfe', fontSize: 13, marginTop: 4 }}>
                Please read before continuing
              </Text>
            </View>

            <View style={{ padding: 20 }}>
              <Text style={{ fontSize: 15, fontWeight: '600', marginBottom: 6, color: '#111' }}>
                Background location tracking
              </Text>
              <Text style={{ fontSize: 13, color: '#555', marginBottom: 16, lineHeight: 20 }}>
                This app collects your location data{' '}
                <Text style={{ fontWeight: '700', color: '#111' }}>
                  even when the app is closed or not in use.
                </Text>
              </Text>

              <Text style={{ fontSize: 15, fontWeight: '600', marginBottom: 6, color: '#111' }}>
                Why we collect it
              </Text>
              <Text style={{ fontSize: 13, color: '#555', marginBottom: 16, lineHeight: 20 }}>
                To verify attendance, track field sales activity, and support your
                employer's workforce management requirements.
              </Text>

              <Text style={{ fontSize: 15, fontWeight: '600', marginBottom: 6, color: '#111' }}>
                When it's active
              </Text>
              <Text style={{ fontSize: 13, color: '#555', marginBottom: 20, lineHeight: 20 }}>
                Location is collected continuously during your work shift, including
                when the app is running in the background.
              </Text>

              <View style={{ backgroundColor: '#f5f5f5', borderRadius: 8, padding: 12, marginBottom: 20 }}>
                <Text style={{ fontSize: 12, color: '#777', lineHeight: 18 }}>
                  By tapping <Text style={{ fontWeight: '700', color: '#333' }}>Allow</Text>, you
                  consent to background location collection as described. You may revoke
                  this at any time in device Settings → App → Permissions.
                </Text>
              </View>

              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity
                  onPress={handleDisclosureDeny}
                  style={{ flex: 1, padding: 12, borderRadius: 8, borderWidth: 1,
                    borderColor: '#ccc', alignItems: 'center' }}>
                  <Text style={{ color: '#666' }}>Deny</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleDisclosureAllow}
                  style={{ flex: 2, padding: 12, borderRadius: 8,
                    backgroundColor: '#1d4ed8', alignItems: 'center' }}>
                  <Text style={{ color: '#fff', fontWeight: '600' }}>Allow location access</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* Existing login UI unchanged below */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : -40}
        className="flex-1"
      >
        <SafeAreaView className="flex-1 w-full items-center">
          <ScrollView
            contentContainerStyle={{ flexGrow: 1, alignItems: 'center' }}
            className="w-[360] pb-8"
            showsVerticalScrollIndicator={true}
          >
            <View className="mt-5 mb-8 w-full h-[300px] items-center justify-start">
              <Image
                source={require('../assets/images/logoOffice-removebg-preview.png')}
                className="w-[300px] h-[200px] self-center"
                style={{ resizeMode: 'contain' }}
              />
              <Text className="font-GeistLight mt-5 text-4xl flex-wrap">Welcome!</Text>
              <Text className="font-GeistLight mt-1 text-4xl flex-wrap">
                to <Text className="font-GeistBold">Office</Text>
              </Text>
            </View>

            <View className="w-full items-center gap-4">
              <InputComponent
                isPassword={false}
                label="Username"
                onChangeText={(value) => setUsername1(value)}
                Icon={<AntDesign name="user" size={24} />}
              />
              <InputComponent
                isPassword={true}
                label="Password"
                onChangeText={(value) => setPassword(value)}
                Icon={<AntDesign name="user" size={24} />}
              />
              <TouchableOpacity
                className="flex items-center justify-center bg-[#9e15ed] w-[200] h-[50] rounded-full mt-5"
                onPress={handleSubmit}
              >
                {isLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text className="text-white text-base font-GeistRegular">Login</Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </>
  );
};

export default Login;