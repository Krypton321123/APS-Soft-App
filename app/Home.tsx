import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import React from 'react'
import { useRouter } from 'expo-router'

const Home = () => {

    const router = useRouter()

  return (
    <View className='flex-1 justify-center items-center '>
      <TouchableOpacity className='border-[1px] border-black p-2 bg-gray-200  rounded-xl' onPress={() => router.push('/Camera')}><Text className='font-GeistBold'>Go to Camera!</Text></TouchableOpacity>
    </View>
  )
}

export default Home

