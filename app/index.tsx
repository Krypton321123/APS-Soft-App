import React, { useEffect, useState } from 'react';
import { Redirect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useUserId } from '@/store/userIdStore';

const Index = () => {
  const [userId, setUserId] = useState<string | null>(null);
  const { setUsername } = useUserId()

  useEffect(() => {
    const getUserId = async () => {
      const userIdTemp = await AsyncStorage.getItem('userId');
      const usernameTemp= await AsyncStorage.getItem("username")
      setUserId(userIdTemp || '');
      if (userIdTemp) {
        setUsername(usernameTemp || "", userIdTemp)
      }
    };

    getUserId();
  }, []);

  if (userId === null) return null; 

  return (
    <>
      {userId === '' ? <Redirect href="/Login" /> : <Redirect href="/Attendance" />}
    </>
  );
};

export default Index;