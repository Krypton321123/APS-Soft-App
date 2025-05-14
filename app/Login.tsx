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
import { useRouter } from 'expo-router';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async () => {
    // console.log("we are here")
    // if (!username.trim() || !password.trim()) {
    //   return Alert.alert('Username or password is empty');
    // }

    

    // try {
    //   setIsLoading(true);
    //   const data: any = await ky
    //     .post(`${API_URL}/user/login`, { json: { username, password } })
    //     .json();

    //   if (data.statusCode === 200 || data.statusCode === 201) {
    //     Alert.alert('Success!', "Logged in successfuly")
    //     return router.replace('/Home');
    //   }
    // } catch (err) {
    // } finally {
    //   setIsLoading(false);
    // }
    router.replace('/Home')
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 40}
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
              className="w-[200] h-[200] resize-contain"
              source={require('../assets/images/tempLogo.png')}
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
                setUsername(value);
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