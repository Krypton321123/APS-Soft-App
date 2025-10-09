import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native'
import React, { useEffect, useState } from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import DateTimePicker from '@react-native-community/datetimepicker'
import ky from 'ky'
import { API_URL } from '@/constants'
import { useLocalSearchParams, useRouter } from 'expo-router'

interface apidata {
    collectionCash: number,
    beatsOrdered: number, 
    collectionCheque: number, 
    collectionOnline: number, 
    totalQuantity: number,
    attendanceTime: string
}

const PreSummary = () => {

    const { userId } = useLocalSearchParams(); 
    const [date, setDate] = useState(new Date(Date.now()))
    const [show, setShow] = useState(false)
    const [loading, setLoading] = useState(false); 
    const [data, setData] = useState<apidata | null>(null)
    const router = useRouter()

    const onChange = (event: any, selectedDate: any) => {
        setDate(selectedDate)
        setShow(false)
    }

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true)
                console.log(userId)
                const response: any = await ky.post(`${API_URL}/user/getPreSummary`, {json: {username: userId, date}}).json()

                setData(response.data); 
            } catch (err) {
                console.log("err: ", err); 
            } finally {
                setLoading(false); 
            }
            
        }

        fetchData()
    }, [date])
        
  return (
    <SafeAreaView className='flex-1'>
        <View className='h-20 flex justify-center bg-blue-600 p-2'>
            <Text className='text-white font-bold text-2xl'>Summary</Text>
        </View>
        <View className='pt-5 pb-5 px-5 flex-row items-center gap-14'>
            <Text className='text-xl font-semibold'>Date Selection</Text>
            <TouchableOpacity onPress={() => setShow(true)} className=' flex justify-center items-center bg-blue-600 w-40 rounded-lg py-5 ml-4'>
                        <Text className='text-white font-GeistRegular'>{date.toLocaleDateString()}</Text>
            </TouchableOpacity>

            {show && <DateTimePicker testID="datetimepicker" value={date} is24Hour={true} onChange={onChange} />}
        </View>
        {(loading === true && data === null) ? <View className='flex-1 flex justify-center items-center'>
            <ActivityIndicator size={40} />
        </View> : 
            <View className='flex-1'>
                <View className='flex px-4 py-10'>
                    <Text className='text-xl font-medium'>Attendance Time: {data?.attendanceTime}</Text>
                </View>
                <TouchableOpacity onPress={() => router.push({pathname: "/summary/Summary", params: {
                    mode: "Order", 
                    date: date.toString(), 
                    userId
                }})}>
                    <View className='bg-gray-200'>
                        <View className='pt-4 px-0'>
                            <Text className='text-xl ml-4 font-medium'>Order Summary</Text>
                        </View>
                        <View className='pb-10 pt-5 px-4'>
                            <View className='flex-row items-center gap-5'>
                                <Text className='text-lg'>Beats Ordered:</Text>
                                <Text className='text-lg'>{data?.beatsOrdered}</Text>
                            </View>
                            <View className='flex-row items-center gap-5'>
                                <Text className='text-lg'>Total Quantity:</Text>
                                <Text className='text-lg'>{data?.totalQuantity}</Text>
                            </View>
                        
                        </View>
                    </View>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => router.push({pathname: "/summary/Summary", params: {
                    mode: "Collection", 
                    date: date.toString(),
                    userId
                }})}>
                    <View className='bg-gray-200 mt-10'>
                        <View className='pt-4 px-0'>
                            <Text className='text-xl ml-4 font-medium'>Collection Summary</Text>
                        </View>
                        <View className='pb-10 pt-5 px-4'>
                            <View className='flex-row items-center gap-5'>
                                <Text className='text-lg'>Collection Cash:</Text>
                                <Text className='text-lg'>{data?.collectionCash}</Text>
                            </View>
                            <View className='flex-row items-center gap-5'>
                                <Text className='text-lg'>Collection UPI:</Text>
                                <Text className='text-lg'>{data?.collectionOnline}</Text>
                            </View>
                            <View className='flex-row items-center gap-5'>
                                <Text className='text-lg'>Collection Cheque:</Text>
                                <Text className='text-lg'>{data?.collectionCheque}</Text>
                            </View>
                        
                        </View>
                    </View>
                </TouchableOpacity>
                <View className='py-10 mt-10'>
                    <TouchableOpacity onPress={() => router.back()} className='rounded-lg flex justify-center items-center bg-blue-600 mx-4 py-4'>
                        <Text className='text-white font-semibold text-lg'>Back to Beats</Text>
                    </TouchableOpacity>
                </View>
            </View>
        }
    </SafeAreaView>
  )
}

export default PreSummary