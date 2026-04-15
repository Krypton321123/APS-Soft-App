import { View, Text, Button, TouchableOpacity, ActivityIndicator, FlatList } from 'react-native'
import React, { useEffect, useState } from 'react'
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker, { DateTimePickerAndroid, AndroidNativeProps } from '@react-native-community/datetimepicker'
import { API_URL } from '../../constants';
import ky from 'ky'

const Summary = () => {

    const { userId, mode, date } = useLocalSearchParams(); 
    const [loading, setLoading] = useState(false); 
    const [data, setData] = useState<any>(null)
    const router = useRouter()
    const usedDate = new Date(date as string); 

    useEffect(() => {
        const fetchdata = async () => {

            try {
                setLoading(true)
                const response: any = await ky.post(`${API_URL}/user/getSummary`, {json: {
                username: userId, date: usedDate
                }}).json()

                if (response.statusCode === 200) {
                    setData(response.data)
                    console.log("DATA:",data)
                }

            } catch (err) {

            } finally {
                setLoading(false)
            }
            
        }
        fetchdata(); 
    }, [date])

    const renderItem = ({ item }: {item: any}) => {


        return (
        <View className='mx-4 p-2 my-2 flex flex-col justify-start rounded-lg py-5 border border-gray-300 mb-2'>
          <Text className='text-lg font-bold tracking-normal'>{item.partyName}</Text>
          <View className='flex flex-row items-center'>
            <Text className='text-sm'>{mode === "Collection" ? "Collection Amount: " : "Order Quantity: "}</Text>
            <Text className='text-sm'>{mode === "Collection" ? item.amount : item.totalAmount}</Text>
          </View> 
        </View>)
    }


  return (
    <SafeAreaView className='flex-1'>
      {/* Header and stuff  */}
      <View className='py-10 px-5 bg-blue-600'>
        <View className='flex flex-col gap-5'>
            <Text className='text-white font-bold capitalize text-xl'>summary for {userId}</Text>
            <Text className='text-white'><Text className='font-semibold'>Note: </Text>Select a date to pull summary</Text>
        </View>
      </View>

      {/* Party list */}
      {(loading === true || data === null) ? <View className='flex-1 flex justify-center items-center'>
        <ActivityIndicator size={40} color={"blue"} />
      </View> : 
        <View className='flex-1 mt-5'>
            <FlatList keyExtractor={(item, index) => index.toString()} renderItem={renderItem} data={mode === "Collection" ? data.collection : data.order} />
        </View>
      }

      <View className='mb-4'>
          <TouchableOpacity onPress={() => router.back()} className='rounded-lg flex justify-center items-center bg-blue-600 mx-4 py-4'>
            <Text className='text-white font-semibold text-lg'>Back to Summary</Text>
          </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}

export default Summary