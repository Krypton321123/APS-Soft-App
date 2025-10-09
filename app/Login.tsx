import {
  View,
  Image,
  Text,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import React, { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import InputComponent from '@/components/login/InputComponent';
import AntDesign from 'react-native-vector-icons/AntDesign';
import ky from 'ky';
import { API_URL } from '@/constants';
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useRouter } from 'expo-router';
import { useUserId } from '@/store/userIdStore';

const Login = () => {
  const [username1, setUsername1] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { setUsername } = useUserId()
  const router = useRouter();

  const handleSubmit = async () => {
    console.log("we are here")
    if (!username1.trim() || !password.trim()) {
      return Alert.alert('Username or password is empty');
    }

    try {
      setIsLoading(true);
      const data: any = await ky
        .post(`${API_URL}/user/login`, { json: { username: username1, password } })
        .json();

      if (data.statusCode === 200 || data.statusCode === 201) {
        Alert.alert('Success!', "Logged in successfuly")
        await AsyncStorage.setItem('userId', username1)
    
        setUsername(username1); 
        return router.replace('/Attendance');
      }
    } catch (err: any) {
        console.log('we are here in catch')
        return Alert.alert("Login error", "Username or password is wrong")
    } finally {
      setIsLoading(false);
    }
    // router.replace('/Home')
  };

  return (
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
              onChangeText={(value) => {
                setUsername1(value);
              }}
              Icon={<AntDesign name="user" size={24} />}
            />
            <InputComponent
              isPassword={true}
              label="Password"
              onChangeText={(value) => {
                setPassword(value);
              }}
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
  );
};

export default Login;