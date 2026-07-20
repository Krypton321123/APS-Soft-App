import { Text, View, TouchableOpacity } from 'react-native'
import React, { useEffect, useState } from 'react'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { API_URL } from '../../constants'
import ky from 'ky'
import { Ionicons } from '@expo/vector-icons'

// Deliberately restricted: order, stock, photo only. No collection, bills,
// outstanding, or edit button — those sections are omitted entirely (not
// rendered-but-disabled) per the "nothing more" scope decision.
const SecondaryPartyDetails = () => {
  const { vendcd, vendName, parentLedcd, parentLednm, userId } =
    useLocalSearchParams<any>()
  const router = useRouter()

  const [vendorDetails, setVendorDetails] = useState({
    name: typeof vendName === 'string' ? vendName : 'Loading...',
    adrs: '',
    contper: '',
    contno: '',
  })
  const [loading, setLoading] = useState(true)

  const fetchVendorDetails = async () => {
    try {
      setLoading(true)
      const response: any = await ky
        .get(`${API_URL}/user/getVendorDetails/${vendcd}`)
        .json()

      if (response.statusCode === 200) {
        setVendorDetails({
          name: response.data.name || 'Unnamed',
          adrs: response.data.adrs || '',
          contper: response.data.contper || '',
          contno: response.data.contno || '',
        })
      }
    } catch (error) {
      console.error('Error fetching vendor details:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchVendorDetails()
  }, [])

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="bg-purple-600 px-4 py-4">
        <Text className="text-white text-xl font-GeistBold">
          {vendorDetails.name}
        </Text>
        <Text className="text-purple-200 text-sm">
          Secondary Party • ID: {vendcd}
        </Text>
        <Text className="text-purple-200 text-xs mt-0.5">
          Under {parentLednm} ({parentLedcd})
        </Text>
      </View>

      <View className="flex-1">
        {(vendorDetails.contper || vendorDetails.contno || vendorDetails.adrs) && (
          <View className="bg-white p-4 border-b border-gray-200">
            <Text className="text-lg font-GeistBold mb-2">Contact Information</Text>
            {vendorDetails.contper ? (
              <View className="flex-row items-center mb-2">
                <Ionicons name="person-outline" size={18} color="#4B5563" />
                <Text className="text-gray-600 ml-2">{vendorDetails.contper}</Text>
              </View>
            ) : null}
            {vendorDetails.contno ? (
              <View className="flex-row items-center mb-2">
                <Ionicons name="call-outline" size={18} color="#4B5563" />
                <Text className="text-gray-600 ml-2">{vendorDetails.contno}</Text>
              </View>
            ) : null}
            {vendorDetails.adrs ? (
              <View className="flex-row items-center">
                <Ionicons name="location-outline" size={18} color="#4B5563" />
                <Text className="text-gray-600 ml-2">{vendorDetails.adrs}</Text>
              </View>
            ) : null}
          </View>
        )}

        {/* Action Buttons — order, stock, photo ONLY */}
        <View className="flex-row justify-around py-6 bg-white border-b border-gray-200">
          <TouchableOpacity
            className="items-center"
            onPress={() =>
              router.push({
                pathname: '/secondary/SecondaryOrder',
                params: {
                  vendId: vendcd,
                  vendName: vendorDetails.name,
                  parentLedcd,
                  userId,
                },
              } as any)
            }
          >
            <View className="w-14 h-14 rounded-full bg-blue-100 justify-center items-center mb-1">
              <Text className="text-blue-600 text-2xl">📋</Text>
            </View>
            <Text className="text-xs">ORDER</Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="items-center"
            onPress={() =>
              router.push({
                pathname: '/secondary/SecondaryStock',
                params: {
                  vendId: vendcd,
                  vendName: vendorDetails.name,
                  parentLedcd,
                  userId,
                },
              } as any)
            }
          >
            <View className="w-14 h-14 rounded-full bg-green-100 justify-center items-center mb-1">
              <Text className="text-green-600 text-2xl">📦</Text>
            </View>
            <Text className="text-xs">STOCK</Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="items-center"
            onPress={() =>
              router.push({
                pathname: '/Camera',
                // Camera.tsx forwards whatever partyId it's given straight
                // through to /user/uploadwithmulter → partyImages.partyId.
                // Per explicit decision, vendcd is passed as-is with no
                // extra flag distinguishing it from a normal party photo.
                params: { partyId: vendcd, caller: 'party' },
              } as any)
            }
          >
            <View className="w-14 h-14 rounded-full bg-purple-100 justify-center items-center mb-1">
              <Text className="text-purple-600 text-2xl">📷</Text>
            </View>
            <Text className="text-xs">PHOTO</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View className="p-4">
        <TouchableOpacity
          className="bg-purple-600 p-4 rounded-lg items-center"
          onPress={() => router.back()}
        >
          <Text className="font-GeistBold text-white">Back to Secondary Parties</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}

export default SecondaryPartyDetails