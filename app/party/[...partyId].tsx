import { Text, View, TouchableOpacity, Image } from 'react-native'
import React, { useEffect, useState } from 'react'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { API_URL } from '../../constants'
import ky from 'ky'
import { Ionicons } from '@expo/vector-icons'
import AsyncStorage from '@react-native-async-storage/async-storage'

const PartyDetails = () => {
  const { partyId } = useLocalSearchParams();
  const [ledcd, lednm] = partyId; 
  const router = useRouter()
  const [partyDetails, setPartyDetails] = useState({
    lednm: 'Loading...',
    outstandingAmount: 0,
    ledadr1: '',
    contactPerson: '',
    mobileNumber: '',
    emailId: '',
    profileImageUrl: '',
    imageUrl2: '',
  })
  const [loading, setLoading] = useState(true)
  const [username, setUsername] = useState(''); 

  useEffect(() => {
    const getUserId = async () => {
      console.log(ledcd, lednm)
      const user = await AsyncStorage.getItem('userId');
      if (user) {
        setUsername(user);
      }
    }
    getUserId();
  }, [])

  const fetchParty = async () => {
    try {
      setLoading(true)
      const response: any = await ky.post(`${API_URL}/user/fetchPartyWithId`, {json: {partyId: ledcd}}).json()

      console.log(response)

      if (response.statusCode === 200) {
        setPartyDetails(prev => ({
          ...prev, 
          lednm: response.data.lednm,
          ledadr1: response.data.ledadr1 || '',
          contactPerson: response.data.contactPerson || '',
          mobileNumber: response.data.mobileNumber || '',
          emailId: response.data.emailId || '',
          profileImageUrl: response.data.profileImageUrl || '',
          imageUrl2: response.data.imageUrl2 || '',
          outstandingAmount: response.data.outstanding.outamt || 0
        }))
      }


    } catch (error) {
      console.error('Error fetching party details:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchParty()
  }, [])

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* Header with Party Name, ID and Edit Button */}
      <View className="bg-blue-600 px-4 py-4 flex-row justify-between items-center">
        <View>
          <Text className="text-white text-xl font-GeistBold">{lednm}</Text>
          <Text className="text-white text-sm">ID: {ledcd}</Text>
        </View>
        <TouchableOpacity 
          className="w-10 h-10 bg-blue-500 rounded-full items-center justify-center"
          onPress={() => router.push({
            pathname: '/edit/edit',
            params: { partyId: ledcd, partyName: lednm }
          })}
        >
          <Ionicons name="pencil" size={20} color="white" />
        </TouchableOpacity>
      </View>
      
      <View className="flex-1">
        {/* Profile Image Section */}
        <View className="items-center py-6 bg-white border-b border-gray-200">
          {partyDetails.profileImageUrl ? (
            <Image 
              source={{ uri: `${API_URL}${partyDetails.profileImageUrl}` }} 
              className="w-24 h-24 rounded-full mb-2"
              resizeMode="cover"
            />
          ) : (
            <View className="w-24 h-24 rounded-full bg-gray-300 justify-center items-center mb-2">
              <Text className="text-3xl text-gray-500">
                {partyDetails.lednm ? partyDetails.lednm.charAt(0).toUpperCase() : "P"}
              </Text>
            </View>
          )}
          <Text className="text-lg font-GeistBold text-gray-800">{lednm}</Text>
          {partyDetails.contactPerson && (
            <Text className="text-sm text-gray-500">Contact: {partyDetails.contactPerson}</Text>
          )}
        </View>
        
        {/* Contact Information */}
        {(partyDetails.mobileNumber || partyDetails.emailId || partyDetails.ledadr1) && (
          <View className="bg-white p-4 border-b border-gray-200">
            <Text className="text-lg font-GeistBold mb-2">Contact Information</Text>
            {partyDetails.mobileNumber && (
              <View className="flex-row items-center mb-2">
                <Ionicons name="call-outline" size={18} color="#4B5563" className="mr-2" />
                <Text className="text-gray-600 ml-2">{partyDetails.mobileNumber}</Text>
              </View>
            )}
            {partyDetails.emailId && (
              <View className="flex-row items-center mb-2">
                <Ionicons name="mail-outline" size={18} color="#4B5563" className="mr-2" />
                <Text className="text-gray-600 ml-2">{partyDetails.emailId}</Text>
              </View>
            )}
            {partyDetails.ledadr1 && (
              <View className="flex-row items-center">
                <Ionicons name="location-outline" size={18} color="#4B5563" className="mr-2" />
                <Text className="text-gray-600 ml-2">{partyDetails.ledadr1}</Text>
              </View>
            )}
          </View>
        )}
        
        {/* Outstanding Amount - Highlighted */}
        <View className="bg-yellow-50 p-4 border-b border-yellow-200">
          <Text className="text-gray-600 text-sm">Outstanding Amount</Text>
          <Text className="text-3xl font-GeistBold text-red-600">
            ₹ {partyDetails.outstandingAmount.toLocaleString()}
          </Text>
        </View>
        
        {/* Action Buttons - WhatsApp style */}
        <View className="flex-row justify-around py-4 bg-white border-b border-gray-200">
          <TouchableOpacity className="items-center" onPress={() => router.push({
            pathname: '/order/Order', 
            params: {partyId: ledcd, partyName: lednm, userId: username}
          })}>
            <View className="w-12 h-12 rounded-full bg-blue-100 justify-center items-center mb-1">
              <Text className="text-blue-600 text-xl">📋</Text>
            </View>
            <Text className="text-xs">ORDER</Text>
          </TouchableOpacity>
          
          <TouchableOpacity className="items-center" onPress={() =>  router.push({
            pathname: '/stock/Stock',
            params: {partyId: ledcd, partyName: lednm}
          })}>
            <View className="w-12 h-12 rounded-full bg-green-100 justify-center items-center mb-1">
              <Text className="text-green-600 text-xl">📦</Text>
            </View>
            <Text className="text-xs">STOCK</Text>
          </TouchableOpacity>
          
          <TouchableOpacity className="items-center" onPress={() => {router.push({
            pathname: `/Camera`, 
            params: {partyId: ledcd, caller: 'party'}
          })}}>
            <View className="w-12 h-12 rounded-full bg-purple-100 justify-center items-center mb-1">
              <Text className="text-purple-600 text-xl">📷</Text>
            </View>
            <Text className="text-xs">PHOTO</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            className="items-center" 
            onPress={() => router.push({
              pathname: '/collection/Collection',
              params: {
                partyId: ledcd,
                partyName: lednm
              }
            })}
          >
            <View className="w-12 h-12 rounded-full bg-green-100 justify-center items-center mb-1">
              <Text className="text-green-600 text-xl">💰</Text>
            </View>
            <Text className="text-xs">COLLECTION</Text>
          </TouchableOpacity>
        </View>
        
        {/* Party Images */}
        {(partyDetails.profileImageUrl || partyDetails.imageUrl2) && (
          <View className="p-4">
            <Text className="text-lg font-GeistBold mb-2">Party Images</Text>
            <View className="flex-row flex-wrap">
              {partyDetails.profileImageUrl && (
                <View className="mr-2 mb-2">
                  <Image 
                    source={{ uri: `${API_URL}${partyDetails.profileImageUrl}` }} 
                    className="w-32 h-32 rounded-lg"
                    resizeMode="cover"
                  />
                </View>
              )}
              {partyDetails.imageUrl2 && (
                <View className="mr-2 mb-2">
                  <Image 
                    source={{ uri: `${API_URL}${partyDetails.imageUrl2}` }} 
                    className="w-32 h-32 rounded-lg"
                    resizeMode="cover"
                  />
                </View>
              )}
            </View>
          </View>
        )}
        
        {/* Bills Section */}
        <View className="flex-1 p-4">
          <Text className="text-lg font-GeistBold mb-2">Bills</Text>
          <View className="bg-white rounded-lg p-4 items-center justify-center border border-gray-200">
            <Text className="text-gray-400">No bills to display</Text>
          </View>
        </View>
      </View>
      
      {/* Back Button */}
      <View className="p-4">
        <TouchableOpacity 
          className="bg-blue-600 p-4 rounded-lg items-center"
          onPress={() => router.back()}
        >
          <Text className="font-GeistBold text-white">Back to List</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}

export default PartyDetails