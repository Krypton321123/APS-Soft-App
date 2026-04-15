import React, { useEffect, useState } from 'react';
import { Redirect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useUserId } from '@/store/userIdStore';

const Index = () => {
  const [userId, setUserId] = useState<string | null>(null);
  const [userType, setUserType] = useState<string | null>(null);
  const { setUsername } = useUserId();

  useEffect(() => {
    const getUserData = async () => {
      try {
        const userIdTemp = await AsyncStorage.getItem('userId');
        const usernameTemp = await AsyncStorage.getItem('username');
        const userTypeTemp = await AsyncStorage.getItem('userType');
        setUserId(userIdTemp === null ? '' : userIdTemp);
        setUserType(userTypeTemp === null ? 
          '' : userTypeTemp
        );

        if (userIdTemp) {
          setUsername(usernameTemp || '', userIdTemp);
        } else {
          
          await AsyncStorage.multiRemove(['userId', 'username', 'userType']);
        }
      } catch (err) {
        console.error('Error fetching user data:', err);
      }
    };

    getUserData();
  }, []);

  if (userId === null || userType === null) return null;

  if (userId === '') {console.log(userId); return <Redirect href={'/Login'} />};

  return (
    <>
      {userType === 'Salesman' ? (
        <Redirect href="/PreHome" />
      ) : (
        <Redirect href="/Delivery" />
      )}
    </>
  );
};

export default Index;